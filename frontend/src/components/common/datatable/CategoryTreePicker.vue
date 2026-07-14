<template>
  <Teleport to="body">
    <Transition name="dt-modal">
      <div v-if="open" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="open = false" />
        <div
          class="relative w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-[#16161f] shadow-2xl"
        >
          <div
            class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#2a2a35]"
          >
            <div class="flex items-center gap-2">
              <AppIcon name="folder-tree" :size="16" class="text-brand-800" />
              <span class="font-semibold text-gray-900 dark:text-gray-100"
                >Platform Kategorisi Seç</span
              >
            </div>
            <button
              type="button"
              class="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              @click="open = false"
            >
              <AppIcon name="x" :size="18" />
            </button>
          </div>

          <!-- Breadcrumb -->
          <div
            class="flex items-center flex-wrap gap-1 px-5 py-2 text-[12px] border-b border-gray-100 dark:border-[#2a2a35]"
          >
            <button
              type="button"
              class="hover:text-brand-800"
              :class="path.length ? 'text-gray-500' : 'text-brand-800 font-medium'"
              @click="goTo(-1)"
            >
              Kök
            </button>
            <template v-for="(crumb, idx) in path" :key="crumb.name">
              <span class="text-gray-300">›</span>
              <button
                type="button"
                class="hover:text-brand-800"
                :class="idx === path.length - 1 ? 'text-brand-800 font-medium' : 'text-gray-500'"
                @click="goTo(idx)"
              >
                {{ crumb.category_name }}
              </button>
            </template>
          </div>

          <!-- Arama -->
          <div class="px-5 py-2 border-b border-gray-100 dark:border-[#2a2a35]">
            <div class="relative">
              <AppIcon
                name="search"
                :size="13"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                v-model="search"
                type="text"
                placeholder="Kategori ara (min 2 harf)…"
                class="form-input-sm w-full !pl-9"
                @input="onSearchInput"
              />
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-2 py-2">
            <div v-if="loading || searching" class="text-center py-8 text-sm text-gray-400">
              <AppIcon name="loader" :size="20" class="animate-spin mx-auto" />
            </div>

            <!-- Arama sonuçları -->
            <template v-else-if="search.trim().length >= 2">
              <div v-if="!searchResults.length" class="text-center py-8 text-sm text-gray-400">
                Sonuç bulunamadı
              </div>
              <button
                v-for="cat in searchResults"
                :key="cat.name"
                type="button"
                class="flex w-full items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-[13px] hover:bg-gray-50 dark:hover:bg-white/5"
                @click="choose(cat)"
              >
                <span class="text-gray-800 dark:text-gray-200">{{ cat.category_name }}</span>
                <span v-if="cat.path_label" class="text-[11px] text-gray-400 truncate">{{
                  cat.path_label
                }}</span>
              </button>
            </template>

            <!-- Ağaç navigasyonu -->
            <template v-else>
              <div v-if="!items.length" class="text-center py-8 text-sm text-gray-400">
                Alt kategori yok
              </div>
              <button
                v-for="cat in items"
                :key="cat.name"
                type="button"
                class="flex w-full items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-[13px] hover:bg-gray-50 dark:hover:bg-white/5"
                @click="selectItem(cat)"
              >
                <span class="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <AppIcon name="folder" :size="14" class="text-brand-600" />
                  {{ cat.category_name }}
                </span>
                <AppIcon
                  v-if="cat.child_count > 0"
                  name="chevron-right"
                  :size="14"
                  class="text-gray-400"
                />
                <span v-else class="text-[10px] text-brand-800 font-medium">Seç</span>
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
  import { ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";

  const open = defineModel("open", { type: Boolean, default: false });
  const emit = defineEmits(["select"]);

  const { locale } = useI18n();
  const toast = useToast();

  const items = ref([]);
  const path = ref([]);
  const search = ref("");
  const searchResults = ref([]);
  const loading = ref(false);
  const searching = ref(false);
  let debounce = null;

  async function loadChildren(parent) {
    loading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.category.get_platform_category_tree", {
        parent: parent || "",
        lang: locale.value,
      });
      items.value = res.message || [];
    } catch (err) {
      toast.error(err.message || "Kategoriler yüklenemedi");
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  function onSearchInput() {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(performSearch, 300);
  }
  async function performSearch() {
    const q = search.value.trim();
    if (q.length < 2) {
      searchResults.value = [];
      return;
    }
    searching.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.category.search_platform_categories", {
        query: q,
        limit: 30,
        lang: locale.value,
      });
      searchResults.value = res.message || [];
    } catch {
      searchResults.value = [];
    } finally {
      searching.value = false;
    }
  }

  async function drillDown(cat) {
    path.value.push({ name: cat.name, category_name: cat.category_name });
    await loadChildren(cat.name);
  }
  async function goTo(idx) {
    if (idx === -1) {
      path.value = [];
      await loadChildren(null);
    } else {
      path.value = path.value.slice(0, idx + 1);
      await loadChildren(path.value[idx].name);
    }
  }
  function selectItem(cat) {
    if (cat.child_count > 0) drillDown(cat);
    else choose(cat);
  }
  function choose(cat) {
    emit("select", { name: cat.name, category_name: cat.category_name });
    open.value = false;
  }

  // Modal her açıldığında kökten başla.
  watch(open, (v) => {
    if (!v) return;
    path.value = [];
    search.value = "";
    searchResults.value = [];
    loadChildren(null);
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .dt-modal-enter-active,
  .dt-modal-leave-active {
    transition: opacity $t-base;
  }
  .dt-modal-enter-from,
  .dt-modal-leave-to {
    opacity: 0;
  }
</style>
