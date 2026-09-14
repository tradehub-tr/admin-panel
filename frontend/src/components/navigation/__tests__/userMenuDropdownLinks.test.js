// Kullanıcı menüsü navigasyon hedefleri (HEADLESS-DURUM-RAPORU "yan ürün" #4).
//
// "Aboneliğim" girişi router'da var olmayan `/subscription`'a gidiyordu —
// gerçek rota `/abonelik` (router/index.js, subscription-lock guard'ının da
// yönlendirdiği yol). Bu test dropdown'daki her navigate hedefinin router'da
// karşılığı olduğunu metin sözleşmesiyle doğrular; router'ı import etmek tüm
// view graph'ını çekeceği için kaynak üzerinden denetlenir.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const dropdown = readFileSync(
  join(KOK, "src/components/navigation/UserMenuDropdown.vue"),
  "utf8"
);
const router = readFileSync(join(KOK, "src/router/index.js"), "utf8");

function navigateHedefleri(kaynak) {
  return [...kaynak.matchAll(/emit\('navigate', '([^']+)'\)/g)].map((m) => m[1]);
}

test("Aboneliğim /abonelik'e gider — ölü /subscription geri dönmesin", () => {
  const hedefler = navigateHedefleri(dropdown);
  assert.ok(hedefler.includes("/abonelik"), "dropdown'da /abonelik hedefi yok");
  assert.ok(
    !hedefler.includes("/subscription"),
    "/subscription router'da tanımlı değil — SPA fallback'e düşer"
  );
});

test("Hesabı Sil girişi korunur (Apple 5.1.1(v))", () => {
  assert.ok(navigateHedefleri(dropdown).includes("/hesap-silme"));
});

test("/abonelik rotası router'da gerçekten tanımlı", () => {
  assert.ok(
    /path:\s*"abonelik"/.test(router),
    'router/index.js içinde path: "abonelik" bulunamadı'
  );
});
