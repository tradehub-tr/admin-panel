import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import tr from "../../../i18n/locales/tr.js";
import en from "../../../i18n/locales/en.js";
import ru from "../../../i18n/locales/ru.js";
import ar from "../../../i18n/locales/ar.js";

/**
 * QA bulgusu — /hesap-silme keşfedilemezdi: rota vardı (router/index.js) ama
 * hiçbir menü yüzeyinde linki yoktu (Apple 5.1.1(v) hesap silmenin uygulama
 * içinden keşfedilebilir olmasını ister). Giriş UserMenuDropdown'a eklendi.
 *
 * Desen: iosUpgradeCta.test.js'in kaynak-sözleşme alt deseni — dropdown yalnız
 * tıklamayla açılır (SSR başlangıcında olay koşmaz), bu yüzden link sözleşmesi
 * kaynak üzerinde sabitlenir; i18n anahtarları 4 locale'de ayrıca denetlenir.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));

test("UserMenuDropdown: 'Hesabı Sil' girişi /hesap-silme rotasına navigate eder", () => {
  const src = readFileSync(
    `${frontendRoot}/src/components/navigation/UserMenuDropdown.vue`,
    "utf8"
  );
  assert.ok(
    src.includes("emit('navigate', '/hesap-silme')"),
    "menüde /hesap-silme'ye navigate eden giriş olmalı (keşfedilebilirlik — Apple 5.1.1(v))"
  );
  assert.ok(
    src.includes('t("userMenuDropdown.deleteAccount")'),
    "giriş metni i18n anahtarından gelmeli (hardcoded metin yasak)"
  );
});

test("Router: /hesap-silme rotası kayıtlı — menü linki 404'e/catch-all'a düşmez", () => {
  const src = readFileSync(`${frontendRoot}/src/router/index.js`, "utf8");
  assert.ok(src.includes('path: "hesap-silme"'), "hesap-silme rotası router'da olmalı");
  assert.ok(
    src.includes("views/settings/AccountDeletionView.vue"),
    "rota AccountDeletionView'a bağlanmalı"
  );
});

test("i18n: userMenuDropdown.deleteAccount 4 locale'de var ve boş değil", () => {
  for (const [code, messages] of Object.entries({ tr, en, ru, ar })) {
    const text = messages.userMenuDropdown?.deleteAccount;
    assert.ok(
      typeof text === "string" && text.length > 0,
      `${code}: userMenuDropdown.deleteAccount eksik`
    );
  }
});
