import { test, expect, Page } from "@playwright/test";

/**
 * A1 Pano · A2 Bekleyen İşler · A3 İstisna Kuyruğu — E2E denetimi (QA).
 *
 * Beklentiler KODDAN türetildi (mock sözleşmeleri):
 *   - src/api/dashboardMetrics.js  → active=9, delayed=2, failed=2,
 *     status_counts: Pending 5, Ready for Pickup 1, In Transit 2,
 *     At Warehouse 1, Delivered 6, Cancelled 1 (terminal olmayanlar toplamı 9)
 *   - src/api/pendingWork.js       → 5 kova (2/3/1/1/2), varsayılan
 *     awaiting_label, waiting_hours büyükten küçüğe
 *   - src/api/exceptionsMock.js    → AÇIK sayaçlar Critical 2 / Warning 1 /
 *     Info 0 (SHEX-00004 Info kaydı ÇÖZÜLMÜŞ tohumlanıyor — sayaç yalnız
 *     açıkları sayar, liste çözülmüşü soluk gösterir). "Tümü" = 3 açık,
 *     liste 4 satır.
 *
 * Dil DETERMİNİSTİK: Playwright tarayıcısı en-US açılır; testler th-lang=tr
 * pinler (detectLang localStorage'ı önce okur) — seçiciler TR metinlere göre.
 */

const TR = () => `localStorage.setItem("th-lang", "tr")`;

async function pinTr(page: Page) {
  await page.addInitScript(TR());
}

/** Konsol error + sayfa exception toplayıcı — sayfa açılmadan bağlanmalı. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console.error] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
  return errors;
}

/** A1 KPI kartı — etiket metninden kart köküne. */
function kpiCard(page: Page, label: string) {
  return page.locator(".card", { has: page.locator(`p:text-is("${label}")`) }).first();
}

async function kpiValue(page: Page, label: string): Promise<string> {
  return (await kpiCard(page, label).locator(".text-2xl").innerText()).trim();
}

/** Kova/önem hapı (StatusFilterPills butonu). */
function pill(page: Page, label: string) {
  return page.locator("button.status-pill", { hasText: label }).first();
}

/** Hapın sayaç rozeti (yalnız count > 0 iken çizilir). */
function pillCount(page: Page, label: string) {
  return pill(page, label).locator("span.rounded-full").last();
}

async function gotoPano(page: Page) {
  await pinTr(page);
  await page.goto("/panel/lojistik/pano");
  await expect(page.locator("h1")).toHaveText("Lojistik panosu");
  // Skeleton bitene kadar bekle — KPI değeri DOM'a girsin.
  await expect(kpiCard(page, "Aktif sevkiyat")).toBeVisible();
}

async function gotoPending(page: Page, query = "") {
  await pinTr(page);
  await page.goto(`/panel/lojistik/bekleyen-isler${query}`);
  await expect(page.locator("h1")).toHaveText("Bekleyen işler");
}

async function gotoExceptions(page: Page, query = "") {
  await pinTr(page);
  await page.goto(`/panel/lojistik/istisnalar${query}`);
  await expect(page.locator("h1")).toHaveText("İstisna kuyruğu");
}

/** A3 kart listesi (varsayılan grid modu) satırları. */
function exceptionRows(page: Page) {
  return page.locator("ul.space-y-2 > li");
}

// ═══════════════════════════════ A1 · PANO ═══════════════════════════════

