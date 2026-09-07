import { test, expect, request as pwRequest, type Page } from "@playwright/test";

/**
 * GEÇİCİ DOĞRULAMA SPEC'İ — 2026-09-04 düzeltmelerinin canlı stres testi.
 *
 * Mevcut süitin (ops/shipments/catalog-reports/g0-security) ÖRTMEDİĞİ
 * açılar: hızlı ardışık geçişler, bayat veri, klavye odağı, localStorage
 * ile açılış, erişilebilir ad denetimi. Koşum sonrası SİLİNMEZ — rapora
 * göre karar verilecek.
 *
 * Beklentilerin kaynağı (kod, belge değil):
 *  - LogisticsSettingsScreen.vue + BaseSwitch.vue → 13 switch (1 ana +
 *    12 bayrak; canlı get_logistics_settings 12 bayrak döndürüyor, ölçüldü),
 *    aria-label BaseSwitch label'ından (denetim 2026-09-04 düzeltmesi).
 *  - CatalogListScreen/CatalogFormScreen metaError guard'ı → bilinmeyen
 *    anahtarda i18n "Katalog bulunamadı", console.warn (error DEĞİL);
 *    ErrorState.canRetry NOT_FOUND'da false → "Yeniden dene" YOK.
 *  - DataTable (denetim 2026-09-04): sortable olmayan başlık düz metin.
 *  - ShipmentTrackingTab: sekme kendi yükler; takip no shipment prop'undan
 *    (canlı: 00001=YK-1234567890, 00002=AR-9876543210 — ölçüldü).
 *  - ExceptionQueueScreen watch(isKanban, immediate) → kanban + ?severity
 *    açılışında filtre temizlenir; mod anahtarı lv-mode:logistics-exceptions.
 *  - ResolveDialog: Esc iptal + odak iadesi (focusTrap/restoreFocus).
 *  - reportsMock deterministik hash — L1 sayı beklentileri porttan.
 *  - Catch-all + platform guard → oturumlu kullanıcı hep /panel/dashboard.
 *
 * CANLI VERİ SINIRI: hiçbir canlı uca YAZILMAZ. M2'de submit yalnız
 * istemci doğrulamasına takılan (boş zorunlu alan) hâlde tetiklenir ve ağ
 * isteği çıkmadığı iddia edilir. A3 çözümleme MOCK (exceptionsMock).
 */

const SELLER_STATE = "playwright/.auth/seller-logistics.json";
const ADMIN_STATE = "playwright/.auth/admin-logistics.json";
// API tabanı config `baseURL`inden ayrı tutulur: `request.newContext()`
// sayfa gezinmesinin baseURL'ini devralmıyor.
const BASE = process.env.PANEL_BASE ?? "http://127.0.0.1:5501";

// ── Dil + tur pinleri: her test TR ve "turu görmüş" profille açılır ──────
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("th-lang", "tr");
    localStorage.setItem(
      "panel_tour_seen_v5",
      JSON.stringify([
        "dashboard",
        "orders",
        "catalog",
        "products",
        "commerce",
        "store",
        "system",
        "messaging",
        "crm",
        "helpdesk",
        "management",
        "logistics",
      ])
    );
  });
});

/** console.error + pageerror toplayıcı. Gürültü süzgeci parametreli. */
function collectErrors(page: Page, extraIgnores: RegExp[] = []): string[] {
  const ignores = [/favicon/i, /Download the Vue Devtools/i, ...extraIgnores];
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !ignores.some((re) => re.test(msg.text()))) {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

function assertClean(errors: string[], screen: string) {
  expect(errors, `${screen}: konsolda hata birikmemeli:\n${errors.join("\n")}`).toEqual([]);
}

/** ErrorState kutusu — boş aria-live alert kabından ayrıştırılmış. */
const errorAlert = (page: Page) => page.locator('div[role="alert"]:not([aria-live])');

/** StatusFilterPills hapı. */
const pill = (page: Page, label: string) =>
  page.locator("button.status-pill", { hasText: label }).first();
const pillCount = (page: Page, label: string) =>
  pill(page, label).locator("span.rounded-full").last();

/** KPI/özet kartı değeri (catalog-reports.cardValue portu). */
function cardValue(page: Page, label: string | RegExp) {
  return page
    .locator("article.card")
    .filter({ has: page.locator("p", { hasText: label }) })
    .locator("p")
    .nth(1);
}

// ── reportsMock portu (deterministik — src/api/reportsMock.js) ───────────
const PROFILES = [
  { carrier: "Yurtiçi Kargo", base: 6, avgDays: 1.8 },
  { carrier: "Aras Kargo", base: 5, avgDays: 2.2 },
  { carrier: "MNG Kargo", base: 4, avgDays: 3.1 },
  { carrier: "PTT Kargo", base: 3, avgDays: 2.6 },
];

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h;
}

