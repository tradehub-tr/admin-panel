import { defineConfig, devices } from "@playwright/test";

/**
 * Lojistik FE (Bora rayı) E2E koşumu — 2026-09-03 manuel test otomasyonu.
 *
 * Ana `playwright.config.ts`ten AYRI: o dosya T-141 medya senaryolarına ve
 * eski ortam adlarına (istoc.localhost / istoc-dev-backend-1) bağlı. Burası
 * güncel lokal ortama gider: panel `127.0.0.1:5501/panel`, `/api` aynı
 * porttan backend'e proxy'li (admin-panel-local.conf).
 *
 * Oturum: globalSetup YOK — sid'ler koşum öncesi bir kez backend
 * konteynerinde üretilip `playwright/.auth/{admin,seller}-logistics.json`
 * dosyalarına yazıldı. Spec'ler admin state ile başlar; satıcı (G0)
 * senaryoları `test.use({ storageState: ".../seller-logistics.json" })` der.
 *
 * Lojistik ekranların çoğu mock-veri ile tarayıcı belleğinde çalışır —
 * paralel koşum güvenli. Canlı uçlara (sevkiyat/katalog) YALNIZ okuma
 * yapılır; katalog kayıtlarına yazan test YAZILMAZ.
 *
 * ── RATE LIMIT TUZAĞI (ölçüldü 2026-09-03) ─────────────────────────────
 * SPA her boot'ta `get_session_user` çağırır ve uç bilinçli olarak
 * `@rate_limit(limit=60, seconds=60)` taşır (api/v1/auth.py). 86 testin
 * tek seferde koşumu ~84 sn sürer → dakikada ~61 boot çağrısı sınırı KIL
 * PAYI aşar; 429 alan boot "oturum yok" sayılır ve test login formunda
 * ölür. Belirti: koşumun ~58. testi civarında 1-2 test flaky düşer,
 * izole koşumda aynı testler yeşildir; nginx logunda `get_session_user`
 * 429 görülür. Bu yüzden TAM koşum `npm run test:e2e:logistics` ile —
 * iki yarı + 30 sn ara. Tek spec koşarken doğrudan `npx playwright test
 * -c playwright.logistics.config.ts <spec>` güvenli.
 */
export default defineConfig({
  testDir: "./tests/e2e/logistics",
  fullyParallel: true,
  workers: 3,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"]],
  outputDir: "playwright/logistics-evidence",
  timeout: 30000,

  use: {
    baseURL: "http://127.0.0.1:5501",
    storageState: "playwright/.auth/admin-logistics.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
