<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("tasksList.title") }}
        </h1>
        <p class="text-xs text-gray-400">
          {{ t("tasksList.recordCount", { count: store.total }) }} · {{ activeScopeLabel }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" data-tour="ts-refresh" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("tasksList.refresh") }}</span>
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2 flex-wrap mb-3">
      <button
        v-for="s in scopeOptions"
        :key="s.value"
        class="status-pill"
        :class="{ active: activeScope === s.value }"
        @click="setScope(s.value)"
      >
        <AppIcon :name="s.icon" :size="12" class="inline mr-1" />{{ s.label }}
      </button>
    </div>

    <div
      v-if="activeView !== 'kanban'"
      class="flex items-center gap-2 flex-wrap mb-4"
      data-tour="ts-status"
    >
      <button
        v-for="s in statusOptions"
        :key="s.value"
        class="status-pill"
        :class="{ active: activeStatus === s.value }"
        @click="setStatus(s.value)"
      >
        <span class="w-2 h-2 rounded-full mr-2" :class="s.dot"></span>{{ s.label }}
      </button>
    </div>

    <div data-tour="ts-toolbar">
      <CrmListToolbar
        v-model:search="searchQuery"
        v-model:active-view="activeView"
        v-model:order-by="orderBy"
        :placeholder="t('tasksList.searchPlaceholder')"
        :views="viewOptions"
        :order-by-options="orderByOptions"
        @search="onSearch"
        @update:order-by="load"
        @update:active-view="onViewChange"
      />
    </div>

    <div v-if="store.loading" class="card p-3">
      <Skeleton variant="row" :count="8" />
    </div>
    <div v-else-if="!store.tasks.length" class="card crm-empty">
      <div class="icon"><AppIcon name="check-square" :size="22" /></div>
      <h3>{{ t("tasksList.empty") }}</h3>
    </div>
    <div v-else-if="activeView === 'kanban'">
      <CrmKanbanBoard
        :items="store.tasks"
        :columns="kanbanColumns"
        status-field="status"
        title-field="title"
        :show-total="false"
        @status-change="onKanbanStatusChange"
      />
    </div>

    <!-- Grid (card) View -->
    <div v-else-if="activeView === 'grid'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="task in store.tasks"
          :key="task.name"
          class="card p-4 hover:border-brand-300 dark:hover:border-brand-500/40 transition-colors"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <p
              class="text-sm font-semibold truncate"
              :class="task.status === 'Done' ? 'line-through text-gray-400' : ''"
            >
              {{ task.title }}
            </p>
            <StatusPill :status="task.status" :label="statusLabel(task.status)" />
          </div>
          <p class="text-[10px] text-gray-400 font-mono mb-3">{{ task.name }}</p>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs" :class="priorityCls(task.priority)">{{
              priorityLabel(task.priority)
            }}</span>
            <span
              class="text-xs"
              :class="isOverdue(task) ? 'text-rose-500 font-semibold' : 'text-gray-500'"
            >
              {{ formatDate(task.due_date) }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span v-if="task.assigned_to" class="flex items-center gap-1.5">
              <UserAvatar :email="task.assigned_to" size="sm" />
              <span class="text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[120px]">{{
                (task.assigned_to || "").split("@")[0]
              }}</span>
            </span>
            <span v-else class="text-[11px] text-gray-400">—</span>
            <router-link
              v-if="task.reference_doctype && task.reference_docname"
              :to="refLink(task)"
              class="text-[11px] text-brand-700 hover:underline"
            >
              {{ refLabel(task) }}
            </router-link>
          </div>
        </div>
      </div>
      <ListPagination
        v-model="page"
        :total="store.total"
        :page-size="pageSize"
        @update:model-value="load"
      />
    </div>

    <!-- Compact List View -->
    <div v-else-if="activeView === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="task in store.tasks"
        :key="task.name"
        class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <button
          class="w-4 h-4 rounded border-2 flex items-center justify-center flex-none"
          :class="
            task.status === 'Done'
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-gray-300 dark:border-white/20'
          "
          @click="toggleDone(task)"
        >
          <AppIcon v-if="task.status === 'Done'" name="check" :size="11" class="text-white" />
        </button>
        <div class="min-w-0 flex-1">
          <p
            class="text-xs font-semibold truncate"
            :class="task.status === 'Done' ? 'line-through text-gray-400' : ''"
          >
            {{ task.title }}
          </p>
          <p class="text-[10px] text-gray-400">
            {{ statusLabel(task.status) }} · <RelativeTime :value="task.modified" />
          </p>
        </div>
        <span
          class="text-[11px] flex-none"
          :class="isOverdue(task) ? 'text-rose-500 font-semibold' : 'text-gray-500'"
        >
          {{ formatDate(task.due_date) }}
        </span>
        <UserAvatar v-if="task.assigned_to" :email="task.assigned_to" size="sm" class="flex-none" />
      </div>
      <ListPagination
        v-model="page"
        :total="store.total"
        :page-size="pageSize"
        @update:model-value="load"
      />
    </div>

    <!-- Table View -->
    <div v-else class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th" style="width: 40px"></th>
              <th class="tbl-th">{{ t("tasksList.colTitle") }}</th>
              <th class="tbl-th">{{ t("tasksList.colStatus") }}</th>
              <th class="tbl-th">{{ t("tasksList.colPriority") }}</th>
              <th class="tbl-th">{{ t("tasksList.colDate") }}</th>
              <th class="tbl-th">{{ t("tasksList.colAssignee") }}</th>
              <th class="tbl-th">{{ t("tasksList.colSource") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="task in store.tasks"
              :key="task.name"
              class="tbl-row border-b border-gray-50 dark:border-white/5"
            >
              <td class="tbl-td">
                <button
                  class="w-4 h-4 rounded border-2 flex items-center justify-center"
                  :class="
                    task.status === 'Done'
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-300 dark:border-white/20'
                  "
                  @click="toggleDone(task)"
                >
                  <AppIcon
                    v-if="task.status === 'Done'"
                    name="check"
                    :size="11"
                    class="text-white"
                  />
                </button>
              </td>
              <td class="tbl-td">
                <div class="min-w-0">
                  <p
                    class="text-xs font-semibold truncate max-w-[320px]"
                    :class="task.status === 'Done' ? 'line-through text-gray-400' : ''"
                  >
                    {{ task.title }}
                  </p>
                  <p class="text-[10px] text-gray-400 font-mono">{{ task.name }}</p>
                </div>
              </td>
              <td class="tbl-td">
                <StatusPill :status="task.status" :label="statusLabel(task.status)" />
              </td>
              <td class="tbl-td">
                <span class="text-xs" :class="priorityCls(task.priority)">{{
                  priorityLabel(task.priority)
                }}</span>
              </td>
              <td class="tbl-td">
                <span
                  class="text-xs"
                  :class="isOverdue(task) ? 'text-rose-500 font-semibold' : 'text-gray-500'"
                >
                  {{ formatDate(task.due_date) }}
                </span>
              </td>
              <td class="tbl-td">
                <span v-if="task.assigned_to" class="flex items-center gap-1.5">
                  <UserAvatar :email="task.assigned_to" size="sm" />
                  <span class="text-[11px] text-gray-600">{{
                    (task.assigned_to || "").split("@")[0]
                  }}</span>
                </span>
                <span v-else class="text-[11px] text-gray-400">—</span>
              </td>
              <td class="tbl-td">
                <router-link
                  v-if="task.reference_doctype && task.reference_docname"
                  :to="refLink(task)"
                  class="text-[11px] text-brand-700 hover:underline"
                >
                  {{
                    task.reference_doctype === "CRM Lead"
                      ? $t("tasksList.refLead")
                      : task.reference_doctype === "CRM Deal"
                        ? $t("tasksList.refDeal")
                        : task.reference_doctype
                  }}
                  · {{ task.reference_docname }}
                </router-link>
                <span v-else class="text-[11px] text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ListPagination
        v-model="page"
        :total="store.total"
        :page-size="pageSize"
        @update:model-value="load"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { useCrmTaskStore } from "@/stores/crmTasks";
  import { useAuthStore } from "@/stores/auth";
  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import StatusPill from "@/components/crm/StatusPill.vue";
  import UserAvatar from "@/components/crm/UserAvatar.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";
  import CrmListToolbar from "@/components/crm/CrmListToolbar.vue";
  import CrmKanbanBoard from "@/components/crm/CrmKanbanBoard.vue";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: arama/görünüm → durum sekmeleri → yenile.
  usePageTour("tasks-list", () => [
    {
      target: '[data-tour="ts-toolbar"]',
      title: t("tourSteps.page.tsToolbar_t"),
      desc: t("tourSteps.page.tsToolbar_d"),
    },
    {
      target: '[data-tour="ts-status"]',
      title: t("tourSteps.page.tsStatus_t"),
      desc: t("tourSteps.page.tsStatus_d"),
    },
    {
      target: '[data-tour="ts-refresh"]',
      title: t("tourSteps.page.tsRefresh_t"),
      desc: t("tourSteps.page.tsRefresh_d"),
    },
  ]);
  const store = useCrmTaskStore();
  const auth = useAuthStore();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  const page = ref(1);
  const pageSize = ref(30);
  const activeScope = ref(route.query.scope || "all");
  const activeStatus = ref("all");
  const activeView = ref(route.query.view || "table");
  const searchQuery = ref("");
  const orderBy = ref("due_date asc");

  const viewOptions = ["table", "grid", "kanban", "list"];

  const kanbanColumns = [
    { value: "Backlog", label: t("tasksList.statusBacklog"), color: "#94a3b8" },
    { value: "Todo", label: t("tasksList.statusTodo"), color: "#60a5fa" },
    { value: "In Progress", label: t("tasksList.statusInProgress"), color: "#f59e0b" },
    { value: "Done", label: t("tasksList.statusDone"), color: "#10b981" },
    { value: "Canceled", label: t("tasksList.statusCanceled"), color: "#f43f5e" },
  ];

  const scopeOptions = [
    { value: "all", label: t("tasksList.scopeAll"), icon: "list" },
    { value: "mine", label: t("tasksList.scopeMine"), icon: "user-check" },
    { value: "unassigned", label: t("tasksList.scopeUnassigned"), icon: "user-x" },
  ];

  const statusOptions = [
    { value: "all", label: t("tasksList.statusAll"), dot: "bg-gray-300" },
    { value: "Backlog", label: t("tasksList.statusBacklog"), dot: "bg-gray-400" },
    { value: "Todo", label: t("tasksList.statusTodo"), dot: "bg-blue-400" },
    { value: "In Progress", label: t("tasksList.statusInProgress"), dot: "bg-amber-400" },
    { value: "Done", label: t("tasksList.statusDone"), dot: "bg-emerald-400" },
    { value: "Canceled", label: t("tasksList.statusCanceled"), dot: "bg-rose-400" },
  ];

  const orderByOptions = [
    { value: "due_date asc", label: t("tasksList.orderByDate") },
    { value: "priority asc", label: t("tasksList.orderByPriority") },
    { value: "modified desc", label: t("tasksList.orderByModified") },
    { value: "creation desc", label: t("tasksList.orderByNewest") },
  ];

  const activeScopeLabel = computed(
    () => scopeOptions.find((s) => s.value === activeScope.value)?.label || t("tasksList.scopeAll")
  );

  function statusLabel(s) {
    return statusOptions.find((x) => x.value === s)?.label || s || "-";
  }
  function priorityLabel(p) {
    const m = {
      Low: t("tasksList.priorityLow"),
      Medium: t("tasksList.priorityMedium"),
      High: t("tasksList.priorityHigh"),
    };
    return m[p] || p || "-";
  }
  function priorityCls(p) {
    const m = {
      High: "text-rose-500 font-semibold",
      Medium: "text-amber-500",
      Low: "text-gray-400",
    };
    return m[p] || "text-gray-500";
  }
  function formatDate(s) {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString("tr-TR");
    } catch {
      return s;
    }
  }
  function isOverdue(t) {
    if (!t.due_date || t.status === "Done" || t.status === "Canceled") return false;
    try {
      return new Date(t.due_date) < new Date(new Date().toDateString());
    } catch {
      return false;
    }
  }
  function refLink(t) {
    if (t.reference_doctype === "CRM Lead")
      return `/crm/leads/${encodeURIComponent(t.reference_docname)}`;
    if (t.reference_doctype === "CRM Deal")
      return `/crm/deals/${encodeURIComponent(t.reference_docname)}`;
    return `/app/${encodeURIComponent(t.reference_doctype)}/${encodeURIComponent(t.reference_docname)}`;
  }
  function refLabel(task) {
    const dt = task.reference_doctype;
    const label =
      dt === "CRM Lead" ? t("tasksList.refLead") : dt === "CRM Deal" ? t("tasksList.refDeal") : dt;
    return `${label} · ${task.reference_docname}`;
  }

  function buildFilters() {
    const f = [];
    if (activeStatus.value !== "all") f.push(["status", "=", activeStatus.value]);
    if (activeScope.value === "mine" && auth.user?.email) {
      f.push(["assigned_to", "=", auth.user.email]);
    }
    if (activeScope.value === "unassigned") {
      f.push(["assigned_to", "in", ["", null]]);
    }
    const q = searchQuery.value.trim();
    if (q) f.push(["title", "like", `%${q}%`]);
    return f;
  }

  function setStatus(s) {
    activeStatus.value = s;
    page.value = 1;
    load();
  }
  function setScope(s) {
    activeScope.value = s;
    page.value = 1;
    const query = { ...route.query };
    if (s === "all") delete query.scope;
    else query.scope = s;
    router.replace({ query });
    load();
  }
  function onSearch() {
    page.value = 1;
    load();
  }

  async function toggleDone(task) {
    const prev = task.status;
    const newStatus = task.status === "Done" ? "Todo" : "Done";
    task.status = newStatus; // optimistic — checkbox anında tepki versin
    try {
      await store.setStatus(task.name, newStatus);
    } catch (e) {
      task.status = prev; // başarısızsa geri al
      toast.error(e.message || t("tasksList.statusUpdateFailed"));
    }
  }

  async function load() {
    // Kanban modunda durum sütunlarına dağıtmak için tüm kayıtlar lazım;
    // listede sayfalama uygulanır.
    const isKanban = activeView.value === "kanban";
    await store.fetchTasks({
      page: isKanban ? 1 : page.value,
      pageSize: isKanban ? 1000 : pageSize.value,
      filters: buildFilters(),
      orderBy: orderBy.value,
    });
  }

  function onViewChange(v) {
    activeView.value = v;
    page.value = 1;
    const query = { ...route.query };
    if (v === "table") delete query.view;
    else query.view = v;
    router.replace({ query });
    // Kanban'a geçince status filtresi anlamsız — sıfırla
    if (v === "kanban") activeStatus.value = "all";
    load();
  }

  async function onKanbanStatusChange({ item, newStatus }) {
    const prev = item.status;
    item.status = newStatus;
    try {
      await store.setStatus(item.name, newStatus);
      toast.success(t("tasksList.statusUpdated", { status: statusLabel(newStatus) }));
    } catch (e) {
      item.status = prev;
      toast.error(e.message || t("tasksList.statusUpdateFailed"));
    }
  }

  watch(
    () => route.query.scope,
    (v) => {
      if (v !== undefined && v !== activeScope.value) {
        activeScope.value = v || "all";
        load();
      }
    }
  );

  onMounted(load);
</script>
