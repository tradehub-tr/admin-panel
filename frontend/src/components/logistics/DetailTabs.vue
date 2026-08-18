<template>
  <div class="space-y-5">
    <!-- Sekme çubuğu kendi kartında (DocTypeFormView deseni): kart gövdesini
         sekme sahibi sarıyor, çubuk yalnız kabuk. -->
    <div class="card !p-0 overflow-hidden">
      <nav
        class="flex border-b border-gray-100 dark:border-white/10 overflow-x-auto"
        role="tablist"
      >
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="tab.key === modelValue"
          :class="[
            'flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-[13px] font-medium transition-all',
            tab.key === modelValue
              ? 'border-brand-500 text-brand-800 bg-brand-50/50 dark:text-brand-500 dark:bg-brand-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
          ]"
          @click="$emit('update:modelValue', tab.key)"
        >
          {{ tab.label }}
          <span
            v-if="tab.count !== undefined && tab.count !== null"
            class="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-white/10 dark:text-gray-300"
          >
            {{ tab.count }}
          </span>
          <span
            v-if="tab.alert"
            class="h-1.5 w-1.5 rounded-full bg-red-500"
            :title="t('logistics.tab.needsAttention')"
          />
        </button>
      </nav>
    </div>

    <div role="tabpanel">
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
