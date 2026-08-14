import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// Medya erişim seviyesi paneli (TUR-126 §4.2): backend'de set_access_level +
// get_signed_url hazırdı ama panelden çağıran hiçbir kod yoktu — süper-admin
// public↔private çeviremiyor, private dosya için imzalı link üretemiyordu.
// Bu test o kabloların panelde bağlı olduğunu kaynak metinden doğrular.

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

const composable = read("src/composables/useMediaAccess.js");
const optimize = read("src/views/system/MediaOptimizeView.vue");
const audit = read("src/views/system/MediaAuditView.vue");
const tr = read("src/i18n/locales/tr.js");
const en = read("src/i18n/locales/en.js");

test("useMediaAccess backend'in set_access_level ucunu çağırır", () => {
	assert.match(composable, /tradehub_core\.api\.media_admin/);
	assert.match(composable, /set_access_level/);
	assert.match(composable, /file_url/);
	assert.match(composable, /make_private/);
});

test("useMediaAccess imzalı link için media_access.get_signed_url ucunu çağırır", () => {
	assert.match(composable, /tradehub_core\.api\.media_access/);
	assert.match(composable, /get_signed_url/);
});

test("MediaOptimizeView public dosya için private'a taşıma aksiyonunu bağlar", () => {
	assert.match(optimize, /useMediaAccess/);
	assert.match(optimize, /mediaAccess\.action\.makePrivate/);
	// Onay adımı şart (tasarım §4.2: geri alınamaz uyarısı)
	assert.match(optimize, /mediaAccess\.confirm\./);
});

test("MediaAuditView private dosyayı rozetler ve imzalı link + public yap aksiyonlarını sunar", () => {
	assert.match(audit, /useMediaAccess/);
	assert.match(audit, /\/private\/files\//);
	assert.match(audit, /mediaAccess\.badge\./);
	assert.match(audit, /mediaAccess\.action\.signedLink/);
	assert.match(audit, /mediaAccess\.action\.makePublic/);
	// Üretilen link panoya kopyalanır — kullanıcı paylaşabilsin
	assert.match(audit, /clipboard/);
});

test("tr ve en locale'lerinde mediaAccess.* anahtarları var", () => {
	for (const src of [tr, en]) {
		assert.match(src, /mediaAccess:\s*\{/);
		assert.match(src, /makePrivate:/);
		assert.match(src, /makePublic:/);
		assert.match(src, /signedLink:/);
	}
});
