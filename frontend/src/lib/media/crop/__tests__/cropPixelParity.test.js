import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import { createServer } from "vite";

import { chooseProfile, replay } from "../../../../../scripts/gen-crop-pixel-cases.mjs";

/**
 * UI ↔ sunucu **piksel** paritesi — 3/3.
 *
 *   ÖLÇÜLÜR  — kullanıcının ekranda gördüğü kutu (`useCropStudio.pixelBox`,
 *              composable'ın kendisi koşturularak) ile sunucunun aynı yükten
 *              üreteceği kutu (`core/crop.py::resolve_crop().to_pixels()`)
 *              600 vakada karşılaştırılır.
 *   ÖLÇÜLMEZ — sunucunun ürettiği GÖRSELİN pikselleri. Bu ölçüm kadraj
 *              KUTUSUNU karşılaştırır; Pillow'un yeniden örnekleme çıktısını,
 *              renk profilini ya da tarayıcıdaki çizimi DEĞİL. Onun için
 *              gerçek render + görsel karşılaştırma gerekir ve bu depodan
 *              koşturulamaz.
 *
 * ### Bu, T-100'ün ölçtüğü parite DEĞİLDİR
 *
 * `cropGeometryParity.test.js` **geometri hesabı** paritesini ölçer: aynı
 * girdiyle `crop_geometry.ts` ile `crop_geometry.py` aynı sayıyı veriyor mu
 * (592 vektör, 0 px). Buradaki soru başka: panel kadrajı değil ODAĞI kaydeder
 * (INV-10), sunucu pencereyi o odaktan `core/crop.py`'nin beş seviyeli
 * zinciriyle YENİDEN kurar ve tam piksele BAŞKA bir uzayda, başka bir ifadeyle
 * yuvarlar. İki ölçüm birbirinin yerine geçmez.
 *
 * ### Vaka sınıfları — tek bir "parite yüzdesi" yalan söylerdi
 *
 * Beklentiler AŞAĞIDA sabitlenmiştir ve **ölçülmüş** değerlerdir, hedef değil.
 * Bir sayı değişirse (iyileşme de olsa) yeniden bakılmalıdır; sessizce kaymamalı.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const VENDOR = join(HERE, "../vendor");
const FRONTEND = join(HERE, "../../../../..");
const CORE = join(FRONTEND, "../../tradehub_core/tradehub_core");
const CROP_PY = join(CORE, "media/pipeline/core/crop.py");

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const casesRaw = readFileSync(join(VENDOR, "crop_pixel_cases.json"));
const cases = JSON.parse(casesRaw.toString("utf8"));
const vectors = JSON.parse(readFileSync(join(VENDOR, "crop_pixel_vectors.json"), "utf8"));
const byId = new Map(vectors.vectors.map((v) => [v.id, v]));

/**
 * Ölçülen sapmalar. `sapan` = panel kutusu ile sunucu kutusunun en az bir
 * kenarı farklı olan vaka sayısı; `enBuyuk` = kenar başına en büyük fark (px).
 */
const BEKLENEN = {
  // Kanonik yol: oran kilitli, zoom yok, kullanıcı yalnız odağı taşımış.
  // 5 vaka 1 px sapıyor — yuvarlama İFADESİ iki tarafta farklı yazılmış:
  // panel kaynak pikselinde floor(v+0.5) (yarım YUKARI), sunucu normalize
  // uzayda int(round(v)) (Python'da yarım ÇİFTE). 200×150 kaynakta 16:9
  // penceresi tam 112,5 px yüksekliğe düşer ve iki kural ayrılır.
  A: { adet: 120, sapan: 5, enBuyuk: 1 },
  // Zoom + merkez ARTIK YÜKTE (T-105 B/C/E): `savePayload` zoom üçlüsünü
  // taşıyor, sunucu taban bölgeyi `core/crop.py::zoom_region_of` ile birebir
  // yeniden kuruyor. Eski ölçüm 119/120 sapan, 7391 px'e kadar; şimdi kalan
  // 3 vaka 1 px — A sınıfıyla aynı yuvarlama-ifadesi sınıfı (yarım piksel)
  // + 3×2 dejenere kaynakta MIN_EDGE_PX tabanının yarım-piksel konumu.
  B: { adet: 120, sapan: 3, enBuyuk: 1 },
  // Serbest kırpma + override: sunucu override'ı profilin oranına ZORLAR
  // (`_fit_ratio_keeping_center`, T-041 "pencere istenen orana tam uyuyor"),
  // panel kullanıcının çizdiği serbest dikdörtgeni olduğu gibi gösterir.
  // ÖLÇÜLDÜ (2026-08-20): sapan 104 vakanın 104'ünde sunucu kutusu profil
  // oranını tutuyor; 101'inde panel kutusunun oranı profile hiç uymuyor,
  // kalan 3'ü 1920×1080'in 1000×563 profil oranından %0,09 farkı (2 px).
  // Bu bir kayıt kaybı DEĞİL, bilinçli politika — tolerans gevşetilmedi,
  // sayı olduğu gibi sabitlendi.
  C: { adet: 120, sapan: 104, enBuyuk: 3704 },
  // Kilitli oran + override: oran zaten uyduğu için yalnız yuvarlama kalıyor.
  D: { adet: 120, sapan: 7, enBuyuk: 1 },
  // Serbest kırpma, override YOK: panel taban bölgeyi gösterir, sunucu
  // profilin oranına kırpar. C ile aynı mekanizma (ölçüldü: 86/86 sunucu
  // profil oranında; 79 serbest oran + 7 kaynak-profil oran farkı, 2 px).
  E: { adet: 120, sapan: 86, enBuyuk: 3481 },
};

let server;
let useCropStudio;
let slotProfiles;

