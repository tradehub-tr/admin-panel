/**
 * Kullanıcı için BİTMİŞ ama türevleri (görünüm kopyaları / Media Asset) henüz
 * doğrulanmamış dosya: yüklendi + güvenlik taraması temiz. Satıcı için iş
 * bitti — tepsi bunu "hazır" sayar, %100 gösterir, ilerleme çizgisi çizmez;
 * yalnız nötr bir ikinci satır türevlerin arka planda sürdüğünü söyler.
 * Yerleşim önizlemesi (`ready`) gibi türev isteyen akışlar bunu hazır SAYMAZ.
 * Neden: prod'da türev kuyruğu yokken tepsi sonsuza dek %75'te kalıyordu
 * (2026-10-02).
 */
export const READY_BACKGROUND = "readyBackground";

/** Kullanıcının işi bitmiş fazlar (tepsi sayımı, yüzde, temizleme). */
export const DONE_FOR_USER_PHASES = ["ready", READY_BACKGROUND];

/** Server facts only: HTTP completion is not media readiness. */
export function mediaPhase(facts, kind = "image") {
  if (!facts) return "uploaded";
  const scan = facts.scan_status ?? facts.scanStatus ?? "";
  if (scan === "infected") return "blocked";
  if (scan === "failed") return "scanFailed";
  if (scan === "pending") return "scanning";
  const video = facts.video_status ?? facts.videoStatus ?? "";
  const states = facts.asset_states || [];
  if (video === "failed" || states.some((s) => ["failed", "rejected", "aborted"].includes(s)))
    return "processingFailed";
  if (
    video === "processing" ||
    states.some((s) => ["draft", "pending", "validating", "processing", "reprocessing"].includes(s))
  )
    // Temiz taramadan sonra hazırlama arka plan işidir; kullanıcı için bitti.
    return scan === "clean" ? READY_BACKGROUND : "processing";
  if (states.includes("review")) return "review";
  if (scan !== "clean") return "unverified";
  if (
    kind === "document" ||
    (states.length && states.every((s) => s === "ready")) ||
    (kind === "video" && video === "ready")
  )
    return "ready";
  // Temiz tarama + türev henüz yok / sürüyor: kullanıcı için bitti.
  return READY_BACKGROUND;
}

export function phaseTone(phase) {
  if (["blocked", "uploadFailed"].includes(phase)) return "danger";
  if (["scanFailed", "processingFailed", "review", "unverified"].includes(phase)) return "warning";
  return DONE_FOR_USER_PHASES.includes(phase) ? "success" : "neutral";
}

export function uploadedKey(item) {
  const r = item.result || {};
  return r.name || r.file || r.file_url || item.fileUrl || "";
}

export function uploadPhase(item, facts) {
  if (item.status === "done") return mediaPhase(facts, item.kind);
  if (item.status === "cancelled") return "cancelled";
  if (item.status === "error") return "uploadFailed";
  if (item.status === "preparing") return "preparing";
  if (["queued", "retrying"].includes(item.status)) return "queued";
  return "uploading";
}

// Report only measured byte reduction; an equal/larger file is no saving.
export function byteReduction(before, after) {
  if (!(before > 0 && after > 0 && after < before)) return null;
  return Math.floor((1 - after / before) * 100);
}
