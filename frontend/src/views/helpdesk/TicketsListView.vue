<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">{{ t("ticketsList.title") }}</h1>
        <p class="hd-page-sub">
          {{ t("ticketsList.recordCount", { count: hd.ticketsTotal }) }} · {{ activeScopeLabel }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Saved filters dropdown -->
        <div v-click-outside="() => (savedOpen = false)" class="relative">
          <button class="hd-action" @click="toggleSaved">
            <AppIcon name="bookmark" :size="14" />
            <span>{{ activeFilterLabel || t("ticketsList.views") }}</span>
            <AppIcon name="chevron-down" :size="11" />
          </button>
          <div v-if="savedOpen" class="hd-dropdown" style="width: 280px">
            <div class="hd-dropdown-list">
              <button class="hd-dropdown-item" @click="resetFilters">
                <AppIcon name="x-circle" :size="13" />
                <span class="hd-dropdown-name">{{ t("ticketsList.resetFilters") }}</span>
              </button>
              <div v-if="savedFilters.mine?.length">
                <p class="hd-dropdown-section">{{ t("ticketsList.personal") }}</p>
                <button
                  v-for="f in savedFilters.mine"
                  :key="f.name"
                  class="hd-dropdown-item"
                  @click="applySaved(f)"
                >
                  <AppIcon
                    :name="f.is_pinned ? 'star' : 'bookmark'"
                    :size="13"
                    :class="f.is_pinned ? 'text-amber-500' : 'text-violet-500'"
                  />
                  <span class="hd-dropdown-name flex-1">{{ f.label }}</span>
                  <button class="hd-tag-x" @click.stop="deleteSaved(f)">
                    <AppIcon name="x" :size="10" />
                  </button>
                </button>
              </div>
              <div v-if="savedFilters.shared?.length">
                <p class="hd-dropdown-section">{{ t("ticketsList.sharedWithTeam") }}</p>
                <button
                  v-for="f in savedFilters.shared"
                  :key="f.name"
                  class="hd-dropdown-item"
                  @click="applySaved(f)"
                >
                  <AppIcon name="users" :size="13" class="text-blue-500" />
                  <div class="flex-1 min-w-0">
                    <span class="hd-dropdown-name truncate">{{ f.label }}</span>
                    <span class="hd-dropdown-sub truncate">{{ f.owner_user }}</span>
                  </div>
                </button>
              </div>
            </div>
            <div class="hd-dropdown-footer">
              <button class="hd-action w-full justify-center" @click="openSaveModal">
                <AppIcon name="save" :size="13" /><span>{{
                  t("ticketsList.saveCurrentFilters")
                }}</span>
              </button>
            </div>
          </div>
        </div>

        <ViewModeToggle v-model="viewMode" />

        <button data-tour="tk-action" class="hd-action" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("ticketsList.refresh") }}</span>
        </button>
      </div>
    </div>

    <!-- Save filter modal -->
    <div v-if="saveModalOpen" class="hd-modal-backdrop" @click.self="saveModalOpen = false">
      <div class="hd-modal">
        <header class="hd-modal-header">
          <h3>{{ t("ticketsList.saveView") }}</h3>
          <button class="hd-action" @click="saveModalOpen = false">
            <AppIcon name="x" :size="14" />
          </button>
        </header>
        <div class="hd-modal-body space-y-3">
          <div>
            <label class="hd-label"
              >{{ t("ticketsList.viewName") }} <span class="text-rose-500">*</span></label
            >
            <input
              v-model="saveLabel"
              class="hd-input"
              :placeholder="t('ticketsList.viewNamePlaceholder')"
            />
          </div>
          <label class="flex items-center gap-2 text-xs">
            <input v-model="savePinned" type="checkbox" />
            {{ t("ticketsList.pin") }}
          </label>
          <label class="flex items-center gap-2 text-xs">
            <input v-model="saveShared" type="checkbox" />
            {{ t("ticketsList.shareWithTeam") }}
          </label>
        </div>
        <footer class="hd-modal-footer">
          <button class="hd-action" @click="saveModalOpen = false">
            {{ t("ticketsList.cancel") }}
          </button>
          <button
            class="hd-btn-primary"
            :disabled="savingFilter || !saveLabel.trim()"
            @click="commitSave"
          >
            <span>{{ savingFilter ? t("ticketsList.saving") : t("ticketsList.save") }}</span>
          </button>
        </footer>
      </div>
    </div>

    <!-- KPI Bar — gömülü helpdesk dashboard -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <button
        type="button"
        class="hd-kpi"
        :class="{ active: activeStatus === 'Open' }"
        @click="quickFilter('Open')"
      >
        <div class="hd-kpi-icon hd-kpi-blue">
          <AppIcon name="inbox" :size="16" />
        </div>
        <div>
          <p class="hd-kpi-label">{{ t("ticketsList.kpiOpen") }}</p>
          <p class="hd-kpi-value">{{ hd.kpis.loading ? "—" : hd.kpis.open }}</p>
        </div>
      </button>

      <button
        type="button"
        class="hd-kpi"
        :class="{ active: activeStatus === 'Replied' }"
        @click="quickFilter('Replied')"
      >
        <div class="hd-kpi-icon hd-kpi-amber">
          <AppIcon name="reply" :size="16" />
        </div>
        <div>
          <p class="hd-kpi-label">{{ t("ticketsList.kpiReplied") }}</p>
          <p class="hd-kpi-value">{{ hd.kpis.loading ? "—" : hd.kpis.replied }}</p>
        </div>
      </button>

      <button
        type="button"
        class="hd-kpi"
        :class="{ active: activeScope === 'mine' }"
        @click="quickScope('mine')"
      >
        <div class="hd-kpi-icon hd-kpi-violet">
          <AppIcon name="user-check" :size="16" />
        </div>
        <div>
          <p class="hd-kpi-label">{{ t("ticketsList.kpiMineOpen") }}</p>
          <p class="hd-kpi-value">{{ hd.kpis.loading ? "—" : hd.kpis.mine_open }}</p>
        </div>
      </button>

      <div class="hd-kpi" style="cursor: default">
        <div class="hd-kpi-icon hd-kpi-emerald">
          <AppIcon name="check-circle" :size="16" />
        </div>
        <div>
          <p class="hd-kpi-label">{{ t("ticketsList.kpiResolvedWeek") }}</p>
          <p class="hd-kpi-value">{{ hd.kpis.loading ? "—" : hd.kpis.resolved_week }}</p>
        </div>
      </div>
    </div>

    <!-- Scope (Bana Atanan / Ekibim / Hepsi) -->
    <div class="flex items-center gap-2 flex-wrap mb-3">
      <button
        v-for="s in scopeOptions"
        :key="s.value"
        class="hd-scope"
        :class="{ active: activeScope === s.value }"
        @click="setScope(s.value)"
      >
        <AppIcon :name="s.icon" :size="13" />
        <span>{{ s.label }}</span>
      </button>
    </div>

    <!-- Status Tabs -->
    <div
      data-tour="tk-status"
      class="flex items-center flex-wrap mb-4 border-b border-gray-200 dark:border-white/10"
    >
      <button
        v-for="s in statusFilters"
        :key="s.value"
        class="hd-tab"
        :class="{ active: activeStatus === s.value }"
        @click="
          activeStatus = s.value;
          page = 1;
          load();
        "
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="s.dot"></span>
        <span>{{ s.label }}</span>
      </button>
    </div>

    <!-- Toolbar: search + priority + sort -->
    <div data-tour="tk-table" class="hd-card hd-card-pad-sm mb-4">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div data-tour="tk-search" class="flex-1 min-w-0">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('ticketsList.searchPlaceholder')"
            class="hd-search"
            @input="onSearch"
          />
        </div>

        <!-- Priority pills -->
        <div class="flex items-center gap-1.5">
          <button
            v-for="p in priorityOptions"
            :key="p.value"
            class="hd-prio"
            :class="[priorityPillCls(p.value), { active: activePriority === p.value }]"
            @click="togglePriority(p.value)"
          >
            {{ p.label }}
          </button>
        </div>

        <select v-model="orderBy" class="hd-select-sm" @change="load()">
          <option value="modified desc">{{ t("ticketsList.sortLastUpdated") }}</option>
          <option value="creation desc">{{ t("ticketsList.sortNewest") }}</option>
          <option value="creation asc">{{ t("ticketsList.sortOldest") }}</option>
          <option value="priority asc">{{ t("ticketsList.sortByPriority") }}</option>
        </select>
      </div>
    </div>

    <!-- Bulk action toolbar — bir veya daha fazla seçili olunca görünür -->
    <Transition name="hd-bulk">
      <div v-if="selected.length > 0" class="hd-bulk-bar">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            :checked="allOnPageSelected"
            :indeterminate.prop="someSelected"
            @change="toggleAllOnPage"
          />
          <span class="font-semibold text-sm">{{
            t("ticketsList.selectedCount", { count: selected.length })
          }}</span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <select
            v-model="bulkStatus"
            class="hd-select-sm"
            @change="bulkApply('status', bulkStatus)"
          >
            <option value="">{{ t("ticketsList.changeStatus") }}</option>
            <option v-for="s in bulkStatusOpts" :key="s.value" :value="s.value">
              {{ s.label }}
            </option>
          </select>
          <select
            v-model="bulkPriority"
            class="hd-select-sm"
            @change="bulkApply('priority', bulkPriority)"
          >
            <option value="">{{ t("ticketsList.changePriority") }}</option>
            <option v-for="p in priorityOptions" :key="p.value" :value="p.value">
              {{ p.label }}
            </option>
          </select>
          <button class="hd-action" @click="bulkClose">
            <AppIcon name="archive" :size="13" /><span>{{ t("ticketsList.close") }}</span>
          </button>
          <button class="hd-action hd-action-danger" @click="selected = []">
            <AppIcon name="x" :size="13" /><span>{{ t("ticketsList.clearSelection") }}</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Loading -->
    <div v-if="hd.loadingTickets" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <!-- Empty -->
    <div v-else-if="hd.tickets.length === 0" class="hd-empty">
      <div class="hd-empty-icon">
        <AppIcon name="life-buoy" :size="28" />
      </div>
      <h3 class="hd-empty-title">{{ t("ticketsList.emptyTitle") }}</h3>
      <p class="hd-empty-sub">{{ t("ticketsList.emptySub") }}</p>
    </div>

    <!-- Kanban -->
    <div v-else-if="viewMode === 'kanban'">
      <KanbanBoard
        :items="hd.tickets"
        :columns="kanbanColumns"
        status-field="status"
        title-field="subject"
        @item-click="goToTicket"
        @status-change="onStatusChange"
      >
        <template #card="{ item }">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="hd-mono">#{{ item.name }}</span>
            <span v-if="item.priority" class="hd-prio-chip" :class="priorityChipCls(item.priority)">
              {{ priorityLabel(item.priority) }}
            </span>
          </div>
          <p class="kanban-card-title truncate">{{ item.subject || t("ticketsList.noSubject") }}</p>
          <div class="flex items-center gap-3 mt-1.5">
            <span class="hd-row-meta">
              <AppIcon name="user" :size="11" />{{ item.raised_by || "-" }}
            </span>
            <span class="hd-row-meta">
              <AppIcon name="clock" :size="11" />{{ formatDate(item.modified) }}
            </span>
          </div>
        </template>
      </KanbanBoard>
    </div>

    <!-- Grid (cards) -->
    <div v-else-if="viewMode === 'grid'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="tk in hd.tickets"
          :key="tk.name"
          class="card p-4 cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/40 transition-colors"
          @click="goToTicket(tk)"
        >
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <span class="hd-mono">#{{ tk.name }}</span>
            <span class="hd-status" :class="statusCls(tk.status)">
              <span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="statusDot(tk.status)"></span>
              {{ statusLabel(tk.status) }}
            </span>
            <span v-if="tk.priority" class="hd-prio-chip" :class="priorityChipCls(tk.priority)">
              {{ priorityLabel(tk.priority) }}
            </span>
          </div>
          <p class="hd-row-title truncate mb-2">
            {{ tk.subject || t("ticketsList.noSubject") }}
          </p>
          <div class="flex items-center gap-3 flex-wrap">
            <span class="hd-row-meta">
              <AppIcon name="user" :size="11" />{{ tk.raised_by || "-" }}
            </span>
            <span class="hd-row-meta">
              <AppIcon name="clock" :size="11" />{{ formatDate(tk.modified) }}
            </span>
            <span v-if="assigneeOf(tk)" class="hd-row-meta" style="color: var(--brand, #7c3aed)">
              <AppIcon name="user-check" :size="11" />{{ assigneeOf(tk) }}
            </span>
          </div>
        </div>
      </div>

      <ListPagination
        v-model="page"
        :total="hd.ticketsTotal"
        :page-size="pageSize"
        @update:model-value="load()"
      />
    </div>

    <!-- Compact list -->
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="tk in hd.tickets"
        :key="tk.name"
        class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        @click="goToTicket(tk)"
      >
        <span class="w-2 h-2 rounded-full flex-none" :class="statusDot(tk.status)"></span>
        <span class="hd-mono flex-none">#{{ tk.name }}</span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold truncate">
            {{ tk.subject || t("ticketsList.noSubject") }}
          </p>
          <p class="text-[10px] text-gray-400 truncate">
            {{ statusLabel(tk.status) }} · {{ tk.raised_by || "-" }}
          </p>
        </div>
        <span
          v-if="tk.priority"
          class="hd-prio-chip flex-none"
          :class="priorityChipCls(tk.priority)"
        >
          {{ priorityLabel(tk.priority) }}
        </span>
        <span class="text-[10px] text-gray-500 flex-none">{{ formatDate(tk.modified) }}</span>
      </div>

      <ListPagination
        v-model="page"
        :total="hd.ticketsTotal"
        :page-size="pageSize"
        @update:model-value="load()"
      />
    </div>

    <!-- Table (default) -->
    <div v-else class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th" style="width: 36px">
                <input
                  type="checkbox"
                  :checked="allOnPageSelected"
                  :indeterminate.prop="someSelected"
                  @change="toggleAllOnPage"
                />
              </th>
              <th class="tbl-th">{{ t("ticketDetail.details") }}</th>
              <th class="tbl-th">{{ t("ticketDetail.customer") }}</th>
              <th class="tbl-th">{{ t("ticketDetail.fieldPriority") }}</th>
              <th class="tbl-th">{{ t("ticketDetail.fieldStatus") }}</th>
              <th class="tbl-th">{{ t("ticketDetail.fieldAssignee") }}</th>
              <th class="tbl-th">{{ t("ticketDetail.fieldLastUpdated") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tk in hd.tickets"
              :key="tk.name"
              class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
              :class="{ 'hd-row-selected': selected.includes(tk.name) }"
              @click="onRowClick($event, tk)"
            >
              <td class="tbl-td">
                <input
                  type="checkbox"
                  :checked="selected.includes(tk.name)"
                  @click.stop
                  @change="toggleSelect(tk.name)"
                />
              </td>
              <td class="tbl-td">
                <p class="text-xs font-semibold truncate max-w-[280px]">
                  {{ tk.subject || t("ticketsList.noSubject") }}
                </p>
                <span class="hd-mono">#{{ tk.name }}</span>
              </td>
              <td class="tbl-td text-gray-500 dark:text-gray-400">{{ tk.raised_by || "-" }}</td>
              <td class="tbl-td">
                <span v-if="tk.priority" class="hd-prio-chip" :class="priorityChipCls(tk.priority)">
                  {{ priorityLabel(tk.priority) }}
                </span>
                <span v-else class="text-[11px] text-gray-400">-</span>
              </td>
              <td class="tbl-td">
                <span class="hd-status" :class="statusCls(tk.status)">
                  <span
                    class="w-1.5 h-1.5 rounded-full mr-1.5"
                    :class="statusDot(tk.status)"
                  ></span>
                  {{ statusLabel(tk.status) }}
                </span>
              </td>
              <td class="tbl-td">
                <span v-if="assigneeOf(tk)" class="text-[11px] text-gray-600 dark:text-gray-300">
                  {{ assigneeOf(tk) }}
                </span>
                <span v-else class="text-[11px] text-gray-400">-</span>
              </td>
              <td class="tbl-td text-[10px] text-gray-500">{{ formatDate(tk.modified) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ListPagination
        v-model="page"
        :total="hd.ticketsTotal"
        :page-size="pageSize"
        @update:model-value="load()"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useRoute } from "vue-router";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { useHelpdeskStore } from "@/stores/helpdesk";
  import { useAuthStore } from "@/stores/auth";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import KanbanBoard from "@/components/common/KanbanBoard.vue";

  const { t } = useI18n();
  const route = useRoute();
  const hd = useHelpdeskStore();
  const auth = useAuthStore();
  const toast = useToast();

  // Sayfa-içi onboarding: arama → durum sekmeleri → liste → eylem.
  usePageTour("tickets-list", () => [
    {
      target: '[data-tour="tk-search"]',
      title: t("tourSteps.page.tkSearch_t"),
      desc: t("tourSteps.page.tkSearch_d"),
    },
    {
      target: '[data-tour="tk-status"]',
      title: t("tourSteps.page.tkStatus_t"),
      desc: t("tourSteps.page.tkStatus_d"),
    },
    {
      target: '[data-tour="tk-table"]',
      title: t("tourSteps.page.tkTable_t"),
      desc: t("tourSteps.page.tkTable_d"),
    },
    {
      target: '[data-tour="tk-action"]',
      title: t("tourSteps.page.tkAction_t"),
      desc: t("tourSteps.page.tkAction_d"),
    },
  ]);

  const { viewMode } = useListViewMode("helpdesk-tickets", "table");

  // Kanban kolonları — mevcut status etiket/renkleriyle aynı kaynak
  const kanbanColumns = [
    { value: "Open", label: t("ticketsList.statusOpen"), color: "#60a5fa" },
    { value: "Replied", label: t("ticketsList.statusReplied"), color: "#fbbf24" },
    { value: "Resolved", label: t("ticketsList.statusResolved"), color: "#34d399" },
    { value: "Closed", label: t("ticketsList.statusClosed"), color: "#9ca3af" },
  ];

  const page = ref(1);
  const pageSize = ref(20);
  // Dashboard widget'ından gelen ?tab=Open / ?scope=mine destekli açılış
  const initialTab = (() => {
    const t = String(route.query.tab || "");
    return ["all", "Open", "Replied", "Resolved", "Closed"].includes(t) ? t : "all";
  })();
  const initialScope = (() => {
    const s = String(route.query.scope || "");
    return ["all", "mine", "team"].includes(s) ? s : "all";
  })();
  const activeStatus = ref(initialTab);
  const activePriority = ref("");
  const activeScope = ref(initialScope);
  const searchQuery = ref("");
  const orderBy = ref("modified desc");

  const statusFilters = [
    { value: "all", label: t("ticketsList.statusAll"), dot: "bg-gray-300 dark:bg-white/30" },
    { value: "Open", label: t("ticketsList.statusOpen"), dot: "bg-blue-400" },
    { value: "Replied", label: t("ticketsList.statusReplied"), dot: "bg-amber-400" },
    { value: "Resolved", label: t("ticketsList.statusResolved"), dot: "bg-emerald-400" },
    { value: "Closed", label: t("ticketsList.statusClosed"), dot: "bg-gray-400" },
  ];

  const priorityOptions = [
    { value: "Low", label: t("ticketsList.priorityLow") },
    { value: "Medium", label: t("ticketsList.priorityMedium") },
    { value: "High", label: t("ticketsList.priorityHigh") },
    { value: "Urgent", label: t("ticketsList.priorityUrgent") },
  ];

  const scopeOptions = [
    { value: "all", label: t("ticketsList.scopeAll"), icon: "list" },
    { value: "mine", label: t("ticketsList.scopeMine"), icon: "user-check" },
    { value: "team", label: t("ticketsList.scopeTeam"), icon: "users" },
  ];

  const activeScopeLabel = computed(
    () =>
      scopeOptions.find((s) => s.value === activeScope.value)?.label || t("ticketsList.scopeAll")
  );

  function statusLabel(s) {
    return statusFilters.find((x) => x.value === s)?.label || s || "-";
  }
  function statusCls(s) {
    const m = {
      Open: "sc-blue",
      Replied: "sc-amber",
      Resolved: "sc-emerald",
      Closed: "sc-gray",
    };
    return m[s] || "sc-gray";
  }
  function statusDot(s) {
    const m = {
      Open: "bg-blue-400",
      Replied: "bg-amber-400",
      Resolved: "bg-emerald-400",
      Closed: "bg-gray-400",
    };
    return m[s] || "bg-gray-300";
  }
  function priorityLabel(p) {
    return priorityOptions.find((x) => x.value === p)?.label || p;
  }
  function priorityChipCls(p) {
    const m = {
      Low: "pc-gray",
      Medium: "pc-blue",
      High: "pc-amber",
      Urgent: "pc-rose",
    };
    return m[p] || "pc-gray";
  }
  function priorityPillCls(p) {
    return `pp-${p.toLowerCase()}`;
  }

  function formatDate(s) {
    if (!s) return "";
    try {
      const d = new Date(s);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return t("ticketsList.justNow");
      if (diff < 3600) return t("ticketsList.minutesAgo", { n: Math.floor(diff / 60) });
      if (diff < 86400) return t("ticketsList.hoursAgo", { n: Math.floor(diff / 3600) });
      return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return s;
    }
  }

  function assigneeOf(t) {
    if (!t._assign) return "";
    try {
      const arr = typeof t._assign === "string" ? JSON.parse(t._assign) : t._assign;
      return (arr && arr[0]) || "";
    } catch {
      return "";
    }
  }

  function setScope(v) {
    activeScope.value = v;
    page.value = 1;
    load();
  }

  function togglePriority(p) {
    activePriority.value = activePriority.value === p ? "" : p;
    page.value = 1;
    load();
  }

  function buildFilters() {
    const out = [];
    if (activeStatus.value !== "all") out.push(["status", "=", activeStatus.value]);
    if (activePriority.value) out.push(["priority", "=", activePriority.value]);
    if (activeScope.value === "mine" && auth.user?.email) {
      out.push(["_assign", "like", `%${auth.user.email}%`]);
    }
    // 'team' kapsamı için server-side zaten permission query satıcıyı team'ine kısıtlar
    const q = searchQuery.value.trim();
    if (q) {
      if (/^\d+$/.test(q)) out.push(["name", "=", q]);
      else out.push(["subject", "like", `%${q}%`]);
    }
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

  async function load() {
    await hd.fetchTickets({
      page: page.value,
      pageSize: pageSize.value,
      filters: buildFilters(),
      orderBy: orderBy.value,
    });
  }

  function quickFilter(status) {
    activeStatus.value = activeStatus.value === status ? "all" : status;
    page.value = 1;
    load();
  }

  function quickScope(scope) {
    activeScope.value = activeScope.value === scope ? "all" : scope;
    page.value = 1;
    load();
  }

  // ── Bulk action state ──
  const selected = ref([]);
  const bulkStatus = ref("");
  const bulkPriority = ref("");
  const bulkStatusOpts = [
    { value: "Open", label: t("ticketsList.statusOpen") },
    { value: "Replied", label: t("ticketsList.statusReplied") },
    { value: "Resolved", label: t("ticketsList.statusResolved") },
    { value: "Closed", label: t("ticketsList.statusClosed") },
  ];

  const allOnPageSelected = computed(
    () => hd.tickets.length > 0 && hd.tickets.every((t) => selected.value.includes(t.name))
  );
  const someSelected = computed(
    () =>
      selected.value.length > 0 &&
      hd.tickets.some((t) => selected.value.includes(t.name)) &&
      !allOnPageSelected.value
  );

  function toggleSelect(name) {
    const idx = selected.value.indexOf(name);
    if (idx >= 0) selected.value.splice(idx, 1);
    else selected.value.push(name);
  }

  function toggleAllOnPage() {
    if (allOnPageSelected.value) {
      const ids = new Set(hd.tickets.map((t) => t.name));
      selected.value = selected.value.filter((n) => !ids.has(n));
    } else {
      const set = new Set(selected.value);
      hd.tickets.forEach((t) => set.add(t.name));
      selected.value = Array.from(set);
    }
  }

  function goToTicket(tk) {
    location.assign(`/panel/helpdesk/tickets/${encodeURIComponent(tk.name)}`);
  }

  function onRowClick(ev, tk) {
    if (ev.target?.tagName === "INPUT") return;
    if (selected.value.length > 0) {
      // Bulk modunda satır tıklaması = toggle
      toggleSelect(tk.name);
      return;
    }
    goToTicket(tk);
  }

  // Kanban sürükle-bırak — status değişimini optimistic uygula
  async function onStatusChange({ item, newStatus }) {
    const prev = item.status;
    item.status = newStatus;
    try {
      await hd.setStatus(item.name, newStatus);
      toast.success(t("ticketDetail.statusUpdated"));
      hd.fetchKpis();
    } catch (e) {
      item.status = prev;
      toast.error(e.message || t("ticketDetail.failed"));
    }
  }

  async function bulkApply(action, value) {
    if (!value || selected.value.length === 0) return;
    try {
      const res = await api.callMethod("tradehub_core.api.public.bulk_update_tickets", {
        tickets: JSON.stringify(selected.value),
        action,
        value,
      });
      const r = res?.message || {};
      const msg = r.skipped
        ? t("ticketsList.bulkUpdatedSkipped", { ok: r.ok || 0, skipped: r.skipped })
        : t("ticketsList.bulkUpdated", { ok: r.ok || 0 });
      // toast hiç tanımlanmadıysa console fallback
      try {
        const { useToast } = await import("@/composables/useToast");
        useToast().success(msg);
      } catch {
        console.warn("[bulk]", msg);
      }
      bulkStatus.value = "";
      bulkPriority.value = "";
      selected.value = [];
      await Promise.all([load(), hd.fetchKpis()]);
    } catch (e) {
      console.error("[bulk]", e);
    }
  }

  async function bulkClose() {
    await bulkApply("status", "Closed");
  }

  // ── Saved filters ──
  const savedFilters = ref({ mine: [], shared: [] });
  const savedOpen = ref(false);
  const activeFilterLabel = ref("");
  const saveModalOpen = ref(false);
  const saveLabel = ref("");
  const savePinned = ref(false);
  const saveShared = ref(false);
  const savingFilter = ref(false);

  async function loadSavedFilters() {
    try {
      const res = await api.callMethod("tradehub_core.api.saved_filter.list_my_filters", {});
      savedFilters.value = res?.message || { mine: [], shared: [] };
    } catch {
      savedFilters.value = { mine: [], shared: [] };
    }
  }

  async function toggleSaved() {
    savedOpen.value = !savedOpen.value;
    if (savedOpen.value) await loadSavedFilters();
  }

  function currentFilterPayload() {
    return {
      activeStatus: activeStatus.value,
      activePriority: activePriority.value,
      activeScope: activeScope.value,
      searchQuery: searchQuery.value,
      orderBy: orderBy.value,
    };
  }

  function applySaved(f) {
    savedOpen.value = false;
    try {
      const payload = JSON.parse(f.filters_json || "{}");
      activeStatus.value = payload.activeStatus || "all";
      activePriority.value = payload.activePriority || "";
      activeScope.value = payload.activeScope || "all";
      searchQuery.value = payload.searchQuery || "";
      orderBy.value = payload.orderBy || "modified desc";
      activeFilterLabel.value = f.label;
      page.value = 1;
      load();
    } catch (e) {
      console.warn("[saved-filter] parse fail", e);
    }
  }

  function resetFilters() {
    savedOpen.value = false;
    activeStatus.value = "all";
    activePriority.value = "";
    activeScope.value = "all";
    searchQuery.value = "";
    orderBy.value = "modified desc";
    activeFilterLabel.value = "";
    page.value = 1;
    load();
  }

  function openSaveModal() {
    savedOpen.value = false;
    saveLabel.value = activeFilterLabel.value || "";
    savePinned.value = false;
    saveShared.value = false;
    saveModalOpen.value = true;
  }

  async function commitSave() {
    if (!saveLabel.value.trim()) return;
    savingFilter.value = true;
    try {
      await api.callMethod("tradehub_core.api.saved_filter.save_filter", {
        label: saveLabel.value.trim(),
        filters_json: JSON.stringify(currentFilterPayload()),
        is_pinned: savePinned.value ? 1 : 0,
        is_shared: saveShared.value ? 1 : 0,
      });
      activeFilterLabel.value = saveLabel.value.trim();
      saveModalOpen.value = false;
      await loadSavedFilters();
    } catch (e) {
      console.error("[saved-filter] save", e);
    } finally {
      savingFilter.value = false;
    }
  }

  async function deleteSaved(f) {
    if (!confirm(t("ticketsList.deleteViewConfirm", { label: f.label }))) return;
    try {
      await api.callMethod("tradehub_core.api.saved_filter.delete_filter", { name: f.name });
      if (activeFilterLabel.value === f.label) activeFilterLabel.value = "";
      await loadSavedFilters();
    } catch (e) {
      console.error("[saved-filter] delete", e);
    }
  }

  // ── Click outside directive (dropdown) ──
  const vClickOutside = {
    mounted(el, binding) {
      el.__clickOutside__ = (ev) => {
        if (!el.contains(ev.target)) binding.value?.();
      };
      document.addEventListener("click", el.__clickOutside__);
    },
    unmounted(el) {
      document.removeEventListener("click", el.__clickOutside__);
    },
  };

  onMounted(async () => {
    await Promise.all([load(), hd.fetchKpis(), loadSavedFilters()]);
  });
</script>

<!-- Tüm KPI / Bulk / Modal / Saved-filter / Tag stilleri global helpdesk.scss'te tanımlı -->
