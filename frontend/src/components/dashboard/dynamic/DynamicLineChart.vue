<template>
  <WidgetWrapper
    :title="widget.title"
    :subtitle="widget.subtitle"
    :size="widget.size || 'xl'"
    :empty="!points.length"
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

const points = computed(() => props.widget.data?.points || [])
const isCurrency = computed(() => !!props.widget.data?.is_currency || !!props.widget.is_currency)

const chartOption = computed(() => {
  const labels = points.value.map(p => p.label)
  const values = points.value.map(p => p.value)
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      valueFormatter: (v) => formatValue(v),
    },
    grid: { top: 20, right: 16, bottom: 28, left: 56 },
    xAxis: { type: 'category', data: labels, boundaryGap: false },
    yAxis: { type: 'value', axisLabel: { formatter: shortFormat } },
    series: [{
      type: 'line',
      smooth: true,
      data: values,
      areaStyle: { opacity: 0.18 },
      lineStyle: { width: 2.5 },
      symbol: 'circle',
      symbolSize: 6,
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
