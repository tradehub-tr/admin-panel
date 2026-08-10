/**
 * Mağaza vitrini adresi — tek kaynak.
 *
 * Backend yalnız YOL döndürüyor (`/urun/vera-ipli-el-rondosu`); kök ortama göre
 * değişiyor ve backend bunu güvenilir biçimde bilemiyor: yerelde vitrin ayrı
 * portta, üretimde ayrı alan adında çalışıyor. `frappe.utils.get_url()`
 * backend'in kendi adresini verdiği için panelde yanlış adres çıkıyordu.
 *
 * Aynı ortam değişkeni panelin altı ayrı yerinde elle okunuyordu; burada
 * toplanıyor ki kök değişince tek yer güncellensin.
 */
const BASE = (import.meta.env.VITE_STOREFRONT_URL || window.location.origin).replace(/\/+$/, "");

/** Vitrin kökü (sondaki `/` olmadan). */
export function storefrontBase() {
  return BASE;
}

/**
 * Backend'den gelen yolu tam adrese çevir.
 *
 * Yol boşsa boş döner — o kayıt yayında değil demektir.
 *
 * Yol satıcının düzenleyebildiği slug'dan üretiliyor, bu yüzden şema taşıyan
 * ya da protokol-göreli bir değer reddedilir. Kökle birleştirme bunları zaten
 * zararsız hâle getiriyor ama güvenlik birleştirmenin yan etkisine bırakılmaz.
 */
export function storefrontUrl(path) {
  if (!path) return "";
  const raw = String(path).trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) return "";
  return `${BASE}${raw.startsWith("/") ? raw : `/${raw}`}`;
}
