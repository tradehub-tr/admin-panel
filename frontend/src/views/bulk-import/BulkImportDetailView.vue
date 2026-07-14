<script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import { storeToRefs } from "pinia";
  import AppIcon from "@/components/common/AppIcon.vue";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { useAuthStore } from "@/stores/auth";
  import { isIncompleteImport } from "@/utils/importStatus";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const auth = useAuthStore();
  const { isAdmin } = storeToRefs(auth);

  // Sayfa-içi onboarding: özet/istatistik → aksiyonlar → hata satırları tablosu.
  usePageTour("bulk-import-detail", () => [
    {
      target: '[data-tour="bid-summary"]',
      title: t("tourSteps.page.bidSummary_t"),
      desc: t("tourSteps.page.bidSummary_d"),
    },
    {
      target: '[data-tour="bid-actions"]',
      title: t("tourSteps.page.bidActions_t"),
      desc: t("tourSteps.page.bidActions_d"),
    },
    {
      target: '[data-tour="bid-errors"]',
      title: t("tourSteps.page.bidErrors_t"),
      desc: t("tourSteps.page.bidErrors_d"),
    },
  ]);

  const jobName = computed(() => route.params.name);

  const job = ref(null);
  const loading = ref(false);
  const downloading = ref(false);
  const retrying = ref(false);
  const approving = ref(false);
  // Bu job'tan eklenen + hâlâ Pending durumda olan Listing sayısı. job.inserted
  // sabit (job snapshot'ı) — onay sonrası değişmez; buton/etiket bu canlı sayıya
  // bağlanmalı.
  const pendingCount = ref(0);
  // Hata satırlarındaki SKU → mevcut Listing eşleşmesi ({sku: listing_name}).
  // Eşleşen ürün varsa hata tablosunda SKU tıklanabilir olur (özellikle
  // "duplicate" hatasında çakışan ürüne yönlendirir).
  const skuMatches = ref({});

  let liveTimer = null;
  const POLL_INTERVAL_MS = 3000;

  // DocType field adlarını (status / total_rows / inserted_count / …) polling
  // cache'in kullandığı kısa adlara (state / total / inserted / …) aliasla.
  // Tek bir okuma noktası → template her iki kaynaktan da tutarlı değer alır.
  function _aliasJob(data) {
    if (!data) return null;
    data.state = String(data.status || "").toLowerCase();
    data.total = data.total_rows ?? 0;
    data.inserted = data.inserted_count ?? 0;
    data.updated = data.updated_count ?? 0;
    data.skipped = data.skipped_count ?? 0;
    data.duration = data.duration_seconds ?? null;
    data.start_time = data.started_at;
    data.end_time = data.completed_at;
    data.file_name = data.data_file;
    return data;
  }

  async function loadJob() {
    if (!jobName.value) return;
    loading.value = true;
    try {
      const res = await api.getDoc("Bulk Import Job", jobName.value);
      job.value = _aliasJob(res.data || null);
      await loadPendingCount();
      await resolveErrorSkus();
    } catch (e) {
      toast.error(e.message || t("bulkImportDetail.loadJobFailed"));
      job.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function loadPendingCount() {
    if (!jobName.value) {
      pendingCount.value = 0;
      return;
    }
    try {
      // api.getCount tüm Frappe response'unu ({ message: <n> }) döner —
      // n.message üzerinden oku (diğer caller'lar aynı deseni kullanıyor:
      // stores/crm.js:82, SellerMetricsList.vue:310). Doğrudan Number(res)
      // yapmak NaN üretiyordu → buton hep gizli kalıyordu.
      const res = await api.getCount("Listing", {
        created_by_bulk_job: jobName.value,
        status: "Pending",
      });
      pendingCount.value = Number(res?.message) || 0;
    } catch (e) {
      console.warn("Pending count fetch failed:", e?.message || e);
      pendingCount.value = 0;
    }
  }

  // Hata satırı SKU'larını mevcut Listing'lerle eşleştir — yalnızca eşleşen
  // ürün varsa tabloda link gösterilir. Hata olmayan job'da boş döner.
  async function resolveErrorSkus() {
    skuMatches.value = {};
    if (!jobName.value || !errorRows.value.length) return;
    try {
      const res = await api.callMethod("tradehub_core.bulk_import.api.resolve_error_skus", {
        job_name: jobName.value,
      });
      skuMatches.value = res.message?.matches || {};
    } catch (e) {
      console.warn("resolve_error_skus failed:", e?.message || e);
    }
  }

  // Child rows (Bulk Import Job Error) Frappe'de /api/resource ile çekilemez —
  // parent-permission check'i 403 verir. getDoc parent'ı çekerken zaten
  // `error_details` field'ında child rows'ı getirir; doğrudan oradan okuyoruz.
  const errorRows = computed(() => job.value?.error_details || []);

  function startLivePolling() {
    stopLivePolling();
    const s = String(job.value?.state || "").toLowerCase();
    // Sadece aktif job için polling — terminal state'lerde poll'lemeye gerek yok
    if (!["queued", "running", "in_progress"].includes(s)) return;
    liveTimer = setInterval(async () => {
      try {
        const res = await api.callMethodGET("tradehub_core.bulk_import.api.get_import_status", {
          job_name: jobName.value,
        });
        const data = res.message || {};
        if (job.value) {
          job.value.state = data.state || job.value.state;
          job.value.total = data.total ?? job.value.total;
          job.value.processed = data.processed ?? job.value.processed;
          job.value.inserted = data.inserted ?? job.value.inserted;
          job.value.updated = data.updated ?? job.value.updated;
          job.value.skipped = data.skipped ?? job.value.skipped;
          job.value.error_count = data.error_count ?? job.value.error_count;
          if (data.error_details) job.value.error_details = data.error_details;
          if (data.error_summary !== undefined) job.value.error_summary = data.error_summary;
        }
        const newState = String(data.state || "").toLowerCase();
        if (["completed", "done", "partial", "failed", "error"].includes(newState)) {
          stopLivePolling();
          // Terminal'e geçince DocType field'ları (status, *_count) güncellenmiş
          // olur; tek getDoc çağrısı ile tam state'i yeniden al.
          reloadDetail();
        }
      } catch (e) {
        console.warn("Detail polling failed:", e?.message || e);
      }
    }, POLL_INTERVAL_MS);
  }

  function reloadDetail() {
    return loadJob();
  }

  function stopLivePolling() {
    if (liveTimer) {
      clearInterval(liveTimer);
      liveTimer = null;
    }
  }

  onMounted(async () => {
    await loadJob();
    startLivePolling();
  });

  onUnmounted(stopLivePolling);

  // Route params değişirse (sayfa içi nav) tekrar yükle
  watch(jobName, async (newName, oldName) => {
    if (newName && newName !== oldName) {
      stopLivePolling();
      await loadJob();
      startLivePolling();
    }
  });

  async function downloadErrorExcel() {
    downloading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.bulk_import.api.download_error_excel", {
        job_name: jobName.value,
      });
      const url = res.message?.file_url;
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error(t("bulkImportDetail.errorFileNotFound"));
      }
    } catch (e) {
      toast.error(e.message || t("bulkImportDetail.downloadFailed"));
    } finally {
      downloading.value = false;
    }
  }

  async function retryFailedRows() {
    if (!confirm(t("bulkImportDetail.retryConfirm"))) return;
    retrying.value = true;
    try {
      const res = await api.callMethod("tradehub_core.bulk_import.api.retry_failed_rows", {
        job_name: jobName.value,
      });
      const newJob = res.message?.new_job_name;
      if (newJob) {
        toast.success(t("bulkImportDetail.retryStarted"));
        router.push({ name: "bulk-import-detail", params: { name: newJob } }).catch(() => {});
      } else {
        toast.info(t("bulkImportDetail.noRowsToRetry"));
      }
    } catch (e) {
      toast.error(e.message || t("bulkImportDetail.retryFailed"));
    } finally {
      retrying.value = false;
    }
  }

  async function bulkApprove() {
    if (!confirm(t("bulkImportDetail.bulkApproveConfirm"))) return;
    approving.value = true;
    try {
      const res = await api.callMethod(
        "tradehub_core.bulk_import.api.bulk_approve_listings_from_job",
        { job_name: jobName.value }
      );
      const approved = res.message?.approved ?? 0;
      const total = res.message?.total ?? 0;
      toast.success(t("bulkImportDetail.bulkApproveSuccess", { approved, total }));
      // Pending sayısını backend response'undan türet (loadJob bir saniyelik
      // window'da eski sayıyı dönebiliyor); ardından doc'u yenile.
      pendingCount.value = Math.max(0, total - approved);
      await loadJob();
    } catch (e) {
      toast.error(e.message || t("bulkImportDetail.bulkApproveFailed"));
    } finally {
      approving.value = false;
    }
  }

  function viewListings() {
    if (!jobName.value) return;
    // Admin → ListingModeration (onay bekleyenleri görür)
    // Seller → SellerListings (kendi ürünleri)
    // Route adları router/index.js'te PascalCase tanımlı.
    const targetName = isAdmin.value ? "ListingModeration" : "SellerListings";
    router.push({ name: targetName, query: { bulk_job: jobName.value } }).catch((err) => {
      console.error("viewListings navigation failed:", err);
    });
  }

  function stateLabel(state) {
    const s = String(state || "").toLowerCase();
    if (["completed", "done"].includes(s)) return t("bulkImportDetail.stateCompleted");
    if (s === "partial") return t("bulkImportDetail.statePartial");
    if (["failed", "error"].includes(s)) return t("bulkImportDetail.stateFailed");
    if (s === "queued") return t("bulkImportDetail.stateQueued");
    if (["running", "in_progress"].includes(s)) return t("bulkImportDetail.stateRunning");
    return state || "—";
  }

  function stateClass(state) {
    const s = String(state || "").toLowerCase();
    if (["completed", "done"].includes(s)) return "bg-emerald-100 text-emerald-700";
    if (s === "partial") return "bg-amber-100 text-amber-700";
    if (["failed", "error"].includes(s)) return "bg-red-100 text-red-700";
    if (["running", "in_progress"].includes(s)) return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  }

  // Hata türü ham string ("system"/"eca_rejected") yerine yerelleştirilmiş etiket.
  function errorTypeLabel(type) {
    const key = `bulkImportDetail.errorType.${type || "validation"}`;
    const label = t(key);
    return label === key ? type || "—" : label;
  }

  // Uyarılar amber, gerçek hatalar kırmızı rozet.
  function errorTypeBadgeClass(err) {
    return err?.severity === "warning" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  }

  function formatDate(value) {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  }

  const duration = computed(() => {
    if (!job.value) return "—";
    if (job.value.duration) {
      const s = Number(job.value.duration);
      if (s < 60) return `${Math.round(s)} ${t("bulkImportDetail.unitSeconds")}`;
      const m = Math.floor(s / 60);
      const r = Math.round(s % 60);
      return r
        ? `${m} ${t("bulkImportDetail.unitMinutes")} ${r} ${t("bulkImportDetail.unitSeconds")}`
        : `${m} ${t("bulkImportDetail.unitMinutes")}`;
    }
    const start = new Date(job.value.start_time || job.value.creation || 0).getTime();
    const end = new Date(job.value.end_time || job.value.modified || 0).getTime();
    if (start && end && end > start) {
      const s = Math.round((end - start) / 1000);
      if (s < 60) return `${s} ${t("bulkImportDetail.unitSeconds")}`;
      const m = Math.floor(s / 60);
      const r = s % 60;
      return r
        ? `${m} ${t("bulkImportDetail.unitMinutes")} ${r} ${t("bulkImportDetail.unitSeconds")}`
        : `${m} ${t("bulkImportDetail.unitMinutes")}`;
    }
    return "—";
  });

  const isTerminal = computed(() => {
    const s = String(job.value?.state || "").toLowerCase();
    return ["completed", "done", "partial", "failed", "error"].includes(s);
  });

  const hasErrors = computed(() => (job.value?.error_count || 0) > 0);

  const insertedCount = computed(() => job.value?.inserted || 0);

  // Banner için "içe aktarıldı" = eklenen + güncellenen; "aktarılmadı" = geri
  // kalan (atlanan + hatalı). notImported, hata listesindeki kayıt sayısıyla
  // örtüşür — "1 hata aldı" gibi yanıltıcı tek-sayı yerine bütünü gösterir.
  const importedCount = computed(() => (job.value?.inserted || 0) + (job.value?.updated || 0));
  const notImportedCount = computed(() =>
    Math.max(0, (job.value?.total || 0) - importedCount.value)
  );

  // "Dosya işlendi ≠ hepsi başarılı" vurgusu — yalnızca terminal + kısmi/hatalı
  // durumda göster. Tam başarıda banner çıkmaz.
  const showPartialBanner = computed(
    () => isTerminal.value && isIncompleteImport(job.value?.state, job.value?.error_count)
  );

  function scrollToErrors() {
    document.getElementById("error-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
</script>

<template>
  <div class="bulk-import-detail">
    <!-- Üst başlık -->
    <div class="flex items-center gap-3 mb-5">
      <button
        class="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 dark:bg-[#2a2a35] dark:text-gray-300 dark:hover:bg-[#35354a] transition-colors flex-shrink-0"
        @click="$router.push({ name: 'bulk-import-history' })"
      >
        <AppIcon name="arrow-left" :size="14" />
      </button>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-gray-500">{{ t("bulkImportDetail.pageSubtitle") }}</p>
        <h1 class="text-[15px] font-bold font-mono text-gray-900 dark:text-gray-100 truncate">
          {{ jobName }}
        </h1>
      </div>
      <span v-if="job" class="state-pill" :class="stateClass(job.state || job.status)">
        {{ stateLabel(job.state || job.status) }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-brand-700 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">{{ t("bulkImportDetail.loadingDetail") }}</p>
    </div>

    <!-- Bulunamadı -->
    <div v-else-if="!job" class="card text-center py-12">
      <AppIcon name="alert-circle" :size="32" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-500">{{ t("bulkImportDetail.notFound") }}</p>
      <button class="hdr-btn-outlined mt-4" @click="$router.push({ name: 'bulk-import-history' })">
        {{ t("bulkImportDetail.backToHistory") }}
      </button>
    </div>

    <template v-else>
      <!-- Job meta info -->
      <div class="card !p-5 mb-4">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ t("bulkImportDetail.labelStart") }}</span>
            <span class="info-value">{{ formatDate(job.start_time || job.creation) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t("bulkImportDetail.labelEnd") }}</span>
            <span class="info-value">{{ formatDate(job.end_time || job.modified) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t("bulkImportDetail.labelDuration") }}</span>
            <span class="info-value">{{ duration }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t("bulkImportDetail.labelFile") }}</span>
            <span class="info-value font-mono text-xs truncate">
              {{ job.file_name || job.input_file_name || "—" }}
            </span>
          </div>
        </div>
      </div>

      <!-- Kısmi başarı uyarısı: "dosya işlendi ≠ hepsi başarılı" -->
      <div
        v-if="showPartialBanner"
        class="mb-4 flex items-start gap-3 rounded-xl border p-4 border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
      >
        <AppIcon name="alert-triangle" :size="18" class="text-amber-500 flex-shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
          <p class="text-xs font-bold text-amber-800 dark:text-amber-200">
            {{ t("bulkImportDetail.partialBannerTitle") }}
          </p>
          <p class="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5 leading-relaxed">
            {{
              t("bulkImportDetail.partialBannerDesc", {
                total: job.total || 0,
                imported: importedCount,
                notImported: notImportedCount,
              })
            }}
          </p>
          <button
            v-if="hasErrors"
            type="button"
            class="mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 appearance-none focus:outline-none hover:bg-amber-500/30 transition-colors"
            @click="scrollToErrors"
          >
            {{ t("bulkImportDetail.viewErrorsAnchor") }} ↓
          </button>
        </div>
      </div>

      <!-- 5 sayısal kart -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5" data-tour="bid-summary">
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-gray-700 dark:text-gray-200">
            {{ job.total || 0 }}
          </p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            {{ t("bulkImportDetail.statTotalRows") }}
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-emerald-600">
            {{ insertedCount }}
          </p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            {{ t("bulkImportDetail.statInserted") }}
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-blue-600">{{ job.updated || 0 }}</p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            {{ t("bulkImportDetail.statUpdated") }}
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-amber-600">{{ job.skipped || 0 }}</p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            {{ t("bulkImportDetail.statSkipped") }}
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-red-500">{{ job.error_count || 0 }}</p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            {{ t("bulkImportDetail.statErrors") }}
          </p>
        </div>
      </div>

      <!-- Aksiyon butonları -->
      <div class="card !p-4 mb-5" data-tour="bid-actions">
        <div class="flex flex-wrap gap-2">
          <button
            v-if="hasErrors"
            class="hdr-btn-outlined flex items-center gap-1.5"
            :disabled="downloading"
            @click="downloadErrorExcel"
          >
            <AppIcon
              :name="downloading ? 'loader' : 'download'"
              :size="13"
              :class="downloading ? 'animate-spin' : ''"
            />
            {{ t("bulkImportDetail.downloadErrorsExcel") }}
          </button>
          <button
            v-if="hasErrors && isTerminal"
            class="hdr-btn-outlined flex items-center gap-1.5"
            :disabled="retrying"
            @click="retryFailedRows"
          >
            <AppIcon
              :name="retrying ? 'loader' : 'refresh-cw'"
              :size="13"
              :class="retrying ? 'animate-spin' : ''"
            />
            {{ t("bulkImportDetail.retryFailedOnly") }}
          </button>
          <button
            v-if="insertedCount > 0"
            class="hdr-btn-outlined flex items-center gap-1.5"
            @click="viewListings"
          >
            <AppIcon name="external-link" :size="13" />
            {{ t("bulkImportDetail.viewInsertedListings", { count: insertedCount }) }}
          </button>
          <button
            v-if="isAdmin && pendingCount > 0 && isTerminal"
            class="hdr-btn-primary flex items-center gap-1.5"
            :disabled="approving"
            @click="bulkApprove"
          >
            <AppIcon
              :name="approving ? 'loader' : 'check-circle'"
              :size="13"
              :class="approving ? 'animate-spin' : ''"
            />
            {{ t("bulkImportDetail.approveAll", { count: pendingCount }) }}
          </button>
        </div>
      </div>

      <!-- Hata listesi -->
      <div id="error-list" class="card !p-5" data-tour="bid-errors">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {{ t("bulkImportDetail.errorListTitle") }}
          </h3>
          <span class="text-xs text-gray-500">
            {{ t("bulkImportDetail.recordCount", { count: errorRows.length }) }}
          </span>
        </div>

        <div v-if="!errorRows.length" class="text-center py-8">
          <AppIcon name="check-circle" :size="28" class="text-emerald-500 mx-auto mb-2" />
          <p class="text-sm text-gray-500">{{ t("bulkImportDetail.noErrorRows") }}</p>
        </div>

        <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#2a2a35]">
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-gray-50 dark:bg-[#1a1a25]">
                <th class="px-3 py-2 text-left">{{ t("bulkImportDetail.colRowNumber") }}</th>
                <th class="px-3 py-2 text-left">{{ t("bulkImportDetail.colSku") }}</th>
                <th class="px-3 py-2 text-left">{{ t("bulkImportDetail.colProductName") }}</th>
                <th class="px-3 py-2 text-left">{{ t("bulkImportDetail.colErrorType") }}</th>
                <th class="px-3 py-2 text-left">{{ t("bulkImportDetail.colMessage") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="err in errorRows"
                :key="err.name || err.row_number"
                class="border-t border-gray-100 dark:border-[#2a2a35]"
                :class="
                  err.severity === 'warning'
                    ? 'bg-amber-50/50 dark:bg-amber-500/5'
                    : 'bg-red-50/50 dark:bg-red-500/5'
                "
              >
                <td class="px-3 py-2 font-mono">{{ err.row_number || "—" }}</td>
                <td class="px-3 py-2 font-mono">
                  <router-link
                    v-if="err.sku && skuMatches[err.sku]"
                    :to="`/app/Listing/${encodeURIComponent(skuMatches[err.sku])}`"
                    class="text-brand-800 dark:text-brand-500 hover:underline decoration-dotted inline-flex items-center gap-1"
                    :title="t('bulkImportDetail.skuLinkTitle')"
                  >
                    {{ err.sku }}
                    <AppIcon name="external-link" :size="10" />
                  </router-link>
                  <span v-else>{{ err.sku || "—" }}</span>
                </td>
                <td class="px-3 py-2">{{ err.title || err.product_name || "—" }}</td>
                <td class="px-3 py-2">
                  <span class="badge" :class="errorTypeBadgeClass(err)">
                    {{ errorTypeLabel(err.error_type) }}
                  </span>
                </td>
                <td class="px-3 py-2 text-gray-700 dark:text-gray-300">
                  <span
                    v-if="err.field"
                    class="font-mono text-[11px] text-gray-500 dark:text-gray-400 mr-1"
                    >[{{ err.field }}]</span
                  >
                  {{ err.error_message || err.message || "—" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .bulk-import-detail {
    max-width: 1100px;
    margin: 0 auto;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;

    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem;
    background: $l-bg-soft;
    border-radius: 0.4rem;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .info-label {
    font-size: 0.65rem;
    color: $l-text-500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .info-value {
    font-size: 0.85rem;
    color: $l-text-900;
    font-weight: 500;

    @include dark {
      color: $d-text-hi;
    }
  }

  .state-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.85rem;
    font-size: 0.7rem;
    font-weight: 600;
    border-radius: 9999px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.55rem;
    font-size: 0.65rem;
    font-weight: 600;
    border-radius: 9999px;
  }
</style>
