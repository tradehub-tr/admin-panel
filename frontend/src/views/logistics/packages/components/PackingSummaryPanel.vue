<template>
  <aside class="space-y-4">
    <section class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <h2 class="text-xs font-bold uppercase tracking-wide text-slate-400">
        {{ t("logistics.packing.totals") }}
      </h2>
      <dl class="mt-3 grid grid-cols-2 gap-3">
        <div v-for="metric in metrics" :key="metric.key">
          <dt class="text-[11px] text-slate-400">{{ metric.label }}</dt>
          <dd class="mt-0.5 text-lg font-semibold tabular-nums">{{ metric.value }}</dd>
        </div>
      </dl>
      <p class="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
        {{ t("logistics.packing.chargeableHint") }}
      </p>
    </section>

    <section class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-bold uppercase tracking-wide text-slate-400">
          {{ t("logistics.packing.validation") }}
        </h2>
        <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="badgeClass">
          {{ badgeLabel }}
        </span>
      </div>

      <ul class="mt-3 space-y-2">
        <li
          v-if="!validation.findings.length"
          class="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
        >
          <span aria-hidden="true">✓</span>
          <span>{{ t("logistics.packing.noFindings") }}</span>
        </li>
        <li
          v-for="(finding, i) in validation.findings"
          :key="`${finding.code}-${finding.package_code ?? i}`"
          class="flex items-start gap-2 rounded border p-2 text-xs"
          :class="findingClass(finding.level)"
        >
          <span aria-hidden="true">{{ finding.level === "error" ? "⛔" : finding.level === "warning" ? "⚠" : "ℹ" }}</span>
          <span>{{ finding.message }}</span>
        </li>
      </ul>
    </section>

    <section v-if="canWrite" class="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <!-- Kaydetme doğrulamaya BAKMIYOR: depoda iş yarım kalır, girilen
           ölçüleri çöpe atmak operatörü baştan başlatır. "Tamamla" ayrı kapı. -->
      <button
        type="button"
        class="th-btn-outline w-full justify-center text-sm"
        :disabled="saving || !dirty"
        @click="$emit('save')"
      >
        {{ saving ? t("logistics.packing.saving") : dirty ? t("logistics.packing.saveDraft") : t("logistics.packing.saved") }}
      </button>
      <button
        type="button"
        class="th-btn-primary w-full justify-center text-sm"
        :disabled="saving || !validation.canComplete"
        @click="$emit('complete')"
      >
        {{ t("logistics.packing.complete") }}
      </button>
      <p class="text-center text-[11px] text-slate-400">
        {{ validation.canComplete ? t("logistics.packing.completeHint") : t("logistics.packing.blockedHint") }}
      </p>
    </section>
  </aside>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * A2 düzeninin üçüncü bölgesi — özet + doğrulama.
   *
   * Doğrulama listesi SÜREKLİ görünür. A1'de (iki sütun) bu bilgi tek satırlık
   * bir banner'a sığmıyordu ve "hangi koli neden hatalı" sorusu ikinci bir
   * tıklama istiyordu. Paketleme hatası kargo şubesinde ortaya çıkıyor —
   * geç fark edilmesi pahalı.
   */
  const props = defineProps({
    /** `calculateTotals` çıktısı. */
    totals: { type: Object, required: true },
    /** `validatePacking` çıktısı. */
    validation: { type: Object, required: true },
    canWrite: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    dirty: { type: Boolean, default: false },
  });

  defineEmits(["save", "complete"]);
  const { t } = useI18n();

  const metrics = computed(() => [
    { key: "count", label: t("logistics.packing.packages"), value: props.totals.parcel_count },
    { key: "weight", label: t("logistics.package.weight"), value: `${props.totals.total_weight} kg` },
    { key: "desi", label: t("logistics.package.desi"), value: props.totals.total_desi },
    { key: "charge", label: t("logistics.packing.chargeable"), value: `${props.totals.chargeable_weight} kg` },
  ]);

  const badgeLabel = computed(() => {
    if (props.validation.errorCount) return t("logistics.packing.blockerCount", { count: props.validation.errorCount });
    if (props.validation.warningCount) return t("logistics.packing.warningCount", { count: props.validation.warningCount });
    return t("logistics.packing.clean");
  });

  const badgeClass = computed(() => {
    if (props.validation.errorCount) return "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
    if (props.validation.warningCount) return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400";
  });

  function findingClass(level) {
    if (level === "error") return "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300";
    if (level === "warning") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300";
    return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
  }
</script>
