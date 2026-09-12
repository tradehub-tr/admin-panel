import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { useSellerMedia } from "@/composables/useSellerMedia";
import { SEVERITY } from "@/lib/media/upload/preflight.js";
import { runPreflight } from "@/lib/media/upload/preflightClient.js";
import { loadLibraryManifests } from "@/lib/media/libraryManifests.js";
import api from "@/utils/api";
import * as policy from "@/utils/uploadPolicy";
import { kindOfFile } from "@/utils/mediaKind";

/**
 * Satıcı Medya Kütüphanesi.
 *
 * ARTIK SAHTE DEĞİL — dosya listesi, kullanım bilgisi ve silme/geri alma
 * gerçek arka tarafa bağlı (TUR-138, TUR-136). Öncesinde her şey bellekte
 * üretiliyordu ve en tehlikelisi "şu üründe kullanılıyor" listesiydi: satıcı
 * uydurma bir "hiçbir yerde kullanılmıyor" yazısına bakıp kendi ürününde
 * duran görseli silebilirdi.
 *
 * Ekrandaki HER işlemin arka tarafta karşılığı var: başlık, alternatif metin,
 * açıklama, etiket, favori, çözünürlük, yeniden adlandırma, kopyalama, içerik
 * değiştirme, yükleme ve depolama kullanımı. Hiçbiri bellekte kalmıyor.
 *
 * Bu yüzden yazma eylemlerinin hepsi ASENKRON. Çağıran taraf beklemeli —
 * beklemezse söz (Promise) her zaman "dolu" sayıldığı için işlem başarısız
 * olsa bile ekran "kaydedildi" der.
 *
 * Satıcı izolasyonu artık ekranda değil ARKA TARAFTA sağlanıyor: uçlar
 * mağazayı oturumdan çözüyor, başka mağazanın dosyası hiçbir yanıta girmiyor.
 * Buradan mağaza kodu gönderilmiyor — gönderilseydi değiştirilebilirdi.
 */

const OWNER_SELF = "self";
const OWNER_SHARED = "shared";

/** Tarih kovaları — bugünden geriye gün sayısı. */
const DATE_WINDOWS = { today: 1, week: 7, month: 30, year: 365 };

const SORT_API_FIELDS = {
  fileName: "name",
  ext: "format",
  bytes: "size",
  usageCount: "usage",
  uploadedAt: "date",
};

function localDate(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function maxDate(...values) {
  return values.filter(Boolean).sort().at(-1) || "";
}

function megabytesToBytes(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 1_000_000) : null;
}

/**
 * Store filtrelerini `get_my_media` sözleşmesine çevir.
 *
 * Aynı aile içindeki seçimler OR (iki boyut kovası), farklı aileler AND
 * (WEBP + yatay + etiket) kalır. Saf fonksiyon olduğu için tarih ve birim
 * dönüşümleri ağ çağrısı olmadan sözleşme testine alınabilir.
 */
export function buildMediaListParams(filters = {}, now = new Date()) {
  const sorting = filters.sorting?.[0] || { field: "uploadedAt", desc: true };
  const dateWindows = (filters.dateFilter || []).map((key) => DATE_WINDOWS[key]).filter(Boolean);
  let bucketFrom = "";
  if (dateWindows.length) {
    const start = new Date(now);
    start.setDate(start.getDate() - (Math.max(...dateWindows) - 1));
    bucketFrom = localDate(start);
  }

  const usage = filters.usageFilter || [];
  let usageMin = filters.usageRange?.min ?? null;
  let usageMax = filters.usageRange?.max ?? null;
  if (usage.length === 1 && usage[0] === "used") usageMin = Math.max(Number(usageMin) || 0, 1);
  if (usage.length === 1 && usage[0] === "unused") usageMax = 0;

  return {
    page: Math.max(1, Number(filters.page) || 1),
    pageSize: Math.max(1, Number(filters.pageSize) || 12),
    search: String(filters.search || "").trim(),
    state: filters.trashed ? "trashed" : "",
    sortBy: SORT_API_FIELDS[sorting.field] || "date",
    sortDir: sorting.desc ? "desc" : "asc",
    nameSearch: String(filters.nameFilter || "").trim(),
    kinds: [...(filters.kindFilter || [])],
    formats: [...(filters.formatFilter || [])],
    orientations: [...(filters.orientationFilter || [])],
    sizeBuckets: [...(filters.sizeFilter || [])],
    dateFrom: maxDate(bucketFrom, filters.dateRange?.from),
    dateTo: filters.dateRange?.to || "",
    minBytes: megabytesToBytes(filters.sizeRange?.min),
    maxBytes: megabytesToBytes(filters.sizeRange?.max),
    tags: [...(filters.tagFilter || [])],
    categories: [...(filters.categoryFilter || [])],
    flags: [...(filters.flagFilter || [])],
    owners: [...(filters.ownerFilter || [])],
    usageMin,
    usageMax,
  };
}

/** Backend tenant-kota sözleşmesini kararlı camelCase store modeline çevir. */
export function normalizeQuotaSummary(raw = {}) {
  const nullableNumber = (value) =>
    value === null || value === undefined || value === "" ? null : Number(value);
  return {
    bytes: Number(raw.bytes) || 0,
    originalBytes: Number(raw.original_bytes) || 0,
    renditionBytes: Number(raw.rendition_bytes) || 0,
    originalFiles: Number(raw.original_files) || 0,
    renditions: Number(raw.renditions) || 0,
    quotaBytes: nullableNumber(raw.quota_bytes),
    remainingBytes: nullableNumber(raw.remaining_bytes),
    usagePercent: nullableNumber(raw.usage_percent),
    quotaMode: raw.quota_mode || "unconfigured",
    quotaState: raw.quota_state || "unconfigured",
    warningThresholdPercent: Number(raw.warning_threshold_percent) || 80,
    isWarning: Boolean(raw.is_warning),
    isExhausted: Boolean(raw.is_exhausted),
    isExceeded: Boolean(raw.is_exceeded),
    overageBytes: Number(raw.overage_bytes) || 0,
    processingJobsMonth: Number(raw.processing_jobs_month) || 0,
    processingDurationMsMonth: Number(raw.processing_duration_ms_month) || 0,
    processingPeriodStart: raw.processing_period_start || "",
    scope: raw.scope || {},
  };
}

function normalizeCategory(row = {}) {
  return {
    name: row.name || "",
    categoryName: row.category_name || row.categoryName || "",
    parentCategory: row.parent_category || row.parentCategory || "",
    categoryType: row.category_type || row.categoryType || "custom",
    description: row.description || "",
    color: row.color || "",
    isActive: row.is_active === undefined ? Boolean(row.isActive) : Boolean(row.is_active),
    assignmentCount: Number(row.assignment_count ?? row.assignmentCount) || 0,
  };
}

function normalizeCategoryAssignments(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...normalizeCategory(row),
    assignment: row.assignment || "",
    assignmentSource: row.assignment_source || row.assignmentSource || "manual",
    confidence: Number(row.confidence) || 0,
    evidence: row.evidence || "",
    assignedBy: row.assigned_by || row.assignedBy || "",
    assignedAt: row.assigned_at || row.assignedAt || "",
  }));
}

