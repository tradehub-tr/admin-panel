import { roundWindow } from "./geometry.js";
import { getSlot, slotProfiles } from "./slotProfiles.js";

/**
 * Politika uyarıları — Crop Studio **kendi kural setini yazmaz**, sarar.
 *
 * Eşikler slot politikalarından (`vendor/slot_profiles.js`) ve boru hattının
 * ölçülmüş gerçeklerinden gelir. Geometri politikasızdır: bu dosyadaki hiçbir
 * kural `crop_geometry` içine SIZMAZ.
 *
 * **"Engelle" yalnız tek durumda:** kırpma sonucu profilin gerektirdiği piksel
 * sayısını üretemiyorsa. Kalanı uyarıdır — kullanıcıyı kendi görselinden
 * kilitlemek, uyumsuz bir görselden kötüdür (faz10-crop-studio.md §7).
 */

export const SEVERITY = { BLOCK: "block", WARN: "warn", INFO: "info" };

/** 20 MP üstü kaynak: ölçüm 179 dosya. Tarayıcıda bellek/çözme maliyeti. */
export const BIG_SOURCE_MP = 20;

/**
 * Güvenli alan — politikanın `content_rules` bloğundan, hesapla değil.
 *
 * Bu sayı "teslim edilen görselin, en dar canlı kutuda kesin görünen orta
 * kesiti"dir. `object-fit: cover` ile oranı R olan görsel oranı B olan kutuda
 * gösterilirken bir eksende kırpılır; politikanın kendi `source` alanı bu
 * hesabı ve ölçüldüğü render noktalarını yazıyor.
 *
 * | Slot | Kural | Eşik | Eksen |
 * |---|---|---|---|
 * | `company.cover_image` | `safe_area_center_width_fraction` | 0,417 | yalnız YATAY — kutu oranı (2,00…4,80) hedefin (4,80) altında kaldığı için kırpma daima yatayda |
 * | `category.banner` | `safe_area_center_fraction` | 0,42 | HER İKİ eksen — bento kutusu 0,82:1 ile 4,68:1 arasında değişiyor, kırpma yöne göre değişiyor |
 *
 * **Sayı burada YENİDEN HESAPLANMADI**, politikadan kopyalandı;
 * `__tests__/cropSafeArea.test.js` her koşuda canlı politika dosyasıyla
 * karşılaştırır ve kaynak deposu ortamda yoksa "geçti" demez, sebebini
 * yazarak atlar. Kalan yedi slotta güvenli alan kuralı YOK — o slotlarda bu
 * uyarı üretilmez, uydurulmuş bir eşik konmaz.
 *
 * Uyarı `action: "warn"`tır (politikada da öyle) — engel DEĞİL. Kullanıcının
 * kendi görselinden kilitlenmesi, dar ekranda kenarı kesilen bir bandtan
 * kötüdür.
 */
export const SAFE_BAND = {
  "company.cover_image": {
    rule: "safe_area_center_width_fraction",
    fraction: 0.417,
    axis: "x",
  },
  "category.banner": {
    rule: "safe_area_center_fraction",
    fraction: 0.42,
    axis: "both",
  },
};

/** Slotun güvenli alan bandı ya da `null`. */
export function safeBandFor(slotKey) {
  return SAFE_BAND[slotKey] || null;
}

/**
 * Odak noktasının kadraj içindeki göreli konumu (0-1), eksen başına.
 *
 * Odak kadrajın DIŞINDA olabilir: kenar sıkıştırma devredeyken kullanıcı
 * odağı köşeye taşısa da pencere sınırda durur. Bu yüzden değer
 * kelepçelenmez — dışarıda kalması uyarının ta kendisidir.
 *
 * @returns {{x:number, y:number}|null}
 */
export function focalInWindow(focal, win, sourceW, sourceH) {
  if (!focal || !win || !(win.w > 0) || !(win.h > 0)) return null;
  const fx = Number(focal.x);
  const fy = Number(focal.y);
  if (!Number.isFinite(fx) || !Number.isFinite(fy)) return null;
  return { x: (fx * sourceW - win.x) / win.w, y: (fy * sourceH - win.y) / win.h };
}

/**
 * @param {object}      p
 * @param {number}      p.sourceW
 * @param {number}      p.sourceH
 * @param {object|null} p.win       Mevcut kadraj penceresi (kaynak pikseli).
 * @param {string}      p.slotKey
 * @param {object|null} [p.probe]   Sunucudan gelen sonda: `{ mode, hasAlpha }`.
 *                                  Yoksa o iki uyarı ÜRETİLMEZ — uydurulmaz.
 * @param {boolean}     [p.slotMismatch] Dosya bu slota ait değil (rapordan gelir).
 * @param {object|null} [p.focal]      `{x, y}` 0-1 normalize odak. Yoksa güvenli
 *                                     alan uyarısı ÜRETİLMEZ — konum bilinmeden
 *                                     "bandın dışında" denemez.
 * @param {object|null} [p.suggestion] Uygulanmış otomatik öneri; eşiğin kalibre
 *                                     edilmediği bilgisi buradan gelir.
 * @returns {Array<{id:string, severity:string, params:object}>}
 */