test.describe("A1 Pano", () => {
  test("KPI değerleri mock sözleşmesiyle birebir (9/2/2 + ortalama)", async ({ page }) => {
    await gotoPano(page);

    expect(await kpiValue(page, "Aktif sevkiyat")).toBe("9");
    expect(await kpiValue(page, "Gecikmiş")).toBe("2");
    expect(await kpiValue(page, "Başarısız")).toBe("2");

    // Ortalama teslim: reportsMock'tan türetilir (kayan 30 gün) — sabit sayı
    // İDDİA EDİLMEZ; "x gün" biçiminde sayısal bir değer olmalı, "—" değil.
    const avg = await kpiValue(page, "Ortalama teslim");
    expect(avg).toMatch(/^\d+([.,]\d+)?\s+gün$/);
  });

  test("durum dağılımı: 6 durum, doğru sayılar, büyükten küçüğe sıralı", async ({ page }) => {
    await gotoPano(page);

    const section = page.locator("section.card", { hasText: "Durum dağılımı" });
    const rows = section.locator("div.flex.items-center.gap-3");
    await expect(rows).toHaveCount(6);

    // Sözleşme: Pending 5, Ready for Pickup 1, In Transit 2, At Warehouse 1,
    // Delivered 6, Cancelled 1 — ekran büyükten küçüğe sıralar.
    const expected: Array<[string, string]> = [
      ["Teslim edildi", "6"],
      ["Beklemede", "5"],
      ["Yolda", "2"],
    ];
    for (let i = 0; i < expected.length; i++) {
      const [label, count] = expected[i];
      await expect(rows.nth(i)).toContainText(label);
      await expect(rows.nth(i).locator("span.w-12")).toHaveText(count);
    }
    // 1'lik üç durum (sıra aralarında belirsiz — Object.entries + eşit sayı):
    for (const label of ["Depoda", "Alıma hazır", "İptal edildi"]) {
      const row = rows.filter({ hasText: label });
      await expect(row).toHaveCount(1);
      await expect(row.locator("span.w-12")).toHaveText("1");
    }
  });

  test("terminal olmayan durumların toplamı = aktif KPI", async ({ page }) => {
    await gotoPano(page);

    const section = page.locator("section.card", { hasText: "Durum dağılımı" });
    let sum = 0;
    for (const label of ["Beklemede", "Alıma hazır", "Yolda", "Depoda"]) {
      const cell = section
        .locator("div.flex.items-center.gap-3", { hasText: label })
        .locator("span.w-12");
      sum += Number((await cell.innerText()).trim());
    }
    expect(String(sum)).toBe(await kpiValue(page, "Aktif sevkiyat"));
  });

  test("ilk yükleme + sayfa yenileme konsol hatasız, hata durumu yok", async ({ page }) => {
    const errors = trackErrors(page);
    await gotoPano(page);
    await page.reload();
    await expect(page.locator("h1")).toHaveText("Lojistik panosu");
    await expect(kpiCard(page, "Aktif sevkiyat")).toBeVisible();
    // ErrorState çizilmemiş olmalı (retry butonu ErrorState'e özgü).
    await expect(page.getByRole("button", { name: /tekrar dene/i })).toHaveCount(0);
    expect(errors, `Konsol hataları:\n${errors.join("\n")}`).toEqual([]);
  });
});

// ═══════════════════════ A2 · BEKLEYEN İŞLER ═══════════════════════

