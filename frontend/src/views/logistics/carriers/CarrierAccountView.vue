<template>
  <CarrierAccountScreen
    :rows="rows"
    :loading="loading"
    :error="error"
    :can="store.can"
    :can-create="false"
    :can-edit="false"
    :can-test="false"
    :revealed="revealed"
    :now="now"
    :page="page"
    :page-size="PAGE_SIZE"
    :total="total"
    @retry="load"
    @reveal="reveal"
    @hide="hide"
    @update:page="goToPage"
  />
</template>

<script setup>
  import { onMounted, onUnmounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

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
   * `reveal` ayrı bir eylem ve ayrı bir yetki. Açığa çıkan değer yerel
   * `revealed` state'inde tutuluyor (toast'ta DEĞİL — toast 3,5 saniyede
   * kaybolur, bir credential'ı okumaya yetmez) ve üç yolla siliniyor:
   * kullanıcı "Gizle" der, sayfa değiştirir (`goToPage`) ya da ekrandan
   * çıkar (`onUnmounted`). Kalıcı hiçbir yere (store, localStorage, URL)
   * yazılmıyor. Backend her çağrıyı denetim kaydına ALLOW olarak yazıyor
   * (logistics_admin.reveal_carrier_secret).
   *
   * `canCreate`/`canEdit`/`canTest` BİLEREK `false`: karşılık gelen emit'leri
   * dinleyen kod yok, hesap formu ekranı yazılmadı ve F2 (bağlantı testi)
   * manifestte `ready: false`. Uçlar/ekranlar geldiğinde `can.manage` +
   * `isScreenReady(...)` ile açılırlar (gerekçe: ekranın prop tanımları).
   */
  const store = useLogisticsStore();
  const toast = useToast();
  const { t } = useI18n();

  /** Uç `page`/`page_size` ile sunucu tarafında sayfalıyor. */
  const PAGE_SIZE = 50;

  const rows = ref([]);
  const total = ref(0);
  const page = ref(1);
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
      const data = await listCarrierAccounts({ page: page.value, pageSize: PAGE_SIZE });
      rows.value = data?.items ?? [];
      total.value = data?.total ?? rows.value.length;
    } catch (e) {
      rows.value = [];
      total.value = 0;
      error.value =
        e instanceof LogisticsApiError
          ? { code: e.code, message: e.message }
          : {
              code: "INTERNAL_ERROR",
              message: e?.message || t("logistics.toast.accountsLoadFailed"),
            };
    } finally {
      loading.value = false;
    }
  }

  // Sayfa değişiminde açığa çıkarılmış değerler ekranda kalmasın: satırlar
  // gidiyor, gizli değer bellekte kalmamalı.
  function goToPage(next) {
    page.value = next;
    revealed.value = {};
    load();
  }

  async function reveal({ name, field }) {
    try {
      const data = await revealCarrierSecret(name, field);
      revealed.value = {
        ...revealed.value,
        [name]: { ...revealed.value[name], [field]: data.value },
      };
    } catch (e) {
      toast.error(e?.message || t("logistics.toast.secretRevealFailed"));
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
