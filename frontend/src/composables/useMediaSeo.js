import { computed, ref } from "vue";

import api from "@/utils/api";

const M = "tradehub_core.api.media_admin";

/** Dil sekmeleri — backend `seo/i18n.CONTENT_LANGS` ile AYNI sıra. */
export const LANGS = ["tr", "en", "ar", "ru"];

/** Bulgu kodu → hangi karne başlığını düşürür. Backend `seo_audit._KURAL_BOYUT`
 *  ile aynı eşleme; burada yalnız GÖSTERİM için (rozet rengi, gruplama). */
export const DIMENSIONS = [
  "accessibility",
  "metadata",
  "performance",
  "rights",
  "discoverability",
  "structured_data",
  "localization",
  "technical_health",
];

/**
 * Medya SEO ekranı (TUR-135 Dilim 3) — denetim, karne ve düzenleme.
 *
 * Ekranın veri kaynağı TEK uç değil: liste `audit_media_seo`'dan, tek dosyanın
 * alanları `get_media_seo`'dan gelir. Ayrım bilinçli — denetim toplu ve saf
 * (kullanım sorgusu kapalı), düzenleme ise dosya başına ve tam.
 *
 * `deep` kullanım taramasını açar: bir görselin hiçbir sayfada kullanılmadığını
 * bulmak 16 tablo taraması demek, 200 dosyada pahalı. Varsayılan KAPALI;
 * operatör isterse açar.
 */
