<template>
  <div class="space-y-4">
    <Skeleton v-if="store.loading && !store.request" variant="rect" height="420px" />
    <ErrorState v-else-if="!store.request" :error="store.error" @retry="load" />
    <ReturnClosureScreen
      v-else
      :request="store.request"
      :saving="store.saving"
      :error="store.error"
      :can="can"
      @close-request="close"
      @cancel="goQueue"
      @retry="load"
    />
  </div>
</template>

<script setup>
  import { computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import ReturnClosureScreen from "@/components/logistics/ReturnClosureScreen.vue";
  import { useToast } from "@/composables/useToast";
  import { useLogisticsStore } from "@/stores/logistics";
  import { useReturnsStore } from "@/stores/returns";

  /**
   * **I4 container** — kapanış ve para iadesi, YALNIZ platform yöneticisi.
   *
   * GERİ ALINAMAZ eylem. Ön koşullar ekranda kontrol ediliyor ama asıl kapı
   * sunucuda (sözleşme §2.7): istek yine de giderse `RETURN_NOT_CLOSABLE` +
   * `failed_checks` dönüyor ve o satır sarıya boyanıyor.
   *
   * Başarıdan sonra ekranda KALINIYOR: kapanmış kayıt artık özet gösteriyor
   * (kim kapattı, tutar tetiklendi mi) ve kullanıcının göreceği şey bu.
   */
  const route = useRoute();
  const router = useRouter();
  const store = useReturnsStore();
  const logistics = useLogisticsStore();
  const toast = useToast();

  /**
   * Kapanış GERİ ALINAMAZ ve escrow'a dokunuyor — köprü döneminde bile
   * `shipment.write`'a düşmüyor, yönetim yetkisi istiyor
   * (`stores/logistics.js` → `returnClose`).
   */
  const can = computed(() => ({ read: true, write: logistics.can.returnClose }));
  const { t } = useI18n();

  const load = () => store.fetchRequest(route.params.name);
  const goQueue = () => router.push({ name: "LogisticsReturnQueue" });

  async function close(payload) {
    if (!(await store.close({ triggerRefund: payload.trigger_refund }))) return;
    toast.success(
      store.request?.refund_triggered_at
        ? t("logistics.closure.closedWithRefund")
        : t("logistics.closure.closedNoRefund")
    );
  }

  onMounted(load);
  watch(() => route.params.name, load);
</script>
