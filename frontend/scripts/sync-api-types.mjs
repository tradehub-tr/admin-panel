/**
 * OpenAPI sözleşmesinden panel tiplerini üretir — W6 / T-080+T-085'in SDK ayağı.
 *
 * Kaynak: `tradehub_core/docs/api/openapi-http.yaml` — GERÇEK HTTP yüzeyi
 * (`@frappe.whitelist()` uçları, `/api/method/…`). `docs/api/openapi.yaml`
 * BİLİNÇLİ olarak kullanılmıyor: o belge saf Python kütüphane katmanını anlatır
 * ve oradaki `/api/media/v1/...` yollarına HTTP isteği atılamaz (belgenin kendi
 * `x-layer-note`u). Panel yalnız çağırabildiği yüzeyin tipini taşımalı.
 *
 * Desen `sync-crop-geometry.mjs` ile aynı: kaynak depo build ortamında
 * görünmez (Docker imajına yalnız `admin-panel/frontend` girer), bu yüzden
 * üretilen tip dosyası depoya girer ve sha256 zinciri `api.manifest.json`da
 * durur. `--check` kaynağla üretimin ayrışmadığını doğrular; kaynak depo
 * ortamda yoksa "ÖLÇÜLMEDİ" der, "geçti" demez.
 *
 * Zincir: openapi-http.yaml → sha256 → openapi-typescript → types.gen.ts → sha256.
 *
 * Kullanım:
 *   node scripts/sync-api-types.mjs           # üret + manifest yaz
 *   node scripts/sync-api-types.mjs --check   # yalnız doğrula (CI)
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import openapiTS, { astToString } from "openapi-typescript";
import { transformWithEsbuild, version as viteVersion } from "vite";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, "..");
const OUT_DIR = join(FRONTEND, "src/lib/api");
const OUT_TYPES = join(OUT_DIR, "types.gen.ts");
const OUT_CLIENT_TS = join(OUT_DIR, "client.ts");
const OUT_CLIENT_JS = join(OUT_DIR, "client.js");
const OUT_ERRORS = join(OUT_DIR, "error-catalog.gen.json");
const OUT_MANIFEST = join(OUT_DIR, "api.manifest.json");

/** İstoç çalışma alanı kökü: admin-panel/frontend → admin-panel → istoc */
const SOURCE = resolve(FRONTEND, "../../tradehub_core/docs/api/openapi-http.yaml");
const SOURCE_REL = "tradehub_core/docs/api/openapi-http.yaml";
const SOURCE_ERRORS = resolve(FRONTEND, "../../tradehub_core/docs/api/error-catalog.json");
const SOURCE_ERRORS_REL = "tradehub_core/docs/api/error-catalog.json";

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

if (!existsSync(SOURCE)) {
  console.error(`[sync-api-types] kaynak sözleşme yok: ${SOURCE}`);
  console.error("[sync-api-types] ÖLÇÜLMEDİ — types.gen.ts olduğu gibi bırakıldı.");
  process.exit(checkOnly ? 0 : 1);
}
if (!existsSync(SOURCE_ERRORS)) {
  console.error(`[sync-api-types] hata kataloğu yok: ${SOURCE_ERRORS}`);
  process.exit(1);
}

const raw = readFileSync(SOURCE);
const sourceSha = sha256(raw);
const errorsRaw = readFileSync(SOURCE_ERRORS);
const errorsSourceSha = sha256(errorsRaw);
const errorsDocument = JSON.parse(errorsRaw.toString("utf8"));
if (!Array.isArray(errorsDocument.codes) || !errorsDocument.codes.length) {
  throw new Error("error-catalog.json kod listesi boş");
}
const errorsCode = `${JSON.stringify(errorsDocument, null, 2)}\n`;

if (!existsSync(OUT_CLIENT_TS)) {
  throw new Error(`tipli istemci kaynağı yok: ${OUT_CLIENT_TS}`);
}
const clientTsRaw = readFileSync(OUT_CLIENT_TS);
const clientTsSha = sha256(clientTsRaw);
const clientJsResult = await transformWithEsbuild(clientTsRaw.toString("utf8"), "client.ts", {
  loader: "ts",
  target: "esnext",
  format: "esm",
  minify: false,
  sourcemap: false,
});
const clientJsCode =
  "// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: src/lib/api/client.ts (tipleri silinmiş hâli).\n" +
  "// Yeniden üret: npm run sync:api · Doğrula: npm run sync:api:check\n" +
  clientJsResult.code;

