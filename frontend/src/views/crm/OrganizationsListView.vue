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
        <button class="hdr-btn-primary" @click="$router.push('/crm/organizations/new')">
          <AppIcon name="plus" :size="14" /><span>{{
            t("organizationsList.newOrganization")
          }}</span>
        </button>
      </div>
    </div>

    <CrmListToolbar
      v-model:search="searchQuery"
      v-model:order-by="orderBy"
      :placeholder="t('organizationsList.searchPlaceholder')"
      :order-by-options="orderByOptions"
      @search="onSearch"
      @update:order-by="load"
    />

    <div v-if="store.loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!store.organizations.length" class="card crm-empty">
      <div class="icon"><AppIcon name="building-2" :size="22" /></div>
      <h3>{{ t("organizationsList.empty") }}</h3>
    </div>
    <div v-else class="card p-0 overflow-hidden">
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
              @click="$router.push(`/crm/organizations/${encodeURIComponent(o.name)}`)"
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
                  class="text-xs text-violet-500 hover:underline"
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
  import { useCrmOrganizationStore } from "@/stores/crmOrganizations";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import CurrencyAmount from "@/components/crm/CurrencyAmount.vue";
  import CrmListToolbar from "@/components/crm/CrmListToolbar.vue";

  const { t } = useI18n();
  const store = useCrmOrganizationStore();

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