export function cropWarnings({
  sourceW,
  sourceH,
  win,
  slotKey,
  probe = null,
  slotMismatch = false,
  focal = null,
  suggestion = null,
}) {
  const out = [];
  const slot = getSlot(slotKey);
  const profiles = slotProfiles(slotKey);
  const croppable = profiles.filter((p) => p.croppable);

  // ── ENGELLE: kırpma sonucu profilin istediği pikseli üretemiyor ──
  if (win) {
    const [, , w, h] = roundWindow(win, sourceW, sourceH);
    for (const p of croppable) {
      if (w >= p.width && h >= p.height) continue;
      out.push({
        id: "tooSmallForProfile",
        severity: SEVERITY.BLOCK,
        params: { profile: p.name, need: `${p.width}×${p.height}`, got: `${w}×${h}` },
      });
    }
    // Politikanın kısa kenar şartı da kadrajdan sonra geçerli.
    if (slot?.minShortEdge && Math.min(w, h) < slot.minShortEdge) {
      out.push({
        id: "shortEdge",
        severity: SEVERITY.BLOCK,
        params: { need: slot.minShortEdge, got: Math.min(w, h) },
      });
    }
  }

  // ── UYAR ──
  const mp = (sourceW * sourceH) / 1_000_000;
  if (mp > BIG_SOURCE_MP) {
    out.push({
      id: "bigSource",
      severity: SEVERITY.WARN,
      params: { mp: mp.toFixed(1), limit: BIG_SOURCE_MP },
    });
  }
  if (probe?.mode === "CMYK") {
    out.push({ id: "cmyk", severity: SEVERITY.WARN, params: {} });
  }
  if (probe?.hasAlpha && profiles.some((p) => p.formats?.includes("jpeg"))) {
    out.push({
      id: "alphaToJpeg",
      severity: SEVERITY.WARN,
      params: { profiles: profiles.filter((p) => p.formats?.includes("jpeg")).length },
    });
  }
  if (slotMismatch) {
    out.push({ id: "slotMismatch", severity: SEVERITY.WARN, params: { slot: slotKey } });
  }

  // ── UYAR: güvenli alan (politikanın `guvenli_alan_disi` kuralı) ──
  const band = safeBandFor(slotKey);
  const rel = band ? focalInWindow(focal, win, sourceW, sourceH) : null;
  if (band && rel) {
    const yari = band.fraction / 2;
    const disari = [];
    if (Math.abs(rel.x - 0.5) > yari) disari.push("x");
    if (band.axis === "both" && Math.abs(rel.y - 0.5) > yari) disari.push("y");
    if (disari.length) {
      out.push({
        id: "safeBand",
        severity: SEVERITY.WARN,
        params: {
          pct: Math.round(band.fraction * 100),
          axis: disari.join("+"),
          rule: band.rule,
        },
      });
    }
  }

  // ── BİLGİ ──
  if (band) {
    out.push({
      id: "safeBandActive",
      severity: SEVERITY.INFO,
      params: { pct: Math.round(band.fraction * 100), axis: band.axis },
    });
  }

  // Öneri devredeyken eşiğin ÖLÇÜLMEDİĞİ söylenir. Rozette "güven %89" yazıp
  // o yüzdenin karşılaştırıldığı eşiğin kalibre edilmediğini söylememek,
  // sayıya hak etmediği bir yetke vermek olurdu (T-103 bitirme koşulu).
  if (suggestion && suggestion.thresholdCalibrated === false) {
    out.push({
      id: "suggestionUncalibrated",
      severity: SEVERITY.INFO,
      params: {
        threshold: Number(suggestion.threshold ?? 0.5).toFixed(2),
        source: suggestion.source || "client",
        reason: suggestion.reason || "",
        measured: suggestion.measured ? 1 : 0,
      },
    });
  }

  const notCropped = profiles.length - croppable.length;
  if (notCropped > 0) {
    out.push({
      id: "notCropped",
      severity: SEVERITY.INFO,
      params: { count: notCropped, total: profiles.length },
    });
  }
  for (const p of croppable) {
    if (!p.labelMisleading) continue;
    out.push({
      id: "ratioFromSize",
      severity: SEVERITY.INFO,
      params: {
        profile: p.name,
        label: p.ratioLabel,
        real: (p.width / p.height).toFixed(5),
        size: `${p.width}×${p.height}`,
      },
    });
  }

  return out;
}

/** Kaydetmeyi durduran bir bulgu var mı. */
export function hasBlocker(warnings) {
  return warnings.some((w) => w.severity === SEVERITY.BLOCK);
}
