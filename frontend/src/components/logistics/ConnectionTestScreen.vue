<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.connectionTest.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.connectionTest.subtitle", { account: accountName }) }}
        </p>
      </div>
      <button
        type="button"
        class="ms-auto th-btn-primary text-sm"
        :disabled="running"
        @click="$emit('run')"
      >
        {{ running ? t("logistics.connectionTest.running") : t("logistics.connectionTest.run") }}
      </button>
    </header>

    <!-- ÖZET: kısmi başarı "çalışıyor" DEĞİL. Üç yetenekten biri düşmüşse
         entegrasyon kısmen kullanılabilir; bunu yeşil göstermek, sevkiyat
         oluşturulup takip edilemediğinde şaşkınlık yaratır. -->
    <div class="rounded-lg border p-4" :class="summaryClass">
      <p class="text-sm font-semibold">{{ summaryTitle }}</p>
      <p class="mt-1 text-xs">{{ summaryDetail }}</p>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="running" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="probe in CONNECTION_PROBES" :key="probe" variant="rect" height="72px" />
    </div>

    <ul v-else-if="results.length" class="space-y-2">
      <li
        v-for="result in orderedResults"
        :key="result.probe"
        class="rounded-lg border p-3"
        :class="result.succeeded
          ? 'border-emerald-200 dark:border-emerald-800'
          : 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10'"
      >
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge
            :status="result.probe"
            :tone="result.succeeded ? 'success' : 'danger'"
            :label="t(`logistics.probe.${result.probe}`)"
            :show-dot="false"
          />
          <span class="text-xs text-slate-500">{{ t(`logistics.probeHint.${result.probe}`) }}</span>

          <span class="ms-auto flex items-center gap-3 text-xs tabular-nums text-slate-500">
            <span v-if="result.http_status">HTTP {{ result.http_status }}</span>
            <!-- Yavaş entegrasyon da bir arıza: 200 dönen ama 3 sn süren
                 bir uç, sipariş akışını tıkar. -->
            <span :class="latencyClass(result.duration_ms)">{{ result.duration_ms }} ms</span>
          </span>
        </div>

        <p class="mt-1 text-sm">{{ result.message }}</p>
        <p v-if="result.error_code" class="mt-1 font-mono text-xs text-red-700 dark:text-red-400">
          {{ result.error_code }}
        </p>
        <p class="mt-1 text-xs text-slate-400">
          {{ result.tested_at }}<template v-if="result.tested_by"> · {{ result.tested_by }}</template>
        </p>
      </li>
    </ul>

    <p v-else class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.connectionTest.never") }}
    </p>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { CONNECTION_PROBES } from "./constants";

  /**
   * **F2 · Bağlantı testi** (TUR-110, TUR-111).
   *
   * Üç yetenek ayrı ayrı deneniyor: authenticate / quote / track. Tek bir
   * "bağlantı çalışıyor" göstergesi yanıltıcı olurdu — en sık görülen
   * gerçek senaryo hesabın doğrulanıp takip yetkisinin verilmemiş olması.
   */
  const props = defineProps({
    accountName: { type: String, required: true },
    /** `connection_test` sözleşmesindeki satırlar. */
    results: { type: Array, default: () => [] },
    running: { type: Boolean, default: false },
    error: { type: Object, default: null },
  });

  defineEmits(["run", "retry"]);

  const { t } = useI18n();

  /** Bu eşiğin üstü "çalışıyor ama yavaş" — sessiz geçilmiyor. */
  const SLOW_MS = 1500;

  const orderedResults = computed(() =>
    [...props.results].sort(
      (a, b) => CONNECTION_PROBES.indexOf(a.probe) - CONNECTION_PROBES.indexOf(b.probe)
    )
  );

  const failedCount = computed(() => props.results.filter((r) => !r.succeeded).length);

  const summaryClass = computed(() => {
    if (!props.results.length) return "border-slate-200 dark:border-slate-700";
    if (failedCount.value === 0) return "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20";
    if (failedCount.value === props.results.length) return "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20";
    return "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20";
  });

  const summaryTitle = computed(() => {
    if (!props.results.length) return t("logistics.connectionTest.summaryNever");
    if (failedCount.value === 0) return t("logistics.connectionTest.summaryOk");
    if (failedCount.value === props.results.length) return t("logistics.connectionTest.summaryFailed");
    return t("logistics.connectionTest.summaryPartial", { failed: failedCount.value });
  });

  const summaryDetail = computed(() => {
    if (!props.results.length) return t("logistics.connectionTest.summaryNeverHint");
    const failed = props.results.filter((r) => !r.succeeded).map((r) => t(`logistics.probe.${r.probe}`));
    return failed.length
      ? t("logistics.connectionTest.summaryFailedList", { probes: failed.join(", ") })
      : t("logistics.connectionTest.summaryOkHint");
  });

  function latencyClass(ms) {
    return Number(ms) >= SLOW_MS ? "font-medium text-amber-700 dark:text-amber-400" : "";
  }
</script>
