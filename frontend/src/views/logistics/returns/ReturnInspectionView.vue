<template>
  <div class="space-y-4">
    <Skeleton v-if="store.loading && !store.request" variant="rect" height="420px" />
    <ErrorState v-else-if="!store.request" :error="store.error" @retry="load" />
    <ReturnInspectionScreen
      v-else
      :request="taslakliKayit"
      :saving="store.saving"
      :error="store.error"
      :can="can"
      @update="store.updateInspection"
      @save="save"
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
  import ReturnInspectionScreen from "@/components/logistics/ReturnInspectionScreen.vue";
  import { useToast } from "@/composables/useToast";
  import { useLogisticsStore } from "@/stores/logistics";
  import { useReturnsStore } from "@/stores/returns";

  /**
   * **I3 container** — depo kontrolü, YALNIZ platform (G0 rol matrisi).
   *
   * Kaydettikten sonra ekranda KALINIYOR (I2'nin aksine): kontrol parça
   * parça yapılıyor, operatör bir kalemi girip kaydediyor ve sıradakine
   * geçiyor. Kuyruğa atmak onu her seferinde geri getirtirdi.
   */
  const route = useRoute();
  const router = useRouter();
  const store = useReturnsStore();
  const logistics = useLogisticsStore();
  const toast = useToast();
  const { t } = useI18n();

  const can = computed(() => ({
    read: true,
    // Depo kontrolü satıcıya KAPALI (sözleşme §6.2). Yetki kapısı sunucuda;
    // buradaki kontrol yalnız ölü buton çizilmesini engelliyor.
    write: !store.asSeller && logistics.can.returnInspect,
  }));

  /**
   * Kayıt + kaydedilmemiş taslak.
   *
   * Sunum bileşeni kendi kopyasını tutmuyor; girilen değerin ekranda
   * görünmesi için taslağın kayda binmesi gerekiyor (store `inspectionItems`).
   */
  const taslakliKayit = computed(() => ({
    ...store.request,
    items: store.inspectionItems,
  }));

  const load = () => store.fetchRequest(route.params.name);

  async function save() {
    if (!(await store.saveInspection())) return;
    toast.success(t("logistics.inspection.saved"));
    // Kontrol bitti ve tutar oluştuysa sıradaki adım kapanış; kullanıcıyı
    // oraya DAVET ediyoruz ama zorlamıyoruz — kapanış geri alınamaz.
    if (store.request?.refund_amount != null) {
      toast.info(t("logistics.inspection.readyForClosure"));
    }
  }

  const goClosure = () =>
    router.push({ name: "LogisticsReturnClosure", params: { name: route.params.name } });

  defineExpose({ goClosure });

  onMounted(load);
  watch(() => route.params.name, load);
</script>
