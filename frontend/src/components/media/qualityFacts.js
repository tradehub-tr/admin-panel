/**
 * Kalite sekmesinin DPI / renk uzayı / şeffaflık hücreleri — saf biçimleyici.
 *
 * Değerler iki DOSYANIN kendisinden ölçülür (arka taraf:
 * `tradehub_core/media/image_facts.py`):
 *   - Kaynak → `manifest_batch` yanıtının `source` anahtarı
 *     (`{status, dpi, colorspace, has_alpha}`).
 *   - Sonuç → türev satırının `dpi / colorspace / hasAlpha` alanları
 *     (`useMediaRenditions` `output_*` alanlarını bu adlara çevirir).
 *
 * Kurallar (uydurma yok):
 *   - DPI 0 = "dosyada DPI kaydı yok" — bu bir ÖLÇÜM SONUCUDUR, "—" değil.
 *   - Renk uzayı "RGB" = gömülü ICC profili olmayan (etiketsiz) RGB; sRGB
 *     olduğu iddia edilmez.
 *   - "—" yalnız dosya okunamadığında, diskte olmadığında ya da henüz
 *     ölçülmemişken çıkar; hücrenin `title`ı nedenini söyler.
 */

export const DASH = "—";

/**
 * `manifest.source` → ortak künye biçimi.
 * @param {null | {status?: string, dpi?: number, colorspace?: string, has_alpha?: boolean}} source
 * @param {(key: string) => string} t
 */
export function sourceFacts(source, t) {
  if (!source) return { ok: false, reason: t("media.quality.facts.notMeasured") };
  if (source.status !== "ok") {
    return {
      ok: false,
      reason:
        source.status === "missing"
          ? t("media.quality.facts.missing")
          : t("media.quality.facts.unreadable"),
    };
  }
  return {
    ok: true,
    dpi: Number(source.dpi) || 0,
    colorspace: source.colorspace || "",
    hasAlpha: Boolean(source.has_alpha),
  };
}

/**
 * Türev satırı → ortak künye biçimi. Boş renk uzayı = henüz ölçülmedi.
 * @param {null | {dpi?: number, colorspace?: string, hasAlpha?: boolean}} row
 * @param {(key: string) => string} t
 */
export function renditionFacts(row, t) {
  if (!row) return { ok: false, reason: "" };
  if (!row.colorspace) return { ok: false, reason: t("media.quality.facts.notMeasured") };
  return {
    ok: true,
    dpi: Number(row.dpi) || 0,
    colorspace: row.colorspace,
    hasAlpha: Boolean(row.hasAlpha),
  };
}

/** @returns {{text: string, title: string}} */
export function dpiCell(f, t) {
  if (!f.ok) return { text: DASH, title: f.reason || "" };
  if (f.dpi > 0) return { text: String(f.dpi), title: "" };
  return { text: t("media.quality.facts.dpiNone"), title: t("media.quality.facts.dpiNoneHint") };
}

/** @returns {{text: string, title: string}} */
export function colorCell(f, t) {
  if (!f.ok || !f.colorspace) return { text: DASH, title: f.reason || "" };
  if (f.colorspace === "RGB") {
    return {
      text: t("media.quality.facts.untaggedRgb"),
      title: t("media.quality.facts.untaggedRgbHint"),
    };
  }
  if (f.colorspace === "Gray") return { text: t("media.quality.facts.gray"), title: "" };
  return { text: f.colorspace, title: "" };
}

/** @returns {{text: string, title: string}} */
export function alphaCell(f, t) {
  if (!f.ok) return { text: DASH, title: f.reason || "" };
  return {
    text: f.hasAlpha ? t("media.quality.facts.alphaYes") : t("media.quality.facts.alphaNo"),
    title: "",
  };
}

/**
 * Üç karşılaştırma satırı — tablo `facts` dizisine eklenir.
 * @returns {Array<{key: string, source: string, sourceTitle: string, result: string, resultTitle: string}>}
 */
export function factRows(src, res, t) {
  return [
    ["dpi", dpiCell],
    ["colorSpace", colorCell],
    ["alpha", alphaCell],
  ].map(([key, cell]) => {
    const a = cell(src, t);
    const b = cell(res, t);
    return { key, source: a.text, sourceTitle: a.title, result: b.text, resultTitle: b.title };
  });
}
