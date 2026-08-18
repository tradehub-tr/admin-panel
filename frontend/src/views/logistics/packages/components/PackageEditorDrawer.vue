<template>
  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-bold uppercase tracking-wide text-slate-400">
        {{ t("logistics.packing.editPackage", { code: pkg.package_code || pkg.sequence_label }) }}
      </h3>
      <button type="button" class="th-btn-outline text-xs" @click="$emit('close')">
        {{ t("logistics.packing.closeEditor") }}
      </button>
    </div>

    <div class="mt-3 space-y-3">
      <label class="block">
        <span class="mb-1 block text-[11px] font-semibold text-slate-500">
          {{ t("logistics.package.type") }}
        </span>
        <AppSelect :model-value="pkg.package_type" :options="typeOptions" @update:model-value="applyPreset" />
      </label>

      <div class="grid grid-cols-3 gap-2">
        <label v-for="dim in DIMENSIONS" :key="dim.key" class="block">
          <span class="mb-1 block text-[11px] font-semibold text-slate-500">{{ t(dim.label) }}</span>
          <input
            :value="pkg[dim.key]"
            type="number"
            min="0"
            step="0.1"
            class="form-input w-full py-1 text-sm tabular-nums"
            @input="patch(dim.key, $event.target.value)"
          />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold text-slate-500">
            {{ t("logistics.package.weight") }} (kg)
          </span>
          <input
            :value="pkg.weight_kg"
            type="number"
            min="0"
            step="0.1"
            class="form-input w-full py-1 text-sm tabular-nums"
            :class="overWeight ? 'border-red-400' : ''"
            @input="patch('weight_kg', $event.target.value)"
          />
          <span v-if="overWeight" class="mt-1 block text-[11px] text-red-600 dark:text-red-400">
            {{ t("logistics.packing.overTypeWeight", { label: typeLabel, max: activeType.max_weight_kg }) }}
          </span>
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold text-slate-500">
            {{ t("logistics.packing.identicalQty") }}
          </span>
          <input
            :value="pkg.qty"
            type="number"
            min="1"
            step="1"
            class="form-input w-full py-1 text-sm tabular-nums"
            @input="patch('qty', $event.target.value)"
          />
        </label>
      </div>

      <!-- Desi ANINDA: operatör ölçüyü girerken görmeli. Kaydedip sunucudan
           öğrenmek "34 kg girdim, meğer limit aşılmış" durumunu kaydın
           sonrasına atardı. Otorite yine sunucuda (utils/desi.js başlığı). -->
      <p class="flex items-start gap-2 rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        <span aria-hidden="true">∑</span>
        <span>
          {{ t("logistics.package.desi") }} <b class="tabular-nums">{{ desi }}</b> ·
          {{ t("logistics.packing.chargeable") }} <b class="tabular-nums">{{ chargeable }} kg</b>
          <span class="mt-0.5 block opacity-80">
            {{ t("logistics.packing.desiFormula", { l: pkg.length_cm, w: pkg.width_cm, h: pkg.height_cm, divisor }) }}
          </span>
        </span>
      </p>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";
  import { DEFAULT_DESI_DIVISOR, calculateDesi, chargeableWeight } from "@/utils/desi";

  /**
   * Koli düzenleme formu.
   *
   * Kendi taslağını TUTMUYOR — her değişiklik `update` ile yukarı gidiyor.
   * Yerel kopya tutmak, aynı koli tarama ile de değiştiğinde (okutulan ürün
   * içeriğe eklenir) iki kaynak arasında kayma üretirdi.
   */
  const props = defineProps({
    /** `decoratePackages` çıktısındaki satır. */
    pkg: { type: Object, required: true },
    packageTypes: { type: Array, default: () => [] },
    divisor: { type: Number, default: DEFAULT_DESI_DIVISOR },
  });

  const emit = defineEmits(["update", "close"]);
  const { t } = useI18n();

  const DIMENSIONS = [
    { key: "length_cm", label: "logistics.packing.length" },
    { key: "width_cm", label: "logistics.packing.width" },
    { key: "height_cm", label: "logistics.packing.height" },
  ];

  const typeOptions = computed(() =>
    props.packageTypes.map((type) => ({
      value: type.name,
      label: `${type.package_name} — ${type.length_cm}×${type.width_cm}×${type.height_cm} cm, max ${type.max_weight_kg} kg`,
    }))
  );

  const activeType = computed(
    () => props.packageTypes.find((x) => x.name === props.pkg.package_type) ?? {}
  );
  const typeLabel = computed(() => activeType.value.package_name ?? props.pkg.package_type ?? "");

  const desi = computed(() =>
    calculateDesi(props.pkg.length_cm, props.pkg.width_cm, props.pkg.height_cm, props.divisor)
  );
  const chargeable = computed(() => chargeableWeight(props.pkg.weight_kg, desi.value));

  const overWeight = computed(
    () => activeType.value.max_weight_kg > 0 && Number(props.pkg.weight_kg) > activeType.value.max_weight_kg
  );

  function patch(key, value) {
    emit("update", { [key]: Number(value) || 0 });
  }

  /**
   * Preset seçimi ölçüleri DOLDURUR.
   *
   * Katalog zaten bu bilgiyi taşıyor (`Package Type`); operatöre standart bir
   * kolinin ölçülerini elle yazdırmak hem yavaş hem hataya açık.
   */
  function applyPreset(typeName) {
    const type = props.packageTypes.find((x) => x.name === typeName);
    if (!type) return emit("update", { package_type: typeName });
    emit("update", {
      package_type: typeName,
      length_cm: type.length_cm,
      width_cm: type.width_cm,
      height_cm: type.height_cm,
    });
  }
</script>
