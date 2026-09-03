import { test, expect, type Page } from "@playwright/test";

/**
 * Sevkiyat ekranları E2E — B1 liste, B2 detay + sekmeler, B6/11-FE takip,
 * C1 manuel sevkiyat, C2 durum güncelleme. QA koşumu, 2026-09-03.
 *
 * VERİ SINIRI: B1/B2 CANLI backend'den okur (v1.shipment). Mevcut kayıtlar:
 *   SHP-2026-00001 (In Transit/Yolda), SHP-2026-00002 (Out for Delivery/
 *   Dağıtımda), SHP-2026-00003 (Draft/Taslak) — hepsi ORD-00001.
 * Canlı veriye YAZILMAZ. C1 gönderimi güvenli: `api/shipmentCreate.js`
 * MOCK.create_manual_shipment = true (kayıt sunucuya gitmez, SHP-DEMO-*).
 * C2'de yalnız sunulan geçişler ve istemci doğrulaması sınanır; geçerli
 * form GÖNDERİLMEZ (update_shipment_status canlı uç).
 *
 * Beklentiler koddan türetildi:
 *   - ShipmentListView.vue      → ?status/?page URL'de, filtrede sayfa 1
 *   - ShipmentDetailView.vue + shipmentTabRegistry.js → 8 sekme
 *     (Bora: Kalemler/Koliler/Belgeler/Takip/Bacaklar/Maliyet;
 *      Ali: Teslim kanıtı/İstasyonlar — kapsam dışı, yalnız varlık)
 *   - api/shipmentEvents.js     → mock 6 olay, 4 kaynak, tracking_url null
 *   - shipmentTransitions.js    → ALLOWED_TRANSITIONS (constants.py kopyası)
 *   - ManualShipmentFormScreen  → submit-sonrası doğrulama + hata özeti
 */

const LIST_URL = "/panel/lojistik/sevkiyatlar";
const DETAIL_URL = (name: string) => `${LIST_URL}/${name}`;

// UI dili deterministik olsun: storage state'te th-lang yok, dil
// navigator.language'dan geliyor (src/i18n/index.js detectLang).
test.use({ locale: "tr-TR" });

// GuidedTour (stores/tour.js) taze profillerde bölüm turunu otomatik başlatır
// ve `fixed inset-0 z-[9999]` katmanı tüm tıklamaları keser. Testler "turu
// görmüş" kullanıcıyı temsil eder — SEEN_KEY seed'lenir.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
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

