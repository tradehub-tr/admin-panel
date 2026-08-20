<template>
  <!-- H3 · Sevkiyat detayı içinden teslim kanıtı özeti. -->
  <div>
    <ErrorState v-if="detail.error" :error="detail.error" @retry="load" />

    <div v-else-if="detail.loading" :aria-busy="true">
      <Skeleton variant="row" :count="3" />
    </div>

    <!-- BESLENMEYEN SEKME: boş liste çizmek operasyona "kayıt yok" der ve
         yalan olur. Sekme çıkış yolunu gösteriyor, sayaç basmıyor. -->
    <div v-else-if="!store.hasPod" class="text-center py-8">
      <p class="text-[13px] text-gray-700 dark:text-gray-300">{{ t("logistics.pod.detail.noneTitle") }}</p>
      <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.detail.noneHint") }}</p>
      <RouterLink
        :to="{ name: POD_ROUTE, params: { name: shipmentName } }"
        class="hdr-btn-primary mt-4 inline-flex"
      >
        {{ t("logistics.pod.record.title") }}
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <PodEvidenceCard :pod="detail.pod" :media-visible="detail.mediaVisible" :exception-codes="store.exceptionCodes" />
      <RouterLink
        :to="{ name: POD_ROUTE, params: { name: shipmentName } }"
        class="text-[12px] text-brand-800 dark:text-brand-400 hover:underline"
      >
        {{ t("logistics.pod.queue.openDetail") }}
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
  import { computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { RouterLink } from "vue-router";
  import { storeToRefs } from "pinia";

  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import { usePodStore } from "@/stores/pod";

  import PodEvidenceCard from "../components/PodEvidenceCard.vue";

  const props = defineProps({ shipment: { type: Object, required: true } });

  const { t } = useI18n();
  /** Route adı SABİT — "ulaşılmaz ekran" denetimi çift tırnaklı ad arıyor. */
  const POD_ROUTE = "LogisticsProofOfDelivery";

  const store = usePodStore();
  const { detail } = storeToRefs(store);

  const shipmentName = computed(() => props.shipment?.name ?? props.shipment?.shipment ?? "");

  async function load() {
    if (!shipmentName.value) return;
    await store.ensurePermissions().catch(() => {});
    await store.fetchPod(shipmentName.value);
    await store.loadExceptionCodes();
  }

  watch(shipmentName, load);
  onMounted(load);
</script>
