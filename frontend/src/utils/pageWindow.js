/**
 * Sayfalayıcıda gösterilecek sayfa numaraları: geçerli sayfayı ortalayan,
 * uçlarda kayan sabit genişlikte bir pencere.
 *
 * Pencere genişliği parametre — telefonda 3, masaüstünde 5. Sabit 5 iken
 * 320px'te "‹ 1 2 3 4 5 ›" satıra sığmıyor, ileri oku alt satıra düşüyordu;
 * CSS ile uç düğmeleri gizlemek de olmaz, geçerli sayfa uçta olabilir.
 *
 * @param {number} current  Geçerli sayfa (1 tabanlı)
 * @param {number} totalPages Toplam sayfa sayısı (≥1)
 * @param {number} size  Pencere genişliği (tek sayı beklenir; 3 ya da 5)
 * @returns {number[]} Gösterilecek sayfa numaraları, artan sırada
 */
export function pageWindow(current, totalPages, size = 5) {
  const tp = Math.max(1, totalPages);
  const win = Math.max(1, size);
  if (tp <= win) return Array.from({ length: tp }, (_, i) => i + 1);

  const half = Math.floor(win / 2);
  let start = current - half;
  if (start < 1) start = 1;
  if (start + win - 1 > tp) start = tp - win + 1;

  return Array.from({ length: win }, (_, i) => start + i);
}
