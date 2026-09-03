import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";

/**
 * M1/M2 katalog, M3 ayarlar, F1 taşıyıcı hesapları, F4 durum eşlemesi ve
 * L1 rapor merkezi (17-FE) detay E2E koşumu — SALT OKUNUR.
 *
 * Beklentiler koddan türetildi:
 *  - Katalog sözleşmesi: src/api/logisticsCatalogKeys.js + mocks/logistics/_catalog-meta.json
 *  - Rapor sözleşmesi + mock: src/api/reports.js + src/api/reportsMock.js (deterministik hash)
 *  - CSV: src/utils/csv.js (RFC4180 + formül öneki; negatif düz sayı MUAF)
 *  - Pano paritesi: src/api/dashboardMetrics.js (avg_delivery_days = reportsMock.performance)
 *  - Menü: src/router/logisticsScreens.js menuScreens() → 17 kalem, gruplar data/navigation.js
 *
 * CANLI VERİ SINIRI: M1/M2/M3/F1/F4 canlı Faz 3 uçlarına gider; hiçbir test
 * kaydetmez/silmez, F1'de reveal TETİKLENMEZ (denetim satırı yazar).
 */

// ───────────────────────────────────────────────────────────────────────────
// reportsMock portu (src/api/reportsMock.js ile birebir) — ekran/CSV parite
// beklentileri buradan hesaplanır. Mock deterministik (Math.random yok).
// ───────────────────────────────────────────────────────────────────────────

const PROFILES = [
  { carrier: "Yurtiçi Kargo", base: 6, avgDays: 1.8, costKurus: 6250, chargeKurus: 7900 },
  { carrier: "Aras Kargo", base: 5, avgDays: 2.2, costKurus: 5800, chargeKurus: 7200 },
  { carrier: "MNG Kargo", base: 4, avgDays: 3.1, costKurus: 7100, chargeKurus: 6900 },
  { carrier: "PTT Kargo", base: 3, avgDays: 2.6, costKurus: 4990, chargeKurus: 6400 },
];

const round2 = (v: number) => Math.round(v * 100) / 100;
const round4 = (v: number) => Math.round(v * 10000) / 10000;
const tl = (kurus: number) => kurus / 100;

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
  return { shipments, delivered, failed, cancelled, inTransit, onTime, avgDays };
}

const toDay = (date: Date) => date.toISOString().slice(0, 10);

function listDays(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const days: string[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) days.push(toDay(new Date(t)));
  return days;
}

/** Sözleşme varsayılanı: son 30 gün (bugün dahil) — reportsMock.defaultReportRange portu. */
function defaultReportRange(today = new Date()) {
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const start = new Date(end.getTime() - 29 * 86_400_000);
  return { from: toDay(start), to: toDay(end) };
}

function aggregate(from: string, to: string) {
  const days = listDays(from, to);
  return PROFILES.map((profile) => {
    const acc = {
      profile,
      shipments: 0,
      delivered: 0,
      failed: 0,
      cancelled: 0,
      inTransit: 0,
      onTime: 0,
      daysWeighted: 0,
    };
    for (const day of days) {
      const cell = dayCell(day, profile);
      acc.shipments += cell.shipments;
      acc.delivered += cell.delivered;
      acc.failed += cell.failed;
      acc.cancelled += cell.cancelled;
      acc.inTransit += cell.inTransit;
      acc.onTime += cell.onTime;
      acc.daysWeighted += cell.avgDays * cell.delivered;
    }
    return acc;
  });
}

const sum = (rows: any[], field: string) => rows.reduce((acc, row) => acc + row[field], 0);

function expectedOperations(from: string, to: string) {
  const byCarrier = aggregate(from, to);
  const delivered = sum(byCarrier, "delivered");
  return {
    totals: {
      shipments: sum(byCarrier, "shipments"),
      delivered,
      cancelled: sum(byCarrier, "cancelled"),
      failed: sum(byCarrier, "failed"),
      on_time_rate: delivered ? round4(sum(byCarrier, "onTime") / delivered) : 0,
    },
    by_carrier: byCarrier.map((row) => ({
      carrier: row.profile.carrier,
      count: row.shipments,
      delivered: row.delivered,
      failed: row.failed,
    })),
  };
}

function expectedPerformance(from: string, to: string) {
  const byCarrier = aggregate(from, to);
  const delivered = sum(byCarrier, "delivered");
  return {
    avg_delivery_days: delivered ? round2(sum(byCarrier, "daysWeighted") / delivered) : 0,
    on_time_rate: delivered ? round4(sum(byCarrier, "onTime") / delivered) : 0,
    sla_breaches: delivered - sum(byCarrier, "onTime") + sum(byCarrier, "failed"),
  };
}

