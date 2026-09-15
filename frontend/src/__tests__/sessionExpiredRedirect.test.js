// Oturum-düştü yolunun sözleşmesi (HEADLESS-DURUM-RAPORU "yan ürün" #1).
//
// `/panel/reset` hiçbir yerde tanımlı olmayan ölü bir uçtu: ne backend route
// ne nginx location. Kullanıcı SPA fallback'iyle login'e düşüyor, httpOnly
// `sid` sunucuda temizlenmiyordu. Doğru akış: best-effort sunucu logout'u
// (Frappe session'ı + cookie'yi temizler) ve ardından GERÇEK login rotasına
// yönlendirme. `api.js` import.meta.env kullandığı için Node altında modül
// olarak yüklenemez — sözleşme kaynak metin üzerinden denetlenir (depodaki
// desen: zamanBombasi.test.js, styleLanguage.test.js).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "../..");
const kaynak = readFileSync(join(KOK, "src/utils/api.js"), "utf8");

test("ölü /panel/reset hedefi koda geri dönmesin", () => {
  assert.ok(
    !kaynak.includes("/panel/reset"),
    "api.js hâlâ /panel/reset'e yönlendiriyor — bu uç hiçbir yerde tanımlı değil"
  );
});

test("oturum düşünce best-effort sunucu logout'u çağrılır", () => {
  assert.ok(
    kaynak.includes("fetch(`${BASE_URL}/api/method/logout`"),
    "session-expired dalı Frappe logout'unu çağırmalı (httpOnly sid ancak sunucuda temizlenir)"
  );
});

test("yönlendirme vite base'i üzerinden gerçek login rotasına gider", () => {
  assert.ok(
    kaynak.includes("${import.meta.env.BASE_URL}login"),
    "redirect import.meta.env.BASE_URL + 'login' olmalı (prod: /panel/login, dev: /login)"
  );
});

test("auth uçları redirect'ten hariç tutulmaya devam eder", () => {
  // Mevcut davranış korunuyor: login/logout/get_session_user/get_logged_user
  // çağrıları session-expired yakalansa bile yönlendirme tetiklemez.
  for (const uc of ["login", "logout", "get_session_user", "get_logged_user"]) {
    assert.ok(
      kaynak.includes(`endpoint.includes("${uc}")`),
      `auth ucu hariç tutma listesinden düşmüş: ${uc}`
    );
  }
});
