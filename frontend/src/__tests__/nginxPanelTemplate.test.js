// Prod panel nginx template sözleşmesi (HEADLESS-DURUM-RAPORU "yan ürün" #2, #3).
//
// #2: `/files/` ve `/private/files/` proxy'leri prod template'te yoktu (yerel
//     admin-panel-local.conf:37,42'de vardı) — panel içi dosya önizlemeleri
//     prod'da 404 alıyordu. `^~` zorunlu: statik-asset uzantı regex'i
//     (js|png|...) aksi hâlde prefix location'ı gölgeler.
// #3: `https://cdn.tailwindcss.com` CSP izni kalıntıydı — Tailwind artık
//     @tailwindcss/vite ile build'e derleniyor.
//
// `nginx -t` bu ortamda koşulamıyor; sözleşme metin üzerinden denetlenir.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "../..");
const template = readFileSync(join(KOK, "nginx.conf.template"), "utf8");

test("/files/ backend'e proxy'lenir ve statik regex'e ezdirilmez (^~)", () => {
  assert.match(
    template,
    /location \^~ \/files\/ \{[^}]*proxy_pass https:\/\/\$\{BACKEND_DOMAIN\}\/files\/;/,
    "location ^~ /files/ bloğu ${BACKEND_DOMAIN}'e proxy_pass içermeli"
  );
});

test("/private/files/ backend'e proxy'lenir ve statik regex'e ezdirilmez (^~)", () => {
  assert.match(
    template,
    /location \^~ \/private\/files\/ \{[^}]*proxy_pass https:\/\/\$\{BACKEND_DOMAIN\}\/private\/files\/;/,
    "location ^~ /private/files/ bloğu ${BACKEND_DOMAIN}'e proxy_pass içermeli"
  );
});

test("ölü Tailwind CDN izni CSP'ye geri dönmesin", () => {
  assert.ok(
    !template.includes("cdn.tailwindcss.com"),
    "Tailwind build'e derleniyor — CDN izni CSP'de saldırı yüzeyi açar"
  );
});

test("CSP'nin kalanı yerinde: frame-ancestors 'none' + connect-src backend", () => {
  // #3 yalnız Tailwind iznini kaldırır; CSP'nin geri kalanına dokunulmaz.
  assert.ok(template.includes("frame-ancestors 'none'"));
  assert.ok(template.includes("connect-src 'self' https://${BACKEND_DOMAIN} wss://${BACKEND_DOMAIN}"));
});
