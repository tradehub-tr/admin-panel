<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.alert.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">{{ t("logistics.alert.subtitle") }}</p>
      </div>
      <label class="ms-auto flex items-center gap-2 text-sm">
        <input v-model="hideAcknowledged" type="checkbox" />
        {{ t("logistics.alert.hideAcknowledged") }}
      </label>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 3" :key="i" variant="rect" height="92px" />
    </div>

    <div
      v-else-if="!visibleRows.length"
      class="rounded-lg border border-emerald-200 bg-emerald-50 py-10 text-center dark:border-emerald-800 dark:bg-emerald-900/20"
    >
      <p class="text-sm font-medium text-emerald-800 dark:text-emerald-300">
        {{ t("logistics.alert.allClear") }}
      </p>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="row in visibleRows"
        :key="row.name"
        class="rounded-lg border p-4"
        :class="rowClass(row)"
      >
        <div class="flex flex-wrap items-start gap-3">
          <StatusBadge :status="row.severity" kind="severity" />

          <div class="min-w-0 grow">
            <p class="text-sm font-medium">{{ row.title }}</p>
            <p v-if="row.detail" class="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              {{ row.detail }}
            </p>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ t(`logistics.alertType.${row.alert_type}`) }}</span>
              <span v-if="row.carrier">{{ row.carrier }}</span>
              <button
                v-if="row.shipment"
                type="button"
                class="font-mono underline-offset-2 hover:underline"
                @click="$emit('open-shipment', row.shipment)"
              >
                {{ row.shipment }}
              </button>
              <!-- Kaç kaydı etkilediği, tekil bir sorunu toplu bir arızadan
                   ayırıyor: 1 sevkiyat gecikmesi ile 14 başarısız istek
                   farklı müdahale ister. -->
              <span v-if="row.affected_count > 1" class="font-medium text-slate-600 dark:text-slate-300">
                {{ t("logistics.alert.affected", { count: row.affected_count }) }}
              </span>
              <span>{{ formatTime(row.raised_at) }}</span>
            </div>

            <!-- Görüldü işareti alarmı SİLMİYOR: aynı alarm tekrar ediyorsa
                 ancak geçmiş görünürse anlaşılır. -->
            <p v-if="row.acknowledged_at" class="mt-1.5 text-xs text-slate-500">
              {{ t("logistics.alert.acknowledgedBy", { user: row.acknowledged_by || "—" }) }} ·
              {{ formatTime(row.acknowledged_at) }}
            </p>
          </div>

          <button
            v-if="can.write && !row.acknowledged_at"
            type="button"
            class="th-btn-outline shrink-0 text-xs"
            @click="$emit('acknowledge', row)"
          >
            {{ t("logistics.alert.acknowledge") }}
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

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { SEVERITY_TONE } from "./constants";

  /**
   * **J3 · Operasyon alarmları** (TUR-113).
   *
   * İstisna kuyruğundan (A3) farkı: orası tek bir sevkiyatın sorunlarını
   * gösterir, burası SİSTEM seviyesindeki durumları — SLA ihlali, entegrasyon
   * arızası, istisna patlaması. `affected_count` bu ayrımı taşıyor.
   *
   * "Görüldü" işareti alarmı silmiyor; tekrar eden bir alarm ancak geçmiş
   * görünürse fark edilir.
   */
  const props = defineProps({
    /** `operation_alert` sözleşmesindeki satırlar. */
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["acknowledge", "open-shipment", "retry"]);

  const { t } = useI18n();

  const hideAcknowledged = ref(false);

  const SEVERITY_ORDER = ["Critical", "Warning", "Info"];

  const visibleRows = computed(() => {
    const rows = hideAcknowledged.value
      ? props.rows.filter((row) => !row.acknowledged_at)
      : props.rows;
    return [...rows].sort((a, b) => {
      const ackDiff = Number(Boolean(a.acknowledged_at)) - Number(Boolean(b.acknowledged_at));
      if (ackDiff !== 0) return ackDiff;
      const sevDiff = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
      if (sevDiff !== 0) return sevDiff;
      return String(b.raised_at).localeCompare(String(a.raised_at));
    });
  });

  function rowClass(row) {
    if (row.acknowledged_at) return "border-slate-200 opacity-70 dark:border-slate-700";
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
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }
</script>