function expectedCost(from: string, to: string) {
  const byCarrier = aggregate(from, to);
  const rows = byCarrier.map((row) => {
    const costKurus = row.shipments * row.profile.costKurus;
    const chargeKurus = row.shipments * row.profile.chargeKurus;
    return {
      carrier: row.profile.carrier,
      cost: tl(costKurus),
      charge: tl(chargeKurus),
      margin: tl(chargeKurus - costKurus),
      shipments: row.shipments,
    };
  });
  return rows;
}

// ── CSV yardımcıları (src/utils/csv.js portu — beklenen çıktıyı üretir) ────
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;
const PLAIN_NUMBER_RE = /^-\d+(?:[.,]\d+)?$/;
const NEEDS_QUOTING_RE = /["\n\r]/;

function csvEscape(value: unknown, delimiter = ","): string {
  let text = value == null ? "" : String(value);
  if (FORMULA_PREFIX_RE.test(text) && !PLAIN_NUMBER_RE.test(text)) text = `'${text}`;
  if (NEEDS_QUOTING_RE.test(text) || (delimiter && text.includes(delimiter))) {
    text = `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function csvNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Ortak yardımcılar
// ───────────────────────────────────────────────────────────────────────────

// Panel dili localStorage["th-lang"]'ten, yoksa navigator.language'tan
// geliyor (src/i18n/index.js) — Playwright'ın varsayılanı `en` olduğu için
// TR beklentileri tutmazdı. Uygulama yüklenmeden önce TR sabitlenir.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("th-lang", "tr"));
});

type ErrorLog = { errors: string[] };

/** Konsol error + pageerror toplayıcı (görev madde 7). favicon gürültüsü hariç. */
function collectErrors(page: Page): ErrorLog {
  const log: ErrorLog = { errors: [] };
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("favicon")) {
      log.errors.push(`console.error: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => log.errors.push(`pageerror: ${err.message}`));
  return log;
}

function assertNoErrors(log: ErrorLog, screen: string) {
  expect(log.errors, `${screen} ekranında konsol hatası birikmemeli`).toEqual([]);
}

/** KPI/özet kartı değeri — etiketi p[0], değeri p[1] olan article.card deseni. */
function cardValue(page: Page, label: string | RegExp) {
  return page
    .locator("article.card")
    .filter({ has: page.locator("p", { hasText: label }) })
    .locator("p")
    .nth(1);
}

// Katalog sözleşmesi (_catalog-meta.json anahtarları) + TR başlıkları
// (doctypeNames.* — catalogMeta.catalogTitle). Uç anahtarları ALFABETİK
// döndürüyor; M1 varsayılanı listenin İLKİ (carrier_branch).
const CATALOG_TITLES: Record<string, string> = {
  carrier_branch: "Taşıyıcı Şubeleri",
  carrier_service: "Taşıyıcı Servisleri",
  carrier_status_mapping: "Taşıyıcı Durum Eşlemeleri",
  logistics_provider: "Lojistik Sağlayıcıları",
  package_type: "Paket Tipleri",
  service_coverage_area: "Servis Kapsama Alanları",
  shipment_exception_code: "Sevkiyat İstisna Kodları",
  shipping_channel: "Sevkiyat Kanalları",
  shipping_method: "Sevkiyat Yöntemleri",
  vehicle_type: "Araç Tipleri",
};

// ═══════════════════════════════════════════════════════════════════════════
// M1 · Kataloglar
// ═══════════════════════════════════════════════════════════════════════════

test.describe("M1 · Katalog listesi", () => {
  test("açılış: 10 katalog pill'i, varsayılan katalog listesi ve sekme başlığı", async ({
    page,
  }) => {
    const log = collectErrors(page);
    await page.goto("/panel/lojistik/kataloglar");

    // Sekme başlığı ayırt edici (WCAG 2.4.2 — manifest labelKey).
    await expect(page).toHaveTitle("Lojistik Kataloglar · iStoc B2B", { timeout: 15000 });

    // Katalog seçici: sözleşmedeki 10 anahtarın TR başlıkları pill olarak var.
    for (const title of Object.values(CATALOG_TITLES)) {
      await expect(
        page.getByRole("button", { name: title, exact: true }),
        `katalog pill'i eksik: ${title}`
      ).toBeVisible({ timeout: 15000 });
    }

    // Uç alfabetik döndürüyor → varsayılan katalog carrier_branch; onun
    // listesi yüklenmeli (canlıda 9 kayıt var — en az 1 satır bekleriz).
    await expect(
      page.getByRole("button", { name: CATALOG_TITLES.carrier_branch, exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15000 });

    assertNoErrors(log, "M1 katalog listesi");
  });

  test("pill ile katalog değişimi URL'e yazılır ve liste o kataloğa döner", async ({ page }) => {
    const log = collectErrors(page);
    await page.goto("/panel/lojistik/kataloglar");

    await page
      .getByRole("button", { name: CATALOG_TITLES.logistics_provider, exact: true })
      .click();

    await expect(page).toHaveURL(/catalog=logistics_provider/);
    // Canlı seed verisi: Aras Kargo sağlayıcısı listede.
    await expect(page.getByText("Aras Kargo").first()).toBeVisible({ timeout: 15000 });

    assertNoErrors(log, "M1 katalog değişimi");
  });

  test("olmayan katalog anahtarı (?catalog=) ekranı KIRMADAN hata göstermeli", async ({ page }) => {
    // getCatalogMeta bilinmeyen anahtarda fırlatıyor (catalogMeta.js:20);
    // CatalogListScreen setup'ı bunu yakalamıyor — beklenen davranış görünür
    // hata, gözlenen davranış bu test söyleyecek.
    const log = collectErrors(page);
    await page.goto("/panel/lojistik/kataloglar?catalog=olmayan-katalog");
    await page.waitForLoadState("networkidle");

    // Boş toast konteyneri de role=alert taşıyor — METİNLİ bir hata aranıyor.
    await expect
      .soft(
        page.getByRole("alert").filter({ hasText: /./ }),
        "Bilinmeyen katalog anahtarında kullanıcıya görünür bir hata çizilmeli (boş/kırık ekran değil)"
      )
      .toBeVisible({ timeout: 10000 });
    expect(
      log.errors,
      "Bilinmeyen katalog anahtarı yakalanmamış istisna üretmemeli"
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M2 · Katalog formu (KAYDETME YOK)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("M2 · Katalog formu", () => {
  test("listeden kayda tıklayınca form açılır, alanlar canlı veriyle dolu", async ({ page }) => {
    const log = collectErrors(page);
    await page.goto("/panel/lojistik/kataloglar?catalog=logistics_provider");

    await page.getByText("Aras Kargo").first().click();

    // Seed kaydı: name=AK → rota /kataloglar/logistics_provider/AK
    await expect(page).toHaveURL(/\/lojistik\/kataloglar\/logistics_provider\/AK$/, {
      timeout: 15000,
    });
    await expect(page).toHaveTitle("Katalog Kaydı · iStoc B2B");

    // Başlıkta kayıt kimliği, alt satırda katalog başlığı.
    await expect(page.getByRole("heading", { level: 1, name: "AK" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(CATALOG_TITLES.logistics_provider).first()).toBeVisible();

    // Alanlar sözleşmeden ve canlı değerle dolu (get_catalog_item).
    await expect(page.getByLabel(/Sağlayıcı Adı/)).toHaveValue("Aras Kargo");
    await expect(page.getByLabel(/Sağlayıcı Kodu/)).toHaveValue("AK");

    // Admin write iznine sahip → Kaydet düğmesi var; ama TIKLANMAZ (salt okunur tur).
    await expect(page.getByRole("button", { name: "Kaydet" })).toBeVisible();

    assertNoErrors(log, "M2 katalog formu");
  });

  test("olmayan katalog anahtarıyla form rotası ekranı KIRMADAN hata göstermeli", async ({
    page,
  }) => {
    // CatalogFormView title'ı try/catch'liyor ama CatalogFormScreen.sections
    // computed'ı getCatalogMeta'yı korumasız çağırıyor (CatalogFormScreen.vue:275).
    const log = collectErrors(page);
    await page.goto("/panel/lojistik/kataloglar/olmayan-katalog");
    await page.waitForLoadState("networkidle");

    // Boş toast konteyneri de role=alert taşıyor — METİNLİ bir hata aranıyor.
    await expect
      .soft(
        page.getByRole("alert").filter({ hasText: /./ }),
        "Bilinmeyen katalog anahtarında form görünür hata çizmeli (boş/kırık ekran değil)"
      )
      .toBeVisible({ timeout: 10000 });
    expect(
      log.errors,
      "Bilinmeyen katalog anahtarı yakalanmamış istisna üretmemeli"
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// M3 · Lojistik ayarları (salt okunur — hiçbir anahtar çevrilmez)
// ═══════════════════════════════════════════════════════════════════════════

test("M3 · ayarlar ekranı canlı değerlerle render olur", async ({ page }) => {
  const log = collectErrors(page);
  await page.goto("/panel/lojistik/ayarlar");

  await expect(page).toHaveTitle("Lojistik Ayarları · iStoc B2B", { timeout: 15000 });
  await expect(page.getByRole("heading", { level: 1, name: "Lojistik ayarları" })).toBeVisible({
    timeout: 15000,
  });

  // Ana anahtar bölümü ve bayrak listesi yüklendi (get_logistics_settings).
  await expect(page.getByText("Lojistik modülü").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Özellik bayrakları" })).toBeVisible();
  // Canlı yanıtta en az carrier_api_enabled bayrağı var → satır çizilmeli.
  await expect(page.locator('[title="carrier_api_enabled"]')).toBeVisible();

  // Varsayılanlar kartı canlı değerlerle: TRY, SHP serisi, 3 deneme, 15 gün.
  await expect(page.getByRole("heading", { name: "Varsayılanlar" })).toBeVisible();
  const defaults = page.locator("dl");
  await expect(defaults.getByText("Varsayılan para birimi")).toBeVisible();
  await expect(defaults.getByText("TRY", { exact: true })).toBeVisible();
  await expect(defaults.getByText("SHP-.YYYY.-.#####")).toBeVisible();

  // Salt okunur tur: hiçbir switch'e tıklanmadı (denetim/deploy etkisi yok).
  assertNoErrors(log, "M3 ayarlar");
});

// ═══════════════════════════════════════════════════════════════════════════
// F1 · Taşıyıcı hesapları (sır sözleşmesi — reveal TETİKLENMEZ)
// ═══════════════════════════════════════════════════════════════════════════

test("F1 · hesap listesi: yanıt gövdesinde sır DEĞERİ dolaşmaz, ölü buton yok", async ({
  page,
}) => {
  const log = collectErrors(page);

  const listResponse = page.waitForResponse((res) =>
    res.url().includes("list_carrier_accounts")
  );
  await page.goto("/panel/lojistik/tasiyici-hesaplari");

  await expect(page).toHaveTitle("Taşıyıcı Hesapları · iStoc B2B", { timeout: 15000 });
  await expect(page.getByRole("heading", { level: 1, name: "Taşıyıcı hesapları" })).toBeVisible({
    timeout: 15000,
  });

  // SIR SÖZLEŞMESİ (CarrierAccountScreen: yanıt yalnız has_<alan> bayrağı
  // taşır): liste yanıtının HİÇBİR yerinde ham sır alanı olmamalı.
  const body = await (await listResponse).text();
  for (const secret of ["api_key", "api_secret", "webhook_secret", "access_token"]) {
    expect(
      body.includes(`"${secret}"`),
      `list_carrier_accounts yanıtı ham sır alanı taşımamalı: ${secret} (yalnız has_${secret} bayrağı)`
    ).toBe(false);
  }

  // Denetim notu her durumda görünür.
  await expect(page.getByText(/Kimlik bilgisi değerleri liste ve detay/)).toBeVisible();

  const rowCount = await page.locator("ul > li.card").count();
  if (rowCount > 0) {
    // Sır alanları MASKELİ: en az bir "•••••" ya da "tanımlı değil" görünmeli,
    // reveal butonu ("Göster") varsa TIKLANMAZ (denetim satırı yazar).
    const masked = await page.getByText("•••••").count();
    const notSet = await page.getByText("tanımlı değil").count();
    expect(masked + notSet, "sır alanları maskeli/tanımsız gösterilmeli").toBeGreaterThan(0);
    // DOM'da düz metin sır olmadığının dolaylı kontrolü: reveal edilmiş değer
    // alanı (select-all font-mono span) hiç render edilmemiş olmalı.
    expect(await page.locator("span.select-all").count()).toBe(0);
  } else {
    // Canlı ortamda hesap yoksa boş durum düzgün çizilmeli.
    await expect(page.getByText(/Henüz taşıyıcı hesabı kaydı yok/)).toBeVisible();
  }

  // ÖLÜ BUTON YASAĞI: form/test ekranı yokken create/edit/test çizilmez
  // (canCreate/canEdit/canTest bilinçli false — CarrierAccountView).
  await expect(page.getByRole("button", { name: "Yeni hesap" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Düzenle" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bağlantıyı test et" })).toHaveCount(0);

  assertNoErrors(log, "F1 taşıyıcı hesapları");
});

// ═══════════════════════════════════════════════════════════════════════════
// F4 · Durum eşlemesi
// ═══════════════════════════════════════════════════════════════════════════

test.describe("F4 · Durum eşlemesi", () => {
  test("liste render: taşıyıcı pill'leri, kapsam uyarısı, eşleme grupları", async ({ page }) => {
    const log = collectErrors(page);
    await page.goto("/panel/lojistik/durum-eslemesi");

    await expect(page).toHaveTitle("Durum Eşlemesi · iStoc B2B", { timeout: 15000 });
    await expect(page.getByRole("heading", { level: 1, name: "Durum eşlemesi" })).toBeVisible({
      timeout: 15000,
    });

    // Sağlayıcı pill'leri canlı katalogtan (8 sağlayıcı seed'li).
    for (const provider of ["Aras Kargo", "DHL", "FedEx", "MNG Kargo", "PTT Kargo"]) {
      await expect(page.getByRole("button", { name: provider, exact: true })).toBeVisible({
        timeout: 15000,
      });
    }

    // Varsayılan taşıyıcı = listenin ilki (AK/Aras Kargo) — 4 eşlemesi var,
    // tüm iç durumları kapsamıyor → kapsam uyarısı (role=alert) beklenir.
    await expect(page.getByRole("button", { name: "Aras Kargo", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.getByText("TESLIM", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/eşlemesi olmayan iç durumlar/)).toBeVisible();

    // Taşıyıcı değişimi URL'e yazılır ve satırlar o taşıyıcıya süzülür.
    await page.getByRole("button", { name: "DHL", exact: true }).click();
    await expect(page).toHaveURL(/carrier=DHL/);
    await expect(page.getByText("Hava Koşulları Gecikmesi")).toBeVisible({ timeout: 15000 });
    // AK'ye özel kod artık görünmemeli.
    await expect(page.getByText("Şubede Bekliyor")).toHaveCount(0);

    assertNoErrors(log, "F4 durum eşlemesi");
  });

  test("Düzenle → M2 katalog formu açılır (kaydetme yok)", async ({ page }) => {
    const log = collectErrors(page);
    await page.goto("/panel/lojistik/durum-eslemesi?carrier=AK");

    const row = page.locator("tr").filter({ hasText: "Şubede Bekliyor" });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Düzenle" }).click();

    await expect(page).toHaveURL(/\/lojistik\/kataloglar\/carrier_status_mapping\/AK-SUBEDE$/, {
      timeout: 15000,
    });
    await expect(page.getByRole("heading", { level: 1, name: "AK-SUBEDE" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByLabel(/Taşıyıcı Durum Kodu/)).toHaveValue("SUBEDE");

    assertNoErrors(log, "F4 → M2 geçişi");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// L1 · Rapor merkezi (mock — deterministik parite denetimleri)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("L1 · Rapor merkezi", () => {
  test("açılış: operasyon paneli, son-30-gün varsayılanı, mock ile sayı paritesi", async ({
    page,
  }) => {
    const log = collectErrors(page);
    const range = defaultReportRange();
    const ops = expectedOperations(range.from, range.to);

    await page.goto("/panel/lojistik/raporlar");
    await expect(page).toHaveTitle("Raporlar · iStoc B2B", { timeout: 15000 });
    await expect(page.getByRole("heading", { level: 1, name: "Rapor merkezi" })).toBeVisible({
      timeout: 15000,
    });

    // Varsayılan aralık sözleşmeden: son 30 gün (bugün dahil), URL paramsız.
    await expect(page.locator("#report-from")).toHaveValue(range.from);
    await expect(page.locator("#report-to")).toHaveValue(range.to);

    // Operasyon paneli aktif kart.
    await expect(
      page.getByRole("button", { name: /Operasyon raporu/ })
    ).toHaveAttribute("aria-pressed", "true");

    // Toplam kartları mock hesabıyla AYNI olmalı (deterministik hash).
    await expect(cardValue(page, /^Sevkiyat$/)).toHaveText(String(ops.totals.shipments), {
      timeout: 15000,
    });
    await expect(cardValue(page, /^Teslim edildi$/)).toHaveText(String(ops.totals.delivered));
    await expect(cardValue(page, /^Başarısız$/)).toHaveText(String(ops.totals.failed));
    await expect(cardValue(page, /^İptal$/)).toHaveText(String(ops.totals.cancelled));

    // Taşıyıcı kırılımı: 4 taşıyıcı ve sayılar birebir.
    for (const row of ops.by_carrier) {
      const tr = page.locator("tr").filter({ hasText: row.carrier });
      await expect(tr).toBeVisible();
      await expect(tr.locator("td").nth(1)).toHaveText(String(row.count));
      await expect(tr.locator("td").nth(2)).toHaveText(String(row.delivered));
      await expect(tr.locator("td").nth(3)).toHaveText(String(row.failed));
    }

    assertNoErrors(log, "L1 operasyon paneli");
  });

  test("panel geçişleri: performans ve maliyet panelleri, viewCost Administrator'da açık", async ({
    page,
  }) => {
    const log = collectErrors(page);
    const range = defaultReportRange();
    const perf = expectedPerformance(range.from, range.to);

    await page.goto("/panel/lojistik/raporlar");
    await expect(page.locator("#report-from")).toHaveValue(range.from, { timeout: 15000 });

    // → Performans paneli
    await page.getByRole("button", { name: /Performans raporu/ }).click();
    await expect(page).toHaveURL(/panel=performance/);
    await expect(cardValue(page, "Ort. teslim süresi (gün)")).toHaveText(
      String(perf.avg_delivery_days),
      { timeout: 15000 }
    );
    await expect(cardValue(page, /^SLA ihlali$/)).toHaveText(String(perf.sla_breaches));
    // Günlük gidişat tablosu aralıktaki her gün için satır üretir (30 gün).
    await expect(page.getByText("Günlük gidişat")).toBeVisible();

    // → Maliyet paneli: Administrator view.logistics_cost taşıyor → rapor
    // GÖRÜNÜR (yetki hatası değil). MNG mock'ta bilinçli zararda → şerit.
    await page.getByRole("button", { name: /Maliyet raporu/ }).click();
    await expect(page).toHaveURL(/panel=cost/);
    await expect(page.getByText("Taşıyıcı maliyeti").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Zarar eden kırılım\(lar\): MNG Kargo/)).toBeVisible();
    await expect(page.getByText("Maliyet bilgisini görüntüleme yetkiniz yok.")).toHaveCount(0);

    // ← Operasyona dönüş
    await page.getByRole("button", { name: /Operasyon raporu/ }).click();
    await expect(page.getByRole("button", { name: /Operasyon raporu/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    assertNoErrors(log, "L1 panel geçişleri");
  });

  test("tarih aralığı değişimi URL'e yazılır ve veriler yeniden yüklenir", async ({ page }) => {
    const log = collectErrors(page);
    const fixed = { from: "2026-01-01", to: "2026-01-31" };
    const ops = expectedOperations(fixed.from, fixed.to);
    const defOps = expectedOperations(defaultReportRange().from, defaultReportRange().to);

    await page.goto("/panel/lojistik/raporlar");
    await expect(cardValue(page, /^Sevkiyat$/)).toHaveText(String(defOps.totals.shipments), {
      timeout: 15000,
    });

    await page.locator("#report-from").fill(fixed.from);
    await page.locator("#report-to").fill(fixed.to);

    await expect(page).toHaveURL(/from=2026-01-01/);
    await expect(page).toHaveURL(/to=2026-01-31/);
    // Yeni aralığın mock hesabı ekrana yansımalı (veri gerçekten yeniden yüklendi).
    await expect(cardValue(page, /^Sevkiyat$/)).toHaveText(String(ops.totals.shipments), {
      timeout: 15000,
    });

    assertNoErrors(log, "L1 tarih aralığı değişimi");
  });

  test("bozuk tarih query'leri ekranı kırmaz, sözleşme varsayılanına düşer", async ({ page }) => {
    const log = collectErrors(page);
    const range = defaultReportRange();

    // Görevdeki literal: ?date_from=2026-13-99 (bilinmeyen param — yok sayılır).
    await page.goto("/panel/lojistik/raporlar?date_from=2026-13-99");
    await expect(page.locator("#report-from")).toHaveValue(range.from, { timeout: 15000 });
    await expect(page.locator("table").first()).toBeVisible({ timeout: 15000 });

    // Gerçek parametre adlarıyla bozuk değerler: biçimsiz + sahte takvim günü
    // (2026-02-31 ISO round-trip'te ele verir — ReportCenterView.isValidDay).
    await page.goto("/panel/lojistik/raporlar?from=2026-13-99&to=2026-02-31");
    await expect(page.locator("#report-from")).toHaveValue(range.from, { timeout: 15000 });
    await expect(page.locator("#report-to")).toHaveValue(range.to);

    // Ters aralık URL'den: ikisi birden varsayılana döner.
    await page.goto("/panel/lojistik/raporlar?from=2026-05-10&to=2026-05-01");
    await expect(page.locator("#report-from")).toHaveValue(range.from, { timeout: 15000 });
    await expect(page.locator("#report-to")).toHaveValue(range.to);

    assertNoErrors(log, "L1 bozuk tarih query'leri");
  });

  test("ters aralık formdan gönderilmez: uyarı çizilir, URL değişmez", async ({ page }) => {
    const log = collectErrors(page);
    await page.goto("/panel/lojistik/raporlar?from=2026-01-01&to=2026-01-31");
    await expect(page.locator("#report-to")).toHaveValue("2026-01-31", { timeout: 15000 });

    // Bitişi başlangıçtan öncesine çek: emit edilmez, role=alert uyarı yazar.
    await page.locator("#report-to").fill("2025-12-31");

    await expect(
      page.getByRole("alert").filter({ hasText: "Bitiş tarihi başlangıçtan önce olamaz." })
    ).toBeVisible();
    // URL hâlâ eski geçerli aralıkta (ters aralık isteğe/dosya adına inmedi).
    await expect(page).toHaveURL(/to=2026-01-31/);

    assertNoErrors(log, "L1 ters aralık formu");
  });

  test("CSV indirme: dosya adı, BOM, RFC4180 tırnaklama ve sayı biçimi mock ile birebir", async ({
    page,
  }) => {
    const log = collectErrors(page);
    const fixed = { from: "2026-01-01", to: "2026-01-31" };
    const rows = expectedCost(fixed.from, fixed.to);

    await page.goto(
      `/panel/lojistik/raporlar?panel=cost&from=${fixed.from}&to=${fixed.to}`
    );
    const exportBtn = page.getByRole("button", { name: "CSV indir" });
    await expect(exportBtn).toBeEnabled({ timeout: 15000 });

    const downloadPromise = page.waitForEvent("download");
    await exportBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(
      `lojistik-maliyet-${fixed.from}-${fixed.to}.csv`
    );

    const content = fs.readFileSync((await download.path())!, "utf8");
    // BOM: Türkçe Excel UTF-8 tanıma sözü (ReportCenterView.exportCsv).
    expect(content.charCodeAt(0), "CSV BOM ile başlamalı").toBe(0xfeff);

    const lines = content.slice(1).split("\n");
    expect(lines[0]).toBe(
      "Taşıyıcı,Sevkiyat,Taşıyıcı maliyeti,Müşteriye yansıyan,Marj,Sevkiyat başı maliyet"
    );
    expect(lines.length).toBe(1 + rows.length);

    // Beklenen satırlar utils/csv.js kurallarının portundan: ondalıklı hücre
    // tr-TR virgül ondalığıyla yazılır → virgül AYRAÇ olduğu için RFC4180
    // gereği tırnaklanır; NEGATİF düz sayı (MNG marjı) formül önekinden MUAF
    // kalır (PLAIN_NUMBER_RE — Excel SUM'u kırmamak için).
    rows.forEach((row, i) => {
      const expectedLine = [
        row.carrier,
        row.shipments,
        csvNumber(row.cost),
        csvNumber(row.charge),
        csvNumber(row.margin),
        csvNumber(row.shipments ? row.cost / row.shipments : null),
      ]
        .map((cell) => csvEscape(cell))
        .join(",");
      expect(lines[1 + i]).toBe(expectedLine);
    });

    // MNG satırı gerçekten negatif marj taşıyor ve '' öneki YOK (sessiz veri
    // bozulması düzeltmesinin regresyon kilidi).
    const mng = lines.find((l) => l.startsWith("MNG Kargo"));
    expect(mng).toBeTruthy();
    expect(mng!).toContain('"-');
    expect(mng!).not.toContain("'-");
    // Hiçbir hücre formül karakteriyle başlamıyor (kaçışsız = + @ yok).
    for (const line of lines.slice(1)) {
      for (const cell of line.split(',"').join(", \"").split(",")) {
        expect(/^[=+@]/.test(cell.replace(/^ /, "")), `formül önekli hücre: ${cell}`).toBe(
          false
        );
      }
    }

    assertNoErrors(log, "L1 CSV indirme");
  });

  test("geçmiş aralık (2020): mock deterministik veri üretir — boş durum değil", async ({
    page,
  }) => {
    // BEKLENTİ KODDAN: reportsMock her GEÇERLİ aralık için hash'ten veri
    // üretir (dayCell: shipments >= base >= 3) — "boş aralık" mock'ta yoktur.
    // Boş durum ancak geçersiz/ters aralıkta oluşur, onu da container
    // varsayılana düşürür → EmptyState UI üzerinden erişilmez (gözlem raporda).
    const log = collectErrors(page);
    const past = { from: "2020-01-01", to: "2020-01-07" };
    const ops = expectedOperations(past.from, past.to);

    await page.goto(`/panel/lojistik/raporlar?from=${past.from}&to=${past.to}`);
    await expect(cardValue(page, /^Sevkiyat$/)).toHaveText(String(ops.totals.shipments), {
      timeout: 15000,
    });
    await expect(page.getByText("Yurtiçi Kargo")).toBeVisible();

    assertNoErrors(log, "L1 geçmiş aralık");
  });

  test("A1 pano ile L1 performans paneli AYNI ortalama teslim gününü söyler", async ({ page }) => {
    const log = collectErrors(page);
    const range = defaultReportRange();
    const expectedAvg = expectedPerformance(range.from, range.to).avg_delivery_days;

    // A1 pano: "Ortalama teslim" kartı → "<n> gün".
    await page.goto("/panel/lojistik/pano");
    const dashCard = cardValue(page, /^Ortalama teslim$/);
    await expect(dashCard).toContainText("gün", { timeout: 15000 });
    const dashText = (await dashCard.textContent()) ?? "";
    const dashValue = parseFloat(dashText.replace("gün", "").trim());

    // L1 performans paneli: "Ort. teslim süresi (gün)" kartı.
    await page.goto("/panel/lojistik/raporlar?panel=performance");
    const reportCard = cardValue(page, "Ort. teslim süresi (gün)");
    await expect(reportCard).toHaveText(String(expectedAvg), { timeout: 15000 });

    expect(
      dashValue,
      `Pano (${dashValue}) ile rapor (${expectedAvg}) aynı mock hesabını kullanmalı`
    ).toBe(expectedAvg);

    assertNoErrors(log, "A1↔L1 paritesi");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Menü · admin lojistik rayı 17 kalem (FİYATLANDIRMA grubu dahil)
// ═══════════════════════════════════════════════════════════════════════════

test("menü: admin lojistik rayında 17 kalem ve Fiyatlandırma grubu eksiksiz", async ({ page }) => {
  const log = collectErrors(page);
  await page.goto("/panel/lojistik/pano");
  await expect(page.locator(".panel-item-label").first()).toBeAttached({ timeout: 15000 });

  // manifest menuScreens() = ready && !hidden && labelKey → 17 ekran.
  const EXPECTED = [
    "Pano",
    "Bekleyen İşler",
    "İstisna Kuyruğu",
    "Raporlar",
    "Sevkiyatlar",
    "Manuel Sevkiyat",
    "Paketleme",
    "Teslim Kanıtı",
    "Satıcı Teslimatı",
    "Alıcı Teslim Alma",
    "Tarifeler",
    "Fiyat Kuralları",
    "Fiyat Simülasyonu",
    "Taşıyıcı Hesapları",
    "Durum Eşlemesi",
    "Lojistik Kataloglar",
    "Lojistik Ayarları",
  ];

  const labels = (await page.locator(".panel-item-label").allTextContents()).map((s) => s.trim());
  for (const item of EXPECTED) {
    expect(labels, `menüde eksik kalem: ${item}`).toContain(item);
  }
  expect(labels.length, `lojistik rayında tam 17 kalem olmalı (bulunan: ${labels.join(", ")})`).toBe(
    17
  );

  // Grup başlıkları (data/navigation.js LOGISTICS_GROUPS): Fiyatlandırma dahil.
  const groups = (await page.locator(".panel-group-title-left span").allTextContents()).map((s) =>
    s.trim()
  );
  for (const group of [
    "Genel Bakış",
    "Sevkiyatlar",
    "Paketleme",
    "Teslimat",
    "Fiyatlandırma",
    "Taşıyıcı",
    "Ayarlar",
  ]) {
    expect(groups, `menüde eksik grup: ${group}`).toContain(group);
  }

  assertNoErrors(log, "menü");
});
