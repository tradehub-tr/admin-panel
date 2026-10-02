// Toplu içe aktarma / feed çalıştırma sonuçları için "kısmi başarı" eşiği.
//
// Aynı mantık birden çok ekranda kullanılır (içe aktarma detay banner'ı, satıcı
// feed geçmişi, admin feed izleme) — tek kaynak burası olsun ki "dosya işlendi
// ≠ hepsi başarılı" vurgusu her yerde aynı eşiğe dayansın.
//
// Durum string'leri ekranlar arası farklı kasayla gelebilir:
//   - İçe aktarma job state: "completed" / "partial" / "failed"
//   - Feed run status:       "success" / "partial" / "error"
//   - Admin feed last_status:"Success" / "Partial" / "Failed"
// Bu yüzden karşılaştırma öncesi lowercase'e normalize edilir.

const PARTIAL_STATES = new Set(["partial"]);
const FAILED_STATES = new Set(["failed", "error"]);

export function normalizeState(state) {
  return String(state || "").toLowerCase();
}

export function isPartial(state) {
  return PARTIAL_STATES.has(normalizeState(state));
}

export function isFailed(state) {
  return FAILED_STATES.has(normalizeState(state));
}

// Kullanıcıya "yükleme tamamen başarılı değil" uyarısı gösterilmeli mi?
// Kısmi VEYA hatalı durum, ya da en az bir hatalı satır varsa true.
export function isIncompleteImport(state, errorCount = 0) {
  return isPartial(state) || isFailed(state) || Number(errorCount) > 0;
}

// Older runner caches report "done" even when some rows failed. Counts
// refine that terminal result; an active import must remain active.
export function importOutcome(data = {}) {
  const state = normalizeState(data.state) || "running";
  if (["done", "completed"].includes(state) && Number(data.error_count) > 0)
    return Number(data.inserted) > 0 || Number(data.updated) > 0 ? "partial" : "failed";
  return state;
}