function dayCell(day: string, profile: (typeof PROFILES)[0]) {
  const h = hash(`${day}|${profile.carrier}`);
  const shipments = profile.base + (h % 4);
  const failed = h % 5 === 0 ? 1 : 0;
  const cancelled = h % 7 === 0 ? 1 : 0;
  const inTransit = h % 3 === 0 ? 1 : 0;
  const delivered = shipments - failed - cancelled - inTransit;
  const onTime = Math.max(0, delivered - (h % 2));
  const avgDays = profile.avgDays + (h % 10) / 10;
  return { shipments, delivered, failed, cancelled, onTime, avgDays };
}

const toDay = (d: Date) => d.toISOString().slice(0, 10);

function listDays(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  const days: string[] = [];
  for (let t = start; t <= end; t += 86_400_000) days.push(toDay(new Date(t)));
  return days;
}

function defaultReportRange(today = new Date()) {
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const start = new Date(end.getTime() - 29 * 86_400_000);
  return { from: toDay(start), to: toDay(end) };
}

function aggregate(from: string, to: string) {
  return PROFILES.map((profile) => {
    const acc = { shipments: 0, delivered: 0, failed: 0, cancelled: 0, onTime: 0, daysWeighted: 0 };
    for (const day of listDays(from, to)) {
      const c = dayCell(day, profile);
      acc.shipments += c.shipments;
      acc.delivered += c.delivered;
      acc.failed += c.failed;
      acc.cancelled += c.cancelled;
      acc.onTime += c.onTime;
      acc.daysWeighted += c.avgDays * c.delivered;
    }
    return acc;
  });
}

function expectedOps(from: string, to: string) {
  const rows = aggregate(from, to);
  const sum = (f: keyof (typeof rows)[0]) => rows.reduce((a, r) => a + (r[f] as number), 0);
  return { shipments: sum("shipments"), delivered: sum("delivered"), failed: sum("failed") };
}

function expectedAvgDays(from: string, to: string) {
  const rows = aggregate(from, to);
  const delivered = rows.reduce((a, r) => a + r.delivered, 0);
  const weighted = rows.reduce((a, r) => a + r.daysWeighted, 0);
  return delivered ? Math.round((weighted / delivered) * 100) / 100 : 0;
}

// ═════════════════════════════════════════════════════════════════════════
// 1 · M3 Ayarlar — 13 switch'in erişilebilir adı + görsel düzen (toggle YOK)
// ═════════════════════════════════════════════════════════════════════════

const FLAG_LABELS: Record<string, string> = {
  auto_tracking_enabled: "Otomatik takip",
  buyer_pickup_enabled: "Alıcı teslim alma",
  carrier_api_enabled: "Taşıyıcı API",
  cost_estimation_enabled: "Maliyet tahmini",
  multi_carrier_enabled: "Çoklu taşıyıcı",
  multi_leg_enabled: "Çok bacaklı sevkiyat",
  return_flow_enabled: "İade akışı",
  seller_delivery_enabled: "Satıcı teslimatı",
  shipping_zone_pricing_enabled: "Bölgesel fiyatlandırma",
  split_shipment_enabled: "Sevkiyat bölme",
  warehouse_transfer_enabled: "Depolar arası transfer",
  webhook_notifications_enabled: "Webhook bildirimleri",
};

test("M3 · 13 switch: her birinin erişilebilir adı dolu, etiket+açıklama görünür", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/panel/lojistik/ayarlar");
  await expect(page.getByRole("heading", { level: 1, name: "Lojistik ayarları" })).toBeVisible({
    timeout: 15000,
  });

  // Canlı yanıt: 12 bayrak + ana anahtar = 13 switch (ölçüldü 2026-09-04).
  const switches = page.getByRole("switch");
  await expect(switches).toHaveCount(13, { timeout: 15000 });

  // Her switch'in aria-label'ı DOLU ve ham bayrak anahtarı DEĞİL
  // (düzeltme: ad BaseSwitch label'ından geliyor; eskiden 13'ü adsızdı).
  for (let i = 0; i < 13; i++) {
    const label = await switches.nth(i).getAttribute("aria-label");
    expect(label?.trim(), `switch #${i} erişilebilir ad taşımalı`).toBeTruthy();
    expect(label, `switch #${i} adı ham anahtar olmamalı: ${label}`).not.toMatch(/_enabled$/);
  }

  // Bayrak satırları: ham anahtar yalnız title'da; görünür ad + açıklama
  // aynı satırda (görsel düzen bozulmamış — etiket okunur, açıklama çizili).
  for (const [flag, trLabel] of Object.entries(FLAG_LABELS)) {
    const row = page.locator(`div[title="${flag}"]`);
    await expect(row, `bayrak satırı eksik: ${flag}`).toHaveCount(1);
    await expect(row.locator(".switch-title"), `${flag} görünür adı`).toHaveText(trLabel);
    await expect(row.locator(".switch-desc"), `${flag} açıklaması görünmeli`).not.toBeEmpty();
    await expect(row.getByRole("switch")).toHaveAttribute("aria-label", trLabel);
  }

  // Ana anahtar kendi kartında, adıyla.
  await expect(page.getByRole("switch", { name: "Lojistik modülü" })).toBeVisible();

  // SALT OKUNUR TUR: hiçbir switch'e tıklanmadı.
  assertClean(errors, "M3 switch denetimi");
});

