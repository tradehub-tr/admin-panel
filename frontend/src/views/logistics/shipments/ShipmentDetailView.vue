<template>
  <div>
    <ShipmentDetailScreen
      :shipment="store.currentShipment"
      :documents="documents"
      :tabs="tabs"
      :loading="store.loading"
      :error="store.error"
      :can="can"
      @retry="load"
      @back="goBackToList"
      @update-status="openStatusUpdate"
      @open-packing="openPacking"
      @cancel-shipment="confirmOpen = true"
    />

    <ConfirmDialog
      v-model:open="confirmOpen"
      tone="danger"
      :title="t('logistics.operation.cancelTitle')"
      :message="t('logistics.operation.cancelMessage', { name: shipmentName })"
      :confirm-label="t('logistics.operation.cancelConfirm')"
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
  import { resolveShipmentTabs } from "@/views/logistics/_contract/shipmentTabContract";
  import { SHIPMENT_TABS } from "@/views/logistics/shipmentTabRegistry";

  /**
   * **B2 container** — sevkiyat detayını `get_shipment_detail`'e bağlar.
   *
   * B3–B8 (kalem, koli, belge, takip, bacak, maliyet) AYRI ROTA DEĞİL:
   * `ShipmentDetailScreen` içinde sekme olarak duruyorlar ve verilerini aynı
   * detay yanıtının alt tablolarından alıyorlar. Yani bu tek container altı
   * ekran birimini birden açıyor.
   *
   * SEKMELER KAYIT DEFTERİNDEN geliyor (16-FE-0). Bu dosya hangi sekmelerin
   * var olduğunu BİLMİYOR — yalnız bağlamı (`shipment`, `documents`, `can`)
   * kuruyor. Yeni sekme eklemek için burası açılmaz; kayıt defterine bir
   * satır eklenir (`views/logistics/shipmentTabRegistry.js`).
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
   * "Durum güncelle" butonu C2 ekranına gidiyor, uca DEĞİL.
   *
   * `update-status` emit'i YÜKSÜZ: sunum katmanı yalnız tetikliyor, hangi
   * duruma geçileceğini ve gerekçeyi sormuyor — o C2'nin (manuel durum
   * güncelleme) işi ve gerekçe TUR-107 gereği zorunlu. Doğrudan uca
   * bağlasaydım durumsuz bir istek giderdi.
   *
   * C2 kayıtlı değilken buton çizilmiyor (ÖLÜ BUTON YASAĞI); `ready: true`
   * olduğu an kendiliğinden belirir.
   *
   * AYRI BİR ALAN, `write`in ÜZERİNE YAZILMIYOR. Önce `write: store.can.write
   * && isScreenReady("C2")` yazıyordum — `write`in anlamını ("bu kullanıcının
   * `shipment.write` yetkisi var") kirletiyordu ve bu nesne kayıt defteri
   * üzerinden TÜM sekmelere iniyor. C2 kapansa koli/belge sekmelerinin
   * butonları da sebepsiz kaybolurdu; iki ayrı soru tek alana sıkışmıştı.
   */
  const can = computed(() => ({
    ...store.can,
    updateStatus: store.can.write && isScreenReady("C2"),
    // Paketleme ekranı (13-FE, Ali — G1). Hedef kayıtlı değilken buton çizmek
    // ölü buton üretirdi; `isScreenReady` aynı gerekçeyle burada da.
    pack: store.can.write && isScreenReady("G1"),
  }));

  /**
   * Sevkiyat gelmeden sekme ÇÖZÜLMÜYOR: sayaçlar ve dikkat noktaları
   * sevkiyatın verisinden hesaplanıyor, boş bağlamla çözmek her sekmede
   * yanıltıcı bir "0" yazardı.
   */
  const tabs = computed(() =>
    store.currentShipment
      ? resolveShipmentTabs(SHIPMENT_TABS, {
          shipment: store.currentShipment,
          documents: documents.value,
          can: can.value,
        })
      : []
  );

  function load() {
    if (shipmentName.value) store.fetchShipment(shipmentName.value);
  }

  /**
   * Geri oku listeye dönüyor, tarayıcı geçmişine DEĞİL.
   *
   * `router.back()` yazsaydım detaya paylaşılan bir linkle girildiğinde
   * (geçmiş boş) hiçbir yere gidilmezdi. B1'in yolu parametresiz, adla
   * push etmek güvenli; liste kendi `?page`/`?status`ünü URL'den kuruyor.
   */
  function goBackToList() {
    router.push({ name: "LogisticsShipmentList" });
  }

  function openStatusUpdate() {
    // C2'nin yolu `lojistik/sevkiyatlar/:name/durum` — parametre ZORUNLU.
    // Burası `query: { shipment }` gönderiyordu ve vue-router
    // `Missing required param "name"` fırlatıyordu: buton çiziliyor,
    // tıklanıyor, konsola hata düşüyor, hiçbir yere gidilmiyordu.
    router.push({ name: "LogisticsStatusUpdate", params: { name: shipmentName.value } });
  }

  function openPacking() {
    router.push({ name: "LogisticsPacking", params: { name: shipmentName.value } });
  }

  /**
   * İptalde gerekçe sorulmuyor: `cancel_shipment` ucunda `reason` isteğe
   * bağlı ve sunum katmanı gerekçe alanı taşımıyor. Onay kutusu yine de
   * ZORUNLU — iptal terminal bir geçiş, geri alınamıyor.
   *
   * Onay metinleri `logistics.operation.*` altında (tr.js/en.js). Önce
   * `logistics.shipment.cancelTitle/cancelMessage/cancelConfirm` yazılmıştı;
   * o dönemde anahtarlar sözlükte yoktu ve vue-i18n eksik anahtarda HAM
   * ANAHTARI basıyordu — kullanıcı geri alınamaz bir işlemin onay
   * penceresinde "logistics.shipment.cancelTitle" görüyordu. (13-FE merge'i
   * o adlara metin eklemişti; dupe borcu 2026-08 tam denetiminde kapatıldı —
   * tüketicisiz `shipment.cancel*` üçlüsü sözlüklerden silindi, CANLI olan
   * yalnız `operation.*`.)
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
