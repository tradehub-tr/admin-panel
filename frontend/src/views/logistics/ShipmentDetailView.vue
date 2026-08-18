<template>
  <div>
    <ShipmentDetailScreen
      :shipment="store.currentShipment"
      :documents="documents"
      :unavailable-tabs="UNAVAILABLE_TABS"
      :loading="store.loading"
      :error="store.error"
      :can="can"
      @retry="load"
      @update-status="openStatusUpdate"
    @open-packing="openPacking"
      @cancel-shipment="confirmOpen = true"
    />

    <ConfirmDialog
      v-model:open="confirmOpen"
      tone="danger"
      :title="t('logistics.shipment.cancelTitle')"
      :message="t('logistics.shipment.cancelMessage', { name: shipmentName })"
      :confirm-label="t('logistics.shipment.cancelConfirm')"
      @confirm="doCancel"
    />
  </div>
</template>

<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import ShipmentDetailScreen from "@/components/logistics/ShipmentDetailScreen.vue";
  import { isScreenReady } from "@/router/logisticsScreens";
  import { useLogisticsStore } from "@/stores/logistics";

  /**
   * **B2 container** — sevkiyat detayını `get_shipment_detail`'e bağlar.
   *
   * B3–B8 (kalem, koli, belge, takip, bacak, maliyet) AYRI ROTA DEĞİL:
   * `ShipmentDetailScreen` içinde sekme olarak duruyorlar ve verilerini aynı
   * detay yanıtının alt tablolarından alıyorlar. Yani bu tek container altı
   * ekran birimini birden açıyor.
   *
   * MALİYET SEKMESİ maskelemeye güveniyor: `view.logistics_cost` yetkisi
   * yoksa backend maliyet alanlarını null'layıp gönderiyor
   * (`mask_shipment_cost_fields`). Burada ayrıca filtrelenmiyor — iki yerde
   * maskelemek, birinin unutulduğunda diğerinin sessizce koruduğu yanılgısı
   * üretir.
   */
  const store = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const shipmentName = computed(() => String(route.params.name || ""));
  const confirmOpen = ref(false);

  /**
   * Belgeler sevkiyatın KENDİ child tablosundan geliyor.
   *
   * (İlk yazışta burayı sabit boş dizi bırakmış ve yorumda "sözleşmede belge
   * varlığı yok" demiştim — yanlıştı. `Shipment` DocType'ının dört child
   * tablosu var: items, packages, address_snapshots, **documents**. Yani
   * veri yanıtta zaten geliyordu, ben elimle atıyordum.)
   */
  const documents = computed(() => store.currentShipment?.documents ?? []);

  /**
   * Bacak ve takip sekmeleri BESLENMİYOR — ölçüldü, tahmin değil.
   *
   * `Shipment Leg` ve `Shipment Event` child tablo DEĞİL, ayrı DocType'lar
   * (`shipment` link alanıyla bağlı). `get_shipment_detail` yanıtı
   * `doc.as_dict()` olduğu için bunlar içinde YOK, ve onları listeleyen bir
   * uç da yok (E1/E2 `list_shipment_legs`'i bekliyor).
   *
   * Boş sekme göstermek "bu sevkiyatın bacağı yok" demek olurdu; sekme
   * bunun yerine sebebini yazıyor.
   */
  const UNAVAILABLE_TABS = ["legs", "tracking"];

  /**
   * "Durum güncelle" butonu C2 ekranına gidiyor, uca DEĞİL.
   *
   * `update-status` emit'i YÜKSÜZ: sunum katmanı yalnız tetikliyor, hangi
   * duruma geçileceğini ve gerekçeyi sormuyor — o C2'nin (manuel durum
   * güncelleme) işi ve gerekçe TUR-107 gereği zorunlu. Doğrudan uca
   * bağlasaydım durumsuz bir istek giderdi.
   *
   * C2 henüz açık olmadığı için buton çizilmiyor; `ready: true` olduğu an
   * kendiliğinden belirir.
   */
  const can = computed(() => ({
    ...store.can,
    write: store.can.write && isScreenReady("C2"),
    // Paketleme ekranı (13-FE, G1). Hedef kayıtlı değilken buton çizmek ölü
    // buton üretirdi — `isScreenReady` aynı gerekçeyle burada da.
    pack: store.can.write && isScreenReady("G1"),
  }));

  function load() {
    if (shipmentName.value) store.fetchShipment(shipmentName.value);
  }

  function openStatusUpdate() {
    router.push({ name: "LogisticsStatusUpdate", query: { shipment: shipmentName.value } });
  }

  function openPacking() {
    router.push({ name: "LogisticsPacking", params: { name: shipmentName.value } });
  }

  /**
   * İptalde gerekçe sorulmuyor: `cancel_shipment` ucunda `reason` isteğe
   * bağlı ve sunum katmanı gerekçe alanı taşımıyor. Onay kutusu yine de
   * ZORUNLU — iptal terminal bir geçiş, geri alınamıyor.
   *
   * Hata yakalanıp yutuluyor çünkü store zaten `error`'a yazıyor ve ekran
   * gösteriyor; buradaki `catch` yalnız işlenmemiş promise reddini önlüyor.
   */
  async function doCancel() {
    try {
      await store.cancelShipmentById(shipmentName.value);
    } catch {
      // hata store.error'da; ShipmentDetailScreen gösteriyor
    }
  }

  onMounted(async () => {
    await store.fetchPermissions();
    load();
  });

  // Listeden başka bir sevkiyata geçilince bileşen yeniden kurulmuyor,
  // yalnız parametre değişiyor.
  watch(shipmentName, load);
</script>