test("M3 · klavye: Tab ile switch'ler gezilir, odak görünür halka taşır", async ({ page }) => {
  await page.goto("/panel/lojistik/ayarlar");
  const switches = page.getByRole("switch");
  await expect(switches).toHaveCount(13, { timeout: 15000 });

  // ETKİN anahtarlar üzerinden gezilir. Bayrak anahtarları ana "Lojistik
  // modülü" anahtarı KAPALIYKEN `disabled` oluyor (doğru davranış: bağımlı
  // kontrol, önkoşulu yokken çevrilemez) ve disabled buton sekme sırasında
  // hiç yer almıyor. Önceki sürüm "13'ünün de gezilebildiği" bir ortamı
  // varsayıyordu; modül kapalı bir sitede odak, son öğe olan vitrin
  // bağlantısına düşüp testi üründe kusur yokken kırmızıya çeviriyordu
  // (ölçüldü 7 Eyl 2026: 13 anahtarın 12'si disabled).
  const etkin = switches.and(page.locator(":not([disabled])"));
  const etkinSayisi = await etkin.count();
  expect(etkinSayisi, "en az bir anahtar çevrilebilir olmalı").toBeGreaterThan(0);

  // Her ETKİN anahtar klavyeyle erişilebilir, adlı ve odağı görünür olmalı.
  for (let i = 0; i < etkinSayisi; i++) {
    const anahtar = etkin.nth(i);
    await anahtar.focus();
    await expect(anahtar, `#${i}: odak anahtara inmeli`).toBeFocused();
    const label = await anahtar.getAttribute("aria-label");
    expect(label?.trim(), `#${i}: odaklanan anahtar adlı olmalı`).toBeTruthy();
    const shadow = await anahtar.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow, `#${i}: klavye odağı görünür değil (box-shadow yok)`).not.toBe("none");
  }

  // Etkin anahtardan Tab ileri gidiyor — odak tuzağı yok.
  await etkin.first().focus();
  await page.keyboard.press("Tab");
  await expect(etkin.first(), "Tab sonrası odak aynı anahtarda kalmamalı").not.toBeFocused();

  // Hiçbir anahtar ÇEVRİLMEDİ (yalnız Tab basıldı — Space/Enter yok).
});

// ═════════════════════════════════════════════════════════════════════════
// 2 · M1/M2 bilinmeyen katalog anahtarı — i18n metin, retry yok, konsol temiz
// ═════════════════════════════════════════════════════════════════════════

test("M1 · bilinmeyen ?catalog anahtarı: i18n hata, 'Yeniden dene' YOK, konsol error YOK", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/panel/lojistik/kataloglar?catalog=olmayan-katalog");

  const alert = errorAlert(page).filter({ hasText: /\S/ }).first();
  await expect(alert).toBeVisible({ timeout: 15000 });
  // i18n metin — İngilizce teknik mesaj ("Bilinmeyen katalog: ... Geçerli:")
  // artık ekrana değil console.warn'a gidiyor.
  await expect(alert).toContainText("Katalog bulunamadı");
  await expect(alert).toContainText("NOT_FOUND");
  await expect(alert).not.toContainText(/Geçerli:|Unknown|Bilinmeyen katalog:/);
  // NOT_FOUND yeniden denemekle düzelmez → retry butonu çizilmemeli.
  await expect(alert.getByRole("button", { name: "Yeniden dene" })).toHaveCount(0);

  // Sayfa boş değil: kabuk (menü) ayakta.
  expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(0);
  await expect(page.locator(".sidebar-panel .panel-item").first()).toBeAttached();

  // console.warn KABUL, console.error YASAK.
  assertClean(errors, "M1 bilinmeyen katalog");
});

test("M2 · bilinmeyen katalog form rotası: i18n hata, retry YOK, konsol error YOK", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/panel/lojistik/kataloglar/olmayan-katalog");

  const alert = errorAlert(page).filter({ hasText: /\S/ }).first();
  await expect(alert).toBeVisible({ timeout: 15000 });
  await expect(alert).toContainText("Katalog bulunamadı");
  await expect(alert.getByRole("button", { name: "Yeniden dene" })).toHaveCount(0);
  expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(0);

  assertClean(errors, "M2 bilinmeyen katalog formu");
});

// ═════════════════════════════════════════════════════════════════════════
// 3 · M2 çift tıklama — KAYDETMEDEN: buton durumu + doğrulama duyurusu
// ═════════════════════════════════════════════════════════════════════════

