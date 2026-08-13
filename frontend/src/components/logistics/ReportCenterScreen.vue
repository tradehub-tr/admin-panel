<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.reports.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ t("logistics.reports.subtitle") }}</p>
    </header>

    <!-- Filtreler raporun ÜSTÜNDE ve ortak: iki rapor da aynı kesiti
         gösterirse karşılaştırılabilir olur. Her rapora ayrı filtre
         koymak, "hangi tarih aralığındaydı" sorusunu doğurur. -->
    <form class="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-4 dark:border-slate-700" @submit.prevent="apply">
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.reports.from") }}</span>
        <input v-model="filters.from_date" type="date" class="form-input" :max="filters.to_date || undefined" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.reports.to") }}</span>
        <input v-model="filters.to_date" type="date" class="form-input" :min="filters.from_date || undefined" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.reports.dimension") }}</span>
        <AppSelect v-model="filters.dimension" :options="dimensionOptions" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.manual.carrier") }}</span>
        <LinkInput v-model="filters.carrier" doctype="Logistics Provider" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.reports.seller") }}</span>
        <LinkInput v-model="filters.seller_profile" doctype="Admin Seller Profile" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.reports.method") }}</span>
        <LinkInput v-model="filters.shipping_method" doctype="Shipping Method" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">{{ t("logistics.reports.status") }}</span>
        <AppSelect v-model="filters.status" :options="statusOptions" />
      </label>
      <div class="flex items-end gap-2">
        <button type="submit" class="th-btn-primary text-sm" :disabled="dateRangeInvalid">
          {{ t("logistics.reports.apply") }}
        </button>
        <button type="button" class="th-btn-outline text-sm" @click="reset">
          {{ t("logistics.reports.reset") }}
        </button>
      </div>
    </form>

    <p v-if="dateRangeInvalid" class="text-xs text-red-600 dark:text-red-400" role="alert">
      {{ t("logistics.reports.dateRangeInvalid") }}
    </p>

    <!-- Rapor seçimi sekme değil kart: her raporun ne cevapladığı yazılı.
         "Performans" ve "Maliyet" başlıkları tek başına ayrımı anlatmıyor. -->
    <ul class="grid gap-3 sm:grid-cols-2">
      <li v-for="report in reports" :key="report.key">
        <button
          type="button"
          class="w-full rounded-lg border p-4 text-start transition-colors"
          :class="
            report.key === activeReport
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
          "
          :aria-pressed="report.key === activeReport"
          @click="$emit('select-report', report.key)"
        >
          <span class="block text-sm font-medium">{{ report.label }}</span>
          <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">{{ report.question }}</span>
        </button>
      </li>
    </ul>

    <!-- Uygulanan filtreler ÖZETİ: dışa aktarılan bir raporun hangi kesit
         olduğu, dosyanın kendisinden anlaşılmalı. -->
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-slate-500">{{ t("logistics.reports.activeFilters") }}:</span>
      <span
        v-for="chip in activeChips"
        :key="chip.key"
        class="rounded bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-700"
      >
        {{ chip.label }}
      </span>
      <span v-if="!activeChips.length" class="text-[11px] text-slate-400">
        {{ t("logistics.reports.noFilters") }}
      </span>
      <button type="button" class="ms-auto th-btn-outline text-xs" @click="$emit('export', { ...filters, report: activeReport })">
        {{ t("logistics.reports.export") }}
      </button>
    </div>

    <slot :filters="filters" :report="activeReport" />
  </div>
</template>

<script setup>
  import { computed, reactive } from "vue";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";
  import LinkInput from "@/components/common/LinkInput.vue";

  import { REPORT_DIMENSIONS, SHIPMENT_STATUS_TONE } from "./constants";

  /**
   * **L1 · Rapor merkezi** (TUR-118).
   *
   * Filtreler raporların ÜSTÜNDE ve ortak: iki rapor aynı kesiti
   * gösterdiğinde karşılaştırılabilir olur. Her rapora ayrı filtre koymak
   * "hangi tarih aralığındaydı" sorusunu doğurur.
   *
   * Rapor içerikleri slot'tan geliyor; bu ekran kabuk ve filtre sahibi.
   */
  const props = defineProps({
    activeReport: { type: String, default: "performance" },
    /** Başlangıç filtreleri (URL'den gelebilir). */
    initialFilters: { type: Object, default: () => ({}) },
  });

  const emit = defineEmits(["apply", "select-report", "export"]);

  const { t, te } = useI18n();

  const DEFAULTS = {
    from_date: "",
    to_date: "",
    dimension: "carrier",
    carrier: "",
    seller_profile: "",
    shipping_method: "",
    status: "",
  };

  const filters = reactive({ ...DEFAULTS, ...props.initialFilters });

  const reports = computed(() => [
    {
      key: "performance",
      label: t("logistics.reports.performance"),
      question: t("logistics.reports.performanceQuestion"),
    },
    {
      key: "cost",
      label: t("logistics.reports.cost"),
      question: t("logistics.reports.costQuestion"),
    },
  ]);

  const dimensionOptions = computed(() =>
    REPORT_DIMENSIONS.map((value) => ({ value, label: t(`logistics.dimension.${value}`) }))
  );

  const statusOptions = computed(() => [
    { value: "", label: t("logistics.shipment.allStatuses") },
    ...Object.keys(SHIPMENT_STATUS_TONE).map((value) => ({
      value,
      label: te(`logistics.status.${value}`) ? t(`logistics.status.${value}`) : value,
    })),
  ]);

  /** Ters tarih aralığı sessizce boş rapor üretirdi — uygulama engelleniyor. */
  const dateRangeInvalid = computed(
    () => Boolean(filters.from_date && filters.to_date) && filters.to_date < filters.from_date
  );

  const activeChips = computed(() =>
    Object.entries(filters)
      .filter(([key, value]) => value && value !== DEFAULTS[key])
      .map(([key, value]) => ({ key, label: `${t(`logistics.reports.filter.${key}`)}: ${value}` }))
  );

  function apply() {
    if (dateRangeInvalid.value) return;
    emit("apply", { ...filters });
  }

  function reset() {
    Object.assign(filters, DEFAULTS);
    emit("apply", { ...filters });
  }
</script>
