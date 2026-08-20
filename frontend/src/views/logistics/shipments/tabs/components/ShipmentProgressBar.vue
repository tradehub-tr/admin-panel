<template>
  <div>
    <!-- Terminal istisna: iptal/iade/başarısız çubuğa SIĞDIRILMIYOR.
         Amazon deseni ana akışın 5 kilometre taşı; istisnayı 6. taş yapmak
         "teslim yolunda bir aşama"ymış gibi gösterirdi. Ayrık kırmızı şerit. -->
    <div
      v-if="exception"
      class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
    >
      {{ t(`logistics.milestone.exception.${exception}`) }}
    </div>

    <ol v-else class="flex items-start" :aria-label="t('logistics.milestone.aria')">
      <li
        v-for="(step, index) in steps"
        :key="step.key"
        class="flex min-w-0 flex-1 flex-col items-center gap-1.5"
      >
        <div class="flex w-full items-center">
          <span
            class="h-0.5 flex-1"
            :class="index === 0 ? 'bg-transparent' : lineClass(index)"
            aria-hidden="true"
          />
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold"
            :class="dotClass(index)"
          >
            <template v-if="index < activeIndex">✓</template>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span
            class="h-0.5 flex-1"
            :class="index === steps.length - 1 ? 'bg-transparent' : lineClass(index + 1)"
            aria-hidden="true"
          />
        </div>
        <span
          class="px-1 text-center text-[11px] leading-tight"
          :class="
            index <= activeIndex
              ? 'font-medium text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400'
          "
        >
          {{ step.label }}
        </span>
      </li>
    </ol>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * **B6 · Kilometre taşı çubuğu** (11-FE, Amazon/Baymard deseni).
   *
   * 11 durumlu makine 5 taşa indirgenir: operasyoncu "hangi aşamadayız"
   * sorusunu tek bakışta okur, ayrıntı alttaki olay listesinde. Eşleme
   * BURADA yaşar (sunum kararı) — durum makinesinin kendisi
   * `shipmentTransitions.js`'te ve otoritesi backend.
   */
  const props = defineProps({
    status: { type: String, default: "" },
  });

  const { t } = useI18n();

  /** Durum → taş indeksi. Draft/Pending hazırlık; ara duruma At Warehouse dahil. */
  const MILESTONE_OF = {
    Draft: 0,
    Pending: 0,
    "Ready for Pickup": 1,
    "Picked Up": 1,
    "In Transit": 2,
    "At Warehouse": 2,
    "Out for Delivery": 3,
    Delivered: 4,
  };

  const EXCEPTIONS = { Cancelled: "cancelled", Returned: "returned", Failed: "failed" };

  const STEP_KEYS = ["preparing", "pickedUp", "inTransit", "outForDelivery", "delivered"];

  const steps = computed(() =>
    STEP_KEYS.map((key) => ({ key, label: t(`logistics.milestone.${key}`) }))
  );

  const exception = computed(() => EXCEPTIONS[props.status] ?? null);

  const activeIndex = computed(() => MILESTONE_OF[props.status] ?? 0);

  function dotClass(index) {
    if (index < activeIndex.value) {
      return "border-emerald-500 bg-emerald-500 text-white";
    }
    if (index === activeIndex.value) {
      return "border-indigo-500 bg-indigo-500 text-white";
    }
    return "border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-800";
  }

  /** index'e GELEN çizgi: solundaki taş tamamlandıysa dolu. */
  function lineClass(index) {
    return index <= activeIndex.value
      ? "bg-emerald-500"
      : "bg-gray-200 dark:bg-gray-700";
  }
</script>
