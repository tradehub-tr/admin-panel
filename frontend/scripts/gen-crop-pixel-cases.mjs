/**
 * UI ↔ sunucu **piksel** paritesi — 1. adım: panelin gördüğü kutuyu üret.
 *
 * ## Neden ayrı bir ölçüm — T-100'ün ölçtüğü şey bu DEĞİLDİ
 *
 * `cropGeometryParity.test.js` **geometri hesabı** paritesini ölçer: aynı
 * girdilerle `crop_geometry.ts` ile `crop_geometry.py` aynı sayıyı üretiyor mu
 * (592 vektör, 0 px). Bu, iki dilin aynı fonksiyonu aynı yazdığının kanıtıdır.
 *
 * T-105'in istediği ise başka bir şeydir: **kullanıcının ekranda gördüğü kadraj
 * ile sunucunun gerçekten keseceği kutu aynı mı.** Aradaki fark üç yerden
 * doğabilir ve hiçbiri geometri vektörlerinde görünmez:
 *
 *   1. Panel kadrajı KAYDETMEZ, odağı kaydeder (INV-10). Sunucu o odaktan
 *      pencereyi YENİDEN kurar — `core/crop.py`'nin 5 seviyeli zinciriyle,
 *      `crop_geometry` ile değil.
 *   2. Yuvarlama iki tarafta farklı yazılmıştır: panel kaynak pikselinde
 *      `floor(v + 0.5)` (yarım YUKARI), sunucu normalize koordinatta
 *      `int(round(v))` (Python'da yarım ÇİFTE). Aynı sayı değildir.
 *   3. Yük `focal_x`i 6 basamağa yuvarlar. 72 MP bir kaynakta 1e-6 ≈ 0,009 px;
 *      yuvarlama sınırına denk gelirse 1 px'e büyür.
 *
 * Bu script paneli GERÇEKTEN koşturur (`useCropStudio` composable'ının kendisi,
 * yeniden yazılmış bir kopyası değil), jest dizilerini oynatır ve her vaka için
 * üç şeyi kaydeder: son durum, sunucuya gidecek yük (`savePayload`) ve
 * kullanıcının gördüğü kutu (`pixelBox`).
 *
 * 2. adım `scripts/gen_crop_pixel_vectors.py`: aynı yükü `core/crop.py`'ye
 * verir, sunucunun kutusunu yazar. 3. adım `__tests__/cropPixelParity.test.js`:
 * paneli canlı yeniden koşturup iki kutuyu karşılaştırır.
 *
 * Kullanım:
 *   node scripts/gen-crop-pixel-cases.mjs
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, "..");
const OUT = join(FRONTEND, "src/lib/media/crop/vendor/crop_pixel_cases.json");

/**
 * Tohumlu PRNG. `Math.random` kullanılmıyor: vaka dosyası ile testin canlı
 * yeniden üretimi BİREBİR aynı jestleri oynatmalı, yoksa "eskimiş fixture" ile
 * "gerçek ayrışma" birbirinden ayırt edilemez.
 */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Kaynak boyutları — ölçülmüş uçlar dahil (p99 29,21 MP, MAX 72,71 MP). */
export const SOURCES = [
  { width: 4000, height: 3000 }, // yaygın DSLR
  { width: 1920, height: 1080 }, // tam 16:9
  { width: 1000, height: 563 }, // profilin kendi boyutu
  { width: 1120, height: 1120 }, // kare (V0004 ailesi)
  { width: 1237, height: 911 }, // asal-ish, hiçbir orana oturmaz
  { width: 901, height: 1601 }, // portre, tek sayı
  { width: 8688, height: 8368 }, // 72,71 MP — ölçülen MAX
  { width: 200, height: 150 }, // profil genişliğinin altında (engel vakası)
  { width: 3, height: 2 }, // dejenere: yuvarlama burada acımasız
];

export const SLOTS = ["company.cover_image", "company.cover_video"];

/**
 * Vaka sınıfları. Parite tek bir sayı DEĞİLDİR — hangi yolun ölçüldüğü
 * söylenmezse rakam yalan söyler.
 *
 *   A  kilitli oran, zoom = 1        → kanonik INV-10 yolu (odak → pencere)
 *   B  kilitli oran, zoom > 1        → zoom + merkez artık yükte (T-105 B/C/E);
 *                                      sunucu tabanı zoom_region_of ile yeniden kurar
 *   C  serbest kırpma + override     → zincirin 1. seviyesi
 *   D  kilitli oran + override       → 1. seviye, oran zorlamalı
 *   E  serbest kırpma, override yok  → panel taban bölgeyi gösterir, sunucu orana kırpar
 */
export const CLASSES = ["A", "B", "C", "D", "E"];

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** Bir vakanın jest dizisi — testte BİREBİR yeniden oynatılır. */
function gestures(rnd, sinif) {
  const g = [];
  const focal = () => ["dragFocal", Number(rnd().toFixed(6)), Number(rnd().toFixed(6))];
  switch (sinif) {
    case "A":
      g.push(["setRatioOption", 0], focal());
      break;
    case "B":
      g.push(["setRatioOption", 0], focal(), ["setZoom", Number((1 + rnd() * 7).toFixed(4))]);
      if (rnd() < 0.5)
        g.push(["pan", Math.round((rnd() - 0.5) * 400), Math.round((rnd() - 0.5) * 400)]);
      break;
    case "C":
      g.push(["setRatio", null], focal(), [
        "dragHandle",
        HANDLES[Math.floor(rnd() * HANDLES.length)],
        Math.round((rnd() - 0.5) * 800),
        Math.round((rnd() - 0.5) * 800),
      ]);
      break;
    case "D":
      g.push(
        ["setRatio", null],
        [
          "dragHandle",
          HANDLES[Math.floor(rnd() * HANDLES.length)],
          Math.round((rnd() - 0.5) * 800),
          Math.round((rnd() - 0.5) * 800),
        ],
        ["setRatioOption", 0],
        focal()
      );
      break;
    default:
      g.push(["setRatio", null], focal());
  }
  return g;
}

