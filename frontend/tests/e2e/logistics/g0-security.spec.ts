import { test, expect, request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";

/**
 * G0 rol/yetki matrisi güvenlik doğrulaması — satıcı gözüyle yetki sınırları.
 *
 * BEKLENTİLERİN KAYNAĞI (kod, belge değil):
 *  - src/router/logisticsScreens.js  → sellerVisible/sellerRoute/superAdmin bayrakları;
 *    ikisi de yoksa ekran platform ekranı, guard satıcıyı dashboard'a atar.
 *  - src/router/index.js:1207        → `logisticsPlatformOnly && !isAdmin` → next("/dashboard")
 *  - src/router/index.js:1143        → catch-all "/:pathMatch(.*)*" → /login → (auth) → /dashboard
 *    (ready:false rotalar HİÇ kayıtlı değil; "bulunamadı" davranışı = dashboard'a düşmek)
 *  - src/components/logistics/shipmentTransitions.js:41 → SELLER_ALLOWED_TRANSITIONS =
 *    { "Ready for Pickup": ["Picked Up"] } — satıcı DOM'da başka geçiş görmemeli.
 *  - src/views/logistics/shipmentTabRegistry.js:140 → Maliyet sekmesi satıcıda GİZLENMİYOR,
 *    içerik maskeleniyor (bilinçli karar) — sızıntı sınırı: maliyet DEĞERLERİ görünmemeli,
 *    backend mask_shipment_cost_fields null'lar (tradehub_core/logistics/permissions.py:810).
 *  - tradehub_core/api/v1/shipment.py:_LIST_FIELDS → liste yanıtında yalnız 8 alan; maliyet yok.
 *
 * KURAL: yalnız OKUMA + guard denemeleri. Hiçbir yazma ucu tetiklenmez.
 */

const SELLER_STATE = "playwright/.auth/seller-logistics.json";
const ADMIN_STATE = "playwright/.auth/admin-logistics.json";
// Config `use.baseURL` sayfa gezinmesini yönetir ama bu dosya API isteklerini
// kendi `request.newContext()`'i ile atıyor; onun tabanı buradan geliyor.
// `PANEL_BASE` ile ezilebilir — gateway koşumu (:80) o yolu kullanıyor.
const BASE = process.env.PANEL_BASE ?? "http://127.0.0.1:5501";

const SHIPMENT_M = "tradehub_core.api.v1.shipment";
const ADMIN_M = "tradehub_core.api.v1.logistics_admin";

/** Satıcı menüsünde OLMASI gereken kalemler (manifest: sellerVisible && ready). */
const SELLER_MENU_HREFS = [
  "/lojistik/sevkiyatlar", // B1
  "/lojistik/sevkiyatlar/yeni", // C1 Manuel Sevkiyat
  "/lojistik/paketleme", // G0
  "/lojistik/teslim-kaniti", // H0
  "/lojistik/satici-teslimati", // D1
  "/lojistik/alici-teslim-alma", // D2
  "/lojistik/tarifeler", // K1
  "/lojistik/fiyat-kurallari", // K2
  "/lojistik/fiyat-simulasyonu", // K3
];

/** Platform ekranları — satıcı menüsünde ve URL'de KAPALI (logisticsPlatformOnly). */
const PLATFORM_URLS: { path: string; marker: RegExp | null }[] = [
  { path: "/panel/lojistik/pano", marker: null },
  { path: "/panel/lojistik/bekleyen-isler", marker: /Bekleyen İşler/ },
  { path: "/panel/lojistik/istisnalar", marker: /İstisna Kuyruğu/ },
  { path: "/panel/lojistik/raporlar", marker: null },
  { path: "/panel/lojistik/kataloglar", marker: /Lojistik Kataloglar/ },
  { path: "/panel/lojistik/ayarlar", marker: /Lojistik Ayarları/ },
  { path: "/panel/lojistik/tasiyici-hesaplari", marker: /Taşıyıcı Hesapları/ },
  { path: "/panel/lojistik/durum-eslemesi", marker: /Durum Eşlemesi/ },
];

/** ready:false — route HİÇ kayıtlı değil; admin'de bile dashboard'a düşmeli (beyaz ekran değil). */
// `/lojistik/iadeler` listeden çıktı (2026-09-04): I1 15-FE ile ready:true
// oldu — artık gerçek ekran, yönlendirme beklemek yanlış olur.
const NOT_READY_URLS = [
  "/panel/lojistik/baglanti-testi",
  "/panel/lojistik/entegrasyon-logu",
  "/panel/lojistik/toplu-aktarim",
  "/panel/lojistik/bildirim-sablonlari",
  "/panel/lojistik/alarmlar",
];

// 2026-09-07: is_delayed sözleşme düzeltmesiyle listeye 4 zararsız alan eklendi
// (ship_date, modified, package_count, is_delayed) — maliyet sınırı değişmedi.
/** list_shipments satır sözleşmesi (shipment.py _LIST_FIELDS) — fazlası sızıntıdır. */
const ALLOWED_LIST_FIELDS = new Set([
  "name",
  "order",
  "status",
  "carrier",
  "tracking_number",
  "estimated_delivery",
  "chargeable_weight",
  "creation",
  "ship_date",
  "modified",
  "package_count",
  "is_delayed",
]);

/** Backend'in maskelediği maliyet alanları (permissions.py:837) + sır alanları. */
const COST_FIELDS = [
  "shipping_cost",
  "insurance_cost",
  "total_cost",
  "carrier_cost",
  "fuel_surcharge",
  "packaging_cost",
];
const SECRET_FIELD_RE = /"api_secret"\s*:\s*"[^"]+[^"*•]"|"api_key"\s*:\s*"[A-Za-z0-9]{8,}"/;

// ── API yardımcıları ─────────────────────────────────────────────────────

/**
 * DİKKAT — Playwright miras tuzağı: test koşucusu içinde `request.newContext()`
 * aktif testin `use.storageState`'ini DEVRALIR. "Guest" isteği için storageState
 * açıkça BOŞ verilmek zorunda; parametresiz bırakmak satıcı oturumuyla istek
 * atar ve guest testini sahte-yeşile çevirirdi (ölçüldü, 2026-09-03).
 */
async function apiCtx(storageState?: string): Promise<APIRequestContext> {
  return pwRequest.newContext({
    baseURL: BASE,
    storageState: storageState ?? { cookies: [], origins: [] },
    extraHTTPHeaders: { Accept: "application/json" },
  });
}

async function apiGet(
  ctx: APIRequestContext,
  method: string,
  params: Record<string, string | number> = {}
): Promise<{ status: number; json: any; text: string }> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
  const resp = await ctx.get(`/api/method/${method}${qs ? `?${qs}` : ""}`);
  const text = await resp.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* HTML hata sayfası olabilir — status yeterli */
  }
  return { status: resp.status(), json, text };
}

