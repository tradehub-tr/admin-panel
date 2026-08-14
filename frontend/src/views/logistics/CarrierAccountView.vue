<template>
  <CarrierAccountScreen
    :rows="rows"
    :loading="loading"
    :error="error"
    :can="store.can"
    :revealed="revealed"
    :now="now"
    @retry="load"
    @reveal="reveal"
    @hide="hide"
  />
</template>

<script setup>
  import { onMounted, onUnmounted, ref } from "vue";

  import CarrierAccountScreen from "@/components/logistics/CarrierAccountScreen.vue";
  import { useToast } from "@/composables/useToast";
  import { LogisticsApiError, listCarrierAccounts, revealCarrierSecret } from "@/api/logistics";
  import { useLogisticsStore } from "@/stores/logistics";

  /**
   * **F1 container** — taşıyıcı hesapları.
   *
   * Liste store'a KONULMUYOR: gizli bilgi taşıyan bir kaydın (bayrakları
   * bile olsa) uygulama ömrü boyunca bellekte kalmasına gerek yok. Ekran
   * kapanınca veri de gider.
   *
   * `reveal` ayrı bir eylem ve ayrı bir yetki: değeri toast ile bir kez
   * gösteriyoruz, hiçbir yere yazmıyoruz. Backend her çağrıyı denetim
   * kaydına ALLOW olarak yazıyor (logistics_admin.reveal_carrier_secret).
   */
  const store = useLogisticsStore();
  const toast = useToast();

  const rows = ref([]);
  const loading = ref(false);
  const error = ref(null);
  /** Açığa çıkarılmış gizli değerler — yalnız bu ekranın ömrü boyunca. */
  const revealed = ref({});
  /** Token süresi kıyaslaması için — bileşen "şu an"ı kendi hesaplamıyor. */
  const now = ref("");

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const data = await listCarrierAccounts();
      rows.value = data?.items ?? [];
    } catch (e) {
      rows.value = [];
      error.value =
        e instanceof LogisticsApiError
          ? { code: e.code, message: e.message }
          : { code: "INTERNAL_ERROR", message: e?.message || "Hesaplar yüklenemedi" };
    } finally {
      loading.value = false;
    }
  }

  async function reveal({ name, field }) {
    try {
      const data = await revealCarrierSecret(name, field);
      revealed.value = { ...revealed.value, [name]: { ...revealed.value[name], [field]: data.value } };
    } catch (e) {
      toast.error(e?.message || "Kimlik bilgisi görüntülenemedi");
    }
  }

  function hide({ name, field }) {
    const next = { ...revealed.value, [name]: { ...revealed.value[name] } };
    delete next[name][field];
    revealed.value = next;
  }

  // Sayfadan çıkarken açığa çıkarılmış değerler bellekte kalmasın.
  onUnmounted(() => {
    revealed.value = {};
  });

  onMounted(async () => {
    now.value = new Date().toISOString().slice(0, 19).replace("T", " ");
    await store.fetchPermissions();
    load();
  });
</script>
