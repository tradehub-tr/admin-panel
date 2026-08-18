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

/** @typedef {{level: "error"|"warning"|"info", code: string, message: string, package_code?: string}} Finding */

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

  for (const item of items) {
    const total = packed.get(item.row_id) ?? 0;
    const qty = Number(item.qty) || 0;
    if (total < qty) unpacked.push({ item, remaining: qty - total });
    if (total > qty) over.push({ item, excess: total - qty });
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

    const weight = Number(pkg.weight_kg) || 0;
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

  return { findings, canComplete: errorCount === 0 && packages.length > 0, errorCount, warningCount };
}

/**
 * Kalem başına kolilere atanmış toplam miktar.
 * @returns {Map<string, number>}
 */
export function packedByItem(packages = []) {
  const map = new Map();
  for (const pkg of packages) {
    for (const c of pkg.contents ?? []) {
      map.set(c.shipment_item, (map.get(c.shipment_item) ?? 0) + (Number(c.qty) || 0));
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
      const qty = Number(item.qty) || 0;
      const done = packed.get(item.row_id) ?? 0;
      return {
        ...item,
        packed_qty: done,
        remaining: Math.max(0, qty - done),
        percent: qty ? Math.min(100, (done / qty) * 100) : 0,
        is_scannable: Boolean(String(item.scan_code ?? "").trim()),
      };
    })
    .sort((a, b) => (b.remaining > 0) - (a.remaining > 0));
}

/** Koli özeti — desi ve ücretlendirilebilir ağırlık dahil. */
export function decoratePackages(packages = [], divisor) {
  const total = packages.length;
  return packages.map((pkg, i) => {
    const desi = calculateDesi(pkg.length_cm, pkg.width_cm, pkg.height_cm, divisor);
    const weight = Number(pkg.weight_kg) || 0;
    return {
      ...pkg,
      desi,
      chargeable_kg: chargeableWeight(weight, desi),
      // Sunucu `sequence` üretiyor; yeni koli henüz kaydedilmediği için
      // yoksa index'ten türetiliyor.
      sequence: pkg.sequence ?? i + 1,
      sequence_label: `${pkg.sequence ?? i + 1}/${total}`,
      is_desi_dominant: desi > weight,
    };
  });
}

function dimsFilled(pkg) {
  return [pkg.length_cm, pkg.width_cm, pkg.height_cm].every((v) => (Number(v) || 0) > 0);
}

function nameList(items, limit = 3) {
  const names = items.map((i) => i.item_name || i.row_id);
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} +${names.length - limit}`;
}
