<template>
  <PendingWorkQueueScreen
    :active-bucket="bucket"
    :bucket-counts="buckets"
    :rows="rows"
    :loading="loading"
    :error="error"
    @open="openShipment"
    @refresh="load"
    @retry="load"
    @select-bucket="selectBucket"
  />
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  import PendingWorkQueueScreen from "@/components/logistics/PendingWorkQueueScreen.vue";
  import { listPendingWork } from "@/api/pendingWork";

  /**
   * **A2 container** — bekleyen işler kuyruğu (TUR-117/118).
   *
   * Veri `api/pendingWork.js` üzerinden geliyor (şimdilik MOCK — 16-BE
   * sözleşmesi o dosyada). Kova seçimi URL'de yaşıyor (`?bucket=`):
   * operasyoncu "gecikmişler" linkini mesajla paylaşabilsin, geri/ileri
   * tuşu kova seçimini geri getirsin (B1'deki `?status=` deseni).
   *
   * Satır aksiyonu yok; tıklama sevkiyat detayına götürür — işlem orada.
   */
  const route = useRoute();
  const router = useRouter();

  const DEFAULT_BUCKET = "awaiting_label";

  const bucket = computed(() => String(route.query.bucket || DEFAULT_BUCKET));

  const buckets = ref({});
  const rows = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const data = await listPendingWork({ bucket: bucket.value });
      buckets.value = data?.buckets ?? {};
      rows.value = data?.items ?? [];
    } catch (e) {
      error.value = { code: e?.code ?? "INTERNAL_ERROR", message: e?.message };
      rows.value = [];
    } finally {
      loading.value = false;
    }
  }

  function selectBucket(next) {
    router.replace({ query: { ...route.query, bucket: next === DEFAULT_BUCKET ? undefined : next } });
  }

  function openShipment(row) {
    router.push({ name: "LogisticsShipmentDetail", params: { name: row.name } });
  }

  onMounted(load);
  watch(bucket, load);
</script>