before(async () => {
  // `useCropStudio` `@/` alias'ı kullanıyor; parite ölçümü composable'ın
  // KENDİSİNİ koşturmalı — yeniden yazılmış bir kopya, ölçtüğünü sanan bir
  // ölçüm olurdu.
  server = await createServer({
    configFile: false,
    root: FRONTEND,
    logLevel: "silent",
    resolve: { alias: { "@": `${FRONTEND}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ useCropStudio } = await server.ssrLoadModule("/src/composables/useCropStudio.js"));
  ({ slotProfiles } = await server.ssrLoadModule("/src/lib/media/crop/slotProfiles.js"));
});

after(async () => {
  await server?.close();
});

// ── 1. Zincir: vaka dosyası ↔ vektör dosyası ↔ canlı kaynak ───────

test("sunucu vektörleri bu vaka dosyasından üretilmiş", () => {
  assert.equal(
    sha256(casesRaw),
    vectors.cases_sha256,
    "vaka dosyası değişmiş, vektörler eski — python3 scripts/gen_crop_pixel_vectors.py"
  );
});

test("vektörler canlı core/crop.py ile aynı sürümden", (t) => {
  if (!existsSync(CROP_PY)) {
    t.skip("ÖLÇÜLMEDİ: tradehub_core bu ortamda yok — sunucu kaynağı doğrulanamadı");
    return;
  }
  assert.equal(
    sha256(readFileSync(CROP_PY)),
    vectors.kaynak_sha256,
    "core/crop.py değişmiş — piksel paritesi YENİDEN ölçülmeli"
  );
});

// ── 2. Panel tarafı canlı yeniden üretiliyor mu ───────────────────

test("600 vakanın tamamı canlı useCropStudio ile birebir yeniden üretiliyor", () => {
  let ilk = null;
  for (const c of cases.cases) {
    const studio = useCropStudio({ source: c.source, slotKey: c.slot_key });
    replay(studio, c.gestures);
    const box = studio.pixelBox.value;
    const payload = studio.savePayload.value;
    const profile = chooseProfile(studio, slotProfiles(c.slot_key));
    if (
      ilk === null &&
      (JSON.stringify(box) !== JSON.stringify(c.panel_box) ||
        JSON.stringify(payload) !== JSON.stringify(c.payload) ||
        profile?.name !== c.profile.profile_key)
    ) {
      ilk = `${c.id}: panel=${JSON.stringify(box)} kayıt=${JSON.stringify(c.panel_box)}`;
    }
  }
  assert.equal(
    ilk,
    null,
    "Crop Studio davranışı değişmiş, fixture eskimiş — ÖLÇÜM GEÇERSİZ. " +
      "Yeniden üret: node scripts/gen-crop-pixel-cases.mjs && python3 scripts/gen_crop_pixel_vectors.py " +
      `(ilk sapan: ${ilk})`
  );
});

// ── 3. Piksel paritesi — sınıf sınıf ──────────────────────────────

function olc(sinif) {
  let sapan = 0;
  let enBuyuk = 0;
  let adet = 0;
  let enKotu = null;
  for (const c of cases.cases) {
    if (c.sinif !== sinif) continue;
    adet += 1;
    const v = byId.get(c.id);
    assert.ok(v, `${c.id} için sunucu vektörü yok`);
    assert.ok(!v.error, `${c.id} sunucuda hata verdi: ${v.error}`);
    let d = 0;
    for (let i = 0; i < 4; i += 1) d = Math.max(d, Math.abs(c.panel_box[i] - v.server_box[i]));
    if (d > 0) sapan += 1;
    if (d > enBuyuk) {
      enBuyuk = d;
      enKotu = `${c.id} ${c.source.width}×${c.source.height} panel=${JSON.stringify(
        c.panel_box
      )} sunucu=${JSON.stringify(v.server_box)} (${v.method})`;
    }
  }
  return { adet, sapan, enBuyuk, enKotu };
}

for (const sinif of Object.keys(BEKLENEN)) {
  test(`${sinif} sınıfı — panel kutusu ↔ sunucu kutusu`, (t) => {
    const o = olc(sinif);
    t.diagnostic(
      `${sinif}: ${o.adet} vaka · sapan ${o.sapan} · en büyük ${o.enBuyuk} px` +
        (o.enKotu ? ` · en kötü ${o.enKotu}` : "")
    );
    assert.deepEqual(
      { adet: o.adet, sapan: o.sapan, enBuyuk: o.enBuyuk },
      BEKLENEN[sinif],
      `${sinif} sınıfında ölçüm değişti — sayıyı güncellemeden önce NEDEN değiştiğini yaz`
    );
  });
}

test("kanonik yolda (A) sapma yalnız yuvarlama ifadesinden geliyor", () => {
  // İddia: A sınıfındaki her sapan vaka, pencere kenarı tam yarım piksele
  // düştüğü için sapıyor. Başka bir sebep varsa bu test onu yakalar.
  for (const c of cases.cases) {
    if (c.sinif !== "A") continue;
    const v = byId.get(c.id);
    let d = 0;
    for (let i = 0; i < 4; i += 1) d = Math.max(d, Math.abs(c.panel_box[i] - v.server_box[i]));
    if (d === 0) continue;
    const yariPiksel = [
      v.norm[0] * c.source.width,
      v.norm[1] * c.source.height,
      v.norm[2] * c.source.width,
      v.norm[3] * c.source.height,
    ].some((px) => Math.abs(px - Math.floor(px) - 0.5) < 1e-9);
    assert.ok(yariPiksel, `${c.id} yarım piksel sınırında değil — sapmanın başka bir sebebi var`);
    assert.ok(d <= 1, `${c.id} yuvarlamadan gelen sapma 1 px'i aşamaz: ${d}`);
  }
});
