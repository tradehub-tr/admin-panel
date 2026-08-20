import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";

import { call, callGet } from "./helpers";

/**
 * T-141 — S4 (crop+focal+onay→kayıt) + S5 (önizlemesiz onay engeli).
 * tradehubfront'tan TAŞINDI, skip'ler kaldırıldı.
 *
 * Hedef varlık: satıcının (SEL-00003 / ali.bal) ready `product.image` Media
 * Asset'i. Env ile geçersiz kılınabilir: E2E_CROP_ASSET.
 */

const CROP = "tradehub_core.api.media_crop";
const ASSET = process.env.E2E_CROP_ASSET || "7pa8r42g7d";
const CONTAINER = process.env.E2E_BACKEND_CONTAINER || "istoc-dev-backend-1";
const SITE = process.env.E2E_SITE || "istoc.localhost";

/**
 * Kırpma niyetini SIL — asseti pristine'e döndürür.
 *
 * Neden gerekli: sunucu kapısı "kayıtta zaten duran kanıt" da onay sayar
 * (T-114). S4 bir kez kanıt yazınca, sonraki koşumların S5'i (kanıtsız onay)
 * o kalıntı yüzünden 200 görür ve yanlış geçerdi. Her senaryo öncesi/sonrası
 * niyet silinerek S5'in "kanıt YOK → 417" iddiası GERÇEKTEN ölçülür ve gerçek
 * satıcının varlığında kalıcı iz bırakılmaz (niyet yeniden üretilebilir bir
 * ayardır, dosya değil).
 */
function resetCropIntent(): void {
  const py = [
    "import frappe",
    `frappe.db.delete("Media Crop Intent", {"asset": ${JSON.stringify(ASSET)}})`,
    "frappe.db.commit()",
    'print("RESET_OK")',
  ].join("\n");
  try {
    execFileSync(
      "docker",
      ["exec", "-i", CONTAINER, "bash", "-lc", `cd /home/frappe/frappe-bench && bench --site ${SITE} console`],
      { input: py, encoding: "utf8", timeout: 120000 }
    );
  } catch {
    // Reset best-effort: konteyner erişimi yoksa beforeEach skip'i devreye girer.
  }
}

