<template>
  <ErrorState v-if="!store.currentShipment && store.error" :error="store.error" @retry="load" />

  <Skeleton v-else-if="!store.currentShipment" variant="row" :count="4" />

  <ManualStatusUpdateScreen
    v-else
    :shipment="store.currentShipment"
    :allowed-transitions="ALLOWED_TRANSITIONS"
    :saving="store.saving"
    :error="store.error"
    @apply="apply"
    @cancel="goBack"
    @retry="load"
  />
</template>

<script setup>
  import { computed, onMounted, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import ManualStatusUpdateScreen from "@/components/logistics/ManualStatusUpdateScreen.vue";
  import { ALLOWED_TRANSITIONS } from "@/components/logistics/shipmentTransitions";
  import { useLogisticsStore } from "@/stores/logistics";

  /**
   * **C2 container** — manuel durum güncelleme (TUR-107).
   *
   * Sevkiyat YOL PARAMETRESİNDEN geliyor (`route.params.name`): rota
   * `lojistik/sevkiyatlar/:name/durum` ve parametre zorunlu. B2'deki "Durum
   * güncelle" butonu buraya `params: { name }` ile push ediyor.
   *
   * (Bu blok önceden "`?shipment=` sorgusundan geliyor, rota parametresi
   * gerektirirdi" diyordu — kod hiç öyle çalışmıyordu. Yanlış docblock,
   * B2'deki `query: { shipment }` push'unun üç denetim turu boyunca ayakta
   * kalmasına ortam hazırladı; router testi artık bunu yakalıyor.)
   *
   * `ManualStatusUpdateScreen` `shipment` prop'unu ZORUNLU istiyor; bu yüzden
   * yükleme ve hata durumları ekrandan ÖNCE burada karşılanıyor. Ekrana boş
   * bir nesne verip "yükleniyor" göstermek, ekranın kendi hata yolunu
   * (geçersiz sevkiyat) yutardı.
   *
   * `canNotifyBuyer` GEÇİLMİYOR — varsayılan kapalı. Uç bildirim parametresi
   * almıyor; gerekçe ekranın prop tanımında.
   */
  const store = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();

  // Yol parametresinden okunuyor (`:name`), query'den DEĞİL — rota
  // `lojistik/sevkiyatlar/:name/durum` ve parametre zorunlu.
  const shipmentName = computed(() => String(route.params.name || ""));

  function load() {
    if (shipmentName.value) store.fetchShipment(shipmentName.value);
  }

  /**
   * Gerekçe (`reason`) uca `note` olarak gidiyor.
   *
   * Ad farkı bilinçli: ekran TUR-107'nin dilini konuşuyor ("gerekçe"), uç
   * `Shipment Event.note` alanına yazıyor. Backend `note`'u OPSİYONEL kabul
   * ediyor — zorunluluk şu an yalnız arayüzde. Bu bir derinlemesine savunma
   * boşluğu; API'ye doğrudan istek atan biri gerekçesiz geçiş yapabilir.
   */
  async function apply(payload) {
    try {
      await store.changeShipmentStatus(shipmentName.value, payload.status, payload.reason);
      goBack();
    } catch {
      // hata store.error'da; ekran gösteriyor, sayfada kalınıyor
    }
  }

  function goBack() {
    router.push({ name: "LogisticsShipmentDetail", params: { name: shipmentName.value } });
  }

  onMounted(load);
  watch(shipmentName, load);
</script>
