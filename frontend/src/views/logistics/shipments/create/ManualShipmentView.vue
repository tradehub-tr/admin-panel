<template>
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
  import { onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";

  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import ManualShipmentFormScreen from "@/components/logistics/ManualShipmentFormScreen.vue";
  import { listCatalog } from "@/api/logistics";
  import { MOCK, createManualShipment } from "@/api/shipmentCreate";
  import { useToast } from "@/composables/useToast";
  import { useLogisticsStore } from "@/stores/logistics";

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
  const saving = ref(false);
  const saveError = ref(null);

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
      channelsError.value = { code: e?.code ?? "INTERNAL_ERROR", message: e?.message };
    } finally {
      channelsLoading.value = false;
    }
  }

  /**
   * Çift tıklama koruması: anahtar İLK save denemesinde üretilir ve hata
   * sonrası tekrarda AYNI kalır — backend idempotency sözleşmesi aynı
   * anahtarla yeni kayıt açmaz. Başarıda sıfırlanır (yeni form = yeni kayıt).
   */
  let idempotencyKey = null;

  async function save(payload) {
    saving.value = true;
    saveError.value = null;
    idempotencyKey ??= `manual-${Date.now()}`;
    try {
      const created = await createManualShipment({ ...payload, idempotency_key: idempotencyKey });
      idempotencyKey = null;
      toast.success(t("logistics.manual.created", { name: created.name }));
      if (MOCK.create_manual_shipment) {
        router.push({ name: "LogisticsShipmentList" });
      } else {
        router.push({ name: "LogisticsShipmentDetail", params: { name: created.name } });
      }
    } catch (e) {
      saveError.value = { code: e?.code ?? "INTERNAL_ERROR", message: e?.message };
    } finally {
      saving.value = false;
    }
  }

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