test.describe("T-141 · satıcı medya konsolu — kırpma & onay kapısı (canlı)", () => {
  // Varlık bu satıcıya çözülmüyorsa (başka DB) senaryolar anlamsız — atla.
  test.beforeEach(async ({ request }) => {
    const probe = await callGet(request, `${CROP}.get_intent`, { asset: ASSET });
    test.skip(
      probe.status !== 200,
      `Hedef Media Asset (${ASSET}) bu satıcı oturumuna çözülmüyor (status ${probe.status}). ` +
        `E2E_CROP_ASSET ile ready bir product.image varlığı verin.`
    );
    // Her senaryo pristine niyetle başlasın (S5'in kanıtsız-onay ölçümü için şart).
    resetCropIntent();
  });

  // Süite sonunda asseti pristine bırak — gerçek satıcının varlığında iz yok.
  test.afterAll(() => resetCropIntent());

  // ── Senaryo 5 ──────────────────────────────────────────────────────────
  // "Önizlemeden geçmeden onaylamayı dener → engellenir." (UI + API)
  //
  // ETİKET: KOŞUYOR (SUNUCU kapısı — asıl atlatılamaz katman).
  //
  // İKİ AYRI İDDİA:
  //  (b) API: onay ucunu DOĞRUDAN, kanıtsız çağırmak reddedilmeli — 417
  //      MEDIA_PREVIEW_REQUIRED. Bu, bir istemci kuralını delip geçen çağrıyı
  //      da kapatan katman; T-141 "frontend atlatılamaz" şartının ölçülür hâli.
  //  (a) UI: onay düğmesinin disabled olduğu ve nedeni — CANLI panelde
  //      DRİVE EDİLEMİYOR: `SimApprovalGate` yalnız `CropStudioModal` içinde
  //      mount ediliyor ve orada `:asset` PROP'U GEÇİLMİYOR (MediaLibraryView),
  //      ayrıca kapı IntersectionObserver "dwell" ile açılıyor (headless'ta
  //      güvenilir tetiklenmez). O yarı `components/media/simulator/__tests__/
  //      approvalGate.test.js` biriminde kapsanıyor. Bu iki kısıt rapora bulgu
  //      olarak yazıldı; burada SAHTE YEŞİL basmıyoruz, sunucu reddini
  //      GERÇEKTEN bekliyoruz.
  test("S5 — önizleme kanıtı olmadan onay API'de 417 ile engellenir", async ({
    request,
  }) => {
    const res = await call(request, `${CROP}.save_intent`, {
      asset: ASSET,
      approved_by_user: 1,
      focal_x: 0.5,
      focal_y: 0.5,
      // previewed_placements KASITLI YOK — kanıtsız onay.
    });
    expect(res.status).toBe(417);
    // Metin değil, sözleşme kodu iddiada: MEDIA_PREVIEW_REQUIRED.
    expect(JSON.stringify(res.raw)).toContain("MEDIA_PREVIEW_REQUIRED");
  });

  // ── Senaryo 4 ──────────────────────────────────────────────────────────
  // "Crop + focal ayarlar, cihaz sınıflarını önizler, onaylar → yayın."
  //
  // ETİKET: KOŞUYOR (ÜRETİCİ yarısı: kırpma niyeti + onay kanıtı sunucuya
  // yazılıyor ve geri okununca BİREBİR eşleşiyor).
  //
  // Kabul ölçütünün üretici yarısı: `save_intent` gönderilen geometriyi (focal)
  // ve onay kanıtını kaydeder; `get_intent` aynı geometriyi döndürür (idempotent
  // round-trip). Vitrin yarısı (`media-delivery-manifest.spec.ts` S6) ZATEN
  // koşuyor; simülatörde her cihazı fiilen GÖRME etkileşimi headless dışı
  // (S5 notu) — onay kanıtı bu testte geçerli `previewed_placements` gövdesiyle
  // temsil ediliyor (sunucunun kabul ettiği kanıt şekli).
  test("S4 — crop + focal ayarlanır, onaylanır ve geometri kalıcı olarak eşleşir", async ({
    request,
  }) => {
    const focalX = 0.42;
    const focalY = 0.58;
    // Simülatörde görülen yerleşimlerin kanıt gövdesi (bölge × cihaz sınıfı).
    const evidence = JSON.stringify([
      { region: "pd_gallery_main", device_class: "phone" },
      { region: "pd_gallery_main", device_class: "desktop" },
    ]);

    const save = await call(request, `${CROP}.save_intent`, {
      asset: ASSET,
      approved_by_user: 1,
      focal_x: focalX,
      focal_y: focalY,
      method: "manual",
      previewed_placements: evidence,
    });
    expect(save.status).toBe(200);
    const savedIntent = (save.message as { intent?: { focal_x?: number; focal_y?: number; approved_by_user?: boolean } })
      .intent;
    // Gönderilen geometri BİREBİR kaydedildi (kelepçelenmedi, silinmedi).
    expect(savedIntent?.focal_x).toBeCloseTo(focalX, 5);
    expect(savedIntent?.focal_y).toBeCloseTo(focalY, 5);
    expect(savedIntent?.approved_by_user).toBe(true);

    // Ayrı bir okumada da aynı geometri — round-trip kalıcı.
    const readBack = await callGet(request, `${CROP}.get_intent`, { asset: ASSET });
    expect(readBack.status).toBe(200);
    const intent = (readBack.message as { intent?: { focal_x?: number; focal_y?: number; approved_by_user?: boolean } })
      .intent;
    expect(intent?.focal_x).toBeCloseTo(focalX, 5);
    expect(intent?.focal_y).toBeCloseTo(focalY, 5);
    expect(intent?.approved_by_user).toBe(true);
  });

  // ── S4/S5'in UI YARISI (W5 kablolaması sonrası SÜRÜLDÜ) ─────────────────
  //
  // Rapor 75 · Bulgu 3'ün kökü: MediaLibraryView `CropStudioModal`'ı
  // `:asset`SİZ açıyordu → Uygula kalıcı devre dışı, `save_intent` o ekrandan
  // HİÇ çağrılamıyordu. Kablo bağlandı (`store.assetNameOf` → `:asset`);
  // aşağıdaki İKİ test CANLI panelde iki yarıyı AYRI AYRI ölçer.
  //
  // İZİN ENGELİ KAPANDI (W5-1, 2026-08-20): `Media Asset` izinlerindeki
  // `if_owner: 1` kaldırıldı — kiracı sınırı zaten `hooks.py`'deki
  // `media_asset_query_conditions` (owner_seller) süzgecinde duruyordu,
  // `if_owner` onun ÜSTÜNE Frappe `owner`ı (Administrator) şart koşup
  // satıcının kendi varlığını da gizliyordu. Düzeltme sonrası satıcı
  // oturumunda `manifest_batch.assets[]` DOLU dönüyor (aşağıdaki (b) testi
  // bunun uçtan uca kanıtı); (a) testi bu yüzden artık adayını "asset'i
  // ÇÖZÜLMEYEN dosya" diye AÇIKÇA seçmek zorunda — eskiden her dosya öyleydi.
  test("S4/S5 UI (a) — kütüphaneden Kırpma Stüdyosu açılır; asset çözülemeyen dosyada Uygula dürüstçe kapalı", async ({
    page,
    request,
  }) => {
    // Ölçüsü bilinen bir görsel gerekli (Kırp düğmesi şartı). `get_dimensions`
    // ilk soruluşta diskten okuyup SAKLIYOR — yalnız okuma, veri bozulmaz.
    const liste = await callGet(request, "tradehub_core.api.seller_media.get_my_media", {
      page: "1",
      page_size: "100",
    });
    expect(liste.status).toBe(200);
    const satirlar =
      (liste.message as { items?: { name: string; file_name: string; file_url: string }[] })
        .items || [];
    // Aday: kırpılabilir AMA varlığı çözülmeyen görsel. İzin düzeltmesi
    // sonrası varlıklı dosyada Uygula AÇIK olur (test b) — bu test "asset
    // yoksa dürüstçe kapalı" yarısını ölçtüğü için adayını ona göre süzer.
    const gorseller = satirlar.filter((s) => /\.(png|jpe?g|webp)$/i.test(s.file_url || ""));
    let aday: { name: string; file_name: string; file_url: string } | null = null;
    for (let i = 0; i < gorseller.length && !aday; i += 20) {
      const dilim = gorseller.slice(i, i + 20);
      const res = await call(request, "tradehub_core.api.media_manifest.manifest_batch", {
        file_urls: dilim.map((s) => s.name),
      });
      const manifests =
        (res.message as { manifests?: Record<string, { assets?: string[] } | null> })
          .manifests || {};
      aday = dilim.find((s) => (manifests[s.name]?.assets || []).length === 0) || null;
    }
    test.skip(
      !aday,
      "Kütüphanedeki her kırpılabilir görselin varlığı çözülüyor — 'asset yok' hâli bu veriyle ölçülemez."
    );
    const boyut = await callGet(request, "tradehub_core.api.seller_media.get_dimensions", {
      file_url: aday!.file_url,
    });
    test.skip(
      !(boyut.message as { width?: number })?.width,
      `Adayın (${aday!.file_name}) piksel ölçüsü çözülemedi — Kırp düğmesi hiç açılmaz.`
    );

    await page.goto(`media-library?q=${encodeURIComponent(aday!.file_name)}`, {
      waitUntil: "networkidle",
    });

    // Taze profilde bölüm tanıtım turu (GuidedTour, z-9999) tıklamaları
    // kilitliyor — varsa atla (media-upload-security S1 ile aynı ölçüm).
    const turAtla = page.locator(".z-\\[9999\\] button", { hasText: "✕" });
    await turAtla.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
    if (await turAtla.isVisible().catch(() => false)) await turAtla.click();

    // İLK kartı değil, ADAYIN kartını aç: arama alt-dizgi eşleştiriyor,
    // ilk kart benzer adlı BAŞKA bir dosya olabilir (kart adı = title ||
    // fileName, `MediaCard` aria-label'ı).
    await page.locator(".mcard__open").first().waitFor({ state: "visible", timeout: 15000 });
    const adayKart = page.locator(`.mcard__open[aria-label="${aday!.file_name}"]`);
    await ((await adayKart.count()) ? adayKart.first() : page.locator(".mcard__open").first()).click();

    const kirp = page.getByRole("button", { name: /Kırp|Crop/ });
    await expect(kirp).toBeEnabled({ timeout: 15000 });
    await kirp.click();

    // Kırpma Stüdyosu KÜTÜPHANEDEN açıldı — Bulgu 3 öncesinde bu yol vardı
    // ama kayıt yolu ölüydü; şimdi modal açılıyor VE dürüstlük korunuyor:
    // asset çözülemedi (yukarıdaki izin engeli) → Uygula DEVRE DIŞI.
    await expect(page.locator(".cstudio")).toBeVisible({ timeout: 20000 });
    await expect(page.locator(".cstudio__btn--primary")).toBeDisabled();
  });

  test("S4/S5 UI (b) — asset'li dosyada Uygula etkin; kanıtsız kayıt reddi (417) ekranda görünür", async ({
    page,
    request,
  }) => {
    // ASSET'in (ya da herhangi bir varlığın) kütüphane satırına çözülmesi
    // gerekli: satır modeli asset adı taşımıyor, panel manifest_batch'e sorar.
    const liste = await callGet(request, "tradehub_core.api.seller_media.get_my_media", {
      page: "1",
      page_size: "100",
    });
    expect(liste.status).toBe(200);
    const satirlar =
      (liste.message as { items?: { name: string; file_name: string; file_url: string }[] })
        .items || [];

    // Hedef: varlığı ÇÖZÜLEN + ölçüsü BİLİNEN görsel (Kırp düğmesi ölçü ister).
    // W5-1 izin düzeltmesi sonrası bu arama artık DOLU dönüyor; skip yalnız
    // verisiz ortam için duruyor.
    // Kısa kenarı EN BÜYÜK aday seçilir, ilk bulunan değil: kütüphanede
    // güvenlik E2E'lerinden kalma 32 px'lik dosyalar da varlık kazanabiliyor
    // (rendition_on_upload açık) ve 32 px'lik kaynakta HER slot politikası
    // kadrajı BLOK'lar ("Short edge after crop is 32 px…") — Uygula'nın o
    // dosyada kapalı kalması arıza değil FR-028'in dürüst hâli. Bu sürüşte
    // ölçülen tuzak tam buydu; asset kablosu çalışıyordu, kaynak küçüktü.
    const gorseller = satirlar.filter((s) => /\.(png|jpe?g|webp)$/i.test(s.file_url || ""));
    let hedef: { name: string; file_name: string; file_url: string } | null = null;
    let hedefKisaKenar = 0;
    for (let i = 0; i < gorseller.length; i += 20) {
      const dilim = gorseller.slice(i, i + 20);
      const res = await call(request, "tradehub_core.api.media_manifest.manifest_batch", {
        file_urls: dilim.map((s) => s.name),
      });
      const manifests =
        (res.message as { manifests?: Record<string, { assets?: string[] } | null> })
          .manifests || {};
      for (const s of dilim) {
        if (!(manifests[s.name]?.assets || []).length) continue;
        const boyut = await callGet(request, "tradehub_core.api.seller_media.get_dimensions", {
          file_url: s.file_url,
        });
        const olcu = boyut.message as { width?: number; height?: number };
        const kisa = Math.min(olcu?.width || 0, olcu?.height || olcu?.width || 0);
        if (kisa > hedefKisaKenar) {
          hedef = s;
          hedefKisaKenar = kisa;
        }
      }
    }
    // user.avatar politikasının tabanı 96 px (aşağıdaki slot düşüşü) — altı
    // her slotta bloklanır, testin ölçeceği bir şey kalmaz.
    test.skip(
      !hedef || hedefKisaKenar < 96,
      "Satıcı oturumunda varlığı çözülen + kısa kenarı ≥96 px görsel yok — W5-1 düzeltmesi " +
        "sonrası bu skip yalnız verisiz ortamda görülmeli; görülüyorsa izin gerilemiş demektir."
    );

    await page.goto(`media-library?q=${encodeURIComponent(hedef!.file_name)}`, {
      waitUntil: "networkidle",
    });
    const turAtla = page.locator(".z-\\[9999\\] button", { hasText: "✕" });
    await turAtla.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
    if (await turAtla.isVisible().catch(() => false)) await turAtla.click();

    // Arama alt-dizgi eşleştirir; HEDEFİN kartına tıkla, ilk karta değil.
    await page.locator(".mcard__open").first().waitFor({ state: "visible", timeout: 15000 });
    const hedefKart = page.locator(`.mcard__open[aria-label="${hedef!.file_name}"]`);
    await ((await hedefKart.count()) ? hedefKart.first() : page.locator(".mcard__open").first()).click();
    const kirp = page.getByRole("button", { name: /Kırp|Crop/ });
    await expect(kirp).toBeEnabled({ timeout: 15000 });
    await kirp.click();

    // Slot varlığın gerçek slotuna alınır (product.image).
    await expect(page.locator(".cstudio")).toBeVisible({ timeout: 20000 });
    await page.locator(".cstudio__slot-select").selectOption("product.image");

    const uygula = page.locator(".cstudio__btn--primary");

    // ÖLÇÜLEN POLİTİKA KATMANI: `product.image` kısa kenar ≥ 1000 ister
    // (slot_profiles vendor `minShortEdge`). Kaynağı küçük dosyada Uygula'nın
    // kapalı kalması ARIZA DEĞİL, FR-028 upscale yasağının dürüst hâli —
    // asset kablosunun testi bunun için politikayı GEÇEN bir slotta sürülür
    // (`user.avatar`, minShortEdge 96; kırpma niyeti asset'e yazılır, slot
    // seçimi yalnız yerel oran/uyarı bağlamıdır).
    if (hedefKisaKenar < 1000) {
      await expect(uygula).toBeDisabled();
      await page.locator(".cstudio__slot-select").selectOption("user.avatar");
    }

    // UYGULA ETKİN — Bulgu 3'ün ölçülür tersine dönüşü: asset modala aktı.
    await expect(uygula).toBeEnabled({ timeout: 15000 });

    // Kanıtsız Uygula → save_intent GERÇEKTEN çağrılır; sunucu 417
    // MEDIA_PREVIEW_REQUIRED der ve ret modalda görünür kalır (S5 UI yarısı).
    // S4'ün TAM sürüşü (simülatör kartlarını görüp dwell ile onay) headless
    // dışı — SimApprovalGate IntersectionObserver ister; sahte onay yok.
    const yanit = page.waitForResponse((r) => r.url().includes("media_crop.save_intent"), {
      timeout: 20000,
    });
    await uygula.click();
    expect((await yanit).status()).toBe(417);
    await expect(page.locator(".cstudio__saveerr")).toBeVisible({ timeout: 10000 });
  });
});
