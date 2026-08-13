<template>
  <div class="space-y-4">
    <!-- Başlık + birincil aksiyon -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="min-w-0">
        <h1 class="truncate text-lg font-semibold">{{ title }}</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t("logistics.catalog.recordCount", { count: total }) }}
        </p>
      </div>

      <div class="ms-auto flex items-center gap-2">
        <!-- Yetki yoksa buton HİÇ render edilmez; disabled bırakmak
             "yapabilirim ama şu an olmaz" der, oysa yetki yok. -->
        <button
          v-if="can.create"
          type="button"
          class="th-btn-primary text-sm"
          @click="$emit('create')"
        >
          {{ t("logistics.catalog.new") }}
        </button>
      </div>
    </div>

    <DataTableToolbar :dt="dt" :search-placeholder="searchPlaceholder" show-columns />

    <!-- Hata: liste yerine geçer, tablo gösterilmez -->
    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <!-- Yükleniyor: iskelet, boş tablo değil — yerleşim kaymasın -->
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 6" :key="i" variant="rect" height="44px" />
    </div>

    <!-- Boş: filtre yüzünden mi gerçekten boş mu, ayrımı önemli -->
    <EmptyState
      v-else-if="!rows.length"
      :filtered="hasActiveFilters"
      :entity="title"
      @clear-filters="clearFilters"
    />

    <DataTable
      v-else
      :dt="dt"
      :rows="rows"
      :total="total"
      row-key="name"
      clickable
      @row-click="$emit('open', $event)"
    >
      <!-- Aktiflik sütunu rozet olarak; 0/1 tamsayı geldiği unutulmasın -->
      <template #cell-is_active="{ row }">
        <StatusBadge
          :status="row.is_active ? 'active' : 'passive'"
          :tone="row.is_active ? 'success' : 'neutral'"
          :label="row.is_active ? t('logistics.catalog.active') : t('logistics.catalog.passive')"
          :show-dot="false"
        />
      </template>
    </DataTable>

    <BulkActionBar :count="selection.length" @clear="$emit('clear-selection')">
      <button
        v-if="can.write"
        type="button"
        class="th-btn-outline text-xs"
        @click="$emit('bulk-toggle-active', { names: selection, isActive: 0 })"
      >
        {{ t("logistics.catalog.deactivateSelected") }}
      </button>
    </BulkActionBar>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";
  import DataTable from "@/components/common/datatable/DataTable.vue";
  import DataTableToolbar from "@/components/common/datatable/DataTableToolbar.vue";
  import { useDataTable } from "@/composables/useDataTable";

  import BulkActionBar from "./BulkActionBar.vue";
  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";
  import { catalogFieldsToTableFields } from "./catalogMeta";

  /**
   * Jenerik katalog liste ekranı (M1) — on kataloğu tek bileşen sürer.
   *
   * NEDEN JENERİK:
   *   Backend de kayıt defteri deseniyle kuruldu (`CATALOGS` sözlüğü, tek
   *   çekirdek). Arayüzün simetrik olması yeni katalog eklerken sıfır ekran
   *   işi demek. Sütunlar `_catalog-meta.json`'dan türetiliyor — sözleşme
   *   değişince ekran kendiliğinden uyuyor.
   *
   * SUNUM KATMANI:
   *   Veri fetch ETMEZ, store bilmez. Container (Faz E) veriyi props ile
   *   verir. Böylece Storybook'ta mock, uygulamada gerçek veriyle aynı
   *   bileşen çalışır.
   */
  const props = defineProps({
    /** `_catalog-meta.json` anahtarı, ör. "logistics_provider". */
    catalogKey: { type: String, required: true },
    title: { type: String, required: true },
    rows: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    /** LogisticsApiError benzeri: { code, message } */
    error: { type: Object, default: null },
    /** Seçili kayıt adları (toplu aksiyon için). */
    selection: { type: Array, default: () => [] },
    /** `get_logistics_permissions` çıktısından türetilir. */
    can: {
      type: Object,
      default: () => ({ read: true, write: false, create: false, delete: false }),
    },
  });

  defineEmits(["create", "open", "retry", "clear-selection", "bulk-toggle-active"]);

  const { t } = useI18n();

  const tableFields = computed(() => catalogFieldsToTableFields(props.catalogKey));
  const dt = useDataTable(tableFields.value, { pageSize: 50 });

  const searchPlaceholder = computed(() =>
    t("logistics.catalog.searchPlaceholder", { entity: props.title })
  );

  const hasActiveFilters = computed(
    () => Boolean(dt.search.value) || dt.activeFilterCount.value > 0
  );

  function clearFilters() {
    dt.clearAll();
  }
</script>
