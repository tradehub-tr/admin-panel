<template>
  <WidgetWrapper
    :title="widget.title"
    :subtitle="widget.subtitle"
    :size="widget.size || 'lg'"
    :empty="!rows.length"
  >
    <div class="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
      <div v-for="r in rows" :key="r.value" class="flex items-baseline gap-1.5">
        <span class="font-semibold text-sm" :class="r.color">{{ r.count }}</span>
        <span class="text-xs truncate" style="color: var(--th-text-secondary)">{{ r.label }}</span>
      </div>
    </div>
  </WidgetWrapper>
</template>

<script setup>
import { computed } from 'vue'
import WidgetWrapper from '@/components/dashboard/layout/WidgetWrapper.vue'

const props = defineProps({
  widget: { type: Object, required: true },
  period: { type: String, default: '30d' },
})

const rows = computed(() => props.widget.data?.rows || [])
</script>