/**
 * Jestleri oynat. Testin canlı koşumu bu fonksiyonun **aynısını** kullanır;
 * ikinci bir oynatıcı yazmak, ikisinin ayrışması demektir.
 */
export function replay(studio, gestureList) {
  for (const [op, a, b, c] of gestureList) {
    if (op === "setRatioOption") studio.setRatio(studio.options[a]?.targetAR ?? null);
    else if (op === "setRatio") studio.setRatio(a);
    else if (op === "dragFocal") studio.dragFocal(a, b);
    else if (op === "setZoom") studio.setZoom(a);
    else if (op === "pan") studio.pan(a, b);
    else if (op === "dragHandle") studio.dragHandle(a, b, c);
    else throw new Error(`bilinmeyen jest: ${op}`);
  }
}

/**
 * Sunucunun bu vakada hangi profili çözeceği. Override varsa o satırın
 * profili; yoksa kilitli orana karşılık gelen profil; kilit yoksa slotun ilk
 * kırpılabilir profili (E sınıfı — panel ile sunucunun ayrıştığı yer tam da bu).
 */
export function chooseProfile(studio, profiles) {
  const payload = studio.savePayload.value;
  const ovr = payload?.overrides?.[0]?.profile;
  if (ovr) {
    const p = profiles.find((x) => x.name === ovr);
    if (p) return p;
  }
  const ar = studio.lockedAR.value;
  if (ar !== null && ar !== undefined) {
    const p = profiles.find((x) => x.croppable && Math.abs(x.targetAR - ar) < 1e-12);
    if (p) return p;
  }
  return profiles.find((x) => x.croppable) || null;
}

export function buildCases({ useCropStudio, slotProfiles }, adet = 120) {
  const cases = [];
  let id = 0;
  for (const sinif of CLASSES) {
    const rnd = mulberry32(0x7100 + sinif.charCodeAt(0));
    for (let i = 0; i < adet; i += 1) {
      const source = SOURCES[i % SOURCES.length];
      const slotKey = SLOTS[Math.floor(rnd() * SLOTS.length)];
      const profiles = slotProfiles(slotKey);
      const g = gestures(rnd, sinif);
      const studio = useCropStudio({ source, slotKey });
      replay(studio, g);
      const profile = chooseProfile(studio, profiles);
      if (!profile || !studio.pixelBox.value || !studio.savePayload.value) continue;
      id += 1;
      cases.push({
        id: `P${String(id).padStart(4, "0")}`,
        sinif,
        slot_key: slotKey,
        source,
        gestures: g,
        profile: {
          profile_key: profile.name,
          width: profile.width,
          height: profile.height,
          fit: profile.fit,
          // Bulgu 1: sunucuya SAYI verilir, "16:9" etiketi değil.
          aspect_ratio_value: profile.croppable ? profile.width / profile.height : null,
        },
        payload: studio.savePayload.value,
        panel_box: studio.pixelBox.value,
      });
    }
  }
  return cases;
}

/** Vaka dosyasının kimliği — sunucu vektörleri buna zincirlenir. */
export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** Tek satır bir vaka: dosya üretilmiş olsa da insan gözüyle okunabilsin. */
export function serialize(data) {
  const { cases, ...head } = data;
  const govde = cases.map((c) => `\t\t${JSON.stringify(c)}`).join(",\n");
  const bas = JSON.stringify(head, null, "\t").replace(/\n}$/, "");
  return `${bas},\n\t"cases": [\n${govde}\n\t]\n}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = await createServer({
    configFile: false,
    root: FRONTEND,
    logLevel: "silent",
    resolve: { alias: { "@": `${FRONTEND}/src` } },
    server: { middlewareMode: true },
    appType: "custom",
  });
  const { useCropStudio } = await server.ssrLoadModule("/src/composables/useCropStudio.js");
  const { slotProfiles } = await server.ssrLoadModule("/src/lib/media/crop/slotProfiles.js");

  const cases = buildCases({ useCropStudio, slotProfiles });
  const metin = serialize({
    schema_version: "1.0.0",
    gorev: "T-105 · UI ↔ sunucu piksel paritesi (1/3)",
    uretici: "admin-panel/frontend/scripts/gen-crop-pixel-cases.mjs",
    aciklama:
      "ÜRETİLMİŞ DOSYA — elle düzenleme. Panelin GERÇEK useCropStudio'su koşturularak üretildi. " +
      "Yeniden üret: node scripts/gen-crop-pixel-cases.mjs, sonra python3 scripts/gen_crop_pixel_vectors.py",
    siniflar: {
      A: "kilitli oran, zoom=1 — kanonik odak yolu",
      B: "kilitli oran, zoom>1 — zoom+merkez yükte, sunucu tabanı yeniden kurar",
      C: "serbest kırpma + override",
      D: "kilitli oran + override",
      E: "serbest kırpma, override yok",
    },
    uretim_tarihi: new Date().toISOString().slice(0, 10),
    adet: cases.length,
    cases,
  });
  writeFileSync(OUT, metin);
  console.log(`[gen-crop-pixel-cases] ${cases.length} vaka → ${OUT}`);
  console.log(`[gen-crop-pixel-cases] sha256 = ${sha256(metin)}`);
  await server.close();
}
