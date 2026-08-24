// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: src/lib/api/client.ts (tipleri silinmiş hâli).
// Yeniden üret: npm run sync:api · Doğrula: npm run sync:api:check
let apiJsPromise = null;
const lazyApiJs = {
  async callMethod(method, args, options) {
    apiJsPromise ??= import("../../utils/api.js").then((m) => m.default);
    return (await apiJsPromise).callMethod(method, args, options);
  },
  async callMethodGET(method, args) {
    apiJsPromise ??= import("../../utils/api.js").then((m) => m.default);
    return (await apiJsPromise).callMethodGET(method, args);
  }
};
function unwrap(envelope) {
  return envelope.message;
}
function createMediaApi(transport = lazyApiJs) {
  const g = (method) => {
    return async (params) => unwrap(
      await transport.callMethodGET(method, params)
    );
  };
  const p = (method) => {
    return async (params, options) => unwrap(
      await transport.callMethod(method, params, options)
    );
  };
  return {
    // ── delivery ────────────────────────────────────────────────────
    /** Tek ilanın teslim manifesti (misafire açık; bayrak kapalıyken de 200). */
    getManifest: g("tradehub_core.api.media_manifest.get_manifest"),
    /** Çok ilan, tek istek — İLAN bazlı, vitrin `srcset` manifesti. */
    getManifestBatch: g(
      "tradehub_core.api.media_manifest.get_manifest_batch"
    ),
    /** DOSYA bazlı toplu türev envanteri — panelin türev tablosu (oturum ister). */
    manifestBatch: p(
      "tradehub_core.api.media_manifest.manifest_batch"
    ),
    /** Private medya için süreli imzalı adres. */
    getSignedUrl: g(
      "tradehub_core.api.media_manifest.get_signed_url"
    ),
    // ── crop ────────────────────────────────────────────────────────
    getCropIntent: g("tradehub_core.api.media_crop.get_intent"),
    /** İdempotent yazma; `if_match` ile iyimser kilit. POST + CSRF. */
    saveCropIntent: p("tradehub_core.api.media_crop.save_intent"),
    /** Yazmaz; 30/60sn oran sınırı var (429 bekleyin). */
    suggestFocal: p("tradehub_core.api.media_crop.suggest_focal"),
    // ── seller: kütüphane ───────────────────────────────────────────
    getMyMedia: g("tradehub_core.api.seller_media.get_my_media"),
    getMySummary: g("tradehub_core.api.seller_media.get_my_summary"),
    getMyUsage: g("tradehub_core.api.seller_media.get_my_usage"),
    /** Yükleme ön kontrolü — SHA-256 ile tekilleştirme UYARISI (engel değil). */
    findInMyLibrary: g(
      "tradehub_core.api.seller_media.find_in_my_library"
    ),
    /** Küçük dosya yükleme; slot yine sunucuda uygulanır. */
    uploadMedia: p("tradehub_core.api.seller_media.upload_media"),
    /** T-081 resumable oturum + gerçek Idempotency-Key. */
    uploadBegin: p("tradehub_core.api.seller_media.upload_begin"),
    uploadChunk: p("tradehub_core.api.seller_media.upload_chunk"),
    uploadFinish: p("tradehub_core.api.seller_media.upload_finish"),
    uploadAbort: p("tradehub_core.api.seller_media.upload_abort"),
    uploadStatus: g("tradehub_core.api.seller_media.upload_status"),
    /** Öksüz dosyalar — YALNIZ listeler, silme ayrı akıştadır. */
    listOrphans: g("tradehub_core.api.seller_media.list_orphans"),
    // ── seller: klasörler ───────────────────────────────────────────
    listFolders: g("tradehub_core.api.seller_media.list_folders"),
    listFolderMedia: g(
      "tradehub_core.api.seller_media.list_folder_media"
    ),
    createFolder: p("tradehub_core.api.seller_media.create_folder"),
    renameFolder: p("tradehub_core.api.seller_media.rename_folder"),
    deleteFolder: p("tradehub_core.api.seller_media.delete_folder"),
    moveMedia: p("tradehub_core.api.seller_media.move_media")
  };
}
const mediaApi = createMediaApi();
export {
  createMediaApi,
  mediaApi
};
