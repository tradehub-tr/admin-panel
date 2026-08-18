<template>
  <details class="rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
    <summary class="cursor-pointer list-none px-3 py-2 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300">
      <span class="rounded bg-slate-100 px-1.5 py-0.5 font-semibold dark:bg-slate-700">DEMO</span>
      {{ t("logistics.mock.title") }}
      <span v-if="fault" class="ms-1 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {{ t(`logistics.mock.fault.${fault}`) }}
      </span>
    </summary>

    <div class="space-y-3 border-t border-slate-200 px-3 py-3 dark:border-slate-700">
      <p class="text-[11px] text-slate-500">{{ t("logistics.mock.hint") }}</p>

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[11px] font-semibold text-slate-400">{{ t("logistics.mock.faultLabel") }}</span>
        <button
          v-for="option in FAULTS"
          :key="option.key ?? 'none'"
          type="button"
          class="rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors"
          :class="fault === option.key
            ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700'"
          :aria-pressed="fault === option.key"
          @click="choose(option.key)"
        >
          {{ t(option.labelKey) }}
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button type="button" class="th-btn-outline text-xs" @click="reset">
          {{ t("logistics.mock.reset") }}
        </button>
        <span class="text-[11px] text-slate-400">{{ t("logistics.mock.resetHint") }}</span>
      </div>
    </div>
  </details>
</template>

<script setup>
  import { ref } from "vue";
  import { useI18n } from "vue-i18n";

  import { clearFault, getFault, resetMockData, setFault } from "@/api/packaging";

  /**
   * Mock kontrol paneli — yalnız FE fazında var.
   *
   * NEDEN EKRANDA:
   *   Sözleşmedeki hata kodlarının ekranda nasıl göründüğü ancak hata
   *   gerçekleşince görülebiliyor. Tetiklenemezse gözden geçirilemez ve
   *   hata ekranları tasarım incelemesinin dışında kalır
   *   (`docs/lojistik/FE-MOCK-DISIPLINI.md` §2.4).
   *
   *   `USE_MOCK` kapandığında bu bileşen de silinecek — kalıcı bir arayüz
   *   parçası değil, geliştirme aracı. `<details>` içinde kapalı duruyor ki
   *   ekranın kendi tasarımını bozmasın.
   */
  const emit = defineEmits(["changed"]);
  const { t } = useI18n();

  const FAULTS = [
    { key: null, labelKey: "logistics.mock.fault.none" },
    { key: "conflict", labelKey: "logistics.mock.fault.conflict" },
    { key: "carrier", labelKey: "logistics.mock.fault.carrier" },
    { key: "permission", labelKey: "logistics.mock.fault.permission" },
  ];

  const fault = ref(getFault());

  function choose(kind) {
    if (kind) setFault(kind);
    else clearFault();
    fault.value = kind;
    emit("changed");
  }

  function reset() {
    resetMockData();
    fault.value = null;
    emit("changed");
  }
</script>
