<template>
  <div class="space-y-4">
    <!-- Panel başlık deseni (DocTypeListView): 15px kalın başlık + gri sayaç -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ t("logistics.shipment.listTitle") }}
        </h1>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ t("logistics.catalog.recordCount", { count: total }) }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="can.create"
          type="button"
          class="hdr-btn-primary"
          @click="$emit('create-manual')"
        >
          {{ t("logistics.shipment.newManual") }}
        </button>
      </div>
    </div>

    <!-- Durum hapları: en sık kullanılan filtre, tabloya girmeden erişilebilir.
         `v-model` DEĞİL: seçili değerin tek kaynağı URL (`?status=`), o da
         container'ın elinde. Aşağı `:model-value`, yukarı `@change` —
         `page` ile birebir aynı çift yönlü desen. İç state'te tutulsaydı
         paylaşılan `?status=In+Transit` linkinde veri filtreli gelir ama
         "Tümü" hapı vurgulu kalır, geri/ileri tuşu da hapı güncellemezdi. -->
    <StatusFilterPills
      :model-value="status"
      :options="statusOptions"
      @change="$emit('filter-status', $event)"
    />

    <!-- ARAMA KUTUSU VE SÜTUN HUNİSİ YOK (`DataTableToolbar` kaldırıldı).
         `list_shipments` yalnız `status`, `order`, `limit_start`,
         `limit_page_length` kabul ediyor: serbest metin araması ve sütun
         filtresi uca hiç gitmiyordu, kutuya yazılan şey hiçbir şey yapmıyordu.
         Çalışmayan bir kontrol göstermektense hiç göstermemek doğru
         (CatalogListScreen'deki aynı gerekçe). Uç `search`/`order_by`
         desteklerse (11-BE/16-FE) CatalogListScreen'deki `params-change`
         deseni buraya uygulanır: `dt` state'i debounce ile yukarı emit edilir,
         container uca parametre olarak geçirir. -->

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />
    <div v-else-if="loading" class="space-y-2" :aria-busy="true">
      <Skeleton v-for="i in 8" :key="i" variant="rect" height="44px" />
    </div>
    <EmptyState
      v-else-if="!rows.length"
      :filtered="hasActiveFilters"
      :entity="t('logistics.shipment.entity')"
      @clear-filters="$emit('filter-status', '')"
    />

    <!-- Sayfalama DataTable'ın KENDİ ListPagination'ı; ikinci bir tane
         eklenmiyor. `page-size-options` boş: sayfa boyutu container'da sabit
         (URL yalnız `?page` taşıyor), seçici çizmek karşılıksız kalırdı. -->
    <DataTable
      v-else
      :dt="dt"
      :rows="rows"
      :total="total"
      :page-size-options="[]"
      row-key="name"
      clickable
      @row-click="$emit('open', $event)"
    >
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
        <span v-else class="text-xs text-gray-600">{{ t("logistics.shipment.noTracking") }}</span>
      </template>
    </DataTable>

    <BulkActionBar :count="selection.length" @clear="$emit('clear-selection')">
      <button
        v-if="can.write"
        type="button"
        class="hdr-btn-outlined"
        @click="$emit('bulk-print-labels')"
      >
        {{ t("logistics.shipment.printLabels") }}
      </button>
      <button
        v-if="can.write"
        type="button"
        class="hdr-btn-primary"
        @click="$emit('bulk-update-status')"
      >
        {{ t("logistics.shipment.updateStatus") }}
      </button>
    </BulkActionBar>
  </div>
</template>

<script setup>
  import { computed, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import Skeleton from "@/components/common/Skeleton.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import DataTable from "@/components/common/datatable/DataTable.vue";
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
   * URL senkronu container'ın (Faz E) işi. Durum ve sayfa aynı desende:
   * `status`/`page` prop olarak iniyor, `filter-status`/`update:page` ile
   * geri çıkıyor. Ekranda saklanan filtre state'i YOK.
   *
   * TEK FİLTRE DURUM HAPLARI. Arama ve sütun sıralaması/filtresi
   * kaldırıldı — `list_shipments` bunları kabul etmiyor (bkz. FIELDS ve
   * template'teki gerekçeler).
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
    /**
     * URL'den gelen durum filtresi (`?status=`) — hapların tek doğruluk
     * kaynağı. Boş string = "Tümü".
     */
    status: { type: String, default: "" },
    /** URL'den gelen sayfa numarası — tablonun tek doğruluk kaynağı. */
    page: { type: Number, default: 1 },
    /** Container'ın uca gönderdiği sayfa boyutu; tablo aynısını kullanmalı. */
    pageSize: { type: Number, default: 50 },
  });

  const emit = defineEmits([
    "open",
    "create-manual",
    "retry",
    "filter-status",
    "clear-selection",
    "bulk-print-labels",
    "bulk-update-status",
    "update:page",
  ]);

  const { t, te } = useI18n();

  const tx = (key, fallback) => (te(key) ? t(key) : fallback);

  /**
   * Sütun tanımları — `computed` DEĞİL, düz fonksiyon.
   *
   * `useDataTable(fields)` düz bir dizi bekliyor ve onu closure'da BİR KEZ
   * okuyup saklıyor; computed sarmalayıcısı burada hiçbir tazelik
   * kazandırmıyordu (tek çağrıda `.value` okunup atılıyordu), yalnız yanlış
   * bir mekanizma anlatıyordu. Etiketler MOUNT ANINDA okunuyor; dil
   * değiştiğinde tazeliği `ShipmentListView`'daki `:key="locale"` remount'u
   * sağlıyor. Sayfa numarası URL'de olduğu için remount iş kaybettirmiyor.
   *
   * `sortable` BAYRAKLARI YOK: `list_shipments` `order_by` kabul etmiyor,
   * tıklanan başlık yalnız `dt.sorting`i değiştirir ve sunucudan gelen sıra
   * hiç değişmezdi — kullanıcıya yalan söyleyen bir kontrol.
   *
   * `carrier` sütunundaki `filter: { type: "text" }` de KALDIRILDI: uç
   * taşıyıcı filtresi almıyor; üstelik `useDataTable` `filter.variant`
   * bekliyor, `type` hiç okunmuyordu (CatalogListScreen'de aynı gerekçe).
   *
   * `modified` artık `defaultHidden` DEĞİL: sütun hunisini taşıyan
   * `DataTableToolbar` kaldırıldığı için gizlenen sütunu geri açmanın yolu
   * kalmazdı.
   *
   * Uç `search`/`order_by` desteklediğinde bu bayraklar geri gelir ve
   * CatalogListScreen'deki `params-change` deseni uygulanır.
   */
  function buildFields() {
    return [
      { key: "name", label: tx("logistics.shipment.col.name", "Sevkiyat") },
      { key: "order", label: tx("logistics.shipment.col.order", "Sipariş") },
      { key: "status", label: tx("logistics.shipment.col.status", "Durum") },
      { key: "carrier", label: tx("logistics.shipment.col.carrier", "Taşıyıcı") },
      { key: "tracking_number", label: tx("logistics.shipment.col.tracking_number", "Takip No") },
      { key: "package_count", label: tx("logistics.shipment.col.package_count", "Koli") },
      { key: "ship_date", label: tx("logistics.shipment.col.ship_date", "Sevk") },
      {
        key: "estimated_delivery",
        label: tx("logistics.shipment.col.estimated_delivery", "Tahmini Teslim"),
      },
      { key: "modified", label: tx("logistics.shipment.col.modified", "Güncelleme") },
    ];
  }

  const dt = useDataTable(buildFields(), { pageSize: props.pageSize });
  dt.setPage(props.page);

  // URL → tablo (geri/ileri, paylaşılan link).
  watch(
    () => props.page,
    (next) => {
      if (next !== dt.page.value) dt.setPage(next);
    }
  );

  // Tablo → URL. Durum filtresi değişince container `?page`i düşürüyor ve
  // yukarıdaki watcher tabloyu 1'e çekiyor; her sayfa değişimi buradan geçiyor.
  watch(dt.page, (next) => {
    if (next !== props.page) emit("update:page", next);
  });

  const statusOptions = computed(() => [
    { value: "", label: t("logistics.shipment.allStatuses"), count: props.total },
    ...Object.keys(SHIPMENT_STATUS_TONE).map((status) => ({
      value: status,
      label: te(`logistics.status.${status}`) ? t(`logistics.status.${status}`) : status,
      count: props.statusCounts[status] ?? 0,
    })),
  ]);

  /**
   * Tek filtre durum hapı: "sonuç yok" ile "hiç kayıt yok" ayrımı yalnız
   * ona bakıyor. Eskiden `dt.search`/`dt.activeFilterCount` okunuyordu; ikisi
   * de artık hiçbir zaman dolmuyor (arama kutusu ve sütun filtresi kalktı),
   * yani boş liste her zaman "hiç kayıt yok" gibi görünürdü.
   */
  const hasActiveFilters = computed(() => Boolean(props.status));
</script>
