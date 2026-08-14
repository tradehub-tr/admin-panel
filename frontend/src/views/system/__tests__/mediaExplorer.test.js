import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// Medya Gezgini (TUR-126 devamı): medya klasör KLASÖR mantığıyla gezilir —
// kök (Herkese açık / Özel) → mağaza → ürün kategorisi → dosyalar; özel
// tarafta belge türü grupları. Klasörler sanaldır, backend browse_media
// ucundan gelir; disk yapısına dokunulmaz (TUR-130 shard korunur).

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

const view = read("src/views/system/MediaExplorerView.vue");
const router = read("src/router/index.js");
const nav = read("src/data/navigation.js");
const tr = read("src/i18n/locales/tr.js");
const en = read("src/i18n/locales/en.js");

test("MediaExplorerView browse_media ucunu çağırır ve breadcrumb ile gezinir", () => {
	assert.match(view, /browse_media/);
	assert.match(view, /breadcrumb/i);
	// Özel klasör kimlikleri backend sabitleriyle aynı
	assert.match(view, /__platform__/);
	assert.match(view, /__none__/);
	assert.match(view, /__other__/);
});

test("MediaExplorerView erişim aksiyonlarını taşır (özele taşı / herkese aç / imzalı link)", () => {
	assert.match(view, /useMediaAccess/);
	assert.match(view, /mediaAccess\.action\.makePrivate/);
	assert.match(view, /mediaAccess\.action\.makePublic/);
	assert.match(view, /mediaAccess\.action\.signedLink/);
	assert.match(view, /item\.pii/);
});

test("route ve menü kaydı var", () => {
	assert.match(router, /media-explorer/);
	assert.match(router, /MediaExplorerView/);
	assert.match(nav, /mediaExplorer/);
});

// KYB/KYC yüzlerce belge — grup klasörünün altında bir seviye daha var:
// mağaza alt klasörleri (backend DETAILED_PRIVATE_GROUPS + sub parametresi).
// Dosya mı klasör mü olduğu artık yanıttan anlaşılır (data.items var/yok).
test("özel grup klasörleri mağaza alt seviyesiyle gezilir", () => {
	assert.match(view, /sub: ""/);
	assert.match(view, /data\.items/);
});

// Mağaza klasörünün içi de belge türüne ayrılır (vergi levhası, imza
// sirküleri...) — eklerin yarısı alansız (serbest ek), bu seviye olmadan
// hangi dosyanın hangi evrak olduğu görünmüyordu.
test("mağaza klasörünün altında belge alanı klasörleri gezilir", () => {
	assert.match(view, /docField/);
	assert.match(view, /doc_field/);
	for (const src of [tr, en]) {
		assert.match(src, /vergi_levhasi:/);
		assert.match(src, /imza_sirkuleri:/);
	}
});

test("tr ve en locale'lerinde mediaExplorer.* anahtarları var", () => {
	for (const src of [tr, en]) {
		assert.match(src, /mediaExplorer:\s*\{/);
		assert.match(src, /mediaExplorer:/); // nav etiketi de dahil
	}
});
