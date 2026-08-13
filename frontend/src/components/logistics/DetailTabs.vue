<template>
  <div>
    <div class="border-b border-slate-200 dark:border-slate-700">
      <nav class="-mb-px flex gap-1 overflow-x-auto" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="tab.key === modelValue"
          :class="[
            'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium',
            tab.key === modelValue
              ? 'border-brand-600 text-brand-700 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
          ]"
          @click="$emit('update:modelValue', tab.key)"
        >
          {{ tab.label }}
          <span
            v-if="tab.count !== undefined && tab.count !== null"
            class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] dark:bg-slate-700"
          >
            {{ tab.count }}
          </span>
          <span
            v-if="tab.alert"
            class="h-1.5 w-1.5 rounded-full bg-red-500"
            :title="t('logistics.tabs.needsAttention')"
          />
        </button>
      </nav>
    </div>

    <div class="pt-5" role="tabpanel">
      <slot :active="modelValue" />
    </div>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";

  /**
   * Sevkiyat detayının sekme kabuğu (TUR-117).
   *
   * Sekme başına sayaç ve dikkat noktası gösterir — operasyon hangi sekmede
   * iş olduğunu açmadan görmeli. Hover'da yalnız renk değişiyor, kenarlık
   * kalınlığı sabit: kök CLAUDE.md §4.5 layout shift yasağı.
   *
   * `tabs`: [{ key, label, count?, alert? }]
   */
  defineProps({
    tabs: { type: Array, required: true },
    modelValue: { type: String, required: true },
  });
  defineEmits(["update:modelValue"]);

  const { t } = useI18n();
</script>
