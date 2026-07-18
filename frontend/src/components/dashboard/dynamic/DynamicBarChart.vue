<template>
  <WidgetWrapper
    :title="widget.title"
    :subtitle="widget.subtitle"
    :size="widget.size || 'md'"
    :empty="!rows.length"
  >
    <BaseChart :option="chartOption" :height="chartHeight" />
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
  const isCurrency = computed(() => !!props.widget.data?.is_currency || !!props.widget.is_currency);

  // Yükseklik satır sayısına göre: 2 bar'lık veri 280px'lik boşlukta yüzmesin.
  // Bar başına 34px + eksen payı; 140-280px aralığına sıkıştırılır.
  const chartHeight = computed(
    () => `${Math.min(280, Math.max(140, rows.value.length * 34 + 56))}px`
  );

  const chartOption = computed(() => {
    const reversed = [...rows.value].reverse();
    const labels = reversed.map((r) => r.label);
    const values = reversed.map((r) => r.value);
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v) => formatValue(v),
      },
      // containLabel: kategori etiketleri grid'e dahil — dar ekranda kesilmez.
      grid: { top: 10, right: 14, bottom: 8, left: 8, containLabel: true },
      xAxis: { type: "value", axisLabel: { formatter: shortFormat } },
      yAxis: {
        type: "category",
        data: labels,
        axisLabel: { width: 80, overflow: "truncate" },
      },
      series: [
        {
          type: "bar",
          data: values,
          barWidth: 14,
          itemStyle: { borderRadius: [0, 4, 4, 0] },
        },
      ],
    };
  });

  function formatValue(v) {
    if (isCurrency.value) {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      }).format(v);
    }
    return new Intl.NumberFormat("tr-TR").format(v);
  }

  function shortFormat(v) {
    if (isCurrency.value) {
      if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
      if (v >= 1000) return (v / 1000).toFixed(0) + "K";
    }
    return String(v);
  }
</script>
