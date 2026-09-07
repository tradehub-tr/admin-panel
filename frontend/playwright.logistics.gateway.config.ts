import { defineConfig, devices } from "@playwright/test";

/**
 * Lojistik FE (Bora rayı) E2E — LOKAL GATEWAY koşumu.
 *
 * `playwright.logistics.config.ts`ten AYRI TUTULDU, onun yerine geçmez:
 * o dosya Bora'nın makinesindeki `127.0.0.1:5501` kurulumuna (ayrı bir
 * `admin-panel-local.conf` nginx'i) ve elle üretilmiş sid dosyalarına bağlı.
 * Bu depoda o port dinlemiyor ve `playwright/.auth/` dizini hiç yok — 92
 * test bir kez bile koşmamıştı (ölçüldü 7 Eyl 2026).
 *
 * İKİ FARK, BAŞKA HİÇBİR ŞEY:
 *   1. `baseURL` kök `docker-compose.yml`'in gateway'ine gider
 *      (`http://tradehub.localhost` → :80; panel `/panel`, `/api` aynı
 *      origin'den backend'e proxy'li).
 *   2. `globalSetup` sid'leri koşum başında ÜRETİR (`gatewayAuth.setup.ts`),
 *      elle hazırlanmış dosya beklemez.
 * `testDir`, `workers`, `timeout` ve proje tanımı bilerek Bora'nınkiyle
 * birebir — iki koşumun sonucu karşılaştırılabilir kalsın.
 *
 * ── RATE LIMIT ─────────────────────────────────────────────────────────
 * SPA her boot'ta `get_session_user` çağırıyor ve uç `@rate_limit(60/60s)`
 * taşıyor; suite'in tamamı tek seferde koşarsa sınır kıl payı aşılıyor ve
 * 429 alan boot "oturum yok" sayılıp test login formunda ölüyor. Bu yüzden
 * TAM koşum üç gruba bölünüp aralarında beklenerek yapılır: `./e2e.sh --bora`
 * (kök runner). Tek spec koşarken bölmeye gerek yok.
 */
export default defineConfig({
  testDir: "./tests/e2e/logistics",
  fullyParallel: true,
  workers: 3,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results/logistics-gateway",
  timeout: 30000,
  globalSetup: "./tests/e2e/logistics/gatewayAuth.setup.ts",

  use: {
    baseURL: process.env.PANEL_BASE ?? "http://tradehub.localhost",
    storageState: "playwright/.auth/admin-logistics.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
