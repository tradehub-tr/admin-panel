<template>
  <div class="space-y-4">
    <header class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.rates.title") }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">{{ t("logistics.rates.subtitle") }}</p>
      </div>
      <button v-if="can.write" type="button" class="ms-auto th-btn-primary text-sm" @click="$emit('create')">
        {{ t("logistics.rates.new") }}
      </button>
    </header>

    <DataTableToolbar :dt="dt" :search-placeholder="t('logistics.rates.searchPlaceholder')" show-columns />

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 5" :key="i" variant="rect" height="44px" />
    </div>

    <EmptyState
      v-else-if="!rows.length"
      :filtered="hasActiveFilters"
      :entity="t('logistics.rates.entity')"
      @clear-filters="dt.clearAll()"
    />

    <DataTable
      v-else
      :dt="dt"
      :rows="decoratedRows"
      :total="rows.length"
      row-key="name"
      clickable
      @row-click="$emit('open', $event)"
    >
      <!-- Öncelik, tarifenin en belirleyici alanı: iki kural aynı gönderiye
           uyduğunda küçük sayı kazanıyor. Sayı olarak göstermek yetmez,
           sırayı da anlatmak gerekiyor. -->
      <template #cell-priority="{ row }">
        <span class="inline-flex items-center gap-1.5">
          <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold dark:bg-slate-700">
            {{ row.priority }}
          </span>
          <span v-if="row.isFirstMatch" class="text-[11px] text-emerald-700 dark:text-emerald-400">
            {{ t("logistics.rates.winsFirst") }}
          </span>
        </span>
      </template>

      <template #cell-criteria="{ row }">
        <span class="text-xs text-slate-600 dark:text-slate-300">{{ row.criteria }}</span>
      </template>

      <template #cell-base_charge="{ row }">
        <span class="tabular-nums">{{ money(row.base_charge) }}</span>
        <!-- Alış ve satış AYRI (TUR-121). Zarar eden bir tarife tanımlanabilir
             ama görünmeden değil. -->
        <span
          v-if="row.marginNegative"
          class="ms-1 text-[11px] text-red-600 dark:text-red-400"
          :title="t('logistics.rates.negativeMarginHint')"
        >
          {{ t("logistics.rates.negativeMargin") }}
        </span>
      </template>

      <template #cell-is_active="{ row }">
        <StatusBadge
          :status="row.is_active ? 'active' : 'passive'"
          :tone="row.is_active ? 'success' : 'neutral'"
          :label="row.is_active ? t('logistics.catalog.active') : t('logistics.catalog.passive')"
          :show-dot="false"
        />
      </template>
    </DataTable>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";
  import DataTable from "@/components/common/datatable/DataTable.vue";
  import DataTableToolbar from "@/components/common/datatable/DataTableToolbar.vue";
  import { useDataTable } from "@/composables/useDataTable";

  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **K1 · Ticari kargo tarifeleri** (TUR-121).
   *
   * Eşleşme ölçütleri (desi/ağırlık/bölge/hizmet) tek bir okunabilir
   * özet sütununda toplanıyor: her ölçüt için ayrı sütun açmak on kolonluk
   * ve çoğu boş bir tablo üretirdi.
   *
   * Öncelik sırasında ilk aktif kural işaretli — çakışma çözümünün
   * AÇIKLANABİLİR olması TUR-121 kabul kriteri.
   */
  const props = defineProps({
    /** `pricing_rule` sözleşmesindeki satırlar. */
    rows: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["create", "open", "retry"]);

  const { t } = useI18n();

  const FIELDS = [
    { key: "priority", label: "Öncelik", sortable: true },
    { key: "rule_name", label: "Kural", sortable: true },
    { key: "carrier", label: "Taşıyıcı", filter: { type: "text" } },
    { key: "criteria", label: "Eşleşme ölçütü" },
    { key: "base_cost", label: "Alış", defaultHidden: true },
    { key: "base_charge", label: "Satış" },
    { key: "per_desi_charge", label: "Desi başı", defaultHidden: true },
    { key: "is_active", label: "Durum" },
  ];

  const dt = useDataTable(FIELDS, { pageSize: 50 });

  const hasActiveFilters = computed(
    () => Boolean(dt.search.value) || dt.activeFilterCount.value > 0
  );

  /** Aktif kurallar içinde en düşük öncelik — ilk değerlendirilen. */
  const firstMatchName = computed(() => {
    const active = props.rows.filter((r) => r.is_active);
    if (!active.length) return null;
    return active.reduce((best, r) => (r.priority < best.priority ? r : best)).name;
  });

  const decoratedRows = computed(() =>
    props.rows.map((row) => ({
      ...row,
      criteria: describeCriteria(row),
      isFirstMatch: row.name === firstMatchName.value,
      marginNegative:
        row.base_charge != null && row.base_cost != null && row.base_charge < row.base_cost,
    }))
  );

  /** Dolu olan ölçütleri okunabilir tek satıra çevirir; boş olan "sınırsız". */
  function describeCriteria(row) {
    const parts = [];
    if (row.min_desi != null || row.max_desi != null) {
      parts.push(t("logistics.rates.desiRange", {
        min: row.min_desi ?? "0",
        max: row.max_desi ?? "∞",
      }));
    }
    if (row.min_weight_kg != null || row.max_weight_kg != null) {
      parts.push(t("logistics.rates.weightRange", {
        min: row.min_weight_kg ?? "0",
        max: row.max_weight_kg ?? "∞",
      }));
    }
    if (row.zone) parts.push(t("logistics.rates.zone", { zone: row.zone }));
    if (row.destination_city) parts.push(row.destination_city);
    if (row.min_order_total != null) {
      parts.push(t("logistics.rates.orderTotal", { amount: money(row.min_order_total) }));
    }
    if (row.shipping_method) parts.push(row.shipping_method);
    return parts.length ? parts.join(" · ") : t("logistics.rates.noCriteria");
  }

  const money = (v) =>
    v == null ? "—" : Number(v).toLocaleString(undefined, { style: "currency", currency: "TRY" });
</script>
