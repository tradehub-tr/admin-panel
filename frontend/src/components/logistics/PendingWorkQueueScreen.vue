<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("logistics.queue.pendingTitle") }}
        </h1>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          {{ t("logistics.queue.pendingSubtitle") }}
        </p>
      </div>
      <button type="button" class="ms-auto hdr-btn-outlined" @click="$emit('refresh')">
        {{ t("logistics.queue.refresh") }}
      </button>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="loading" class="space-y-3" :aria-busy="true">
      <Skeleton variant="rect" height="40px" />
      <Skeleton v-for="i in 6" :key="i" variant="rect" height="44px" />
    </div>

    <template v-else>
      <!-- Kova seçimi panelin hap dilinde (StatusFilterPills — count'lu).
           Her kova bir "neyi bekliyor" sorusunun cevabı. Sayı sıfırsa hap
           yine gösteriliyor — kaybolan sekme operasyonda "acaba bozuldu mu?"
           sorusuna yol açıyor. -->
      <StatusFilterPills
        :model-value="activeBucket"
        :options="bucketOptions"
        @change="$emit('select-bucket', $event)"
      />

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

    <!-- TOPLU AKSİYON YOK (bilinçli): önceki taslakta "Seçilenleri işle"
         çubuğu vardı ama DataTable'da satır seçme mekanizması yok ve
         `bulk_resolve` ucu tanımlı değil — hiç dolmayacak bir seçimle hiç
         çalışmayacak bir buton çizmek ölü buton yasağına girer. Aksiyon
         modeli şimdilik: satıra tıkla → detayda işlem yap. Seçim altyapısı
         DataTable'a gelirse burada yeniden değerlendirilir. -->
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import DataTable from "@/components/common/datatable/DataTable.vue";
  import { useDataTable } from "@/composables/useDataTable";

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
   *
   * 2026-08-19: panel diline çevrildi — kova kartları `StatusFilterPills`
   * hap diline geçti (liste ekranındaki durum filtresiyle aynı görsel dil).
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
  });

  defineEmits(["open", "refresh", "retry", "select-bucket"]);

  const { t } = useI18n();

  const BUCKET_KEYS = ["awaiting_carrier", "awaiting_label", "awaiting_pickup", "awaiting_pod", "delayed"];

  /** Bekleme süresi eşikleri (saat) — üstü operasyonda "unutulmuş" sayılıyor. */
  const WAITING_WARN_HOURS = 24;
  const WAITING_CRITICAL_HOURS = 72;

  const bucketOptions = computed(() =>
    BUCKET_KEYS.map((key) => ({
      value: key,
      label: t(`logistics.queue.bucket.${key}`),
      count: Number(props.bucketCounts[key] ?? 0),
    }))
  );

  const activeBucketLabel = computed(
    () => bucketOptions.value.find((b) => b.value === props.activeBucket)?.label ?? ""
  );

  const FIELDS = computed(() => [
    { key: "name", label: t("logistics.queue.col.name"), sortable: true },
    { key: "order", label: t("logistics.queue.col.order") },
    { key: "status", label: t("logistics.queue.col.status") },
    { key: "carrier", label: t("logistics.queue.col.carrier") },
    { key: "waiting_hours", label: t("logistics.queue.col.waiting"), sortable: true },
  ]);

  const dt = useDataTable(FIELDS.value, { pageSize: 50 });

  function formatWaiting(hours) {
    const value = Number(hours ?? 0);
    if (value < 24) return t("logistics.queue.hours", { count: Math.round(value) });
    return t("logistics.queue.days", { count: Math.floor(value / 24) });
  }

  function waitingClass(hours) {
    const value = Number(hours ?? 0);
    if (value >= WAITING_CRITICAL_HOURS) return "font-semibold text-red-600 dark:text-red-400";
    if (value >= WAITING_WARN_HOURS) return "font-medium text-amber-600 dark:text-amber-400";
    return "text-gray-600 dark:text-gray-300";
  }
</script>
