<template>
  <div class="space-y-4">
    <p v-if="store.isLocked" class="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.label.lockedBand") }}
    </p>

    <header class="flex flex-wrap items-start gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.label.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          <code class="font-mono">{{ shipmentName }}</code>
          <template v-if="store.shipment"> · {{ store.shipment.buyer_name }}</template>
        </p>
      </div>
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <button type="button" class="th-btn-outline text-sm" @click="goPacking">
          {{ t("logistics.label.backToPacking") }}
        </button>
        <button type="button" class="th-btn-outline text-sm" :disabled="!packageRows.length" @click="openSlip">
          {{ t("logistics.label.packingSlip") }}
        </button>
        <button
          v-if="can.generate"
          type="button"
          class="th-btn-outline text-sm"
          :disabled="!generatable.length || store.saving"
          @click="generateSelected"
        >
          {{ t("logistics.label.generateSelected", { count: generatable.length }) }}
        </button>
        <button
          v-if="can.reprint"
          type="button"
          class="th-btn-outline text-sm"
          :disabled="!printable.length || store.saving"
          @click="printSelected"
        >
          {{ t("logistics.label.printSelected", { count: printable.length }) }}
        </button>
        <!-- Akışın SON adımı: etiketler tamamsa sevkiyat kuyruktan çıkar. -->
        <button
          v-if="can.generate"
          type="button"
          class="th-btn-primary text-sm"
          :disabled="!readiness.isReady || store.saving || isReady"
          :title="readiness.isReady ? '' : t('logistics.label.notReadyHint')"
          @click="markReady"
        >
          {{ isReady ? t("logistics.label.alreadyReady") : t("logistics.label.markReady") }}
        </button>
      </div>
    </header>

    <ErrorState v-if="store.error" :error="store.error" @retry="reload" />

    <div v-else-if="store.loading" class="space-y-2" aria-busy="true">
      <Skeleton variant="row" :count="5" />
    </div>

    <!-- Koli yokken etiket ekranı anlamsız — kullanıcıyı paketlemeye yolla. -->
    <div
      v-else-if="!packageRows.length"
      class="rounded-lg border border-dashed border-slate-300 py-12 text-center dark:border-slate-600"
    >
      <p class="text-sm font-medium">{{ t("logistics.label.noPackagesTitle") }}</p>
      <p class="mt-1 text-xs text-slate-500">{{ t("logistics.label.noPackagesHint") }}</p>
      <button type="button" class="th-btn-primary mt-4 text-xs" @click="goPacking">
        {{ t("logistics.label.goPacking") }}
      </button>
    </div>

    <template v-else>
      <div
        v-if="readiness.missing.length"
        class="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
        role="alert"
      >
        <span aria-hidden="true">⚠</span>
        <span>
          <b>{{ t("logistics.package.unlabeledWarning", { count: readiness.missing.length }) }}</b>
          <span class="mt-0.5 block text-xs opacity-85">{{ t("logistics.label.notReadyHint") }}</span>
        </span>
      </div>
      <div
        v-else-if="readiness.stale.length"
        class="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
        role="alert"
      >
        <span aria-hidden="true">⚠</span>
        <span>{{ t("logistics.label.staleWarning", { count: readiness.stale.length }) }}</span>
      </div>

      <div class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <span class="text-xs font-bold uppercase tracking-wide text-slate-400">
          {{ t("logistics.label.format.title") }}
        </span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="fmt in LABEL_FORMATS"
            :key="fmt.key"
            type="button"
            class="rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors"
            :class="format === fmt.key
              ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
              : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700'"
            :aria-pressed="format === fmt.key"
            @click="setFormat(fmt.key)"
          >
            {{ t(fmt.labelKey) }}
          </button>
        </div>
        <span class="text-[11px] text-slate-400">{{ t("logistics.label.format.hint") }}</span>
      </div>

      <!-- C2 · tablo + yan önizleme -->
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <table class="w-full text-sm">
            <thead class="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-700">
              <tr>
                <th class="w-10 p-3">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    :indeterminate.prop="someSelected"
                    :aria-label="t('logistics.label.selectAll')"
                    @change="toggleAll"
                  />
                </th>
                <th class="p-3 text-start">{{ t("logistics.packing.packages") }}</th>
                <th class="p-3 text-start">{{ t("logistics.package.type") }}</th>
                <th class="p-3 text-end">kg</th>
                <th class="p-3 text-end">{{ t("logistics.package.desi") }}</th>
                <th class="p-3 text-start">{{ t("logistics.package.label") }}</th>
                <th class="p-3 text-start">{{ t("logistics.package.printedAt") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(pkg, index) in packageRows"
                :key="pkg.package_code ?? index"
                class="cursor-pointer border-b border-slate-100 transition-colors last:border-0 dark:border-slate-800"
                :class="index === activeIndex ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'"
                @click="activeIndex = index"
              >
                <td class="p-3" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selection.includes(pkg.package_code)"
                    :disabled="!pkg.package_code"
                    :aria-label="pkg.package_code ?? ''"
                    @change="toggle(pkg.package_code)"
                  />
                </td>
                <td class="p-3">
                  <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {{ pkg.sequence_label }}
                  </span>
                  <code class="ms-2 font-mono text-xs">{{ pkg.package_code ?? "—" }}</code>
                </td>
                <td class="p-3 text-xs text-slate-500">{{ typeLabel(pkg) }}</td>
                <td class="p-3 text-end tabular-nums">{{ pkg.weight_kg }}</td>
                <td class="p-3 text-end tabular-nums" :class="pkg.is_desi_dominant ? 'font-semibold text-amber-600 dark:text-amber-400' : ''">
                  {{ pkg.desi }}
                </td>
                <td class="p-3">
                  <StatusBadge
                    :status="statusOf(pkg)"
                    kind="severity"
                    :tone="LABEL_STATUS[statusOf(pkg)]?.tone"
                    :label="t(LABEL_STATUS[statusOf(pkg)]?.labelKey ?? 'logistics.label.status.none')"
                  />
                </td>
                <td class="p-3 text-xs text-slate-500">
                  <span v-if="pkg.label?.printed_at">
                    {{ pkg.label.printed_at }}
                    <span v-if="pkg.label.print_count > 1" class="ms-1 text-amber-600 dark:text-amber-400">
                      ({{ pkg.label.print_count }}×)
                    </span>
                  </span>
                  <span v-else class="text-slate-300 dark:text-slate-600">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <LabelPreview
          v-if="activePackage"
          :pkg="activePackage"
          :can-write="can.generate"
          :can-void="can.void"
          @generate="generateOne"
          @void="voidOne"
        />
      </div>
    </template>

    <ReprintReasonDialog
      :open="reprintDialog"
      :package-codes="printable"
      :max-print-count="maxPrintCount"
      @confirm="doReprint"
      @cancel="reprintDialog = false"
    />
  </div>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import StatusBadge from "@/components/logistics/StatusBadge.vue";
  import { useLogisticsStore } from "@/stores/logistics";
  import { usePackagingStore } from "@/stores/packaging";
  import LabelPreview from "./components/LabelPreview.vue";
  import ReprintReasonDialog from "./components/ReprintReasonDialog.vue";
  import {
    LABEL_FORMATS,
    LABEL_STATUS,
    labelReadiness,
    loadFormat,
    needsReprintReason,
    saveFormat,
    statusOf,
  } from "./labelFormats";

  /**
   * **P3 · Etiket ve belgeler** — C2 düzeni (tablo + yan önizleme),
   * D2 yeniden basım kuralı.
   *
   * Çalışma alanıyla AYNI yükü kullanıyor (`get_shipment_packing`): koli
   * bilgisi iki uçtan gelirse ikisi arasında kayma olur ve etiket ekranı
   * bayat ağırlık basar.
   */
  const store = usePackagingStore();
  const logisticsStore = useLogisticsStore();
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const selection = ref([]);
  const activeIndex = ref(0);
  const format = ref(loadFormat());
  const reprintDialog = ref(false);

  const shipmentName = computed(() => route.params.name);
  const packageRows = computed(() => store.packageRows);
  const activePackage = computed(() => packageRows.value[activeIndex.value] ?? null);
  const readiness = computed(() => labelReadiness(packageRows.value));
  const isReady = computed(() => store.shipment?.status === "Ready for Pickup");

  // Terminal durumda sunucu da reddediyor — buton çizmemek doğru davranış.
  const can = computed(() => ({
    generate: logisticsStore.can.generateLabel && !store.isLocked,
    reprint: logisticsStore.can.reprintLabel && !store.isLocked,
    // Void taşıyıcıya GERİ ALINAMAZ istek gönderiyor — satıcıya kapalı.
    void: logisticsStore.can.voidLabel && !store.isLocked,
  }));

  const selectedPackages = computed(() =>
    packageRows.value.filter((p) => selection.value.includes(p.package_code))
  );
  /** Etiketi olmayan seçililer — "üret" bunlara gider. */
  const generatable = computed(() =>
    selectedPackages.value.filter((p) => !p.label?.url).map((p) => p.package_code)
  );
  /** Etiketi olan seçililer — "yazdır" bunlara gider. */
  const printable = computed(() =>
    selectedPackages.value.filter((p) => p.label?.url).map((p) => p.package_code)
  );

  const maxPrintCount = computed(() =>
    Math.max(0, ...selectedPackages.value.map((p) => p.label?.print_count ?? 0))
  );

  const allSelected = computed(
    () => packageRows.value.length > 0 && selection.value.length === packageRows.value.length
  );
  const someSelected = computed(
    () => selection.value.length > 0 && selection.value.length < packageRows.value.length
  );

  function typeLabel(pkg) {
    return store.packageTypes.find((x) => x.name === pkg.package_type)?.package_name ?? pkg.package_type ?? "";
  }

  function toggle(code) {
    if (!code) return;
    selection.value = selection.value.includes(code)
      ? selection.value.filter((c) => c !== code)
      : [...selection.value, code];
  }

  function toggleAll() {
    selection.value = allSelected.value
      ? []
      : packageRows.value.map((p) => p.package_code).filter(Boolean);
  }

  function setFormat(key) {
    format.value = key;
    saveFormat(key);
  }

  async function generateSelected() {
    await store.generate(generatable.value, format.value);
  }

  async function generateOne() {
    if (!activePackage.value?.package_code) return;
    await store.generate([activePackage.value.package_code], format.value);
  }

  /**
   * D2: gerekçe yalnız daha önce basılmış koli varsa soruluyor.
   * Hiçbiri basılmadıysa doğrudan basılıyor — ilk basım normal akış.
   */
  function printSelected() {
    if (selectedPackages.value.some(needsReprintReason)) {
      reprintDialog.value = true;
      return;
    }
    store.reprint(printable.value, null, null);
  }

  async function doReprint({ reason, note }) {
    reprintDialog.value = false;
    await store.reprint(printable.value, reason, note);
  }

  async function voidOne() {
    if (!activePackage.value?.package_code) return;
    await store.voidPackageLabel(activePackage.value.package_code, null);
  }

  function openSlip() {
    store.openPackingSlip(selection.value.length ? selection.value : null);
  }

  /** Sevkiyatı "Alıma hazır" işaretler — kuyruktan düşer. */
  async function markReady() {
    try {
      await store.markShipmentReady();
    } catch {
      // Hata store'da; ErrorState gösteriyor.
    }
  }

  function reload() {
    selection.value = [];
    activeIndex.value = 0;
    store.fetchPacking(shipmentName.value);
  }

  function goPacking() {
    router.push({ name: "LogisticsPacking", params: { name: shipmentName.value } });
  }

  onMounted(async () => {
    await logisticsStore.fetchPermissions();
    reload();
  });

  onBeforeUnmount(() => store.reset());

  watch(shipmentName, reload);
  // Koli silinip liste kısalırsa önizleme boşa düşmesin.
  watch(packageRows, (rows) => {
    if (activeIndex.value >= rows.length) activeIndex.value = Math.max(0, rows.length - 1);
  });
</script>
