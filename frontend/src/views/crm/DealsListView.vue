<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("dealsList.title") }}
        </h1>
        <p class="text-xs text-gray-400">{{ crm.dealsTotal }} {{ t("dealsList.records") }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("dealsList.refresh") }}</span>
        </button>
        <button class="hdr-btn-primary" data-tour="dl-new" @click="quickOpen = true">
          <AppIcon name="plus" :size="14" /><span>{{ t("dealsList.newDeal") }}</span>
        </button>
      </div>
    </div>

    <!-- Status filter chips -->
    <div class="flex items-center gap-2 flex-wrap mb-4" data-tour="dl-stages">
      <button
        class="status-pill"
        :class="{ active: activeStatus === 'all' }"
        @click="setStatus('all')"
      >
        <span class="w-2 h-2 rounded-full mr-2 bg-gray-300"></span>{{ t("dealsList.all") }}
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
      data-tour="dl-toolbar"
      :placeholder="t('dealsList.searchPlaceholder')"
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
      <h3>{{ t("dealsList.empty") }}</h3>
      <p>{{ t("dealsList.emptyHint") }}</p>
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

    <!-- Grid (card) View -->
    <div v-else-if="activeView === 'grid'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="item in deals"
          :key="item.name"
          class="card p-4 cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/40 transition-colors"
          @click="openDetail(item)"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <p class="text-sm font-semibold truncate">{{ item.organization || "—" }}</p>
            <StatusPill :status="item.status" :color="colorFor(item.status)" />
          </div>
          <p class="text-[10px] text-gray-400 font-mono mb-3">{{ item.name }}</p>
          <div class="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
            <CurrencyAmount
              :amount="item.deal_value || item.expected_deal_value || 0"
              :currency="item.currency || 'TRY'"
            />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-gray-500">{{
              item.probability ? `%${item.probability}` : "-"
            }}</span>
            <div v-if="item.deal_owner" class="flex items-center gap-1.5">
              <UserAvatar :email="item.deal_owner" size="sm" />
              <span class="text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[100px]">
                {{ (item.deal_owner || "").split("@")[0] }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <ListPagination
        v-model="page"
        :total="crm.dealsTotal"
        :page-size="pageSize"
        @update:model-value="load"
      />
    </div>

    <!-- Compact List View -->
    <div v-else-if="activeView === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="item in deals"
        :key="item.name"
        class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        @click="openDetail(item)"
      >
        <span
          class="w-2 h-2 rounded-full flex-none"
          :style="{ background: colorFor(item.status) || '#94a3b8' }"
        ></span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold truncate">{{ item.organization || "—" }}</p>
          <p class="text-[10px] text-gray-400">
            {{ item.status }} · <RelativeTime :value="item.modified" />
          </p>
        </div>
        <CurrencyAmount
          class="text-xs font-medium flex-none"
          :amount="item.deal_value || item.expected_deal_value || 0"
          :currency="item.currency || 'TRY'"
        />
        <UserAvatar v-if="item.deal_owner" :email="item.deal_owner" size="sm" class="flex-none" />
      </div>
      <ListPagination
        v-model="page"
        :total="crm.dealsTotal"
        :page-size="pageSize"
        @update:model-value="load"
      />
    </div>

    <!-- Table View -->
    <div v-else class="card p-0 overflow-hidden" data-tour="dl-table">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th">{{ t("dealsList.colOrganization") }}</th>
              <th class="tbl-th">{{ t("dealsList.colStatus") }}</th>
              <th class="tbl-th">{{ t("dealsList.colValue") }}</th>
              <th class="tbl-th">{{ t("dealsList.colProbability") }}</th>
              <th class="tbl-th">{{ t("dealsList.colClosure") }}</th>
              <th class="tbl-th">{{ t("dealsList.colOwner") }}</th>
              <th class="tbl-th">{{ t("dealsList.colUpdated") }}</th>
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
                  formatDate(item.closed_date || item.expected_closure_date)
                }}</span>
              </td>
              <td class="tbl-td">
                <div v-if="item.deal_owner" class="flex items-center gap-1.5">
                  <UserAvatar :email="item.deal_owner" size="sm" />
                  <span class="text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[120px]">
                    {{ (item.deal_owner || "").split("@")[0] }}
                  </span>
                </div>
                <span v-else class="text-[11px] text-gray-400">{{
                  t("dealsList.unassigned")
                }}</span>
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
      :title="t('dealsList.newDeal')"
      :submit-label="t('dealsList.create')"
      :saving="saving"
      @submit="createDeal"
    >
      <div class="space-y-3">
        <div>
          <label class="form-label">{{ t("dealsList.organization") }}</label>
          <select v-if="!newOrgMode" v-model="newDeal.organization" class="form-input">
            <option value="">{{ t("dealsList.select") }}</option>
            <option v-for="o in meta.organizations" :key="o.name" :value="o.name">
              {{ o.organization_name || o.name }}
            </option>
          </select>
          <input
            v-else
            v-model="newOrgName"
            class="form-input"
            :placeholder="t('dealsList.newOrgPlaceholder')"
          />
          <button
            type="button"
            class="text-[11px] text-violet-500 hover:underline mt-1"
            @click="toggleNewOrgMode"
          >
            {{ newOrgMode ? t("dealsList.selectExistingOrg") : t("dealsList.addNewOrg") }}
          </button>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">{{ t("dealsList.value") }}</label>
            <input
              v-model.number="newDeal.deal_value"
              type="number"
              class="form-input"
              placeholder="0"
            />
          </div>
          <div>
            <label class="form-label">{{ t("dealsList.probability") }}</label>
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
          <label class="form-label">{{ t("dealsList.status") }}</label>
          <select v-model="newDeal.status" class="form-input">
            <option v-for="s in meta.dealStatuses" :key="s.name" :value="s.name">
              {{ s.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="form-label">{{ t("dealsList.expectedClosure") }}</label>
          <input v-model="newDeal.expected_closure_date" type="date" class="form-input" />
        </div>
      </div>
    </QuickCreateDrawer>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
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
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: aşama filtreleri → arama/sıralama → fırsat tablosu → yeni fırsat.
  usePageTour("deals-list", () => [
    { target: '[data-tour="dl-stages"]', title: t("tourSteps.page.dlStages_t"), desc: t("tourSteps.page.dlStages_d") },
    { target: '[data-tour="dl-toolbar"]', title: t("tourSteps.page.dlToolbar_t"), desc: t("tourSteps.page.dlToolbar_d") },
    { target: '[data-tour="dl-table"]', title: t("tourSteps.page.dlTable_t"), desc: t("tourSteps.page.dlTable_d") },
    { target: '[data-tour="dl-new"]', title: t("tourSteps.page.dlNew_t"), desc: t("tourSteps.page.dlNew_d") },
  ]);
  const crm = useCrmStore();
  const meta = useCrmMetaStore();
  const toast = useToast();
  const route = useRoute();
  const router = useRouter();

  const page = ref(1);
  const pageSize = ref(30);
  const activeStatus = ref(route.query.status || "all");
  const activeView = ref(route.query.view || "table");
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

  const viewOptions = ["table", "grid", "kanban", "list"];

  const orderByOptions = [
    { value: "modified desc", label: t("dealsList.sortRecentlyUpdated") },
    { value: "creation desc", label: t("dealsList.sortNewest") },
    { value: "expected_closure_date asc", label: t("dealsList.sortClosingSoon") },
    { value: "deal_value desc", label: t("dealsList.sortHighestValue") },
  ];

  const kanbanColumns = computed(() => {
    if (!meta.dealStatuses.length) {
      return [
        { value: "Qualification", label: t("dealsList.stageQualification"), color: "#3b82f6" },
        { value: "Demo/Making", label: t("dealsList.stageDemo"), color: "#8b5cf6" },
        { value: "Proposal/Price Quote", label: t("dealsList.stageProposal"), color: "#f59e0b" },
        { value: "Negotiation", label: t("dealsList.stageNegotiation"), color: "#6366f1" },
        { value: "Won", label: t("dealsList.stageWon"), color: "#10b981" },
        { value: "Lost", label: t("dealsList.stageLost"), color: "#ef4444" },
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
      toast.success(t("dealsList.statusUpdated", { status: newStatus }));
    } catch (e) {
      item.status = prev;
      toast.error(e.message || t("dealsList.statusUpdateFailed"));
    }
  }

  async function createDeal() {
    const orgInput = newOrgMode.value ? newOrgName.value.trim() : newDeal.value.organization;
    if (!orgInput) {
      toast.error(t("dealsList.orgRequired"));
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
      toast.success(t("dealsList.dealCreated"));
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
      toast.error(e.message || t("dealsList.createFailed"));
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
