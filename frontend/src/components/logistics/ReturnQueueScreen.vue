<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.returnQueue.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">{{ t("logistics.returnQueue.subtitle") }}</p>
    </header>

    <StatusFilterPills
      v-model="status"
      :options="statusOptions"
      @change="$emit('filter-status', $event)"
    />

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 5" :key="i" variant="rect" height="84px" />
    </div>

    <EmptyState
      v-else-if="!rows.length"
      :filtered="Boolean(status)"
      :entity="t('logistics.returnQueue.entity')"
      @clear-filters="clearFilter"
    />

    <ul v-else class="space-y-2">
      <li
        v-for="row in orderedRows"
        :key="row.name"
        class="rounded-lg border p-4"
        :class="rowClass(row)"
      >
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="font-mono text-sm font-medium underline-offset-2 hover:underline"
            @click="$emit('open', row)"
          >
            {{ row.name }}
          </button>
          <StatusBadge
            :status="row.status"
            :tone="RETURN_STATUS_TONE[row.status]"
            :label="t(`logistics.returnStatus.${row.status}`)"
          />
          <span class="text-xs text-slate-500">{{ t(`logistics.returnReason.${row.reason}`) }}</span>

          <!-- Kapanmış talep DEĞİŞTİRİLEMEZ (TUR-116). Kilit rozeti bunu
               listede söylüyor ki kimse açıp da düzenlenebilir sanmasın. -->
          <span
            v-if="row.is_closed"
            class="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-600 dark:text-slate-200"
          >
            {{ t("logistics.returnQueue.closed") }}
          </span>

          <!-- Karar bekleme süresi: iade talebinde yanıt gecikmesi doğrudan
               müşteri şikâyetine dönüşüyor. -->
          <span v-if="!row.decided_at" class="ms-auto text-xs" :class="waitingClass(row)">
            {{ waitingLabel(row) }}
          </span>
          <span v-else class="ms-auto text-xs text-slate-500">
            {{ t("logistics.returnQueue.decidedAt", { at: formatTime(row.decided_at) }) }}
          </span>
        </div>

        <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>{{ row.order }}</span>
          <span v-if="row.shipment" class="font-mono">{{ row.shipment }}</span>
          <span>{{ row.buyer }}</span>
          <span>{{ formatTime(row.requested_at) }}</span>
        </div>

        <div v-if="can.write && row.status === 'requested'" class="mt-3 flex gap-2">
          <button type="button" class="th-btn-outline text-xs" @click="$emit('decide', row)">
            {{ t("logistics.returnQueue.decide") }}
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

  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { RETURN_STATUS_TONE } from "./constants";

  /**
   * **I1 · İade kuyruğu** (TUR-116, TUR-117).
   *
   * Karar bekleyen talepler önce ve bekleme süresiyle: iade talebinde
   * yanıt gecikmesi doğrudan müşteri şikâyetine dönüşüyor, "talep tarihi"
   * tek başına bunu göstermez.
   */
  const props = defineProps({
    rows: { type: Array, default: () => [] },
    /** `{ requested: 4, inspecting: 2, ... }` */
    statusCounts: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
    /** "Şu an" — bekleme süresi için (test edilebilirlik). */
    now: { type: String, default: "" },
  });

  defineEmits(["open", "decide", "filter-status", "retry"]);

  const { t } = useI18n();

  const status = ref("");

  /** Bu süreyi aşan karar bekleyişi operasyonda gecikme sayılıyor. */
  const DECISION_WARN_HOURS = 48;

  const statusOptions = computed(() => [
    {
      value: "",
      label: t("logistics.returnQueue.allStatuses"),
      count: Object.values(props.statusCounts).reduce((s, n) => s + Number(n || 0), 0),
    },
    ...Object.keys(RETURN_STATUS_TONE).map((key) => ({
      value: key,
      label: t(`logistics.returnStatus.${key}`),
      count: Number(props.statusCounts[key] ?? 0),
    })),
  ]);

  /** Karar bekleyenler önce, sonra en eski talep önce. */
  const orderedRows = computed(() =>
    [...props.rows].sort((a, b) => {
      const decidedDiff = Number(Boolean(a.decided_at)) - Number(Boolean(b.decided_at));
      if (decidedDiff !== 0) return decidedDiff;
      return String(a.requested_at).localeCompare(String(b.requested_at));
    })
  );

  function clearFilter() {
    status.value = "";
  }

  function waitingHours(row) {
    if (!props.now || !row.requested_at) return null;
    const start = new Date(String(row.requested_at).replace(" ", "T"));
    const end = new Date(String(props.now).replace(" ", "T"));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return (end - start) / 3_600_000;
  }

  function waitingLabel(row) {
    const hours = waitingHours(row);
    if (hours == null) return t("logistics.returnQueue.awaitingDecision");
    return hours < 24
      ? t("logistics.queue.hours", { count: Math.round(hours) })
      : t("logistics.queue.days", { count: Math.floor(hours / 24) });
  }

  function waitingClass(row) {
    const hours = waitingHours(row);
    return hours != null && hours >= DECISION_WARN_HOURS
      ? "font-medium text-amber-600 dark:text-amber-400"
      : "text-slate-500";
  }

  function rowClass(row) {
    if (row.is_closed) return "border-slate-200 opacity-70 dark:border-slate-700";
    if (row.status === "requested") return "border-amber-300 dark:border-amber-800";
    return "border-slate-200 dark:border-slate-700";
  }

  function formatTime(value) {
    if (!value) return "—";
    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(undefined, {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }
</script>
