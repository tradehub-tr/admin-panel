<template>
  <div class="space-y-4">
    <!-- TUR-121 kabul kriteri: "Taşıyıcı maliyeti ile müşteriye yansıtılan
         tutar AYRI raporlanır." İkisi yan yana ve farkı görünür. -->
    <div v-if="canSeeCost" class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <p class="text-xs text-gray-600">{{ t("logistics.cost.carrierCost") }}</p>
        <p class="mt-1 text-lg font-semibold tabular-nums">{{ money(shipment.carrier_cost) }}</p>
      </div>
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <p class="text-xs text-gray-600">{{ t("logistics.cost.customerCharge") }}</p>
        <p class="mt-1 text-lg font-semibold tabular-nums">{{ money(shipment.customer_charge) }}</p>
      </div>
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <p class="text-xs text-gray-600">{{ t("logistics.cost.margin") }}</p>
        <p
          class="mt-1 text-lg font-semibold tabular-nums"
          :class="
            margin >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          "
        >
          {{ money(margin) }}
        </p>
      </div>
    </div>

    <!-- Maliyet görme yetkisi yoksa alanlar HİÇ gösterilmez; backend zaten
         null döndürüyor (mask_shipment_cost_fields) -->
    <ErrorState
      v-else
      :error="{ code: 'CAPABILITY_REQUIRED', message: t('logistics.cost.noCapability') }"
    />

    <dl v-if="canSeeCost" class="grid gap-3 text-sm sm:grid-cols-2">
      <div class="flex justify-between rounded border border-gray-200 p-3 dark:border-gray-700">
        <dt class="text-gray-600">{{ t("logistics.cost.paidBy") }}</dt>
        <dd class="font-medium">{{ shipment.cost_paid_by || "—" }}</dd>
      </div>
      <div class="flex justify-between rounded border border-gray-200 p-3 dark:border-gray-700">
        <dt class="text-gray-600">{{ t("logistics.cost.chargeableWeight") }}</dt>
        <dd class="font-medium tabular-nums">{{ shipment.chargeable_weight ?? "—" }} kg</dd>
      </div>
    </dl>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import ErrorState from "@/components/logistics/ErrorState.vue";

  /**
   * **B8 · Maliyet sekmesi** (TUR-121).
   *
   * `view.logistics_cost` capability'si yoksa backend maliyet alanlarını
   * `null` döndürüyor (`mask_shipment_cost_fields`). Ekran bunu "0 TL" diye
   * göstermek yerine yetki eksikliği olarak anlatıyor — 0 göstermek yanlış
   * bilgi olurdu.
   */
  const props = defineProps({
    shipment: { type: Object, required: true },
    can: { type: Object, default: () => ({ viewCost: false }) },
  });

  const { t } = useI18n();

  const canSeeCost = computed(() => props.can.viewCost && props.shipment.carrier_cost !== null);
  const margin = computed(
    () => Number(props.shipment.customer_charge ?? 0) - Number(props.shipment.carrier_cost ?? 0)
  );
  const money = (v) =>
    v === null || v === undefined
      ? "—"
      : Number(v).toLocaleString(undefined, { style: "currency", currency: "TRY" });
</script>