test("M2 · çift tıklama (kaydetmeden): istemci doğrulaması durdurur, ağ isteği çıkmaz", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const writes: string[] = [];
  page.on("request", (r) => {
    // Katalog yazma uçları: update/create_catalog_item (logistics_admin).
    if (/catalog_item/.test(r.url()) && r.method() === "POST") writes.push(r.url());
  });

  await page.goto("/panel/lojistik/kataloglar/logistics_provider/AK");
  await expect(page.getByRole("heading", { level: 1, name: "AK" })).toBeVisible({
    timeout: 15000,
  });

  // Dinlenme hâlinde Kaydet AKTİF (disabled yalnız saving sırasında).
  const save = page.getByRole("button", { name: "Kaydet" });
  await expect(save).toBeEnabled();

  // Zorunlu alanı boşalt → submit istemcide durmalı, uca istek HİÇ çıkmamalı.
  await page.getByLabel(/Sağlayıcı Adı/).fill("");
  await save.dblclick();

  // Duyuru: hata özeti (role=group) + eksik alan bağlantısı + odak alana.
  const summary = page.getByRole("group");
  await expect(summary.getByText(/Eksik zorunlu alanlar/)).toBeVisible();
  await expect(summary.getByRole("button", { name: "Sağlayıcı Adı" })).toBeVisible();
  await expect(page.getByLabel(/Sağlayıcı Adı/)).toBeFocused();

  // Çift tıklama butonu "Kaydediliyor" kilidinde BIRAKMAMALI (istek yokken
  // buton tekrar kullanılabilir olmalı) ve başarı toast'u üretmemeli.
  await expect(save).toBeEnabled();
  await expect(page.locator(".toast-success")).toHaveCount(0);
  expect(writes, "doğrulama aşamasında canlı katalog ucuna istek gitmemeli").toEqual([]);

  assertClean(errors, "M2 çift tıklama");
});

// ═════════════════════════════════════════════════════════════════════════
// 4 · A2 — başlıklar düz metin, tablo hizası, kova geçişleri
// ═════════════════════════════════════════════════════════════════════════

test("A2 · TÜM başlıklar düz metin (buton/aria-sort yok), hiza sağlam, kovalar çalışıyor", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/panel/lojistik/bekleyen-isler");
  await expect(page.locator("h1")).toHaveText("Bekleyen işler", { timeout: 15000 });
  await expect(page.locator("tbody tr")).toHaveCount(3);

  // Denetim düzeltmesi: sortable olmayan başlık artık buton değil.
  // Mevcut süit yalnız "Bekleme" sütununa bakıyordu — burada TÜM başlıklar.
  const headers = page.locator("thead th");
  const headerCount = await headers.count();
  expect(headerCount).toBeGreaterThan(0);
  for (let i = 0; i < headerCount; i++) {
    const th = headers.nth(i);
    await expect(th.locator("button"), `başlık #${i} buton içermemeli`).toHaveCount(0);
    await expect(th, `başlık #${i} aria-sort iddiası taşımamalı`).not.toHaveAttribute(
      "aria-sort",
      /.+/
    );
  }
  // Hiza: her gövde satırının hücre sayısı başlıkla aynı.
  const firstRowCells = await page.locator("tbody tr").first().locator("td").count();
  expect(firstRowCells, "hücre sayısı başlık sayısıyla eşleşmeli").toBe(headerCount);

  // Kova geçişleri hâlâ işliyor (başlık düzeltmesi filtreyi kırmamış).
  await pill(page, "Gecikmiş").click();
  await expect(page).toHaveURL(/bucket=delayed/);
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await pill(page, "Taşıyıcı atanmadı").click();
  await expect(page).toHaveURL(/bucket=awaiting_carrier/);
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.locator("tbody tr").nth(0)).toContainText("SHP-2026-00052");
  await pill(page, "Etiket bekliyor").click();
  await expect(page.locator("tbody tr")).toHaveCount(3);

  assertClean(errors, "A2 başlıklar");
});

// ═════════════════════════════════════════════════════════════════════════
// 5 · B1→B2→geri→farklı sevkiyat→Takip — bayat veri + hızlı sekme turu
// ═════════════════════════════════════════════════════════════════════════

test("B2 · sevkiyat değişiminde Takip sekmesi DOĞRU kaydın verisini gösterir; hızlı sekme turu temiz", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/panel/lojistik/sevkiyatlar");
  await expect(page.getByRole("cell", { name: "SHP-2026-00001" })).toBeVisible({ timeout: 15000 });

  // 1) 00001 detayı → Takip: kendi takip numarası.
  await page.getByRole("cell", { name: "SHP-2026-00001" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "SHP-2026-00001" })).toBeVisible();
  await page.getByRole("tab", { name: /^Takip/ }).click();
  const panel = page.getByRole("tabpanel");
  await expect(panel.locator("code", { hasText: "YK-1234567890" })).toBeVisible({
    timeout: 15000,
  });

  // 2) Geri → farklı sevkiyat → Takip: 00002'nin verisi, 00001'den iz YOK.
  await page.goBack();
  await expect(page.getByRole("cell", { name: "SHP-2026-00002" })).toBeVisible();
  await page.getByRole("cell", { name: "SHP-2026-00002" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "SHP-2026-00002" })).toBeVisible();
  await page.getByRole("tab", { name: /^Takip/ }).click();
  await expect(panel.locator("code", { hasText: "AR-9876543210" })).toBeVisible({
    timeout: 15000,
  });
  // Bayat veri denetimi: önceki sevkiyatın takip numarası DOM'da kalmamalı.
  expect(await page.content()).not.toContain("YK-1234567890");
  // Aşama çubuğu da yeni kaydın durumunda (Out for Delivery → Dağıtımda).
  await expect(panel.locator('[aria-current="step"]')).toContainText("Dağıtımda");

  // 3) Sekmeler arası hızlı tur (2 tur × 8 sekme) — beklemesiz tıklama.
  const tabNames = [
    /^Kalemler/,
    /^Koliler/,
    /^Belgeler/,
    /^Takip/,
    /^Bacaklar/,
    /^Maliyet/,
    /^Teslim kanıtı/,
    /^İstasyonlar/,
  ];
  for (let tour = 0; tour < 2; tour++) {
    for (const name of tabNames) await page.getByRole("tab", { name }).click();
  }
  await expect(page.getByRole("tab", { name: /^İstasyonlar/ })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(panel).not.toBeEmpty();

  assertClean(errors, "B2 sekme/bayat veri turu");
});

