// Paketleme doğrulama motoru — saf fonksiyon.
//
// NE İŞE YARIYOR:
//   Operatör "Paketlemeyi tamamla"ya basmadan ÖNCE neyin eksik olduğunu
//   söyler. Sunucu aynı kuralları tekrar uyguluyor (sözleşme §2.3) ve otorite
//   orada — buradaki kopya, hatayı kaydın SONRASINA değil ÖNCESİNE almak için.
//
// NEDEN AYRI DOSYA:
//   Üç ekran birden okuyor (çalışma alanı, kuyruk kovası, etiket önkoşulu) ve
//   `node:test` ile Vue olmadan sınanabiliyor. Kural bir sözleşme maddesi;
//   bileşenin içine gömülürse test edilemez ve sessizce kayar.
//
// SEVİYELER:
//   error   → "Paketlemeyi tamamla" KAPALI. Taslak yine de kaydedilebilir:
//             depoda iş yarım kalır, kaydetmeyi engellemek işi kaybettirir.
//   warning → Tamamlamayı engellemez. Operatör bilerek aşabilir; kapasite
//             sınırı taşıyıcıyla pazarlık konusu olabiliyor.
//   info    → Bilgi. Sonuç doğurmaz.

// `@/` alias node:test tarafından çözülemiyor; saf modüller (api/shipmentEnvelope.js
// deseni) relative import kullanıyor ki Vue olmadan sınanabilsinler.
import { calculateDesi, chargeableWeight } from "../../../utils/desi.js";
import { toFiniteNumber } from "../../../utils/format.js";

/** @typedef {{level: "error"|"warning"|"info", code: string, message: string, package_code?: string}} Finding */

/**
 * Miktar karşılaştırma toleransı (`utils/desi.js:round2` emsali, ama miktar
 * ondalıklı olabildiği için 6 hane).
 *
 * NEDEN VAR (QA denetimi, 2026-08-28 — YANLIŞ ENGEL):
 *   İkili kayan nokta 0,1 + 0,2 = 0,30000000000000004 veriyor. Ölçüldü: 0,3 m
 *   kabloyu 0,1 + 0,2 diye İKİ koliye doğru bölen operatöre ekran
 *   "kolilere sevk miktarından 5.551115123125783e-17 m fazla atanmış" yazıp
 *   `canComplete`i kapatıyordu — hata anlamsız, düzeltmenin yolu yok.
 *   Sevkiyat miktarları en fazla birkaç ondalık taşıyor; 1e-6 altındaki fark
 *   veri değil gürültü.
 */
export const QTY_EPSILON = 1e-6;

