<template>
  <!-- Çip şeridi — `DataTableToolbar`'ınkiyle aynı ölçü ve renkler:
       brand-50 hap, 12px, sağında ✕; sonda altı çizili "Tümünü temizle". -->
  <div
    v-if="chips.length"
    class="flex flex-wrap items-center gap-2 mb-3"
    role="status"
    :aria-label="t('media.filters.active')"
  >
    <span
      v-for="chip in chips"
      :key="chip.key"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] bg-brand-50 text-brand-800 dark:bg-brand-900/25 dark:text-brand-300"
    >
      <span class="mchips__label">{{ chip.label }}</span>
      <button
        type="button"
        class="hover:text-brand-900 dark:hover:text-brand-100"
        :aria-label="t('media.filters.removeChip', { label: chip.label })"
        @click="emit('clear', chip.key)"
      >
        <AppIcon name="x" :size="12" />
      </button>
    </span>

    <button
      v-if="chips.length > 1"
      type="button"
      class="text-[12px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
      @click="emit('clear', 'all')"
    >
      {{ t("media.filters.reset") }}
    </button>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";

  /**
   * Aktif filtreleri tek satırda gösterir; her çip tek tıkla kaldırılır.
   * Filtre rayı katlanmış/mobil drawer'dayken hangi filtrelerin açık olduğu
   * görünür kalsın diye (Notion/Figma deseni).
   *
   * Çip listesi `useDataTable`'ın `chips` computed'inden gelir: ray, sütun
   * filtresi ve arama aynı listeye düşer, burada ikinci bir türetme yok.
   */
  defineProps({
    /** [{ key, label }] — kaynağı `dt.chips`. */
    chips: { type: Array, default: () => [] },
  });
  const emit = defineEmits(["clear"]);

  const { t } = useI18n();
</script>

<style scoped lang="scss">
  @use "@/assets/scss/media" as media;

  .mchips__label {
    max-width: 14rem;
    @include media.truncate;
  }

  // Mobilde okunan metin büyür (medya.md §7.5); ✕ hedefi de rahatlar.
  @media (max-width: media.$m-bp-md) {
    span,
    button {
      font-size: 0.8125rem;
    }
  }
</style>
