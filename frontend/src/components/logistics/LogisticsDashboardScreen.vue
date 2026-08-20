<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
        {{ t("logistics.dashboard.title") }}
      </h1>
      <p class="text-xs text-gray-400 dark:text-gray-500">
        {{ t("logistics.dashboard.subtitle") }}
      </p>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton v-for="i in 4" :key="i" variant="rect" height="96px" />
    </div>

    <template v-else>
      <!-- KPI kartları KAPI: sayıya tıklayan, o sayının listesine iner
           (gecikmiş → A2 gecikmiş kovası, başarısız → A3 kritikler,
           aktif → B1 listesi). Panoda cevap yoksa bile yol var. Ortalama
           teslimin inecek listesi yok — o kart düz metin (article). -->
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <component
          :is="kpi.drill ? 'button' : 'article'"
          v-for="kpi in kpis"
          :key="kpi.key"
          :type="kpi.drill ? 'button' : undefined"
          class="card p-4 text-start"
          :class="kpi.drill ? 'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800' : ''"
          @click="kpi.drill && $emit('drill', kpi.key)"
        >
          <p class="text-xs text-gray-400 dark:text-gray-500">{{ kpi.label }}</p>
          <p class="mt-1 text-2xl font-semibold tabular-nums" :class="kpi.tone">{{ kpi.value }}</p>
          <p v-if="kpi.hint" class="mt-1 text-xs text-gray-400">{{ kpi.hint }}</p>
        </component>
      </div>

      <!-- Durum dağılımı: grafik kütüphanesi yerine basit çubuk. ECharts'ı
           dashboard'a sokmak bundle'ı büyütür ve bu veri için gereksiz. -->
      <section class="card p-4">
        <h2 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {{ t("logistics.dashboard.statusBreakdown") }}
        </h2>
        <div v-if="totalShipments" class="space-y-2">
          <div v-for="row in statusRows" :key="row.status" class="flex items-center gap-3">
            <StatusBadge :status="row.status" :show-dot="false" />
            <div class="h-2 grow overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div class="h-full rounded-full bg-indigo-500" :style="{ width: `${row.percent}%` }" />
            </div>
            <span class="w-12 text-end text-xs tabular-nums text-gray-400">{{ row.count }}</span>
          </div>
        </div>
        <p v-else class="py-4 text-center text-sm text-gray-400">
          {{ t("logistics.dashboard.noData") }}
        </p>
      </section>
    </template>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **A1 · Lojistik dashboard** (TUR-117, TUR-118).
   *
   * Gerçek KPI'lar; Faz A'da bulunan sahte veri dolu `LogisticsDashboard.vue`
   * ("1,247", "14", "8" sabitleri) bunun yerini alıyor.
   *
   * 2026-08-19: panel diline çevrildi; KPI kartları ilgili kuyruklara
   * tıklanabilir kapı oldu (`drill` emit'i — hedef rotayı container bilir,
   * sunum katmanı route adı taşımaz).
   */
  const props = defineProps({
    /** { active, delayed, failed, avgDeliveryDays } */
    metrics: { type: Object, default: () => ({}) },
    /** { "In Transit": 41, ... } */
    statusCounts: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
  });
  defineEmits(["retry", "drill"]);

  const { t } = useI18n();

  const kpis = computed(() => [
    {
      key: "active",
      label: t("logistics.dashboard.activeShipments"),
      value: props.metrics.active ?? "—",
      tone: "",
      drill: true,
    },
    {
      key: "delayed",
      label: t("logistics.dashboard.delayed"),
      value: props.metrics.delayed ?? "—",
      tone: (props.metrics.delayed ?? 0) > 0 ? "text-amber-600 dark:text-amber-400" : "",
      drill: true,
    },
    {
      key: "failed",
      label: t("logistics.dashboard.failed"),
      value: props.metrics.failed ?? "—",
      tone: (props.metrics.failed ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "",
      drill: true,
    },
    {
      key: "avg",
      label: t("logistics.dashboard.avgDelivery"),
      value:
        props.metrics.avgDeliveryDays != null
          ? `${props.metrics.avgDeliveryDays} ${t("logistics.dashboard.days")}`
          : "—",
      tone: "",
      drill: false,
    },
  ]);

  const totalShipments = computed(() =>
    Object.values(props.statusCounts).reduce((sum, n) => sum + Number(n || 0), 0)
  );

  const statusRows = computed(() =>
    Object.entries(props.statusCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        status,
        count,
        percent: totalShipments.value ? (count / totalShipments.value) * 100 : 0,
      }))
  );
</script>
