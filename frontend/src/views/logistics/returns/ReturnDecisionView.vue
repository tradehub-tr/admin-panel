<template>
  <div class="space-y-4">
    <Skeleton v-if="store.loading && !store.request" variant="rect" height="360px" />
    <ErrorState v-else-if="!store.request" :error="store.error" @retry="load" />
    <ReturnDecisionScreen
      v-else
      :request="store.request"
      :saving="store.saving"
      :error="store.error"
      :can="can"
      @apply="apply"
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
  import ReturnDecisionScreen from "@/components/logistics/ReturnDecisionScreen.vue";
  import { useToast } from "@/composables/useToast";
  import { useLogisticsStore } from "@/stores/logistics";
  import { useReturnsStore } from "@/stores/returns";

  /**
   * **I2 container** — satıcı/platform kararı.
   *
   * Karar uygulandıktan sonra kuyruğa DÖNÜLÜYOR, kayıt ekranında kalınmıyor:
   * karar tek seferlik bir iş ve kullanıcının sıradaki talebe geçmesi
   * bekleniyor. Onaylanan iadede oluşan ters sevkiyat numarası bildirimde
   * gösteriliyor — doğrulamak için başka ekrana gitmek gerekmiyor
   * (kök CLAUDE.md §4.14c).
   */
  const route = useRoute();
  const router = useRouter();
  const store = useReturnsStore();
  const logistics = useLogisticsStore();
  const toast = useToast();

  const can = computed(() => ({ read: true, write: logistics.can.returnDecide }));
  const { t } = useI18n();

  const load = () => store.fetchRequest(route.params.name);

  const goQueue = () => router.push({ name: "LogisticsReturnQueue" });

  async function apply(payload) {
    const ok = await store.decide({
      decision: payload.status,
      decisionNote: payload.decision_note,
      createReturnShipment: payload.create_return_shipment,
    });
    if (!ok) return;

    const sevkiyat = store.request?.return_shipment;
    toast.success(
      sevkiyat
        ? t("logistics.returnDecision.appliedWithShipment", { shipment: sevkiyat })
        : t("logistics.returnDecision.applied")
    );
    goQueue();
  }

  onMounted(load);
  watch(() => route.params.name, load);
</script>
