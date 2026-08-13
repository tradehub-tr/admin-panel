<template>
  <Transition name="fade">
    <div
      v-if="count > 0"
      class="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
      role="region"
      :aria-label="t('logistics.bulk.region')"
    >
      <span class="text-sm font-medium">
        {{ t("logistics.bulk.selected", { count }) }}
      </span>

      <button type="button" class="th-btn-outline text-xs" @click="$emit('clear')">
        {{ t("logistics.bulk.clear") }}
      </button>

      <div class="ms-auto flex flex-wrap items-center gap-2">
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