/** pageerror + console.error toplayıcı — sekme turunda konsol temizliği kanıtı. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
  });
  return errors;
}

const dataRows = (page: Page) => page.locator("tbody tr");

// ═══════════════════════════════════════════════════════════════════════
// B1 · Sevkiyat listesi
// ═══════════════════════════════════════════════════════════════════════
test.describe("B1 sevkiyat listesi", () => {
  test("üç canlı kayıt listelenir, toplam sayaç doğru", async ({ page }) => {
    await page.goto(LIST_URL);
    await expect(page.getByRole("heading", { name: "Sevkiyatlar" })).toBeVisible();
    await expect(page.getByText("3 kayıt")).toBeVisible();
    await expect(dataRows(page)).toHaveCount(3);
    for (const name of ["SHP-2026-00001", "SHP-2026-00002", "SHP-2026-00003"]) {
      await expect(page.getByRole("cell", { name })).toBeVisible();
    }
    // Manuel sevkiyat butonu (can.create + C1 ready) görünür olmalı.
    await expect(page.getByRole("button", { name: "Manuel sevkiyat" })).toBeVisible();
  });

  test("durum hapı ?status= URL'e yazar ve listeyi daraltır", async ({ page }) => {
    await page.goto(LIST_URL);
    await expect(dataRows(page)).toHaveCount(3);

    await page.getByRole("button", { name: "Yolda", exact: true }).click();
    // vue-router boşluğu + veya %20 olarak kodlayabilir.
    await expect(page).toHaveURL(/status=In(\+|%20)Transit/);
    await expect(dataRows(page)).toHaveCount(1);
    await expect(page.getByRole("cell", { name: "SHP-2026-00001" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Yolda", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  test("sıfır sonuçlu durumda filtreli boş durum + temizleme", async ({ page }) => {
    await page.goto(LIST_URL);
    await expect(dataRows(page)).toHaveCount(3);

    // Delivered durumunda canlı kayıt yok.
    await page.getByRole("button", { name: "Teslim edildi", exact: true }).click();
    await expect(page).toHaveURL(/status=Delivered/);
    await expect(page.getByText("Bu filtrelerle sonuç bulunamadı")).toBeVisible();

    await page.getByRole("button", { name: "Filtreleri temizle" }).click();
    await expect(page).not.toHaveURL(/status=/);
    await expect(dataRows(page)).toHaveCount(3);
  });

  test("?status ile doğrudan açılış (paylaşılabilir link)", async ({ page }) => {
    await page.goto(`${LIST_URL}?status=Out%20for%20Delivery`);
    await expect(dataRows(page)).toHaveCount(1);
    await expect(page.getByRole("cell", { name: "SHP-2026-00002" })).toBeVisible();
    // Hap URL'den vurgulanmış olmalı (çift yönlü bağ).
    await expect(page.getByRole("button", { name: "Dağıtımda", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  // BULGU DOKÜMANTASYONU (davranış bugün böyle — rapora bakınız):
  // aralık dışı ?page=2'de başlık "3 kayıt" derken gövde "Henüz sevkiyat
  // kaydı yok" + "İlk kaydı oluşturarak başlayabilirsiniz" diyor. Filtresiz
  // boş durum "hiç kayıt yok" anlamına geliyor; hasActiveFilters yalnız
  // status'a bakıyor (ShipmentListScreen.vue:254), sayfa taşmasını bilmiyor.
  test("aralık dışı ?page=2: başlık 3 kayıt derken gövde 'hiç kayıt yok' diyor", async ({
    page,
  }) => {
    await page.goto(`${LIST_URL}?page=2`);
    await expect(page.getByText("3 kayıt")).toBeVisible();
    await expect(page.getByText("Henüz sevkiyat kaydı yok")).toBeVisible();
    // Filtre temizleme butonu da yok — kullanıcı 1. sayfaya UI'dan dönemez.
    await expect(page.getByRole("button", { name: "Filtreleri temizle" })).toBeHidden();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// B2 · Sevkiyat detayı + sekmeler
// ═══════════════════════════════════════════════════════════════════════
test.describe("B2 sevkiyat detayı", () => {
  test("deep-link ile açılır; tüm sekmeler render olur; konsol temiz", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(DETAIL_URL("SHP-2026-00001"));

    // Özet başlık
    await expect(page.getByRole("heading", { level: 1, name: "SHP-2026-00001" })).toBeVisible();
    await expect(page.getByText("ORD-00001 · YK")).toBeVisible();
    await expect(page.getByText("YK-1234567890").first()).toBeVisible();
    // Yetkili aksiyonlar (admin: write+cancel, C2/G1 ready)
    await expect(page.getByRole("button", { name: "Durum güncelle" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sevkiyatı iptal et" })).toBeVisible();

    // Sekme envanteri — kayıt defteri sırasıyla (order 10..80).
    const expectedTabs = [
      /^Kalemler/,
      /^Koliler/,
      /^Belgeler/,
      /^Takip/,
      /^Bacaklar/,
      /^Maliyet/,
      /^Teslim kanıtı/, // Ali (H3) — kapsam dışı, yalnız varlık
      /^İstasyonlar/, // Ali (H4) — kapsam dışı, yalnız varlık
    ];
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(expectedTabs.length);
    for (let i = 0; i < expectedTabs.length; i++) {
      await expect(tabs.nth(i)).toHaveText(expectedTabs[i]);
    }

    // Her sekme tıklanır ve gövde render olur.
    const panel = page.getByRole("tabpanel");
    for (const name of expectedTabs) {
      await page.getByRole("tab", { name }).click();
      await expect(page.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
      await expect(panel).toBeVisible();
      await expect(panel).not.toBeEmpty();
    }

    // Bacaklar (B7) beslenmeyen sekme: boş liste değil, engel paneli.
    await page.getByRole("tab", { name: /^Bacaklar/ }).click();
    await expect(panel.getByText("Bu bilgi henüz taşınmıyor")).toBeVisible();

    // Maliyet (B8) admin gözünde maskelenmemeli.
    await page.getByRole("tab", { name: /^Maliyet/ }).click();
    await expect(panel.getByText("Maliyet bilgisini görüntüleme yetkiniz yok")).toBeHidden();

    const relevant = errors.filter((e) => !/favicon|Download the Vue Devtools/i.test(e));
    expect(relevant, `Konsol hataları:\n${relevant.join("\n")}`).toEqual([]);
  });

  test("document.title ekran adını taşır (rota metasından)", async ({ page }) => {
    await page.goto(DETAIL_URL("SHP-2026-00001"));
    await expect(page.getByRole("heading", { level: 1, name: "SHP-2026-00001" })).toBeVisible();
    // Kod davranışı: başlık rota metasından gelir (router/pageTitle.js) —
    // "Sevkiyat Detayı · iStoc B2B". Sevkiyat ADI başlığa girmiyor;
    // rapora not düşüldü (tüm detay sekmeleri aynı adı taşıyor).
    await expect(page).toHaveTitle(/Sevkiyat Detayı/);
  });

  test("olmayan sevkiyat: hata durumu gösterilir, beyaz ekran/sonsuz spinner yok", async ({
    page,
  }) => {
    await page.goto(DETAIL_URL("SHP-YOK-999"));
    // Layout'ta ikinci (boş) bir aria-live alert kabı var — dolu olanı seç.
    const alert = page.getByRole("alert").filter({ hasText: /\S/ });
    await expect(alert).toBeVisible({ timeout: 15000 });
    // Spinner/iskelet kalıcı değil.
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    // Detay başlığı çizilmemiş olmalı.
    await expect(page.getByRole("heading", { level: 1, name: "SHP-YOK-999" })).toBeHidden();
  });

  test("olmayan sevkiyat NOT_FOUND olarak sınıflanır ('Kayıt bulunamadı')", async ({ page }) => {
    // ErrorState.vue:58 NOT_FOUND dalını bunun için taşıyor. Backend
    // DoesNotExistError'ı sözleşme zarfına sarmadan 404 dönerse
    // (rescueLogisticsError zarfı bulamaz) ekran INTERNAL_ERROR/"Bir sorun
    // oluştu" + İngilizce sunucu mesajına düşer — bu test onu yakalar.
    await page.goto(DETAIL_URL("SHP-YOK-999"));
    const alert = page.getByRole("alert").filter({ hasText: /\S/ });
    await expect(alert).toBeVisible({ timeout: 15000 });
    await expect(alert).toContainText("Kayıt bulunamadı");
  });

  test("geri/ileri gezinme liste filtresini ve detayı bozmaz", async ({ page }) => {
    await page.goto(`${LIST_URL}?status=In%20Transit`);
    await expect(dataRows(page)).toHaveCount(1);

    await page.getByRole("cell", { name: "SHP-2026-00001" }).click();
    await expect(page).toHaveURL(/sevkiyatlar\/SHP-2026-00001$/);
    await expect(page.getByRole("heading", { level: 1, name: "SHP-2026-00001" })).toBeVisible();
    await page.getByRole("tab", { name: /^Takip/ }).click();
    await expect(page.getByRole("tab", { name: /^Takip/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    // Geri: filtreli liste URL'den aynen kurulmalı.
    await page.goBack();
    await expect(page).toHaveURL(/status=In(\+|%20)Transit/);
    await expect(dataRows(page)).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Yolda", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    // İleri: detay yeniden işlevsel (aktif sekme URL'de tutulmadığından
    // ilk sekmeye döner — kod davranışı, rapora not).
    await page.goForward();
    await expect(page.getByRole("heading", { level: 1, name: "SHP-2026-00001" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Kalemler/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.getByRole("tabpanel")).not.toBeEmpty();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// B6 · Takip sekmesi (11-FE timeline — mock: 6 olay, 4 kaynak)
// ═══════════════════════════════════════════════════════════════════════
test.describe("B6 takip sekmesi", () => {
  /** Detayı açıp Takip sekmesine geçer; olay listesi yüklenene dek bekler. */
  async function openTracking(page: Page) {
    await page.goto(DETAIL_URL("SHP-2026-00001"));
    await page.getByRole("tab", { name: /^Takip/ }).click();
    const panel = page.getByRole("tabpanel");
    // Olay listesi: aşama çubuğu ol[aria-label] taşıyor, timeline ol taşımıyor.
    const events = panel.locator("ol:not([aria-label]) > li");
    await expect(events.first()).toBeVisible({ timeout: 15000 });
    return { panel, events };
  }

  test("olay listesi ve kaynak rozetleri (mock: 6 olay)", async ({ page }) => {
    const { panel, events } = await openTracking(page);
    await expect(events).toHaveCount(6);

    // Mock içerikleri: durum rozetleri + kaynak rozetleri + gerekçe + ham kod.
    await expect(panel.getByText("Sevkiyat taslağı onaylandı.")).toBeVisible();
    await expect(panel.getByText("Paketleme erken tamamlandı, kurye çağrıldı.")).toBeVisible();
    await expect(panel.getByText("PKD · Gönderi alındı")).toBeVisible();
    await expect(panel.getByText("İstanbul aktarma merkezi")).toBeVisible();
    // Kaynak rozet sayıları (EVENT_SOURCE_META etiketleri): manuel 2,
    // webhook 2, api 1, polling 1 — rozet metni sr-only " — Olayın kaynağı"
    // ekiyle bitiyor, o yüzden tam-metin regex ile sayılıyor.
    const badge = (label: string) =>
      events.locator("span").filter({ hasText: new RegExp(`^${label}\\s+— Olayın kaynağı$`) });
    await expect(badge("Manuel")).toHaveCount(2);
    await expect(badge("Webhook")).toHaveCount(2);
    await expect(badge("API")).toHaveCount(1);
    await expect(badge("Sorgulama")).toHaveCount(1);
  });

  test("kaynak filtreleri listeyi daraltır", async ({ page }) => {
    const { panel, events } = await openTracking(page);

    // 4 farklı kaynak + Tümü → 5 hap, sayaçlarıyla.
    const pills = panel.locator(".status-pill");
    await expect(pills).toHaveCount(5);
    await expect(pills.filter({ hasText: "Tümü" })).toContainText("6");

    await pills.filter({ hasText: "Webhook" }).click();
    await expect(events).toHaveCount(2);
    await expect(panel.getByText("PKD · Gönderi alındı")).toBeVisible();

    await pills.filter({ hasText: "Manuel" }).click();
    await expect(events).toHaveCount(2);
    await expect(panel.getByText("Müşteri gecikme bildirimi istedi.")).toBeVisible();

    await pills.filter({ hasText: "Tümü" }).click();
    await expect(events).toHaveCount(6);
  });

  test("'yalnız durum değişimleri' ardışık aynı-durum olaylarını gizler", async ({ page }) => {
    const { panel, events } = await openTracking(page);
    // Mock akış: Pending → Ready for Pickup → Picked Up → In Transit ×3
    // → değişim sayısı 4.
    await panel.getByLabel("Yalnız durum değişimleri").check();
    await expect(events).toHaveCount(4);
    await panel.getByLabel("Yalnız durum değişimleri").uncheck();
    await expect(events).toHaveCount(6);
  });

  test("aşama çubuğu render olur; aktif taş 'Yolda'", async ({ page }) => {
    const { panel } = await openTracking(page);
    const bar = panel.getByRole("list", { name: "Sevkiyat aşamaları" });
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("listitem")).toHaveCount(5);
    await expect(bar.locator('[aria-current="step"]')).toContainText("Yolda");
  });

  test("sessizlik şeridi: son mock olay eski, eşik aşılmış", async ({ page }) => {
    const { panel } = await openTracking(page);
    const strip = panel.getByRole("status").filter({ hasText: "saattir yeni olay yok" });
    await expect(strip).toBeVisible();
    const text = (await strip.textContent()) ?? "";
    const hours = Number(/(\d+) saattir/.exec(text)?.[1] ?? 0);
    // Son olay 2026-08-17 → 72 saatlik kritik eşik fazlasıyla aşıldı.
    expect(hours).toBeGreaterThanOrEqual(72);
  });

  test("takip linki güvenli: mock'ta canlı kargo sitesine link YOK", async ({ page }) => {
    const { panel } = await openTracking(page);
    // tracking_url mock'ta null → takip no düz metin <code>, link değil.
    await expect(panel.locator('a[target="_blank"]')).toHaveCount(0);
    await expect(panel.locator("code", { hasText: "YK-1234567890" })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// C1 · Manuel sevkiyat oluşturma (MOCK doğrulandı: shipmentCreate.js
// MOCK.create_manual_shipment = true → gönderim sunucuya gitmez)
// ═══════════════════════════════════════════════════════════════════════
test.describe("C1 manuel sevkiyat", () => {
  async function openForm(page: Page) {
    await page.goto(`${LIST_URL}/yeni`);
    await expect(page.getByRole("heading", { name: "Manuel sevkiyat" })).toBeVisible({
      timeout: 15000,
    });
  }

  /** Geçerli taslak: sipariş + taşıyıcısız kanal (Satıcı Aracı). */
  async function fillValidDraft(page: Page) {
    const order = page.getByRole("combobox", { name: "Sipariş" });
    await order.click();
    await order.pressSequentially("ORD-00001");
    await page.getByRole("option", { name: /ORD-00001/ }).first().click();

    await page.getByRole("combobox", { name: "Gönderim kanalı" }).click();
    await page.getByRole("option", { name: "Satıcı Aracı" }).click();
    // Taşıyıcısız kanal: taşıyıcı alanları düşer, sürücü/plaka gelir.
    await expect(page.getByText("Sürücü")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Taşıyıcı" })).toBeHidden();
  }

  test("listeden giriş: 'Manuel sevkiyat' butonu C1'e götürür", async ({ page }) => {
    await page.goto(LIST_URL);
    await page.getByRole("button", { name: "Manuel sevkiyat" }).click();
    await expect(page).toHaveURL(/sevkiyatlar\/yeni$/);
    await expect(page.getByRole("heading", { name: "Manuel sevkiyat" })).toBeVisible();
  });

  test("boş gönderim: hata özeti + eksik alanlar + odak ilk hatalı alana", async ({ page }) => {
    await openForm(page);
    await page.getByRole("button", { name: "Kaydet" }).click();

    // Hem canlı bölge (sr-only) hem özet başlığı aynı metni taşır — özet
    // kartındaki görünür başlık hedeflenir.
    const summary = page.getByRole("group");
    await expect(summary.getByText("Eksik zorunlu alanlar")).toBeVisible();
    // Kanal seçilmeden taşıyıcı zorunlu sayılır (needsCarrier varsayılanı).
    await expect(summary.getByRole("button", { name: "Sipariş" })).toBeVisible();
    await expect(summary.getByRole("button", { name: "Gönderim kanalı" })).toBeVisible();
    await expect(summary.getByRole("button", { name: "Taşıyıcı" })).toBeVisible();
    // cost_paid_by view'da "Seller" varsayılanıyla dolu — listede olmamalı.
    await expect(summary.getByRole("button", { name: "Ödeyen taraf" })).toBeHidden();
    // Odak ilk eksik kontrole taşınır (WCAG düzeni).
    await expect(page.getByRole("combobox", { name: "Sipariş" })).toBeFocused();
    // Ağ isteği gitmedi (mock zaten; ayrıca doğrulama engelledi) — toast yok.
    await expect(page.getByText(/oluşturuldu/)).toBeHidden();
  });

  test("sayısal alanlar: 'abc' reddedilir; '-5' ve negatif marj davranışı", async ({ page }) => {
    await openForm(page);
    const cost = page.getByLabel("Taşıyıcı maliyeti");

    // type=number 'abc'yi hiç kabul etmez (tarayıcı süzgeci).
    await cost.click();
    await cost.pressSequentially("abc");
    await expect(cost).toHaveValue("");

    // BULGU DOKÜMANTASYONU: negatif maliyet kabul ediliyor — min/doğrulama
    // yok (ManualShipmentFormScreen.vue:240, problems() negatifi saymıyor).
    await cost.fill("-5");
    await expect(cost).toHaveValue("-5");
    await expect(cost).not.toHaveAttribute("aria-invalid", "true");

    // Negatif marj uyarısı (TUR-121): maliyet > tahsilat → görünür uyarı.
    await cost.fill("100");
    await page.getByLabel("Müşteriye yansıyan").fill("50");
    await expect(page.getByText(/zarar ediyor/)).toBeVisible();
  });

  test("tarih tutarlılığı: tahmini teslim sevkten önceyse uyarı", async ({ page }) => {
    await openForm(page);
    await page.getByLabel("Sevk tarihi").fill("2026-09-03");
    await page.getByLabel("Tahmini teslim").fill("2026-09-01");
    await expect(
      page.getByText("Tahmini teslim tarihi sevk tarihinden önce olamaz.")
    ).toBeVisible();
  });

  test("geçerli gönderim (mock): taslak oluşur, listeye dönülür, listede sahte kayıt yok", async ({
    page,
  }) => {
    await openForm(page);
    await fillValidDraft(page);
    await page.getByRole("button", { name: "Kaydet" }).click();

    // Mock dönüşü persisted:false → detaya değil listeye dönülür.
    await expect(page.getByText(/Sevkiyat taslağı oluşturuldu: SHP-DEMO-/)).toBeVisible();
    await expect(page).toHaveURL(/lojistik\/sevkiyatlar(\?.*)?$/);
    await expect(dataRows(page)).toHaveCount(3);
    await expect(page.getByRole("cell", { name: /SHP-DEMO/ })).toBeHidden();
  });

  test("çift tıklama tek kayıt üretir (idempotency sözleşmesi)", async ({ page }) => {
    await openForm(page);
    await fillValidDraft(page);

    // Aynı render karesi içinde iki tıklama: disabled henüz DOM'a inmeden
    // ikinci submit yakalanabiliyor mu? (Sözleşme: idempotency_key çift
    // tıklamada yeni kayıt AÇMAMALI — api/shipmentCreate.js başlığı.)
    await page
      .getByRole("button", { name: "Kaydet" })
      .evaluate((btn: HTMLButtonElement) => {
        btn.click();
        btn.click();
      });

    await expect(page.getByText(/Sevkiyat taslağı oluşturuldu/).first()).toBeVisible();
    const toastCount = await page.getByText(/Sevkiyat taslağı oluşturuldu/).count();
    expect(toastCount, "çift tıklama iki ayrı taslak/toast üretmemeli").toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// C2 · Manuel durum güncelleme (yalnız sunulan geçişler + istemci
// doğrulaması — canlı uca istek ATILMAZ)
// ═══════════════════════════════════════════════════════════════════════
test.describe("C2 durum güncelleme", () => {
  async function openStatusUpdate(page: Page, name: string) {
    await page.goto(`${DETAIL_URL(name)}/durum`);
    await expect(page.getByRole("heading", { name: "Manuel durum güncelleme" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(`${name} durumunu elle değiştir.`)).toBeVisible();
  }

  test("Taslak (SHP-2026-00003): yalnız İptal edildi + Beklemede sunulur", async ({ page }) => {
    await openStatusUpdate(page, "SHP-2026-00003");
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(2);
    await expect(radios.filter({ hasText: "İptal edildi" })).toHaveCount(1);
    await expect(radios.filter({ hasText: "Beklemede" })).toHaveCount(1);
    // Geçersiz geçişler sunulmuyor (ALLOWED_TRANSITIONS.Draft dışındakiler).
    for (const invalid of ["Teslim edildi", "Yolda", "Dağıtımda", "Alındı", "Depoda"]) {
      await expect(radios.filter({ hasText: invalid })).toHaveCount(0);
    }
  });

  test("Yolda (SHP-2026-00001): tam harita — 5 hedef", async ({ page }) => {
    await openStatusUpdate(page, "SHP-2026-00001");
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(5);
    for (const target of ["Depoda", "İptal edildi", "Teslim edildi", "Başarısız", "Dağıtımda"]) {
      await expect(radios.filter({ hasText: target })).toHaveCount(1);
    }
    // Draft'tan ileri geçiş burada sunulmamalı.
    await expect(radios.filter({ hasText: "Beklemede" })).toHaveCount(0);
  });

  test("boş gönderim istemcide durur: hedef + gerekçe istenir, uca istek gitmez", async ({
    page,
  }) => {
    await openStatusUpdate(page, "SHP-2026-00003");

    const statusRequests: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("update_shipment_status")) statusRequests.push(r.url());
    });

    await page.getByRole("button", { name: "Durumu güncelle" }).click();
    const summary = page.getByRole("group");
    await expect(summary.getByRole("button", { name: "Yeni durum" })).toBeVisible();
    await expect(summary.getByRole("button", { name: "Gerekçe" })).toBeVisible();
    // Gerekçe kural metni görünür (min 10 karakter — TUR-107 denetim kaydı).
    await expect(page.getByText(/En az 10 karakter/)).toBeVisible();
    expect(statusRequests, "doğrulama aşamasında canlı uca istek gitmemeli").toEqual([]);
  });
});