export function useMediaSeo() {
  const items = ref([]);
  const summary = ref({});
  const score = ref({});
  const total = ref(0);
  const loading = ref(false);
  const acting = ref("");
  const error = ref(null);
  const pipelineStatus = ref(null);

  const deep = ref(false);
  const filterCode = ref("");
  const search = ref("");
  const page = ref(1);
  const pageSize = ref(50);
  const pageCount = ref(1);
  const filteredTotal = ref(0);
  /** Hangi dosyalar taranıyor: catalog (vitrindeki ürün görselleri) | recent | all.
   *  Varsayılan "catalog" — "recent" ile açıldığında ekran test kalıntılarını
   *  gösteriyordu (ölçüldü: ilk 10 satırın 10'u test videosu). */
  const scope = ref("catalog");

  // Seçili dosyanın tam alanları (düzenleme çekmecesi).
  const selected = ref(null);
  const selectedFields = ref(null);
  const savingFields = ref(false);

  /** Süzme ve sayfalama SUNUCUDA yapılıyor: istemcide süzmek yalnız görünen
   *  50 satırı süzerdi ve "3 sonuç" derken aslında 300 sonuç olurdu. */
  const visibleItems = computed(() => items.value);

  /** Sayaç şeridi: kod → adet, çoktan aza. */
  const counters = computed(() =>
    Object.entries(summary.value || {})
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
  );

  const hasError = computed(() =>
    items.value.some((r) => (r.findings || []).some((f) => f.severity === "error"))
  );

  async function load({ refresh = false } = {}) {
    loading.value = true;
    error.value = null;
    try {
      const r = await api.callMethodGET(`${M}.audit_media_seo`, {
        deep: deep.value ? 1 : 0,
        scope: scope.value,
        page: page.value,
        page_size: pageSize.value,
        code: filterCode.value,
        q: search.value,
        refresh: refresh ? 1 : 0,
      });
      const msg = r.message || {};
      items.value = msg.files || [];
      summary.value = msg.summary || {};
      score.value = msg.score || {};
      total.value = msg.total || 0;
      filteredTotal.value = msg.filtered_total || 0;
      pageCount.value = msg.page_count || 1;
    } catch (e) {
      error.value = e.message;
      items.value = [];
      summary.value = {};
      score.value = {};
    } finally {
      loading.value = false;
    }
  }

  async function loadPipelineStatus() {
    const r = await api.callMethodGET(`${M}.get_rendition_backfill_status`);
    pipelineStatus.value = r.message || null;
    return pipelineStatus.value;
  }

  async function startRenditionBackfill(count = 100) {
    acting.value = "__renditions";
    try {
      const r = await api.callMethod(`${M}.start_rendition_backfill`, { limit: count });
      await loadPipelineStatus();
      return r.message || {};
    } finally {
      acting.value = "";
    }
  }

  async function retryFailedRenditions(count = 50) {
    acting.value = "__retry_renditions";
    try {
      const r = await api.callMethod(`${M}.retry_failed_renditions`, { limit: count });
      await loadPipelineStatus();
      return r.message || {};
    } finally {
      acting.value = "";
    }
  }

  /** Süzgeç değişince SAYFA 1'e dönülür: 397. sayfadayken süzgeç seçmek
   *  boş liste gösterirdi. */
  async function setFilter(code) {
    filterCode.value = filterCode.value === code ? "" : code;
    page.value = 1;
    await load();
  }

  async function setScope(next) {
    scope.value = next;
    page.value = 1;
    await load();
  }

  async function applySearch(text) {
    search.value = text;
    page.value = 1;
    await load();
  }

  async function goPage(n) {
    page.value = Math.min(Math.max(1, Number(n) || 1), pageCount.value);
    await load();
  }

  /** Sayfa boyutu değişince 1. sayfaya dönülür: 40. sayfadayken 100'e geçmek
   *  var olmayan bir sayfayı isterdi. */
  async function setPageSize(n) {
    pageSize.value = Number(n) || 50;
    page.value = 1;
    await load();
  }

  /** Dosyayı seç ve TAM alanlarını getir (liste yalnız bulgu + skor taşıyor). */
  async function select(row) {
    selected.value = row;
    selectedFields.value = null;
    if (!row) return;
    try {
      const r = await api.callMethodGET(`${M}.get_media_seo`, { file_url: row.file_url });
      selectedFields.value = r.message || {};
    } catch (e) {
      error.value = e.message;
    }
  }

  function closeDrawer() {
    selected.value = null;
    selectedFields.value = null;
  }

  /** Tek kayıt değiştiğinde tüm katalogu yeniden taramak yerine yalnız
   *  o satırı uzlaştır. Tam özet operatörün Yenile aksiyonunda güncellenir. */
  async function refreshRow(fileUrl, { refreshDrawer = true } = {}) {
    const audit = await api.callMethodGET(`${M}.audit_media_seo`, {
      file_urls: JSON.stringify([fileUrl]),
      deep: 0,
    });
    const fresh = audit.message?.files?.[0];
    if (fresh) {
      const index = items.value.findIndex((item) => item.file_url === fileUrl);
      if (index >= 0) items.value[index] = fresh;
    }
    if (refreshDrawer && selected.value?.file_url === fileUrl) {
      await select(fresh || selected.value);
    }
    return fresh;
  }

  /** Alan yazımı — yalnız DEĞİŞEN alanlar gönderilir.
   *  Tamamını göndermek, dokunulmamış bir alanı boş değerle ezme riski taşır
   *  (backend beyaz listesi yazımı engellemiyor, yalnız bilinmeyen alanı eliyor). */
  async function saveFields(values) {
    if (!selected.value) return;
    savingFields.value = true;
    try {
      await api.callMethod(`${M}.set_media_seo`, {
        file_url: selected.value.file_url,
        values: JSON.stringify(values),
      });
      await refreshRow(selected.value.file_url);
    } finally {
      savingFields.value = false;
    }
  }

  async function saveOverride(usage, values) {
    if (!selected.value) return;
    await api.callMethod(`${M}.set_media_seo_override`, {
      file_url: selected.value.file_url,
      ref_doctype: usage.ref_doctype,
      ref_name: usage.ref_name,
      ref_field: usage.ref_field,
      values: JSON.stringify(values),
    });
    await refreshRow(selected.value.file_url);
  }

  async function clearOverride(usage) {
    if (!selected.value) return;
    await api.callMethod(`${M}.clear_media_seo_override`, {
      file_url: selected.value.file_url,
      ref_doctype: usage.ref_doctype,
      ref_name: usage.ref_name,
      ref_field: usage.ref_field,
    });
    await refreshRow(selected.value.file_url);
  }

  async function setIndexability(visibility) {
    if (!selected.value) return;
    await api.callMethod(`${M}.set_media_indexability`, {
      file_url: selected.value.file_url,
      visibility,
    });
    await refreshRow(selected.value.file_url);
  }

  async function generateAlt(fileUrl, force = false) {
    acting.value = fileUrl;
    try {
      const r = await api.callMethod(`${M}.generate_media_alt`, {
        file_url: fileUrl,
        force: force ? 1 : 0,
      });
      const result = r.message || {};
      // Tek ALT üretimi sonrası binlerce dosyalık kapsamı yeniden audit
      // etmek aksiyonu saniyelerce kilitliyordu. Yalnız etkilenen satırı
      // denetle; genel sayaçlar sonraki normal yenilemede uzlaşır.
      await refreshRow(fileUrl);
      return result;
    } finally {
      acting.value = "";
    }
  }

  /** Toplu işler — backend parça parça çalışıyor (500'lük turlar), burada
   *  tek tur çağrılıyor ve sonucu operatöre söyleniyor. Sonsuz döngü YOK:
   *  "N kaldı" bilgisi dönüyor, operatör tekrar basıyor. */
  async function backfillAlt(count = 500) {
    acting.value = "__alt";
    try {
      const r = await api.callMethod(`${M}.backfill_media_alt`, {
        limit: count,
        only_listing: 1,
      });
      await load({ refresh: true });
      return r.message;
    } finally {
      acting.value = "";
    }
  }

  async function backfillDimensions(count = 500) {
    acting.value = "__dim";
    try {
      const r = await api.callMethod(`${M}.backfill_media_dimensions`, { limit: count });
      await load({ refresh: true });
      return r.message;
    } finally {
      acting.value = "";
    }
  }

  return {
    items, visibleItems, summary, counters, score, total,
    loading, acting, error, pipelineStatus, deep, scope, filterCode, search, hasError,
    page, pageSize, pageCount, filteredTotal,
    selected, selectedFields, savingFields,
    load, setFilter, setScope, applySearch, goPage, setPageSize,
    select, closeDrawer, saveFields, saveOverride, clearOverride, setIndexability,
    generateAlt, backfillAlt, backfillDimensions,
    loadPipelineStatus, startRenditionBackfill, retryFailedRenditions,
  };
}
