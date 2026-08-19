<template>
  <LogisticsDashboardScreen
    :metrics="metrics"
    :status-counts="statusCounts"
    :loading="loading"
    :error="error"
    @retry="load"
    @drill="drill"
  />
</template>

<script setup>
  import { onMounted, ref } from "vue";
  import { useRouter } from "vue-router";

  import LogisticsDashboardScreen from "@/components/logistics/LogisticsDashboardScreen.vue";
  import { getDashboardMetrics } from "@/api/dashboardMetrics";

  /**
   * **A1 container** — lojistik panosu (TUR-117/118).
   *
   * Veri `api/dashboardMetrics.js` üzerinden (şimdilik MOCK — 16-BE
   * sözleşmesi orada; KPI'lar ve dağılım TEK yanıttan gelir).
   *
   * KPI kapıları: sayının kaynağı hangi ekransa oraya iner — gecikmiş
   * A2'nin "delayed" kovası, başarısız A3'ün kritikleri, aktif B1 listesi.
   * Rota adları BURADA: sunum katmanı route bilmez (drill emit'i).
   */
  const router = useRouter();

  const metrics = ref({});
  const statusCounts = ref({});
  const loading = ref(false);
  const error = ref(null);

  const DRILL_ROUTES = {
    active: { name: "LogisticsShipmentList" },
    delayed: { name: "LogisticsPendingQueue", query: { bucket: "delayed" } },
    failed: { name: "LogisticsExceptionQueue", query: { severity: "Critical" } },
  };

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const data = await getDashboardMetrics();
      metrics.value = data.metrics;
      statusCounts.value = data.statusCounts;
    } catch (e) {
      error.value = { code: e?.code ?? "INTERNAL_ERROR", message: e?.message };
    } finally {
      loading.value = false;
    }
  }

  function drill(key) {
    const target = DRILL_ROUTES[key];
    if (target) router.push(target);
  }

  onMounted(load);
</script>
