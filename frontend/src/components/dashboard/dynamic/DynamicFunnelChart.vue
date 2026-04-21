<template>
  <WidgetWrapper
    :title="widget.title"
    :subtitle="widget.subtitle"
    :size="widget.size || 'lg'"
    :empty="!stages.length"
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

  const stages = computed(() => props.widget.data?.stages || []);

  const chartOption = computed(() => ({
    tooltip: { trigger: "item", formatter: "{b}: {c}" },
    color: ["#6366F1", "#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE"],
    series: [
      {
        type: "funnel",
        left: "5%",
        right: "5%",
        top: 10,
        bottom: 10,
        minSize: "30%",
        maxSize: "100%",
        sort: "none",
        gap: 2,
        label: { show: true, position: "inside", color: "#fff", fontWeight: 600, fontSize: 12 },
        data: stages.value.map((s) => ({ name: s.label, value: s.count })),
      },
    ],
  }));
</script>
