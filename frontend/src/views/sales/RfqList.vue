<template>
  <div>
    <!-- Header — mobilde tek satır: başlık solda, eylemler sağda (R-1) -->
    <div class="flex items-center justify-between gap-3 mb-5 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ t("rfqList.title") }}
        </h1>
        <p class="text-xs text-gray-400">{{ t("rfqList.recordsFound", { count: totalCount }) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Mobilde görünüm seçimi yok — kompakt liste zorunlu -->
        <ViewModeToggle v-model="viewMode" class="hidden lg:flex" />
        <button
          class="hdr-btn-outlined rfl-iconify"
          :title="t('rfqList.refresh')"
          @click="loadData()"
        >
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("rfqList.refresh") }}</span>
        </button>
        <button class="hdr-btn-primary" data-tour="rf-new">
          <AppIcon name="plus" :size="14" /><span>{{ t("rfqList.addNew") }}</span>
        </button>
      </div>
    </div>

    <!-- Status Filter Pills — yalnızca desktop; mobilde yerini durum seçici alır (R-1) -->
    <div class="hidden lg:flex items-center gap-2 flex-wrap mb-4" data-tour="rf-filters">
      <button
        v-for="s in statusFilters"
        :key="s.value"
        class="status-pill"
        :class="{ active: activeStatus === s.value }"
        @click="
          activeStatus = s.value;
          currentPage = 1;
          loadData();
        "
      >
        <span class="w-2 h-2 rounded-full mr-2" :class="s.dot"></span>{{ s.label }}
      </button>
    </div>

    <!-- Search & Sort — mobilde: arama tam satır, altında durum + sıralama yan yana -->
    <div class="card mb-5 !p-3">
      <div class="rfl-filtersbar flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div class="rfl-search relative flex-1 min-w-0">
          <AppIcon
            name="search"
            :size="13"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('rfqList.searchPlaceholder')"
            class="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
        <!-- Mobil: pill'lerin kompakt karşılığı — durum seçici (R-1) -->
        <div class="flex items-center gap-2 lg:hidden">
          <AppIcon name="funnel" :size="13" class="text-gray-400 dark:text-gray-500" />
          <AppSelect
            v-model="activeStatus"
            :options="statusFilters"
            class="flex-1"
            @change="
              currentPage = 1;
              loadData();
            "
          />
        </div>
        <div class="flex items-center gap-2">
          <AppIcon
            name="arrow-down-wide-narrow"
            :size="13"
            class="text-gray-400 dark:text-gray-500 lg:hidden"
          />
          <AppSelect
            v-model="sortBy"
            :options="sortOptions"
            class="flex-1 lg:min-w-[180px]"
            @change="
              currentPage = 1;
              loadData();
            "
          />
        </div>
      </div>
    </div>

    <!-- Loading / Empty -->
    <div v-if="loading" class="card p-3">
      <Skeleton variant="row" :count="8" />
    </div>
    <div v-else-if="items.length === 0" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
        <AppIcon name="inbox" :size="24" class="text-gray-400 dark:text-gray-500" />
      </div>
      <h3 class="text-sm font-bold text-gray-700 mb-1">{{ t("rfqList.empty") }}</h3>
    </div>

    <!-- Table -->
    <div v-else class="card p-0 overflow-hidden" data-tour="rf-table">
      <div v-if="viewMode === 'table'" class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="tbl-th">{{ t("rfqList.colRfq") }}</th>
              <th class="tbl-th">{{ t("rfqList.colStatus") }}</th>
              <th class="tbl-th">{{ t("rfqList.colBuyer") }}</th>
              <th class="tbl-th text-center">{{ t("rfqList.colQuantity") }}</th>
              <th class="tbl-th text-center">{{ t("rfqList.colQuote") }}</th>
              <th class="tbl-th text-center">{{ t("rfqList.colAttachments") }}</th>
              <th class="tbl-th">{{ t("rfqList.colDate") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.name"
              class="tbl-row border-b border-gray-50 cursor-pointer transition-colors hover:bg-brand-50/30"
              @click="$router.push(`/app/rfq/${encodeURIComponent(item.name)}`)"
            >
              <td class="tbl-td">
                <div class="min-w-0">
                  <p class="text-xs font-semibold truncate max-w-[200px]">
                    {{ item.product_name || item.name }}
                  </p>
                  <p class="text-[10px] text-gray-400 font-mono">{{ item.name }}</p>
                </div>
              </td>
              <td class="tbl-td">
                <span class="rfq-status-badge" :class="getRfqStatusCls(item.status)">
                  <span class="rfq-dot"></span>{{ getRfqStatusLabel(item.status) }}
                </span>
              </td>
              <td class="tbl-td">
                <span
                  class="text-xs text-gray-500 dark:text-gray-300 truncate block max-w-[120px]"
                  >{{ item.buyer || "-" }}</span
                >
              </td>
              <td class="tbl-td text-center">
                <span class="text-xs font-semibold text-gray-500 dark:text-gray-300"
                  >{{ item.quantity || 0 }} {{ item.unit || "" }}</span
                >
              </td>
              <td class="tbl-td text-center">
                <span
                  class="text-xs font-bold px-2 py-0.5 rounded"
                  :class="item.quote_count > 0 ? 'text-brand-600 bg-brand-50' : 'text-gray-400'"
                  >{{ item.quote_count || 0 }}</span
                >
              </td>
              <td class="tbl-td text-center">
                <span
                  v-if="item.attachment_count > 0"
                  class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700"
                >
                  <i class="fas fa-paperclip text-[10px]"></i>{{ item.attachment_count }}
                </span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
              <td class="tbl-td">
                <span class="text-[10px] text-gray-500">{{ formatDate(item.creation) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- LIST VIEW — L-2 iki satırlı zengin satır (mobilde zorunlu görünüm) -->
      <div v-else-if="viewMode === 'list'">
        <div
          v-for="item in items"
          :key="item.name"
          class="list-compact-item"
          @click="$router.push(`/app/rfq/${encodeURIComponent(item.name)}`)"
        >
          <!-- Mobil: durum rengi nokta (renk .rfq-* sınıfının fg renginden gelir) -->
          <span class="lc-dot" :class="getRfqStatusCls(item.status)"></span>
          <div class="lc-main">
            <div class="lc-line1">
              <span class="lc-id">{{ item.name }}</span>
              <span class="list-compact-name">{{ item.product_name || item.name }}</span>
            </div>
            <div class="lc-sub">
              {{ getRfqStatusLabel(item.status)
              }}<template v-if="item.buyer || item.category">
                · {{ item.buyer || item.category }}</template
              >
            </div>
          </div>
          <!-- Desktop: durum chip -->
          <span class="rfq-status-badge lc-badge" :class="getRfqStatusCls(item.status)"
            ><span class="rfq-dot"></span>{{ getRfqStatusLabel(item.status) }}</span
          >
          <span class="list-compact-date">{{ formatDate(item.creation) }}</span>
        </div>
      </div>

      <!-- GRID VIEW -->
      <div v-else-if="viewMode === 'grid'" class="list-grid">
        <div
          v-for="item in items"
          :key="item.name"
          class="list-grid-card"
          @click="$router.push(`/app/rfq/${encodeURIComponent(item.name)}`)"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="list-grid-card-title">{{ item.product_name || item.name }}</span>
            <span class="rfq-status-badge text-[10px]" :class="getRfqStatusCls(item.status)"
              ><span class="rfq-dot"></span>{{ getRfqStatusLabel(item.status) }}</span
            >
          </div>
          <div class="list-grid-card-meta">
            <span>{{ item.buyer || "-" }}</span>
            <span>{{ item.category || "-" }}</span>
            <span>{{ formatDate(item.creation) }}</span>
          </div>
        </div>
      </div>

      <!-- KANBAN VIEW -->
      <div v-else-if="viewMode === 'kanban'" class="list-kanban">
        <div v-for="col in kanbanColumns" :key="col.status" class="kanban-col">
          <div class="kanban-col-header" :style="{ borderColor: col.color }">
            <span>{{ col.label }}</span>
            <span class="kanban-col-count">{{ col.items.length }}</span>
          </div>
          <div class="kanban-col-body">
            <div
              v-for="item in col.items"
              :key="item.name"
              class="kanban-card"
              @click="$router.push(`/app/rfq/${encodeURIComponent(item.name)}`)"
            >
              <div class="kanban-card-title">{{ item.product_name || item.name }}</div>
              <div class="kanban-card-meta">
                {{ item.buyer || "-" }} · {{ formatDate(item.creation) }}
              </div>
            </div>
            <div
              v-if="col.items.length === 0"
              class="text-center py-6 text-xs text-gray-400 dark:text-gray-500"
            >
              {{ t("rfqList.noRecords") }}
            </div>
          </div>
        </div>
      </div>

      <ListPagination
        v-model="currentPage"
        :total="totalCount"
        :page-size="pageSize"
        @update:model-value="loadData()"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useAuthStore } from "@/stores/auth";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import AppSelect from "@/components/common/AppSelect.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import { usePageTour } from "@/composables/usePageTour";
  import { useBreakpoint } from "@/composables/useBreakpoint";

  const { t } = useI18n();

  // Sayfa-içi onboarding: durum filtreleri → RFQ listesi → yeni talep oluştur.
  usePageTour("rfq-list", () => [
    {
      target: '[data-tour="rf-filters"]',
      title: t("tourSteps.page.rfFilters_t"),
      desc: t("tourSteps.page.rfFilters_d"),
    },
    {
      target: '[data-tour="rf-table"]',
      title: t("tourSteps.page.rfTable_t"),
      desc: t("tourSteps.page.rfTable_d"),
    },
    {
      target: '[data-tour="rf-new"]',
      title: t("tourSteps.page.rfNew_t"),
      desc: t("tourSteps.page.rfNew_d"),
    },
  ]);

  const auth = useAuthStore();
  const isSeller = computed(() => auth.isSeller && !auth.isAdmin);

  const items = ref([]);
  const totalCount = ref(0);
  const loading = ref(false);
  const searchQuery = ref("");
  const activeStatus = ref("");
  const sortBy = ref("modified desc");
  const currentPage = ref(1);
  const pageSize = 12;
  const viewMode = ref("table");

  // Mobilde (<768px) tablo/grid/kanban okunmaz — kompakt liste (R-1) zorunlu.
  const { isLg } = useBreakpoint();
  let desktopViewMode = "table";
  watch(
    isLg,
    (desktop) => {
      if (!desktop) {
        if (viewMode.value !== "list") desktopViewMode = viewMode.value;
        viewMode.value = "list";
      } else if (viewMode.value === "list") {
        viewMode.value = desktopViewMode;
      }
    },
    { immediate: true }
  );

  // AppSelect sıralama seçenekleri (yineleme hatası temizlendi: aynı value'lu
  // iki "quote_count desc" seçeneği vardı)
  const sortOptions = computed(() => [
    { value: "modified desc", label: t("rfqList.sortRecentlyModified") },
    { value: "creation desc", label: t("rfqList.sortNewest") },
    { value: "quote_count desc", label: t("rfqList.sortMostQuotes") },
  ]);

  const kanbanColumns = computed(() => {
    const cols = [
      { status: "Pending", label: t("rfqList.statusPending"), color: "#f59e0b", items: [] },
      { status: "Approved", label: t("rfqList.statusApproved"), color: "#10b981", items: [] },
      { status: "Completed", label: t("rfqList.statusCompleted"), color: "#3b82f6", items: [] },
      { status: "Closed", label: t("rfqList.statusClosed"), color: "#6b7280", items: [] },
      { status: "Rejected", label: t("rfqList.statusRejected"), color: "#ef4444", items: [] },
    ];
    for (const item of items.value) {
      const col = cols.find((c) => c.status === item.status);
      if (col) col.items.push(item);
      else cols[0].items.push(item);
    }
    return cols;
  });

  const statusFilters = [
    { value: "", label: t("rfqList.filterAll"), dot: "bg-brand-400" },
    { value: "Pending", label: t("rfqList.statusPending"), dot: "bg-amber-400" },
    { value: "Approved", label: t("rfqList.statusApproved"), dot: "bg-emerald-400" },
    { value: "Completed", label: t("rfqList.statusCompleted"), dot: "bg-blue-400" },
    { value: "Closed", label: t("rfqList.statusClosed"), dot: "bg-gray-500" },
    { value: "Rejected", label: t("rfqList.statusRejected"), dot: "bg-red-400" },
  ];

  const listFields = [
    "name",
    "product_name",
    "status",
    "buyer",
    "category",
    "quantity",
    "unit",
    "quote_count",
    "creation",
    "modified",
  ];

  async function loadData() {
    loading.value = true;
    try {
      if (isSeller.value) {
        // Satıcı: sadece kategorisiyle eşleşen Approved RFQ'ları görsün
        const res = await api.callMethod("tradehub_core.api.rfq.get_seller_rfqs", {
          status: activeStatus.value || "all",
          limit_page_length: pageSize,
          limit_start: (currentPage.value - 1) * pageSize,
        });
        const data = res.message?.data || [];
        // Client-side search filter
        if (searchQuery.value) {
          const q = searchQuery.value.toLowerCase();
          items.value = data.filter(
            (r) =>
              (r.product_name || "").toLowerCase().includes(q) ||
              (r.name || "").toLowerCase().includes(q)
          );
        } else {
          items.value = data;
        }
        totalCount.value = res.message?.total || items.value.length;
      } else {
        // Admin: tüm RFQ'ları görsün
        const filters = [];
        if (activeStatus.value) filters.push(["status", "=", activeStatus.value]);
        if (searchQuery.value) filters.push(["product_name", "like", `%${searchQuery.value}%`]);
        const res = await api.getList("RFQ", {
          fields: listFields,
          filters,
          order_by: sortBy.value,
          limit_start: (currentPage.value - 1) * pageSize,
          limit_page_length: pageSize,
        });
        items.value = res.data || [];
        const c = await api.getCount("RFQ", filters);
        totalCount.value = c.message || 0;

        // Batch-fetch attachment counts (one query, then group client-side)
        const names = items.value.map((r) => r.name).filter(Boolean);
        if (names.length) {
          try {
            const filesRes = await api.getList("File", {
              fields: ["attached_to_name"],
              filters: [
                ["attached_to_doctype", "=", "RFQ"],
                ["attached_to_name", "in", names],
              ],
              limit_page_length: 0,
            });
            const counts = {};
            for (const f of filesRes.data || []) {
              counts[f.attached_to_name] = (counts[f.attached_to_name] || 0) + 1;
            }
            for (const item of items.value) {
              item.attachment_count = counts[item.name] || 0;
            }
          } catch {
            // Non-fatal — list still renders, just without counts
            for (const item of items.value) item.attachment_count = 0;
          }
        }
      }
    } catch {
      items.value = [];
      totalCount.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function getRfqStatusCls(s) {
    return (
      {
        Pending: "rfq-draft",
        Approved: "rfq-published",
        Closed: "rfq-closed",
        Rejected: "rfq-cancelled",
        Completed: "rfq-accepted",
      }[s] || "rfq-draft"
    );
  }
  function getRfqStatusLabel(s) {
    return (
      {
        Pending: t("rfqList.statusPending"),
        Approved: t("rfqList.statusApproved"),
        Closed: t("rfqList.statusClosed"),
        Rejected: t("rfqList.statusRejected"),
        Completed: t("rfqList.statusCompleted"),
      }[s] ||
      s ||
      "-"
    );
  }
  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR");
  }

  let searchTimer;
  watch(searchQuery, () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentPage.value = 1;
      loadData();
    }, 400);
  });
  onMounted(loadData);
</script>

<style scoped>
  /* ── Mobil (≤767px) — R-1 düzeni ─────────────────────────────
     Arama tam satır; altında durum + sıralama yan yana iki eşit
     seçici. Yenile butonu ikona iner. */
  @media (max-width: 767px) {
    .rfl-filtersbar {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
    }

    .rfl-search {
      flex: 1 1 100%;
    }

    .rfl-filtersbar > div:not(.rfl-search) {
      flex: 1 1 calc(50% - 4px);
      min-width: 0;
    }

    .rfl-filtersbar .app-select {
      flex: 1;
      min-width: 0;
    }

    .rfl-iconify {
      padding: 7px 9px;

      span {
        display: none;
      }
    }
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s, border-color 0.15s;
    background: var(--th-surface-card, #1e1e2e);
    color: var(--th-text-secondary, #9ca3af);
    border: 1px solid var(--th-surface-border, #2d2d3d);
  }
  .status-pill:hover {
    border-color: #ffd54d;
    color: #a87b00;
  }
  .status-pill.active {
    background: #f5b800;
    color: #1a1a1a;
    border-color: #f5b800;
  }

  .rfq-status-badge {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 6px;
    white-space: nowrap;
  }
  .rfq-status-badge .rfq-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-right: 6px;
    flex-shrink: 0;
  }
  .rfq-draft {
    background: var(--th-kpi-draft-bg);
    color: var(--th-kpi-draft-fg);
  }
  .rfq-draft .rfq-dot {
    background: var(--th-kpi-draft-dot);
  }
  .rfq-published {
    background: var(--th-kpi-active-bg);
    color: var(--th-kpi-active-fg);
  }
  .rfq-published .rfq-dot {
    background: var(--th-kpi-active-dot);
  }
  .rfq-quoting {
    background: var(--th-kpi-calculated-bg);
    color: var(--th-kpi-calculated-fg);
  }
  .rfq-quoting .rfq-dot {
    background: var(--th-kpi-calculated-dot);
  }
  .rfq-negotiation {
    background: var(--th-kpi-atrisk-bg);
    color: var(--th-kpi-atrisk-fg);
  }
  .rfq-negotiation .rfq-dot {
    background: var(--th-kpi-atrisk-dot);
  }
  .rfq-accepted {
    background: var(--th-kpi-ontrack-bg);
    color: var(--th-kpi-ontrack-fg);
  }
  .rfq-accepted .rfq-dot {
    background: var(--th-kpi-ontrack-dot);
  }
  .rfq-ordered {
    background: var(--th-kpi-exceeding-bg);
    color: var(--th-kpi-exceeding-fg);
  }
  .rfq-ordered .rfq-dot {
    background: var(--th-kpi-exceeding-dot);
  }
  .rfq-closed {
    background: var(--th-kpi-expired-bg);
    color: var(--th-kpi-expired-fg);
  }
  .rfq-closed .rfq-dot {
    background: var(--th-kpi-expired-dot);
  }
  .rfq-cancelled {
    background: var(--th-kpi-critical-bg);
    color: var(--th-kpi-critical-fg);
  }
  .rfq-cancelled .rfq-dot {
    background: var(--th-kpi-critical-dot);
  }
</style>
