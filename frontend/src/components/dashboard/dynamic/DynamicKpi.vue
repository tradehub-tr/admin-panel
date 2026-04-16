<template>
  <KpiCard
    :title="widget.title"
    :value="formattedValue"
    :icon="widget.icon"
    :icon-bg="widget.icon_bg_class || 'bg-violet-100 dark:bg-violet-500/10'"
    :icon-color="widget.icon_color_class || 'text-violet-500'"
    :change="widget.data?.change_pct ?? null"
    :change-positive="(widget.data?.change_pct ?? 0) >= 0"
    :change-label="previousLabel"
  >
    <template v-if="actionLink" #sparkline>
      <router-link :to="actionLink.to" class="text-[11px] font-medium hover:underline" :class="widget.icon_color_class">
        {{ actionLink.label }}
      </router-link>
    </template>
  </KpiCard>
</template>

<script setup>
import { computed } from 'vue'
import KpiCard from '@/components/dashboard/widgets/KpiCard.vue'

const props = defineProps({
  widget: { type: Object, required: true },
  period: { type: String, default: '30d' },
})

const rawValue = computed(() => props.widget.data?.value ?? 0)

const formattedValue = computed(() => {
  const val = rawValue.value
  if (props.widget.is_currency) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }
  return new Intl.NumberFormat('tr-TR').format(val)
})

const previousLabel = computed(() => {
  const map = {
    '7d': 'önceki 7 güne göre',
    '30d': 'önceki aya göre',
    '90d': 'önceki çeyreğe göre',
    '365d': 'önceki yıla göre',
  }
  return map[props.period] || 'önceki döneme göre'
})

const actionLink = computed(() => props.widget.data?.action_link || null)
</script>
