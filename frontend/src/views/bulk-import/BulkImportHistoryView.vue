<script setup>
  import { ref, computed, onMounted } from "vue";
  import { storeToRefs } from "pinia";
  import { useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import KanbanBoard from "@/components/common/KanbanBoard.vue";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { useAuthStore } from "@/stores/auth";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";
  import { useBreakpoint } from "@/composables/useBreakpoint";

  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { isAdmin } = storeToRefs(useAuthStore());
  const { isLg } = useBreakpoint();

  // Sayfa-içi onboarding: yeni içe aktarma → filtreler → iş geçmişi tablosu.
  usePageTour("bulk-import-history", () => [
    {
      target: '[data-tour="bih-new"]',
      title: t("tourSteps.page.bihNew_t"),
      desc: t("tourSteps.page.bihNew_d"),
    },
    {
      target: '[data-tour="bih-filters"]',
      title: t("tourSteps.page.bihFilters_t"),
      desc: t("tourSteps.page.bihFilters_d"),
    },
    {
      target: '[data-tour="bih-table"]',
      title: t("tourSteps.page.bihTable_t"),
      desc: t("tourSteps.page.bihTable_d"),
    },
  ]);

  const { viewMode } = useListViewMode("bulk-import-history", "table");

  const jobs = ref([]);
  const loading = ref(false);
  const statusFilter = ref("all"); // all | completed | partial | failed
  const dateRange = ref("30"); // 30 | 90 (gün)
  const sellerFilter = ref("all"); // all | <seller_profile> — yalnızca admin görünümünde kullanılır

  // DocType field adlarını (status / *_count / data_file ...) UI'ın okuduğu
  // polling-cache stilindeki kısa adlara aliasla.
  function _aliasJob(j) {
    if (!j) return j;
    j.state = String(j.status || "").toLowerCase();
    j.total = j.total_rows ?? 0;
    j.inserted = j.inserted_count ?? 0;
    j.updated = j.updated_count ?? 0;
    j.skipped = j.skipped_count ?? 0;
    j.duration = j.duration_seconds ?? null;
    j.start_time = j.started_at ?? j.creation;
    j.end_time = j.completed_at ?? j.modified;
    j.file_name = j.data_file;
    return j;
  }

  async function loadHistory() {
    loading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.bulk_import.api.get_my_history", {
        limit: 50,
      });
      const raw = Array.isArray(res.message) ? res.message : [];
      jobs.value = raw.map(_aliasJob);
    } catch (e) {
      toast.error(e.message || t("bulkImportHistory.loadFailed"));
      jobs.value = [];
    } finally {
      loading.value = false;
    }
  }

  onMounted(loadHistory);

  // Admin geçmişinde backend `seller_name` (mağaza adı) enrich ediyor; yoksa
  // ham `seller_profile` kimliğine düş.
  function sellerName(job) {
    return job.seller_name || job.seller_profile || "—";
  }

  // Mobil kartta "/private/files/x.xlsx" gibi tam yol yerine yalnızca dosya
  // adını göster — tam yol title attribute'unda kalır.
  function fileBaseName(job) {
    const full = String(job.file_name || job.input_file_name || "");
    if (!full) return "—";
    const parts = full.split("/");
    return parts[parts.length - 1] || full;
  }

  // Satıcı filtresi seçenekleri — yalnızca admin görünümünde job'lardan türetilir.
  const sellerOptions = computed(() => {
    if (!isAdmin.value) return [];
    const seen = new Map();
    for (const job of jobs.value) {
      if (job.seller_profile && !seen.has(job.seller_profile))
        seen.set(job.seller_profile, sellerName(job));
    }
    return [...seen].map(([value, label]) => ({ value, label }));
  });

  const filteredJobs = computed(() => {
    const now = Date.now();
    const days = Number(dateRange.value) || 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return jobs.value.filter((job) => {
      // Durum filtresi
      if (statusFilter.value !== "all") {
        const state = String(job.state || job.status || "").toLowerCase();
        if (statusFilter.value === "completed" && !["completed", "done"].includes(state))
          return false;
        if (statusFilter.value === "partial" && state !== "partial") return false;
        if (statusFilter.value === "failed" && !["failed", "error"].includes(state)) return false;
      }
      // Satıcı filtresi (yalnızca admin) — satıcı kullanıcıda tüm job'lar zaten kendisinin
      if (
        isAdmin.value &&
        sellerFilter.value !== "all" &&
        job.seller_profile !== sellerFilter.value
      )
        return false;
      // Tarih filtresi (creation veya start_time)
      const ts = new Date(job.creation || job.start_time || job.modified || 0).getTime();
      if (ts && ts < cutoff) return false;
      return true;
    });
  });

  const isEmpty = computed(() => !loading.value && filteredJobs.value.length === 0);

  function stateLabel(state) {
    const s = String(state || "").toLowerCase();
    if (["completed", "done"].includes(s)) return t("bulkImportHistory.stateCompleted");
    if (s === "partial") return t("bulkImportHistory.statePartial");
    if (["failed", "error"].includes(s)) return t("bulkImportHistory.stateFailed");
    if (["queued"].includes(s)) return t("bulkImportHistory.stateQueued");
    if (["running", "in_progress"].includes(s)) return t("bulkImportHistory.stateRunning");
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

  // İşin durumu farklı backend değerleriyle gelebilir (status/done/error vb.) —
  // kanban kolonları ve list/grid noktası için tek normalize edilmiş değere indir.
  function normState(job) {
    const s = String(job.state || job.status || "").toLowerCase();
    if (["completed", "done"].includes(s)) return "completed";
    if (s === "partial") return "partial";
    if (["failed", "error"].includes(s)) return "failed";
    if (["running", "in_progress"].includes(s)) return "running";
    if (s === "queued") return "queued";
    return s || "queued";
  }

  // Kanban statusField — KanbanBoard item[statusField] ile grupluyor.
  const STATUS_FIELD = "kanbanState";

  const STATE_COLORS = {
    queued: "#9ca3af",
    running: "#3b82f6",
    completed: "#10b981",
    partial: "#f59e0b",
    failed: "#ef4444",
  };

  function dotColor(job) {
    return STATE_COLORS[normState(job)] || "#94a3b8";
  }

  // Kanban için her işe sabit bir normalize-state alanı ekle (grupla­mada kullanılır).
  const kanbanJobs = computed(() =>
    filteredJobs.value.map((job) => ({ ...job, [STATUS_FIELD]: normState(job) }))
  );

  // Kolonları sabit anlamlı sırada tut, ama yalnızca mevcut durumları göster.
  const KANBAN_ORDER = ["queued", "running", "completed", "partial", "failed"];
  const kanbanColumns = computed(() => {
    const present = new Set(kanbanJobs.value.map((j) => j[STATUS_FIELD]));
    return KANBAN_ORDER.filter((s) => present.has(s)).map((s) => ({
      value: s,
      label: stateLabel(s),
      color: STATE_COLORS[s] || "#94a3b8",
    }));
  });

  function formatDate(value) {
    if (!value) return "—";
    try {
      const d = new Date(value);
      return d.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  }

  function formatDuration(seconds) {
    const s = Number(seconds);
    if (!s || isNaN(s)) return "—";
    if (s < 60) return `${Math.round(s)} ${t("bulkImportHistory.unitSec")}`;
    const m = Math.floor(s / 60);
    const r = Math.round(s % 60);
    return r
      ? `${m} ${t("bulkImportHistory.unitMin")} ${r} ${t("bulkImportHistory.unitSec")}`
      : `${m} ${t("bulkImportHistory.unitMin")}`;
  }

  function jobDuration(job) {
    if (job.duration) return formatDuration(job.duration);
    const start = new Date(job.start_time || job.creation || 0).getTime();
    const end = new Date(job.end_time || job.modified || 0).getTime();
    if (start && end && end > start) return formatDuration((end - start) / 1000);
    return "—";
  }

  function goToDetail(jobName) {
    router.push({ name: "bulk-import-detail", params: { name: jobName } }).catch(() => {});
  }

  function goToNew() {
    router.push({ name: "bulk-import-new" }).catch(() => {});
  }
</script>

<template>
  <div class="bulk-import-history">
    <!-- Üst başlık + yeni butonu -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("bulkImportHistory.title") }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ t("bulkImportHistory.autoDeleteNote") }}</p>
      </div>
      <div class="bih-head-actions flex items-center gap-2">
        <ViewModeToggle v-if="isLg" v-model="viewMode" />
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadHistory">
          <AppIcon name="refresh-cw" :size="13" />
          {{ t("bulkImportHistory.refresh") }}
        </button>
        <button
          class="bih-new-btn hdr-btn-primary flex items-center gap-1.5"
          data-tour="bih-new"
          @click="goToNew"
        >
          <AppIcon name="plus" :size="13" />
          {{ t("bulkImportHistory.newImport") }}
        </button>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="card !p-4 mb-4" data-tour="bih-filters">
      <div class="bih-filterbar flex flex-wrap items-center gap-3">
        <div class="bih-filter flex items-center gap-2">
          <label class="text-xs text-gray-500">{{ t("bulkImportHistory.statusLabel") }}</label>
          <select v-model="statusFilter" class="field-input text-xs py-1.5">
            <option value="all">{{ t("bulkImportHistory.allStatuses") }}</option>
            <option value="completed">{{ t("bulkImportHistory.stateCompleted") }}</option>
            <option value="partial">{{ t("bulkImportHistory.statePartial") }}</option>
            <option value="failed">{{ t("bulkImportHistory.stateFailed") }}</option>
          </select>
        </div>
        <div v-if="isAdmin" class="bih-filter bih-filter-seller flex items-center gap-2">
          <label class="text-xs text-gray-500">{{ t("bulkImportHistory.sellerLabel") }}</label>
          <select v-model="sellerFilter" class="field-input text-xs py-1.5">
            <option value="all">{{ t("bulkImportHistory.allSellers") }}</option>
            <option v-for="opt in sellerOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="bih-filter flex items-center gap-2">
          <label class="text-xs text-gray-500">{{ t("bulkImportHistory.dateLabel") }}</label>
          <select v-model="dateRange" class="field-input text-xs py-1.5">
            <option value="30">{{ t("bulkImportHistory.last30Days") }}</option>
            <option value="90">{{ t("bulkImportHistory.last90Days") }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card p-5">
      <Skeleton variant="row" :count="7" />
    </div>

    <!-- Boş durum -->
    <div v-else-if="isEmpty" class="card text-center py-12">
      <AppIcon name="upload-cloud" :size="36" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-500 mb-1">
        {{
          statusFilter !== "all"
            ? t("bulkImportHistory.emptyFiltered")
            : t("bulkImportHistory.emptyNone")
        }}
      </p>
      <p class="text-xs text-gray-400 mb-4">
        {{ t("bulkImportHistory.emptyHint") }}
      </p>
      <button class="hdr-btn-primary flex items-center gap-1.5 mx-auto" @click="goToNew">
        <AppIcon name="plus" :size="13" />
        {{ t("bulkImportHistory.firstImport") }}
      </button>
    </div>

    <!-- Mobil: iş kartları (görünüm modları yalnızca desktop) -->
    <div v-else-if="!isLg" class="bih-cards" data-tour="bih-table">
      <button
        v-for="job in filteredJobs"
        :key="job.name"
        type="button"
        class="bih-card"
        @click="goToDetail(job.name)"
      >
        <div class="bc-top">
          <code class="bc-id font-mono text-brand-800">{{ job.name }}</code>
          <span class="badge flex-none" :class="stateClass(job.state || job.status)">
            {{ stateLabel(job.state || job.status) }}
          </span>
          <span class="bc-date">{{ formatDate(job.creation || job.start_time) }}</span>
        </div>
        <p class="bc-file" :title="job.file_name || job.input_file_name || '—'">
          {{ fileBaseName(job) }}
        </p>
        <div class="bc-bottom">
          <span v-if="isAdmin" class="bc-seller" :title="t('bulkImportHistory.colSeller')">
            {{ sellerName(job) }}
          </span>
          <span class="bc-result" :title="t('bulkImportHistory.colResult')">
            <span class="text-emerald-600 font-medium">{{ job.inserted || 0 }} ✓</span>
            <span class="mx-1 text-gray-400">/</span>
            <span class="text-red-500 font-medium">{{ job.error_count || 0 }} ✕</span>
            <span class="mx-1 text-gray-400">/</span>
            <span class="text-amber-600 font-medium">{{ job.skipped || 0 }} ⊘</span>
          </span>
          <span class="bc-duration" :title="t('bulkImportHistory.colDuration')">
            {{ jobDuration(job) }}
          </span>
        </div>
      </button>
    </div>

    <!-- Kanban -->
    <KanbanBoard
      v-else-if="viewMode === 'kanban'"
      :items="kanbanJobs"
      :columns="kanbanColumns"
      :status-field="STATUS_FIELD"
      :draggable="false"
      @item-click="(job) => goToDetail(job.name)"
    >
      <template #card="{ item }">
        <div class="space-y-1.5">
          <code class="font-mono text-[11px] text-brand-800 break-all">{{ item.name }}</code>
          <p class="text-[11px] text-gray-600 dark:text-gray-300 truncate">
            {{ item.file_name || item.input_file_name || "—" }}
          </p>
          <p class="text-[10px] text-gray-400">
            {{ formatDate(item.creation || item.start_time) }}
          </p>
          <div class="text-[10px]">
            <span class="text-emerald-600 font-medium">{{ item.inserted || 0 }} ✓</span>
            <span class="mx-1 text-gray-400">/</span>
            <span class="text-red-500 font-medium">{{ item.error_count || 0 }} ✕</span>
            <span class="mx-1 text-gray-400">/</span>
            <span class="text-amber-600 font-medium">{{ item.skipped || 0 }} ⊘</span>
          </div>
        </div>
      </template>
    </KanbanBoard>

    <!-- Grid (kart) -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    >
      <div
        v-for="job in filteredJobs"
        :key="job.name"
        class="card p-4 cursor-pointer hover:border-brand-300 dark:hover:border-brand-500/40 transition-colors"
        @click="goToDetail(job.name)"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <code class="font-mono text-xs text-brand-800 break-all">{{ job.name }}</code>
          <span class="badge flex-none" :class="stateClass(job.state || job.status)">
            {{ stateLabel(job.state || job.status) }}
          </span>
        </div>
        <p class="text-xs text-gray-700 dark:text-gray-300 truncate mb-1">
          {{ job.file_name || job.input_file_name || "—" }}
        </p>
        <p class="text-[10px] text-gray-400 mb-3">
          {{ formatDate(job.creation || job.start_time) }}
        </p>
        <div class="flex items-center justify-between text-xs">
          <span>
            <span class="text-emerald-600 font-medium">{{ job.inserted || 0 }} ✓</span>
            <span class="mx-1 text-gray-400">/</span>
            <span class="text-red-500 font-medium">{{ job.error_count || 0 }} ✕</span>
            <span class="mx-1 text-gray-400">/</span>
            <span class="text-amber-600 font-medium">{{ job.skipped || 0 }} ⊘</span>
          </span>
          <span class="text-gray-500 font-mono text-[11px]">{{ jobDuration(job) }}</span>
        </div>
      </div>
    </div>

    <!-- Kompakt liste -->
    <div v-else-if="viewMode === 'list'" class="card !p-0 overflow-hidden">
      <div
        v-for="job in filteredJobs"
        :key="job.name"
        class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        @click="goToDetail(job.name)"
      >
        <span class="w-2 h-2 rounded-full flex-none" :style="{ background: dotColor(job) }"></span>
        <div class="min-w-0 flex-1">
          <code class="font-mono text-[11px] text-brand-800 break-all">{{ job.name }}</code>
          <p class="text-[10px] text-gray-400">
            {{ stateLabel(job.state || job.status) }} ·
            {{ formatDate(job.creation || job.start_time) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Tablo -->
    <div v-else class="card !p-0 overflow-hidden" data-tour="bih-table">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
              <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                {{ t("bulkImportHistory.colJobId") }}
              </th>
              <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                {{ t("bulkImportHistory.colDate") }}
              </th>
              <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                {{ t("bulkImportHistory.colFile") }}
              </th>
              <th v-if="isAdmin" class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                {{ t("bulkImportHistory.colSeller") }}
              </th>
              <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
                {{ t("bulkImportHistory.colStatus") }}
              </th>
              <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
                {{ t("bulkImportHistory.colResult") }}
              </th>
              <th class="text-right text-xs font-semibold text-gray-500 px-4 py-3">
                {{ t("bulkImportHistory.colDuration") }}
              </th>
              <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3 w-24">
                {{ t("bulkImportHistory.colDetail") }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
            <tr
              v-for="job in filteredJobs"
              :key="job.name"
              class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors cursor-pointer"
              @click="goToDetail(job.name)"
            >
              <td class="px-4 py-3">
                <code class="font-mono text-xs text-brand-800">{{ job.name }}</code>
              </td>
              <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                {{ formatDate(job.creation || job.start_time) }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                {{ job.file_name || job.input_file_name || "—" }}
              </td>
              <td v-if="isAdmin" class="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                {{ sellerName(job) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span class="badge" :class="stateClass(job.state || job.status)">
                  {{ stateLabel(job.state || job.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-center text-xs">
                <span class="text-emerald-600 font-medium"> {{ job.inserted || 0 }} ✓ </span>
                <span class="mx-1 text-gray-400">/</span>
                <span class="text-red-500 font-medium"> {{ job.error_count || 0 }} ✕ </span>
                <span class="mx-1 text-gray-400">/</span>
                <span class="text-amber-600 font-medium"> {{ job.skipped || 0 }} ⊘ </span>
              </td>
              <td class="px-4 py-3 text-right text-xs text-gray-500 font-mono">
                {{ jobDuration(job) }}
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  class="text-xs text-brand-800 hover:text-brand-900 font-medium flex items-center gap-1 mx-auto"
                  @click.stop="goToDetail(job.name)"
                >
                  {{ t("bulkImportHistory.colDetail") }}
                  <AppIcon name="arrow-right" :size="12" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .bulk-import-history {
    max-width: 1100px;
    margin: 0 auto;
  }

  .field-input {
    padding: 0.4rem 0.6rem;
    border: 1px solid $l-border;
    border-radius: 0.4rem;
    background: $l-bg;
    color: $l-text-700;
    transition:
      border-color $t-base,
      box-shadow $t-base;

    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
    }
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.55rem;
    font-size: 0.65rem;
    font-weight: 600;
    border-radius: 9999px;
  }

  // ── Mobil iş kartları (<768px'te tablo/grid/kanban yerine) ─
  .bih-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .bih-card {
    display: flex;
    flex-direction: column;
    gap: 7px;
    width: 100%;
    min-height: 44px;
    text-align: start;
    font-family: inherit;
    cursor: pointer;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 11px;
    padding: 11px 12px;
    transition: border-color $t-fast;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }

    &:active {
      border-color: rgba($brand, 0.5);
      background: rgba($brand, 0.04);
    }
  }

  .bc-top {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .bc-id {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .bc-date {
    margin-left: auto;
    flex-shrink: 0;
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }

  .bc-file {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
    color: $l-text-700;

    @include dark {
      color: $d-text-hi;
    }
  }

  .bc-bottom {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }

  .bc-seller {
    display: inline-block;
    max-width: 55%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    background: rgba($brand, 0.1);
    color: color-mix(in srgb, $brand 75%, #000);
    border: 1px solid rgba($brand, 0.2);

    @include dark {
      background: rgba($brand-light, 0.12);
      color: $brand-light;
      border-color: rgba($brand-light, 0.25);
    }
  }

  .bc-result {
    font-size: 0.72rem;
    white-space: nowrap;
  }

  .bc-duration {
    margin-left: auto;
    flex-shrink: 0;
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Mobil düzen: başlık aksiyonları + simetrik filtre grid'i ─
  @media (max-width: 767px) {
    .bih-head-actions {
      width: 100%;

      button {
        min-height: 44px;
        justify-content: center;
      }

      .bih-new-btn {
        flex: 1;
      }
    }

    // Durum + tarih yan yana, satıcı (yalnızca admin) tam satır. dense akış,
    // satıcı select'i yokken boşluk bırakmaz.
    .bih-filterbar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-auto-flow: dense;
      gap: 8px;

      .bih-filter {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 3px;
        min-width: 0;

        label {
          font-size: 0.62rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .field-input {
          width: 100%;
          min-height: 42px;
        }
      }

      .bih-filter-seller {
        grid-column: 1 / -1;
      }
    }
  }
</style>