/** Frappe zarfı: { message: { ok, data, meta } } */
function unwrap(json: any): any {
  return json?.message ?? null;
}

async function listShipmentNames(
  ctx: APIRequestContext
): Promise<{ names: string[]; rows: any[]; total: number }> {
  const { status, json } = await apiGet(ctx, `${SHIPMENT_M}.list_shipments`, {
    limit_page_length: 100,
  });
  expect(status, "list_shipments oturumlu istekte 200 dönmeli").toBe(200);
  const env = unwrap(json);
  expect(env?.ok, "list_shipments zarfı ok:true olmalı").toBe(true);
  const rows: any[] = env.data?.shipments ?? [];
  return { names: rows.map((r) => String(r.name)), rows, total: Number(env.data?.total ?? 0) };
}

/** Satıcının SAHİP OLMADIĞI (admin görüyor, satıcı görmüyor) sevkiyatlar. */
async function foreignShipments(): Promise<{
  adminNames: string[];
  sellerNames: string[];
  foreign: string[];
}> {
  const adminApi = await apiCtx(ADMIN_STATE);
  const sellerApi = await apiCtx(SELLER_STATE);
  try {
    const adminList = await listShipmentNames(adminApi);
    const sellerList = await listShipmentNames(sellerApi);
    const sellerSet = new Set(sellerList.names);
    return {
      adminNames: adminList.names,
      sellerNames: sellerList.names,
      foreign: adminList.names.filter((n) => !sellerSet.has(n)),
    };
  } finally {
    await adminApi.dispose();
    await sellerApi.dispose();
  }
}

