<script setup>
  /**
   * Arama + filtreler. Arama Türkçe duyarlıdır (`catalog.js` → `fold`).
   * Dar alanda seçimler "Filtreler (n etkin)" panelinin içine girer; etkin
   * filtreler her genişlikte çip olarak görünür ve tek tek kaldırılır.
   */
  import { computed, ref } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { FILTER_DEFS } from "@/utils/notificationTemplates/catalog";

  const props = defineProps({
    filters: { type: Object, required: true },
    chips: { type: Array, required: true },
    compact: { type: Boolean, default: false },
  });
  const emit = defineEmits(["set", "clear"]);

  const panelOpen = ref(false);
  const searchRef = ref(null);

  const defs = Object.entries(FILTER_DEFS).map(([key, def]) => ({
    key,
    id: `nt-filter-${key}`,
    label: def.label,
    options: def.options().map(([value, label]) => ({ value, label })),
  }));

  const activeCount = computed(() => props.chips.filter((c) => c.key !== "q").length);
  const panelLabel = computed(() =>
    activeCount.value ? `Filtreler (${activeCount.value} etkin)` : "Filtreler"
  );

  function removeChip(key) {
    emit("set", key, "");
    searchRef.value?.focus();
  }

  function clearAll() {
    emit("clear");
    searchRef.value?.focus();
  }

  defineExpose({ focusSearch: () => searchRef.value?.focus() });
</script>

<template>
  <div class="nt-filters" :class="{ 'nt-filters--compact': compact }">
    <div class="nt-filters__row">
      <div class="nt-search">
        <label class="nt-sr" for="nt-filter-q">Olay adı ya da anahtar</label>
        <AppIcon name="search" :size="16" class="nt-search__icon" />
        <input
          id="nt-filter-q"
          ref="searchRef"
          type="search"
          class="form-input nt-search__input"
          placeholder="Olay adı ya da anahtar"
          autocomplete="off"
          :value="filters.q"
          @input="emit('set', 'q', $event.target.value)"
        />
      </div>

      <button
        v-if="compact"
        type="button"
        class="hdr-btn-outlined"
        :class="{ 'is-active': activeCount > 0 }"
        :aria-expanded="panelOpen"
        aria-controls="nt-filter-panel"
        @click="panelOpen = !panelOpen"
      >
        <AppIcon name="funnel" :size="14" />
        {{ panelLabel }}
      </button>

      <div v-show="!compact || panelOpen" id="nt-filter-panel" class="nt-filters__selects">
        <div v-for="def in defs" :key="def.key" class="nt-filters__field">
          <label class="form-label" :for="def.id">{{ def.label }}</label>
          <select
            :id="def.id"
            class="form-input"
            :value="filters[def.key]"
            @change="emit('set', def.key, $event.target.value)"
          >
            <option value="">Tümü</option>
            <option v-for="opt in def.options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="chips.length" class="nt-filters__chips">
      <button
        v-for="chip in chips"
        :key="chip.key"
        type="button"
        class="nt-chip-btn"
        :aria-label="`Filtreyi kaldır: ${chip.text}`"
        @click="removeChip(chip.key)"
      >
        {{ chip.text }}
        <AppIcon name="x" :size="12" />
      </button>
      <button type="button" class="nt-link" @click="clearAll">Tümünü temizle</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .nt-filters {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .nt-filters__row {
    display: grid;
    grid-template-columns: minmax(200px, 1.3fr) minmax(0, 4fr);
    align-items: end;
    gap: 10px;
  }

  .nt-search {
    position: relative;
    min-width: 0;
  }

  .nt-search__icon {
    position: absolute;
    top: 50%;
    inset-inline-start: 10px;
    transform: translateY(-50%);
    color: var(--nt-muted);
    pointer-events: none;
  }

  .nt-search__input {
    padding-inline-start: 32px;
    min-height: 34px;

    @media (max-width: 767px) {
      min-height: 44px;
    }
  }

  .nt-filters__selects {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
    min-width: 0;
  }

  .nt-filters__field {
    min-width: 0;

    .form-label {
      margin-bottom: 3px;
    }

    select {
      width: 100%;
    }
  }

  .nt-filters__chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .hdr-btn-outlined.is-active {
    border-color: var(--nt-brand-line);
    background: var(--nt-brand-bg);
  }

  // Dar alan: arama + "Filtreler" düğmesi aynı satırda, seçimler açılır panelde.
  .nt-filters--compact {
    .nt-filters__row {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
    }

    .nt-filters__selects {
      grid-column: 1 / -1;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      padding: 12px;
      border: 1px solid var(--nt-line);
      border-radius: 10px;
      background: var(--nt-bg);
    }
  }
</style>
