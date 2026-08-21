<template>
  <div>
    <!-- Sayfa başlığı + CSV — panel başlık hiyerarşisi (CatalogListScreen) -->
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ t("logistics.reports.title") }}
        </h1>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          {{ t("logistics.reports.subtitle") }}
        </p>
      </div>
      <!-- Veri yokken disabled (render edilmemiş değil): yetki sorunu değil,
           "indirilecek satır yok" durumu — buton var ama şimdi anlamsız. -->
      <button
        type="button"
        class="hdr-btn-outlined"
        :disabled="!exportable"
        @click="$emit('export')"
      >
        <AppIcon name="download" :size="14" />
        <span>{{ t("logistics.reports.downloadCsv") }}</span>
      </button>
    </div>

    <!-- Tarih aralığı raporların ÜSTÜNDE ve ortak (prototip kararı korunuyor):
         paneller aynı kesiti gösterirse karşılaştırılabilir olur. -->
    <div class="card !p-3 mb-5">
      <div class="flex flex-col lg:flex-row lg:items-end gap-3 flex-wrap">
        <div>
          <label class="form-label" for="report-from">{{ t("logistics.reports.from") }}</label>
          <input
            id="report-from"
            v-model="localFrom"
            type="date"
            class="form-input"
            :max="localTo || undefined"
            @change="emitRange"
          />
        </div>
        <div>
          <label class="form-label" for="report-to">{{ t("logistics.reports.to") }}</label>
          <input
            id="report-to"
            v-model="localTo"
            type="date"
            class="form-input"
            :min="localFrom || undefined"
            @change="emitRange"
          />
        </div>
        <!-- Hazır kısayollar: tarihleri container hesaplar ("bugün" bilgisi
             saf bileşene girmesin) — buradan yalnız gün sayısı yayılır. -->
        <div class="flex items-center gap-2 lg:ms-auto">
          <button
            v-for="preset in PRESETS"
            :key="preset.days"
            type="button"
            class="hdr-btn-outlined text-xs"
            @click="$emit('preset', preset.days)"
          >
            {{ t(preset.labelKey) }}
          </button>
        </div>
      </div>
      <!-- Ters aralık sessizce boş rapor üretirdi — emit edilmez, sebebi yazılır. -->
      <p v-if="rangeInvalid" class="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
        {{ t("logistics.reports.dateRangeInvalid") }}
      </p>
    </div>

    <!-- Panel seçimi sekme değil kart (prototip kararı korunuyor): her
         raporun hangi soruyu cevapladığı yazılı. -->
    <ul class="grid gap-3 sm:grid-cols-3 mb-5">
      <li v-for="item in panels" :key="item.key">
        <button
          type="button"
          class="w-full card !p-4 text-start transition-colors"
          :class="
            item.key === panel
              ? 'ring-2 ring-brand-400'
              : 'hover:bg-gray-50 dark:hover:bg-white/5'
          "
          :aria-pressed="item.key === panel"
          @click="$emit('panel-change', item.key)"
        >
          <span class="block text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ item.label }}
          </span>
          <span class="mt-1 block text-xs text-gray-600 dark:text-gray-400">
            {{ item.question }}
          </span>
        </button>
      </li>
    </ul>

    <!-- OPERASYON paneli kabuğun kendi içeriği; L2/L3 slot'tan geliyor
         (REPORT_PANELS — ayrı rota yok, L1 kabuğunun içinde yaşıyorlar). -->
    <template v-if="panel === 'operations'">
      <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
      <div v-else-if="loading" class="card p-5" :aria-busy="true">
        <Skeleton variant="row" :count="6" />
      </div>
      <EmptyState v-else-if="!hasOperations" :entity="t('logistics.reports.operations')" />
      <template v-else>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-5">
          <article v-for="card in totalCards" :key="card.key" class="card !p-4">
            <p class="text-xs text-gray-600 dark:text-gray-400">{{ card.label }}</p>
            <p
              class="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100"
              :class="card.tone"
            >
              {{ card.value }}
            </p>
          </article>
        </div>

        <div class="card !p-4 mb-5">
          <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            {{ t("logistics.reports.byStatus") }}
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-for="(count, status) in operations.by_status"
              :key="status"
              class="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 dark:bg-white/10 dark:text-gray-300"
            >
              {{ statusLabel(status) }}: <span class="tabular-nums font-medium">{{ count }}</span>
            </span>
          </div>
        </div>

        <div class="card p-0 overflow-x-auto">
          <table class="w-full min-w-[560px]">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="tbl-th">{{ t("logistics.reports.carrier") }}</th>
                <th class="tbl-th text-end">{{ t("logistics.reports.shipments") }}</th>
                <th class="tbl-th text-end">{{ t("logistics.reports.delivered") }}</th>
                <th class="tbl-th text-end">{{ t("logistics.reports.failed") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in operations.by_carrier"
                :key="row.carrier"
                class="border-b border-gray-50 dark:border-white/5"
              >
                <td class="tbl-td text-gray-900 dark:text-gray-100">{{ row.carrier }}</td>
                <td class="tbl-td text-end tabular-nums">{{ row.count }}</td>
                <td class="tbl-td text-end tabular-nums">{{ row.delivered }}</td>
                <td
                  class="tbl-td text-end tabular-nums"
                  :class="row.failed ? 'font-medium text-red-600 dark:text-red-400' : ''"
                >
                  {{ row.failed }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <slot v-else />
  </div>
</template>

<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";

  /**
   * **L1 · Rapor merkezi kabuğu** (TUR-121, 17-FE).
   *
   * Prototipin iki kararı korunuyor: (1) tarih aralığı panellerin ÜSTÜNDE ve
   * ortak — paneller aynı kesiti gösterirse karşılaştırılabilir olur;
   * (2) panel seçimi kart, sekme değil — her raporun hangi soruyu
   * cevapladığı yazılı. Sözleşme değişti (api/reports.js): kırılım seçici
   * yerine üç sabit panel (operasyon/performans/maliyet) var.
   *
   * Operasyon paneli kabuğun KENDİ içeriği; L2/L3 slot'tan geliyor —
   * manifest `REPORT_PANELS` kararı: rapor içerikleri L1 kabuğunun içinde,
   * ayrı rota değil.
   *
   * Saf bileşen: fetch yok, store yok. Tarih/panel değişimi emit edilir,
   * container URL query ile eşler (`?panel=&from=&to=`).
   */
  const props = defineProps({
    /** Aktif panel: operations | performance | cost. */
    panel: { type: String, default: "operations" },
    dateFrom: { type: String, default: "" },
    dateTo: { type: String, default: "" },
    /** `get_operations_report` yanıtı — yalnız operasyon panelinde okunur. */
    operations: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    /** Aktif panelde indirilecek satır var mı? (CSV butonu) */
    exportable: { type: Boolean, default: false },
  });

  const emit = defineEmits(["panel-change", "range-change", "preset", "export", "retry"]);

  const { t, te } = useI18n();

  const PRESETS = [
    { days: 7, labelKey: "logistics.reports.last7" },
    { days: 30, labelKey: "logistics.reports.last30" },
    { days: 90, labelKey: "logistics.reports.last90" },
  ];

  const panels = computed(() => [
    {
      key: "operations",
      label: t("logistics.reports.operations"),
      question: t("logistics.reports.operationsQuestion"),
    },
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

  // Tarih girdileri yerel — yalnız GEÇERLİ aralık yukarı yayılır; yarım/ters
  // girişte istek atılmaz, uyarı yazılır.
  const localFrom = ref(props.dateFrom);
  const localTo = ref(props.dateTo);
  watch(
    () => [props.dateFrom, props.dateTo],
    ([from, to]) => {
      localFrom.value = from;
      localTo.value = to;
    }
  );

  const rangeInvalid = computed(
    () => Boolean(localFrom.value && localTo.value) && localTo.value < localFrom.value
  );

  function emitRange() {
    if (!localFrom.value || !localTo.value || rangeInvalid.value) return;
    emit("range-change", { from: localFrom.value, to: localTo.value });
  }

  const hasOperations = computed(() => Boolean(props.operations?.by_carrier?.length));

  function percent(value) {
    if (value == null) return "—";
    return `${(Number(value) * 100).toFixed(1)}%`;
  }

  const totalCards = computed(() => {
    const totals = props.operations?.totals ?? {};
    return [
      { key: "shipments", label: t("logistics.reports.shipments"), value: totals.shipments, tone: "" },
      { key: "delivered", label: t("logistics.reports.delivered"), value: totals.delivered, tone: "" },
      {
        key: "failed",
        label: t("logistics.reports.failed"),
        value: totals.failed,
        tone: totals.failed ? "!text-red-600 dark:!text-red-400" : "",
      },
      { key: "cancelled", label: t("logistics.reports.cancelled"), value: totals.cancelled, tone: "" },
      { key: "onTime", label: t("logistics.reports.onTime"), value: percent(totals.on_time_rate), tone: "" },
    ];
  });

  const statusLabel = (status) =>
    te(`logistics.status.${status}`) ? t(`logistics.status.${status}`) : status;
</script>
