<template>
  <div class="space-y-4">
    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 4" :key="i" variant="rect" height="52px" />
    </div>

    <p v-else-if="!rows.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.reports.noData") }}
    </p>

    <template v-else>
      <!-- Toplam satırı ÜSTTE: kırılımlara bakmadan önce genel resim.
           Oranlar kırılımların ortalaması DEĞİL, toplamlardan yeniden
           hesaplanıyor — oranların ortalaması yanlış sonuç verir. -->
      <div class="grid gap-3 sm:grid-cols-4">
        <article v-for="card in totals" :key="card.key" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-1 text-xl font-semibold tabular-nums" :class="card.tone">{{ card.value }}</p>
        </article>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-start dark:border-slate-700">
              <th class="px-3 py-2 text-start font-medium">{{ dimensionLabel }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.reports.shipments") }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.reports.onTime") }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.reports.avgDays") }}</th>
              <!-- p90 bilinçli olarak ortalamanın yanında: ortalama iyi
                   görünürken kuyruk kötü olabilir ve müşteri şikâyeti
                   kuyruktan gelir. -->
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.reports.p90Days") }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.reports.failureRate") }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.reports.returnRate") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in decorated"
              :key="row.dimension"
              class="border-b border-slate-100 dark:border-slate-800"
            >
              <td class="px-3 py-2">{{ row.dimension_label }}</td>
              <td class="px-3 py-2 text-end tabular-nums">{{ row.shipment_count }}</td>
              <td class="px-3 py-2 text-end tabular-nums" :class="row.onTimeTone">{{ row.onTimeLabel }}</td>
              <td class="px-3 py-2 text-end tabular-nums">{{ row.avg_delivery_days ?? "—" }}</td>
              <td class="px-3 py-2 text-end tabular-nums" :class="row.tailTone">
                {{ row.p90_delivery_days ?? "—" }}
              </td>
              <td class="px-3 py-2 text-end tabular-nums" :class="row.failureTone">{{ row.failureLabel }}</td>
              <td class="px-3 py-2 text-end tabular-nums">{{ row.returnLabel }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Küçük örneklem uyarısı: 3 sevkiyatlık bir kırılımda %33 başarısızlık
           oranı istatistiksel gürültü. Kırmızı göstermek yanlış karar
           aldırır. -->
      <p v-if="smallSamples.length" class="text-xs text-slate-500">
        {{ t("logistics.reports.smallSample", { dimensions: smallSamples.join(", "), min: MIN_SAMPLE }) }}
      </p>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";

  import ErrorState from "./ErrorState.vue";

  /**
   * **L2 · Performans raporu** (TUR-118).
   *
   * Üç tasarım kararı:
   *
   *   1. **p90 ortalamanın yanında.** Ortalama teslim süresi iyi görünürken
   *      kuyruk kötü olabilir; müşteri şikâyeti kuyruktan gelir.
   *   2. **Toplam oranlar yeniden hesaplanıyor**, kırılım oranlarının
   *      ortalaması alınmıyor — ağırlıksız ortalama yanlış sonuç verir.
   *   3. **Küçük örneklem işaretleniyor.** 3 sevkiyatlık bir kırılımda
   *      %33 başarısızlık istatistiksel gürültü; kırmızı göstermek yanlış
   *      karar aldırır.
   */
  const props = defineProps({
    /** `performance_report` sözleşmesindeki satırlar. */
    rows: { type: Array, default: () => [] },
    /** Hangi kırılım gösteriliyor: carrier | shipping_method | seller | status */
    dimension: { type: String, default: "carrier" },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
  });

  defineEmits(["retry"]);

  const { t, te } = useI18n();

  /** Bu sayının altındaki kırılımlarda oranlar güvenilir değil. */
  const MIN_SAMPLE = 20;

  /** Bu eşiklerin ötesi operasyonda müdahale gerektiriyor. */
  const ON_TIME_WARN = 0.85;
  const FAILURE_WARN = 0.05;

  const dimensionLabel = computed(() => {
    const key = `logistics.dimension.${props.dimension}`;
    return te(key) ? t(key) : props.dimension;
  });

  const decorated = computed(() =>
    props.rows.map((row) => {
      const reliable = Number(row.shipment_count) >= MIN_SAMPLE;
      return {
        ...row,
        onTimeLabel: percent(row.on_time_rate),
        // Küçük örneklemde renk YOK: gürültüyü uyarıya çevirmemek için
        onTimeTone:
          reliable && row.on_time_rate < ON_TIME_WARN ? "text-amber-700 dark:text-amber-400" : "",
        failureLabel: percent(row.failure_rate),
        failureTone:
          reliable && row.failure_rate > FAILURE_WARN ? "font-medium text-red-600 dark:text-red-400" : "",
        returnLabel: percent(row.return_rate),
        // Kuyruk ortalamanın iki katından uzunsa dikkat çekiyor
        tailTone:
          row.p90_delivery_days && row.avg_delivery_days &&
          row.p90_delivery_days > row.avg_delivery_days * 2
            ? "font-medium text-amber-700 dark:text-amber-400"
            : "",
      };
    })
  );

  const smallSamples = computed(() =>
    props.rows.filter((row) => Number(row.shipment_count) < MIN_SAMPLE).map((row) => row.dimension_label)
  );

  /** Toplamlar ham sayılardan; oranlar toplamlardan YENİDEN hesaplanıyor. */
  const totals = computed(() => {
    const sum = (field) => props.rows.reduce((acc, row) => acc + Number(row[field] ?? 0), 0);
    const shipments = sum("shipment_count");
    const delivered = sum("delivered_count");
    const delayed = sum("delayed_count");
    const failed = sum("failed_count");
    return [
      { key: "shipments", label: t("logistics.reports.shipments"), value: shipments, tone: "" },
      {
        key: "onTime",
        label: t("logistics.reports.onTime"),
        value: shipments ? percent((delivered - delayed) / shipments) : "—",
        tone: "",
      },
      {
        key: "failure",
        label: t("logistics.reports.failureRate"),
        value: shipments ? percent(failed / shipments) : "—",
        tone: shipments && failed / shipments > FAILURE_WARN ? "text-red-600 dark:text-red-400" : "",
      },
      {
        key: "returns",
        label: t("logistics.reports.returnRate"),
        value: shipments ? percent(sum("returned_count") / shipments) : "—",
        tone: "",
      },
    ];
  });

  function percent(value) {
    if (value == null) return "—";
    return `${(Number(value) * 100).toFixed(1)}%`;
  }
</script>
