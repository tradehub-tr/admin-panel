<template>
  <div class="space-y-5">
    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-3">
      <Skeleton variant="rect" height="88px" />
      <Skeleton variant="rect" height="320px" />
    </div>

    <template v-else-if="shipment">
      <!-- Özet başlık: operasyonun sekmeye girmeden görmesi gerekenler -->
      <header class="flex flex-wrap items-start gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="font-mono text-lg font-semibold">{{ shipment.name }}</h1>
            <StatusBadge :status="shipment.status" />
            <span v-if="shipment.is_delayed" class="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
              {{ t("logistics.shipment.delayed") }}
            </span>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ shipment.order }} · {{ shipment.carrier || t("logistics.shipment.noCarrier") }}
            <template v-if="shipment.tracking_number">
              · <code class="font-mono">{{ shipment.tracking_number }}</code>
            </template>
          </p>
        </div>

        <div class="ms-auto flex flex-wrap gap-2">
          <button v-if="can.write" type="button" class="th-btn-outline text-sm" @click="$emit('update-status')">
            {{ t("logistics.shipment.updateStatus") }}
          </button>
          <!-- İptal YALNIZ Logistics Manager'da (TUR-103 AC-6) -->
          <button v-if="can.cancel" type="button" class="th-btn-outline text-sm" @click="$emit('cancel-shipment')">
            {{ t("logistics.shipment.cancel") }}
          </button>
        </div>
      </header>

      <DetailTabs v-model="activeTab" :tabs="tabs">
        <template #default="{ active }">
          <ShipmentItemsTab v-if="active === 'items'" :items="shipment.items || []" />
          <ShipmentPackagesTab v-else-if="active === 'packages'" :packages="shipment.packages || []" :can="can" />
          <ShipmentDocumentsTab v-else-if="active === 'documents'" :documents="documents" :can="can" />
          <EventTimeline v-else-if="active === 'tracking'" :events="shipment.events || []" />
          <ShipmentLegsTab v-else-if="active === 'legs'" :legs="shipment.legs || []" />
          <ShipmentCostTab v-else-if="active === 'cost'" :shipment="shipment" :can="can" />
        </template>
      </DetailTabs>
    </template>
  </div>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";

  import DetailTabs from "./DetailTabs.vue";
  import ErrorState from "./ErrorState.vue";
  import EventTimeline from "./EventTimeline.vue";
  import ShipmentCostTab from "./ShipmentCostTab.vue";
  import ShipmentDocumentsTab from "./ShipmentDocumentsTab.vue";
  import ShipmentItemsTab from "./ShipmentItemsTab.vue";
  import ShipmentLegsTab from "./ShipmentLegsTab.vue";
  import ShipmentPackagesTab from "./ShipmentPackagesTab.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **B2 · Sevkiyat detayı kabuğu** (TUR-117) — altı sekmeyi taşır.
   *
   * Özet başlık, sekmeye girmeden görülmesi gerekenleri gösterir: durum,
   * gecikme, taşıyıcı, takip no. Aksiyonlar yetkiye göre; iptal yalnız
   * Logistics Manager'da (TUR-103 AC-6).
   */
  const props = defineProps({
    shipment: { type: Object, default: null },
    documents: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false, cancel: false }) },
  });

  defineEmits(["retry", "update-status", "cancel-shipment"]);

  const { t } = useI18n();
  const activeTab = ref("items");

  const tabs = computed(() => {
    const s = props.shipment ?? {};
    const unlabeled = (s.packages ?? []).filter((p) => !p.label_url).length;
    return [
      { key: "items", label: t("logistics.tab.items"), count: (s.items ?? []).length },
      {
        key: "packages",
        label: t("logistics.tab.packages"),
        count: (s.packages ?? []).length,
        // Etiketi olmayan paket varsa dikkat noktası — sevkiyat tamamlanamaz
        alert: unlabeled > 0,
      },
      { key: "documents", label: t("logistics.tab.documents"), count: props.documents.length },
      { key: "tracking", label: t("logistics.tab.tracking"), count: (s.events ?? []).length },
      { key: "legs", label: t("logistics.tab.legs"), count: (s.legs ?? []).length },
      { key: "cost", label: t("logistics.tab.cost") },
    ];
  });
</script>
