<template>
  <div class="space-y-5">
    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="card p-5" :aria-busy="true">
      <Skeleton variant="row" :count="6" />
    </div>

    <!-- Maliyet görme yetkisi yoksa rapor HİÇ gelmiyor; "0 TL" göstermek
         yanlış bilgi olurdu (aynı karar B8 maliyet sekmesinde de var).
         Çifte kapı: container yetkisizken isteği zaten atmıyor. -->
    <ErrorState
      v-else-if="!can.viewCost"
      :error="{ code: 'CAPABILITY_REQUIRED', message: t('logistics.cost.noCapability') }"
    />

    <EmptyState v-else-if="!hasData" :entity="t('logistics.reports.cost')" />

    <template v-else>
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
        <table class="w-full min-w-[640px]">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th">{{ t("logistics.reports.carrier") }}</th>
              <th class="tbl-th text-end">{{ t("logistics.reports.shipments") }}</th>
              <!-- Alış ve satış AYRI kolonlar — TUR-121'in ayrım kriteri
                   raporun sütun yapısına yazılı. -->
              <th class="tbl-th text-end">{{ t("logistics.cost.carrierCost") }}</th>
              <th class="tbl-th text-end">{{ t("logistics.cost.customerCharge") }}</th>
              <th class="tbl-th text-end">{{ t("logistics.cost.margin") }}</th>
              <th class="tbl-th text-end">{{ t("logistics.reports.avgCost") }}</th>
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
              <td class="tbl-td text-end tabular-nums">{{ money(row.cost) }}</td>
              <td class="tbl-td text-end tabular-nums">{{ money(row.charge) }}</td>
              <td class="tbl-td text-end tabular-nums" :class="row.marginTone">
                {{ money(row.margin) }}
              </td>
              <td class="tbl-td text-end tabular-nums">{{ row.avgCostLabel }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Zarar eden kırılım ayrıca yazıyor (prototip kararı korunuyor):
           tabloda kırmızı bir hücre kaydırılıp geçilebilir, bu satır
           geçilemez. -->
      <p
        v-if="lossMakers.length"
        class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
        role="alert"
      >
        {{ t("logistics.reports.lossMakers", { dimensions: lossMakers.join(", ") }) }}
      </p>
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
   * **L3 · Maliyet raporu** (TUR-121, 17-FE — L1 kabuğunun paneli).
   *
   * Sözleşme: `get_cost_report` (api/reports.js). Alış ve satış AYRI
   * kolonlar — TUR-121'in ayrım kriteri sütun yapısına yazılı. Marj
   * sunucudan hazır geliyor; arayüzde yeniden hesaplamak yuvarlama farkı
   * üretirdi.
   *
   * Yetki yoksa rapor "0 TL" göstermiyor, yetki hatası veriyor (B8 maliyet
   * sekmesindeki kararla aynı). Container `can.viewCost` yokken isteği hiç
   * atmıyor — bu ekran ikinci kapı.
   */
  const props = defineProps({
    /** `get_cost_report` yanıtı. */
    report: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ viewCost: false }) },
  });

  defineEmits(["retry"]);

  const { t } = useI18n();

  const hasData = computed(() => Boolean(props.report?.by_carrier?.length));

  const decorated = computed(() =>
    (props.report?.by_carrier ?? []).map((row) => ({
      ...row,
      marginTone: Number(row.margin) < 0 ? "font-medium text-red-600 dark:text-red-400" : "",
      avgCostLabel: row.shipments ? money(row.cost / row.shipments) : "—",
    }))
  );

  const lossMakers = computed(() =>
    (props.report?.by_carrier ?? [])
      .filter((row) => Number(row.margin) < 0)
      .map((row) => row.carrier)
  );

  const summaryCards = computed(() => {
    const report = props.report ?? {};
    const margin = Number(report.margin ?? 0);
    return [
      {
        key: "cost",
        label: t("logistics.cost.carrierCost"),
        value: money(report.total_carrier_cost),
        tone: "",
      },
      {
        key: "charge",
        label: t("logistics.cost.customerCharge"),
        value: money(report.total_customer_charge),
        tone: "",
      },
      {
        key: "margin",
        label: t("logistics.cost.margin"),
        value: money(report.margin),
        tone:
          margin < 0
            ? "!text-red-600 dark:!text-red-400"
            : "!text-emerald-700 dark:!text-emerald-400",
      },
      {
        key: "marginRate",
        label: t("logistics.reports.marginRate"),
        // Görüntü oranı — tutar sunucudan, oran tutarlardan (tek kaynak).
        value: report.total_customer_charge ? percent(margin / report.total_customer_charge) : "—",
        tone: "",
      },
    ];
  });

  function percent(value) {
    return `${(Number(value) * 100).toFixed(1)}%`;
  }

  // Sözleşme tek para birimi (TRY) — çoklu para birimi gelirse satırlara
  // `currency` alanı eklenecek (api/reports.js notu).
  function money(value) {
    if (value == null) return "—";
    return Number(value).toLocaleString(undefined, { style: "currency", currency: "TRY" });
  }
</script>