/** SPA gezinmesinin oturmasını bekle (guard redirect'leri dahil). */
async function settled(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => {});
}

/**
 * ErrorState kutusu — `role="alert"` TEK BAŞINA yetmez: sayfada boş bir
 * `aria-live="assertive"` canlı bölge de alert rolü taşıyor (strict mode
 * çakışması, ölçüldü). ErrorState'in kökünde aria-live yok.
 */
function errorAlert(page: Page) {
  return page.locator('div[role="alert"]:not([aria-live])');
}

// ═════════════════════════════════════════════════════════════════════════
// SATICI OTURUMU
// ═════════════════════════════════════════════════════════════════════════

test.describe("G0 satıcı yetki sınırları", () => {
  test.use({ storageState: SELLER_STATE });

  // ── 1a. Menü: platform kalemleri satıcıda YOK (güvenlik sınırı) ────────
  test("1a. satıcı menüsünde platform kalemi yok", async ({ page }) => {
    await page.goto("/panel/lojistik/sevkiyatlar");
    await settled(page);
    await expect(
      page.locator(".sidebar-panel .panel-item").first(),
      "satıcıda lojistik yan menüsü hiç kurulmadı (rail/section eksik olabilir)"
    ).toBeAttached({ timeout: 15000 });

    for (const { path } of PLATFORM_URLS) {
      const href = path.replace("/panel", "");
      await expect(
        page.locator(`.sidebar-panel a[href$="${href}"]`),
        `platform kalemi satıcı menüsünde OLMAMALI: ${href}`
      ).toHaveCount(0);
    }
  });

  // ── 1b. Menü: sellerVisible kalemler menüde OLMALI (G0 görünürlük) ─────
  // BİLİNEN KIRMIZI (bulgu kanıtı, 2026-09-03): manifest 9 kalem diyor
  // (logisticsScreens.js sellerVisible), canlıda yalnız 3 çıkıyor
  // (Sevkiyatlar, Manuel Sevkiyat, Paketleme). Satıcı menüsü TH Module
  // Registry'den (DB) geliyor ve statik fallback'i eziyor
  // (data/navigation.js:857-863) — DB kaydı H0/D1/D2/K1/K2/K3 için bayat.
  // Rotalar URL'den AÇIK (sellerVisible → guard geçiriyor): manifestin
  // "menüde yok ama URL çalışır" diye terk ettiği desen hortlamış durumda.
  test("1b. sellerVisible kalemler satıcı menüsünde (G0 matrisi)", async ({ page }) => {
    await page.goto("/panel/lojistik/sevkiyatlar");
    await settled(page);
    await expect(page.locator(".sidebar-panel .panel-item").first()).toBeAttached({
      timeout: 15000,
    });

    const eksik: string[] = [];
    for (const href of SELLER_MENU_HREFS) {
      const n = await page.locator(`.sidebar-panel a.panel-item[href$="${href}"]`).count();
      if (n !== 1) eksik.push(href);
    }
    expect(
      eksik,
      `G0 matrisinin satıcıya açtığı kalemler menüde eksik (DB modül kaydı bayat?): ${eksik.join(", ")}`
    ).toEqual([]);
  });

  // ── 2. URL zorlama: 8 platform ekranı ──────────────────────────────────
  for (const { path, marker } of PLATFORM_URLS) {
    test(`2. satıcı URL zorlama → dashboard: ${path}`, async ({ page }) => {
      await page.goto(path);
      // Guard redirect'i: logisticsPlatformOnly && !isAdmin → /dashboard
      await page.waitForURL(/\/panel\/dashboard$/, { timeout: 15000 });
      await settled(page);

      const content = await page.content();
      // Platform ekranının içeriği DOM'a hiç girmemeli.
      if (marker) {
        expect(content, `platform içeriği DOM'a sızdı: ${marker}`).not.toMatch(marker);
      }
      // Ekranın kendi URL'i DOM'da (link olarak bile) bulunmamalı — menü
      // testi zaten yokluğunu doğruluyor; burada redirect sonrası tam sayfada arıyoruz.
      expect(content).not.toContain(`href="${path}"`);
      // Beyaz ekran değil: satıcı dashboard'u render edilmiş olmalı.
      expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(0);
    });
  }

  // ── 3. B1: liste yalnız kendi kayıtları (API + alan sözleşmesi + UI) ───
  test("3. satıcı sevkiyat listesi — tenant izolasyonu ve alan sızıntısı", async ({ page }) => {
    const { adminNames, sellerNames, foreign } = await foreignShipments();
    test.info().annotations.push({
      type: "veri",
      description: `admin=${JSON.stringify(adminNames)} satıcı=${JSON.stringify(sellerNames)}`,
    });

    // Satıcının gördüğü küme admin kümesinin alt kümesi olmalı.
    const adminSet = new Set(adminNames);
    for (const n of sellerNames) {
      expect(adminSet.has(n), `satıcı, admin'in görmediği kaydı görüyor: ${n}`).toBe(true);
    }

    // Alan sözleşmesi: satırlar yalnız _LIST_FIELDS taşımalı (maliyet vb. sızmamalı).
    const sellerApi = await apiCtx(SELLER_STATE);
    try {
      const { rows, text } = await (async () => {
        const r = await apiGet(sellerApi, `${SHIPMENT_M}.list_shipments`, {
          limit_page_length: 100,
        });
        return { rows: unwrap(r.json)?.data?.shipments ?? [], text: r.text };
      })();
      for (const row of rows) {
        for (const key of Object.keys(row)) {
          expect(
            ALLOWED_LIST_FIELDS.has(key),
            `list_shipments satırında sözleşme dışı alan: ${key}`
          ).toBe(true);
        }
      }
      for (const f of COST_FIELDS) {
        expect(text, `liste yanıtında maliyet alanı sızdı: ${f}`).not.toContain(`"${f}"`);
      }
    } finally {
      await sellerApi.dispose();
    }

    // UI: satıcı listesinde yabancı sevkiyat adı görünmemeli.
    await page.goto("/panel/lojistik/sevkiyatlar");
    await settled(page);
    const content = await page.content();
    for (const n of foreign) {
      expect(content, `yabancı sevkiyat satıcı listesinde: ${n}`).not.toContain(n);
    }
  });

  // ── 4. B2: yabancı sevkiyat detayı → veri sızmamalı ────────────────────
  test("4. satıcı yabancı sevkiyat detayını açamaz (IDOR)", async ({ page }) => {
    const { foreign, sellerNames } = await foreignShipments();
    test.skip(foreign.length === 0, "admin ile satıcı aynı kümeyi görüyor — yabancı kayıt yok");

    // SHP-2026-00001 yabancıysa onu hedefle (görev senaryosu), değilse ilk yabancı.
    const target = foreign.includes("SHP-2026-00001") ? "SHP-2026-00001" : foreign[0];

    // Önce API katmanı: satıcı oturumuyla detay isteği reddedilmeli.
    const sellerApi = await apiCtx(SELLER_STATE);
    const adminApi = await apiCtx(ADMIN_STATE);
    try {
      const denied = await apiGet(sellerApi, `${SHIPMENT_M}.get_shipment_detail`, { name: target });
      expect(
        denied.status,
        `yabancı detay isteği 403/404 olmalı, geldi: ${denied.status}`
      ).toBeGreaterThanOrEqual(400);
      expect(unwrap(denied.json)?.ok ?? false, "yabancı detay ok:true dönmemeli").not.toBe(true);

      // Admin'den kaydın ayırt edici verisini al, satıcı yanıtında/ekranında ara.
      const adminDetail = await apiGet(adminApi, `${SHIPMENT_M}.get_shipment_detail`, {
        name: target,
      });
      const adminDoc = unwrap(adminDetail.json)?.data ?? {};
      const distinctive: string[] = [adminDoc.tracking_number, adminDoc.internal_note]
        .filter(Boolean)
        .map(String);

      for (const s of distinctive) {
        expect(denied.text, `403/404 yanıt gövdesinde veri sızdı: ${s}`).not.toContain(s);
      }

      // UI: hata durumu görünmeli, ekran verisi DOM'a girmemeli.
      await page.goto(`/panel/lojistik/sevkiyatlar/${target}`);
      await settled(page);
      await expect(
        errorAlert(page).first(),
        "yabancı sevkiyatta ErrorState (role=alert) beklenir"
      ).toBeVisible({ timeout: 15000 });
      const content = await page.content();
      for (const s of distinctive) {
        expect(content, `yabancı sevkiyat verisi DOM'a sızdı: ${s}`).not.toContain(s);
      }
      // Detay sekmeleri (Maliyet dahil) render edilmemeli — doküman yüklenmedi.
      await expect(page.getByRole("tab", { name: "Maliyet" })).toHaveCount(0);
    } finally {
      await sellerApi.dispose();
      await adminApi.dispose();
    }

    // Kendi sevkiyatı varsa: maliyet DEĞERLERİ maskeli gelmeli (sekme görünür
    // ama içerik maskeli — shipmentTabRegistry.js:140 bilinçli karar).
    if (sellerNames.length) {
      const ownApi = await apiCtx(SELLER_STATE);
      try {
        const own = await apiGet(ownApi, `${SHIPMENT_M}.get_shipment_detail`, {
          name: sellerNames[0],
        });
        const doc = unwrap(own.json)?.data ?? {};
        for (const f of COST_FIELDS) {
          if (f in doc) {
            expect(doc[f], `satıcının kendi detayında maliyet maskelenmemiş: ${f}`).toBeNull();
          }
        }
      } finally {
        await ownApi.dispose();
      }
    }
  });

  // ── 5. C2: sunulan geçişler yalnız Hazır→Alındı ────────────────────────
  test("5. durum ekranında satıcıya yalnız SELLER_ALLOWED_TRANSITIONS sunulur", async ({
    page,
  }) => {
    const { sellerNames, foreign } = await foreignShipments();

    if (sellerNames.length === 0) {
      // Satıcının sevkiyatı yok: yabancı kayıt üzerinden ekran verisiz kalmalı,
      // DOM'da tek bir geçiş bile bulunmamalı.
      test.skip(foreign.length === 0, "hiç sevkiyat yok — C2 DOM doğrulaması yapılamıyor");
      await page.goto(`/panel/lojistik/sevkiyatlar/${foreign[0]}/durum`);
      await settled(page);
      await expect(errorAlert(page).first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("radio")).toHaveCount(0);
      return;
    }

    // Kendi kaydında: status'a göre beklenen küme SELLER_ALLOWED_TRANSITIONS.
    const sellerApi = await apiCtx(SELLER_STATE);
    let status = "";
    try {
      const own = await apiGet(sellerApi, `${SHIPMENT_M}.get_shipment_detail`, {
        name: sellerNames[0],
      });
      status = String(unwrap(own.json)?.data?.status ?? "");
    } finally {
      await sellerApi.dispose();
    }

    await page.goto(`/panel/lojistik/sevkiyatlar/${sellerNames[0]}/durum`);
    await settled(page);
    // Ekranın yüklendiğini hedef ALANINDAN anla, radiogroup'tan DEĞİL:
    // izinli geçiş yokken radiogroup hiç çizilmiyor (boş `aria-required`
    // grubu ekran okuyucuya yalan söylüyordu, 7 Eyl 2026'da kaldırıldı) ve
    // union locator'ın `.first()`i o boş düğüme kilitlenip "hidden" diyordu.
    // `[data-field="target"]` her iki durumda da var.
    await expect(page.locator('[data-field="target"]')).toBeVisible({ timeout: 15000 });

    const radios = page.getByRole("radio");
    if (status === "Ready for Pickup") {
      await expect(radios, "Hazır durumunda satıcıya TEK geçiş sunulmalı").toHaveCount(1);
      await expect(radios.first()).toContainText("Alındı"); // Picked Up (tr)
    } else {
      await expect(
        radios,
        `"${status}" durumunda satıcıya HİÇ geçiş sunulmamalı (dar yol tek girişli)`
      ).toHaveCount(0);
    }
  });

  // ── 7. F1 + sır maskesi ────────────────────────────────────────────────
  test("7. satıcı taşıyıcı hesap uçlarına erişemez; sır/yetki sızıntısı yok", async ({ page }) => {
    const sellerApi = await apiCtx(SELLER_STATE);
    try {
      // Taşıyıcı hesap listesi satıcıya kapalı olmalı (superAdmin ekranının ucu).
      const accounts = await apiGet(sellerApi, `${ADMIN_M}.list_carrier_accounts`);
      const env = unwrap(accounts.json);
      const deniedByStatus = accounts.status >= 400;
      const deniedByEnvelope = env !== null && env.ok !== true;
      expect(
        deniedByStatus || deniedByEnvelope,
        `list_carrier_accounts satıcıya açık: HTTP ${accounts.status}, gövde: ${accounts.text.slice(0, 200)}`
      ).toBe(true);
      expect(accounts.text, "taşıyıcı sırrı düz metin sızdı").not.toMatch(SECRET_FIELD_RE);

      // Yetki bildirimi: maliyet/sır/credential capability'leri satıcıda kapalı olmalı.
      const perms = await apiGet(sellerApi, `${ADMIN_M}.get_logistics_permissions`);
      if (perms.status === 200 && unwrap(perms.json)?.ok === true) {
        const caps = unwrap(perms.json)?.data?.capabilities ?? {};
        for (const cap of ["view.logistics_cost", "view.carrier_secret", "carrier_credential.manage"]) {
          expect(Boolean(caps[cap]), `satıcı oturumunda capability açık: ${cap}`).toBe(false);
        }
      }
    } finally {
      await sellerApi.dispose();
    }

    // Satıcıya açık bir ekranda (tarifeler) düz metin sır taranmaz olmalı.
    await page.goto("/panel/lojistik/tarifeler");
    await settled(page);
    const content = await page.content();
    expect(content).not.toMatch(/api_secret/i);
  });

  // ── 8. API spot: guest reddi + maliyet sızıntısı ───────────────────────
  test("8. guest (cookie'siz) istek reddedilir; satıcı yanıtında maliyet yok", async () => {
    const guest = await apiCtx(); // storageState yok = cookie yok
    try {
      const list = await apiGet(guest, `${SHIPMENT_M}.list_shipments`);
      expect(
        list.status,
        `guest list_shipments reddedilmeli, geldi: HTTP ${list.status}`
      ).toBeGreaterThanOrEqual(400);
      expect(list.text).not.toContain('"shipments"');

      const detail = await apiGet(guest, `${SHIPMENT_M}.get_shipment_detail`, {
        name: "SHP-2026-00001",
      });
      expect(detail.status, "guest get_shipment_detail reddedilmeli").toBeGreaterThanOrEqual(400);
      expect(detail.text).not.toContain('"tracking_number"');
    } finally {
      await guest.dispose();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════
// ADMIN OTURUMU (config varsayılan state)
// ═════════════════════════════════════════════════════════════════════════

// ── 6. ready:false rotalar: kayıtsız → beyaz ekran değil ─────────────────
// DÜZELTİLMİŞ DAVRANIŞ (bulgu kapatıldı, 2026-09-03): catch-all
// "/:pathMatch(.*)*" artık "/dashboard"a yönlendiriyor (router/index.js).
// Eskiden hedef "/login"di ve guard guest hedefe giderken fetchUser
// çağırmadığı için oturumu CANLI olan admin ilk yüklemede login formuna
// düşüyordu; SPA içi gezinme ise aynı URL'i dashboard'a taşıyordu —
// tutarsızdı. Yeni hedefle iki akış da aynı yere iner: oturumlu kullanıcı
// TUTARLI şekilde dashboard'a, oturumsuzu guard'ın auth kapısı /login'e.
for (const path of NOT_READY_URLS) {
  test(`6. admin ready:false rota bulunamadı davranışı: ${path}`, async ({ page }) => {
    await page.goto(path);
    // Kayıtsız URL terk edilmeli; oturumlu admin dashboard'a inmeli
    // (login formuna DEĞİL — eski tutarsız davranış geri gelmesin).
    await page.waitForURL(/\/panel\/dashboard$/, { timeout: 15000 });
    await settled(page);
    expect(page.url()).not.toContain("/lojistik/");
    // …ve beyaz ekran olmamalı.
    const bodyText = (await page.locator("body").innerText()).trim();
    expect(bodyText.length, "beyaz ekran: hedef sayfa render edilmedi").toBeGreaterThan(0);
  });
}
