// Desi (hacimsel ağırlık) hesabı — `logistics/services/desi.py`'nin KOPYASI.
//
// NEDEN KOPYA:
//   Operatör koli ölçüsünü girerken desiyi ANINDA görmeli. Her tuşta sunucuya
//   sormak paketleme hızını öldürür; kaydedip sonra öğrenmek ise "34 kg girdim,
//   meğer limit aşılmış" durumunu kaydın sonrasına atar.
//
// NEDEN GÜVENLİ:
//   `__tests__/desi.test.js` Python kaynağını okuyup buradaki sabit ve
//   formülle karşılaştırıyor — biri değişip diğeri değişmezse test kırmızı.
//   Kopyanın tehlikesi sessiz kaymaydı; kayma artık sessiz değil.
//   (Aynı desen: `components/logistics/shipmentTransitions.js`.)
//
// OTORİTE SUNUCUDA:
//   Buradaki değerler ÖNİZLEME. Kaydedince sunucu yeniden hesaplar ve
//   `save_shipment_packages` tam yükü döndürür; ekran yerel değeri yamamaz.
//   Bölen site ayarından geliyor (`Logistics Settings.default_desi_divisor`),
//   yani sabit her zaman doğru değil — çağıran `divisor`'ı yükten geçirmeli.

/**
 * Türkiye kargo standardı desi böleni.
 * Uluslararası DIM weight 5000 kullanır; site geneli override
 * `Logistics Settings.default_desi_divisor` ile yapılır.
 */
export const DEFAULT_DESI_DIVISOR = 3000;

/**
 * Hacimsel ağırlık (desi).
 *
 * Yuvarlama `ceil` — kargo firması küsuratı yukarı yuvarlıyor. `floor` ya da
 * `round` kullanmak ücreti eksik gösterir ve fatura geldiğinde fark çıkar.
 *
 * @param {number} lengthCm
 * @param {number} widthCm
 * @param {number} heightCm
 * @param {number} [divisor=DEFAULT_DESI_DIVISOR]
 * @param {"ceil"|"floor"|"none"} [rounding="ceil"]
 * @returns {number}
 */
export function calculateDesi(
  lengthCm,
  widthCm,
  heightCm,
  divisor = DEFAULT_DESI_DIVISOR,
  rounding = "ceil"
) {
  const l = Number(lengthCm) || 0;
  const w = Number(widthCm) || 0;
  const h = Number(heightCm) || 0;

  // Negatif ölçü Python tarafında ValueError. Burada fırlatmak ekranı
  // kilitlerdi: kullanıcı "-" yazdığı anda henüz "-40" yazmayı bitirmemiş
  // olabilir. 0 dönmek güvenli — doğrulama motoru zaten "ölçü girilmemiş"
  // uyarısını basıyor.
  if (l < 0 || w < 0 || h < 0) return 0;

  // 0 / boş / NaN → varsayılana düş. Python `get_desi_divisor()` de aynısını
  // yapıyor ("boş/0 ise DEFAULT_DESI_DIVISOR kullanılır", LOG-039): bozuk bir
  // ayar yüzünden 0 desi göstermek "bu koli hacimsiz" demek olurdu ve ücreti
  // eksik gösterirdi. NEGATİF bölen ise ayrı — o bir veri hatası, sessizce
  // varsayılana düşmek hatayı gizler; 0 dönüp doğrulama motoruna bırakılıyor.
  const d = Number(divisor) || DEFAULT_DESI_DIVISOR;
  if (d < 0) return 0;

  const desi = (l * w * h) / d;
  if (rounding === "ceil") return Math.ceil(desi);
  if (rounding === "floor") return Math.floor(desi);
  return Math.round(desi * 10000) / 10000;
}

/**
 * Ücretlendirilebilir ağırlık — fiili ve hacimsel ağırlığın BÜYÜĞÜ.
 *
 * @param {number} actualWeightKg
 * @param {number} desi
 * @returns {number}
 */
export function chargeableWeight(actualWeightKg, desi) {
  return Math.max(Number(actualWeightKg) || 0, Number(desi) || 0);
}

/**
 * Sevkiyat toplamları.
 *
 * KRİTİK: ücretlendirilebilir ağırlık PARSEL BAŞINA `max(ağırlık, desi)`
 * alınıp toplanır — `Σ max(w_i, d_i) * qty_i`. Toplamlar üzerinden max almak
 * (`max(Σw, Σd)`) ağır-küçük + hafif-hacimli karışık yükte ücreti EKSİK
 * hesaplar: 20 kg / 2 desi bir koli ile 2 kg / 30 desi bir koli birlikte
 * gerçekte 50 kg ücretlenirken, toplam-max 32 kg gösterir.
 *
 * @param {Array<{length_cm, width_cm, height_cm, weight_kg, qty?, divisor?}>} packages
 * @param {number} [divisor=DEFAULT_DESI_DIVISOR]
 * @returns {{total_weight: number, total_desi: number, chargeable_weight: number, parcel_count: number}}
 */
export function calculateTotals(packages = [], divisor = DEFAULT_DESI_DIVISOR) {
  let totalWeight = 0;
  let totalDesi = 0;
  let chargeable = 0;
  let parcels = 0;

  for (const pkg of packages) {
    const qty = Number(pkg.qty ?? 1) || 0;
    const d = calculateDesi(
      pkg.length_cm,
      pkg.width_cm,
      pkg.height_cm,
      Number(pkg.divisor) || divisor
    );
    const weight = Number(pkg.weight_kg) || 0;

    totalWeight += weight * qty;
    totalDesi += d * qty;
    chargeable += chargeableWeight(weight, d) * qty;
    parcels += qty;
  }

  // Kayan nokta birikimi: 18.5 + 12 + 11.4 → 41.900000000000006. Ekranda
  // tabular-nums ile gösterilirken bu kuyruk görünür ve "hesap bozuk" izlenimi
  // verir. Ağırlıkta 2, desi tam sayı olduğu için toplamı da tam.
  return {
    total_weight: round2(totalWeight),
    total_desi: totalDesi,
    chargeable_weight: round2(chargeable),
    parcel_count: parcels,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
