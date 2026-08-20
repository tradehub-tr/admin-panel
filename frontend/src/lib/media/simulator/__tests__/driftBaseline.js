/**
 * T-115 — bugün AÇIK olan katalog sapmaları.
 *
 * ## Liste BUGÜN BOŞ — çünkü dördü de düzeltildi
 *
 * FE-2 ölçümü (2026-08-19, 13 gerçek cihaz × 12 bölge = 85 ölçüm) kataloğun
 * dört yerde gerçek sayfayla tutmadığını gösterdi; en büyüğü 80,68px'ti.
 * Dördü de `placements.json`'da düzeltildi (2026-08-20) ve aynı fixture'a
 * karşı yeniden ölçüldü: **85 satırın hiçbiri 2px eşiğini aşmıyor**, en
 * büyük kalan fark 0,42px.
 *
 * | Bölge | Önce | Sonra | Ne düzeltildi |
 * |---|---:|---:|---|
 * | `seller_shop/product_grid`   | 80,68px | 0,01px | sol kenar çubuğu (240px) düşülmüyordu |
 * | `home/top_deals`             |  8,11px | 0,42px | bölüm dolgusu `var(--space-card-padding)` modellenmemişti |
 * | `cart_checkout/summary_strip`|  8,00px | 0,00px | katalog render edilmeyen bileşene dayanıyordu |
 * | `home/hero_showcase_grid`    |  2,01px | 0,01px | kart kenarlığı (1px×2) düşülmüyordu |
 * | `listing/card_grid`          |  2,00px | 0,01px | aynı kenarlık, yalnız <480px'te (eşiği AŞMIYORDU, yine de düzeltildi) |
 *
 * `listing/card_grid` `>` karşılaştırmasına takılmadığı için "temiz"
 * görünüyordu; bilinen bir hatayı sırf kapı tetiklenmiyor diye bırakmak,
 * kapının yanlış şeyi ölçmesi demekti. Gerekçeleri ve ölçüm zincirleri
 * `docs/reports/59-fe2-drift-testi.md` ve `placements.json`'ın ilgili
 * `derived_from` alanlarında.
 *
 * ## Bu dosya bir tolerans DEĞİL, bir hata listesidir
 *
 * Eşik hâlâ 2px'tir ve `scripts/drift-measure.mjs` canlı koşumda **herhangi**
 * bir sapmada 1 ile çıkar. Liste boş olduğu için kapı artık DAHA SIKI:
 * `classifyRow` kayıtsız her sapmayı `unexpected` sayar, yani yeni bir sapma
 * doğduğu anda test kırılır. Yeni bir sapma bilinçli olarak bırakılacaksa
 * buraya gerekçesiyle yazılır — ve o zaman da "düzelirse kırıl" kuralı
 * işlemeye devam eder.
 */

/** Kaynak kabul ölçütü: "Kutu ölçülerinde 2 px üzeri sapma CI'da kırmızı." */
export const DRIFT_THRESHOLD_PX = 2;

/**
 * Bir sapmanın "kötüleşmediğini" ölçerken bırakılan pay. Aynı ölçüm iki kez
 * koşturulduğunda alt piksel yuvarlamaları oynayabildiği için sıfır değil;
 * gerçek bir regresyonu (px mertebesi) gizleyecek kadar da büyük değil.
 */
export const WORSENING_TOLERANCE_PX = 0.75;

/**
 * bölge anahtarı → bilinen sapma.
 *   maxAbsDeltaPx : bugün ölçülen EN BÜYÜK mutlak fark
 *   cause         : sapmayı üreten gerçek CSS (ölçümden okundu)
 *   reason        : kataloğun neyi kaçırdığı
 */
export const KNOWN_DRIFT = {
  // Boş: 2026-08-20'de dördü de düzeltildi (yukarıdaki tabloya bak).
  // Yeni bir sapma bilinçli bırakılacaksa buraya `maxAbsDeltaPx` / `cause` /
  // `reason` ile yazılır; aksi hâlde `classifyRow` onu `unexpected` sayar.
};

/**
 * Tek bir ölçüm satırını sınıflandırır.
 * `unexpected: true` ⇒ test kırılmalı.
 */
export function classifyRow(row) {
  const known = KNOWN_DRIFT[row.key];
  const over = row.absDelta > DRIFT_THRESHOLD_PX;

  if (!over) {
    if (!known) return { unexpected: false };
    // Bilinen sapmalı bir bölgenin BAZI cihazlarda eşik altında kalması normal
    // (sapma cihaz genişliğine bağlı); bölge düzeyindeki kontrol ayrı testte.
    return { unexpected: false };
  }

  if (!known) {
    return {
      unexpected: true,
      message:
        `${row.device} ${row.key}: katalog ${row.catalogWidth.toFixed(2)}px diyor, ` +
        `gerçek sayfa ${row.measuredWidth.toFixed(2)}px ölçüldü (fark ${row.delta.toFixed(2)}px). ` +
        `Ölçülen eleman: <${row.tag} class="${row.cls}">. Katalog kaynağı: ${row.renderPoint}`,
    };
  }

  if (row.absDelta > known.maxAbsDeltaPx + WORSENING_TOLERANCE_PX) {
    return {
      unexpected: true,
      message:
        `${row.device} ${row.key}: bilinen sapma KÖTÜLEŞTİ — ` +
        `kayıt ${known.maxAbsDeltaPx.toFixed(2)}px, ölçülen ${row.absDelta.toFixed(2)}px`,
    };
  }

  return { unexpected: false };
}
