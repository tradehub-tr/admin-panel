/**
 * Medya tarih/saat gösterim standardı (TUR-124).
 *
 * **Neden tek yerde.** Medya ekranlarında dört ayrı biçimlendirme vardı:
 *
 *   medya kütüphanesi   "14 Ağu 2026"          saat yok
 *   yedek ekranı        "14 Ağu 2026 09:39"    saat var
 *   optimizasyon        "14.08.2026"           dil SABİT "tr-TR" idi
 *   denetim ekranı      "2026-08-14 09:39"     ham dize kırpma, dil yok
 *
 * Aynı veri dört ekranda dört türlü görünüyordu; ikisi kullanıcının seçtiği
 * dili hiç dikkate almıyordu.
 *
 * **Saat dilimi.** Sunucu artık tarihi saat dilimi kaymasıyla gönderiyor
 * (`2026-08-14T09:39:06+03:00`). Öncesinde işaretsiz gönderiyordu ve tarayıcı
 * onu kendi saati sanıyordu — ölçüldü, İstanbul dışındaki her kullanıcı
 * saatleri kaymış görüyordu (New York'ta 09:39 yerine 02:39 olmalıydı).
 * Buradaki fonksiyonlar tarihi kullanıcının KENDİ saatine çeviriyor.
 *
 * **Eski biçime dayanıklı.** Sunucunun her ucu aynı anda güncellenmiyor;
 * işaretsiz gelen tarih de kabul ediliyor ve sunucu saati varsayılıyor.
 */

/** Sunucunun saat dilimi kayması — işaretsiz gelen tarihler için varsayım. */
const SUNUCU_KAYMASI = "+03:00";

/**
 * Gelen değeri `Date` nesnesine çevir.
 *
 * Üç biçimi kabul eder:
 *   2026-08-14T09:39:06+03:00   yeni standart
 *   2026-08-14T09:39:06         işaretsiz ISO — sunucu saati varsayılır
 *   2026-08-14 09:39:06.911581  eski Frappe biçimi — bazı tarayıcılarda
 *                               ayrıştırılamıyor, o yüzden düzeltiliyor
 */
export function parseServerDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  let metin = String(value).trim();
  if (!metin) return null;

  // Boşluklu biçimi ISO'ya çevir; mikro saniyeyi at (bazı tarayıcılar takılıyor).
  metin = metin.replace(" ", "T").replace(/\.\d+/, "");

  // Saat dilimi işareti yoksa sunucununki varsayılıyor. Eklenmezse tarayıcı
  // kendi saatiymiş gibi okur ve yurtdışı kullanıcıda saatler kayar.
  const isaretVar = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(metin);
  if (!isaretVar) metin += SUNUCU_KAYMASI;

  const d = new Date(metin);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Yalnız gün: "14 Ağu 2026" */
export function formatDay(value, locale = "tr") {
  const d = parseServerDate(value);
  if (!d) return "—";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

/** Gün ve saat: "14 Ağu 2026 09:39" — kullanıcının kendi saatinde. */
export function formatDateTime(value, locale = "tr") {
  const d = parseServerDate(value);
  if (!d) return "—";
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

/** Yalnız saat: "09:39" */
export function formatClock(value, locale = "tr") {
  const d = parseServerDate(value);
  if (!d) return "—";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Göreli zaman: "5 dk önce".
 *
 * İzleme ekranlarında "13:48" az şey söyler; olayın tazeliğini göreli ifade
 * anlatır. Bir günü aşınca tam tarihe düşülüyor — "42 gün önce" okunmuyor.
 *
 * Metinler çağırandan geliyor: çeviri anahtarları ekranın kendi sözlüğünde ve
 * bu dosya i18n'e bağımlı olmamalı (test edilebilirliği düşer).
 */
export function formatAgo(value, { now = "az önce", min, hour, day, fallback } = {}) {
  const d = parseServerDate(value);
  if (!d) return "—";

  const fark = Math.max(0, Date.now() - d.getTime()) / 1000;
  if (fark < 60) return now;
  if (fark < 3600) return min ? min(Math.floor(fark / 60)) : `${Math.floor(fark / 60)} dk önce`;
  if (fark < 86400) return hour ? hour(Math.floor(fark / 3600)) : `${Math.floor(fark / 3600)} sa önce`;
  if (fark < 2592000) return day ? day(Math.floor(fark / 86400)) : `${Math.floor(fark / 86400)} gün önce`;
  return fallback ? fallback(d) : formatDay(value);
}

/**
 * Sıralama ve filtreleme için karşılaştırılabilir sayı.
 *
 * Metin karşılaştırması yanıltıcı: işaretli ve işaretsiz biçimler yan yana
 * gelince alfabetik sıra gerçek zaman sırasını vermiyor.
 */
export function toTimestamp(value) {
  const d = parseServerDate(value);
  return d ? d.getTime() : 0;
}
