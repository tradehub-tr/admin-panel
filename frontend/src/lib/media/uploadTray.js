/**
 * Yüzen yükleme tepsisi (C · Yüzen tepsi) — saf hesaplar ve oturum tercihi.
 *
 * Bileşen (`MediaUploadQueue.vue`) bunları kullanır; burada tutulmasının sebebi
 * sayımların ve yüzdenin Vue kurmadan test edilebilmesi.
 */
import { ref } from "vue";
import { phaseTone } from "./status.js";

/** Henüz sonuçlanmamış satırlar: başlıktaki "N dosya işleniyor"un N'i. */
export const ACTIVE_PHASES = [
  "queued",
  "preparing",
  "uploading",
  "uploaded",
  "scanning",
  "processing",
];

/** "Sorunlu" sayılan satırlar — eski özet satırıyla AYNI küme. */
export const ISSUE_PHASES = ["uploadFailed", "blocked", "scanFailed", "processingFailed"];

/** Temizlenebilir satırlar — eski `canClear` politikasıyla aynı. */
export const CLEARABLE_PHASES = ["ready", "cancelled", ...ISSUE_PHASES];

export function trayCounts(phases) {
  return {
    total: phases.length,
    active: phases.filter((p) => ACTIVE_PHASES.includes(p)).length,
    ready: phases.filter((p) => p === "ready").length,
    issues: phases.filter((p) => ISSUE_PHASES.includes(p)).length,
  };
}

/**
 * Satırın genel ilerlemeye katkısı (0-100).
 *
 * Gerçek yüzde yalnız aktarımda var. Sonrası (tarama, hazırlama) süresi
 * bilinmeyen bekleme: sabit kademe veriyoruz ki genel çubuk aktarım bitince
 * %100'e sıçrayıp "bitti" demesin. Sonuçlanan satır (hazır/hatalı/iptal) 100.
 */
export function rowPercent(phase, progress) {
  if (phase === "uploading")
    return progress === null ? 0 : 0.7 * Math.max(0, Math.min(100, Number(progress) || 0));
  if (phase === "queued" || phase === "preparing") return 0;
  if (phase === "uploaded" || phase === "scanning") return 75;
  if (phase === "processing") return 85;
  return 100;
}

/** @param {{phase: string, progress: number|null}[]} rows */
export function overallPercent(rows) {
  if (!rows.length) return 0;
  const sum = rows.reduce((acc, r) => acc + rowPercent(r.phase, r.progress), 0);
  return Math.round(sum / rows.length);
}

/** Küçük resmin üstündeki durum katmanı — her faz tam olarak birine düşer. */
export function overlayFor(phase, progress) {
  if (phase === "uploading") return progress === null ? "spin" : "ring";
  if (phase === "queued") return "queued";
  if (phase === "preparing" || phase === "processing") return "stack";
  if (phase === "uploaded" || phase === "scanning") return "shield";
  if (phase === "ready") return "check";
  if (phase === "blocked") return "lock";
  if (["uploadFailed", "scanFailed", "processingFailed"].includes(phase)) return "error";
  if (phase === "review" || phase === "unverified") return "warn";
  return "cancel";
}

/**
 * Satırın renk tonu (`data-tone`): süren fazlar "active" (mavi etiket), sonuçlanan
 * fazlar `phaseTone`'dan. Renk her zaman metin etiketi + katman simgesiyle birlikte.
 */
export function rowTone(phase) {
  return ACTIVE_PHASES.includes(phase) ? "active" : phaseTone(phase);
}

/** Süresi bilinmeyen beklemede satır altında ince kayan çizgi. */
export function hasShimmer(phase, progress) {
  return (
    ["preparing", "uploaded", "scanning", "processing"].includes(phase) ||
    (phase === "uploading" && progress === null)
  );
}

// ── Oturum tercihi ────────────────────────────────────────────────
// Yalnız masaüstü/tablet küçültme tercihi saklanır. Telefonda tepsi modal bir
// sayfa: sayfa değişince kendiliğinden açılması odak kaçırırdı.
export const COLLAPSE_KEY = "istoc.uploadTray.collapsed";

