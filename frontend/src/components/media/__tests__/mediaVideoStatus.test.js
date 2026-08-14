import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// Video transcode durumu (backend: th_media_video_status → API: video_status)
// panelde uçtan uca görünür olmalı — TUR video-durum düzeltmesi. Backend alanı
// yazıyordu ama hiçbir ekran okumuyordu; kullanıcı "Video yüklendi" toast'ından
// sonra transcode'un sürdüğünü/başarısız olduğunu hiç göremiyordu.

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

const composable = read("src/composables/useSellerMedia.js");
const card = read("src/components/media/MediaCard.vue");
const detail = read("src/components/media/MediaDetailPanel.vue");
const tr = read("src/i18n/locales/tr.js");
const en = read("src/i18n/locales/en.js");

test("useSellerMedia backend'in video_status alanını videoStatus olarak haritalar", () => {
  assert.match(composable, /videoStatus:\s*row\.video_status/);
});

test("MediaCard işleniyor/başarısız rozetlerini videoStatus'e bağlar", () => {
  assert.match(card, /item\.videoStatus === 'processing'/);
  assert.match(card, /item\.videoStatus === 'failed'/);
  assert.match(card, /media\.video\.processing/);
  assert.match(card, /media\.video\.failed/);
  // "ready" rozeti BİLİNÇLİ yok: oynatılabilir video zaten kendi kanıtı,
  // her karta "Hazır" basmak gürültü olur.
  assert.doesNotMatch(card, /media\.video\.ready/);
});

test("MediaDetailPanel video için durum satırı gösterir", () => {
  assert.match(detail, /item\.videoStatus/);
  assert.match(detail, /media\.video\./);
});

test("tr ve en locale'lerinde media.video.* anahtarları var", () => {
  const blok = /video:\s*\{[^}]*processing:[^}]*ready:[^}]*failed:[^}]*\}/;
  assert.match(tr, blok);
  assert.match(en, blok);
});
