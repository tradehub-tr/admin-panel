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
const optimizeComposable = read("src/composables/useMediaOptimize.js");
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
	assert.match(audit, /copySignedLink\(/);
});

// Denetim akışı private dosya olaylarını MASKELER (backend gizlilik kuralı:
// sensitive = currently_private or make_private) — bu yüzden private dosyanın
// geri alınabileceği tek yer ayrı bir "Özel dosyalar" görünümü. O görünüm
// olmadan "Özele taşı" tek yönlü bir kapan olur.
test("useMediaOptimize private görünümde get_private_files ucunu çağırır", () => {
	assert.match(optimizeComposable, /get_private_files/);
	assert.match(optimizeComposable, /["']private["']/);
});

test("MediaOptimizeView özel dosyalar görünümünde herkese aç + imzalı link sunar, PII'de açmayı gizler", () => {
	assert.match(optimize, /isPrivateView/);
	assert.match(optimize, /mediaAccess\.action\.makePublic/);
	assert.match(optimize, /mediaAccess\.action\.signedLink/);
	assert.match(optimize, /item\.pii/);
	assert.match(optimize, /copySignedLink\(/);
	// Özel dosya zaten özel — "Özele taşı" bu görünümde görünmemeli
	assert.match(optimize, /!isTrashView && !isPrivateView/);
});

// navigator.clipboard güvensiz origin'de (http://istoc.localhost) undefined,
// headless/izinsiz ortamda ise Write permission denied fırlatır — canlı testte
// üretilen link kayboldu. Kopyalama execCommand fallback'li helper'dan geçmeli.
test("kopyalama clipboard başarısız olursa execCommand fallback'ine düşer", () => {
	assert.match(composable, /copyText/);
	assert.match(composable, /execCommand\(["']copy["']\)/);
	assert.match(optimize, /copyText\(/);
	assert.match(audit, /copyText\(/);
});

test("tr ve en locale'lerinde mediaAccess.* anahtarları var", () => {
	for (const src of [tr, en]) {
		assert.match(src, /mediaAccess:\s*\{/);
		assert.match(src, /makePrivate:/);
		assert.match(src, /makePublic:/);
		assert.match(src, /signedLink:/);
	}
});