/** Miktarı gürültü basamaklarından arındırır — operatöre bu sayı gösteriliyor. */
function roundQty(n) {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * İki miktarı TOLERANSLA karşılaştırır: -1 / 0 / +1.
 *
 * Tüm miktar karşılaştırmaları (eksik, fazla, yüzde tavanı) buradan geçiyor —
 * `Math.min(100, …)` gibi nokta çözümleri aynı kökten dallanıyordu.
 */
function compareQty(a, b, eps = QTY_EPSILON) {
  const diff = a - b;
  if (Math.abs(diff) <= eps) return 0;
  return diff < 0 ? -1 : 1;
}

/**
 * Taslağı doğrular.
 *
 * @param {object} params
 * @param {Array}  params.items         sevkiyat kalemleri (`qty`, `row_id`, `item_name`, `uom`)
 * @param {Array}  params.packages      koliler (`contents`, ölçüler, `weight_kg`, `package_type`)
 * @param {Array}  [params.packageTypes] `Package Type` kataloğu — limit kontrolü için
 * @param {number} [params.divisor]     desi böleni (yükten)
 * @returns {{findings: Finding[], canComplete: boolean, errorCount: number, warningCount: number}}
 */
export function validatePacking({ items = [], packages = [], packageTypes = [], divisor } = {}) {
  const findings = [];
  const typeMap = new Map(packageTypes.map((t) => [t.name, t]));

  if (!packages.length) {
    findings.push({
      level: "error",
      code: "NO_PACKAGE",
      message: "Hiç koli oluşturulmamış.",
    });
  }

  // ── Kalem tarafı ───────────────────────────────────────────────────
  const packed = packedByItem(packages);
  const unpacked = [];
  const over = [];
  const unknownQty = [];

  for (const item of items) {
    const total = packed.get(item.row_id) ?? 0;
    const qty = toFiniteNumber(item.qty);
    if (qty === null) {
      unknownQty.push(item);
      continue;
    }
    const cmp = compareQty(total, qty);
    if (cmp < 0) unpacked.push({ item, remaining: roundQty(qty - total) });
    if (cmp > 0) over.push({ item, excess: roundQty(total - qty) });
  }

  // Miktarı ÇÖZÜLEMEYEN kalem (QA denetimi, 2026-08-28 — SESSİZ VERİ BOZULMASI):
  // eski kod `Number(item.qty) || 0` yazıyordu, yani `null`/`""`/`"abc"` hepsi
  // 0 oluyordu; `0 < 0` false olduğu için kalem HİÇ paketlenmemişken bulgu
  // üretilmiyor ve `canComplete` TRUE dönüyordu. Ölçüldü: iki kalemli bir
  // sevkiyatta ikincisinin miktarı boşken bulgu sayısı 0. Bilinmeyen miktar
  // doğrulanamaz — engel.
  if (unknownQty.length) {
    findings.push({
      level: "error",
      code: "UNKNOWN_QTY",
      message: `${unknownQty.length} kalemin miktarı okunamadı, paketleme doğrulanamıyor: ${nameList(unknownQty)}`,
    });
  }

  if (unpacked.length) {
    findings.push({
      level: "error",
      code: "UNPACKED_ITEMS",
      message: `${unpacked.length} kalem paketlenmedi: ${nameList(unpacked.map((u) => u.item))}`,
    });
  }

  // Sunucu bunu `VALIDATION_FAILED` ile reddediyor. Burada yakalamak, kaydet
  // tuşuna basıp hata almaktan hızlı.
  for (const { item, excess } of over) {
    findings.push({
      level: "error",
      code: "OVER_ASSIGNED",
      message: `${item.item_name}: kolilere sevk miktarından ${excess} ${item.uom || "birim"} fazla atanmış.`,
    });
  }

  // ── Koli tarafı ────────────────────────────────────────────────────
  packages.forEach((pkg, index) => {
    const code = pkg.package_code || `#${index + 1}`;

    if (!(pkg.contents ?? []).length) {
      findings.push({
        level: "error",
        code: "EMPTY_PACKAGE",
        package_code: code,
        message: `${code} boş — içerik atanmamış.`,
      });
    }

    // Aynı kalem bir kolide iki satır: sunucu reddediyor, toplam da yanlış
    // okunur ("120 + 80" yerine kullanıcı yalnız birini görür).
    const seen = new Set();
    for (const c of pkg.contents ?? []) {
      if (seen.has(c.shipment_item)) {
        findings.push({
          level: "error",
          code: "DUPLICATE_CONTENT",
          package_code: code,
          message: `${code}: aynı kalem birden fazla satırda.`,
        });
        break;
      }
      seen.add(c.shipment_item);
    }

    // Bilinmeyen ağırlık 0'a düşüyor ve hemen altındaki NO_WEIGHT engeline
    // takılıyor — "güvenli tarafa" düşen tek yer burası.
    const weight = toFiniteNumber(pkg.weight_kg) ?? 0;
    if (weight <= 0) {
      findings.push({
        level: "error",
        code: "NO_WEIGHT",
        package_code: code,
        message: `${code} ağırlığı girilmemiş.`,
      });
    }

    if (!dimsFilled(pkg)) {
      findings.push({
        level: "error",
        code: "NO_DIMENSIONS",
        package_code: code,
        message: `${code} ölçüleri eksik — desi hesaplanamıyor.`,
      });
    }

    const type = typeMap.get(pkg.package_type);
    if (type) {
      const desi = calculateDesi(pkg.length_cm, pkg.width_cm, pkg.height_cm, divisor);
      if (type.max_weight_kg > 0 && weight > type.max_weight_kg) {
        findings.push({
          level: "warning",
          code: "OVER_TYPE_WEIGHT",
          package_code: code,
          message: `${code} · ${type.package_name || type.name} ağırlık sınırını aşıyor (max ${type.max_weight_kg} kg, girilen ${weight} kg).`,
        });
      }
      if (type.max_desi > 0 && desi > type.max_desi) {
        findings.push({
          level: "warning",
          code: "OVER_TYPE_DESI",
          package_code: code,
          message: `${code} · ${type.package_name || type.name} desi sınırını aşıyor (max ${type.max_desi}, hesaplanan ${desi}).`,
        });
      }
    }

    // Etiket üretildikten sonra koli değişmişse eski etiket yanlış ağırlık ve
    // yanlış X/Y taşır. Sunucu `content_hash` ile `Stale` işaretliyor.
    if (pkg.label?.status === "Stale" || pkg.label?.status === "stale") {
      findings.push({
        level: "warning",
        code: "LABEL_STALE",
        package_code: code,
        message: `${code} etiketi koli değiştikten sonra yenilenmemiş — yeniden üretilmeli.`,
      });
    }
  });

  const errorCount = findings.filter((f) => f.level === "error").length;
  const warningCount = findings.filter((f) => f.level === "warning").length;

  return {
    findings,
    canComplete: errorCount === 0 && packages.length > 0,
    errorCount,
    warningCount,
  };
}

/**
 * Kalem başına kolilere atanmış toplam miktar.
 * @returns {Map<string, number>}
 */
export function packedByItem(packages = []) {
  const map = new Map();
  for (const pkg of packages) {
    for (const c of pkg.contents ?? []) {
      // Bilinmeyen içerik miktarı 0 sayılıyor — sonuç GÜVENLİ tarafa düşüyor:
      // kalem eksik paketlenmiş görünür ve UNPACKED_ITEMS engeli açılır.
      // (Kalemin KENDİ miktarı bilinmiyorsa ayrı bir engel var: UNKNOWN_QTY.)
      const qty = toFiniteNumber(c.qty) ?? 0;
      map.set(c.shipment_item, roundQty((map.get(c.shipment_item) ?? 0) + qty));
    }
  }
  return map;
}

/**
 * Ekranda gösterilecek kalem satırları — paketlenmemişler ÜSTTE.
 *
 * Operatör "sırada ne var" diye bakıyor; tamamlananların arasında kalanı
 * aramak 40 kalemlik listede zaman kaybettirir.
 */
export function buildItemRows(items = [], packages = []) {
  const packed = packedByItem(packages);
  return items
    .map((item) => {
      // `Number(item.qty) || 0` idi: boş/bozuk miktar 0 olunca satır
      // "tamamlandı" görünüp listenin DİBİNE düşüyordu (QA denetimi
      // 2026-08-28). Artık ayrı bir durum ve dikkat isteyenlerle birlikte
      // ÜSTTE duruyor; engeli `validatePacking` UNKNOWN_QTY ile koyuyor.
      const qty = toFiniteNumber(item.qty);
      const done = packed.get(item.row_id) ?? 0;
      const known = qty !== null;
      return {
        ...item,
        packed_qty: done,
        qty_known: known,
        // Sayı kalıyor (0): `remaining` ekranlarda `> 0`, `:max` ve
        // `Math.min` ile kullanılıyor, `null` oraları NaN'a çevirirdi.
        remaining: known ? Math.max(0, roundQty(qty - done)) : 0,
        percent: known ? packedPercent(done, qty) : 0,
        is_scannable: Boolean(String(item.scan_code ?? "").trim()),
      };
    })
    .sort((a, b) => needsAttention(b) - needsAttention(a));
}

/** Sıralama anahtarı — eksik VE miktarı bilinmeyen satırlar üstte. */
function needsAttention(row) {
  return Number(!row.qty_known || row.remaining > 0);
}

/**
 * Paketlenme yüzdesi — tavan 100, sıfıra bölme yok.
 *
 * `Math.min(100, …)` nokta çözümüydü: 0,1 + 0,2 / 0,3 hesabı 100,000000001
 * veriyor ve kırpılıyordu. Tavan artık toleranslı karşılaştırmadan geliyor,
 * yani "tam paketlenmiş" satır TAM 100 oluyor.
 */
function packedPercent(done, qty) {
  if (qty <= 0) return 0;
  if (compareQty(done, qty) >= 0) return 100;
  return roundQty((done / qty) * 100);
}

/** Koli özeti — desi ve ücretlendirilebilir ağırlık dahil. */
export function decoratePackages(packages = [], divisor) {
  const total = packages.length;
  return packages.map((pkg, i) => {
    const desi = calculateDesi(pkg.length_cm, pkg.width_cm, pkg.height_cm, divisor);
    const known = toFiniteNumber(pkg.weight_kg);
    const weight = known ?? 0;
    return {
      ...pkg,
      desi,
      weight_known: known !== null,
      chargeable_kg: chargeableWeight(weight, desi),
      // Sunucu `sequence` üretiyor; yeni koli henüz kaydedilmediği için
      // yoksa index'ten türetiliyor.
      sequence: pkg.sequence ?? i + 1,
      sequence_label: `${pkg.sequence ?? i + 1}/${total}`,
      // Ağırlık BİLİNMİYORSA "desi baskın" İDDİA EDİLMİYOR: eski kod boş
      // ağırlığı 0 sayıp her koliyi desi-baskın gösteriyordu (etikette ve
      // koli kartında amber vurgu). Bilinmeyen ağırlığın engeli NO_WEIGHT.
      is_desi_dominant: known !== null && desi > weight,
    };
  });
}

function dimsFilled(pkg) {
  return [pkg.length_cm, pkg.width_cm, pkg.height_cm].every((v) => (toFiniteNumber(v) ?? 0) > 0);
}

function nameList(items, limit = 3) {
  const names = items.map((i) => i.item_name || i.row_id);
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} +${names.length - limit}`;
}
