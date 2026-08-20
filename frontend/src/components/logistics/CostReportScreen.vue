<template>
  <div class="space-y-4">
    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 4" :key="i" variant="rect" height="52px" />
    </div>

    <!-- Maliyet görme yetkisi yoksa rapor HİÇ gelmiyor; "0 TL" göstermek
         yanlış bilgi olurdu (aynı karar B8 maliyet sekmesinde de var). -->
    <ErrorState
      v-else-if="!can.viewCost"
      :error="{ code: 'CAPABILITY_REQUIRED', message: t('logistics.cost.noCapability') }"
    />

    <p v-else-if="!rows.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.reports.noData") }}
    </p>

    <template v-else>
      <div class="grid gap-3 sm:grid-cols-4">
        <article v-for="card in totals" :key="card.key" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-1 text-xl font-semibold tabular-nums" :class="card.tone">{{ card.value }}</p>
        </article>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700">
              <th class="px-3 py-2 text-start font-medium">{{ dimensionLabel }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.reports.shipments") }}</th>
              <!-- Alış ve satış AYRI kolonlar — TUR-121'in ayrım kriteri
                   raporun sütun yapısına yazılmış durumda. -->
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.cost.carrierCost") }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.cost.customerCharge") }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.cost.margin") }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.reports.marginRate") }}</th>
              <th class="px-3 py-2 text-end font-medium">{{ t("logistics.reports.avgCost") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in decorated" :key="row.dimension" class="border-b border-slate-100 dark:border-slate-800">
              <td class="px-3 py-2">{{ row.dimension_label }}</td>
              <td class="px-3 py-2 text-end tabular-nums">{{ row.shipment_count }}</td>
              <td class="px-3 py-2 text-end tabular-nums">{{ money(row.carrier_cost_total, row.currency) }}</td>
              <td class="px-3 py-2 text-end tabular-nums">{{ money(row.customer_charge_total, row.currency) }}</td>
              <td class="px-3 py-2 text-end tabular-nums" :class="row.marginTone">
                {{ money(row.margin_total, row.currency) }}
              </td>
              <td class="px-3 py-2 text-end tabular-nums" :class="row.marginTone">{{ row.marginRateLabel }}</td>
              <td class="px-3 py-2 text-end tabular-nums">{{ money(row.avg_cost_per_shipment, row.currency) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Zarar eden kırılım ayrıca yazıyor: tabloda kırmızı bir hücre
           kaydırılıp geçilebilir, bu satır geçilemez. -->
      <p
        v-if="lossMakers.length"
        class="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
        role="alert"
      >
        {{ t("logistics.reports.lossMakers", { dimensions: lossMakers.join(", ") }) }}
      </p>

      <!-- Karışık para birimi toplamayı anlamsız kılar; toplam satırı
           gizlenip sebebi yazılıyor. -->
      <p v-if="mixedCurrency" class="text-xs text-amber-700 dark:text-amber-400">
        {{ t("logistics.reports.mixedCurrency") }}
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
   * **L3 · Maliyet raporu** (TUR-118, TUR-121).
   *
   * Alış ve satış AYRI kolonlar — TUR-121'in ayrım kriteri raporun sütun
   * yapısına yazılmış durumda. Marj backend'den hazır geliyor; arayüzde
   * yeniden hesaplamak yuvarlama farkı üretirdi.
   *
   * Yetki yoksa rapor "0 TL" göstermiyor, yetki hatası veriyor (B8 maliyet
   * sekmesindeki kararla aynı).
   */
  const props = defineProps({
    /** `cost_report` sözleşmesindeki satırlar. */
    rows: { type: Array, default: () => [] },
    dimension: { type: String, default: "carrier" },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ viewCost: false }) },
  });

  defineEmits(["retry"]);

  const { t, te } = useI18n();

  const dimensionLabel = computed(() => {
    const key = `logistics.dimension.${props.dimension}`;
    return te(key) ? t(key) : props.dimension;
  });

  const currencies = computed(() => new Set(props.rows.map((row) => row.currency)));
  const mixedCurrency = computed(() => currencies.value.size > 1);

  const decorated = computed(() =>
    props.rows.map((row) => ({
      ...row,
      marginTone:
        Number(row.margin_total) < 0 ? "font-medium text-red-600 dark:text-red-400" : "",
      marginRateLabel: row.margin_rate == null ? "—" : `${(Number(row.margin_rate) * 100).toFixed(1)}%`,
    }))
  );

  const lossMakers = computed(() =>
    props.rows.filter((row) => Number(row.margin_total) < 0).map((row) => row.dimension_label)
  );

  const totals = computed(() => {
    if (mixedCurrency.value) return [];
    const sum = (field) => props.rows.reduce((acc, row) => acc + Number(row[field] ?? 0), 0);
    const currency = [...currencies.value][0];
    const cost = sum("carrier_cost_total");
    const charge = sum("customer_charge_total");
    const margin = sum("margin_total");
    const shipments = sum("shipment_count");
    return [
      { key: "cost", label: t("logistics.cost.carrierCost"), value: money(cost, currency), tone: "" },
      { key: "charge", label: t("logistics.cost.customerCharge"), value: money(charge, currency), tone: "" },
      {
        key: "margin",
        label: t("logistics.cost.margin"),
        value: money(margin, currency),
        tone: margin < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400",
      },
      {
        key: "avg",
        label: t("logistics.reports.avgCost"),
        value: shipments ? money(cost / shipments, currency) : "—",
        tone: "",
      },
    ];
  });

  function money(value, currency = "TRY") {
    if (value == null) return "—";
    return Number(value).toLocaleString(undefined, { style: "currency", currency: currency || "TRY" });
  }
</script>
