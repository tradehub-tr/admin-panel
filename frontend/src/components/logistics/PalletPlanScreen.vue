<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.pallet.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.pallet.subtitle", { shipment: shipmentName }) }}
        </p>
      </div>
      <button v-if="can.write" type="button" class="ms-auto th-btn-outline text-sm" @click="$emit('add-pallet')">
        {{ t("logistics.pallet.addPallet") }}
      </button>
    </header>

    <!-- TUR-120: aşırı yük UYARISI. Palet kapasitesi aşılmış bir plan
         depoda değil, yükleme sırasında fark edilirse araç geri döner. -->
    <div
      v-if="overloaded.length"
      class="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
      role="alert"
    >
      {{ t("logistics.pallet.overloadWarning", { pallets: overloaded.map((p) => p.pallet_code).join(", ") }) }}
    </div>

    <p v-if="!rows.length" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.pallet.empty") }}
    </p>

    <ul v-else class="grid gap-3 sm:grid-cols-2">
      <li
        v-for="pallet in rows"
        :key="pallet.pallet_code"
        class="rounded-lg border p-4"
        :class="pallet.is_overloaded ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-700'"
      >
        <div class="flex flex-wrap items-center gap-2">
          <code class="font-mono text-sm font-semibold">{{ pallet.pallet_code }}</code>
          <span class="text-xs text-slate-500">{{ pallet.pallet_type }}</span>
          <span class="ms-auto text-xs text-slate-500">
            {{ t("logistics.pallet.packageCount", { count: pallet.package_count }) }}
          </span>
        </div>

        <!-- İki ayrı kapasite: ağırlık VE katman. Biri dolmadan diğeri
             dolabilir — hafif ama hacimli yük paleti katmandan taşırır. -->
        <div class="mt-3 space-y-2">
          <div v-for="gauge in gauges(pallet)" :key="gauge.key">
            <div class="flex items-baseline justify-between text-xs">
              <span class="text-slate-500">{{ gauge.label }}</span>
              <span class="tabular-nums" :class="gauge.exceeded ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-500'">
                {{ gauge.text }}
              </span>
            </div>
            <div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                class="h-full rounded-full"
                :class="gauge.exceeded ? 'bg-red-500' : gauge.percent > 85 ? 'bg-amber-500' : 'bg-indigo-500'"
                :style="{ width: `${Math.min(100, gauge.percent)}%` }"
              />
            </div>
          </div>
        </div>

        <p class="mt-2 text-xs text-slate-500">
          {{ t("logistics.pallet.loadedDesi") }}: <span class="tabular-nums">{{ pallet.loaded_desi }}</span>
        </p>

        <div v-if="can.write" class="mt-3 flex gap-2">
          <button type="button" class="th-btn-outline text-xs" @click="$emit('edit-pallet', pallet)">
            {{ t("logistics.legOps.edit") }}
          </button>
        </div>
      </li>
    </ul>

    <dl v-if="rows.length" class="grid gap-3 sm:grid-cols-3">
      <div v-for="total in totals" :key="total.key" class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <dt class="text-xs text-slate-500">{{ total.label }}</dt>
        <dd class="mt-1 text-lg font-semibold tabular-nums">{{ total.value }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * **G3 · Paket/palet planlama** (TUR-120).
   *
   * İki kapasite ayrı ayrı izleniyor: ağırlık ve katman. Hafif ama hacimli
   * yük paleti katmandan taşırırken ağırlık göstergesi yeşil kalır — tek
   * bir "doluluk" çubuğu bu durumu gizlerdi.
   *
   * `is_overloaded` bayrağı sözleşmeden geliyor; ekran onu yeniden
   * hesaplamıyor, çünkü kapasite kuralı backend'in kararı.
   */
  const props = defineProps({
    shipmentName: { type: String, required: true },
    /** `pallet_plan` sözleşmesindeki satırlar. */
    rows: { type: Array, default: () => [] },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["add-pallet", "edit-pallet"]);

  const { t } = useI18n();

  const overloaded = computed(() => props.rows.filter((p) => p.is_overloaded));

  function gauges(pallet) {
    const weightMax = Number(pallet.max_weight_kg) || 0;
    const weightLoaded = Number(pallet.loaded_weight_kg) || 0;
    const layerMax = Number(pallet.max_layers) || 0;
    const layerLoaded = Number(pallet.layer_count) || 0;
    return [
      {
        key: "weight",
        label: t("logistics.pallet.weight"),
        text: `${weightLoaded} / ${weightMax} kg`,
        percent: weightMax ? (weightLoaded / weightMax) * 100 : 0,
        exceeded: weightMax > 0 && weightLoaded > weightMax,
      },
      {
        key: "layers",
        label: t("logistics.pallet.layers"),
        text: `${layerLoaded} / ${layerMax}`,
        percent: layerMax ? (layerLoaded / layerMax) * 100 : 0,
        exceeded: layerMax > 0 && layerLoaded > layerMax,
      },
    ];
  }

  const totals = computed(() => [
    { key: "pallets", label: t("logistics.pallet.totalPallets"), value: props.rows.length },
    {
      key: "packages",
      label: t("logistics.pallet.totalPackages"),
      value: props.rows.reduce((sum, p) => sum + Number(p.package_count ?? 0), 0),
    },
    {
      key: "weight",
      label: t("logistics.pallet.totalWeight"),
      value: `${props.rows.reduce((sum, p) => sum + Number(p.loaded_weight_kg ?? 0), 0).toFixed(1)} kg`,
    },
  ]);
</script>
