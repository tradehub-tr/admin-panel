<template>
  <LiveStatus :text="loading ? t('a11y.loading') : ''" />

  <!-- Yetki yanıtı gelmeden karar YOK: capabilities boş başlıyor ve
       fetchPermissions bitmeden can.create her zaman false — beklemeden
       çizmek yetkili kullanıcıya bir anlık (ya da kalıcı) "yetkiniz yok"
       gösteriyordu (canlıda Administrator'da yaşandı, 2026-08-19). -->
  <Skeleton v-if="!permsReady" variant="row" :count="4" />

  <ErrorState v-else-if="!store.can.create" :error="capabilityError" />

  <ErrorState v-else-if="channelsError" :error="channelsError" @retry="loadChannels" />

  <Skeleton v-else-if="channelsLoading" variant="row" :count="4" />

  <ManualShipmentFormScreen
    v-else
    :model-value="draft"
    :channels="channels"
    :can="store.can"
    :saving="saving"
    :error="saveError"
    @save="save"
    @cancel="goBack"
    @retry="saveError = null"
  />
</template>

<script setup>
  import { computed, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";

  import LiveStatus from "@/components/common/LiveStatus.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import ManualShipmentFormScreen from "@/components/logistics/ManualShipmentFormScreen.vue";
  import { listCatalog } from "@/api/logistics";
  import { toScreenError } from "@/api/logisticsEnvelope";
  import { useToast } from "@/composables/useToast";
  import { useLogisticsStore } from "@/stores/logistics";

  import { useManualShipmentSave } from "./useManualShipmentSave";

  /**
   * **C1 container** — manuel/offline sevkiyat oluşturma (TUR-107).
   *
   * Kanal listesi GERÇEK katalogtan geliyor (`shipping_channel` — satıcının
   * READ izni G0'da açıldı); oluşturma ucu ise `api/shipmentCreate.js`
   * üzerinden şimdilik MOCK (06-BE sözleşmesi orada). Mock başarıda detaya
   * DEĞİL listeye dönülür: listede var olmayan sahte kaydın 404 detayına
   * götürmek kullanıcıya ekranın bozuk olduğunu düşündürtürdü.
   *
   * `cost_paid_by` zorunlu ama maliyet bölümü yalnız `can.viewCost` olan
   * göze çiziliyor (G0/K1). Satıcıda bölüm gizli — varsayılan burada
   * atanıyor ("Seller": platform-anlaşmalı kargoda ücret satıcıya yansır,
   * Trendyol deseni). Yetkili kullanıcı bölümde değiştirebilir.
   */
  const store = useLogisticsStore();
  const router = useRouter();
  const toast = useToast();
  const { t } = useI18n();

  const draft = ref({ cost_paid_by: "Seller" });
  const permsReady = ref(false);
  const channels = ref([]);
  const channelsLoading = ref(false);
  const channelsError = ref(null);

  /** İki iskelet dalının ortak yüklemi — canlı bölge de bunu söylüyor. */
  const loading = computed(() => !permsReady.value || channelsLoading.value);

  const capabilityError = {
    code: "CAPABILITY_REQUIRED",
    message: t("logistics.manual.noCapability"),
  };

  async function loadChannels() {
    channelsLoading.value = true;
    channelsError.value = null;
    try {
      // is_active SAYI olmalı (1/0): uç `is_active: int | None` imzalı ve
      // Frappe v15 tip doğrulaması boolean "true" string'ini int'e çeviremeyip
      // 500 veriyor — canlıda yaşandı (2026-08-19), CatalogList de 1/0 geçer.
      const data = await listCatalog("shipping_channel", { isActive: 1, pageSize: 100 });
      channels.value = data?.items ?? [];
    } catch (e) {
      channelsError.value = toScreenError(e);
    } finally {
      channelsLoading.value = false;
    }
  }

  // Kaydetme akışı (yeniden-giriş kilidi + idempotency anahtarı yaşam
  // döngüsü) `useManualShipmentSave`'de — anahtar üretiminin güvensiz
  // origin'de formu kilitleme hikâyesi ve davranış testleri o dosyada.
  const { saving, saveError, save } = useManualShipmentSave({
    onCreated(created) {
      toast.success(t("logistics.manual.created", { name: created.name }));
      // MOCK bayrağı view'a SIZMAZ (mock deseni denetimi 2026-08-24): karar
      // YANITTAN veriliyor. `persisted: false` = kayıt sunucuya yazılmadı →
      // listeye dön (sahte kaydın 404 detayına götürme). Canlı uç `persisted`
      // döndürmez, `?? true` varsayılır (sözleşme: api/shipmentCreate.js).
      if ((created.persisted ?? true) === false) {
        return router.push({ name: "LogisticsShipmentList" });
      }
      return router.push({ name: "LogisticsShipmentDetail", params: { name: created.name } });
    },
  });

  function goBack() {
    router.push({ name: "LogisticsShipmentList" });
  }

  onMounted(async () => {
    // Her lojistik container'ın açılış deseni (ShipmentListView emsali):
    // yetkiler bu ekrana doğrudan URL ile gelindiğinde de dolu olmalı.
    await store.fetchPermissions();
    permsReady.value = true;
    if (store.can.create) await loadChannels();
  });
</script>
