import { expect, test } from "@playwright/test";

/**
 * T-141 — S11b (superadmin S3 aynalama) + oturum/erişim dumanı.
 *
 * Bu dosya CANLI panele TARAYICIYLA gider (storageState satıcı oturumu):
 * altyapının gerçekten uçtan uca kurulduğunu (auth + SPA yönlendirme)
 * kanıtlar ve S11b'nin neden bu oturumla koşamadığını ÖLÇEREK gösterir.
 */

test.describe("T-141 · satıcı medya konsolu — erişim (canlı UI)", () => {
  // Oturum dumanı: storageState gerçekten satıcıyı içeri alıyor mu.
  test("altyapı dumanı — satıcı oturumu paneli açar ve medya kütüphanesine gider", async ({
    page,
  }) => {
    // baseURL `.../panel/` — göreli yol (baştaki `/` YOK) ki `/panel/` düşmesin.
    await page.goto("media-library", { waitUntil: "networkidle" });
    // Login'e atılmadı (guard geçildi): URL panelde kaldı.
    await expect(page).toHaveURL(/\/panel\/media-library/);
    // SPA mount oldu — login formu DEĞİL uygulama kabuğu göründü.
    await expect(page.locator("#app")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  // ── Senaryo 11b ────────────────────────────────────────────────────────
  // "Superadmin S3'ü açar → yeni yüklemeler aynalanır."
  //
  // ETİKET: YAZILDI-KOŞMUYOR.
  // NEDEN (iki bağımsız engel, ölçüldü):
  //  1) ROL: Depolama Ayarları ekranı `meta.roles: ["Media Superadmin"]` ile
  //     korunuyor (router/index.js). Bu paketin oturumu SATICI (SEL-00003);
  //     `canAccess` reddeder ve guard dashboard'a yönlendirir. Aşağıdaki koşan
  //     kısım tam olarak bunu ÖLÇÜYOR — satıcı bu ekrana giremiyor.
  //  2) ALTYAPI: "yeni yüklemeler aynalanır" iddiası gerçek bir S3-uyumlu
  //     hedef (MinIO/S3) + aynalama işinin koşmasını ister; dev compose'da
  //     MinIO var ama aynalama akışının uçtan uca doğrulanması ayrı bir kurulum
  //     (bucket + kimlik + mirror job) gerektirir — bu test görevinin dışında.
  // Bu yüzden POZİTİF aynalama iddiası koşmuyor; NEGATİF erişim kapısı koşuyor.
  test("S11b — satıcı Depolama Ayarları ekranına giremez (superadmin kapısı)", async ({
    page,
  }) => {
    await page.goto("media-storage-settings", { waitUntil: "networkidle" });
    // Guard satıcıyı dashboard'a düşürür — superadmin ekranı açılmaz.
    await expect(page).toHaveURL(/\/panel\/dashboard/);
  });

  test.skip("S11b — superadmin S3'ü açtığında yeni yüklemeler aynalanır", async () => {
    // KOŞMUYOR (yukarıdaki 2 numaralı engel): superadmin oturumu + gerçek S3/
    // MinIO aynalama hedefi gerekir. Kurulunca: superadmin S3'ü açar, e2e- bir
    // görsel yükler, nesnenin hem birincil depoda hem aynada belirdiği
    // doğrulanır ve aynalama gecikmesi ölçülür.
  });
});
