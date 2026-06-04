<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("myQuotesList.title") }}
        </h1>
        <p class="text-[11px] text-gray-400 mt-0.5">{{ t("myQuotesList.subtitle") }}</p>
      </div>
      <button
        class="px-4 py-1.5 text-[11px] font-semibold rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
        @click="loadData"
      >
        <i class="fas fa-refresh mr-1"></i>{{ t("myQuotesList.refresh") }}
      </button>
    </div>

    <!-- Status Filter Pills -->
    <StatusFilterPills v-model="activeStatus" :options="statusFilters" @change="loadData" />

    <div v-if="loading" class="card text-center py-12">
      <i class="fas fa-spinner fa-spin text-2xl text-violet-500"></i>
    </div>

    <div v-else-if="!items.length" class="card text-center py-12">
      <i class="fas fa-inbox text-4xl text-gray-600 mb-3"></i>
      <p class="text-sm text-gray-400">{{ t("myQuotesList.empty") }}</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="q in items"
        :key="q.name"
        class="card !p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:!bg-gray-800/50 cursor-pointer transition-colors"
        @click="$router.push(`/app/rfq/${encodeURIComponent(q.rfq)}`)"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 text-[10px] text-gray-500">
            <span>{{ formatDate(q.creation) }}</span>
            <span class="text-gray-600">|</span>
            <span>{{ q.rfq }}</span>
          </div>
          <p class="text-[13px] font-semibold text-gray-200 mt-1 truncate">
            {{ q.rfq_product_name || "-" }}
          </p>
          <p class="text-[11px] text-gray-500">{{ q.rfq_quantity }} {{ q.rfq_unit }}</p>
        </div>
        <div class="text-right">
          <p class="text-[13px] font-bold text-gray-200">{{ q.currency }} {{ q.price_per_unit }}</p>
          <p v-if="q.lead_time_days" class="text-[10px] text-gray-500">
            {{ t("myQuotesList.days", { n: q.lead_time_days }) }}
          </p>
        </div>
        <span class="quote-status-badge" :class="getQuoteStatusCls(q.status)">
          <span class="rfq-dot"></span>{{ getQuoteStatusLabel(q.status) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";

  const { t } = useI18n();
  const loading = ref(false);
  const items = ref([]);
  const activeStatus = ref("");

  const statusFilters = computed(() => [
    { value: "", label: t("myQuotesList.statusAll"), dot: "bg-violet-400" },
    { value: "Submitted", label: t("myQuotesList.statusSubmitted"), dot: "bg-amber-400" },
    { value: "Accepted", label: t("myQuotesList.statusAccepted"), dot: "bg-emerald-400" },
    { value: "Rejected", label: t("myQuotesList.statusRejected"), dot: "bg-red-400" },
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
