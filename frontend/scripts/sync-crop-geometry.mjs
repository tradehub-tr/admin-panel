/**
 * `crop_geometry.ts` ve parite vektörlerini `tradehub_core`'dan panele senkronlar.
 *
 * **Neden kopya, neden elle değil.** Geometrinin tek doğruluk kaynağı
 * `tradehub_core/tradehub_core/media/pipeline/core/crop_geometry.py` ve onun
 * TypeScript ikizidir. Panel o depoyu build zamanında göremez (Docker imajına
 * yalnız `admin-panel/frontend` giriyor), bu yüzden dosya `src/lib/media/crop/vendor/`
 * altında **taşınır**. Elle kopyalanan bir dosya sessizce ayrışır; bu script
 * kaynağın sha256'sını `vendor.manifest.json`'a yazar ve
 * `__tests__/cropGeometryParity.test.js` her koşuda o hash'i yeniden doğrular.
 * Kaynak deposu ortamda yoksa test "ölçülmedi" der, "geçti" demez.
 *
 * `faz10-crop-studio.md §2` iki seçenek sunup "KARAR VERİLMEDİ" diyordu.
 * Seçilen: **(1) build/sync adımı** — bugünkü depo yapısını değiştirmiyor.
 *
 * ## İkiz `.ts`, koşan kopya `.js` — parite kapısı neden derlenmiş kopya kullanıyor
 *
 * İkiz `crop_geometry.ts`tir ve öyle kalır: kaynak deposundaki dosyanın birebir
 * kopyası olmayan bir vendor dosyası paritenin kendisini yalanlar. Ama panelin
 * **koşturduğu** şey ondan türetilmiş `crop_geometry.js`tir. Sebep ölçüldü:
 *
 *     tradehub_core konteyneri · node v20.19.2
 *     node: bad option: --experimental-strip-types
 *
 * Node'un tip soyma özelliği 22.6'da deneysel bayrakla geldi, 22.18'de varsayılan
 * oldu; 20.x'te hiç yok. `geometry.js` doğrudan `.ts` içe aktardığı sürece parite
 * ölçümü "Node sürümü yeterince yeni mi" sorusuna bağlı kalır ve o soru bugün
 * CI'da HAYIR yanıtlıyor — yani parite ölçülmüyor, kapı kırmızı yanıyor.
 *
 * Üç seçenek vardı:
 *   1. `tsx`/`ts-node` bağımlılığı — yeni bir bağımlılık + yeni bir koşucu;
 *      CLAUDE.md kural 11 "yeni dependency: sor" diyor. Bedeli en yüksek olan.
 *   2. Parite testini Vite'ın `ssrLoadModule`'üne taşımak — çalışır, ama kapıyı
 *      bir bundler'a bağlar ve `node --test`in yalın koşumu kaybolur.
 *   3. **Senkron adımında tipleri sil, `.js` üret** — SEÇİLEN. Türetme zaten
 *      kurulu bir bağımlılıkla (Vite'ın `transformWithEsbuild`'i) yapılır, çıktı
 *      sha256 zincirine girer, koşum tarafında hiçbir bayrak/araç gerekmez.
 *      Kapı Node 20'de de 24'te de aynı biçimde koşar.
 *
 * Tip silme **erasable** sözdizimi şartıyla güvenlidir: ikiz `enum`/`namespace`/
 * parametre-özelliği kullanmaz (kaynak dosyanın kendi başlığında yazılı, T-100
 * `tsc --erasableSyntaxOnly` ile temiz ölçmüş). Üretilen `.js` tiplerin silinmiş
 * hâlidir — yeniden yazılmış bir uygulama değil, ikinci bir matematik değil.
 *
 * Zincir: `tradehub_core/.../crop_geometry.ts` → sha256 → `vendor/crop_geometry.ts`
 * → sha256 → `vendor/crop_geometry.js`. Üç halkanın üçü de `vendor.manifest.json`da;
 * `__tests__/cropGeometryParity.test.js` her koşuda üçünü birden doğruluyor.
 *
 * Kullanım:
 *   node scripts/sync-crop-geometry.mjs           # senkronla
 *   node scripts/sync-crop-geometry.mjs --check   # yalnız doğrula (CI)
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { transformWithEsbuild, version as viteVersion } from "vite";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, "..");
const VENDOR = join(FRONTEND, "src/lib/media/crop/vendor");

/** İstoç çalışma alanı kökü: admin-panel/frontend → admin-panel → istoc */
const CORE = resolve(FRONTEND, "../../tradehub_core/tradehub_core");
const SLOTS = join(CORE, "media/pipeline/policy/slots");

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const COPIES = [
  {
    from: join(CORE, "media/pipeline/core/crop_geometry.ts"),
    to: join(VENDOR, "crop_geometry.ts"),
    rel: "tradehub_core/tradehub_core/media/pipeline/core/crop_geometry.ts",
  },
  {
    from: join(CORE, "tests/fixtures/crop_vectors.json"),
    to: join(VENDOR, "crop_vectors.json"),
    rel: "tradehub_core/tradehub_core/tests/fixtures/crop_vectors.json",
  },
];

