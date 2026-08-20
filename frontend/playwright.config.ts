import { defineConfig, devices } from "@playwright/test";

/**
 * Panel E2E altyapısı (T-141 taşıması — W4).
 *
 * Bu paket bugüne kadar E2E'siz koşuyordu; satıcı medya konsolu senaryoları
 * (T-141) tradehubfront'ta `test.skip` ile yazılı ama koşamaz durumdaydı
 * (konsol bu pakette, orada değil). Burada CANLI panele karşı koşuyorlar.
 *
 * ── Ölçülmüş çalışma koşulları ──────────────────────────────────────────
 * · baseURL CANLI panel: `http://istoc.localhost/panel/` (200; nginx `dist/`
 *   servis ediyor — HMR yok, `npm run build` gerektirmez çünkü testler
 *   GERÇEK backend'e gider, derlenmiş panele değil).
 * · Backend canlı, boru hattı bayrakları AÇIK (`rendition_on_upload`,
 *   `product.image` slotu açık — ölçüldü 2026-08-20).
 * · Oturum: `global-setup.ts` bir kez satıcı oturumu açıp `storageState`e
 *   yazar (Playwright standardı). Satıcı = `ali.bal@turksab.com` (mağaza
 *   SEL-00003, aktif abonelik, `product.image` varlığı `7pa8r42g7d`).
 *
 * Tek proje (chromium). Testler `tests/e2e/` altında.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Yükleme senaryoları GERÇEK backend'e yazıyor; paralel koşum aynı içeriği
  // aynı anda yükleyip dedup ölçümünü belirsizleştirir. Seri koş.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // Oturumu bir kez açıp storageState'e yazar.
  globalSetup: "./tests/e2e/global-setup.ts",

  use: {
    baseURL: "http://istoc.localhost/panel/",
    storageState: "playwright/.auth/seller.json",
    // Panel HTTPS zorlamıyor; SameSite=None;Secure cookie'ler http localhost'ta
    // Chromium tarafından kabul ediliyor (güvenli-bağlam istisnası).
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
