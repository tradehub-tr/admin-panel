<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          CRM — Talepler (Lead)
        </h1>
        <p class="text-xs text-gray-400">{{ crm.leadsTotal }} kayıt</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
        <button class="hdr-btn-primary" @click="$router.push('/crm/leads/new')">
          <AppIcon name="plus" :size="14" /><span>Yeni Lead</span>
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2 flex-wrap mb-4">
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

    <div class="card mb-5 !p-3">
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
            placeholder="İsim veya e-posta ara..."
            class="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-100"
            @input="onSearch"
          />
        </div>
        <select v-model="orderBy" class="form-input-sm w-auto" @change="load()">
          <option value="modified desc">Son Güncellenen</option>
          <option value="creation desc">En Yeni</option>
          <option value="creation asc">En Eski</option>
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
      <h3 class="text-sm font-bold text-gray-700 mb-1">Henüz lead yok</h3>
      <p class="text-xs text-gray-400">İletişim formundan veya manuel olarak ekleyebilirsiniz.</p>
    </div>

    <div v-else class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="tbl-th">İSİM</th>
              <th class="tbl-th">E-POSTA</th>
              <th class="tbl-th">TELEFON</th>
              <th class="tbl-th">KURUM</th>
              <th class="tbl-th">KAYNAK</th>
              <th class="tbl-th">DURUM</th>
              <th class="tbl-th">TARİH</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in crm.leads"
              :key="item.name"
              class="tbl-row border-b border-gray-50 cursor-pointer transition-colors hover:bg-violet-50/30"
              @click="$router.push(`/crm/leads/${encodeURIComponent(item.name)}`)"
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
  import { ref, computed, onMounted } from "vue";
  import { useCrmStore } from "@/stores/crm";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";

  const crm = useCrmStore();

  const page = ref(1);
  const pageSize = ref(20);
  const activeStatus = ref("all");
  const searchQuery = ref("");
  const orderBy = ref("modified desc");

  const statusFilters = [
    { value: "all", label: "Tümü", dot: "bg-gray-300" },
    { value: "New", label: "Yeni", dot: "bg-blue-400" },
    { value: "Contacted", label: "İletişime Geçildi", dot: "bg-amber-400" },
    { value: "Nurture", label: "Takip", dot: "bg-violet-400" },
    { value: "Qualified", label: "Nitelikli", dot: "bg-emerald-400" },
    { value: "Unqualified", label: "Reddedildi", dot: "bg-rose-400" },
    { value: "Junk", label: "Spam", dot: "bg-gray-400" },
  ];

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

  async function load() {
    await crm.fetchLeads({
      page: page.value,
      pageSize: pageSize.value,
      filters: buildFilters(),
      orderBy: orderBy.value,
    });
  }

  onMounted(load);
</script>
