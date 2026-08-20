/**
 * Izgarada klavye gezinmesi — saf hesap, DOM yok.
 *
 * Kart ızgaraları ARIA'da "composite widget": WAI-ARIA APG'nin grid deseni
 * her karta ayrı Tab durağı vermeyi değil, TEK durak + ok tuşlarıyla gezinmeyi
 * ister (roving tabindex). 300 klasörlük bir seviyede her kartın Tab durağı
 * olması, klavye kullanıcısını içeriğe ulaşmak için 300 kez Tab'a basmaya
 * zorlar — sayfa pratikte klavyeyle kullanılamaz hâle gelir.
 *
 * Sarma YOK: sağ oktan son kalemden ilkine atlamak, ızgaranın iki boyutlu
 * yapısında kullanıcıyı beklemediği yere götürür. Sınırda imleç durur.
 */

/** Yön tuşlarının sütun sayısına göre karşılığı. */
const STEPS = {
  ArrowRight: () => 1,
  ArrowLeft: () => -1,
  ArrowDown: (cols) => cols,
  ArrowUp: (cols) => -cols,
};

/**
 * @param {string} key       KeyboardEvent.key
 * @param {number} current   Şu anki indeks (-1 = imleç yok)
 * @param {number} total     Kalem sayısı
 * @param {number} columns   Satır başına kalem
 * @returns {number} Yeni indeks; tuş gezinme tuşu değilse -1 döner
 *                   (çağıran olayı ENGELLEMEZ, tarayıcıya bırakır).
 */
export function nextGridIndex(key, current, total, columns) {
  const n = Math.max(0, Math.trunc(total) || 0);
  if (!n) return -1;
  const cols = Math.max(1, Math.trunc(columns) || 1);
  const from = current >= 0 && current < n ? current : 0;

  if (key === "Home") return 0;
  if (key === "End") return n - 1;
  // PageUp/PageDown bir "ekran" değil bir satır bloğu atlar: gerçek ekran
  // yüksekliği burada bilinmiyor ve bilinseydi bile pencere değiştikçe
  // değişirdi. Sabit blok, tahmin edilebilir davranış.
  if (key === "PageDown") return Math.min(n - 1, from + cols * 4);
  if (key === "PageUp") return Math.max(0, from - cols * 4);

  const step = STEPS[key];
  if (!step) return -1;

  // İmleç hiç konmamışsa ilk ok tuşu ilk kaleme koyar — kullanıcı boşluğa
  // basmış gibi hissetmesin.
  if (current < 0 || current >= n) return 0;

  const next = from + step(cols);
  if (next < 0 || next >= n) return from;
  return next;
}

/** Bu tuş ızgara gezinme tuşu mu — olayın engellenip engellenmeyeceği. */
export function isGridNavKey(key) {
  return key in STEPS || ["Home", "End", "PageUp", "PageDown"].includes(key);
}
