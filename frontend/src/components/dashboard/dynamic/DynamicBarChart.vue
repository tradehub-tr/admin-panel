<template>
  <WidgetWrapper
    :title="widget.title"
    :subtitle="widget.subtitle"
    :size="widget.size || 'md'"
    :empty="!rows.length"
  >
    <BaseChart :option="chartOption" height="280px" />
  </WidgetWrapper>
</template>

<script setup>
import { computed } from 'vue'
import WidgetWrapper from '@/components/dashboard/layout/WidgetWrapper.vue'
import BaseChart from '@/components/dashboard/charts/BaseChart.vue'

const props = defineProps({
  widget: { type: Object, required: true },
  period: { type: String, default: '30d' },
})

const rows = computed(() => props.widget.data?.rows || [])
const isCurrency = computed(() => !!props.widget.data?.is_currency || !!props.widget.is_currency)

const chartOption = computed(() => {
  const reversed = [...rows.value].reverse()
  const labels = reversed.map(r => r.label)
  const values = reversed.map(r => r.value)
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => formatValue(v),
    },
    grid: { top: 10, right: 16, bottom: 24, left: 90 },
    xAxis: { type: 'value', axisLabel: { formatter: shortFormat } },
    yAxis: {
      type: 'category',
      data: labels,
      axisLabel: { width: 80, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      data: values,
      barWidth: 14,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    }],
  }
})

function formatValue(v) {
  if (isCurrency.value) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)
  }
  return new Intl.NumberFormat('tr-TR').format(v)
}

function shortFormat(v) {
  if (isCurrency.value) {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
    if (v >= 1000) return (v / 1000).toFixed(0) + 'K'
  }
  return String(v)
}
</script>
