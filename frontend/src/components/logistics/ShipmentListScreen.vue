<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.shipment.listTitle") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.catalog.recordCount", { count: total }) }}
        </p>
      </div>
      <div class="ms-auto flex gap-2">
        <button
          v-if="can.create"
          type="button"
          class="th-btn-primary text-sm"
          @click="$emit('create-manual')"
        >
          {{ t("logistics.shipment.newManual") }}
        </button>
      </div>
    </div>

    <!-- Durum hapları: en sık kullanılan filtre, tabloya girmeden erişilebilir -->
    <StatusFilterPills :options="statusOptions" @change="$emit('filter-status', $event)" />

    <DataTableToolbar :dt="dt" :search-placeholder="t('logistics.shipment.searchPlaceholder')" show-columns />

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 8" :key="i" variant="rect" height="44px" />
    </div>
    <EmptyState
      v-else-if="!rows.length"
      :filtered="hasActiveFilters"
      :entity="t('logistics.shipment.entity')"
      @clear-filters="dt.clearAll()"
    />

    <DataTable v-else :dt="dt" :rows="rows" :total="total" row-key="name" clickable @row-click="$emit('open', $event)">
      <template #cell-status="{ row }">
        <div class="flex items-center gap-2">
          <StatusBadge :status="row.status" />
          <!-- Gecikme ayrı bir sinyal: durum "Yolda" olsa da gecikmiş olabilir -->
          <span
            v-if="row.is_delayed"
            class="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300"
          >
            {{ t("logistics.shipment.delayed") }}
          </span>
        </div>
      </template>

      <template #cell-tracking_number="{ row }">
        <code v-if="row.tracking_number" class="font-mono text-xs">{{ row.tracking_number }}</code>
        <span v-else class="text-xs text-slate-400">{{ t("logistics.shipment.noTracking") }}</span>
      </template>
    </DataTable>

    <BulkActionBar :count="selection.length" @clear="$emit('clear-selection')">
      <button v-if="can.write" type="button" class="th-btn-outline text-xs" @click="$emit('bulk-print-labels')">
        {{ t("logistics.shipment.printLabels") }}
      </button>
      <button v-if="can.write" type="button" class="th-btn-dark text-xs" @click="$emit('bulk-update-status')">
        {{ t("logistics.shipment.updateStatus") }}
      </button>
    </BulkActionBar>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import DataTable from "@/components/common/datatable/DataTable.vue";
  import DataTableToolbar from "@/components/common/datatable/DataTableToolbar.vue";
  import { useDataTable } from "@/composables/useDataTable";

  import BulkActionBar from "./BulkActionBar.vue";
  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { SHIPMENT_STATUS_TONE } from "./constants";

  /**
   * **B1 · Sevkiyat listesi** (TUR-117).
   *
   * TUR-117 kabul kriteri "filtreler URL ile paylaşılabilir" diyor — bu
   * sunum katmanı filtre DEĞİŞİKLİĞİNİ event olarak yukarı veriyor;
   * URL senkronu container'ın (Faz E) işi.
   *
   * Gecikme durumdan AYRI gösteriliyor: bir sevkiyat "Yolda" olup aynı anda
   * gecikmiş olabilir (TUR-112 gecikme tespiti).
   */
  const props = defineProps({
    rows: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    /** Duruma göre sayaçlar: { "In Transit": 41, ... } */
    statusCounts: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    selection: { type: Array, default: () => [] },
    can: { type: Object, default: () => ({ read: true, write: false, create: false }) },
  });

  defineEmits([
    "open", "create-manual", "retry", "filter-status",
    "clear-selection", "bulk-print-labels", "bulk-update-status",
  ]);

  const { t, te } = useI18n();

  const FIELDS = [
    { key: "name", label: "Sevkiyat", sortable: true },
    { key: "order", label: "Sipariş", sortable: true },
    { key: "status", label: "Durum" },
    { key: "carrier", label: "Taşıyıcı", filter: { type: "text" } },
    { key: "tracking_number", label: "Takip No" },
    { key: "package_count", label: "Koli" },
    { key: "shipped_date", label: "Sevk", sortable: true },
    { key: "estimated_delivery_date", label: "Tahmini Teslim", sortable: true },
    { key: "modified", label: "Güncelleme", sortable: true, defaultHidden: true },
  ];

  const dt = useDataTable(FIELDS, { pageSize: 50 });

  const statusOptions = computed(() => [
    { value: "", label: t("logistics.shipment.allStatuses"), count: props.total },
    ...Object.keys(SHIPMENT_STATUS_TONE).map((status) => ({
      value: status,
      label: te(`logistics.status.${status}`) ? t(`logistics.status.${status}`) : status,
      count: props.statusCounts[status] ?? 0,
    })),
  ]);

  const hasActiveFilters = computed(() => Boolean(dt.search.value) || dt.activeFilterCount.value > 0);
</script>
