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
    return "processing";
  if (states.includes("review")) return "review";
  if (scan !== "clean") return "unverified";
  if (
    kind === "document" ||
    (states.length && states.every((s) => s === "ready")) ||
    (kind === "video" && video === "ready")
  )
    return "ready";
  return "uploaded";
}

export function phaseTone(phase) {
  if (["blocked", "uploadFailed"].includes(phase)) return "danger";
  if (["scanFailed", "processingFailed", "review", "unverified"].includes(phase)) return "warning";
  return phase === "ready" ? "success" : "neutral";
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
