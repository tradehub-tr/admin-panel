<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ t("logistics.station.title") }}
        </h1>
        <p class="text-xs text-gray-400 dark:text-gray-500 font-mono">{{ shipment }}</p>
      </div>
      <RouterLink :to="{ name: 'LogisticsShipmentDetail', params: { name: shipment } }" class="hdr-btn-outlined">
        {{ t("logistics.pod.detail.openShipment") }}
      </RouterLink>
    </div>

    <ErrorState v-if="eventsState.error" :error="eventsState.error" @retry="load" />

    <div v-else-if="eventsState.loading" class="card p-5" :aria-busy="true">
      <Skeleton variant="row" :count="4" />
    </div>

    <StationTimelineList
      v-else
      :stations="store.stations"
      :location-unavailable="store.locationUnavailable"
      @open-branch="openBranch"
    />

    <DeliveryPointCard v-if="branch" :branch="branch" class="mt-4" />
  </div>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { RouterLink, useRoute } from "vue-router";
  import { storeToRefs } from "pinia";

  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import { usePodStore } from "@/stores/pod";

  import DeliveryPointCard from "../delivery-locations/components/DeliveryPointCard.vue";
  import StationTimelineList from "./components/StationTimelineList.vue";

  const { t } = useI18n();
  const route = useRoute();
  const store = usePodStore();
  const { eventsState } = storeToRefs(store);

  const shipment = computed(() => String(route.params.name ?? ""));
  const branch = ref(null);

  const load = () => {
    store.ensurePermissions().catch(() => {});
    return store.fetchEvents(shipment.value);
  };

  async function openBranch(name) {
    branch.value = await store.loadBranch(name);
  }

  watch(shipment, load);
  onMounted(load);
</script>
