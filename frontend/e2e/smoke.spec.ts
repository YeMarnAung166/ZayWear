import { expect, test } from "@playwright/test";

test("home renders the ZayWear brand and navigation", async ({ page }) => {
  await page.goto("/");

  const header = page.locator("header");

  await expect(header.getByRole("link", { name: "ZayWear" })).toBeVisible();
  await expect(header.getByRole("link", { name: "My Orders" })).toBeVisible();
  await expect(header.locator('a[href="/cart"]')).toBeVisible();
});

test("login page prompts for an email address", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: /sign in to zaywear/i }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: /send code/i })).toBeVisible();
});
