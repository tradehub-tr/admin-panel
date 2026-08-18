// Etiket formatları ve basım kuralları — saf modül.
//
// Format bir SUNUM tercihi değil, fiziksel bir karar: yanlış formatta basılan
// 40 etiket 40 yeniden basım demek. Tek bir "Yazdır" butonu bu kararı gizler.

/** Sözleşmedeki `label_format` değerleri (§1.1). */
export const LABEL_FORMATS = [
  { key: "a4_single", labelKey: "logistics.label.format.a4Single" },
  { key: "a4_quad", labelKey: "logistics.label.format.a4Quad" },
  { key: "thermal_100x150", labelKey: "logistics.label.format.thermal", isDefault: true },
  { key: "zpl", labelKey: "logistics.label.format.zpl" },
];

export const DEFAULT_FORMAT = "thermal_100x150";

const STORAGE_KEY = "logistics.labelFormat";

/**
 * Son seçilen format.
 *
 * Depoda tek tip yazıcı var; her sevkiyatta formatı yeniden seçtirmek boş
 * tekrar. Oturumlar arası da hatırlanıyor — yazıcı değişmiyor.
 */
export function loadFormat() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LABEL_FORMATS.some((f) => f.key === saved) ? saved : DEFAULT_FORMAT;
  } catch {
    // Private mode / kısıtlı depolama — varsayılana düş, ekranı kırma.
    return DEFAULT_FORMAT;
  }
}

export function saveFormat(format) {
  try {
    localStorage.setItem(STORAGE_KEY, format);
  } catch {
    // Yazılamadıysa yalnız hatırlama kaybolur; basım etkilenmez.
  }
}

/**
 * Sözleşmedeki `label_status` değerleri.
 *
 * `icon` RENK YEDEĞİ: beş durumun dördü yalnız tonla ayrışıyordu ve renk
 * körlüğünde "Üretildi" ile "Basıldı" aynı görünüyor — basılmış sanılan
 * etiketsiz koli kargo şubesinden geri dönüyor. İkon ton kaybolduğunda da
 * duruyor.
 */
export const LABEL_STATUS = {
  None: { tone: "neutral", icon: "✕", labelKey: "logistics.label.status.none" },
  Generated: { tone: "info", icon: "◷", labelKey: "logistics.label.status.generated" },
  Printed: { tone: "success", icon: "✓", labelKey: "logistics.label.status.printed" },
  Voided: { tone: "danger", icon: "⊘", labelKey: "logistics.label.status.voided" },
  Stale: { tone: "warning", icon: "↻", labelKey: "logistics.label.status.stale" },
};

export function statusOf(pkg) {
  return pkg?.label?.status || "None";
}

/**
 * Yeniden basımda gerekçe sorulacak mı? — **D2 kararı.**
 *
 * İlk basım normal iş akışı; her koliye gerekçe sormak sürtünme ekler.
 * İkinci basım anormal: aynı etiketin iki kopyası kargo şubesinde çift kayıt
 * riski taşıyor. Durdurulacak yer orası.
 *
 * Sunucu her iki hâli de kabul ediyor (`reason` null gelebilir); zorunluluğu
 * ekran uyguluyor.
 */
export function needsReprintReason(pkg) {
  return (pkg?.label?.print_count ?? 0) >= 1;
}

export const REPRINT_REASONS = [
  { key: "damaged", labelKey: "logistics.label.reason.damaged" },
  { key: "lost", labelKey: "logistics.label.reason.lost" },
  { key: "wrong_format", labelKey: "logistics.label.reason.wrongFormat" },
  { key: "other", labelKey: "logistics.label.reason.other" },
];

/**
 * Sevkiyat etiket açısından sevke hazır mı?
 *
 * Etiketsiz ya da iptal edilmiş koli varken sevkiyat "hazır" işaretlenemez —
 * kargo şubesi o koliyi kabul etmez.
 */
export function labelReadiness(packages = []) {
  const missing = packages.filter((p) => {
    const s = statusOf(p);
    return s === "None" || s === "Voided";
  });
  const stale = packages.filter((p) => statusOf(p) === "Stale");
  return {
    missing,
    stale,
    isReady: packages.length > 0 && missing.length === 0 && stale.length === 0,
  };
}
