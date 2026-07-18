<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("organizationsList.title") }}
        </h1>
        <p class="text-xs text-gray-400">
          {{ t("organizationsList.recordCount", { n: store.total }) }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("organizationsList.refresh") }}</span>
        </button>
        <button
          class="hdr-btn-primary"
          data-tour="og-new"
          @click="$router.push('/crm/organizations/new')"
        >
          <AppIcon name="plus" :size="14" /><span>{{
            t("organizationsList.newOrganization")
          }}</span>
        </button>
      </div>
    </div>

    <CrmListToolbar
      v-model:search="searchQuery"
      v-model:active-view="viewMode"
      v-model:order-by="orderBy"
      data-tour="og-toolbar"
      :placeholder="t('organizationsList.searchPlaceholder')"
      :views="['table', 'grid', 'list']"
      :order-by-options="orderByOptions"
      @search="onSearch"
      @update:order-by="load"
    />

    <div v-if="store.loading" class="card p-3">
      <Skeleton variant="row" :count="8" />
    </div>
    <div v-else-if="!store.organizations.length" class="card crm-empty">
      <div class="icon"><AppIcon name="building-2" :size="22" /></div>
      <h3>{{ t("organizationsList.empty") }}</h3>
    </div>

    <!-- Grid (card) View -->
    <div v-else-if="viewMode === 'grid'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="o in store.organizations"
          :key="o.name"
          class="card p-4 cursor-pointer hover:border-brand-300 dark:hover:border-brand-500/40 transition-colors"
          @click="openDetail(o)"
        >
          <p class="text-sm font-semibold truncate mb-1">{{ o.organization_name || o.name }}</p>
          <p class="text-[11px] text-gray-500 mb-3">{{ o.industry || "-" }}</p>
          <a
            v-if="o.website"
            :href="websiteHref(o.website)"
            target="_blank"
            class="text-xs text-brand-700 hover:underline block truncate mb-3"
            @click.stop
          >
            {{ o.website }}
          </a>
          <p v-else class="text-xs text-gray-400 mb-3">-</p>
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-gray-500 truncate">{{ o.territory || "-" }}</span>
            <CurrencyAmount
              class="text-xs font-medium flex-none"
              :amount="o.annual_revenue || 0"
              :currency="o.currency || 'TRY'"
            />
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
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="o in store.organizations"
        :key="o.name"
        class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/5 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        @click="openDetail(o)"
      >
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold truncate">{{ o.organization_name || o.name }}</p>
          <p class="text-[10px] text-gray-400 truncate">
            {{ o.industry || o.website || "-" }}
          </p>
        </div>
        <span class="text-[11px] text-gray-500 flex-none truncate max-w-[140px]">{{
          o.territory || "-"
        }}</span>
      </div>
      <ListPagination
        v-model="page"
        :total="store.total"
        :page-size="pageSize"
        @update:model-value="load"
      />
    </div>

    <!-- Table View -->
    <div v-else class="card p-0 overflow-hidden" data-tour="og-table">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th">{{ t("organizationsList.colOrganization") }}</th>
              <th class="tbl-th">{{ t("organizationsList.colWebsite") }}</th>
              <th class="tbl-th">{{ t("organizationsList.colIndustry") }}</th>
              <th class="tbl-th">{{ t("organizationsList.colTerritory") }}</th>
              <th class="tbl-th">{{ t("organizationsList.colEmployees") }}</th>
              <th class="tbl-th">{{ t("organizationsList.colAnnualRevenue") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="o in store.organizations"
              :key="o.name"
              class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
              @click="openDetail(o)"
            >
              <td class="tbl-td">
                <div>
                  <p class="text-xs font-semibold truncate max-w-[240px]">
                    {{ o.organization_name || o.name }}
                  </p>
                  <p class="text-[10px] text-gray-400 font-mono">{{ o.name }}</p>
                </div>
              </td>
              <td class="tbl-td">
                <a
                  v-if="o.website"
                  :href="websiteHref(o.website)"
                  target="_blank"
                  class="text-xs text-brand-700 hover:underline"
                  @click.stop
                >
                  {{ o.website }}
                </a>
                <span v-else class="text-xs text-gray-400">-</span>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500">{{ o.industry || "-" }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500">{{ o.territory || "-" }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500">{{ o.no_of_employees || "-" }}</span>
              </td>
              <td class="tbl-td">
                <CurrencyAmount :amount="o.annual_revenue || 0" :currency="o.currency || 'TRY'" />
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
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";
  import { useCrmOrganizationStore } from "@/stores/crmOrganizations";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { usePageTour } from "@/composables/usePageTour";
  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import CurrencyAmount from "@/components/crm/CurrencyAmount.vue";
  import CrmListToolbar from "@/components/crm/CrmListToolbar.vue";

  const { t } = useI18n();
  const router = useRouter();
  const store = useCrmOrganizationStore();
  const { viewMode } = useListViewMode("crm-organizations");

  // Sayfa-içi onboarding: arama/filtre → organizasyon listesi → yeni kayıt.
  usePageTour("organizations-list", () => [
    {
      target: '[data-tour="og-toolbar"]',
      title: t("tourSteps.page.ogToolbar_t"),
      desc: t("tourSteps.page.ogToolbar_d"),
    },
    {
      target: '[data-tour="og-table"]',
      title: t("tourSteps.page.ogTable_t"),
      desc: t("tourSteps.page.ogTable_d"),
    },
    {
      target: '[data-tour="og-new"]',
      title: t("tourSteps.page.ogNew_t"),
      desc: t("tourSteps.page.ogNew_d"),
    },
  ]);

  const page = ref(1);
  const pageSize = ref(30);
  const searchQuery = ref("");
  const orderBy = ref("modified desc");

  const orderByOptions = computed(() => [
    { value: "modified desc", label: t("organizationsList.sortLastUpdated") },
    { value: "creation desc", label: t("organizationsList.sortNewest") },
    { value: "organization_name asc", label: t("organizationsList.sortByName") },
    { value: "annual_revenue desc", label: t("organizationsList.sortHighestRevenue") },
  ]);

  function websiteHref(w) {
    if (!w) return "#";
    return /^https?:/.test(w) ? w : `https://${w}`;
  }

  function openDetail(o) {
    router.push(`/crm/organizations/${encodeURIComponent(o.name)}`);
  }

  function buildFilters() {
    const q = searchQuery.value.trim();
    if (!q) return { filters: [] };
    return {
      filters: [],
      orFilters: [
        ["organization_name", "like", `%${q}%`],
        ["website", "like", `%${q}%`],
      ],
    };
  }

  function onSearch() {
    page.value = 1;
    load();
  }

  async function load() {
    const { filters, orFilters } = buildFilters();
    await store.fetchOrganizations({
      page: page.value,
      pageSize: pageSize.value,
      filters,
      orFilters,
      orderBy: orderBy.value,
    });
  }

  onMounted(load);
</script>
