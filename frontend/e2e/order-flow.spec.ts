import { expect, test } from "@playwright/test";

/**
 * End-to-end order journey: sign in (email OTP) → checkout → slip upload.
 *
 * Requires a running backend + a Supabase project with the **Email** provider
 * enabled and `{{ .Token }}` in the Magic Link template. Provide the inputs via
 * environment variables:
 *
 *   E2E_EMAIL          buyer account email
 *   E2E_OTP            the one-time code delivered to that email
 *   E2E_PHONE          delivery contact phone, e.g. 09xxxxxxxxx
 *   E2E_VARIANT_ID     an in-stock product variant id
 *   E2E_TOWNSHIP_ID    a township id that supports COD (optional)
 */
const email = process.env.E2E_EMAIL;
const otp = process.env.E2E_OTP;
const phone = process.env.E2E_PHONE;
const variantId = process.env.E2E_VARIANT_ID;
const townshipId = process.env.E2E_TOWNSHIP_ID;

const configured = Boolean(email && otp && phone && variantId);

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("order journey", () => {
  test.skip(
    !configured,
    "Set E2E_EMAIL, E2E_OTP, E2E_PHONE and E2E_VARIANT_ID to run.",
  );

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
    await page.getByPlaceholder("you@example.com").fill(email!);
    await page.getByRole("button", { name: /send code/i }).click();

    await page.locator('input[inputmode="numeric"]').fill(otp!);
    await page.getByRole("button", { name: /^verify/i }).click();
    await page.waitForURL(/my-orders/);

    await page.goto("/checkout");
    await page.locator("#fullName").fill("ZayWear Tester");
    await page.locator("#phone").fill(phone!);
    if (townshipId) {
      await page.locator("#township").selectOption(townshipId);
    } else {
      await page.locator("#township").selectOption({ index: 1 });
    }
    await page.locator("#address").fill("No. 1, Pyay Road, Yangon");
    await page.locator('input[name="payment"]').first().check();
    await page.getByRole("button", { name: /place order/i }).click();
    await page.waitForURL(/orders\/\d+/);

    await expect(page.getByRole("heading", { name: /order #/i })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: "slip.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await expect(page.getByText(/awaiting verification/i)).toBeVisible();

    expect(errors).toEqual([]);
  });
});
