<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">CRM — Görevler</h1>
        <p class="text-xs text-gray-400">{{ store.total }} kayıt · {{ activeScopeLabel }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
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

    <div class="flex items-center gap-2 flex-wrap mb-4">
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

    <CrmListToolbar
      v-model:search="searchQuery"
      v-model:order-by="orderBy"
      placeholder="Görev başlığı ara..."
      :order-by-options="orderByOptions"
      @search="onSearch"
      @update:order-by="load"
    />

    <div v-if="store.loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!store.tasks.length" class="card crm-empty">
      <div class="icon"><AppIcon name="check-square" :size="22" /></div>
      <h3>Görev yok</h3>
    </div>
    <div v-else class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th" style="width: 40px"></th>
              <th class="tbl-th">BAŞLIK</th>
              <th class="tbl-th">DURUM</th>
              <th class="tbl-th">ÖNCELİK</th>
              <th class="tbl-th">TARİH</th>
              <th class="tbl-th">ATANAN</th>
              <th class="tbl-th">KAYNAK</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in store.tasks"
              :key="t.name"
              class="tbl-row border-b border-gray-50 dark:border-white/5"
            >
              <td class="tbl-td">
                <button
                  class="w-4 h-4 rounded border-2 flex items-center justify-center"
                  :class="
                    t.status === 'Done'
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-300 dark:border-white/20'
                  "
                  @click="toggleDone(t)"
                >
                  <AppIcon v-if="t.status === 'Done'" name="check" :size="11" class="text-white" />
                </button>
              </td>
              <td class="tbl-td">
                <div class="min-w-0">
                  <p
                    class="text-xs font-semibold truncate max-w-[320px]"
                    :class="t.status === 'Done' ? 'line-through text-gray-400' : ''"
                  >
                    {{ t.title }}
                  </p>
                  <p class="text-[10px] text-gray-400 font-mono">{{ t.name }}</p>
                </div>
              </td>
              <td class="tbl-td">
                <StatusPill :status="t.status" :label="statusLabel(t.status)" />
              </td>
              <td class="tbl-td">
                <span class="text-xs" :class="priorityCls(t.priority)">{{
                  priorityLabel(t.priority)
                }}</span>
              </td>
              <td class="tbl-td">
                <span
                  class="text-xs"
                  :class="isOverdue(t) ? 'text-rose-500 font-semibold' : 'text-gray-500'"
                >
                  {{ formatDate(t.due_date) }}
                </span>
              </td>
              <td class="tbl-td">
                <span v-if="t.assigned_to" class="flex items-center gap-1.5">
                  <UserAvatar :email="t.assigned_to" size="sm" />
                  <span class="text-[11px] text-gray-600">{{
                    (t.assigned_to || "").split("@")[0]
                  }}</span>
                </span>
                <span v-else class="text-[11px] text-gray-400">—</span>
              </td>
              <td class="tbl-td">
                <router-link
                  v-if="t.reference_doctype && t.reference_docname"
                  :to="refLink(t)"
                  class="text-[11px] text-violet-500 hover:underline"
                >
                  {{
                    t.reference_doctype === "CRM Lead"
                      ? "Lead"
                      : t.reference_doctype === "CRM Deal"
                        ? "Anlaşma"
                        : t.reference_doctype
                  }}
                  · {{ t.reference_docname }}
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
  import { useRoute, useRouter } from "vue-router";
  import { useCrmTaskStore } from "@/stores/crmTasks";
  import { useAuthStore } from "@/stores/auth";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import StatusPill from "@/components/crm/StatusPill.vue";
  import UserAvatar from "@/components/crm/UserAvatar.vue";
  import CrmListToolbar from "@/components/crm/CrmListToolbar.vue";

  const store = useCrmTaskStore();
  const auth = useAuthStore();
  const route = useRoute();
  const router = useRouter();

  const page = ref(1);
  const pageSize = ref(30);
  const activeScope = ref(route.query.scope || "all");
  const activeStatus = ref("all");
  const searchQuery = ref("");
  const orderBy = ref("due_date asc");

  const scopeOptions = [
    { value: "all", label: "Tümü", icon: "list" },
    { value: "mine", label: "Bana atanan", icon: "user-check" },
    { value: "unassigned", label: "Atanmamış", icon: "user-x" },
  ];

  const statusOptions = [
    { value: "all", label: "Tümü", dot: "bg-gray-300" },
    { value: "Backlog", label: "Beklemede", dot: "bg-gray-400" },
    { value: "Todo", label: "Yapılacak", dot: "bg-blue-400" },
    { value: "In Progress", label: "Yapılıyor", dot: "bg-amber-400" },
    { value: "Done", label: "Tamam", dot: "bg-emerald-400" },
    { value: "Canceled", label: "İptal", dot: "bg-rose-400" },
  ];

  const orderByOptions = [
    { value: "due_date asc", label: "Tarihe Göre" },
    { value: "priority asc", label: "Önceliğe Göre" },
    { value: "modified desc", label: "Son Güncellenen" },
    { value: "creation desc", label: "En Yeni" },
  ];

  const activeScopeLabel = computed(
    () => scopeOptions.find((s) => s.value === activeScope.value)?.label || "Tümü"
  );

  function statusLabel(s) {
    return statusOptions.find((x) => x.value === s)?.label || s || "-";
  }
  function priorityLabel(p) {
    const m = { Low: "Düşük", Medium: "Orta", High: "Yüksek" };
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

  async function toggleDone(t) {
    const newStatus = t.status === "Done" ? "Todo" : "Done";
    try {
      await store.setStatus(t.name, newStatus);
      t.status = newStatus;
    } catch {
      /* yoksay */
    }
  }

  async function load() {
    await store.fetchTasks({
      page: page.value,
      pageSize: pageSize.value,
      filters: buildFilters(),
      orderBy: orderBy.value,
    });
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
