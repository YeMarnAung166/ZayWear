import { expect, test } from "@playwright/test";
import type { CartLine } from "../lib/cart";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("cart resilience", () => {
  test("cart renders from snapshots when catalog fetch fails", async ({ page }) => {
    const cart: CartLine[] = [
      {
        variantId: 1,
        quantity: 2,
        snapshot: {
          productId: 1,
          name: "Classic Tee",
          size: "M",
          color: "Charcoal",
          unitPrice: 40000,
          imageUrl: null,
        },
      },
    ];

    await page.addInitScript(
      ([payload]) => {
        window.localStorage.setItem("zaywear.cart", payload);
      },
      [JSON.stringify(cart)],
    );

    await page.route("**/products", (route) => route.abort("failed"));

    await page.goto("/cart");

    await expect(
      page.getByRole("heading", { name: /your shopping bag/i }),
    ).toBeVisible();
    await expect(page.getByText(/Classic Tee/i)).toBeVisible();
    await expect(page.getByText(/Size: M/i)).toBeVisible();
    await expect(page.getByText(/Color: Charcoal/i)).toBeVisible();
    await expect(page.getByText(/80,000 MMK/)).toBeVisible();
    await expect(
      page.getByText(/items in your bag couldn't be loaded/i),
    ).not.toBeVisible();
  });

  test("cart shows retry state when catalog blocked and no snapshots", async ({ page }) => {
    const cart: CartLine[] = [
      {
        variantId: 99,
        quantity: 1,
      },
    ];

    await page.addInitScript(
      ([payload]) => {
        window.localStorage.setItem("zaywear.cart", payload);
      },
      [JSON.stringify(cart)],
    );

    await page.route("**/products", (route) => route.abort("failed"));
    await page.route("**/townships", (route) => route.abort("failed"));

    await page.goto("/cart");

    await expect(
      page.getByRole("heading", { name: /we couldn't load your bag/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
  });

  test("add to cart returns feedback when storage is blocked", async ({ page }) => {
    await page.goto("/products/1");
    await page.addInitScript(() => {
      const storage = {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
        removeItem: () => undefined,
      } as unknown as Storage;
      Object.defineProperty(window, "localStorage", { value: storage });
    });

    await page.getByRole("button", { name: /add to cart/i }).first().click();
    await expect(
      page.getByRole("alert", { name: /couldn't save to your bag/i }),
    ).toBeVisible();
  });
});
