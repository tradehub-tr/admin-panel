<template>
  <!-- `:key="locale"` — sütun etiketleri `useDataTable`'a bir anlık görüntü
       olarak geçiyor (bkz. ShipmentListScreen'deki buildFields gerekçesi).
       Dil değişince ekran yeniden kuruluyor; durum ve sayfa URL'de olduğu
       için kullanıcı yerini kaybetmiyor. -->
  <ShipmentListScreen
    :key="locale"
    :rows="store.shipmentRows"
    :total="store.shipmentTotal"
    :status-counts="statusCounts"
    :loading="store.loading"
    :error="store.error"
    :can="can"
    :status="statusFilter"
    :page="page"
    :page-size="PAGE_SIZE"
    @open="openDetail"
    @create-manual="openManual"
    @retry="load"
    @filter-status="onFilterStatus"
    @update:page="onPageChange"
  />
</template>

<script setup>
  import { computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
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
   * 1. sayfaya düşmek, 50'şerlik listede iş kaybettiriyor. Tablonun kendi
   * sayfa state'i (`dt.page`) `?page` ile ÇİFT YÖNLÜ bağlı: aşağı `page`
   * prop'u iniyor, yukarı `update:page` çıkıyor. Önceden yalnız aşağı yön
   * vardı — kullanıcı sayfa değiştirince URL sabit kalıyor, watcher
   * tetiklenmiyor ve tablo hep ilk 50 kaydı gösteriyordu.
   */
  const store = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();
  const { locale } = useI18n();

  /** Uca giden sayfa boyutu — tablo da aynı değeri kullanmalı, tek kaynak. */
  const PAGE_SIZE = 50;

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

  /**
   * Durum hapının seçili değeri de sayfa gibi ÇİFT YÖNLÜ: aşağı `status`
   * prop'u iniyor, yukarı `filter-status` çıkıyor. Tek kaynak `?status=`;
   * hap kendi state'ini tutsaydı paylaşılan link veriyi filtreli getirir
   * ama "Tümü" vurgulu kalırdı, geri/ileri de hapı güncellemezdi.
   */
  const statusFilter = computed(() => String(route.query.status || ""));

  const page = computed(() => Math.max(1, Number(route.query.page) || 1));

  function currentParams() {
    return {
      status: statusFilter.value || null,
      order: route.query.order || null,
      page: page.value,
      pageSize: PAGE_SIZE,
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

  function onPageChange(next) {
    if (next === page.value) return;
    // 1. sayfa URL'de yazılmıyor: paylaşılan link gereksiz parametre taşımasın.
    router.replace({ query: { ...route.query, page: next > 1 ? String(next) : undefined } });
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

  // Geri/ileri, paylaşılan link ve tablodan gelen sayfa değişimi (URL'e
  // yazıldıktan sonra) buradan tazeleniyor.
  watch(() => [route.query.status, route.query.order, route.query.page], load);
</script>
