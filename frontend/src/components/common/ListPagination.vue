<template>
  <div class="list-pagination">
    <div class="list-pagination-group">
      <span class="list-pagination-info"> {{ rangeStart }}–{{ rangeEnd }} / {{ total }} </span>
      <AppSelect
        v-if="pageSizeOptions.length"
        :model-value="pageSize"
        :options="sizeOptions"
        class="w-[104px]"
        :aria-label="t('common.pageSize')"
        @update:model-value="$emit('update:pageSize', Number($event))"
      />
    </div>
    <div class="list-pagination-pages">
      <button
        type="button"
        class="list-pagination-btn"
        :aria-label="t('common.previousPage')"
        :disabled="modelValue <= 1"
        @click="$emit('update:modelValue', modelValue - 1)"
      >
        <AppIcon name="chevron-left" :size="14" />
      </button>
      <button
        v-for="p in visiblePages"
        :key="p"
        type="button"
        class="list-pagination-btn"
        :aria-label="t('common.pageNumber', { n: p })"
        :aria-current="p === modelValue ? 'page' : undefined"
        :class="{ active: p === modelValue }"
        @click="$emit('update:modelValue', p)"
      >
        {{ p }}
      </button>
      <button
        type="button"
        class="list-pagination-btn"
        :aria-label="t('common.nextPage')"
        :disabled="modelValue >= totalPages"
        @click="$emit('update:modelValue', modelValue + 1)"
      >
        <AppIcon name="chevron-right" :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import AppSelect from "@/components/common/AppSelect.vue";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { pageWindow } from "@/utils/pageWindow";

  const { t } = useI18n();
  // Telefonda (<768) 3 sayfa numarası, üstünde 5. Sabit 5 iken 320px'te
  // "‹ 1 2 3 4 5 ›" 44px'lik dokunma düğmeleriyle satıra sığmıyor, ileri oku
  // tek başına alt satıra düşüyordu.
  const { isLg } = useBreakpoint();

  const props = defineProps({
    modelValue: { type: Number, required: true },
    total: { type: Number, default: 0 },
    pageSize: { type: Number, default: 20 },
    // Boş bırakılırsa sayfa-boyutu seçici gösterilmez (geriye uyumlu).
    pageSizeOptions: { type: Array, default: () => [] },
  });

  defineEmits(["update:modelValue", "update:pageSize"]);

  const sizeOptions = computed(() =>
    props.pageSizeOptions.map((n) => ({ value: n, label: t("common.perPage", { n }) }))
  );

  const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

  const rangeStart = computed(() => {
    if (props.total === 0) return 0;
    return (props.modelValue - 1) * props.pageSize + 1;
  });

  const rangeEnd = computed(() => {
    return Math.min(props.modelValue * props.pageSize, props.total);
  });

  const visiblePages = computed(() =>
    pageWindow(props.modelValue, totalPages.value, isLg.value ? 5 : 3)
  );
</script>