/** Görsel olup alt metni boş olanlar — SEO/erişilebilirlik uyarısı. */
function isMissingAlt(item) {
  return item.kind === "image" && !item.alt.trim();
}

/**
 * Toplu işlem yanıtını ekranın okuyabileceği dökümne çevirir (T-094).
 *
 * `seller_media.py:_toplu()` üç şeyi AYRI döndürüyor: kaç tanesi oldu
 * (`archived`/`unarchived`/`purged`), hangileri hata verdi (`failed`) ve kaç
 * tanesi sahiplik kontrolünden geçemediği için hiç denenmedi (`skipped`).
 * Buradan yalnız ilk sayı okunuyordu; diğer ikisi atılıyordu.
 *
 * Sonuç şuydu: 50 dosya seçilip arşivlendiğinde 2'si hata verse bile ekran
 * "48 medya arşivlendi" diyor, eksik kalan 2 dosyadan hiç söz etmiyordu.
 * Kullanıcı işlemin TAMAMLANDIĞINI sanıyordu. Kısmi başarı, sessiz kalınacak
 * bir durum değil — hangi dosyanın neden kaldığı söylenmeli.
 *
 * Saf fonksiyon: ağ yok, store yok — testi gerçek uç çağırmadan yapılabilsin.
 *
 * @param {string} action      Hangi işlem — çeviri anahtarını ekran seçer.
 * @param {object} sonuc       Arka tarafın yanıtı.
 * @param {string} counterKey  Başarı sayacının adı (`archived` | `purged` …).
 * @returns {{action:string, ok:number, failed:Array<{id:string,error:string}>, skipped:number, partial:boolean}}
 */
export function summarizeBulk(action, sonuc, counterKey) {
  const yanit = sonuc || {};
  const failed = (Array.isArray(yanit.failed) ? yanit.failed : []).map((f) => ({
    id: f?.file_url || "",
    error: f?.error || "",
  }));
  const skipped = Number(yanit.skipped) || 0;
  return {
    action,
    ok: Number(yanit[counterKey]) || 0,
    failed,
    skipped,
    // "Kısmi" = istenen her şey olmadı. Sıfır başarı da kısmi sayılır; o durumda
    // ekranın başarı bildirimi göstermemesi gerekiyor.
    partial: failed.length > 0 || skipped > 0,
  };
}

/** T-094 arka plan yeniden işleme durumunu ortak kısmi-rapor şekline getir. */
export function summarizeReprocess(sonuc) {
  const status = sonuc || {};
  const failed = (Array.isArray(status.failures) ? status.failures : []).map((row) => ({
    id: row?.file_url || "",
    error: row?.error || row?.error_code || "",
  }));
  const skipped = Number(status.skipped) || 0;
  const failedCount = Number(status.failed) || failed.length;
  return {
    action: "reprocess",
    ok: Number(status.succeeded) || 0,
    failed,
    skipped,
    partial: failedCount > 0 || skipped > 0,
  };
}

let uploadSeq = 0;

