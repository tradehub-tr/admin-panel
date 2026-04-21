<template>
  <WidgetWrapper
    :title="widget.title"
    :subtitle="widget.subtitle"
    :size="widget.size || 'md'"
    :empty="!rows.length"
  >
    <BaseChart :option="chartOption" height="260px" />
  </WidgetWrapper>
</template>

<script setup>
  import { computed } from "vue";
  import WidgetWrapper from "@/components/dashboard/layout/WidgetWrapper.vue";
  import BaseChart from "@/components/dashboard/charts/BaseChart.vue";

  const props = defineProps({
    widget: { type: Object, required: true },
    period: { type: String, default: "30d" },
  });

  const rows = computed(() => props.widget.data?.rows || []);

  const chartOption = computed(() => ({
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    series: [
      {
        type: "pie",
        radius: ["50%", "72%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: rows.value.map((r) => ({ name: r.label || r.value, value: r.value })),
      },
    ],
  }));
</script>
