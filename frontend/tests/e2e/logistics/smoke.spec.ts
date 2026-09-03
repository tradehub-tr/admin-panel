import { test, expect } from "@playwright/test";

// Altyapı duman testi: admin oturumu paneli açıyor mu, satıcı oturumu farklı mı?

test("admin oturumuyla lojistik pano açılır", async ({ page }) => {
  await page.goto("/panel/lojistik/pano");
  await expect(page).not.toHaveURL(/login/);
  await expect(page.getByText(/pano|dashboard/i).first()).toBeVisible({ timeout: 15000 });
});

test.describe("satıcı oturumu", () => {
  test.use({ storageState: "playwright/.auth/seller-logistics.json" });

  test("satıcı oturumu geçerli ve panel açılıyor", async ({ page }) => {
    await page.goto("/panel/lojistik/sevkiyatlar");
    await expect(page).not.toHaveURL(/login/);
  });
});
