import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { IOS_APP_UA_MARK, isIosApp } from "../platform.js";

/**
 * AD-1 — iOS uygulama bayrağı (App Store uyum, Guideline 3.1.1/3.1.3).
 *
 *   ÖLÇÜLÜR  — iki sinyalin (Capacitor bridge, UA işareti) tek tek ve birlikte
 *              doğru karara bağlandığı; sinyal yokken (web) bayrağın KAPALI
 *              kaldığı; `window` hiç yokken (SSR/test) güvenli `false` dönüşü.
 *   ÖLÇÜLMEZ — gerçek Capacitor iOS webview'ı ve FE-1'in appendUserAgent'ının
 *              gerçekten UA'ya eklendiği (gerçek cihaz/TestFlight doğrulaması
 *              DoD'de ayrı iş).
 */

const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
const originalWindow = globalThis.window;

afterEach(() => {
  if (hadWindow) globalThis.window = originalWindow;
  else delete globalThis.window;
});

function setWindow(win) {
  globalThis.window = win;
}

test("window yokken (SSR/Node) bayrak kapalı — güvenli varsayılan web", () => {
  delete globalThis.window;
  assert.equal(isIosApp(), false);
});

test("Capacitor bridge iOS platformu bildirirse bayrak açık", () => {
  setWindow({ Capacitor: { getPlatform: () => "ios" }, navigator: { userAgent: "Mozilla/5.0" } });
  assert.equal(isIosApp(), true);
});

test("Capacitor başka platform bildirirse tek başına yetmez", () => {
  setWindow({
    Capacitor: { getPlatform: () => "android" },
    navigator: { userAgent: "Mozilla/5.0" },
  });
  assert.equal(isIosApp(), false);
});

test("UA 'istocApp/ios' işareti taşıyorsa bridge olmasa da bayrak açık", () => {
  setWindow({ navigator: { userAgent: `Mozilla/5.0 (iPhone) ${IOS_APP_UA_MARK}` } });
  assert.equal(isIosApp(), true);
});

test("düz web UA'da bayrak kapalı (AC-3 regresyon koruması)", () => {
  setWindow({ navigator: { userAgent: "Mozilla/5.0 (Macintosh) Safari/605.1.15" } });
  assert.equal(isIosApp(), false);
});

test("bozuk bridge (getPlatform yok) çökme yerine UA'ya düşer", () => {
  setWindow({ Capacitor: {}, navigator: { userAgent: `X ${IOS_APP_UA_MARK}` } });
  assert.equal(isIosApp(), true);
  setWindow({ Capacitor: {}, navigator: { userAgent: "X" } });
  assert.equal(isIosApp(), false);
});

test("navigator dahi yoksa bayrak kapalı", () => {
  setWindow({});
  assert.equal(isIosApp(), false);
});
