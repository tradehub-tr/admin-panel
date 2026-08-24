<template>
  <div class="space-y-4">
    <!-- TUR-121 kabul kriteri: "Taşıyıcı maliyeti ile müşteriye yansıtılan
         tutar AYRI raporlanır." İkisi yan yana ve farkı görünür. -->
    <div v-if="can.viewCost" class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <p class="text-xs text-gray-600">{{ t("logistics.cost.carrierCost") }}</p>
        <p class="mt-1 text-lg font-semibold tabular-nums">
          {{ formatTry(shipment.carrier_cost) }}
        </p>
      </div>
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <p class="text-xs text-gray-600">{{ t("logistics.cost.customerCharge") }}</p>
        <p class="mt-1 text-lg font-semibold tabular-nums">
          {{ formatTry(shipment.customer_charge) }}
        </p>
      </div>
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <p class="text-xs text-gray-600">{{ t("logistics.cost.margin") }}</p>
        <p
          class="mt-1 text-lg font-semibold tabular-nums"
          :class="
            margin === null || margin >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          "
        >
          {{ formatTry(margin) }}
        </p>
      </div>
    </div>

    <!-- Maliyet görme YETKİSİ yoksa alanlar HİÇ gösterilmez; backend zaten
         null döndürüyor (mask_shipment_cost_fields). Yetki VARKEN alanların
         null gelmesi ayrı bir durum: maliyet henüz girilmemiştir, kartlar
         normal düzende "—" gösterir (formatTry) — QA denetimi 2026-08-24. -->
    <ErrorState
      v-else
      :error="{ code: 'CAPABILITY_REQUIRED', message: t('logistics.cost.noCapability') }"
    />

    <dl v-if="can.viewCost" class="grid gap-3 text-sm sm:grid-cols-2">
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
  import { formatTry } from "@/utils/format";

  /**
   * **B8 · Maliyet sekmesi** (TUR-121).
   *
   * Kapı YALNIZ `can.viewCost`: yetki yoksa CAPABILITY_REQUIRED ekranı.
   * Yetki varken alanların null gelmesi yetki sorunu DEĞİL — maliyet henüz
   * girilmemiştir; kartlar "—" gösterir (formatTry). Eski hâl ikisini tek
   * yüklemde karıştırıyordu ve yetkili kullanıcı boş maliyette yanlış yere
   * "yetkiniz yok" görüyordu (QA denetimi 2026-08-24). "0 TL" göstermek de
   * yanlış bilgi olurdu — backend yetkisizde null maskeliyor
   * (`mask_shipment_cost_fields`).
   */
  const props = defineProps({
    shipment: { type: Object, required: true },
    can: { type: Object, default: () => ({ viewCost: false }) },
  });

  const { t } = useI18n();

  // Her iki alan da boşsa marj HESAPLANAMAZ (null → "—"); tek taraf boşken
  // boş taraf 0 sayılır (eski davranış korunuyor).
  const margin = computed(() => {
    const { carrier_cost: cost, customer_charge: charge } = props.shipment;
    if (cost == null && charge == null) return null;
    return Number(charge ?? 0) - Number(cost ?? 0);
  });
</script>