// ═════════════════════════════════════════════════════════════════════════
// 6 · A3 — localStorage kanban + ?severity: filtre açılışta temizlenir
// ═════════════════════════════════════════════════════════════════════════

test("A3 · kanban modu localStorage'dan + ?severity=Critical: filtre temizlenir, 3 sütun dolu; kart moduna dönüş + çözümle çalışır", async ({
  page,
}) => {
  const errors = collectErrors(page);
  // Kullanıcı geçen oturumda pano modunu seçmiş (yalnız masaüstü tercihi yazılır).
  await page.addInitScript(() => localStorage.setItem("lv-mode:logistics-exceptions", "kanban"));

  await page.goto("/panel/lojistik/istisnalar?severity=Critical");
  await expect(page.locator("h1")).toHaveText("İstisna kuyruğu", { timeout: 15000 });

  // Düzeltme (watch immediate): pano modunda severity açılışta da temizlenir
  // — yoksa iki sütun boş görünüp "iş yok" yalanı söylüyordu.
  await expect(page).not.toHaveURL(/severity=/, { timeout: 15000 });

  // Üç sütun ve İÇLERİ dolu (mock: Critical 2, Warning 1, Info 1-çözülmüş).
  const cols = page.locator(".kanban-col");
  await expect(cols).toHaveCount(3);
  await expect(cols.nth(0).locator(".kanban-col-header")).toContainText("Kritik");
  await expect(cols.nth(0).locator(".kanban-col-count")).toHaveText("2");
  await expect(cols.nth(0).locator("button.kanban-card")).toHaveCount(2);
  await expect(cols.nth(1).locator(".kanban-col-count")).toHaveText("1");
  await expect(cols.nth(1).locator("button.kanban-card")).toHaveCount(1);
  await expect(cols.nth(2).locator(".kanban-col-count")).toHaveText("1");
  await expect(cols.nth(2).locator("button.kanban-card")).toHaveCount(1);
  // Panoda süzgeç hapları GİZLİ (pano üç dereceyi birden gösteriyor).
  await expect(page.locator("button.status-pill")).toHaveCount(0);

  // Kart moduna dönüş → filtre hapları geri gelir, 4 satır.
  await page.getByRole("button", { name: "Kart Görünümü" }).click();
  const rows = page.locator("ul.space-y-2 > li");
  await expect(rows).toHaveCount(4);
  await expect(pillCount(page, "Kritik")).toHaveText("2");

  // Çözümle akışı (MOCK) kanban gel-gitinden sonra da işliyor.
  await rows.nth(0).getByRole("button", { name: "Çözümle" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill("Kanban dönüşü doğrulama notu.");
  await dialog.getByRole("button", { name: "Çözümle" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".toast-success")).toHaveCount(1);
  await expect(pillCount(page, "Kritik")).toHaveText("1");

  assertClean(errors, "A3 kanban + çözümle");
});

test("A3 · çözümle diyaloğu: açılışta odak nota, Esc kapatır, odak tetikleyen butona döner", async ({
  page,
}) => {
  await page.goto("/panel/lojistik/istisnalar");
  const rows = page.locator("ul.space-y-2 > li");
  await expect(rows.first()).toBeVisible({ timeout: 15000 });

  const trigger = rows.nth(0).getByRole("button", { name: "Çözümle" });
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Açılışta odak not alanında (klavye kullanıcısı doğrudan yazabilmeli).
  await expect(dialog.getByRole("textbox")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  // Odak iadesi: diyaloğu açan Çözümle butonuna geri.
  await expect(trigger).toBeFocused();
  // İptal hiçbir şeyi çözmedi: sayaçlar yerinde.
  await expect(pillCount(page, "Kritik")).toHaveText("2");
});

// ═════════════════════════════════════════════════════════════════════════
// 7 · M1 — katalog pill stresi: 9 hızlı geçiş, son tıklananın verisi
// ═════════════════════════════════════════════════════════════════════════

test("M1 · 9 hızlı pill geçişi: son kataloğun başlığı ve satırları tutarlı, konsol temiz", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/panel/lojistik/kataloglar");
  await expect(page.getByRole("button", { name: "Taşıyıcı Şubeleri", exact: true })).toBeVisible({
    timeout: 15000,
  });

  // Beklemesiz ardışık tıklama — bayat yanıt son ekranı ezmemeli.
  const sequence = [
    "Taşıyıcı Servisleri",
    "Paket Tipleri",
    "Araç Tipleri",
    "Sevkiyat Kanalları",
    "Taşıyıcı Şubeleri",
    "Sevkiyat Yöntemleri",
    "Servis Kapsama Alanları",
    "Sevkiyat İstisna Kodları",
    "Lojistik Sağlayıcıları",
  ];
  for (const label of sequence) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }

  // Son tıklanan kazanmalı: URL + hap + başlık + satır verisi AYNI kataloğu söylüyor.
  await expect(page).toHaveURL(/catalog=logistics_provider/);
  await expect(
    page.getByRole("button", { name: "Lojistik Sağlayıcıları", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 1, name: "Lojistik Sağlayıcıları" })).toBeVisible();
  await expect(page.getByText("Aras Kargo").first()).toBeVisible({ timeout: 15000 });

  // Başlık-satır tutarlılığı: "N kayıt" sayacı ile tablo satır sayısı aynı
  // (sağlayıcı kataloğu tek sayfaya sığar — sayfa boyutu 50).
  const countText = await page.locator("h1 + p").innerText();
  const declared = Number(/(\d+)/.exec(countText)?.[1] ?? -1);
  expect(declared, `başlık sayacı okunamadı: "${countText}"`).toBeGreaterThan(0);
  await expect(page.locator("tbody tr")).toHaveCount(declared);

  assertClean(errors, "M1 pill stresi");
});

// ═════════════════════════════════════════════════════════════════════════
// 8 · L1 — hızlı panel/tarih değişimi sonrası sayılar + A1 paritesi
// ═════════════════════════════════════════════════════════════════════════

test("L1 · hızlı panel+tarih geçişleri: son durumun sayıları mock ile birebir", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const fixed = { from: "2026-01-01", to: "2026-01-31" };
  const ops = expectedOps(fixed.from, fixed.to);

  await page.goto("/panel/lojistik/raporlar");
  await expect(page.locator("#report-from")).toHaveValue(/\d{4}-\d{2}-\d{2}/, { timeout: 15000 });

  // Hızlı ardışık panel geçişleri (beklemesiz).
  await page.getByRole("button", { name: /Performans raporu/ }).click();
  await page.getByRole("button", { name: /Maliyet raporu/ }).click();
  await page.getByRole("button", { name: /Operasyon raporu/ }).click();
  await page.getByRole("button", { name: /Performans raporu/ }).click();
  await page.getByRole("button", { name: /Operasyon raporu/ }).click();

  // Tarih değişimi hemen arkasından.
  await page.locator("#report-from").fill(fixed.from);
  await page.locator("#report-to").fill(fixed.to);
  await expect(page).toHaveURL(/from=2026-01-01/);

  // Son durum: operasyon paneli + sabit aralık → mock hesabı birebir.
  await expect(cardValue(page, /^Sevkiyat$/)).toHaveText(String(ops.shipments), {
    timeout: 15000,
  });
  await expect(cardValue(page, /^Teslim edildi$/)).toHaveText(String(ops.delivered));
  await expect(cardValue(page, /^Başarısız$/)).toHaveText(String(ops.failed));

  // Bir geçiş daha: performans paneli aynı aralıkta doğru ortalama söylemeli.
  const avg = expectedAvgDays(fixed.from, fixed.to);
  await page.getByRole("button", { name: /Performans raporu/ }).click();
  await expect(cardValue(page, "Ort. teslim süresi (gün)")).toHaveText(String(avg), {
    timeout: 15000,
  });

  assertClean(errors, "L1 panel/tarih stresi");
});

