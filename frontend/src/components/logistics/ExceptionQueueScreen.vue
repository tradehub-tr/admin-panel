<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.exception.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.exception.subtitle") }}
        </p>
      </div>
    </div>

    <!-- Önem derecesi filtresi. "Critical" öne alınıyor: bu ekrana bakan
         kişi önce onu görmeli. -->
    <StatusFilterPills
      v-model="severity"
      :options="severityOptions"
      @change="$emit('filter-severity', $event)"
    />

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 6" :key="i" variant="rect" height="60px" />
    </div>

    <div
      v-else-if="!rows.length"
      class="rounded-lg border border-emerald-200 bg-emerald-50 py-10 text-center dark:border-emerald-800 dark:bg-emerald-900/20"
    >
      <p class="text-sm font-medium text-emerald-800 dark:text-emerald-300">
        {{ t("logistics.exception.allClear") }}
      </p>
    </div>

    <!-- Kart listesi, tablo değil: her satırın çözüm notu ve aksiyonu var;
         tabloya sığdırmak açıklamayı kesip en gerekli bilgiyi gizlerdi. -->
    <ul v-else class="space-y-2">
      <li
        v-for="row in orderedRows"
        :key="row.name"
        class="rounded-lg border p-3"
        :class="rowClass(row)"
      >
        <div class="flex flex-wrap items-start gap-3">
          <StatusBadge
            :status="row.severity"
            kind="severity"
            :label="severityLabel(row.severity)"
          />

          <div class="min-w-0 grow">
            <p class="text-sm font-medium">
              {{ row.exception_label || row.exception_code }}
              <code v-if="row.exception_label" class="ms-1 font-mono text-xs text-slate-400">
                {{ row.exception_code }}
              </code>
            </p>
            <p v-if="row.description" class="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              {{ row.description }}
            </p>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <button
                type="button"
                class="font-mono underline-offset-2 hover:underline"
                @click="$emit('open-shipment', row.shipment)"
              >
                {{ row.shipment }}
              </button>
              <span v-if="row.carrier">{{ row.carrier }}</span>
              <span>{{ formatTime(row.occurred_at) }}</span>
            </div>

            <!-- Çözülmüş istisna listeden KAYBOLMUYOR: aynı sevkiyatta
                 tekrarlıyor mu, ancak geçmiş görünürse anlaşılır. -->
            <p
              v-if="row.resolved_at"
              class="mt-1.5 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              {{ t("logistics.exception.resolvedBy", { user: row.resolved_by || "—" }) }} ·
              {{ formatTime(row.resolved_at) }}
              <template v-if="row.resolution_note"> — {{ row.resolution_note }}</template>
            </p>
          </div>

          <button
            v-if="can.write && !row.resolved_at"
            type="button"
            class="th-btn-outline shrink-0 text-xs"
            @click="$emit('resolve', row)"
          >
            {{ t("logistics.exception.resolve") }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { SEVERITY_TONE } from "./constants";

  /**
   * **A3 · İstisna kuyruğu** (TUR-113, TUR-118).
   *
   * TUR-113 kabul kriteri: *"İstisna kaydı çözüm notu olmadan kapatılamaz."*
   * Bu ekran çözümü BAŞLATIR (`resolve` event'i); notu toplayan diyalog
   * container'ın işi — sunum katmanı zorunluluğu tek başına garanti edemez,
   * asıl doğrulama backend'de.
   */
  const props = defineProps({
    rows: { type: Array, default: () => [] },
    /** { Critical: 3, Warning: 8, Info: 2 } */
    severityCounts: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["retry", "resolve", "open-shipment", "filter-severity"]);

  const { t, te } = useI18n();

  const severity = ref("");

  const SEVERITY_ORDER = ["Critical", "Warning", "Info"];

  const severityOptions = computed(() => [
    {
      value: "",
      label: t("logistics.exception.allSeverities"),
      count: SEVERITY_ORDER.reduce((sum, key) => sum + Number(props.severityCounts[key] ?? 0), 0),
    },
    ...SEVERITY_ORDER.map((key) => ({
      value: key,
      label: severityLabel(key),
      count: Number(props.severityCounts[key] ?? 0),
    })),
  ]);

  /**
   * Çözülmemişler önce, sonra önem derecesine göre. Zaman sıralaması
   * ikincil: 3 gün önceki kritik bir istisna, 5 dakika önceki bilgi
   * notundan daha acil.
   */
  const orderedRows = computed(() =>
    [...props.rows].sort((a, b) => {
      const resolvedDiff = Number(Boolean(a.resolved_at)) - Number(Boolean(b.resolved_at));
      if (resolvedDiff !== 0) return resolvedDiff;
      const severityDiff =
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
      if (severityDiff !== 0) return severityDiff;
      return String(b.occurred_at).localeCompare(String(a.occurred_at));
    })
  );

  function severityLabel(value) {
    const key = `logistics.severity.${value}`;
    return te(key) ? t(key) : value;
  }

  function rowClass(row) {
    if (row.resolved_at) return "border-slate-200 opacity-70 dark:border-slate-700";
    if (SEVERITY_TONE[row.severity] === "danger") {
      return "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10";
    }
    return "border-slate-200 dark:border-slate-700";
  }

  function formatTime(value) {
    if (!value) return "—";
    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>
