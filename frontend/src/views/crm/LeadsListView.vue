<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("leadsList.title") }}
        </h1>
        <p class="text-xs text-gray-400">{{ t("leadsList.recordCount", { n: crm.leadsTotal }) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <ViewModeToggle v-model="viewMode" />
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("leadsList.refresh") }}</span>
        </button>
        <button data-tour="ld-new" class="hdr-btn-primary" @click="$router.push('/crm/leads/new')">
          <AppIcon name="plus" :size="14" /><span>{{ t("leadsList.newLead") }}</span>
        </button>
      </div>
    </div>

    <div data-tour="ld-status" class="flex items-center gap-2 flex-wrap mb-4">
      <button
        v-for="s in statusFilters"
        :key="s.value"
        class="status-pill"
        :class="{ active: activeStatus === s.value }"
        @click="
          activeStatus = s.value;
          page = 1;
          load();
        "
      >
        <span class="w-2 h-2 rounded-full mr-2" :class="s.dot"></span>{{ s.label }}
      </button>
    </div>

    <div data-tour="ld-search" class="card mb-5 !p-3">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div class="relative flex-1 min-w-0">
          <AppIcon
            name="search"
            :size="13"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('leadsList.searchPlaceholder')"
            class="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-100"
            @input="onSearch"
          />
        </div>
        <select v-model="orderBy" class="form-input-sm w-auto" @change="load()">
          <option value="modified desc">{{ t("leadsList.sortLastModified") }}</option>
          <option value="creation desc">{{ t("leadsList.sortNewest") }}</option>
          <option value="creation asc">{{ t("leadsList.sortOldest") }}</option>
        </select>
      </div>
    </div>

    <div v-if="crm.loadingLeads" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="crm.leads.length === 0" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
        <AppIcon name="inbox" :size="24" class="text-gray-400" />
      </div>
      <h3 class="text-sm font-bold text-gray-700 mb-1">{{ t("leadsList.emptyTitle") }}</h3>
      <p class="text-xs text-gray-400">{{ t("leadsList.emptyHint") }}</p>
    </div>

    <!-- Kanban View -->
    <div v-else-if="viewMode === 'kanban'">
      <CrmKanbanBoard
        :items="crm.leads"
        :columns="kanbanColumns"
        status-field="status"
        title-field="lead_name"
        :show-total="false"
        @item-click="openDetail"
      />
    </div>

    <!-- Grid (card) View -->
    <div v-else-if="viewMode === 'grid'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="item in crm.leads"
          :key="item.name"
          class="card p-4 cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/40 transition-colors"
          @click="openDetail(item)"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <p class="text-sm font-semibold truncate">{{ displayName(item) }}</p>
            <span class="rfq-status-badge flex-none" :class="statusCls(item.status)">
              <span class="rfq-dot"></span>{{ item.status || "-" }}
            </span>
          </div>
          <p class="text-[10px] text-gray-400 font-mono mb-3">{{ item.name }}</p>
          <div class="space-y-1.5 mb-3">
            <p class="text-[11px] text-gray-500">
              {{ t("leadsList.colSource") }}: {{ item.source || "-" }}
            </p>
            <p class="text-[11px] text-gray-500 truncate">
              {{ t("leadsList.colOrganization") }}: {{ item.organization || "-" }}
            </p>
          </div>
          <div v-if="item.lead_owner" class="flex items-center gap-1.5">
            <UserAvatar :email="item.lead_owner" size="sm" />
            <span class="text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[140px]">
              {{ (item.lead_owner || "").split("@")[0] }}
            </span>
          </div>
        </div>
      </div>
      <ListPagination
        v-model="page"
        :total="crm.leadsTotal"
        :page-size="pageSize"
        @update:model-value="load()"
      />
    </div>

    <!-- Compact List View -->
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="item in crm.leads"
        :key="item.name"
        class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        @click="openDetail(item)"
      >
        <span
          class="w-2 h-2 rounded-full flex-none"
          :style="{ background: dotColor(item.status) }"
        ></span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold truncate">{{ displayName(item) }}</p>
          <p class="text-[10px] text-gray-400">
            {{ item.status || "-" }} · <RelativeTime :value="item.modified" />
          </p>
        </div>
        <UserAvatar v-if="item.lead_owner" :email="item.lead_owner" size="sm" class="flex-none" />
      </div>
      <ListPagination
        v-model="page"
        :total="crm.leadsTotal"
        :page-size="pageSize"
        @update:model-value="load()"
      />
    </div>

    <!-- Table View -->
    <div v-else data-tour="ld-table" class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="tbl-th">{{ t("leadsList.colName") }}</th>
              <th class="tbl-th">{{ t("leadsList.colEmail") }}</th>
              <th class="tbl-th">{{ t("leadsList.colPhone") }}</th>
              <th class="tbl-th">{{ t("leadsList.colOrganization") }}</th>
              <th class="tbl-th">{{ t("leadsList.colSource") }}</th>
              <th class="tbl-th">{{ t("leadsList.colStatus") }}</th>
              <th class="tbl-th">{{ t("leadsList.colDate") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in crm.leads"
              :key="item.name"
              class="tbl-row border-b border-gray-50 cursor-pointer transition-colors hover:bg-violet-50/30"
              @click="openDetail(item)"
            >
              <td class="tbl-td">
                <div class="min-w-0">
                  <p class="text-xs font-semibold truncate max-w-[200px]">
                    {{ displayName(item) }}
                  </p>
                  <p class="text-[10px] text-gray-400 font-mono">{{ item.name }}</p>
                </div>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-600 dark:text-gray-300">{{
                  item.email || "-"
                }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500">{{ item.mobile_no || "-" }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500 truncate block max-w-[160px]">{{
                  item.organization || "-"
                }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-[10px] text-gray-500">{{ item.source || "-" }}</span>
              </td>
              <td class="tbl-td">
                <span class="rfq-status-badge" :class="statusCls(item.status)">
                  <span class="rfq-dot"></span>{{ item.status || "-" }}
                </span>
              </td>
              <td class="tbl-td">
                <span class="text-[10px] text-gray-500">{{ formatDate(item.modified) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ListPagination
        v-model="page"
        :total="crm.leadsTotal"
        :page-size="pageSize"
        @update:model-value="load()"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";
  import { useCrmStore } from "@/stores/crm";
  import { useCrmMetaStore } from "@/stores/crmMeta";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { usePageTour } from "@/composables/usePageTour";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import UserAvatar from "@/components/crm/UserAvatar.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";
  import CrmKanbanBoard from "@/components/crm/CrmKanbanBoard.vue";

  const { t } = useI18n();

  // Sayfa-içi onboarding: durum filtreleri → arama/sıralama → liste → yeni lead.
  usePageTour("leads-list", () => [
    {
      target: '[data-tour="ld-status"]',
      title: t("tourSteps.page.ldStatus_t"),
      desc: t("tourSteps.page.ldStatus_d"),
    },
    {
      target: '[data-tour="ld-search"]',
      title: t("tourSteps.page.ldSearch_t"),
      desc: t("tourSteps.page.ldSearch_d"),
    },
    {
      target: '[data-tour="ld-table"]',
      title: t("tourSteps.page.ldTable_t"),
      desc: t("tourSteps.page.ldTable_d"),
    },
    {
      target: '[data-tour="ld-new"]',
      title: t("tourSteps.page.ldNew_t"),
      desc: t("tourSteps.page.ldNew_d"),
    },
  ]);

  const crm = useCrmStore();
  const meta = useCrmMetaStore();
  const router = useRouter();

  const page = ref(1);
  const pageSize = ref(20);
  const activeStatus = ref("all");
  const searchQuery = ref("");
  const orderBy = ref("modified desc");
  const { viewMode } = useListViewMode("crm-leads");

  const statusFilters = [
    { value: "all", label: t("leadsList.filterAll"), dot: "bg-gray-300" },
    { value: "New", label: t("leadsList.filterNew"), dot: "bg-blue-400" },
    { value: "Contacted", label: t("leadsList.filterContacted"), dot: "bg-amber-400" },
    { value: "Nurture", label: t("leadsList.filterNurture"), dot: "bg-violet-400" },
    { value: "Qualified", label: t("leadsList.filterQualified"), dot: "bg-emerald-400" },
    { value: "Unqualified", label: t("leadsList.filterUnqualified"), dot: "bg-rose-400" },
    { value: "Junk", label: t("leadsList.filterJunk"), dot: "bg-gray-400" },
  ];

  // List görünümündeki renk noktası — status pill class'larıyla aynı palet.
  const DOT_COLORS = {
    New: "#60a5fa",
    Contacted: "#fbbf24",
    Nurture: "#a78bfa",
    Qualified: "#34d399",
    Unqualified: "#fb7185",
    Junk: "#9ca3af",
  };

  const kanbanColumns = computed(() => {
    if (meta.leadStatuses.length) {
      return meta.leadStatuses.map((s) => ({
        value: s.name,
        label: s.name,
        color: s.color || "#94a3b8",
      }));
    }
    // Lead status meta yoksa filtre çiplerindeki bilinen status'lardan türet.
    return statusFilters
      .filter((s) => s.value !== "all")
      .map((s) => ({ value: s.value, label: s.label, color: DOT_COLORS[s.value] || "#94a3b8" }));
  });

  function displayName(item) {
    if (item.lead_name) return item.lead_name;
    const parts = [item.first_name, item.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : item.email || item.name;
  }

  function statusCls(s) {
    const map = {
      New: "status-new",
      Contacted: "status-active",
      Nurture: "status-pending",
      Qualified: "status-approved",
      Unqualified: "status-rejected",
      Junk: "status-rejected",
    };
    return map[s] || "";
  }

  function dotColor(s) {
    const metaColor = meta.leadStatuses.find((x) => x.name === s)?.color;
    return metaColor || DOT_COLORS[s] || "#94a3b8";
  }

  function formatDate(s) {
    if (!s) return "";
    try {
      return new Date(s).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return s;
    }
  }

  function buildFilters() {
    const out = [];
    if (activeStatus.value !== "all") out.push(["status", "=", activeStatus.value]);
    const q = searchQuery.value.trim();
    if (q) out.push(["lead_name", "like", `%${q}%`]);
    return out;
  }

  let searchT = null;
  function onSearch() {
    clearTimeout(searchT);
    searchT = setTimeout(() => {
      page.value = 1;
      load();
    }, 300);
  }

  function openDetail(item) {
    router.push(`/crm/leads/${encodeURIComponent(item.name)}`);
  }

  async function load() {
    // Kanban tüm kayıtları tek board'da göstermeli; store'da ayrı fetchAll yok,
    // bu yüzden mevcut fetchLeads'i büyük sayfa boyutuyla çağırıyoruz.
    await crm.fetchLeads({
      page: viewMode.value === "kanban" ? 1 : page.value,
      pageSize: viewMode.value === "kanban" ? 500 : pageSize.value,
      filters: buildFilters(),
      orderBy: orderBy.value,
    });
  }

  // Kanban tüm kayıtları, diğer modlar sayfalı çekiyor — mod değişince yeniden yükle.
  watch(viewMode, () => {
    page.value = 1;
    load();
  });

  onMounted(async () => {
    await meta.loadAll();
    load();
  });
</script>