/**
 * Slot politikalarından **türetilmiş** profil kataloğu.
 *
 * Politika dosyaları 40+ KB ve panelin ihtiyacı olmayan alanlarla dolu
 * (`bound_to`, `sources`, `open_questions`...). Katalog yalnız geometriye
 * dokunan alanları taşır. Kural seti burada YENİDEN YAZILMAZ — kopyalanır;
 * `target_ratio` metni bilgi olarak taşınır ama hedef oran `width/height`'ten
 * hesaplanır (bkz. faz10-crop-studio.md Bulgu 1).
 */
function buildSlotCatalog() {
  const files = readdirSync(SLOTS)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const slots = [];
  const hashes = {};
  for (const file of files) {
    const raw = readFileSync(join(SLOTS, file));
    hashes[`tradehub_core/tradehub_core/media/pipeline/policy/slots/${file}`] = sha256(raw);
    const p = JSON.parse(raw.toString("utf8"));
    slots.push({
      slotKey: p.slot_key,
      title: p.title,
      minShortEdge: p.require?.min_short_edge ?? null,
      maxMegapixelsHard: p.accept?.max_megapixels_hard ?? null,
      profiles: (p.profiles || []).map((pr) => ({
        name: pr.name,
        width: pr.width ?? null,
        height: pr.height ?? null,
        fit: pr.fit ?? null,
        formats: pr.formats || [],
        /** Politikadaki ETİKET. Hedef oran bundan HESAPLANMAZ. */
        ratioLabel: pr.target_ratio ?? null,
        /**
         * Basamağın kabul ettiği en büyük `seçilen / gereken` oranı. Kırpma
         * kullanmaz; önizleme simülatörü (`src/lib/media/simulator/`) "aşırı
         * servis" uyarısını buradan üretir — politikada yazılı, panelde
         * uydurulmuş bir eşik değil.
         */
        maxOvershoot: pr.max_overshoot ?? null,
      })),
    });
  }
  return { slots, hashes };
}

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

if (!existsSync(CORE)) {
  console.error(`[sync-crop-geometry] kaynak depo yok: ${CORE}`);
  console.error("[sync-crop-geometry] ÖLÇÜLMEDİ — vendor/ dosyaları olduğu gibi bırakıldı.");
  process.exit(checkOnly ? 0 : 1);
}

const manifest = {
  schema_version: "1.1.0",
  gorev: "T-101…T-105",
  aciklama:
    "Bu klasördeki dosyalar tradehub_core'dan senkronlanmıştır. ELLE DÜZENLEME. " +
    "Kaynağı değiştir, sonra `node scripts/sync-crop-geometry.mjs` koştur.",
  uretici: "admin-panel/frontend/scripts/sync-crop-geometry.mjs",
  senkron_tarihi: new Date().toISOString().slice(0, 10),
  kaynaklar: {},
};

const { slots, hashes } = buildSlotCatalog();
Object.assign(manifest.kaynaklar, hashes);

let drift = 0;
for (const c of COPIES) {
  const raw = readFileSync(c.from);
  manifest.kaynaklar[c.rel] = sha256(raw);
  const current = existsSync(c.to) ? readFileSync(c.to) : null;
  if (current && current.equals(raw)) continue;
  drift += 1;
  if (checkOnly) {
    console.error(`[sync-crop-geometry] AYRIŞMA: ${c.rel}`);
    continue;
  }
  writeFileSync(c.to, raw);
  console.log(`[sync-crop-geometry] yazıldı: ${c.to}`);
}

