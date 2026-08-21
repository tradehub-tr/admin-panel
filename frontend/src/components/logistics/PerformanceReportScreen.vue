<template>
  <div class="space-y-5">
    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="card p-5" :aria-busy="true">
      <Skeleton variant="row" :count="6" />
    </div>

    <EmptyState v-else-if="!hasData" :entity="t('logistics.reports.performance')" />

    <template v-else>
      <!-- Özet ÜSTTE: kırılımlara bakmadan önce genel resim. Oranlar
           sunucudan toplamlar üzerinden geliyor (sözleşme) — kırılım
           oranlarının ortalaması alınmıyor, yanlış sonuç verirdi. -->
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="card in summaryCards" :key="card.key" class="card !p-4">
          <p class="text-xs text-gray-600 dark:text-gray-400">{{ card.label }}</p>
          <p
            class="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100"
            :class="card.tone"
          >
            {{ card.value }}
          </p>
        </article>
      </div>

      <div class="card p-0 overflow-x-auto">
        <table class="w-full min-w-[560px]">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th">{{ t("logistics.reports.carrier") }}</th>
              <th class="tbl-th text-end">{{ t("logistics.reports.shipments") }}</th>
              <th class="tbl-th text-end">{{ t("logistics.reports.avgDays") }}</th>
              <th class="tbl-th text-end">{{ t("logistics.reports.onTime") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in decorated"
              :key="row.carrier"
              class="border-b border-gray-50 dark:border-white/5"
            >
              <td class="tbl-td text-gray-900 dark:text-gray-100">{{ row.carrier }}</td>
              <td class="tbl-td text-end tabular-nums">{{ row.shipments }}</td>
              <td class="tbl-td text-end tabular-nums">{{ row.avg_days ?? "—" }}</td>
              <td class="tbl-td text-end tabular-nums" :class="row.onTimeTone">
                {{ row.onTimeLabel }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Küçük örneklem uyarısı (prototip kararı korunuyor): 3 sevkiyatlık
           kırılımda %33 istatistiksel gürültü — renk yok, dipnot var. -->
      <p v-if="smallSamples.length" class="text-xs text-gray-600 dark:text-gray-400">
        {{ t("logistics.reports.smallSample", { dimensions: smallSamples.join(", "), min: MIN_SAMPLE }) }}
      </p>

      <div v-if="report.trend?.length" class="card p-0 overflow-x-auto">
        <p class="px-4 pt-3 text-xs font-medium text-gray-600 dark:text-gray-400">
          {{ t("logistics.reports.trend") }}
        </p>
        <table class="w-full min-w-[420px]">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th">{{ t("logistics.reports.date") }}</th>
              <th class="tbl-th text-end">{{ t("logistics.reports.delivered") }}</th>
              <th class="tbl-th text-end">{{ t("logistics.reports.avgDays") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="day in report.trend"
              :key="day.date"
              class="border-b border-gray-50 dark:border-white/5"
            >
              <td class="tbl-td tabular-nums text-gray-900 dark:text-gray-100">{{ day.date }}</td>
              <td class="tbl-td text-end tabular-nums">{{ day.delivered }}</td>
              <td class="tbl-td text-end tabular-nums">{{ day.avg_days }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";

  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";

  /**
   * **L2 · Performans raporu** (TUR-121, 17-FE — L1 kabuğunun paneli).
   *
   * Sözleşme: `get_performance_report` (api/reports.js). Prototipten korunan
   * iki karar:
   *
   *   1. **Özet oranlar sunucu toplamından**, kırılım oranlarının ortalaması
   *      değil — ağırlıksız ortalama yanlış sonuç verir.
   *   2. **Küçük örneklem işaretleniyor.** 3 sevkiyatlık bir kırılımda %33
   *      başarısızlık istatistiksel gürültü; kırmızı göstermek yanlış karar
   *      aldırır.
   */
  const props = defineProps({
    /** `get_performance_report` yanıtı. */
    report: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
  });

  defineEmits(["retry"]);

  const { t } = useI18n();

  /** Bu sayının altındaki kırılımlarda oranlar güvenilir değil. */
  const MIN_SAMPLE = 20;

  /** Bu eşiğin altı operasyonda müdahale gerektiriyor. */
  const ON_TIME_WARN = 0.85;

  const hasData = computed(() => Boolean(props.report?.by_carrier?.length));

  function percent(value) {
    if (value == null) return "—";
    return `${(Number(value) * 100).toFixed(1)}%`;
  }

  const decorated = computed(() =>
    (props.report?.by_carrier ?? []).map((row) => {
      const reliable = Number(row.shipments) >= MIN_SAMPLE;
      return {
        ...row,
        onTimeLabel: percent(row.on_time_rate),
        // Küçük örneklemde renk YOK: gürültüyü uyarıya çevirmemek için.
        onTimeTone:
          reliable && row.on_time_rate < ON_TIME_WARN
            ? "font-medium text-amber-700 dark:text-amber-400"
            : "",
      };
    })
  );

  const smallSamples = computed(() =>
    (props.report?.by_carrier ?? [])
      .filter((row) => Number(row.shipments) < MIN_SAMPLE)
      .map((row) => row.carrier)
  );

  const summaryCards = computed(() => {
    const report = props.report ?? {};
    const shipments = (report.by_carrier ?? []).reduce(
      (acc, row) => acc + Number(row.shipments ?? 0),
      0
    );
    return [
      { key: "shipments", label: t("logistics.reports.shipments"), value: shipments, tone: "" },
      {
        key: "avgDays",
        label: t("logistics.reports.avgDeliveryDays"),
        value: report.avg_delivery_days ?? "—",
        tone: "",
      },
      {
        key: "onTime",
        label: t("logistics.reports.onTime"),
        value: percent(report.on_time_rate),
        tone:
          report.on_time_rate != null && report.on_time_rate < ON_TIME_WARN
            ? "!text-amber-700 dark:!text-amber-400"
            : "",
      },
      {
        key: "sla",
        label: t("logistics.reports.slaBreaches"),
        value: report.sla_breaches ?? "—",
        tone: report.sla_breaches ? "!text-red-600 dark:!text-red-400" : "",
      },
    ];
  });
</script>
