<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">Destek Talepleri</h1>
        <p class="hd-page-sub">{{ hd.ticketsTotal }} kayıt · {{ activeScopeLabel }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hd-action" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
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
    <div class="flex items-center flex-wrap mb-4 border-b border-gray-200 dark:border-white/10">
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
    <div class="hd-card hd-card-pad-sm mb-4">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div class="flex-1 min-w-0">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Konu, talep no veya açan e-posta ara..."
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
          <option value="modified desc">Son Güncellenen</option>
          <option value="creation desc">En Yeni</option>
          <option value="creation asc">En Eski</option>
          <option value="priority asc">Önceliğe Göre</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="hd.loadingTickets" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <!-- Empty -->
    <div v-else-if="hd.tickets.length === 0" class="hd-empty">
      <div class="hd-empty-icon">
        <AppIcon name="life-buoy" :size="28" />
      </div>
      <h3 class="hd-empty-title">Seçili filtreye uyan talep yok</h3>
      <p class="hd-empty-sub">Filtreleri değiştirip tekrar dene.</p>
    </div>

    <!-- Ticket list -->
    <div v-else class="space-y-2.5">
      <div
        v-for="t in hd.tickets"
        :key="t.name"
        class="hd-row group"
        @click="$router.push(`/helpdesk/tickets/${encodeURIComponent(t.name)}`)"
      >
        <!-- Priority bar -->
        <div class="hd-row-prio" :class="priorityBarCls(t.priority)"></div>

        <!-- Main -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1.5">
            <span class="hd-mono">#{{ t.name }}</span>
            <span class="hd-status" :class="statusCls(t.status)">
              <span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="statusDot(t.status)"></span>
              {{ statusLabel(t.status) }}
            </span>
            <span v-if="t.priority" class="hd-prio-chip" :class="priorityChipCls(t.priority)">
              {{ priorityLabel(t.priority) }}
            </span>
            <span v-if="t.agent_group" class="hd-team-chip">
              <AppIcon name="users" :size="10" />{{ t.agent_group }}
            </span>
          </div>
          <p class="hd-row-title truncate">
            {{ t.subject || "(konusuz)" }}
          </p>
          <div class="flex items-center gap-3 mt-1.5">
            <span class="hd-row-meta">
              <AppIcon name="user" :size="11" />{{ t.raised_by || "-" }}
            </span>
            <span class="hd-row-meta">
              <AppIcon name="clock" :size="11" />{{ formatDate(t.modified) }}
            </span>
            <span v-if="assigneeOf(t)" class="hd-row-meta" style="color: var(--brand, #7c3aed)">
              <AppIcon name="user-check" :size="11" />{{ assigneeOf(t) }}
            </span>
          </div>
        </div>

        <AppIcon
          name="chevron-right"
          :size="16"
          class="self-center text-gray-300 dark:text-white/20 group-hover:text-violet-500 transition-colors"
        />
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
  import { useHelpdeskStore } from "@/stores/helpdesk";
  import { useAuthStore } from "@/stores/auth";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";

  const hd = useHelpdeskStore();
  const auth = useAuthStore();

  const page = ref(1);
  const pageSize = ref(20);
  const activeStatus = ref("all");
  const activePriority = ref("");
  const activeScope = ref("all"); // all | mine | team
  const searchQuery = ref("");
  const orderBy = ref("modified desc");

  const statusFilters = [
    { value: "all", label: "Tümü", dot: "bg-gray-300 dark:bg-white/30" },
    { value: "Open", label: "Açık", dot: "bg-blue-400" },
    { value: "Replied", label: "Yanıtlandı", dot: "bg-amber-400" },
    { value: "Resolved", label: "Çözüldü", dot: "bg-emerald-400" },
    { value: "Closed", label: "Kapalı", dot: "bg-gray-400" },
  ];

  const priorityOptions = [
    { value: "Low", label: "Düşük" },
    { value: "Medium", label: "Orta" },
    { value: "High", label: "Yüksek" },
    { value: "Urgent", label: "Acil" },
  ];

  const scopeOptions = [
    { value: "all", label: "Hepsi", icon: "list" },
    { value: "mine", label: "Bana Atanan", icon: "user-check" },
    { value: "team", label: "Ekibim", icon: "users" },
  ];

  const activeScopeLabel = computed(
    () => scopeOptions.find((s) => s.value === activeScope.value)?.label || "Hepsi"
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
  function priorityBarCls(p) {
    const m = { Low: "pb-low", Medium: "pb-medium", High: "pb-high", Urgent: "pb-urgent" };
    return m[p] || "pb-low";
  }

  function formatDate(s) {
    if (!s) return "";
    try {
      const d = new Date(s);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return "az önce";
      if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
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

  onMounted(load);
</script>
