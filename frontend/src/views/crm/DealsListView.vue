<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">CRM — Anlaşmalar</h1>
        <p class="text-xs text-gray-400">{{ crm.dealsTotal }} kayıt</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
        <button class="hdr-btn-primary" @click="quickOpen = true">
          <AppIcon name="plus" :size="14" /><span>Yeni Anlaşma</span>
        </button>
      </div>
    </div>

    <!-- Status filter chips -->
    <div class="flex items-center gap-2 flex-wrap mb-4">
      <button
        class="status-pill"
        :class="{ active: activeStatus === 'all' }"
        @click="setStatus('all')"
      >
        <span class="w-2 h-2 rounded-full mr-2 bg-gray-300"></span>Tümü
      </button>
      <button
        v-for="s in meta.dealStatuses"
        :key="s.name"
        class="status-pill"
        :class="{ active: activeStatus === s.name }"
        @click="setStatus(s.name)"
      >
        <span
          class="w-2 h-2 rounded-full mr-2"
          :style="{ background: s.color || '#94a3b8' }"
        ></span>
        {{ s.name }}
      </button>
    </div>

    <!-- Toolbar -->
    <CrmListToolbar
      v-model:search="searchQuery"
      v-model:active-view="activeView"
      v-model:order-by="orderBy"
      placeholder="Kurum veya anlaşma no ara..."
      :views="viewOptions"
      :order-by-options="orderByOptions"
      @search="onSearch"
      @update:order-by="load"
      @update:active-view="onViewChange"
    />

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <!-- Empty -->
    <div v-else-if="!deals.length" class="card crm-empty">
      <div class="icon"><AppIcon name="trending-up" :size="22" /></div>
      <h3>Anlaşma yok</h3>
      <p>Lead'i "Fırsata Dönüştür" ile anlaşmaya çevir veya yeni oluştur.</p>
    </div>

    <!-- Kanban View -->
    <div v-else-if="activeView === 'kanban'">
      <CrmKanbanBoard
        :items="deals"
        :columns="kanbanColumns"
        status-field="status"
        title-field="organization"
        value-field="deal_value"
        currency="TRY"
        @item-click="openDetail"
        @status-change="onStatusChange"
      />
    </div>

    <!-- List View -->
    <div v-else class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th">KURUM / NO</th>
              <th class="tbl-th">DURUM</th>
              <th class="tbl-th">DEĞER</th>
              <th class="tbl-th">OLASILIK</th>
              <th class="tbl-th">KAPANIŞ</th>
              <th class="tbl-th">SAHİP</th>
              <th class="tbl-th">GÜNCELLEME</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in deals"
              :key="item.name"
              class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
              @click="openDetail(item)"
            >
              <td class="tbl-td">
                <div class="min-w-0">
                  <p class="text-xs font-semibold truncate max-w-[220px]">
                    {{ item.organization || "—" }}
                  </p>
                  <p class="text-[10px] text-gray-400 font-mono">{{ item.name }}</p>
                </div>
              </td>
              <td class="tbl-td">
                <StatusPill :status="item.status" :color="colorFor(item.status)" />
              </td>
              <td class="tbl-td">
                <CurrencyAmount
                  :amount="item.deal_value || item.expected_deal_value || 0"
                  :currency="item.currency || 'TRY'"
                />
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500">{{
                  item.probability ? `%${item.probability}` : "-"
                }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500">{{
                  formatDate(item.close_date || item.expected_closure_date)
                }}</span>
              </td>
              <td class="tbl-td">
                <div v-if="item.deal_owner" class="flex items-center gap-1.5">
                  <UserAvatar :email="item.deal_owner" size="sm" />
                  <span class="text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[120px]">
                    {{ (item.deal_owner || "").split("@")[0] }}
                  </span>
                </div>
                <span v-else class="text-[11px] text-gray-400">atanmadı</span>
              </td>
              <td class="tbl-td">
                <span class="text-[10px] text-gray-500">
                  <RelativeTime :value="item.modified" />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ListPagination
        v-model="page"
        :total="crm.dealsTotal"
        :page-size="pageSize"
        @update:model-value="load"
      />
    </div>

    <!-- Quick create drawer -->
    <QuickCreateDrawer
      v-model="quickOpen"
      title="Yeni Anlaşma"
      submit-label="Oluştur"
      :saving="saving"
      @submit="createDeal"
    >
      <div class="space-y-3">
        <div>
          <label class="form-label">Kurum</label>
          <select v-if="!newOrgMode" v-model="newDeal.organization" class="form-input">
            <option value="">— Seçin —</option>
            <option v-for="o in meta.organizations" :key="o.name" :value="o.name">
              {{ o.organization_name || o.name }}
            </option>
          </select>
          <input v-else v-model="newOrgName" class="form-input" placeholder="Yeni kurum adı" />
          <button
            type="button"
            class="text-[11px] text-violet-500 hover:underline mt-1"
            @click="toggleNewOrgMode"
          >
            {{ newOrgMode ? "← Mevcut kurumlardan seç" : "+ Yeni kurum ekle" }}
          </button>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Değer</label>
            <input
              v-model.number="newDeal.deal_value"
              type="number"
              class="form-input"
              placeholder="0"
            />
          </div>
          <div>
            <label class="form-label">Olasılık %</label>
            <input
              v-model.number="newDeal.probability"
              type="number"
              min="0"
              max="100"
              class="form-input"
              placeholder="50"
            />
          </div>
        </div>
        <div>
          <label class="form-label">Durum</label>
          <select v-model="newDeal.status" class="form-input">
            <option v-for="s in meta.dealStatuses" :key="s.name" :value="s.name">
              {{ s.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="form-label">Beklenen Kapanış</label>
          <input v-model="newDeal.expected_closure_date" type="date" class="form-input" />
        </div>
      </div>
    </QuickCreateDrawer>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useCrmStore } from "@/stores/crm";
  import { useCrmMetaStore } from "@/stores/crmMeta";
  import { useToast } from "@/composables/useToast";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import StatusPill from "@/components/crm/StatusPill.vue";
  import UserAvatar from "@/components/crm/UserAvatar.vue";
  import CurrencyAmount from "@/components/crm/CurrencyAmount.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";
  import CrmListToolbar from "@/components/crm/CrmListToolbar.vue";
  import CrmKanbanBoard from "@/components/crm/CrmKanbanBoard.vue";
  import QuickCreateDrawer from "@/components/crm/QuickCreateDrawer.vue";

  const crm = useCrmStore();
  const meta = useCrmMetaStore();
  const toast = useToast();
  const route = useRoute();
  const router = useRouter();

  const page = ref(1);
  const pageSize = ref(30);
  const activeStatus = ref(route.query.status || "all");
  const activeView = ref(route.query.view || "list");
  const searchQuery = ref("");
  const orderBy = ref("modified desc");
  const loading = ref(false);

  const deals = ref([]);

  const quickOpen = ref(false);
  const saving = ref(false);
  const newOrgMode = ref(false);
  const newOrgName = ref("");
  const newDeal = ref({
    organization: "",
    deal_value: 0,
    probability: 50,
    status: "",
    expected_closure_date: "",
  });

  function toggleNewOrgMode() {
    newOrgMode.value = !newOrgMode.value;
    if (newOrgMode.value) {
      newDeal.value.organization = "";
    } else {
      newOrgName.value = "";
    }
  }

  const viewOptions = [
    { value: "list", label: "Liste", icon: "list" },
    { value: "kanban", label: "Kanban", icon: "kanban-square" },
  ];

  const orderByOptions = [
    { value: "modified desc", label: "Son Güncellenen" },
    { value: "creation desc", label: "En Yeni" },
    { value: "expected_closure_date asc", label: "Kapanışa Yakın" },
    { value: "deal_value desc", label: "En Yüksek Değer" },
  ];

  const kanbanColumns = computed(() => {
    if (!meta.dealStatuses.length) {
      return [
        { value: "Qualification", label: "Nitelendirme", color: "#3b82f6" },
        { value: "Demo/Making", label: "Sunum", color: "#8b5cf6" },
        { value: "Proposal/Price Quote", label: "Teklif", color: "#f59e0b" },
        { value: "Negotiation", label: "Müzakere", color: "#6366f1" },
        { value: "Won", label: "Kazanıldı", color: "#10b981" },
        { value: "Lost", label: "Kaybedildi", color: "#ef4444" },
      ];
    }
    return meta.dealStatuses.map((s) => ({
      value: s.name,
      label: s.name,
      color: s.color || "#94a3b8",
    }));
  });

  function colorFor(status) {
    const s = meta.dealStatuses.find((x) => x.name === status);
    return s?.color || "";
  }

  function formatDate(s) {
    if (!s) return "-";
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
    if (q) out.push(["organization", "like", `%${q}%`]);
    return out;
  }

  function setStatus(s) {
    activeStatus.value = s;
    page.value = 1;
    const query = { ...route.query };
    if (s === "all") delete query.status;
    else query.status = s;
    router.replace({ query });
    load();
  }

  function onViewChange(v) {
    activeView.value = v;
    const query = { ...route.query };
    query.view = v;
    router.replace({ query });
    load();
  }

  function onSearch() {
    page.value = 1;
    load();
  }

  async function load() {
    loading.value = true;
    try {
      if (activeView.value === "kanban") {
        // Kanban icin tum kayitlari cek
        deals.value = await crm.fetchAllDealsForKanban(buildFilters());
        crm.dealsTotal = deals.value.length;
      } else {
        await crm.fetchDeals({
          page: page.value,
          pageSize: pageSize.value,
          filters: buildFilters(),
          orderBy: orderBy.value,
        });
        deals.value = crm.deals;
      }
    } finally {
      loading.value = false;
    }
  }

  function openDetail(item) {
    router.push(`/crm/deals/${encodeURIComponent(item.name)}`);
  }

  async function onStatusChange({ item, newStatus }) {
    // Optimistic
    const prev = item.status;
    item.status = newStatus;
    try {
      await crm.updateDealStatus(item.name, newStatus);
      toast.success(`Durum "${newStatus}" olarak güncellendi`);
    } catch (e) {
      item.status = prev;
      toast.error(e.message || "Durum güncellenemedi");
    }
  }

  async function createDeal() {
    const orgInput = newOrgMode.value ? newOrgName.value.trim() : newDeal.value.organization;
    if (!orgInput) {
      toast.error("Kurum alanı zorunlu");
      return;
    }
    saving.value = true;
    try {
      let orgName = orgInput;
      // Yeni kurum modundaysa önce CRM Organization'ı oluştur
      if (newOrgMode.value) {
        const exists = meta.organizations.find((o) => (o.organization_name || o.name) === orgInput);
        if (exists) {
          orgName = exists.name;
        } else {
          const created = await api.createDoc("CRM Organization", {
            organization_name: orgInput,
          });
          orgName = created.data?.name || orgInput;
          // Cache'i güncelle ki seçenek listesinde görünsün
          meta.organizations.push({ name: orgName, organization_name: orgInput });
        }
      }

      const created = await crm.createDeal({
        ...newDeal.value,
        organization: orgName,
        status: newDeal.value.status || meta.dealStatuses[0]?.name || "Qualification",
      });
      toast.success("Anlaşma oluşturuldu");
      quickOpen.value = false;
      newDeal.value = {
        organization: "",
        deal_value: 0,
        probability: 50,
        status: "",
        expected_closure_date: "",
      };
      newOrgMode.value = false;
      newOrgName.value = "";
      // Listeyi yenile (router.push detail'e gitse de bu liste cache'i güncel kalsın)
      load();
      router.push(`/crm/deals/${encodeURIComponent(created.name)}`);
    } catch (e) {
      toast.error(e.message || "Oluşturma başarısız");
    } finally {
      saving.value = false;
    }
  }

  watch(
    () => route.query.status,
    (v) => {
      if (v !== undefined && v !== activeStatus.value) activeStatus.value = v || "all";
    }
  );

  onMounted(async () => {
    await meta.loadAll();
    if (!newDeal.value.status && meta.dealStatuses.length) {
      newDeal.value.status = meta.dealStatuses[0].name;
    }
    load();
  });
</script>
