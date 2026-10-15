import { expect, test } from "@playwright/test";

/**
 * End-to-end order journey: sign in → checkout → slip upload.
 *
 * Requires a running backend + a Supabase project where a fixed **Test OTP**
 * (Authentication → Providers → Phone → Test OTP) is configured, so the OTP
 * is deterministic. Provide the inputs via environment variables:
 *
 *   E2E_PHONE              buyer phone, e.g. 09xxxxxxxxx
 *   E2E_OTP                the fixed test OTP
 *   E2E_VARIANT_ID         an in-stock product variant id
 *   E2E_TOWNSHIP_ID        a province/township id that supports COD (optional)
 */
const phone = process.env.E2E_PHONE;
const otp = process.env.E2E_OTP;
const variantId = process.env.E2E_VARIANT_ID;
const townshipId = process.env.E2E_TOWNSHIP_ID;

const configured = Boolean(phone && otp && variantId);

test.describe("order journey", () => {
  test.skip(!configured, "Set E2E_PHONE, E2E_OTP and E2E_VARIANT_ID to run.");

  test("sign in → place order → upload slip", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.addInitScript(
      ([id]) => {
        window.localStorage.setItem(
          "zaywear.cart",
          JSON.stringify([{ variantId: Number(id), quantity: 1 }]),
        );
      },
      [variantId!],
    );

    await page.goto("/login");
    await page.getByPlaceholder("09xxxxxxxxx").fill(phone!);
    await page.getByRole("button", { name: /send otp/i }).click();

    await page.locator('input[inputmode="numeric"]').fill(otp!);
    await page.getByRole("button", { name: /^verify/i }).click();
    await page.waitForURL(/my-orders/);

    await page.goto("/checkout");
    await page
      .getByText("Full name", { exact: true })
      .locator("..")
      .locator("input")
      .fill("ZayWear Tester");
    await page.getByPlaceholder("09xxxxxxxxx").fill(phone!);
    if (townshipId) {
      await page.locator("select").selectOption(townshipId);
    } else {
      await page.locator("select").selectOption({ index: 1 });
    }
    await page.locator("textarea").fill("No. 1, Pyay Road, Yangon");
    await page
      .locator("label", { hasText: "KBZPay" })
      .locator("input")
      .check();

    await page.getByRole("button", { name: /place order/i }).click();
    await page.waitForURL(/\/orders\/\d+/);

    await expect(page.getByRole("heading", { name: /order #/i })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: "slip.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
        "base64",
      ),
    });
    await expect(page.getByText(/awaiting verification/i)).toBeVisible();

    expect(errors).toEqual([]);
  });
});