export function readCollapsed(storage = globalThis.sessionStorage) {
  try {
    const v = storage?.getItem(COLLAPSE_KEY);
    return v === null || v === undefined ? null : v === "1";
  } catch {
    return null;
  }
}

export function writeCollapsed(value, storage = globalThis.sessionStorage) {
  try {
    storage?.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // Gizli pencere / engelli depolama: tercih yalnız bu sayfada yaşar.
  }
}

/**
 * Sayfanın KENDİ tepsisi (ör. ilan formu) açıkken genel tepsi (`ambient`)
 * çekilir: aynı köşede iki tepsi üst üste binmesin.
 */
export const pageTrays = ref(0);

// ── İkinci kaynak: "Medya Yükle" yükleyicisinin ortak kuyruğu ─────
// Tepsi tek bir satır biçimi (medya store'unun `uploads` satırı) konuşur.
// `useMediaUpload` satırları (ITEM_STATUS) bu biçime BURADA çevrilir; böylece
// faz/katman/etiket/sayım/yüzde kuralları iki kaynak için de aynı kalır.
// Kimlik öneki satırın hangi kaynağa ait olduğunu söyler: eylemler
// (dene/iptal/temizle) doğru kuyruğa yönlendirilir.
export const UPLOADER_PREFIX = "mu:";

export const isUploaderRow = (id) => String(id).startsWith(UPLOADER_PREFIX);
export const uploaderItemId = (id) => String(id).slice(UPLOADER_PREFIX.length);

/** Ortak kuyrukta hâlâ süren (temizlemenin dokunmadığı) durumlar. */
export const UPLOADER_ACTIVE = ["queued", "checking", "ready", "preparing", "uploading"];

/** `useMediaUpload` durumu → store satırı durumu (`uploadPhase` bunu okur). */
const UPLOADER_STATUS = {
  queued: "queued",
  ready: "queued",
  checking: "preparing",
  preparing: "preparing",
  uploading: "uploading",
  done: "done",
  failed: "error",
  aborted: "cancelled",
};

function extOf(name) {
  const i = String(name || "").lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toUpperCase() : "";
}

/**
 * `useMediaUpload` satırını tepsinin satır biçimine çevir.
 *
 * - `blocked` (ön kontrol engeli): hata satırı, yeniden denenemez, faz
 *   `blocked`; metin ön kontrol sebebinden (`media.preflight.reason.*`).
 * - `duplicate` (kütüphanede zaten var): karar bekliyor → faz `review` (amber
 *   "!"), metin "yükleyiciden karar verin"; iptal edilebilir (kuyruktan çıkar).
 */
export function fromUploaderItem(it) {
  const row = {
    id: `${UPLOADER_PREFIX}${it.id}`,
    source: "uploader",
    name: it.name,
    bytes: it.size,
    kind: it.kind || "",
    ext: extOf(it.name),
    previewUrl: it.previewUrl || "",
    progress: it.percent || 0,
    progressKnown: it.status === "uploading" ? it.progressKnown === true : false,
    status: UPLOADER_STATUS[it.status] || "queued",
    retryable: it.retryable !== false,
    errorCode: it.errorCode || null,
    errorParams: null,
    error: it.error || null,
    attempt: 0,
    retryAt: 0,
    result: it.result || null,
  };
  if (it.status === "blocked") {
    const block = (it.findings || []).find((f) => f.severity === "block") || {};
    Object.assign(row, {
      status: "error",
      phase: "blocked",
      retryable: false,
      errorCode: block.reason || null,
      errorParams: block.params || null,
    });
  } else if (it.status === "duplicate") {
    Object.assign(row, {
      phase: "review",
      hintKey: "mediaFlow.tray.awaitingDecision",
      cancellable: true,
    });
  }
  return row;
}

/** Tepsinin tek listesi: önce store satırları, ardından yükleyici satırları. */
export function mergeTrayUploads(storeUploads = [], uploaderItems = []) {
  return [...storeUploads, ...uploaderItems.map(fromUploaderItem)];
}
