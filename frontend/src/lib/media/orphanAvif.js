/**
 * Yetim AVIF görünümü — saf yardımcılar (2026-09-30).
 *
 * Backend: `tradehub_core.api.media_orphans` (yalnız System Manager).
 * Ürün görseli türevleri AVIF'ten WebP'ye geçti; eski AVIF dosyaları diskte
 * duruyor ve SİLİNMEDEN önce burada görülür. Silme ucu varsayılan olarak kuru
 * koşudur; gerçek işlem kuru koşunun döndürdüğü onay jetonunu ister.
 */

export const ORPHAN_API = "tradehub_core.api.media_orphans";

/** Backend `yetim_avif.SEBEPLER` ile aynı sıra. */
export const ORPHAN_REASONS = ["archived_asset", "old_version", "asset_missing", "unregistered"];

/** Defter satırı olmayan dosya hiçbir koşulda silinmez (backend `SILINEBILIR`). */
export const DELETABLE_REASONS = new Set(["archived_asset", "old_version", "asset_missing"]);

export function reasonKey(reason) {
  return ORPHAN_REASONS.includes(reason)
    ? `mediaOrphanAvif.reason.${reason}`
    : "mediaOrphanAvif.reason.unknown";
}

/** `{archived_asset: 2}` → `[{reason, count, key}]`, sabit sırayla. */
export function reasonChips(reasons = {}) {
  return ORPHAN_REASONS.filter((r) => Number(reasons[r]) > 0).map((r) => ({
    reason: r,
    count: Number(reasons[r]),
    key: reasonKey(r),
    deletable: DELETABLE_REASONS.has(r),
  }));
}

/** Kuru koşu yanıtı gerçek silmeye izin veriyor mu? Jeton ve en az bir dosya şart. */
export function canConfirmDelete(dryRun) {
  return Boolean(
    dryRun &&
    dryRun.dry_run === true &&
    dryRun.confirm_token &&
    Number(dryRun.would_delete_files) > 0
  );
}

/** Sayfa sayısı — boş listede 1. */
export function pageCount(total, pageSize) {
  const n = Math.ceil(Number(total || 0) / Math.max(1, Number(pageSize || 1)));
  return Math.max(1, n);
}

/** Gerçek silme isteğinin gövdesi — jeton her zaman kuru koşudan gelir. */
export function deletePayload(assets, dryRun, { confirm = false } = {}) {
  const body = { assets: JSON.stringify(assets || []), dry_run: 1 };
  if (confirm) {
    if (!canConfirmDelete(dryRun)) throw new Error("dry-run token required");
    body.dry_run = 0;
    body.confirm_token = dryRun.confirm_token;
  }
  return body;
}