/**
 * Tipleri silinmiş ikiz. `geometry.js` BUNU içe aktarır; `.ts` yalnız kanıt
 * olarak durur. Bkz. dosya başlığı — kapı Node'un tip soyma desteğine bağlı
 * kalmamalı.
 *
 * `transformWithEsbuild` yalnız tip sözdizimini siler; hedef `esnext` olduğu
 * için hiçbir ifade yeniden yazılmaz (downlevel yok). Parite açısından kritik
 * olan işlem sırası ve `Math.floor(v + 0.5)` ifadesi çıktıda birebir durur —
 * bu iddia da ölçülüyor: `__tests__/cropGeometryParity.test.js` 592 vektörün
 * tamamını üretilen `.js` üzerinden koşturuyor.
 */
async function buildErasedTwin(tsRaw) {
  const src = tsRaw.toString("utf8");
  const out = await transformWithEsbuild(src, "crop_geometry.ts", {
    loader: "ts",
    target: "esnext",
    format: "esm",
    minify: false,
    sourcemap: false,
  });
  const banner =
    "// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: vendor/crop_geometry.ts (tipleri silinmiş hâli).\n" +
    "// Yeniden üret: npm run sync:crop · Doğrula: npm run parity:crop\n";
  return banner + out.code;
}

const tsCopy = COPIES.find((c) => c.to.endsWith("crop_geometry.ts"));
const tsRaw = readFileSync(tsCopy.from);
const erasedPath = join(VENDOR, "crop_geometry.js");
const erased = await buildErasedTwin(tsRaw);
const erasedCurrent = existsSync(erasedPath) ? readFileSync(erasedPath, "utf8") : null;

manifest.turetilmis = {
  "src/lib/media/crop/vendor/crop_geometry.js": {
    kaynak: "src/lib/media/crop/vendor/crop_geometry.ts",
    kaynak_sha256: sha256(tsRaw),
    sha256: sha256(Buffer.from(erased)),
    uretici: `vite@${viteVersion} transformWithEsbuild(loader=ts, target=esnext, format=esm)`,
    neden: "node 20.x'te --experimental-strip-types yok; parite kapısı tip soymaya bağlı kalmamalı",
  },
};

if (erasedCurrent !== erased) {
  // esbuild sürümü değişirse çıktı bayt bayt kayabilir; bu bir AYRIŞMA değil,
  // yeniden üretim gerekçesidir. `--check` bunu sessizce geçmez ama testin
  // doğruladığı zincir (kaynak sha → .js sha) manifest üzerinden yürür.
  drift += 1;
  if (checkOnly)
    console.error("[sync-crop-geometry] AYRIŞMA: crop_geometry.js (yeniden üretim gerekli)");
  else {
    writeFileSync(erasedPath, erased);
    console.log(`[sync-crop-geometry] yazıldı: ${erasedPath}`);
  }
}

// JSON değil, ES modülü: Node'un `import ... with { type: "json" }` şartı ile
// Vite'ın JSON içe aktarımı aynı sözdiziminde buluşmuyor; testler ve build
// aynı dosyayı ceremonisiz okuyabilsin diye katalog `.js` olarak yazılıyor.
const catalog =
  "// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: tradehub_core/.../policy/slots/*.json\n" +
  "// Yeniden üret: npm run sync:crop\n" +
  `export default ${JSON.stringify({ schema_version: "1.0.0", slots }, null, "\t")};\n`;
const catalogPath = join(VENDOR, "slot_profiles.js");
if (!existsSync(catalogPath) || readFileSync(catalogPath, "utf8") !== catalog) {
  drift += 1;
  if (checkOnly) console.error("[sync-crop-geometry] AYRIŞMA: slot_profiles.js");
  else {
    writeFileSync(catalogPath, catalog);
    console.log(`[sync-crop-geometry] yazıldı: ${catalogPath}`);
  }
}

if (!checkOnly) {
  writeFileSync(join(VENDOR, "vendor.manifest.json"), `${JSON.stringify(manifest, null, "\t")}\n`);
  console.log("[sync-crop-geometry] manifest güncellendi.");
}

if (checkOnly && drift) {
  console.error(`[sync-crop-geometry] ${drift} dosya ayrışmış — senkron koşulmalı.`);
  process.exit(1);
}