test("L1↔A1 · ortalama teslim günü paritesi duruyor (varsayılan aralık)", async ({ page }) => {
  const errors = collectErrors(page);
  const range = defaultReportRange();
  const expectedAvg = expectedAvgDays(range.from, range.to);

  await page.goto("/panel/lojistik/raporlar?panel=performance");
  await expect(cardValue(page, "Ort. teslim süresi (gün)")).toHaveText(String(expectedAvg), {
    timeout: 15000,
  });

  await page.goto("/panel/lojistik/pano");
  const dashCard = cardValue(page, /^Ortalama teslim$/);
  await expect(dashCard).toContainText("gün", { timeout: 15000 });
  const dashValue = parseFloat(((await dashCard.textContent()) ?? "").replace("gün", "").trim());
  expect(dashValue, `Pano (${dashValue}) ≠ rapor (${expectedAvg}) — parite bozulmuş`).toBe(
    expectedAvg
  );

  assertClean(errors, "A1↔L1 paritesi");
});

// ═════════════════════════════════════════════════════════════════════════
// 9 · Satıcı oturumu — yabancı sevkiyat URL'i + kendi listesi
// ═════════════════════════════════════════════════════════════════════════

/**
 * Satıcının GÖRMEDİĞİ ama admin'in gördüğü sevkiyat adları.
 *
 * `g0-security.spec.ts`teki `foreignShipments()` ile aynı fikir: "yabancı
 * kayıt" ortamdan türetilir, sabit yazılmaz. Guest sızıntısı olmasın diye
 * her bağlam kendi storageState'iyle açılır (Playwright'ta parametresiz
 * `request.newContext()` aktif testin state'ini DEVRALIR).
 */
