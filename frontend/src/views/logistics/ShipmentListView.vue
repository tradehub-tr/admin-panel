<template>
  <ShipmentListScreen
    :rows="store.shipmentRows"
    :total="store.shipmentTotal"
    :status-counts="statusCounts"
    :loading="store.loading"
    :error="store.error"
    :can="can"
    @open="openDetail"
    @create-manual="openManual"
    @retry="load"
    @filter-status="onFilterStatus"
  />
</template>

<script setup>
  import { computed, onMounted, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  import ShipmentListScreen from "@/components/logistics/ShipmentListScreen.vue";
  import { isScreenReady } from "@/router/logisticsScreens";
  import { useLogisticsStore } from "@/stores/logistics";

  /**
   * **B1 container** — sevkiyat listesini `api.v1.shipment.list_shipments`'e
   * bağlar.
   *
   * DURUM FİLTRESİ URL'DE (`?status=In+Transit`). TUR-117 kabul kriteri
   * "filtreler paylaşılabilir" diyor; sunum katmanı filtreyi bilerek event
   * olarak yukarı veriyor, saklamıyor. Operasyonda "şu gecikenlere bak"
   * linki gönderiliyor — filtre bileşen state'inde kalsaydı link herkeste
   * filtresiz liste açardı.
   *
   * SAYFALAMA da URL'de: 3. sayfadaki bir sevkiyata girip geri dönünce
   * 1. sayfaya düşmek, 50'şerlik listede iş kaybettiriyor.
   */
  const store = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();

  /**
   * Duruma göre sayaçlar YOK.
   *
   * `list_shipments` toplam sayı döndürüyor, durum kırılımı döndürmüyor.
   * Yüklü sayfadan hesaplamak yanlış olurdu — 50 satırlık sayfadan çıkan
   * "Yolda: 12" tüm listeyi değil o sayfayı anlatır. Boş bırakılıyor;
   * `StatusFilterPills` sayısı olmayan rozeti hiç çizmiyor, yani sıfır
   * yazmıyor. Kırılım ucu geldiğinde burası dolar.
   */
  const statusCounts = {};

  /**
   * "Manuel sevkiyat" butonu yetkiye VE hedef ekranın açık olmasına bağlı.
   *
   * `store.can` yalnız yetkiyi biliyor; C1 rotası kayıtlı değilken buton
   * çizmek ölü buton üretirdi. `can` zaten güvenlik sınırı değil, arayüz
   * kolaylığı (bkz. stores/logistics.js) — routing gerçeği de buraya ait.
   */
  const can = computed(() => ({
    ...store.can,
    create: store.can.create && isScreenReady("C1"),
  }));

  function currentParams() {
    return {
      status: route.query.status || null,
      order: route.query.order || null,
      page: Number(route.query.page) || 1,
      pageSize: 50,
    };
  }

  function load() {
    store.fetchShipments(currentParams());
  }

  function onFilterStatus(status) {
    // Durum değişince 1. sayfaya dön — 3. sayfadayken filtre daraltılırsa
    // sonuç boş görünürdü ve "kayıt yok" sanılırdı.
    const query = { ...route.query, page: undefined };
    if (status) query.status = status;
    else delete query.status;
    router.replace({ query });
  }

  function openDetail(row) {
    router.push({ name: "LogisticsShipmentDetail", params: { name: row.name } });
  }

  function openManual() {
    router.push({ name: "LogisticsManualShipment" });
  }

  onMounted(async () => {
    await store.fetchPermissions();
    load();
  });

  // Geri/ileri ve paylaşılan link de veriyi tazelesin.
  watch(() => [route.query.status, route.query.order, route.query.page], load);
</script>
