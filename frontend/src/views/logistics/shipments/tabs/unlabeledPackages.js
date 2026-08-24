// Etiketsiz koli yüklemi — TEK kaynak (SOLID denetimi, 2026-08-24).
//
// Aynı soru iki yerde cevaplanıyor: sekme rozet uyarısı (kayıt defterindeki
// `alert`) ve sekme içi banner (ShipmentPackagesTab). İki kopya birbirinden
// kaymıştı: rozet `"label_url" in p` korumasını taşıyor, banner taşımıyordu —
// alanı hiç taşımayan yanıtta rozet susup banner yanıyordu. Yüklem artık
// burada, iki tüketici de bunu çağırıyor.
//
// KORUMA GEREKÇESİ (kayıt defterinden taşındı):
//   Etiketi olmayan koli uyarısı — ama alan HİÇ taşınmıyorsa uyarı YOK.
//   `label_url` sözleşmede var, gerçek `Shipment Package` şemasında yok.
//   Sadece `!p.label_url` saymak, alanı taşımayan her yanıtta uyarıyı
//   kalıcı olarak yakardı ve uyarı anlamını yitirirdi. Alanı taşıyan en
//   az bir koli varsa kıyas anlamlı; hiçbiri taşımıyorsa bilinmiyordur.
//
// ÖLÇÜT ŞEMA DENETİMİNDEN SONRAKİ URL (QA denetimi 2026-08-24):
//   Kart, bağlantıyı `safeExternalUrl(pkg.label_url)` sonucuna göre çiziyor;
//   banner ve sekme rozeti ise HAM `label_url`e bakıyordu. Beyaz listeden
//   geçemeyen bir değerde (örn. `javascript:` ya da bozuk şema) kart
//   "etiketsiz" davranıp "Etiket üret" butonu gösterirken banner o koliyi
//   HİÇ saymıyordu — üç yüzey aynı soruya iki farklı cevap veriyordu.
//   Ölçüt artık tek: bağlantı ÇİZİLEBİLİYOR mu?
//
// Göreli ve uzantılı import: bu modülü `shipmentTabRegistry.js` üzerinden
// `node --test` de yüklüyor, `@/` alias'ı orada çözülmez.
import { safeExternalUrl } from "../../../../utils/sanitize.js";

/**
 * Etiketi olmayan kolileri döndürür.
 *
 * `label_url` alanını taşıyan en az bir koli yoksa BOŞ liste döner —
 * "bilinmiyor" ile "etiketsiz" aynı şey değil (yukarıdaki gerekçe).
 *
 * @param {Array<object>} packages Sevkiyatın kolileri.
 * @returns {Array<object>} Etiketsiz koliler (ya da bilinmiyorsa boş liste).
 */
export function unlabeledPackages(packages = []) {
  if (!packages.some((p) => "label_url" in p)) return [];
  return packages.filter((p) => !safeExternalUrl(p.label_url));
}

/** Rozet/alert için kısa yüklem: etiketsiz koli VAR mı? */
export const hasUnlabeledPackages = (packages = []) => unlabeledPackages(packages).length > 0;