/** openapi-typescript sürümü — manifest'e yazılır; sürüm değişince çıktı kayabilir. */
const otsVersion = JSON.parse(
  readFileSync(join(FRONTEND, "node_modules/openapi-typescript/package.json"), "utf8")
).version;

const ast = await openapiTS(pathToFileURL(SOURCE), {
  // Sözleşme 3.1; `null` tipleri `type: ["number","null"]` biçiminde geliyor.
  // Varsayılanlar yeterli — bayrak eklemeden önce çıktıyı ölçtük.
});
const banner =
  "// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: tradehub_core/docs/api/openapi-http.yaml\n" +
  `// Kaynak sha256: ${sourceSha}\n` +
  `// Üretici: openapi-typescript@${otsVersion} (scripts/sync-api-types.mjs)\n` +
  "// Yeniden üret: npm run sync:api · Doğrula: npm run sync:api:check\n";
const code = banner + astToString(ast);

const manifest = {
  schema_version: "1.0.0",
  gorev: "W6 — T-080/T-084/T-085 SDK ayağı",
  aciklama:
    "types.gen.ts, tradehub_core'un GERÇEK HTTP sözleşmesinden üretilmiştir. ELLE DÜZENLEME. " +
    "Sözleşmeyi değiştir (scripts/gen_http_openapi.py), yeniden üret, sonra burada senkronla.",
  uretici: `admin-panel/frontend/scripts/sync-api-types.mjs + openapi-typescript@${otsVersion}`,
  kaynaklar: {
    [SOURCE_REL]: sourceSha,
    [SOURCE_ERRORS_REL]: errorsSourceSha,
    "admin-panel/frontend/src/lib/api/client.ts": clientTsSha,
  },
  turetilmis: {
    "src/lib/api/types.gen.ts": {
      kaynak: SOURCE_REL,
      kaynak_sha256: sourceSha,
      sha256: sha256(Buffer.from(code)),
    },
    "src/lib/api/error-catalog.gen.json": {
      kaynak: SOURCE_ERRORS_REL,
      kaynak_sha256: errorsSourceSha,
      sha256: sha256(Buffer.from(errorsCode)),
    },
    "src/lib/api/client.js": {
      kaynak: "admin-panel/frontend/src/lib/api/client.ts",
      kaynak_sha256: clientTsSha,
      sha256: sha256(Buffer.from(clientJsCode)),
      uretici: `vite@${viteVersion} transformWithEsbuild(loader=ts, target=esnext, format=esm)`,
    },
  },
};

let drift = 0;
const current = existsSync(OUT_TYPES) ? readFileSync(OUT_TYPES, "utf8") : null;
if (current !== code) {
  drift += 1;
  if (checkOnly) console.error("[sync-api-types] AYRIŞMA: types.gen.ts (yeniden üretim gerekli)");
  else {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_TYPES, code);
    console.log(`[sync-api-types] yazıldı: ${OUT_TYPES}`);
  }
}

const currentErrors = existsSync(OUT_ERRORS) ? readFileSync(OUT_ERRORS, "utf8") : null;
if (currentErrors !== errorsCode) {
  drift += 1;
  if (checkOnly) console.error("[sync-api-types] AYRIŞMA: error-catalog.gen.json");
  else {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_ERRORS, errorsCode);
    console.log(`[sync-api-types] yazıldı: ${OUT_ERRORS}`);
  }
}

const currentClientJs = existsSync(OUT_CLIENT_JS) ? readFileSync(OUT_CLIENT_JS, "utf8") : null;
if (currentClientJs !== clientJsCode) {
  drift += 1;
  if (checkOnly) console.error("[sync-api-types] AYRIŞMA: client.js");
  else {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_CLIENT_JS, clientJsCode);
    console.log(`[sync-api-types] yazıldı: ${OUT_CLIENT_JS}`);
  }
}

const currentManifest = existsSync(OUT_MANIFEST) ? readFileSync(OUT_MANIFEST, "utf8") : null;
const manifestText = `${JSON.stringify(manifest, null, "\t")}\n`;
if (currentManifest !== manifestText) {
  drift += 1;
  if (checkOnly) console.error("[sync-api-types] AYRIŞMA: api.manifest.json");
  else {
    writeFileSync(OUT_MANIFEST, manifestText);
    console.log("[sync-api-types] manifest güncellendi.");
  }
}

if (checkOnly) {
  if (drift) {
    console.error(`[sync-api-types] ${drift} dosya ayrışmış — \`npm run sync:api\` koşulmalı.`);
    process.exit(1);
  }
  console.log("[sync-api-types] temiz.");
} else if (!drift) {
  console.log("[sync-api-types] değişiklik yok — dosyalar zaten güncel.");
}
