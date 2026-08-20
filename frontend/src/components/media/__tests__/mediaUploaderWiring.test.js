import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * W5 kablolama — rapor 75'in iki "kurulu ama bağlı değil" kusuru (Bulgu 1 ve 3).
 *
 * Bulgu 1: `MediaUploader.vue` (1000×1000 ön kontrol kapısının sahibi) hiçbir
 * route'a bağlı değildi; satıcı görselleri kapıya hiç uğramayan yollardan
 * yüklüyordu. Bu test yükleyicinin satıcı medya kütüphanesindeki "Yükle"
 * düğmesine gerçekten bağlandığını kaynak metinden doğrular.
 *
 * Bulgu 3: `CropStudioModal` kütüphanede `:asset` PROP'U olmadan açılıyordu —
 * Uygula düğmesi kalıcı devre dışı, `save_intent` o ekrandan hiç
 * çağrılamıyordu. Bu test asset adının seçili öğeden modala aktığını doğrular.
 *
 * Desen `mediaAccessControl.test.js` ile aynı: kablo bağlı mı sorusu kaynak
 * metinden ölçülür. Bu iddialar bilinçli olarak metne bağlıdır — kablo
 * sökülürse (`:asset` kaldırılırsa, düğme eski gizli dosya seçicisine
 * dönerse) test KIRMIZI olmalı (vacuity kontrolü).
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

const view = read("src/views/seller/MediaLibraryView.vue");
const store = read("src/stores/media.js");

// ── Bulgu 1 — MediaUploader kablosu ─────────────────────────────────

test("Yükle düğmesi T-091 yükleyici modalını açar (gizli dosya seçicisi değil)", () => {
	// Masaüstü başlık düğmesi ve mobil FAB aynı modala gider.
	const acanlar = view.match(/@click="uploaderOpen = true"/g) || [];
	assert.ok(acanlar.length >= 2, "hem başlık düğmesi hem FAB yükleyici modalını açmalı");
	// Eski yol (boyut kapısına bakmayan gizli <input type=file>) başlıkta ve
	// FAB'da artık YOK; sayfadaki sürükle-bırak alanı bilinçli olarak kaldı.
	assert.doesNotMatch(view, /<label class="hdr-btn-primary/);
	assert.doesNotMatch(view, /<label class="mfab/);
});

test("MediaUploader bir görünüme bağlı — kullanım sayısı 0→N", () => {
	assert.match(view, /import\("@\/components\/media\/upload\/MediaUploader\.vue"\)/);
	assert.match(view, /<MediaUploader\s/);
	// Modal kabuğu ve slot bağı: ön kontrol slot politikasıyla koşar
	// (product.image → min 1000×1000), slot'suz yükleyici kapıyı yine öldürür.
	assert.match(view, /v-model:open="uploaderOpen"/);
	assert.match(view, /:slot-key="uploadSlotKey"/);
	assert.match(view, /uploadSlotKey = ref\("product\.image"\)/);
});

test("yükleme bitince liste store'un mevcut yenileme yoluyla tazelenir", () => {
	assert.match(view, /@uploaded="onUploaderUploaded"/);
	assert.match(view, /store\.loadReal\(\{ trashed: store\.showArchived \}\)/);
});

// ── Bulgu 3 — CropStudioModal `:asset` kablosu ──────────────────────

test("CropStudioModal seçili öğenin Media Asset adını alır", () => {
	assert.match(view, /:asset="cropAsset"/);
	// Ad, modal açılmadan ÖNCE store üzerinden çözülür (stüdyo asset'i
	// kuruluşta okur; sonradan gelen ad Uygula'yı açmaz).
	assert.match(view, /cropAsset\.value = await store\.assetNameOf\(item\.id\)/);
	// Store adı manifest_batch'in `assets[]` alanından alır — satır modeli
	// (`bicimle`) asset adı taşımıyor (ölçüldü).
	assert.match(store, /media_manifest\.manifest_batch/);
	assert.match(store, /assetNameOf/);
});

test("asset'i olmayan dosyada modal dürüst 'kaydedilemez' durumunda kalır", () => {
	// Çözüm başarısızsa (varlık yok / uç erişilemedi) boş string'e düşülür;
	// uydurma bir ad üretilmez — Uygula kapalı kalır.
	assert.match(view, /cropAsset\.value = "";\s*\n\s*try \{/);
	assert.match(view, /catch \{\s*\n\s*cropAsset\.value = "";/);
	assert.match(store, /return manifest\?\.assets\?\.\[0\] \|\| "";/);
});
