<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">CRM — Notlar</h1>
        <p class="text-xs text-gray-400">{{ store.total }} not</p>
      </div>
      <button class="hdr-btn-outlined" @click="load">
        <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
      </button>
    </div>

    <CrmListToolbar
      v-model:search="searchQuery"
      v-model:order-by="orderBy"
      placeholder="Not başlığı ara..."
      :order-by-options="orderByOptions"
      @search="onSearch"
      @update:order-by="load"
    />

    <div v-if="store.loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!store.notes.length" class="card crm-empty">
      <div class="icon"><AppIcon name="sticky-note" :size="22" /></div>
      <h3>Not yok</h3>
      <p>Lead veya anlaşma detayından not ekleyebilirsiniz.</p>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <router-link
        v-for="n in store.notes"
        :key="n.name"
        :to="refLink(n)"
        class="card p-4 hover:border-violet-300 transition-all"
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
          <span class="text-[10px] text-gray-400">
            {{
              n.reference_doctype === "CRM Lead"
                ? "Lead"
                : n.reference_doctype === "CRM Deal"
                  ? "Anlaşma"
                  : n.reference_doctype || "Genel"
            }}
          </span>
          <span class="text-[10px] text-gray-500">{{ (n.owner || "").split("@")[0] }}</span>
        </div>
      </router-link>
    </div>

    <ListPagination
      v-if="store.notes.length"
      v-model="page"
      :total="store.total"
      :page-size="pageSize"
      @update:model-value="load"
    />
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useCrmNoteStore } from "@/stores/crmNotes";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import RelativeTime from "@/components/crm/RelativeTime.vue";
  import CrmListToolbar from "@/components/crm/CrmListToolbar.vue";

  const store = useCrmNoteStore();

  const page = ref(1);
  const pageSize = ref(24);
  const searchQuery = ref("");
  const orderBy = ref("modified desc");

  const orderByOptions = [
    { value: "modified desc", label: "Son Güncellenen" },
    { value: "creation desc", label: "En Yeni" },
    { value: "title asc", label: "Başlığa Göre" },
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
