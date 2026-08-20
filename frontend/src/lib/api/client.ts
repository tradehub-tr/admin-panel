/**
 * Tipli medya API istemcisi — W6 / T-085'in SDK ayağı.
 *
 * İNCE KATMAN, İKİNCİ HTTP YIĞINI DEĞİL: her çağrı `src/utils/api.js`in
 * `callMethod`/`callMethodGET`'ine iner; CSRF alma-yenileme, 401/417 oturum
 * düşmesi, hata kodu ayıklama (`buildError`) ve `Accept-Language` davranışı
 * ORADA kalır. Bu dosyanın işi üç şey:
 *
 *   1. Uç adlarını ve parametre/yanıt tiplerini sözleşmeden taşımak
 *      (`types.gen.ts` ← `tradehub_core/docs/api/openapi-http.yaml`).
 *   2. Frappe zarfını (`{message: …}`) tek yerde açmak.
 *   3. GET/POST seçimini sözleşmedeki `x-allowed-methods` kararına sabitlemek.
 *
 * `utils/api.js` mevcut çağıranlarıyla AYNEN kalır; buradan tüketmek yeni kod
 * için bir tercihtir, göç bu görevin kapsamı dışındadır.
 *
 * Node testleri için taşıma katmanı ENJEKTE EDİLEBİLİR: `utils/api.js`
 * modül yüklenirken `import.meta.env` okur (Vite'a özgü) ve tarayıcı dışında
 * çöker; bu yüzden varsayılan taşıma onu TEMBEL yükler ve testler sahte
 * taşıma verir (`__tests__/client.test.js`).
 */
import type { components, operations } from "./types.gen.ts";

/** Frappe whitelisted-method taşıması — `utils/api.js`in ilgili alt kümesi. */
export interface Transport {
  callMethod(method: string, args?: Record<string, unknown>): Promise<unknown>;
  callMethodGET(method: string, args?: Record<string, unknown>): Promise<unknown>;
}

type ApiJsModule = { default: Transport };

/**
 * Varsayılan taşıma: `utils/api.js` — TEMBEL import (gerekçe dosya başlığında).
 * Modül bir kez çözülür; sonraki çağrılar aynı promise'i paylaşır.
 */
let apiJsPromise: Promise<Transport> | null = null;
const lazyApiJs: Transport = {
  async callMethod(method, args) {
    apiJsPromise ??= import("../../utils/api.js").then((m: ApiJsModule) => m.default);
    return (await apiJsPromise).callMethod(method, args);
  },
  async callMethodGET(method, args) {
    apiJsPromise ??= import("../../utils/api.js").then((m: ApiJsModule) => m.default);
    return (await apiJsPromise).callMethodGET(method, args);
  },
};

/** Sözleşmedeki bir operasyonun sorgu parametreleri. */
export type QueryOf<Id extends keyof operations> = NonNullable<
  operations[Id]["parameters"]["query"]
>;

/** Sözleşmedeki bir operasyonun `message` gövdesi (Frappe zarfı açılmış). */
export type MessageOf<Id extends keyof operations> =
  operations[Id]["responses"][200]["content"]["application/json"] extends {
    message: infer M;
  }
    ? M
    : unknown;

/** Sık kullanılan gövde şemaları — çağıranlar `components` yolunu ezberlemesin. */
export type Manifest = components["schemas"]["Manifest"];
export type ManifestBatch = components["schemas"]["ManifestBatch"];
export type FileManifestBatch = components["schemas"]["FileManifestBatch"];
export type CropIntentView = components["schemas"]["CropIntentView"];
export type FocalSuggestion = components["schemas"]["FocalSuggestion"];
export type FolderList = components["schemas"]["FolderList"];
export type OrphanList = components["schemas"]["OrphanList"];
export type LibraryMatch = components["schemas"]["LibraryMatch"];

/** Frappe zarfını aç. Zarf yoksa (beklenmedik gövde) `undefined` döner. */
function unwrap<M>(envelope: unknown): M {
  return (envelope as { message: M }).message;
}

/**
 * Tipli medya istemcisi kur.
 *
 * GET/POST seçimi sözleşmeyi izler: `methods=["POST"]` taşıyan uçlar ve yazma
 * uçları `callMethod` (POST + CSRF), salt okumalar `callMethodGET`. Dizi/nesne
 * parametreleri sözleşmede DİZGE tiplidir ("JSON dizisi ya da virgüllü liste")
 * — GET yolunda çağıran `JSON.stringify` ile gönderir, POST gövdesinde ham
 * dizi de geçer (Frappe ikisini de çözer).
 */
