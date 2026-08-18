<template>
  <Transition name="fade">
    <div
      v-if="count > 0"
      class="card mb-4 !py-2.5 !px-4 flex items-center justify-between gap-3 border-brand-300 dark:border-brand-700"
      role="region"
      :aria-label="t('logistics.bulk.region')"
    >
      <span class="text-[13px] font-medium text-gray-700 dark:text-gray-200">
        {{ t("logistics.bulk.selected", { count }) }}
      </span>

      <div class="ms-auto flex flex-wrap items-center gap-2">
        <button type="button" class="hdr-btn-outlined" @click="$emit('clear')">
          {{ t("logistics.bulk.clear") }}
        </button>
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  /**
   * Toplu aksiyon çubuğu (TUR-117).
   *
   * Aksiyon butonları slot ile gelir — her ekran kendi aksiyonunu koyar ama
   * seçim sayacı, temizleme ve yerleşim ortaktır.
   *
   * `ms-auto` kullanılıyor (`ml-auto` değil): arayüz Arapça'da sağdan sola
   * çalışıyor, mantıksal yön özelliği gerekli.
   */
  defineProps({
    count: { type: Number, default: 0 },
  });
  defineEmits(["clear"]);

  const { t } = useI18n();
</script>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.15s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
