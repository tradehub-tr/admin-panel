<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.queue.pendingTitle") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.queue.pendingSubtitle") }}
        </p>
      </div>
      <button type="button" class="ms-auto th-btn-outline text-sm" @click="$emit('refresh')">
        {{ t("logistics.queue.refresh") }}
      </button>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="loading" class="space-y-3" :aria-busy="true">
      <Skeleton variant="rect" height="72px" />
      <Skeleton v-for="i in 6" :key="i" variant="rect" height="44px" />
    </div>

    <template v-else>
      <!-- Kova seçimi: her kova bir "neyi bekliyor" sorusunun cevabı.
           Sayı sıfırsa kova yine gösteriliyor — kaybolan sekme operasyonda
           "acaba bozuldu mu?" sorusuna yol açıyor. -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="bucket in bucketList"
          :key="bucket.key"
          type="button"
          class="rounded-lg border px-3 py-2 text-start transition-colors"
          :class="
            bucket.key === activeBucket
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
              : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
          "
          :aria-pressed="bucket.key === activeBucket"
          @click="$emit('select-bucket', bucket.key)"
        >
          <span class="block text-xs text-slate-500 dark:text-slate-400">{{ bucket.label }}</span>
          <span class="block text-lg font-semibold tabular-nums" :class="bucket.tone">
            {{ bucket.count }}
          </span>
        </button>
      </div>

      <!-- Boş kuyruk bir EKSİKLİK değil, İYİ HABER. Bu yüzden EmptyState
           ("kayıt bulunamadı", gri, kesikli çerçeve) kullanılmıyor. -->
      <div
        v-if="!rows.length"
        class="rounded-lg border border-emerald-200 bg-emerald-50 py-10 text-center dark:border-emerald-800 dark:bg-emerald-900/20"
      >
        <p class="text-sm font-medium text-emerald-800 dark:text-emerald-300">
          {{ t("logistics.queue.allClear") }}
        </p>
        <p class="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
          {{ t("logistics.queue.allClearHint", { bucket: activeBucketLabel }) }}
        </p>
      </div>

      <DataTable
        v-else
        :dt="dt"
        :rows="rows"
        :total="rows.length"
        row-key="name"
        clickable
        @row-click="$emit('open', $event)"
      >
        <template #cell-status="{ row }">
          <StatusBadge :status="row.status" />
        </template>

        <!-- Bekleme süresi kuyruk ekranının ASIL bilgisi: hangi iş
             unutulmuş? Eşiği aşanlar renkleniyor. -->
        <template #cell-waiting_hours="{ row }">
          <span class="tabular-nums" :class="waitingClass(row.waiting_hours)">
            {{ formatWaiting(row.waiting_hours) }}
          </span>
        </template>
      </DataTable>
    </template>

    <BulkActionBar :count="selection.length" @clear="$emit('clear-selection')">
      <button
        v-if="can.write"
        type="button"
        class="th-btn-dark text-xs"
        @click="$emit('bulk-resolve', { names: selection, bucket: activeBucket })"
      >
        {{ t("logistics.queue.bulkAction") }}
      </button>
    </BulkActionBar>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";
  import DataTable from "@/components/common/datatable/DataTable.vue";
  import { useDataTable } from "@/composables/useDataTable";

  import BulkActionBar from "./BulkActionBar.vue";
  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **A2 · Bekleyen işler kuyruğu** (TUR-117, TUR-118).
   *
   * Sevkiyat listesi "ne var?" sorusunu cevaplar; bu ekran "ne YAPMAM
   * lazım?" sorusunu. Aynı veriyi farklı kesiyor — bu yüzden ayrı ekran,
   * listeye bir filtre daha eklemek değil.
   *
   * Kovalar backend'den sayılarıyla geliyor; sunum katmanı saymıyor
   * (sayfalanmış veriden sayı çıkarmak yanlış sonuç verirdi).
   */
  const props = defineProps({
    /** Aktif kova anahtarı. */
    activeBucket: { type: String, default: "awaiting_label" },
    /** { awaiting_label: 12, awaiting_pickup: 4, ... } */
    bucketCounts: { type: Object, default: () => ({}) },
    /** Aktif kovanın satırları. */
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    selection: { type: Array, default: () => [] },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["open", "refresh", "retry", "select-bucket", "clear-selection", "bulk-resolve"]);

  const { t } = useI18n();

  /**
   * Kova tanımları. `tone` yalnızca sayı sıfırdan büyükken uygulanıyor —
   * "0 gecikmiş" yazısını kırmızı göstermek yanlış alarm olurdu.
   */
  const BUCKETS = [
    { key: "awaiting_carrier", warnTone: "text-amber-600 dark:text-amber-400" },
    { key: "awaiting_label", warnTone: "text-amber-600 dark:text-amber-400" },
    { key: "awaiting_pickup", warnTone: "text-amber-600 dark:text-amber-400" },
    { key: "awaiting_pod", warnTone: "text-amber-600 dark:text-amber-400" },
    { key: "delayed", warnTone: "text-red-600 dark:text-red-400" },
  ];

  /** Bekleme süresi eşiği (saat) — üstü operasyonda "unutulmuş" sayılıyor. */
  const WAITING_WARN_HOURS = 24;
  const WAITING_CRITICAL_HOURS = 72;

  const bucketList = computed(() =>
    BUCKETS.map((bucket) => {
      const count = Number(props.bucketCounts[bucket.key] ?? 0);
      return {
        key: bucket.key,
        label: t(`logistics.queue.bucket.${bucket.key}`),
        count,
        tone: count > 0 ? bucket.warnTone : "",
      };
    })
  );

  const activeBucketLabel = computed(
    () => bucketList.value.find((b) => b.key === props.activeBucket)?.label ?? ""
  );

  const FIELDS = [
    { key: "name", label: "Sevkiyat", sortable: true },
    { key: "order", label: "Sipariş" },
    { key: "status", label: "Durum" },
    { key: "carrier", label: "Taşıyıcı" },
    { key: "waiting_hours", label: "Bekleme", sortable: true },
  ];

  const dt = useDataTable(FIELDS, { pageSize: 50 });

  function formatWaiting(hours) {
    const value = Number(hours ?? 0);
    if (value < 24) return t("logistics.queue.hours", { count: Math.round(value) });
    return t("logistics.queue.days", { count: Math.floor(value / 24) });
  }

  function waitingClass(hours) {
    const value = Number(hours ?? 0);
    if (value >= WAITING_CRITICAL_HOURS) return "font-semibold text-red-600 dark:text-red-400";
    if (value >= WAITING_WARN_HOURS) return "font-medium text-amber-600 dark:text-amber-400";
    return "text-slate-600 dark:text-slate-300";
  }
</script>