async function yabanciSevkiyatlar(): Promise<string[]> {
  const adlar = async (state: string): Promise<string[]> => {
    const ctx = await pwRequest.newContext({ baseURL: BASE, storageState: state });
    try {
      const r = await ctx.get(
        "/api/method/tradehub_core.api.v1.shipment.list_shipments?limit_page_length=100"
      );
      const govde = await r.json();
      const satirlar = (govde?.message ?? govde)?.data?.shipments ?? [];
      return satirlar.map((x: { name: string }) => x.name);
    } finally {
      await ctx.dispose();
    }
  };
  const [admin, satici] = await Promise.all([adlar(ADMIN_STATE), adlar(SELLER_STATE)]);
  const saticininkiler = new Set(satici);
  return admin.filter((n) => !saticininkiler.has(n));
}

test.describe("satıcı oturumu", () => {
  test.use({ storageState: SELLER_STATE });

  test("yabancı sevkiyat URL'i: TR 'bulunamadı' durumu; ham İngilizce/INTERNAL_ERROR yok", async ({
    page,
  }) => {
    // 404 kaynak satırı tarayıcının kendi logu — sızıntı değil, süz.
    const errors = collectErrors(page, [/Failed to load resource/i]);

    // Yabancı kayıt ÇALIŞMA ANINDA bulunur, sabit yazılmaz. Önceki sürüm
    // "SHP-2026-00001 satıcı kümesi boş (API ile ölçüldü)" diyordu; bu bir
    // ORTAM gerçeğiydi, ürün davranışı değil. Başka bir dev sitesinde aynı
    // kullanıcı o siparişin ALICISI olabiliyor (list_shipments sözleşmesi:
    // "seller kendi mağazasının, buyer kendi siparişlerinin sevkiyatlarını
    // görür") ve test, üründe hiçbir kusur yokken kırmızıya dönüyordu.
    const yabanci = (await yabanciSevkiyatlar())[0];
    test.skip(!yabanci, "satıcı tüm sevkiyatları görüyor — yabancı kayıt yok");

    await page.goto(`/panel/lojistik/sevkiyatlar/${yabanci}`);

    const alert = errorAlert(page).filter({ hasText: /\S/ }).first();
    await expect(alert).toBeVisible({ timeout: 15000 });
    await expect(alert).toContainText("bulunamadı"); // TR kullanıcı metni
    const alertText = (await alert.innerText()).trim();
    expect(alertText).not.toContain("INTERNAL_ERROR");
    expect(alertText).not.toMatch(/not allowed|does not have access|DoesNotExist|Traceback/i);

    // Detay içeriği çizilmemiş: sekme yok, başlıkta sevkiyat adı yok.
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: yabanci })).toBeHidden();

    assertClean(errors, "satıcı yabancı sevkiyat");
  });

  test("kendi listesi işlevsel: boş durum + filtre + temizleme çalışıyor", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/panel/lojistik/sevkiyatlar");
    await expect(page.getByRole("heading", { name: "Sevkiyatlar" })).toBeVisible({
      timeout: 15000,
    });

    // Hata durumu HİÇBİR koşulda beklenmiyor — bu iddia veriden bağımsız.
    await expect(errorAlert(page).filter({ hasText: /\S/ })).toHaveCount(0);

    // Kaç kaydı olduğu ORTAMA bağlı; iddia edilen şey EKRANIN DAVRANIŞI.
    // Önceki sürüm "satıcının kaydı yok (ölçüldü)" varsayıyordu ve satıcının
    // kendi siparişinin alıcısı olduğu bir sitede kırmızıya dönüyordu.
    //
    // Satırları ELLE SAYMA: `count()` beklemez, anlık okur. Sayaç metni
    // ("N kayıt") satırlardan ÖNCE çiziliyor, bu yüzden "sayaç görünene kadar
    // bekle, sonra say" da erken 0 okuyup testi yanlış dala sokuyordu
    // (ölçüldü 7 Eyl: ekranda 1 kayıt varken sayım 0 döndü).
    //
    // Doğrusu: beklenen sayıyı BAŞLIKTAN oku, gövdeyi `toHaveCount` ile
    // bekle. Yan kazanç — bu, başlık ile gövdenin AYNI ŞEYİ söylediğini de
    // doğruluyor; ikisinin ayrışması `shipments.spec.ts`te ayrıca
    // belgelenmiş gerçek bir kusur ("başlık 3 kayıt derken gövde boş").
    // Liste ÇÖZÜLENE kadar bekle: ya bir veri satırı ya boş durum görünsün.
    // Başlığı önce okumak yetmiyor — yüklenirken "0 kayıt" yazıyor ve sayım
    // yanlış dala sapıyor (ölçüldü 7 Eyl, iki ayrı denemede).
    const bosDurum = page.getByText("Henüz sevkiyat kaydı yok");
    await expect(page.locator("tbody tr").first().or(bosDurum)).toBeVisible({ timeout: 15000 });

    const sayacMetni = await page.getByText(/\d+ kayıt/).first().innerText();
    const kayitSayisi = Number(sayacMetni.match(/\d+/)?.[0] ?? "0");

    if (kayitSayisi === 0) {
      await expect(bosDurum).toBeVisible({ timeout: 15000 });
    } else {
      await expect(page.locator("tbody tr")).toHaveCount(kayitSayisi, { timeout: 15000 });
    }

    // Filtre etkileşimi: hiçbir kaydın taşımadığı bir duruma süz → filtreli
    // boş durum ("kayıt yok" DEĞİL) → temizle → başlangıca dön. Satıcı
    // İptal edilmiş sevkiyat tutmuyor; kayıt sayısından bağımsız çalışır.
    await page.getByRole("button", { name: "İptal edildi", exact: true }).click();
    await expect(page).toHaveURL(/status=Cancelled/);
    await expect(page.getByText("Bu filtrelerle sonuç bulunamadı")).toBeVisible();
    await page.getByRole("button", { name: "Filtreleri temizle" }).click();
    await expect(page).not.toHaveURL(/status=/);
    await expect(page.locator("tbody tr")).toHaveCount(kayitSayisi);

    assertClean(errors, "satıcı kendi listesi");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 10 · Rota stresi — 17 hızlı SPA geçişi + 3 bilinmeyen URL
// ═════════════════════════════════════════════════════════════════════════

test("rota stresi · 17 hızlı SPA geçişi: login formu hiç görünmez, konsol hatası birikmez", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/panel/lojistik/pano");
  await expect(page.locator("h1")).toHaveText("Lojistik panosu", { timeout: 15000 });

  // Menü akordeon: kapalı gruptaki linke tıklanamaz (grup başlığı hit-target'ı
  // örter — gerçek kullanıcı da önce grubu açar). Tüm grupları bir kez aç.
  const titles = page.locator(".sidebar-panel .panel-group-title");
  const groupCount = await titles.count();
  for (let i = 0; i < groupCount; i++) {
    const grp = page.locator(".sidebar-panel .panel-group.collapsible").nth(i);
    if (!(await grp.evaluate((el) => el.classList.contains("open")))) {
      await titles.nth(i).click();
      await expect(grp).toHaveClass(/open/);
    }
  }

  // Menüdeki 18 kalemin tamamında beklemesiz SPA turu (goto YOK — SPA kalır).
  const hrefs = [
    "/lojistik/bekleyen-isler",
    "/lojistik/istisnalar",
    "/lojistik/raporlar",
    "/lojistik/sevkiyatlar",
    "/lojistik/sevkiyatlar/yeni",
    "/lojistik/paketleme",
    "/lojistik/teslim-kaniti",
    "/lojistik/satici-teslimati",
    "/lojistik/alici-teslim-alma",
    "/lojistik/iadeler",
    "/lojistik/tarifeler",
    "/lojistik/fiyat-kurallari",
    "/lojistik/fiyat-simulasyonu",
    "/lojistik/tasiyici-hesaplari",
    "/lojistik/durum-eslemesi",
    "/lojistik/kataloglar",
    "/lojistik/ayarlar",
    "/lojistik/pano",
  ];
  for (const href of hrefs) {
    await page.locator(`.sidebar-panel a.panel-item[href$="${href}"]`).click();
    // Beklemesiz tur — yalnız login formunun HİÇ parlamadığını denetle.
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  }

  // Tur sonu: pano ayakta, oturum yerinde.
  await expect(page).toHaveURL(/\/lojistik\/pano/);
  await expect(page.locator("h1")).toHaveText("Lojistik panosu", { timeout: 15000 });
  await expect(page.locator('input[type="password"]')).toHaveCount(0);

  assertClean(errors, "SPA rota stresi");
});

test("rota stresi · 3 bilinmeyen URL: hep dashboard'a iner, login formu görünmez", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const unknowns = [
    "/panel/lojistik/olmayan-ekran",
    "/panel/hic-boyle-sayfa-yok",
    "/panel/lojistik/x/y/z/q",
  ];
  for (const url of unknowns) {
    await page.goto(url);
    // Catch-all düzeltmesi (2026-09-03): oturumlu kullanıcı TUTARLI şekilde
    // dashboard'a — login formuna asla.
    await page.waitForURL(/\/panel\/dashboard$/, { timeout: 15000 });
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    expect(
      (await page.locator("body").innerText()).trim().length,
      `${url}: beyaz ekran — dashboard render edilmedi`
    ).toBeGreaterThan(0);
  }
  assertClean(errors, "bilinmeyen URL turu");
});
