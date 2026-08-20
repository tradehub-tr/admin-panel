import { expect, test } from "@playwright/test";

import {
  call,
  callGet,
  e2eName,
  makeBombPng,
  makePng,
  makePolyglotJpeg,
  makeSvgXss,
  toBase64,
} from "./helpers";

/**
 * T-141 — SATICI MEDYA KONSOLU: S1 (boyut reddi) + S10 (kötücül reddi).
 * tradehubfront `media-seller-upload.spec.ts`'ten TAŞINDI; skip'ler kaldırıldı.
 *
 * Konsol admin-panel'de, testler CANLI backend'e (`istoc.localhost`) gider —
 * mock YOK. Kötücül baytlar KOD İÇİNDE üretilir (helpers.ts), depoya fixture
 * olarak KONMAZ. Yüklenen zararsız dosyalar `e2e-` önekli (rapora listelendi).
 */

const M = "tradehub_core.api.seller_media";

test.describe("T-141 · satıcı medya konsolu — yükleme güvenliği (canlı)", () => {
  // ── Senaryo 1 ──────────────────────────────────────────────────────────
  // "Satıcı 1000×1000 altı görsel yükler → reddedilir, düzeltici yönlendirme."
  //
  // ETİKET: KOŞUYOR (UI — W5 kablolaması sonrası; skip 2026-08-20'de kaldırıldı).
  // `MediaUploader.vue` artık kütüphanenin "Yükle" düğmesine bağlı
  // (MediaLibraryView → MediaModal → MediaUploader, slot=product.image,
  // min_short_edge=1000). Bu test CANLI panelde ölçer:
  //   · 900×900 PNG kuyruğa alınır alınmaz istemci ön kontrolünde ENGELLENİR
  //     (`short_edge_too_small`), satır blocked durumunda kalır;
  //   · düzeltici yönlendirme görünür: ölçülen (900), gereken (1000) ve
  //     düzeltme yolu — yalnız "geçersiz dosya" değil;
  //   · yükleme uçlarına TEK BAYT gitmez ve dosya kütüphaneye GİRMEZ
  //     (sunucudan doğrulanır).
  // Sunucu yarısı (upload_media'nın slot politikası kapısı) W7 ile geldi
  // (rapor 86) — S1b artık gerçek 417'yi ölçen NORMAL bir test.
  test("[FR-015][FR-062] S1 — 1000×1000 altı görsel reddedilir ve düzeltici yönlendirme gösterilir", async ({
    page,
    request,
  }) => {
    const dosyaAdi = e2eName("under-1000-ui", "png");

    // Yükleme uçlarına istek ÇIKMAMALI — ağ trafiğinden sayılır.
    let uploadIstekleri = 0;
    page.on("request", (r) => {
      if (/upload_media|upload_begin|upload_chunk/.test(r.url())) uploadIstekleri += 1;
    });

    await page.goto("media-library", { waitUntil: "networkidle" });

    // Taze profilde bölüm tanıtım turu (GuidedTour, z-9999) kendiliğinden
    // açılıp tüm tıklamaları kilitliyor — varsa atla (ölçülen davranış).
    const turAtla = page.locator(".z-\\[9999\\] button", { hasText: "✕" });
    await turAtla.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
    if (await turAtla.isVisible().catch(() => false)) await turAtla.click();

    // Başlıktaki "Yükle" (tek birincil düğme) T-091 yükleyici modalını açar.
    await page.locator(".mpage__actions .hdr-btn-primary").click();
    const dropInput = page.locator(".up-drop__input");
    await dropInput.waitFor({ state: "attached", timeout: 15000 });

    await dropInput.setInputFiles({
      name: dosyaAdi,
      mimeType: "image/png",
      buffer: makePng(900, 900),
    });

    // İstemci kapısı: satır BLOCKED kalır; engellenen satırda ön kontrol
    // paneli kendiliğinden açık (UploadQueueRow davranışı).
    await expect(page.locator(".up-row--blocked")).toBeVisible({ timeout: 20000 });
    const sebep = page.locator(".up-pf__reason").first();
    // Düzeltici yönlendirme ölçüyü VE gerekeni söylüyor ("geçersiz dosya" değil).
    await expect(sebep).toContainText("900");
    await expect(sebep).toContainText("1000");
    await expect(page.locator(".up-pf__fix").first()).toContainText("1000");

    // Tek bayt gitmedi.
    expect(uploadIstekleri).toBe(0);

    // Kütüphaneye girmedi — sunucudan doğrula (ekran değil, kayıt).
    const liste = await callGet(request, `${M}.get_my_media`, {
      search: dosyaAdi,
      page: "1",
      page_size: "10",
    });
    expect(liste.status).toBe(200);
    expect((liste.message as { total?: number }).total).toBe(0);
  });

  // S1'in SUNUCU yarısı — İŞARET ÇEVRİLDİ (2026-08-20, W7 · rapor 86).
  // Bu test `test.fail` idi: "upload_media boyut denetlemiyor" (rapor 75 ·
  // Bulgu 1) iddiası gevşetilmeden görünür tutuluyordu. Kapı sunucuya eklendi
  // (`upload_policy.check_slot` → politika motoru); tam bu dosyanın istediği
  // gibi gövde geçmeye başladı ve işaret kaldırıldı — sahte yeşil yok, gerçek
  // yeşil var. Çağrıya `slot: "product.image"` eklendi: sunucu hangi slot
  // politikasını uygulayacağını ancak istemcinin beyanından bilebilir
  // (MediaUploader.vue da aynı slotu kullanıyor); slot'suz yükleme genel
  // kütüphane yolu olarak eski davranışında kaldı (S10/4 onu ölçüyor).
  test("[FR-015] S1b — sunucu kapısı: upload_media 1000×1000 altını reddediyor (W7)", async ({
    request,
  }) => {
    const dosyaAdi = e2eName("under-1000-api", "png");
    const res = await call(request, `${M}.upload_media`, {
      file_name: dosyaAdi,
      content: toBase64(makePng(900, 900)),
      slot: "product.image",
    });

    // REGRESYON hâlinde (kapı düşer, 200 döner) iz bırakmamak için iddiadan
    // ÖNCE temizlenir (arşivle → kalıcı sil; purge yalnız arşivden çalışır).
    const fileUrl = (res.message as { file_url?: string })?.file_url;
    if (res.status === 200 && fileUrl) {
      await call(request, `${M}.archive_media`, { file_urls: [fileUrl] });
      await call(request, `${M}.purge_media`, { file_urls: [fileUrl] });
    }

    expect(res.status).toBe(417);
    expect(res.uploadError).toBe("product_image_short_edge_too_small");
  });

  // ── Senaryo 10 ─────────────────────────────────────────────────────────
  // "Kötücül dosya (bomb/polyglot/SVG-XSS) → reddedilir, worker sağlam."
  //
  // ETİKET: KOŞUYOR (sunucu reddi ölçülüyor — gerçek 417 yanıtları).
  // Üç ayrı kötücül girdi + reddin ardından NORMAL yüklemenin başarısı ("worker
  // sağlam" iddiasının ölçülebilir hâli). Kötücül baytlar kodda üretiliyor.
  test("[FR-011][FR-014] S10 — bomb / polyglot / SVG-XSS reddedilir ve worker ayakta kalır", async ({
    request,
  }) => {
    // 1) Dekompresyon bombası → piksel tavanında reddedilir.
    const bomb = await call(request, `${M}.upload_media`, {
      file_name: e2eName("bomb", "png"),
      content: toBase64(makeBombPng()),
    });
    expect(bomb.status).toBe(417);
    expect(bomb.uploadError).toBe("upload_image_bomb");

    // 2) Polyglot (JPEG başlıklı HTML) → içerik kapısında reddedilir.
    const poly = await call(request, `${M}.upload_media`, {
      file_name: e2eName("polyglot", "jpg"),
      content: toBase64(makePolyglotJpeg()),
    });
    expect(poly.status).toBe(417);
    // JPEG başlığı var ama görsel gövdesi yok → "eksik/eklenmiş içerik" kapısı.
    expect(poly.uploadError).toMatch(/upload_content_(truncated|appended|dangerous)/);

    // 3) SVG-XSS (adı .png, içi çalıştırılabilir SVG) → hiç kabul edilmez.
    const svg = await call(request, `${M}.upload_media`, {
      file_name: e2eName("xss", "png"),
      content: toBase64(makeSvgXss()),
    });
    expect(svg.status).toBe(417);
    expect(svg.uploadError).toBe("upload_content_dangerous");

    // 4) Reddin ARDINDAN normal yükleme başarılı olmalı — worker sağlam.
    const ok = await call(request, `${M}.upload_media`, {
      file_name: e2eName("after-malicious", "png"),
      content: toBase64(makePng(32, 32)),
    });
    expect(ok.status).toBe(200);
    const msg = ok.message as { file_url?: string };
    expect(msg.file_url).toBeTruthy();
  });
});