test.describe("A2 Bekleyen İşler", () => {
  test("varsayılan kova awaiting_label: 3 satır, bekleme süresine göre azalan", async ({
    page,
  }) => {
    await gotoPending(page);

    await expect(pill(page, "Etiket bekliyor")).toHaveAttribute("aria-pressed", "true");
    await expect(pillCount(page, "Etiket bekliyor")).toHaveText("3");

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(3);
    // Mock: 80 sa (…55) > 26 sa (…54) > 2 sa (…53)
    await expect(rows.nth(0)).toContainText("SHP-2026-00055");
    await expect(rows.nth(0)).toContainText("3 gün"); // 80 sa
    await expect(rows.nth(1)).toContainText("SHP-2026-00054");
    await expect(rows.nth(1)).toContainText("1 gün"); // 26 sa
    await expect(rows.nth(2)).toContainText("SHP-2026-00053");
    await expect(rows.nth(2)).toContainText("2 sa");
  });

  test("beş kovada sayaç = liste satır sayısı, geçişler URL'e yazılır", async ({ page }) => {
    await gotoPending(page);

    const buckets: Array<[string, string, number, string | null]> = [
      // [hap etiketi, bucket anahtarı, satır sayısı, en üst satır (en uzun bekleyen)]
      ["Taşıyıcı atanmadı", "awaiting_carrier", 2, "SHP-2026-00052"], // 30 > 5
      ["Toplama bekliyor", "awaiting_pickup", 1, "SHP-2026-00056"],
      ["Teslim belgesi bekliyor", "awaiting_pod", 1, "SHP-2026-00057"],
      ["Gecikmiş", "delayed", 2, "SHP-2026-00059"], // 120 > 96
      ["Etiket bekliyor", "awaiting_label", 3, "SHP-2026-00055"], // varsayılana dönüş
    ];

    for (const [label, key, count, topRow] of buckets) {
      await pill(page, label).click();
      await expect(pill(page, label)).toHaveAttribute("aria-pressed", "true");
      if (key === "awaiting_label") {
        // Varsayılan kova URL'den DÜŞÜRÜLÜR (selectBucket: default → undefined).
        await expect(page).not.toHaveURL(/bucket=/);
      } else {
        await expect(page).toHaveURL(new RegExp(`bucket=${key}`));
      }
      await expect(pillCount(page, label)).toHaveText(String(count));
      const rows = page.locator("tbody tr");
      await expect(rows).toHaveCount(count);
      if (topRow) await expect(rows.nth(0)).toContainText(topRow);
    }
  });

  test("URL ?bucket=delayed doğrudan açılır: 2 satır, 96 sa üstü kırmızı", async ({ page }) => {
    await gotoPending(page, "?bucket=delayed");

    await expect(pill(page, "Gecikmiş")).toHaveAttribute("aria-pressed", "true");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("SHP-2026-00059"); // 120 sa
    await expect(rows.nth(0)).toContainText("5 gün");
    await expect(rows.nth(1)).toContainText("SHP-2026-00058"); // 96 sa
    await expect(rows.nth(1)).toContainText("4 gün");
    // 72 sa üstü kritik renk sınıfı (PendingWorkQueueScreen.waitingClass).
    await expect(rows.nth(0).locator("span.text-red-600, span.dark\\:text-red-400")).toHaveCount(1);
  });

  test("sıralama kontrolü SUNULMAZ (ölü kontrol yasağı — 16-BE'ye kadar)", async ({ page }) => {
    // 2026-09-03 denetim bulgusu + karar: useDataTable server-side state
    // tutuyor, A2 container'ı dt.sorting'i backend'e taşıyamıyor (uç yok).
    // Tıklanınca aria-sort "artan" deyip satırları yerinde bırakan başlık
    // ekran okuyucuya yalan söylüyordu. Karar: istemci tarafı sıralama
    // YAZILMADI; sortable bayrakları 16-BE `order_by` verene dek kaldırıldı
    // (toplu-aksiyon "ölü buton yasağı" emsali). Bu test o kararı kilitler:
    // sıralama affordance'ı geri gelirse ÇALIŞIYOR da olmalı — o gün bu
    // testin yerine yukarıdaki varsayılan-sıra testinin tıklamalı çifti yazılır.
    await gotoPending(page);

    // DataTable sortable OLMAYAN başlığı artık düz metin basar (2026-09-04
    // denetimi): no-op <button> eylemsiz kontroldü (WCAG 4.1.2). Buton,
    // aria-sort ve chevron yalnız sortable sütunda doğar.
    const th = page.locator("th", { hasText: "Bekleme" });
    await expect(th).toBeVisible();
    await expect(th).not.toHaveAttribute("aria-sort", /.+/);
    await expect(th.locator("svg")).toHaveCount(0); // sıralama chevron'u yok
    await expect(th.locator("button")).toHaveCount(0); // sortable değil → buton YOK
    // Başlığa tıklamak sırayı DEĞİŞTİRMEZ ve aria-sort iddiası doğurmaz.
    await th.click();
    await expect(th).not.toHaveAttribute("aria-sort", /.+/);
    await expect(page.locator("tbody tr").nth(0)).toContainText("SHP-2026-00055");
  });

  test("satıra tıklama B2 sevkiyat detayına götürür", async ({ page }) => {
    await gotoPending(page);
    await page.locator("tbody tr").nth(0).click();
    await expect(page).toHaveURL(/\/panel\/lojistik\/sevkiyatlar\/SHP-2026-00055$/);
  });
});