export function createMediaApi(transport: Transport = lazyApiJs) {
  const g = <Id extends keyof operations>(method: string) => {
    return async (params?: QueryOf<Id>): Promise<MessageOf<Id>> =>
      unwrap<MessageOf<Id>>(
        await transport.callMethodGET(method, params as Record<string, unknown> | undefined)
      );
  };
  const p = <Id extends keyof operations>(method: string) => {
    return async (params?: QueryOf<Id>): Promise<MessageOf<Id>> =>
      unwrap<MessageOf<Id>>(
        await transport.callMethod(method, params as Record<string, unknown> | undefined)
      );
  };

  return {
    // ── delivery ────────────────────────────────────────────────────
    /** Tek ilanın teslim manifesti (misafire açık; bayrak kapalıyken de 200). */
    getManifest: g<"media_manifest_get_manifest">("tradehub_core.api.media_manifest.get_manifest"),
    /** Çok ilan, tek istek — İLAN bazlı, vitrin `srcset` manifesti. */
    getManifestBatch: g<"media_manifest_get_manifest_batch">(
      "tradehub_core.api.media_manifest.get_manifest_batch"
    ),
    /** DOSYA bazlı toplu türev envanteri — panelin türev tablosu (oturum ister). */
    manifestBatch: p<"media_manifest_manifest_batch">(
      "tradehub_core.api.media_manifest.manifest_batch"
    ),
    /** Private medya için süreli imzalı adres. */
    getSignedUrl: g<"media_manifest_get_signed_url">(
      "tradehub_core.api.media_manifest.get_signed_url"
    ),

    // ── crop ────────────────────────────────────────────────────────
    getCropIntent: g<"media_crop_get_intent">("tradehub_core.api.media_crop.get_intent"),
    /** İdempotent yazma; `if_match` ile iyimser kilit. POST + CSRF. */
    saveCropIntent: p<"media_crop_save_intent">("tradehub_core.api.media_crop.save_intent"),
    /** Yazmaz; 30/60sn oran sınırı var (429 bekleyin). */
    suggestFocal: p<"media_crop_suggest_focal">("tradehub_core.api.media_crop.suggest_focal"),

    // ── seller: kütüphane ───────────────────────────────────────────
    getMyMedia: g<"seller_media_get_my_media">("tradehub_core.api.seller_media.get_my_media"),
    getMySummary: g<"seller_media_get_my_summary">(
      "tradehub_core.api.seller_media.get_my_summary"
    ),
    getMyUsage: g<"seller_media_get_my_usage">("tradehub_core.api.seller_media.get_my_usage"),
    /** Yükleme ön kontrolü — SHA-256 ile tekilleştirme UYARISI (engel değil). */
    findInMyLibrary: g<"seller_media_find_in_my_library">(
      "tradehub_core.api.seller_media.find_in_my_library"
    ),
    /** Öksüz dosyalar — YALNIZ listeler, silme ayrı akıştadır. */
    listOrphans: g<"seller_media_list_orphans">("tradehub_core.api.seller_media.list_orphans"),

    // ── seller: klasörler ───────────────────────────────────────────
    listFolders: g<"seller_media_list_folders">("tradehub_core.api.seller_media.list_folders"),
    listFolderMedia: g<"seller_media_list_folder_media">(
      "tradehub_core.api.seller_media.list_folder_media"
    ),
    createFolder: p<"seller_media_create_folder">(
      "tradehub_core.api.seller_media.create_folder"
    ),
    renameFolder: p<"seller_media_rename_folder">(
      "tradehub_core.api.seller_media.rename_folder"
    ),
    deleteFolder: p<"seller_media_delete_folder">(
      "tradehub_core.api.seller_media.delete_folder"
    ),
    moveMedia: p<"seller_media_move_media">("tradehub_core.api.seller_media.move_media"),
  };
}

export type MediaApi = ReturnType<typeof createMediaApi>;

/** Uygulama içi varsayılan örnek — `utils/api.js` üzerinden gider. */
export const mediaApi: MediaApi = createMediaApi();
