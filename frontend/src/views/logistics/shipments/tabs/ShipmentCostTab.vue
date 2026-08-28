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
        <p class="mt-1 text-lg font-semibold tabular-nums" :class="marginClass">
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
        <!-- Birim yalnız DEĞER VARKEN basılıyor: `?? "—"` boş dizeyi
             yakalamadığı için hücre " kg" render ediliyordu. -->
        <dd class="font-medium tabular-nums">{{ chargeableWeightLabel }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import ErrorState from "@/components/logistics/ErrorState.vue";
  import { formatQty, formatTry, toFiniteNumber } from "@/utils/format";

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

  /**
   * Marj ÜÇ DURUMLU: iki girdiden BİRİ bile bilinmiyorsa sonuç `null` ("—").
   *
   * NEDEN DEĞİŞTİ (QA denetimi, 2026-08-28 — SESSİZ VERİ BOZULMASI):
   *   Eski hâl "tek taraf boşken boş taraf 0 sayılır" diyordu ve ölçüldü:
   *     maliyet=null, tutar=500  → marj  500  YEŞİL  ("tam kâr")
   *     maliyet=300,  tutar=null → marj -300  KIRMIZI ("tam zarar")
   *     maliyet="",   tutar=500  → marj  500  YEŞİL  (`??` boş dizeyi geçiriyor)
   *   Yani maliyet HENÜZ GİRİLMEMİŞ bir sevkiyat "₺500,00 kâr" olarak
   *   raporlanıyordu. Bilinmeyen bir girdiyle yapılan çıkarma bilinmeyendir;
   *   dosyanın kendi kuralı ("'0 TL' göstermek de yanlış bilgi olurdu")
   *   TÜRETİLMİŞ değere uygulanmamıştı.
   *
   *   `toFiniteNumber` (tek kaynak) boş dize / yalnız-boşluk / NaN'ı da
   *   "bilinmiyor" sayar; GERÇEK 0 maliyet hâlâ hesaba girer.
   */
  const margin = computed(() => {
    const cost = toFiniteNumber(props.shipment.carrier_cost);
    const charge = toFiniteNumber(props.shipment.customer_charge);
    if (cost === null || charge === null) return null;
    return charge - cost;
  });

  /** Bilinmeyen marj NÖTR renkte — yeşil "kârlı" demektir, bilinmeyen değil. */
  const marginClass = computed(() => {
    if (margin.value === null) return "text-gray-600 dark:text-gray-400";
    return margin.value >= 0
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  });

  const chargeableWeightLabel = computed(() => {
    const label = formatQty(props.shipment.chargeable_weight);
    return label === "—" ? label : `${label} kg`;
  });
</script>
