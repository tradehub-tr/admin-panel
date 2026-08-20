<template>
  <!-- D1 · Satıcı teslimatı. K-N: D2 ile birleştirilmedi — manifest, i18n nav
       kalemleri ve G0 rol matrisi iki ayrı ekrana göre kurulu.
       K-M: satıcı bu ekranı GÖRÜYOR; kendi aracıyla teslim onun fiziksel işi. -->
  <DeliveryFlowScreen
      flow-key="satici-teslimati"
    v-model:search="search"
    v-model:status="status"
    v-model:appointment="appointment"
    :title="t('logistics.delivery.seller.title')"
    :subtitle="t('logistics.delivery.seller.subtitle')"
    :empty-title="t('logistics.delivery.seller.empty')"
    :surface="surface"
    :as-seller="store.asSeller"
    @refresh="load"
  >
    <template #row-detail="{ row }">
      <dl class="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.delivery.driver") }}</dt>
          <!-- Atanmamış alan AMBER ile işaretleniyor, boş bırakılmıyor:
               boşluk "veri yok" ile "henüz atanmadı"yı ayırt ettirmiyor. -->
          <dd :class="row.driver_name ? valueClass : missingClass">
            {{ row.driver_name || t("logistics.delivery.unassigned") }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.delivery.vehicle") }}</dt>
          <dd :class="row.vehicle_plate ? valueClass : missingClass">
            {{ row.vehicle_plate || t("logistics.delivery.unassigned") }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-gray-600 dark:text-gray-400">{{ t("logistics.pod.fields.totalPackages") }}</dt>
          <dd :class="valueClass">{{ row.package_count ?? "—" }}</dd>
        </div>
      </dl>
    </template>
  </DeliveryFlowScreen>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import { usePodStore } from "@/stores/pod";

  import DeliveryFlowScreen from "./components/DeliveryFlowScreen.vue";

  const { t } = useI18n();
  const store = usePodStore();

  const search = ref("");
  const status = ref("");
  const appointment = ref("");

  const surface = computed(() => store.flows.seller_delivery);

  const valueClass = "text-[13px] text-gray-900 dark:text-gray-100";
  const missingClass = "text-[13px] font-semibold text-amber-700 dark:text-amber-300";

  let searchTimer;

  const load = () => {
    // Enter/yenile anında geldiyse bekleyen debounce iptal — çift istek atma.
    clearTimeout(searchTimer);
    store.ensurePermissions().catch(() => {});
    return store.fetchFlow("seller_delivery", {
      search: search.value || null,
      status: status.value || null,
      appointment: appointment.value || null,
    });
  };

  // ÖLÜ ARAMA düzeltmesi (tam denetim 2026-08-20): `search` watch'ta yoktu —
  // aramaya yazılan hiçbir fetch tetiklemiyordu, kutu yalnız Enter'la
  // çalışıyordu. CatalogListScreen `params-change` deseniyle aynı: arama
  // 400 ms debounce'la gider (her tuşta istek atılmaz), süzgeçler anında.
  watch(search, () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 400);
  });
  watch([status, appointment], load);
  onMounted(load);
  onUnmounted(() => clearTimeout(searchTimer));
</script>
