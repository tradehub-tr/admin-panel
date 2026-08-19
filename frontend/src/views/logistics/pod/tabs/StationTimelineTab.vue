<template>
  <!-- H4 · İstasyonlar. Takip sekmesiyle (B6, Bora) AYNI veriden FARKLI soru:
       takip "ne oldu" der, bu sekme "nerede ne kadar kalındı" der. -->
  <div>
    <ErrorState v-if="eventsState.error" :error="eventsState.error" @retry="load" />

    <div v-else-if="eventsState.loading" :aria-busy="true">
      <Skeleton variant="row" :count="3" />
    </div>

    <template v-else>
      <StationTimelineList :stations="store.stations" :location-unavailable="store.locationUnavailable" />

      <!-- ULAŞILMAZ EKRAN YASAĞI: H1 tam ekran çizelgesinin TEK giriş yolu bu
           bağlantı. Sekme dar alanda özet veriyor; uzun çizelge tam ekranda
           rahat okunuyor. Bağlantı yazılmazsa ekran çalışır ama kimse
           ulaşamaz (13-FE'de palet ekranı tam bu duruma düşmüştü). -->
      <RouterLink
        v-if="shipmentName && store.stations.length"
        :to="{ name: STATION_ROUTE, params: { name: shipmentName } }"
        class="mt-3 inline-block text-[12px] text-brand-600 dark:text-brand-400 hover:underline"
      >
        {{ t("logistics.station.openFull") }}
      </RouterLink>
    </template>
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

  import StationTimelineList from "../components/StationTimelineList.vue";

  const props = defineProps({ shipment: { type: Object, required: true } });

  const { t } = useI18n();
  /** Route adı SABİT: şablonda tek tırnakla gömülü kalırsa "ulaşılmaz ekran"
   *  denetimi bağlantıyı göremiyor (çift tırnaklı ad arıyor). */
  const STATION_ROUTE = "LogisticsStationTimeline";

  const store = usePodStore();
  const { eventsState } = storeToRefs(store);

  const shipmentName = computed(() => props.shipment?.name ?? props.shipment?.shipment ?? "");

  function load() {
    if (shipmentName.value) store.fetchEvents(shipmentName.value);
  }

  watch(shipmentName, load);
  onMounted(load);
</script>
