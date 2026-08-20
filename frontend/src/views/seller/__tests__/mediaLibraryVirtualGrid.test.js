import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * Ana varlık ızgarası sanal kaydırmaya BAĞLI MI (T-092).
 *
 * `useVirtualGrid` yazılmıştı ve testi de vardı ama yalnız KLASÖR ızgarası
 * (`MediaFolderGrid`) kullanıyordu; binlerce dosyanın döküldüğü asıl ekran,
 * `MediaLibraryView`'deki `MediaCard` ızgarası, listeyi hâlâ olduğu gibi
 * DOM'a basıyordu. Bu dosya bağlantının KODDA durduğunu kontrol eder.
 *
 *   ÖLÇÜLDÜ  — şablon sözleşmesi: ızgara pencerelenmiş diliminden basıyor mu,
 *              indeksler MUTLAK mı (seçim/imleç/detay yanlış karta gitmesin),
 *              `aria-setsize`/`aria-posinset` var mı, klavye imleci artık
 *              `children[i]` üzerinden mi aranıyor, diğer görünüm kipleri
 *              (satır/tablo/kanban) dokunulmamış mı.
 *   ÖLÇÜLMEDİ — davranış. Bu dosya METİN okur. Pencerelemenin gerçekten
 *              çalıştığı ayrı bir testte, gerçek bir Vue uygulaması DOM'a
 *              basılarak ölçülüyor:
 *              `src/components/media/__tests__/cardGridWindow.test.js`.
 */

const frontendRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const read = (p) => readFileSync(new URL(p, `file://${frontendRoot}/`), "utf8");

const view = read("src/views/seller/MediaLibraryView.vue");
/** Yalnız şablon — betikteki değişken adları eşleşmeye karışmasın. */
const template = view.slice(0, view.indexOf("<script setup>"));

/** Izgara `<ul>` bloğu — diğer kipleri yanlışlıkla kapsamasın diye kesiliyor. */
const gridBlock = view.slice(
  view.indexOf("v-if=\"effectiveMode === 'grid' && paged.length\""),
  view.indexOf("effectiveMode === 'rows' && paged.length")
);

test("ızgara pencereleme composable'ına bağlı", () => {
  assert.match(
    view,
    /import \{ useCardGridWindow \} from "@\/components\/media\/useCardGridWindow"/
  );
  assert.match(view, /useCardGridWindow\(gridEl, \{/);
  // Yalnız ızgara kipi: satır listesinin yüksekliği dosya adına göre değişiyor,
  // tablo kendi sayfalamasını taşıyor, kanban üç ayrı sütun.
  assert.match(view, /enabled: \(\) => effectiveMode\.value === "grid"/);
});

test("ızgara pencerelenmiş dilimden basar, tam listeden değil", () => {
  assert.match(gridBlock, /v-for="\(item, i\) in visibleCards"/);
  assert.doesNotMatch(gridBlock, /v-for="\(item, i\) in paged"/);
  // Basılmayan satırların yeri korunur — kaydırma çubuğu zıplamasın.
  assert.match(gridBlock, /gridPadStyle/);
});

test("indeksler MUTLAK — seçim, imleç ve detay yanlış karta gitmez", () => {
  // Pencerelemeden sonra `v-for` indeksi kalemin listedeki yeri DEĞİL.
  // `i` tek başına kaldıysa 40. kart tıklanınca 3. kart açılır.
  for (const beklenen of [
    /:focused="cardOffset \+ i === cursor"/,
    /@open="openDetail\(item\.id, cardOffset \+ i\)"/,
    /@toggle="onCardToggle\(item\.id, cardOffset \+ i, \$event\)"/,
    /:data-cell="cardOffset \+ i"/,
  ]) {
    assert.match(gridBlock, beklenen);
  }
  // Eski, pencereye göre sayan hâlinden hiçbiri kalmamalı.
  assert.doesNotMatch(gridBlock, /:focused="i === cursor"/);
  assert.doesNotMatch(gridBlock, /openDetail\(item\.id, i\)/);
  assert.doesNotMatch(gridBlock, /onCardToggle\(item\.id, i,/);
});

test("ekran okuyucu kümedeki gerçek konumu duyar", () => {
  // Pencereleme DOM'u kırpıyor; kırpılmış DOM'dan sayılan konum "1 / 36" der,
  // oysa kullanıcı sayfadaki 48 kartın 30.'sunda.
  assert.match(gridBlock, /:aria-setsize="paged\.length"/);
  assert.match(gridBlock, /:aria-posinset="cardOffset \+ i \+ 1"/);
});

test("klavye imleci artık çocuk sırasına güvenmiyor", () => {
  // Görünmeyen kart DOM'da yok: `children[cursor]` ya boş ya BAŞKA bir kart.
  assert.doesNotMatch(view, /children\[cursor\.value\]/);
  assert.match(view, /const cell = await revealCard\(next\)/);
  assert.match(view, /cell\?\.scrollIntoView\(\{ block: "nearest" \}\)/);
});

test("diğer görünüm kipleri pencerelenmedi", () => {
  // Satır/tablo/kanban hâlâ tam sayfayı basıyor — sabit satır yükseklikleri yok.
  assert.match(view, /effectiveMode === 'rows' && paged\.length" ref="gridEl"/);
  assert.match(view, /:rows="paged"/);
  assert.match(view, /items: paged\.value\.filter\(b\.match\)/);
  const digerKipler = template.slice(template.indexOf("effectiveMode === 'rows'"));
  assert.doesNotMatch(digerKipler, /visibleCards|cardOffset|gridPadStyle/);
});

test("kart pencerelenmiş ızgarada sabit yükseklik kipine geçer", () => {
  assert.match(gridBlock, /:uniform="gridWindowed"/);
  const card = read("src/components/media/MediaCard.vue");
  assert.match(card, /uniform: \{ type: Boolean, default: false \}/);
  assert.match(card, /mcard--uniform/);
});