export const useMediaStore = defineStore("media", () => {
  // ── state ──────────────────────────────────────────────────────────
  // Liste boş başlar, `loadReal()` gerçek dosyalarla doldurur. Eskiden burada
  // bellekte örnek kayıtlar üretiliyordu; en tehlikelisi uydurma "şu üründe
  // kullanılıyor" bilgisiydi — satıcı ona bakıp kendi ürününde duran görseli
  // silebilirdi.
  const items = ref([]);
  const loading = ref(false);
  const loadError = ref("");
  const serverTotal = ref(0);
  const manifestLoading = ref(false);

  const medya = useSellerMedia();
  let listLoadSeq = 0;

  /**
   * Depolama özeti — GERÇEK kullanım ve yapılandırılmışsa sınır.
   *
   * Eskiden 500 MB'lık uydurma bir sınır sabiti vardı; satıcıya var olmayan
   * bir kısıt olduğunu düşündürüyordu. Sınır tanımlı değilse `null` gelir ve
   * çubuk sınır göstermez (gerçek kota modeli TUR-139'un işi).
   */
  const storage = ref(normalizeQuotaSummary());
  const libraryFacets = ref({ active: null, trashed: null });
  const categoryCatalog = ref([]);
  const categoryLoading = ref(false);
  let summaryLoaded = false;
  let summaryPromise = null;

  async function loadSummary({ force = false } = {}) {
    if (!force && summaryLoaded) return storage.value;
    if (summaryPromise) return summaryPromise;
    summaryPromise = medya
      .loadSummary()
      .then((o) => {
        storage.value = normalizeQuotaSummary(o);
        libraryFacets.value = {
          active: o?.facets?.active || null,
          trashed: o?.facets?.trashed || null,
        };
        summaryLoaded = true;
        return storage.value;
      })
      .finally(() => {
        summaryPromise = null;
      });
    return summaryPromise;
  }

  /**
   * Gerçek dosyaları yükle.
   *
   * Filtre, sıralama ve sayfa birlikte sunucuya gider. Sunucu toplamı da aynı
   * daraltılmış sorgudan hesaplar; böylece ilk 200 kayıtta olmayan eşleşmeler
   * kaybolmaz ve sonraki sayfalar gerçekten erişilebilir olur.
   */
  async function loadReal({ trashed = false, refreshSummary = true } = {}) {
    const requestId = ++listLoadSeq;
    loading.value = true;
    loadError.value = "";
    try {
      const result = await medya.load(
        buildMediaListParams({
          page: page.value,
          pageSize: pageSize.value,
          search: search.value,
          trashed,
          sorting: sorting.value,
          nameFilter: nameFilter.value,
          kindFilter: kindFilter.value,
          usageFilter: usageFilter.value,
          ownerFilter: ownerFilter.value,
          formatFilter: formatFilter.value,
          orientationFilter: orientationFilter.value,
          dateFilter: dateFilter.value,
          sizeFilter: sizeFilter.value,
          sizeRange: sizeRange.value,
          usageRange: usageRange.value,
          dateRange: dateRange.value,
          tagFilter: tagFilter.value,
          categoryFilter: categoryFilter.value,
          flagFilter: flagFilter.value,
        })
      );
      // Arama/filtre hızlı değiştiğinde eski istek yenisinden sonra dönebilir.
      // Yalnız en son isteğin sonucu ekrana yazılır.
      if (requestId !== listLoadSeq) return;
      const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value));
      if (page.value > lastPage) {
        page.value = lastPage;
        return;
      }
      items.value = result.items.map((f) => ({
        ...f,
        // "Arşivlenmiş" satıcı için = bıraktığı dosya. Hangi listeyi
        // yüklediğimiz bunu zaten söylüyor. Önce optimize damgasına
        // bakılıyordu; optimize edilmiş dosyalar ana listeden düşüyordu.
        archived: trashed,
        // Başlık, alternatif metin, etiket, favori ve çözünürlük artık
        // sunucudan geliyor — burada EZİLMEMELİ. Önce boş değerlerle üzerine
        // yazılıyordu; kullanıcının kaydettiği her şey listede kaybolmuş
        // görünüyordu.
        owner: OWNER_SELF,
        gradient: null,
        // Kullanım İKİ ayrı alanda tutuluyor, çünkü iki farklı soru:
        //   liveUsage   → KAÇ yerde kullanılıyor. Sunucudan her satırla
        //                 birlikte gerçek sayı olarak geliyor; rozetler,
        //                 filtreler ve sayaçlar bunu kullanır.
        //   usageDetail → HANGİ ürünlerde. Pahalı, yalnız detay paneli
        //                 açılınca isteniyor. `null` = "henüz sorulmadı";
        //                 boş dizi olsaydı panel "kullanılmıyor" derdi ve
        //                 doğrulanmamış bir şeyi doğrulanmış gibi gösterirdi.
        usageDetail: null,
      }));
      serverTotal.value = result.total;
      loadSummary({ force: refreshSummary }).catch(() => {});
    } catch (e) {
      if (requestId !== listLoadSeq) return;
      loadError.value = e.message || "Medya listesi yüklenemedi";
      items.value = [];
      serverTotal.value = 0;
    } finally {
      if (requestId === listLoadSeq) loading.value = false;
    }
  }

  /**
   * Dosyanın `Media Asset` adı — Kırpma Stüdyosu `save_intent` bunu hedefler.
   *
   * Satır modeli (`useSellerMedia.bicimle`) asset adı TAŞIMIYOR (ölçüldü);
   * ad, detay panelinin türev listesinin de kullandığı toplu uçtan alınıyor:
   * `manifest_batch` yanıtı `manifests[<anahtar>].assets[]` taşıyor. Boru
   * hattından geçmemiş dosyada varlık yoktur — "" döner ve Kırpma Stüdyosu
   * dürüst "kaydedilemez" durumunda kalır; uydurma bir ad üretmek, kaydı
   * başka bir varlığın üstüne yazdırırdı.
   *
   * Erişilemeyen adres de `null` manifest döner (sunucu "yok" ile "bakamazsın"ı
   * bilinçli ayırt ettirmiyor) — ikisi de "" olur.
   */
  async function assetNameOf(id) {
    const item = items.value.find((m) => m.id === id);
    // Uç docname de adres de çözer; panelin elindeki asıl kimlik docname.
    const anahtar = item?.docName || item?.fileUrl || id || "";
    if (!anahtar) return "";
    const res = await api.callMethod("tradehub_core.api.media_manifest.manifest_batch", {
      file_urls: [anahtar],
    });
    const manifest = res?.message?.manifests?.[anahtar] ?? null;
    return manifest?.assets?.[0] || "";
  }

  /**
   * Görünür kartların teslim URL/LQIP/rendition bilgisini TEK toplu istekte
   * yükle. `ids` sayfanın kimlikleridir; bütün 200 satırı istemek yerine
   * yalnız DOM'a girecek 12/24/48 satır istenir.
   */
  async function loadVisibleManifests(ids, { force = false } = {}) {
    const wanted = new Set(ids || []);
    const rows = items.value.filter((item) => wanted.has(item.id));
    if (!rows.length) return { requested: 0, returned: 0, calls: 0 };
    manifestLoading.value = true;
    try {
      return await loadLibraryManifests(rows, {
        force,
        call: (method, args) => api.callMethod(method, args),
      });
    } finally {
      manifestLoading.value = false;
    }
  }

  /** Bir dosyanın kendi ürünlerimdeki kullanımı — panel açılınca istenir. */
  async function loadUsage(id) {
    const item = items.value.find((m) => m.id === id);
    if (!item || Array.isArray(item.usageDetail)) return;
    const rapor = await medya.usageOf(id);
    item.usageDetail = (rapor.usages || []).map((u) => ({
      id: u.name,
      label: u.label || u.name,
    }));
  }

  // Filtreler `useDataTable` sözleşmesiyle aynı şekilde tutulur (panelin table
  // list standardı): çoklu seçimler DİZİ (boş dizi = "tümü"), sayısal alanlar
  // {min,max}, tarih {from,to}. Sayfa bunları `dt.filters`'tan tek yönlü
  // besler; ray, sütun filtresi ve çekmece aynı state'i yazar.
  const search = ref("");
  const nameFilter = ref(""); // dosya adı sütun filtresi (aramadan bağımsız)
  const kindFilter = ref([]); // image | video | document
  const usageFilter = ref([]); // used | unused
  const ownerFilter = ref([]); // self | shared
  const showArchived = ref(false);
  const formatFilter = ref([]); // WEBP | JPG | PDF | MP4 …
  const orientationFilter = ref([]); // landscape | portrait | square
  const dateFilter = ref([]); // today | week | month | year (kova)
  const sizeFilter = ref([]); // small (<500KB) | medium (<5MB) | large (kova)
  const sizeRange = ref(null); // { min, max } — MB cinsinden sütun filtresi
  const usageRange = ref(null); // { min, max } — kullanıldığı ürün sayısı
  const dateRange = ref(null); // { from, to } — YYYY-MM-DD
  const tagFilter = ref([]); // çoklu etiket — hepsi eşleşmeli (AND)
  const categoryFilter = ref([]); // çoklu kategori — hepsi eşleşmeli (AND)
  const flagFilter = ref([]); // favorite | missingAlt (AND)
  /** Çoklu sıralama — [{ field, desc }]; Shift+tık ile birden fazla sütun. */
  const sorting = ref([{ field: "uploadedAt", desc: true }]);

  // Sayfalama — ListPagination bileşeniyle sürülür.
  const page = ref(1);
  const pageSize = ref(12);

  const selectedIds = ref([]);
  const activeId = ref(null);
  /** Shift+tık aralık seçiminin çapası. */
  const lastAnchorId = ref(null);
  /** Son yıkıcı işlemin geri alma kaydı — { type, label, restore } */
  const undoEntry = ref(null);

  /**
   * Süren toplu işlem — düğmeler kilitlenir (T-094 "ilerleme").
   *
   * Adet bazlı bir yüzde çubuğu YOK ve olamaz: uçlar listenin tamamını tek
   * istekte işleyip tek yanıt döndürüyor, aradan ilerleme bildirimi gelmiyor.
   * Uydurma bir çubuk çizmektense çubuk hiç çizilmiyor; kullanıcıya söylenen
   * tek şey "işlem sürüyor" ve bu doğru.
   */
  const bulkBusy = ref(false);

  /** Yalnız arka plan yeniden işleme işinde dolu: gerçek asset sayaçları. */
  const bulkProgress = ref(null);

  /**
   * Son toplu işlemin dökümü — { action, ok, failed[], skipped, partial }.
   * Yalnız EKSİK kalan bir şey varsa dolu kalır; her şey olduysa temizlenir.
   */
  const bulkReport = ref(null);

  function clearBulkReport() {
    bulkReport.value = null;
  }

  const REPROCESS_TERMINAL = new Set(["completed", "cancelled"]);
  const REPROCESS_POLL_MS = 1000;
  const REPROCESS_MAX_POLLS = 1200;

  const waitForReprocessPoll = () =>
    new Promise((resolve) => setTimeout(resolve, REPROCESS_POLL_MS));

  function setReprocessProgress(status) {
    bulkProgress.value = {
      status: status?.status || "unknown",
      processed: Number(status?.processed) || 0,
      total: Number(status?.total) || 0,
      succeeded: Number(status?.succeeded) || 0,
      failed: Number(status?.failed) || 0,
    };
  }

  /**
   * Seçili medyayı gerçek düşük-öncelikli kuyruğa dağıt ve sunucunun sayaçlarını
   * izle. 500 asset tek worker'ı bloklayan bir döngüye girmez; her asset ayrı
   * planlanır. Yüzde yalnız `processed / total` değerinden gelir.
   */
  async function reprocessMany(ids) {
    if (!ids.length) return summarizeReprocess({});
    bulkBusy.value = true;
    bulkReport.value = null;
    bulkProgress.value = { status: "queued", processed: 0, total: ids.length };
    try {
      let status = await medya.startReprocess(ids);
      setReprocessProgress(status);
      let polls = 0;
      while (!REPROCESS_TERMINAL.has(status.status)) {
        if (status.status === "unknown") throw new Error("Reprocess job not found");
        if (polls++ >= REPROCESS_MAX_POLLS) throw new Error("Reprocess status timed out");
        await waitForReprocessPoll();
        status = await medya.reprocessStatus(status.token);
        setReprocessProgress(status);
      }

      const rapor = summarizeReprocess(status);
      bulkReport.value = rapor.partial ? rapor : null;
      selectedIds.value = [];
      await loadReal({ trashed: showArchived.value });
      return rapor;
    } finally {
      bulkBusy.value = false;
      bulkProgress.value = null;
    }
  }

  /** Yükleme kuyruğu — { id, name, bytes, progress, status, error } */
  const uploads = ref([]);

  // ── getters ────────────────────────────────────────────────────────
  const activeItem = computed(() => items.value.find((m) => m.id === activeId.value) || null);

  const selectedItems = computed(() =>
    selectedIds.value.map((id) => items.value.find((m) => m.id === id)).filter(Boolean)
  );

  /** Sayaçlar filtre uygulanmadan hesaplanır — rozet rakamları sabit kalsın. */
  const counts = computed(() => {
    const live = items.value.filter((m) => !m.archived);
    const fallback = {
      all: live.length,
      image: live.filter((m) => m.kind === "image").length,
      video: live.filter((m) => m.kind === "video").length,
      audio: live.filter((m) => m.kind === "audio").length,
      document: live.filter((m) => m.kind === "document").length,
      used: live.filter((m) => (m.liveUsage || 0) > 0).length,
      unused: live.filter((m) => (m.liveUsage || 0) === 0).length,
      shared: live.filter((m) => m.owner === OWNER_SHARED).length,
      archived: items.value.filter((m) => m.archived).length,
      favorite: live.filter((m) => m.favorite).length,
      missingAlt: live.filter(isMissingAlt).length,
      bytes: live.reduce((sum, m) => sum + m.bytes, 0),
    };
    const current = libraryFacets.value[showArchived.value ? "trashed" : "active"]?.counts;
    if (!current) return fallback;
    return {
      ...fallback,
      ...current,
      archived: libraryFacets.value.trashed?.counts?.all ?? fallback.archived,
    };
  });

  // API zaten yalnız istenen sayfayı döndürür. Adlar geriye uyumluluk için
  // korunuyor; yeniden yerel `filter/slice` eklemek toplamı ilk sayfaya
  // kilitleyerek MOGEM-578 hatasını geri getirir.
  const filtered = computed(() => items.value);
  const paged = computed(() => items.value);

  const totalPages = computed(() => Math.max(1, Math.ceil(serverTotal.value / pageSize.value)));

  /** Etiket bulutu — yalnızca arşiv durumu eşleşen kayıtlardan sayılır. */
  const availableTags = computed(() => {
    const catalog = libraryFacets.value[showArchived.value ? "trashed" : "active"]?.tags;
    if (catalog) return catalog;
    const counter = new Map();
    for (const m of items.value) {
      if (m.archived !== showArchived.value) continue;
      for (const tag of m.tags) counter.set(tag, (counter.get(tag) || 0) + 1);
    }
    return [...counter.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "tr"));
  });

  /** Kategori filtresi: yönetim kataloğu + geçerli arşiv durumundaki sayaç. */
  const availableCategories = computed(() => {
    const facets = libraryFacets.value[showArchived.value ? "trashed" : "active"]?.categories || [];
    const counts = new Map(facets.map((row) => [row.name, Number(row.count) || 0]));
    if (categoryCatalog.value.length) {
      return categoryCatalog.value
        .filter((row) => row.isActive)
        .map((row) => ({ ...row, count: counts.get(row.name) || 0 }))
        .sort((a, b) => b.count - a.count || a.categoryName.localeCompare(b.categoryName, "tr"));
    }
    return facets.map((row) => ({
      ...normalizeCategory(row),
      count: Number(row.count) || 0,
    }));
  });

  /** Kütüphanede gerçekten bulunan formatlar — sabit liste yerine veriden. */
  const availableFormats = computed(() => {
    const catalog = libraryFacets.value[showArchived.value ? "trashed" : "active"]?.formats;
    if (catalog) return catalog;
    const counter = new Map();
    for (const m of items.value) {
      if (m.archived !== showArchived.value) continue;
      counter.set(m.ext, (counter.get(m.ext) || 0) + 1);
    }
    return [...counter.entries()]
      .map(([ext, count]) => ({ ext, count }))
      .sort((a, b) => b.count - a.count);
  });

  const hasActiveFilter = computed(
    () =>
      Boolean(search.value.trim()) ||
      Boolean(nameFilter.value.trim()) ||
      [
        kindFilter,
        usageFilter,
        ownerFilter,
        formatFilter,
        orientationFilter,
        dateFilter,
        sizeFilter,
        tagFilter,
        categoryFilter,
        flagFilter,
      ].some((r) => r.value.length > 0) ||
      Boolean(sizeRange.value || usageRange.value || dateRange.value) ||
      showArchived.value
  );

  // ── actions: seçim ─────────────────────────────────────────────────
  function isSelected(id) {
    return selectedIds.value.includes(id);
  }

  function toggleSelect(id) {
    selectedIds.value = isSelected(id)
      ? selectedIds.value.filter((x) => x !== id)
      : [...selectedIds.value, id];
    lastAnchorId.value = id;
  }

  /**
   * Shift+tık aralık seçimi (Drive/Finder davranışı): son çapa ile tıklanan
   * öge arasındaki görünen tüm medyayı seçime ekler.
   */
  function selectRangeTo(id) {
    const visible = filtered.value.map((m) => m.id);
    const anchor = visible.indexOf(lastAnchorId.value);
    const target = visible.indexOf(id);
    if (anchor === -1 || target === -1) {
      toggleSelect(id);
      return;
    }
    const [from, to] = anchor < target ? [anchor, target] : [target, anchor];
    const range = visible.slice(from, to + 1);
    selectedIds.value = [...new Set([...selectedIds.value, ...range])];
  }

  function setActive(id) {
    activeId.value = id;
  }

  /** Filtre sonucunun tamamını seçer (sayfa değil). */
  function selectAllVisible() {
    selectedIds.value = filtered.value.map((m) => m.id);
  }

  /** Yalnızca açık sayfadakileri seçer. */
  function selectPage() {
    selectedIds.value = [...new Set([...selectedIds.value, ...paged.value.map((m) => m.id)])];
  }

  function clearSelection() {
    selectedIds.value = [];
  }

  // ── actions: filtre ────────────────────────────────────────────────
  function resetFilters() {
    search.value = "";
    nameFilter.value = "";
    kindFilter.value = [];
    usageFilter.value = [];
    ownerFilter.value = [];
    formatFilter.value = [];
    orientationFilter.value = [];
    dateFilter.value = [];
    sizeFilter.value = [];
    sizeRange.value = null;
    usageRange.value = null;
    dateRange.value = null;
    tagFilter.value = [];
    categoryFilter.value = [];
    flagFilter.value = [];
    showArchived.value = false;
    page.value = 1;
  }

  /** Etiket filtresini aç/kapat — çoklu seçim (AND). */
  function toggleTag(tag) {
    tagFilter.value = tagFilter.value.includes(tag)
      ? tagFilter.value.filter((t) => t !== tag)
      : [...tagFilter.value, tag];
  }

  /** Birincil sıralamanın yönünü çevirir (araç çubuğundaki yön düğmesi). */
  function toggleSortDir() {
    const [first, ...rest] = sorting.value;
    if (!first) return;
    sorting.value = [{ ...first, desc: !first.desc }, ...rest];
  }

  // ── actions: mutasyon (mock) ───────────────────────────────────────
  /** Ortak medya salt-okunur — medya.md §Satıcı Kuralları. */
  function canEdit(item) {
    return Boolean(item) && item.owner === OWNER_SELF;
  }

  /**
   * Eksik piksel ölçüsünü sunucudan tamamla.
   *
   * Liste ucu (`get_my_media`) ölçüyü yalnız DAHA ÖNCE saklandıysa döndürür;
   * hiç sorulmamış bir dosyada `width/height` null gelir ve Kırp düğmesi
   * "ölçü bilinmiyor" diye pasif kalır. `get_dimensions` ucu gerçeği ilk
   * soruluşta diskten okuyup File kaydına yazar — burada o uç çağrılır ve
   * satır yerinde güncellenir. Görsel değilse ya da ölçü zaten varsa ağ yok.
   * Uç boş dönerse (dosya diskte yok) satıra dokunulmaz — düğme pasif kalır,
   * sebep tooltip'te; sahte bir ölçü uydurulmaz.
   */
  async function ensureDimensions(id) {
    const item = items.value.find((m) => m.id === id);
    if (!item || item.kind !== "image") return item;
    if (item.width > 0 && item.height > 0) return item;
    try {
      const olcu = await medya.dimensions(id);
      if (olcu?.width > 0 && olcu?.height > 0) {
        Object.assign(item, { width: olcu.width, height: olcu.height });
      }
    } catch {
      // Ölçü alınamadı (yetki/ağ) — mevcut durumda kal.
    }
    return item;
  }

  /** Başlık, alternatif metin, açıklama, etiket — arka tarafa yazılır. */
  async function update(id, patch) {
    const item = items.value.find((m) => m.id === id);
    if (!item || !canEdit(item)) return false;
    const kayitli = await medya.update(id, patch);
    Object.assign(item, kayitli);
    return true;
  }

  // ── Kategorizasyon (MOGEM-579) ────────────────────────────────────

  async function loadCategories({ includeInactive = true } = {}) {
    categoryLoading.value = true;
    try {
      const result = await medya.listCategories({ includeInactive });
      categoryCatalog.value = (result.categories || []).map(normalizeCategory);
      return categoryCatalog.value;
    } finally {
      categoryLoading.value = false;
    }
  }

  async function createCategory(payload) {
    const result = await medya.createCategory({
      category_name: payload.categoryName,
      category_type: payload.categoryType || "custom",
      parent_category: payload.parentCategory || "",
      description: payload.description || "",
      color: payload.color || "",
    });
    await Promise.all([loadCategories(), loadSummary({ force: true })]);
    return normalizeCategory(result.category || {});
  }

  async function updateCategory(category, patch) {
    const apiPatch = {};
    if (Object.hasOwn(patch, "categoryName")) apiPatch.category_name = patch.categoryName;
    if (Object.hasOwn(patch, "categoryType")) apiPatch.category_type = patch.categoryType;
    if (Object.hasOwn(patch, "parentCategory")) apiPatch.parent_category = patch.parentCategory;
    if (Object.hasOwn(patch, "description")) apiPatch.description = patch.description;
    if (Object.hasOwn(patch, "color")) apiPatch.color = patch.color;
    if (Object.hasOwn(patch, "isActive")) apiPatch.is_active = patch.isActive ? 1 : 0;
    const result = await medya.updateCategory(category, apiPatch);
    await Promise.all([
      loadCategories(),
      loadSummary({ force: true }),
      loadReal({ trashed: showArchived.value, refreshSummary: false }),
    ]);
    return normalizeCategory(result.category || {});
  }

  async function deleteCategory(category) {
    const result = await medya.deleteCategory(category);
    await Promise.all([loadCategories(), loadSummary({ force: true })]);
    return result;
  }

  async function setCategories(id, categoryIds) {
    const item = items.value.find((row) => row.id === id);
    if (!item || !canEdit(item)) return false;
    const result = await medya.setCategories(id, categoryIds);
    item.categories = normalizeCategoryAssignments(result.categories);
    await loadSummary({ force: true });
    return true;
  }

  async function suggestCategories(id, source = "") {
    const result = await medya.suggestCategories(id, source);
    return (result.suggestions || []).map((row) => ({
      ...normalizeCategory(row),
      confidence: Number(row.confidence) || 0,
      evidence: row.evidence || [],
      assignmentSource: "suggestion",
    }));
  }

  async function applyCategorySuggestions(id, options = {}) {
    const item = items.value.find((row) => row.id === id);
    if (!item || !canEdit(item)) return null;
    const result = await medya.applyCategorySuggestions(id, options);
    item.categories = normalizeCategoryAssignments(result.categories);
    await loadSummary({ force: true });
    return {
      ...result,
      suggestions: (result.suggestions || []).map((row) => ({
        ...normalizeCategory(row),
        confidence: Number(row.confidence) || 0,
        evidence: row.evidence || [],
      })),
    };
  }

  /**
   * Seçili dosyalara etiket ekle — mağaza bazında saklanır.
   *
   * Arka taraf ortak toplu işlem sözleşmesini döndürür; sahip olunmayanlar
   * kimlik sızdırmadan `skipped`, yazma hataları dosya bazında `failed` olur.
   */
  async function addTagToMany(ids, tag) {
    const clean = (tag || "").trim();
    if (!clean || !ids.length) return summarizeBulk("tag", {}, "tagged");
    bulkBusy.value = true;
    try {
      const sonuc = await medya.addTag(ids, clean);
      const rapor = summarizeBulk("tag", sonuc, "tagged");
      bulkReport.value = rapor.partial ? rapor : null;
      selectedIds.value = [];
      // Arşiv görünümündeyken aktif listeyi yüklemek ekranı boşaltıyordu:
      // gelen kayıtlar `archived: false` olurken süzgeç `archived: true` arar.
      await loadReal({ trashed: showArchived.value });
      return rapor;
    } finally {
      bulkBusy.value = false;
    }
  }

  /**
   * MOGEM-620 §14 — seçime alan yazan toplu işlemler (telif/lisans/ad).
   *
   * `addTagToMany` ile AYNI iskelet: meşgul bayrağı, kısmi rapor, seçimi
   * temizle, listeyi tazele. Ayrı bir akış yazmak, birinde unutulan bir
   * adımın (ör. listeyi tazelememek) diğerinde olması demekti.
   *
   * Sayaç anahtarı `applied`: arka taraf `bulk_ops` sözleşmesi
   * `{applied, files, skipped, failed}` döndürüyor ve `summarizeBulk`
   * hangi anahtarı okuyacağını çağırandan alıyor.
   */
  async function bulkFieldsMany(ids, values) {
    if (!ids.length) return summarizeBulk("fields", {}, "applied");
    bulkBusy.value = true;
    try {
      const sonuc = await medya.bulkUpdateSeo(ids, values);
      const rapor = summarizeBulk("fields", sonuc, "applied");
      bulkReport.value = rapor.partial ? rapor : null;
      selectedIds.value = [];
      await loadReal({ trashed: showArchived.value });
      return rapor;
    } finally {
      bulkBusy.value = false;
    }
  }

  /** §14 — desene göre toplu yeniden adlandırma. */
  async function bulkRenameMany(ids, pattern, start = 1) {
    if (!ids.length || !String(pattern || "").trim()) {
      return summarizeBulk("rename", {}, "applied");
    }
    bulkBusy.value = true;
    try {
      const sonuc = await medya.bulkRename(ids, pattern, start);
      const rapor = summarizeBulk("rename", sonuc, "applied");
      bulkReport.value = rapor.partial ? rapor : null;
      selectedIds.value = [];
      await loadReal({ trashed: showArchived.value });
      return rapor;
    } finally {
      bulkBusy.value = false;
    }
  }

  /**
   * Arşivle / arşivden çıkar — arka tarafta "bırakma" ve "geri alma".
   *
   * Satıcının silmesi dosyayı yok etmiyor: yalnız KENDİ bağları temizleniyor
   * ve kendi sahipliği düşüyor. Aynı dosyayı başka bir mağaza da kullanıyorsa
   * onun ürünü olduğu gibi kalıyor; dosya diskten ancak son sahip de
   * bıraktığında gidiyor. Bu yüzden burada yerel bir bayrak çevrilmiyor,
   * gerçek çağrı yapılıp liste yeniden okunuyor.
   */
  async function archiveMany(ids, archived = true) {
    const bos = summarizeBulk(archived ? "archive" : "unarchive", {}, "archived");
    if (!ids.length) return bos;

    bulkBusy.value = true;
    try {
      const sonuc = archived ? await medya.archive(ids) : await medya.unarchive(ids);
      const rapor = summarizeBulk(
        archived ? "archive" : "unarchive",
        sonuc,
        archived ? "archived" : "unarchived"
      );
      bulkReport.value = rapor.partial ? rapor : null;
      selectedIds.value = [];
      await loadReal({ trashed: showArchived.value });
      if (rapor.ok) {
        undoEntry.value = {
          type: archived ? "archive" : "unarchive",
          count: rapor.ok,
          restore: () => archiveMany(ids, !archived),
        };
      }
      return rapor;
    } finally {
      bulkBusy.value = false;
    }
  }

  /**
   * Sil — arka tarafta yine "bırakma".
   *
   * Geri alma yerel bir anlık görüntüden değil, gerçek "geri al" çağrısından
   * geliyor. Eskiden silinen kayıtlar bellekte tutuluyor ve geri alınca
   * listeye geri konuyordu; o yalnız ekranı kandırıyordu, veride hiçbir şey
   * değişmiyordu.
   */
  /**
   * Sil — ARŞİVE taşır, geri alınabilir.
   *
   * Kalıcı silme ayrı işlem (`purgeMany`) ve yalnız arşivden yapılabiliyor.
   * Eskiden ikisi tek yoldu; kullanıcı neyin geri alınabilir olduğunu
   * göremiyordu.
   */
  async function removeMany(ids) {
    if (!ids.length) return summarizeBulk("delete", {}, "archived");

    bulkBusy.value = true;
    try {
      const rapor = summarizeBulk("delete", await medya.archive(ids), "archived");
      bulkReport.value = rapor.partial ? rapor : null;
      selectedIds.value = [];
      if (ids.includes(activeId.value)) activeId.value = null;
      await loadReal({ trashed: showArchived.value });
      if (rapor.ok) {
        undoEntry.value = {
          type: "delete",
          count: rapor.ok,
          restore: async () => {
            await medya.unarchive(ids);
            await loadReal({ trashed: showArchived.value });
            undoEntry.value = null;
          },
        };
      }
      return rapor;
    } finally {
      bulkBusy.value = false;
    }
  }

  /**
   * KALICI SİL — geri alınamaz, geri alma kaydı BIRAKILMAZ.
   *
   * Dosya diskten yalnız son sahip de sildiğinde gider; o ana kadar diğer
   * mağazalar etkilenmez.
   */
  async function purgeMany(ids) {
    if (!ids.length) return summarizeBulk("purge", {}, "purged");

    bulkBusy.value = true;
    try {
      const rapor = summarizeBulk("purge", await medya.purge(ids), "purged");
      bulkReport.value = rapor.partial ? rapor : null;
      selectedIds.value = [];
      if (ids.includes(activeId.value)) activeId.value = null;
      undoEntry.value = null;
      await loadReal({ trashed: showArchived.value });
      return rapor;
    } finally {
      bulkBusy.value = false;
    }
  }

  /**
   * Bırakmadan ÖNCE sunucuya sor — hiçbir şey silmez, yalnız okur.
   *
   * Onay penceresi bugüne kadar uyarısını listeyle birlikte gelen
   * `liveUsage` sayısından kuruyordu. O sayı listenin YÜKLENDİĞİ andan
   * kalma: aradan geçen sürede aynı görsel bir ürüne eklenmiş olabilir
   * (başka sekme, başka kullanıcı, içeri aktarma işi). Ekran "hiçbir yerde
   * kullanılmıyor" der, kullanıcı kalıcı silmeyi onaylar.
   *
   * `preview_release` kararı SİLME ANINDAKİ veriden veriyor. Ne silinip ne
   * kalacağının son sözü yine arka tarafta — bu çağrı yalnız onay metnini
   * doğru kurmak için.
   */
  async function previewRelease(ids) {
    if (!ids.length) return null;
    return medya.previewRelease(ids);
  }

  /** Favori aç/kapat — ortak medyada da serbest (kişisel işaret). */
  /**
   * Favori işareti — mağaza bazında saklanır.
   *
   * Paylaşılan bir dosyada her mağazanın kendi işareti olur; biri diğerinin
   * favorisini değiştiremez.
   */
  async function toggleFavorite(id) {
    const item = items.value.find((m) => m.id === id);
    if (!item) return false;
    const kayitli = await medya.toggleFavorite(id);
    item.favorite = Boolean(kayitli.favorite);
    return item.favorite;
  }

  /**
   * Başarısız video işlemesini yeniden başlat (TUR-296).
   *
   * Arka taraf yalnız `failed` durumunu kabul eder; başarıda durum hemen
   * `processing`'e çekilir ki rozet beklemeden değişsin — sonraki liste
   * yenilemesi gerçek durumu zaten getirir.
   */
  async function retryVideo(id) {
    const item = items.value.find((m) => m.id === id);
    if (!item || item.videoStatus !== "failed") return false;
    const sonuc = await medya.retryVideo(id);
    item.videoStatus = sonuc.status || "processing";
    return true;
  }

  /** Dosya adını değiştirir; uzantı korunur. */
  /**
   * Görünen adı değiştir.
   *
   * Dosyanın YOLU değişmez — değişseydi onu gösteren her ürün, vitrin ve
   * sipariş kaydı kırılırdı. Uzantıyı arka taraf koruyor.
   */
  async function rename(id, nextName) {
    const item = items.value.find((m) => m.id === id);
    const clean = (nextName || "").trim();
    if (!item || !canEdit(item) || !clean) return false;
    const kayitli = await medya.rename(id, clean);
    item.fileName = kayitli.file_name;
    return true;
  }

  /** Kaydı çoğaltır — kullanım bağları taşınmaz, yeni kayıt boştur. */
  /** Gerçek bir kopya üret — kaynağından bağımsız, hiçbir üründe kullanımı yok. */
  async function duplicate(id) {
    const item = items.value.find((m) => m.id === id);
    if (!item) return null;
    await medya.duplicate(id);
    await loadReal();
    return items.value.find((m) => m.fileName.includes("-kopya")) || null;
  }

  /**
   * Dosyayı değiştirir — kayıt, kullanım bağları ve metin alanları korunur.
   * Gerçek yükleme yok; yalnız boyut/tür/uzantı güncellenir.
   */
  /**
   * Dosyanın içeriğini değiştir.
   *
   * Aynı görseli başka bir mağaza da kullanıyorsa arka taraf REDDEDER: onun
   * ürününde bambaşka bir görsel çıkmasın diye. Hata kullanıcıya gösterilir.
   */
  async function replaceFile(id, file) {
    const item = items.value.find((m) => m.id === id);
    if (!item || !canEdit(item) || !file) return false;
    await medya.replace(id, file);
    await loadReal();
    return true;
  }

  /** Mock dosya bağlantısı — kopyala butonları bunu kullanır. */
  /** Dosyanın gerçek adresi. Eskiden uydurma bir yol üretiliyordu. */
  function fileUrl(item) {
    return item?.fileUrl || item?.id || "";
  }

  /** Son yıkıcı işlemi geri alır; yoksa false döner. */
  /** Son işlemi geri al — geri alma da arka tarafa gidiyor, beklenmeli. */
  async function undo() {
    if (!undoEntry.value) return false;
    const entry = undoEntry.value;
    undoEntry.value = null;
    await entry.restore();
    undoEntry.value = null;
    return true;
  }

  // ── actions: yükleme (mock ilerleme) ───────────────────────────────
  function extOf(name) {
    const dot = name.lastIndexOf(".");
    return dot > -1 ? name.slice(dot + 1).toUpperCase() : "DOSYA";
  }

  // Otomatik yeniden deneme: kaç kez ve aralarında ne kadar beklenecek.
  //
  // Geçici hatalar (ağ kopması, sunucu 5xx) kendiliğinden düzelebiliyor;
  // kullanıcıyı düğmeye basmaya zorlamak gereksiz. Politika reddi ise
  // denenmiyor — aynı dosya aynı cevabı verir, tekrar denemek yalnız gürültü.
  const MAX_RETRY = 3;
  const RETRY_DELAYS_MS = [1000, 3000, 8000];

  // Boyut kapısının BAKTIĞI sebepler — `preflight.js:268`'in "asıl kapısı".
  // Yalnız asgari boyut (kısa kenar + alan): sunucu bunları 417 ile reddediyor
  // (rapor 78 · W7-3) ama `precheck` boyuta HİÇ bakmıyordu, dosya boşa yükleme
  // turluyordu. En-boy oranı BİLEREK dışarıda: sayfa-içi dropzone ve
  // PickerModal genel kütüphaneye yüklüyor (slot seçimi yok); orada oran
  // dayatmak, satıcının banner için bıraktığı geniş görseli yanlışlıkla
  // keserdi. Oran kapısı yalnız slot BEYAN EDEN `MediaUploader` yolunda kalır.
  const BOYUT_KAPISI_SEBEPLERI = new Set(["short_edge_too_small", "area_too_small"]);

  /**
   * Görseli ölç, slotun asgari-boyut kuralına vur (TUR-123 · rapor 78).
   *
   * ÖLÇÜMÜ KOPYALAMAZ — `preflight.js`/`probe.js` yolunu (`runPreflight`)
   * olduğu gibi yeniden kullanır: ölçüm işçisi yoksa ana iş parçacığındaki
   * başlıktan-boyut yedeği koşar. Slot verilmemişse (`slotKey` boş) HİÇBİR ŞEY
   * yapmaz — bugünkü davranış. Yalnız görsel ölçülür; video/PDF slotun asgari
   * görsel boyutuna tabi değildir. Ölçüm çökerse `null` döner (reddetmez,
   * sunucu bakacak).
   *
   * @returns {Promise<{code: string, params: object}|null>} engel varsa kod+param.
   */
  async function boyutKapisi(file, slotKey) {
    if (!slotKey || !file?.type?.startsWith("image/")) return null;
    let sonuc;
    try {
      sonuc = await runPreflight(file, { slotKey });
    } catch {
      return null;
    }
    const engel = (sonuc.findings || []).find(
      (f) => f.severity === SEVERITY.BLOCK && BOYUT_KAPISI_SEBEPLERI.has(f.reason)
    );
    return engel ? { code: engel.reason, params: engel.params || {} } : null;
  }

  /**
   * Dosyaları kuyruğa al (TUR-123).
   *
   * ÖN KONTROL BURADA: dosya daha gönderilmeden tür ve boyut bakılıyor.
   * Eskiden tarayıcıda hiçbir kontrol yoktu; 21 MB'lık bir dosya base64'e
   * çevrilip (~28 MB) gönderiliyor ve sunucuda reddediliyordu. Aynı cevap
   * seçim anında verilebilir.
   *
   * `slotKey` verilirse asgari-boyut kapısı da koşar: küçük görsel (kısa kenar
   * / alan slot sınırının altında) SEÇİM ANINDA elenir, tek bayt gönderilmez.
   * Slot verilmezse yalnız `precheck` — bugünkü davranış.
   *
   * Kontrol karar VERMEZ, hızlandırır — sunucu her kuralı yeniden uyguluyor.
   */
  async function enqueueUploads(files, { slotKey = "" } = {}) {
    await policy.loadLimits();
    for (const file of files) {
      const id = `up-${++uploadSeq}`;
      let kontrol = await policy.precheck(file);

      // `precheck` (ad/boş/uzantı/bayt/tehlikeli) geçtiyse asgari-boyut kapısı.
      if (kontrol.ok) {
        const kucuk = await boyutKapisi(file, slotKey);
        if (kucuk) kontrol = { ok: false, code: kucuk.code, params: kucuk.params };
      }

      uploads.value = [
        ...uploads.value,
        {
          id,
          name: file.name,
          bytes: file.size,
          kind: kindOfFile(file),
          ext: extOf(file.name),
          // Yükleme öncesi ön izleme: dosya tarayıcıdan okunuyor, sunucuya
          // gitmesi beklenmiyor. On dosya birden atıldığında hangisinin ne
          // olduğunu addan çıkarmak gerekiyordu.
          //
          // Adres KUYRUKTAN ÇIKARKEN serbest bırakılıyor (bkz. `_onizlemeBirak`):
          // bırakılmazsa dosyanın tamamı bellekte tutulmaya devam eder ve
          // 12 MB'lık on dosya 120 MB demek.
          previewUrl: file.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
          progress: 0,
          status: kontrol.ok ? "uploading" : "error",
          // Ret sebebi KOD olarak tutuluyor, metin olarak değil: ekran çeviriyi
          // kendisi seçer, mağaza ekranı ile e-posta bildirimi aynı koda farklı
          // metin verebilir.
          errorCode: kontrol.ok ? null : kontrol.code,
          errorParams: kontrol.params || null,
          error: null,
          attempt: 0,
          retryAt: 0,
          // Yeniden deneme için dosyanın kendisi tutuluyor.
          file,
        },
      ];
      if (kontrol.ok) runUpload(id);
    }
  }

  // Süren yüklemelerin iptal düğmeleri. Kuyruk satırıyla birlikte tutulamaz:
  // satır dizisi her değişiklikte yeniden kuruluyor ve iptal işaretçisi
  // kopyalanınca çalışmaz hâle gelirdi.
  const iptaller = new Map();

  /**
   * Dosyayı yükle — gerçek ilerleme, gerçek iptal, otomatik yeniden deneme.
   *
   * İlerleme artık uydurma değil: büyük dosya parçalar hâlinde gidiyor ve her
   * parça sonrası yüzde güncelleniyor. Küçük dosyada tek adım kalıyor, orada
   * ara değer üretmek yalan olurdu.
   */
  async function runUpload(uploadId, { manual = false } = {}) {
    const up = uploads.value.find((u) => u.id === uploadId);
    if (!up || !up.file) return;

    if (manual) up.attempt = 0;
    up.status = "uploading";
    up.progress = 0;
    up.error = null;
    up.errorCode = null;
    up.retryAt = 0;

    const ctrl = new AbortController();
    iptaller.set(uploadId, ctrl);

    try {
      await medya.upload(up.file, {
        signal: ctrl.signal,
        onProgress: (p) => {
          const satir = uploads.value.find((u) => u.id === uploadId);
          if (satir) satir.progress = p;
        },
      });
      up.progress = 100;
      up.status = "done";
      await loadReal();
    } catch (e) {
      if (e?.name === "AbortError") {
        // İptal hata değil; satır zaten kaldırıldı.
        return;
      }
      up.progress = 0;
      up.errorCode = e?.code || "";
      up.error = e?.message || "uploadFailed";

      if (policy.isRetryable(e) && up.attempt < MAX_RETRY) {
        const bekleme = RETRY_DELAYS_MS[up.attempt] || 8000;
        up.attempt += 1;
        up.status = "retrying";
        up.retryAt = Date.now() + bekleme;
        setTimeout(() => {
          // Bu arada iptal edilmiş olabilir.
          if (uploads.value.some((u) => u.id === uploadId)) runUpload(uploadId);
        }, bekleme);
      } else {
        up.status = "error";
      }
    } finally {
      iptaller.delete(uploadId);
    }
  }

  function retryUpload(uploadId) {
    return runUpload(uploadId, { manual: true });
  }

  /**
   * Kuyruktan çıkar ve YÜKLEMEYİ GERÇEKTEN DURDUR.
   *
   * Eskiden istek iptal edilmiyordu: satır listeden siliniyor ama dosya
   * yüklenmeye devam edip kütüphanede beliriyordu — kullanıcı iptal ettiğini
   * sandığı dosyayı listede buluyordu. Artık gönderim durduruluyor ve parçalı
   * yüklemede sunucudaki yarım oturum da temizleniyor.
   */
  function cancelUpload(uploadId) {
    iptaller.get(uploadId)?.abort();
    iptaller.delete(uploadId);
    const cikan = uploads.value.find((u) => u.id === uploadId);
    if (cikan) _onizlemeBirak(cikan);
    uploads.value = uploads.value.filter((u) => u.id !== uploadId);
  }

  function clearFinishedUploads() {
    const kalan = uploads.value.filter((u) => u.status === "uploading" || u.status === "retrying");
    for (const u of uploads.value) {
      if (!kalan.includes(u)) _onizlemeBirak(u);
    }
    uploads.value = kalan;
  }

  /**
   * Ön izleme adresini serbest bırak.
   *
   * Tarayıcı bu adres için dosyanın tamamını bellekte tutuyor ve sayfa
   * kapanana kadar kendiliğinden bırakmıyor. Kuyruktan çıkan her satırda
   * çağrılmalı, yoksa çok dosyalı yüklemeden sonra bellek yüksek kalır.
   */
  function _onizlemeBirak(up) {
    if (up?.previewUrl) {
      URL.revokeObjectURL(up.previewUrl);
      up.previewUrl = "";
    }
  }

  return {
    // state
    items,
    loading,
    loadError,
    serverTotal,
    manifestLoading,
    search,
    nameFilter,
    kindFilter,
    usageFilter,
    ownerFilter,
    showArchived,
    formatFilter,
    orientationFilter,
    dateFilter,
    sizeFilter,
    sizeRange,
    usageRange,
    dateRange,
    tagFilter,
    categoryFilter,
    flagFilter,
    sorting,
    page,
    pageSize,
    selectedIds,
    activeId,
    undoEntry,
    bulkBusy,
    bulkProgress,
    bulkReport,
    categoryCatalog,
    categoryLoading,
    uploads,
    // getters
    activeItem,
    selectedItems,
    counts,
    filtered,
    paged,
    totalPages,
    availableTags,
    availableCategories,
    availableFormats,
    hasActiveFilter,
    // actions
    isSelected,
    toggleSelect,
    selectRangeTo,
    undo,
    setActive,
    selectAllVisible,
    selectPage,
    clearSelection,
    resetFilters,
    toggleTag,
    toggleSortDir,
    canEdit,
    ensureDimensions,
    update,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    setCategories,
    suggestCategories,
    applyCategorySuggestions,
    toggleFavorite,
    retryVideo,
    rename,
    duplicate,
    replaceFile,
    fileUrl,
    addTagToMany,
    bulkFieldsMany,
    bulkRenameMany,
    reprocessMany,
    archiveMany,
    removeMany,
    purgeMany,
    previewRelease,
    clearBulkReport,
    loadReal,
    loadUsage,
    assetNameOf,
    loadVisibleManifests,
    loadSummary,
    storage,
    enqueueUploads,
    retryUpload,
    cancelUpload,
    clearFinishedUploads,
  };
});
