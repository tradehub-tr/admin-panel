<template>
  <div>
    <div class="card !p-3 mb-3">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
        <!-- Global arama -->
        <div class="relative flex-1 min-w-0">
          <AppIcon
            name="search"
            :size="13"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="searchInput"
            type="text"
            :placeholder="searchPlaceholder"
            class="form-input-sm w-full !pl-9"
            @input="onSearchInput"
          />
          <button
            v-if="searchInput"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            @click="clearSearch"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </div>

        <!-- Sütunlar (yalnızca table modu) -->
        <div v-if="showColumns" class="relative">
          <button
            type="button"
            class="hdr-btn-outlined flex items-center gap-1.5"
            @click="columnsOpen = !columnsOpen"
          >
            <AppIcon name="columns-2" :size="13" />
            Sütunlar
          </button>
          <template v-if="columnsOpen">
            <div class="fixed inset-0 z-40" @click="columnsOpen = false" />
            <div
              class="absolute right-0 mt-2 z-50 w-56 rounded-xl border border-gray-200 dark:border-[#2a2a35] bg-white dark:bg-[#16161f] shadow-xl py-2"
            >
              <div class="px-4 py-1.5 text-[11px] font-semibold uppercase text-gray-400">
                Görünür sütunlar
              </div>
              <label
                v-for="col in dt.columns.value"
                :key="col.key"
                class="flex items-center gap-2 px-4 py-1.5 text-[13px] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                :class="{ 'opacity-50 cursor-not-allowed': col.hideable === false }"
              >
                <input
                  type="checkbox"
                  class="accent-brand-600"
                  :checked="!dt.hidden[col.key]"
                  :disabled="col.hideable === false"
                  @change="dt.toggleColumn(col.key)"
                />
                {{ col.label }}
              </label>
            </div>
          </template>
        </div>

        <!-- Filtreler -->
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors"
          :class="
            dt.activeFilterCount.value
              ? 'bg-brand-500 text-brand-ink border-brand-500'
              : 'border-gray-200 dark:border-[#2a2a35] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          "
          @click="drawerOpen = true"
        >
          <AppIcon name="filter" :size="13" />
          Filtreler
          <span
            v-if="dt.activeFilterCount.value"
            class="ml-0.5 px-1.5 rounded-full text-[11px] bg-white/25"
          >
            {{ dt.activeFilterCount.value }}
          </span>
        </button>
      </div>
    </div>

    <!-- Aktif filtre çipleri -->
    <div v-if="dt.chips.value.length" class="flex flex-wrap items-center gap-2 mb-3">
      <span
        v-for="chip in dt.chips.value"
        :key="chip.key"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] bg-brand-50 text-brand-800 dark:bg-brand-900/25 dark:text-brand-300"
      >
        {{ chip.label }}
        <button
          type="button"
          class="hover:text-brand-900 dark:hover:text-brand-100"
          @click="chip.clear"
        >
          <AppIcon name="x" :size="12" />
        </button>
      </span>
      <button
        type="button"
        class="text-[12px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
        @click="dt.clearAll()"
      >
        Tümünü temizle
      </button>
    </div>

    <!-- Filtre çekmecesi (drawer) -->
    <Teleport to="body">
      <Transition name="dt-drawer">
        <div v-if="drawerOpen" class="fixed inset-0 z-[70]">
          <div class="absolute inset-0 bg-black/40" @click="drawerOpen = false" />
          <aside
            class="absolute right-0 top-0 h-full w-[380px] max-w-[92vw] flex flex-col bg-white dark:bg-[#16161f] shadow-2xl"
          >
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#2a2a35]"
            >
              <div class="flex items-center gap-2">
                <AppIcon name="filter" :size="16" class="text-brand-800" />
                <span class="font-semibold text-gray-900 dark:text-gray-100">Filtreler</span>
                <span
                  v-if="dt.activeFilterCount.value"
                  class="px-1.5 rounded-full text-[11px] bg-brand-50 text-brand-800 dark:bg-brand-900/25 dark:text-brand-300"
                >
                  {{ dt.activeFilterCount.value }}
                </span>
              </div>
              <button
                type="button"
                class="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                @click="drawerOpen = false"
              >
                <AppIcon name="x" :size="18" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-5 py-4">
              <div v-for="f in dt.filterFields.value" :key="f.key" class="mb-5">
                <label class="block mb-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                  {{ f.label }}
                </label>
                <DtFilterControl
                  :field="f"
                  :model-value="dt.filters[f.key]"
                  @update:model-value="dt.setFilter(f.key, $event)"
                />
              </div>
            </div>

            <div class="px-5 py-4 border-t border-gray-200 dark:border-[#2a2a35]">
              <button
                type="button"
                class="hdr-btn-outlined w-full justify-center"
                @click="dt.clearAll()"
              >
                Tüm filtreleri temizle
              </button>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, watch } from "vue";
  import AppIcon from "@/components/common/AppIcon.vue";
  import DtFilterControl from "@/components/common/datatable/DtFilterControl.vue";

  const props = defineProps({
    // useDataTable() dönüşü — tablo "controller"ı (refs + helpers).
    dt: { type: Object, required: true },
    showColumns: { type: Boolean, default: false },
    searchPlaceholder: { type: String, default: "Ara…" },
    debounce: { type: Number, default: 300 },
  });

  const columnsOpen = ref(false);
  // v-model:drawer — parent bağlamazsa local ref gibi davranır; mobil kompakt
  // toolbar'lar çekmeceyi dışarıdan açabilsin diye model'e çevrildi.
  const drawerOpen = defineModel("drawer", { type: Boolean, default: false });

  // Arama debounce — yazarken her tuşta fetch tetiklenmesin.
  const searchInput = ref(props.dt.search.value);
  let timer = null;
  watch(
    () => props.dt.search.value,
    (v) => {
      if (v !== searchInput.value) searchInput.value = v;
    }
  );
  function onSearchInput() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      props.dt.setSearch(searchInput.value);
    }, props.debounce);
  }
  function clearSearch() {
    searchInput.value = "";
    props.dt.setSearch("");
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .dt-drawer-enter-active,
  .dt-drawer-leave-active {
    transition: opacity $t-base;
    aside {
      transition: transform $t-spring;
    }
  }
  .dt-drawer-enter-from,
  .dt-drawer-leave-to {
    opacity: 0;
    aside {
      transform: translateX(100%);
    }
  }
</style>
