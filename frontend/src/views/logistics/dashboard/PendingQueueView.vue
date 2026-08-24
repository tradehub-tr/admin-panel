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
  import { toScreenError } from "@/api/logisticsEnvelope";
  import { listPendingWork } from "@/api/pendingWork";
  import { useLatestRequest } from "@/composables/useLatestRequest";

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

  // Bayat-yanıt koruması: kova hızlı değişince iki istek yarışıyor ve geç
  // dönen ESKİ kovanın satırları basılabiliyordu. Desen (sıra numarası +
  // "loading'i yalnız son istek kapatır" kuralı + AbortController'ın neden
  // olmadığı) `useLatestRequest`te — üç container'daki elle kopyalar
  // buraya toplandı (SOLID denetimi 2026-08-24).
  const { loading, error, run } = useLatestRequest({ mapError: toScreenError });

  function load() {
    return run(() => listPendingWork({ bucket: bucket.value }), {
      apply: (data) => {
        buckets.value = data?.buckets ?? {};
        rows.value = data?.items ?? [];
      },
      onError: () => {
        rows.value = [];
      },
    });
  }

  function selectBucket(next) {
    router.replace({
      query: { ...route.query, bucket: next === DEFAULT_BUCKET ? undefined : next },
    });
  }

  function openShipment(row) {
    router.push({ name: "LogisticsShipmentDetail", params: { name: row.name } });
  }

  onMounted(load);
  watch(bucket, load);
</script>
