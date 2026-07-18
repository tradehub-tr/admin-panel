<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("myQuotesList.title") }}
        </h1>
        <p class="text-[11px] text-gray-400 mt-0.5">{{ t("myQuotesList.subtitle") }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" />
        <button
          class="w-[34px] h-[34px] rounded-[10px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e2a] text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          data-tour="mq-refresh"
          :title="t('myQuotesList.refresh')"
          :aria-label="t('myQuotesList.refresh')"
          @click="loadData"
        >
          <AppIcon name="refresh-cw" :size="14" />
        </button>
      </div>
    </div>

    <!-- Status Filter Pills — mobilde tek satır yatay kaydırma (V2 dili) -->
    <StatusFilterPills
      v-model="activeStatus"
      :options="statusFilters"
      wrapper-class="flex items-center gap-2 mb-4 overflow-x-auto md:overflow-x-visible md:flex-wrap [&>.status-pill]:shrink-0 [&>.status-pill]:whitespace-nowrap [&::-webkit-scrollbar]:hidden"
      data-tour="mq-filters"
      @change="loadData"
    />

    <div data-tour="mq-table">
      <div v-if="loading" class="card p-3">
        <Skeleton variant="row" :count="8" />
      </div>

      <div v-else-if="!items.length" class="card text-center py-12">
        <AppIcon name="inbox" :size="36" class="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p class="text-sm text-gray-400">{{ t("myQuotesList.empty") }}</p>
      </div>

      <!-- Kanban -->
      <KanbanBoard
        v-else-if="viewMode === 'kanban'"
        :items="items"
        :columns="kanbanColumns"
        status-field="status"
        :draggable="false"
        @item-click="goToQuote"
      >
        <template #card="{ item }">
          <div class="kanban-card-title truncate">{{ item.rfq_product_name || "-" }}</div>
          <div class="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
            {{ item.rfq }}
          </div>
          <div class="flex items-center justify-between mt-1.5">
            <span class="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              {{ item.currency }} {{ item.price_per_unit }}
            </span>
            <span class="text-[10px] text-gray-400">{{ formatDate(item.creation) }}</span>
          </div>
        </template>
      </KanbanBoard>

      <!-- Grid -->
      <div
        v-else-if="viewMode === 'grid'"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <div
          v-for="q in items"
          :key="q.name"
          class="card !p-4 cursor-pointer hover:!bg-gray-50 dark:hover:!bg-gray-800/50 transition-colors border-l-[3px]"
          :style="{ borderLeftColor: stripeColor(q.status) }"
          @click="goToQuote(q)"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <p class="text-[13px] font-semibold text-gray-900 dark:text-gray-200 truncate">
              {{ q.rfq_product_name || "-" }}
            </p>
            <span class="quote-status-badge flex-none" :class="getQuoteStatusCls(q.status)">
              <span class="rfq-dot"></span>{{ getQuoteStatusLabel(q.status) }}
            </span>
          </div>
          <p class="text-[10px] text-gray-400 dark:text-gray-500 font-mono mb-3 truncate">
            {{ q.rfq }}
          </p>
          <div class="flex items-center justify-between">
            <span class="text-[13px] font-bold text-gray-900 dark:text-gray-200 tabular-nums">
              {{ q.currency }} {{ q.price_per_unit }}
            </span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500">
              {{ formatDate(q.creation) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Compact List -->
      <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
        <div
          v-for="q in items"
          :key="q.name"
          class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          @click="goToQuote(q)"
        >
          <span class="quote-status-badge flex-none" :class="getQuoteStatusCls(q.status)">
            <span class="rfq-dot"></span>{{ getQuoteStatusLabel(q.status) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-gray-900 dark:text-gray-200 truncate">
              {{ q.rfq_product_name || "-" }}
            </p>
            <p class="text-[10px] text-gray-400">{{ q.rfq }} · {{ formatDate(q.creation) }}</p>
          </div>
          <span class="text-xs font-medium text-gray-900 dark:text-gray-200 flex-none tabular-nums">
            {{ q.currency }} {{ q.price_per_unit }}
          </span>
        </div>
      </div>

      <!-- Cetvel (default) — V4: sabit kolonlar, sol durum şeridi, tabular rakamlar -->
      <div v-else class="card p-0 overflow-hidden">
        <div
          class="grid grid-cols-[1fr_92px_82px] sm:grid-cols-[1fr_140px_110px] gap-2 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#1a1a25] border-b border-gray-200 dark:border-[#2a2a35]"
        >
          <span>{{ t("myQuotesList.colProduct") }}</span>
          <span class="text-right">{{ t("myQuotesList.colPrice") }}</span>
          <span class="text-right">{{ t("myQuotesList.colStatus") }}</span>
        </div>
        <div
          v-for="q in items"
          :key="q.name"
          class="relative grid grid-cols-[1fr_92px_82px] sm:grid-cols-[1fr_140px_110px] gap-2 items-center px-3.5 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          @click="goToQuote(q)"
        >
          <span
            class="absolute left-0 top-2 bottom-2 w-[3px] rounded-r"
            :style="{ background: stripeColor(q.status) }"
          ></span>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {{ q.rfq_product_name || "-" }}
            </p>
            <p class="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
              <span class="font-mono">{{ q.rfq }}</span>
              · {{ q.rfq_quantity }} {{ q.rfq_unit }} · {{ formatDate(q.creation) }}
            </p>
          </div>
          <div class="text-right">
            <p
              class="text-xs font-bold text-gray-900 dark:text-gray-100 tabular-nums whitespace-nowrap"
            >
              {{ q.currency }} {{ q.price_per_unit }}
            </p>
            <p class="text-[9.5px] text-gray-400 dark:text-gray-500">
              {{ q.lead_time_days ? t("myQuotesList.days", { n: q.lead_time_days }) : "—" }}
            </p>
          </div>
          <div class="text-right">
            <span
              class="quote-status-badge !text-[10px] !px-2 !py-1"
              :class="getQuoteStatusCls(q.status)"
            >
              <span class="rfq-dot"></span>{{ getQuoteStatusShort(q.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";
  import { useListViewMode } from "@/composables/useListViewMode";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import KanbanBoard from "@/components/common/KanbanBoard.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const router = useRouter();
  const { viewMode } = useListViewMode("my-quotes", "table");

  // Sayfa-içi onboarding: durum filtresi → teklif listesi → yenile.
  usePageTour("my-quotes", () => [
    {
      target: '[data-tour="mq-filters"]',
      title: t("tourSteps.page.mqFilters_t"),
      desc: t("tourSteps.page.mqFilters_d"),
    },
    {
      target: '[data-tour="mq-table"]',
      title: t("tourSteps.page.mqTable_t"),
      desc: t("tourSteps.page.mqTable_d"),
    },
    {
      target: '[data-tour="mq-refresh"]',
      title: t("tourSteps.page.mqRefresh_t"),
      desc: t("tourSteps.page.mqRefresh_d"),
    },
  ]);

  const loading = ref(false);
  const items = ref([]);
  const activeStatus = ref("");

  const statusFilters = computed(() => [
    { value: "", label: t("myQuotesList.statusAll"), dot: "bg-brand-400" },
    { value: "Submitted", label: t("myQuotesList.statusSubmitted"), dot: "bg-amber-400" },
    { value: "Accepted", label: t("myQuotesList.statusAccepted"), dot: "bg-emerald-400" },
    { value: "Rejected", label: t("myQuotesList.statusRejected"), dot: "bg-red-400" },
  ]);

  // Kanban kolonları teklif status değerlerinden türetilir (renkler badge tonlarıyla uyumlu).
  const kanbanColumns = computed(() => [
    { value: "Submitted", label: t("myQuotesList.statusSubmitted"), color: "#f59e0b" },
    { value: "Accepted", label: t("myQuotesList.statusAccepted"), color: "#10b981" },
    { value: "Rejected", label: t("myQuotesList.statusRejected"), color: "#ef4444" },
    { value: "Withdrawn", label: t("myQuotesList.statusWithdrawn"), color: "#6b7280" },
  ]);

  async function loadData() {
    loading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.rfq.get_my_quotes");
      const all = res.message?.data || [];
      items.value = activeStatus.value ? all.filter((q) => q.status === activeStatus.value) : all;
    } catch {
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  function goToQuote(q) {
    router.push(`/app/rfq/${encodeURIComponent(q.rfq)}`);
  }

  function getQuoteStatusCls(s) {
    return (
      {
        Submitted: "qs-submitted",
        Accepted: "qs-accepted",
        Rejected: "qs-rejected",
        Withdrawn: "qs-withdrawn",
      }[s] || "qs-submitted"
    );
  }
  function getQuoteStatusLabel(s) {
    return (
      {
        Submitted: t("myQuotesList.statusSubmitted"),
        Accepted: t("myQuotesList.statusAccepted"),
        Rejected: t("myQuotesList.statusRejected"),
        Withdrawn: t("myQuotesList.statusWithdrawn"),
      }[s] ||
      s ||
      "-"
    );
  }
  // V4 cetvel: dar durum kolonuna sığan kısa etiketler
  function getQuoteStatusShort(s) {
    return (
      {
        Submitted: t("myQuotesList.statusSubmittedShort"),
        Accepted: t("myQuotesList.statusAcceptedShort"),
        Rejected: t("myQuotesList.statusRejectedShort"),
        Withdrawn: t("myQuotesList.statusWithdrawnShort"),
      }[s] || getQuoteStatusLabel(s)
    );
  }
  // Satır başındaki durum şeridi rengi (kanban kolon renkleriyle aynı palet)
  const STATUS_STRIPE = {
    Submitted: "#f59e0b",
    Accepted: "#10b981",
    Rejected: "#ef4444",
    Withdrawn: "#6b7280",
  };
  function stripeColor(s) {
    return STATUS_STRIPE[s] || "#9ca3af";
  }
  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR");
  }

  onMounted(loadData);
</script>

<style scoped>
  .quote-status-badge {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 6px;
    white-space: nowrap;
  }
  .quote-status-badge .rfq-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-right: 6px;
    flex-shrink: 0;
  }
  .qs-submitted {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }
  .qs-submitted .rfq-dot {
    background: #f59e0b;
  }
  .qs-accepted {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }
  .qs-accepted .rfq-dot {
    background: #10b981;
  }
  .qs-rejected {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }
  .qs-rejected .rfq-dot {
    background: #ef4444;
  }
  .qs-withdrawn {
    background: rgba(107, 114, 128, 0.15);
    color: #6b7280;
  }
  .qs-withdrawn .rfq-dot {
    background: #6b7280;
  }
</style>
