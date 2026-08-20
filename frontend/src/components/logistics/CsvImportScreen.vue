<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.import.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ t("logistics.import.subtitle") }}</p>
    </header>

    <!-- Adım göstergesi: sihirbazın hangi adımda olduğu ve NE KALDIĞI -->
    <ol class="flex flex-wrap gap-2" :aria-label="t('logistics.import.stepsLabel')">
      <li
        v-for="(step, index) in steps"
        :key="step.key"
        class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        :class="stepClass(step)"
        :aria-current="step.key === activeStep ? 'step' : undefined"
      >
        <span
          class="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold"
          :class="step.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-600'"
        >
          {{ step.done ? "✓" : index + 1 }}
        </span>
        {{ step.label }}
      </li>
    </ol>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <!-- 1 · Yükle -->
    <section v-else-if="activeStep === 'upload'" class="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
      <p class="text-sm font-medium">{{ t("logistics.import.dropTitle") }}</p>
      <p class="mt-1 text-xs text-slate-500">{{ t("logistics.import.dropHint") }}</p>
      <button type="button" class="th-btn-primary mt-4 text-sm" @click="$emit('pick-file')">
        {{ t("logistics.import.pickFile") }}
      </button>
    </section>

    <!-- 2 · Eşle -->
    <section v-else-if="activeStep === 'mapping'" class="space-y-3">
      <h2 class="text-sm font-semibold">{{ t("logistics.import.mappingTitle") }}</h2>
      <p class="text-xs text-slate-500">{{ t("logistics.import.mappingHint") }}</p>
      <div class="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
        <div v-for="(field, column) in job.column_mapping" :key="column" class="flex flex-wrap items-center gap-3 p-3">
          <code class="min-w-40 text-xs">{{ column }}</code>
          <span aria-hidden="true" class="text-slate-400">→</span>
          <AppSelect
            :model-value="field"
            :options="targetFieldOptions"
            class="min-w-52"
            @update:model-value="$emit('map-column', { column, field: $event })"
          />
        </div>
      </div>
      <!-- Eşlenmemiş zorunlu alan varsa önizlemeye geçilemez: eksik eşleme
           ancak uygulama sırasında patlarsa 128 satır yarım yazılır. -->
      <p v-if="unmappedRequired.length" class="text-xs text-red-600 dark:text-red-400" role="alert">
        {{ t("logistics.import.unmappedRequired", { fields: unmappedRequired.join(", ") }) }}
      </p>
    </section>

    <!-- 3 · Önizle -->
    <section v-else-if="activeStep === 'preview'" class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <article v-for="card in previewCards" :key="card.key" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p class="text-xs text-slate-500">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-semibold tabular-nums" :class="card.tone">{{ card.value }}</p>
        </article>
      </div>

      <!-- Hatalı satırlar SATIR NUMARASIYLA: kullanıcı CSV'sini açıp
           düzeltebilmeli. "4 satır hatalı" tek başına işe yaramaz. -->
      <div v-if="job.errors?.length" class="space-y-2">
        <h2 class="text-sm font-semibold">{{ t("logistics.import.errorList") }}</h2>
        <ul class="divide-y divide-red-100 rounded-lg border border-red-200 dark:divide-red-900/40 dark:border-red-800">
          <li v-for="err in job.errors" :key="`${err.row}-${err.column}`" class="flex flex-wrap gap-2 p-3 text-sm">
            <span class="font-mono text-xs text-red-700 dark:text-red-400">
              {{ t("logistics.import.row", { row: err.row }) }}
            </span>
            <code class="text-xs text-slate-500">{{ err.column }}</code>
            <span class="text-slate-700 dark:text-slate-200">{{ err.message }}</span>
          </li>
        </ul>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button type="button" class="th-btn-primary text-sm" :disabled="!job.valid_rows" @click="$emit('apply')">
          {{ t("logistics.import.applyValid", { count: job.valid_rows ?? 0 }) }}
        </button>
        <span v-if="job.error_rows" class="text-xs text-slate-500">
          {{ t("logistics.import.errorsSkipped", { count: job.error_rows }) }}
        </span>
      </div>
    </section>

    <!-- 4 · Uygula / sonuç -->
    <section v-else class="space-y-4">
      <div v-if="job.status === 'applying'" class="space-y-2">
        <p class="text-sm">{{ t("logistics.import.applying") }}</p>
        <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div class="h-full rounded-full bg-indigo-500" :style="{ width: `${appliedPercent}%` }" />
        </div>
        <p class="text-xs tabular-nums text-slate-500">
          {{ job.applied_rows ?? 0 }} / {{ job.valid_rows ?? 0 }}
        </p>
      </div>

      <BulkResultSummary
        v-else
        :succeeded="job.applied_rows ?? 0"
        :failed="failedRows"
      />
    </section>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";

  import BulkResultSummary from "./BulkResultSummary.vue";
  import ErrorState from "./ErrorState.vue";

  /**
   * **C3 · CSV toplu içe aktarma** (TUR-107).
   *
   * Dört adım: yükle → eşle → önizle → uygula. Önizleme adımı bilinçli
   * olarak zorunlu — 128 satırlık bir dosyayı görmeden yazmak, hatayı
   * ancak yazdıktan sonra fark etmek demek.
   *
   * Hata raporu SATIR NUMARASI taşıyor; kullanıcı kendi CSV'sinde bulup
   * düzeltebilmeli.
   */
  const props = defineProps({
    /** `import_job` sözleşmesi. */
    job: { type: Object, default: () => ({}) },
    /** Eşlenebilir hedef alanlar: `[{ value, label, required }]` */
    targetFields: { type: Array, default: () => [] },
    error: { type: Object, default: null },
  });

  defineEmits(["pick-file", "map-column", "apply", "retry"]);

  const { t } = useI18n();

  const STEP_KEYS = ["upload", "mapping", "preview", "apply"];

  /** Sözleşmedeki `status` → sihirbaz adımı. */
  const STATUS_TO_STEP = {
    mapping: "mapping",
    previewing: "preview",
    applying: "apply",
    completed: "apply",
    failed: "apply",
  };

  const activeStep = computed(() => STATUS_TO_STEP[props.job.status] ?? "upload");

  const steps = computed(() => {
    const activeIndex = STEP_KEYS.indexOf(activeStep.value);
    return STEP_KEYS.map((key, index) => ({
      key,
      label: t(`logistics.import.step.${key}`),
      done: index < activeIndex || (key === "apply" && props.job.status === "completed"),
      active: key === activeStep.value,
    }));
  });

  function stepClass(step) {
    if (step.active) return "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30";
    if (step.done) return "border-emerald-300 dark:border-emerald-800";
    return "border-slate-200 text-slate-400 dark:border-slate-700";
  }

  const targetFieldOptions = computed(() => [
    { value: "", label: t("logistics.import.skipColumn") },
    ...props.targetFields.map((f) => ({ value: f.value, label: f.label })),
  ]);

  const unmappedRequired = computed(() => {
    const mapped = new Set(Object.values(props.job.column_mapping ?? {}));
    return props.targetFields.filter((f) => f.required && !mapped.has(f.value)).map((f) => f.label);
  });

  const previewCards = computed(() => [
    { key: "total", label: t("logistics.import.totalRows"), value: props.job.total_rows ?? 0, tone: "" },
    {
      key: "valid",
      label: t("logistics.import.validRows"),
      value: props.job.valid_rows ?? 0,
      tone: "text-emerald-700 dark:text-emerald-400",
    },
    {
      key: "error",
      label: t("logistics.import.errorRows"),
      value: props.job.error_rows ?? 0,
      tone: (props.job.error_rows ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "",
    },
  ]);

  const appliedPercent = computed(() => {
    const valid = Number(props.job.valid_rows ?? 0);
    return valid ? Math.min(100, (Number(props.job.applied_rows ?? 0) / valid) * 100) : 0;
  });

  /** Sonuç özeti satır hatalarını "kayıt adı + mesaj" biçiminde bekliyor. */
  const failedRows = computed(() =>
    (props.job.errors ?? []).map((err) => ({
      name: t("logistics.import.row", { row: err.row }),
      message: `${err.column}: ${err.message}`,
    }))
  );
</script>
