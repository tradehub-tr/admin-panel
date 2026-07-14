<template>
  <div data-tour="nt-table">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("notesList.title") }}
        </h1>
        <p class="text-xs text-gray-400">{{ t("notesList.noteCount", { n: store.total }) }}</p>
      </div>
      <button class="hdr-btn-outlined" data-tour="nt-add" @click="load">
        <AppIcon name="refresh-cw" :size="14" /><span>{{ t("notesList.refresh") }}</span>
      </button>
    </div>

    <CrmListToolbar
      v-model:search="searchQuery"
      v-model:active-view="activeView"
      v-model:order-by="orderBy"
      data-tour="nt-search"
      :placeholder="t('notesList.searchPlaceholder')"
      :views="viewOptions"
      :order-by-options="orderByOptions"
      @search="onSearch"
      @update:order-by="load"
    />

    <div v-if="store.loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-brand-700 animate-spin" />
    </div>
    <div v-else-if="!store.notes.length" class="card crm-empty">
      <div class="icon"><AppIcon name="sticky-note" :size="22" /></div>
      <h3>{{ t("notesList.empty") }}</h3>
      <p>{{ t("notesList.emptyHint") }}</p>
    </div>

    <!-- Grid (kart) görünümü — mevcut varsayılan -->
    <template v-else-if="activeView === 'grid'">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <router-link
          v-for="n in store.notes"
          :key="n.name"
          :to="refLink(n)"
          class="card p-4 hover:border-brand-300 transition-all"
        >
          <div class="flex items-start justify-between mb-2">
            <h4 class="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate">
              {{ n.title }}
            </h4>
            <span class="text-[10px] text-gray-400 shrink-0 ml-2">
              <RelativeTime :value="n.modified" />
            </span>
          </div>
          <p class="text-[12px] text-gray-600 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap">
            {{ n.content }}
          </p>
          <div
            class="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-white/5"
          >
            <span class="text-[10px] text-gray-400">{{ refLabel(n) }}</span>
            <span class="text-[10px] text-gray-500">{{ ownerName(n) }}</span>
          </div>
        </router-link>
      </div>

      <ListPagination
        v-model="page"
        :total="store.total"
        :page-size="pageSize"
        @update:model-value="load"
      />
    </template>

    <!-- Kompakt liste görünümü -->
    <template v-else-if="activeView === 'list'">
      <div class="card p-0 overflow-hidden">
        <router-link
          v-for="n in store.notes"
          :key="n.name"
          :to="refLink(n)"
          class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold truncate">{{ n.title }}</p>
            <p class="text-[11px] text-gray-500 truncate">{{ summarize(n.content) }}</p>
          </div>
          <span class="text-[10px] text-gray-400 flex-none">
            <RelativeTime :value="n.modified" />
          </span>
        </router-link>
      </div>

      <ListPagination
        v-model="page"
        :total="store.total"
        :page-size="pageSize"
        @update:model-value="load"
      />
    </template>

    <!-- Tablo görünümü -->
    <template v-else>
      <div class="card p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="tbl-th">{{ t("cannedResponses.colTitle") }}</th>
                <th class="tbl-th">{{ t("suggestCertification.colNote") }}</th>
                <th class="tbl-th">{{ t("callsList.colReference") }}</th>
                <th class="tbl-th">{{ t("dealsList.colOwner") }}</th>
                <th class="tbl-th">{{ t("dealsList.colUpdated") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="n in store.notes"
                :key="n.name"
                class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
                @click="$router.push(refLink(n))"
              >
                <td class="tbl-td">
                  <p class="text-xs font-semibold truncate max-w-[220px]">{{ n.title }}</p>
                </td>
                <td class="tbl-td">
                  <p class="text-[11px] text-gray-500 truncate max-w-[320px]">
                    {{ summarize(n.content) }}
                  </p>
                </td>
                <td class="tbl-td">
                  <span class="text-[11px] text-gray-500">{{ refLabel(n) }}</span>
                </td>
                <td class="tbl-td">
                  <span class="text-[11px] text-gray-600 dark:text-gray-300">{{
                    ownerName(n)
                  }}</span>
                </td>
                <td class="tbl-td">
                  <span class="text-[10px] text-gray-500">
                    <RelativeTime :value="n.modified" />
                  </span>
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
    </template>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useCrmNoteStore } from "@/stores/crmNotes";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";
  import CrmListToolbar from "@/components/crm/CrmListToolbar.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const store = useCrmNoteStore();

  // Sayfa-içi onboarding: arama/filtre → not listesi → yenile.
  usePageTour("notes-list", () => [
    {
      target: '[data-tour="nt-search"]',
      title: t("tourSteps.page.ntSearch_t"),
      desc: t("tourSteps.page.ntSearch_d"),
    },
    {
      target: '[data-tour="nt-table"]',
      title: t("tourSteps.page.ntTable_t"),
      desc: t("tourSteps.page.ntTable_d"),
    },
    {
      target: '[data-tour="nt-add"]',
      title: t("tourSteps.page.ntAdd_t"),
      desc: t("tourSteps.page.ntAdd_d"),
    },
  ]);

  const page = ref(1);
  const pageSize = ref(24);
  const searchQuery = ref("");
  const orderBy = ref("modified desc");
  const activeView = ref("grid");

  const viewOptions = ["table", "grid", "list"];

  const orderByOptions = [
    { value: "modified desc", label: t("notesList.sortLastUpdated") },
    { value: "creation desc", label: t("notesList.sortNewest") },
    { value: "title asc", label: t("notesList.sortByTitle") },
  ];

  function buildFilters() {
    const f = [];
    const q = searchQuery.value.trim();
    if (q) f.push(["title", "like", `%${q}%`]);
    return f;
  }

  function refLink(n) {
    if (!n.reference_doctype || !n.reference_docname) return "#";
    if (n.reference_doctype === "CRM Lead")
      return `/crm/leads/${encodeURIComponent(n.reference_docname)}`;
    if (n.reference_doctype === "CRM Deal")
      return `/crm/deals/${encodeURIComponent(n.reference_docname)}`;
    return `/app/${encodeURIComponent(n.reference_doctype)}/${encodeURIComponent(n.reference_docname)}`;
  }

  function refLabel(n) {
    if (n.reference_doctype === "CRM Lead") return t("notesList.refLead");
    if (n.reference_doctype === "CRM Deal") return t("notesList.refDeal");
    return n.reference_doctype || t("notesList.refGeneral");
  }

  function ownerName(n) {
    return (n.owner || "").split("@")[0];
  }

  function summarize(content) {
    const text = (content || "").trim();
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }

  function onSearch() {
    page.value = 1;
    load();
  }

  async function load() {
    await store.fetchNotes({
      page: page.value,
      pageSize: pageSize.value,
      filters: buildFilters(),
      orderBy: orderBy.value,
    });
  }

  onMounted(load);
</script>
