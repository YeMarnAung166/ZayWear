import { expect, test } from "@playwright/test";

test("home renders the ZayWear brand and navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "ZayWear" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cart" })).toBeVisible();
  await expect(page.getByRole("link", { name: /login/i })).toBeVisible();
});

test("login page prompts for a phone number", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: /sign in to zaywear/i }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("09xxxxxxxxx")).toBeVisible();
  await expect(page.getByRole("button", { name: /send otp/i })).toBeVisible();
});