// ═════════════════ A1 ↔ A2/A3 SAYI TUTARLILIĞI ═════════════════

test.describe("A1↔A2/A3 tutarlılık", () => {
  test("Gecikmiş KPI (2) → A2 delayed kovası aynı sayıyı gösterir", async ({ page }) => {
    await gotoPano(page);
    const kpi = await kpiValue(page, "Gecikmiş");
    expect(kpi).toBe("2");

    await kpiCard(page, "Gecikmiş").click();
    await expect(page).toHaveURL(/\/panel\/lojistik\/bekleyen-isler\?bucket=delayed$/);
    await expect(pill(page, "Gecikmiş")).toHaveAttribute("aria-pressed", "true");
    await expect(pillCount(page, "Gecikmiş")).toHaveText(kpi);
    await expect(page.locator("tbody tr")).toHaveCount(Number(kpi));
  });

  test("Başarısız KPI (2) → A3 Critical filtresi aynı sayıyı gösterir", async ({ page }) => {
    await gotoPano(page);
    const kpi = await kpiValue(page, "Başarısız");
    expect(kpi).toBe("2");

    await kpiCard(page, "Başarısız").click();
    await expect(page).toHaveURL(/\/panel\/lojistik\/istisnalar\?severity=Critical$/);
    await expect(pill(page, "Kritik")).toHaveAttribute("aria-pressed", "true");
    await expect(pillCount(page, "Kritik")).toHaveText(kpi);
    await expect(exceptionRows(page)).toHaveCount(Number(kpi));
  });

  test("Aktif KPI → B1 sevkiyat listesine iner", async ({ page }) => {
    await gotoPano(page);
    await kpiCard(page, "Aktif sevkiyat").click();
    await expect(page).toHaveURL(/\/panel\/lojistik\/sevkiyatlar$/);
  });

  test("A3'te Critical çözülünce PANO failed KPI'ı da düşmeli (aynı sorgu sözü)", async ({
    page,
  }) => {
    // dashboardMetrics.js:16-24 sözleşmesi: failed = AÇIK Critical, A3
    // sayaçlarıyla AYNI kaynak — "Panodan tıklayan kullanıcı A3'te AYNI
    // sayıda kayıt görmeli". AYNI SPA oturumu içinde (yenileme YOK — panodan
    // KPI ile inilir) A3'te bir Critical çözülür, panoya dönülür: pano hâlâ
    // 2 gösteriyorsa iki ekran ayrışmıştır.
    await gotoPano(page);
    await kpiCard(page, "Başarısız").click(); // SPA geçişi — JS bağlamı korunur
    await expect(page).toHaveURL(/istisnalar\?severity=Critical$/);

    await exceptionRows(page).nth(0).getByRole("button", { name: "Çözümle" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill("Tutarlılık testi: alıcıyla görüşüldü.");
    await dialog.getByRole("button", { name: "Çözümle" }).click();
    await expect(dialog).toBeHidden();
    await expect(pillCount(page, "Kritik")).toHaveText("1");

    // SPA içi geri dönüş (yeniden yükleme mock'u sıfırlardı — o normal).
    await page.goBack();
    await expect(page).toHaveURL(/\/panel\/lojistik\/pano/);
    await expect(kpiCard(page, "Başarısız")).toBeVisible();
    expect(await kpiValue(page, "Başarısız")).toBe("1");
  });
});

// ═══════════════════ A3 · İSTİSNA KUYRUĞU ═══════════════════

test.describe("A3 İstisna Kuyruğu", () => {
  test("açık sayaçlar Kritik 2 / Uyarı 1, Tümü 3; liste 4 satır (çözülmüş dahil)", async ({
    page,
  }) => {
    await gotoExceptions(page);

    // severity_counts YALNIZ açık kayıtları sayar (exceptionsMock.js:90-102).
    // SHEX-00004 (Info) tohumdan çözülmüş → Info açık sayısı 0, rozeti hiç
    // çizilmez (StatusFilterPills count>0 koşulu).
    await expect(pillCount(page, "Kritik")).toHaveText("2");
    await expect(pillCount(page, "Uyarı")).toHaveText("1");
    await expect(pillCount(page, "Tümü")).toHaveText("3");
    await expect(pill(page, "Bilgi").locator("span.rounded-full")).toHaveCount(0);

    // Liste çözülmüşü DÜŞÜRMEZ: 4 satır, sonuncusu soluk + "çözümledi" notu.
    // (Kartta SHEX adı basılmıyor — kayıt sevkiyat adıyla teşhis edilir.)
    const rows = exceptionRows(page);
    await expect(rows).toHaveCount(4);
    const resolved = rows.filter({ hasText: "çözümledi" });
    await expect(resolved).toHaveCount(1);
    await expect(resolved.first()).toContainText("operator@istoc.demo çözümledi");
    await expect(resolved.first()).toHaveClass(/opacity-70/);
    await expect(resolved.first().getByRole("button", { name: "Çözümle" })).toHaveCount(0);
  });

  test("?severity=Critical URL'i: filtre hapı seçili, yalnız 2 Critical satırı", async ({
    page,
  }) => {
    await gotoExceptions(page, "?severity=Critical");

    await expect(pill(page, "Kritik")).toHaveAttribute("aria-pressed", "true");
    const rows = exceptionRows(page);
    await expect(rows).toHaveCount(2);
    // Sıralama: çözülmemişler önce, sonra occurred_at azalan → 00002, 00001.
    await expect(rows.nth(0)).toContainText("SHP-2026-00054"); // SHEX-00002
    await expect(rows.nth(1)).toContainText("SHP-2026-00058"); // SHEX-00001
    for (const i of [0, 1]) await expect(rows.nth(i)).toContainText("Kritik");
  });

  test("hap tıklamaları filtreyi URL'e yazar ve listeyi süzer", async ({ page }) => {
    await gotoExceptions(page);

    await pill(page, "Uyarı").click();
    await expect(page).toHaveURL(/severity=Warning/);
    await expect(exceptionRows(page)).toHaveCount(1);
    await expect(exceptionRows(page).nth(0)).toContainText("Taşıyıcı bildirimi işlenemedi");

    await pill(page, "Tümü").click();
    await expect(page).not.toHaveURL(/severity=/);
    await expect(exceptionRows(page)).toHaveCount(4);
  });

  test("çözümle: boş not reddedilir, notla çözüm sayaç düşürür + satır solar", async ({ page }) => {
    await gotoExceptions(page);
    const rows = exceptionRows(page);
    // İlk satır: SHEX-00002 (Critical, SHP-2026-00054).
    await rows.nth(0).getByRole("button", { name: "Çözümle" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("SHP-2026-00054");

    // 1) BOŞ NOT: submit reddedilir, hata metni role=alert ile görünür,
    //    diyalog açık kalır, hiçbir toast çıkmaz, sayaç düşmez.
    await dialog.getByRole("button", { name: "Çözümle" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Çözüm notu olmadan istisna kapatılamaz.");
    await expect(dialog).toBeVisible();
    await expect(page.locator(".toast")).toHaveCount(0);
    await expect(pillCount(page, "Kritik")).toHaveText("2");

    // 2) NOTLA ÇÖZÜM.
    await dialog.getByRole("textbox").fill("Alıcı arandı, adres teyit edildi.");
    await dialog.getByRole("button", { name: "Çözümle" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator(".toast-success")).toContainText("İstisna çözümlendi: SHEX-00002");

    // Sayaç 2→1; satır listede KALIR (4 satır), solar, notu gösterir,
    // "Çözümle" butonu kaybolur (tekrar çözülemez).
    await expect(pillCount(page, "Kritik")).toHaveText("1");
    await expect(pillCount(page, "Tümü")).toHaveText("2");
    await expect(rows).toHaveCount(4);
    // Kartta SHEX adı yok — SHEX-00002'nin sevkiyatı SHP-2026-00054 tekil.
    const justResolved = rows.filter({ hasText: "SHP-2026-00054" });
    await expect(justResolved).toHaveCount(1);
    await expect(justResolved.first()).toHaveClass(/opacity-70/);
    await expect(justResolved.first()).toContainText("Alıcı arandı, adres teyit edildi.");
    await expect(justResolved.first().getByRole("button", { name: "Çözümle" })).toHaveCount(0);
  });

  test("çift tıklama çift kayıt/çift toast üretmez", async ({ page }) => {
    await gotoExceptions(page);
    await exceptionRows(page).nth(0).getByRole("button", { name: "Çözümle" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill("Çift tık denemesi.");
    await dialog.getByRole("button", { name: "Çözümle" }).dblclick();
    await expect(dialog).toBeHidden();

    // Tek toast, sayaç TEK adım düşer (2→1, 0 DEĞİL), liste hâlâ 4 satır.
    await expect(page.locator(".toast-success")).toHaveCount(1);
    await expect(pillCount(page, "Kritik")).toHaveText("1");
    await expect(exceptionRows(page)).toHaveCount(4);
  });
});

// ══════════════════ SEKME BAŞLIKLARI + GEZİNTİ ══════════════════

test.describe("Sekme başlıkları ve gezinti", () => {
  test("üç ekranın document.title'ı farklı ve 'Lojistik' sabitine düşmüyor", async ({ page }) => {
    await pinTr(page);

    const screens: Array<[string, string]> = [
      ["/panel/lojistik/pano", "Pano · iStoc B2B"],
      ["/panel/lojistik/bekleyen-isler", "Bekleyen İşler · iStoc B2B"],
      ["/panel/lojistik/istisnalar", "İstisna Kuyruğu · iStoc B2B"],
    ];

    const seen: string[] = [];
    for (const [path, title] of screens) {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
      expect(await page.title()).not.toMatch(/^Lojistik ·/);
      seen.push(await page.title());
    }
    expect(new Set(seen).size).toBe(3);
  });

  test("A1↔A2↔A3 hızlı SPA gezintisi (3 tur) konsol hatası üretmez", async ({ page }) => {
    const errors = trackErrors(page);
    await gotoPano(page);

    for (let tour = 0; tour < 3; tour++) {
      // A1 → A2 (KPI drill), geri; A1 → A3 (KPI drill), geri.
      await kpiCard(page, "Gecikmiş").click();
      await expect(page).toHaveURL(/bekleyen-isler/);
      await expect(page.locator("h1")).toHaveText("Bekleyen işler");
      await page.goBack();
      await expect(kpiCard(page, "Başarısız")).toBeVisible();

      await kpiCard(page, "Başarısız").click();
      await expect(page).toHaveURL(/istisnalar/);
      await expect(page.locator("h1")).toHaveText("İstisna kuyruğu");
      await page.goBack();
      await expect(kpiCard(page, "Gecikmiş")).toBeVisible();
    }

    expect(errors, `Konsol hataları:\n${errors.join("\n")}`).toEqual([]);
  });
});
