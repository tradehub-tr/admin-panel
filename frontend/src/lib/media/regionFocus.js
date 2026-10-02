/**
 * Klasör geçişinden sonra odağı içerik bölgesine taşı — yalnız odak KAYBOLDUYSA.
 *
 * Gezginlerde klasör kartı, sayfa düğmesi ya da tıklanan kırıntı yeni içerik
 * gelince DOM'dan kalkar; odak `body`'ye düşer ve klavye kullanıcısı sayfanın
 * başına atılır. Ağaç düğmesi, kalıcı kırıntı ya da arama kutusu ise yerinde
 * kalır: orada gezinen kullanıcının odağı ÇALINMAZ.
 *
 * Bölge ekranda görünüyorsa kaydırma yapılmaz (`preventScroll`); üstü ekran
 * dışındaysa tarayıcı bölgeyi görünür kılsın diye kaydırmaya izin verilir.
 *
 * @param {HTMLElement|null|undefined} region `tabindex="-1"` taşıyan içerik bölgesi
 * @returns {boolean} odak taşındı mı
 */
export function focusRegionIfLost(region) {
  if (!region?.isConnected || typeof document === "undefined") return false;
  const active = document.activeElement;
  const lost = !active || active === document.body || !active.isConnected;
  if (!lost && !region.contains(active)) return false;
  const { top } = region.getBoundingClientRect();
  const onScreen = top >= 0 && top < window.innerHeight;
  region.focus({ preventScroll: onScreen });
  return true;
}
