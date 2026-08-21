<template>
  <details class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
    <summary
      class="cursor-pointer list-none px-3 py-2 text-xs text-gray-600 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
    >
      <!-- Rozetin metin rengi ATADAN MİRAS ALINMIYOR: koyu temada gray-400
           metin gray-700 zemin üzerinde 3.94:1 kalıyordu (13-FE ölçümü). -->
      <span
        class="rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200"
        >DEMO</span
      >
      {{ t("logistics.pricingMock.title") }}
      <span
        v-if="fault"
        class="ms-1 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400"
      >
        {{ t(`logistics.pricingMock.${fault}`) }}
      </span>
    </summary>

    <div class="space-y-3 border-t border-gray-200 px-3 py-3 dark:border-gray-700">
      <p class="text-[11px] text-gray-600 dark:text-gray-400">
        {{ t("logistics.pricingMock.hint") }}
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
          {{ t("logistics.pricingMock.faultLabel") }}
        </span>
        <button
          v-for="option in options"
          :key="option.code ?? 'none'"
          type="button"
          class="rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors"
          :class="
            fault === option.code
              ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
          "
          :aria-pressed="fault === option.code"
          @click="choose(option.code)"
        >
          {{
            option.code
              ? t(`logistics.pricingMock.${option.code}`)
              : t("logistics.pricingMock.none")
          }}
        </button>
      </div>

      <div
        class="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800"
      >
        <button type="button" class="hdr-btn-outlined" @click="reset">
          {{ t("logistics.pricingMock.reset") }}
        </button>
        <span class="text-[11px] text-gray-600 dark:text-gray-400">{{
          t("logistics.pricingMock.resetHint")
        }}</span>
      </div>
    </div>
  </details>
</template>

<script setup>
  import { ref } from "vue";
  import { useI18n } from "vue-i18n";

  import {
    clearFault,
    FAULT_CODES,
    getFault,
    resetMockData,
    setFault,
  } from "@/api/logisticsPricing";

  /**
   * Mock kontrol paneli — yalnız FE fazında var.
   *
   * NEDEN EKRANDA: sözleşmedeki hata kodlarının ekranda nasıl göründüğü ancak
   * hata gerçekleşince görülebiliyor. Tetiklenemezse gözden geçirilemez ve
   * hata ekranları tasarım incelemesinin dışında kalır
   * (`docs/lojistik/FE-MOCK-DISIPLINI.md` §2.4).
   *
   * Liste SÖZLEŞMEDEN geliyor (`FAULT_CODES`), burada elle yazılmıyor —
   * sözleşmeye yeni bir hata kodu girdiğinde panel kendiliğinden kapsıyor.
   *
   * `USE_MOCK` kapandığında bu bileşen silinecek; kalıcı bir arayüz parçası
   * değil. `<details>` içinde kapalı duruyor ki ekranın tasarımını bozmasın.
   */
  const emit = defineEmits(["changed"]);

  const { t } = useI18n();
  const fault = ref(getFault());
  const options = [{ code: null }, ...FAULT_CODES];

  function choose(code) {
    if (code) setFault(code);
    else clearFault();
    fault.value = getFault();
    emit("changed");
  }

  function reset() {
    resetMockData();
    fault.value = null;
    emit("changed");
  }
</script>
