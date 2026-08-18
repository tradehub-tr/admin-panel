<template>
  <div class="space-y-4">
    <!-- <header> DEĞİL <div>: koyu temada base.scss'teki global
         `header { background-color: $d-bg-card !important }` her <header>'ı
         kart rengine boyuyor ve sayfa arka planıyla arasında gri bir çizgi
         gibi okunan bir bant bırakıyor. Bu blok `<main>` içinde olduğu için
         zaten `banner` landmark'ı üretmiyordu — semantik kayıp yok. -->
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h1 class="text-lg font-semibold">{{ t("logistics.packing.queue.title") }}</h1>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          {{ t("logistics.packing.queue.subtitle") }}
        </p>
      </div>
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <button
          v-if="can.generateLabel"
          type="button"
          class="th-btn-outline text-sm"
          :disabled="selection.length !== 1"
          :title="selection.length > 1 ? t('logistics.packing.queue.oneShipmentOnly') : ''"
          @click="openLabelsForSelection"
        >
          {{ t("logistics.packing.queue.labelSelected", { count: selection.length }) }}
        </button>
        <button type="button" class="th-btn-outline text-sm" @click="load">
          {{ t("logistics.queue.refresh") }}
        </button>
      </div>
    </div>

    <!-- E1: kova pill'leri — StatusFilterPills ile aynı dil, sayaçlar listeyle
         AYNI yanıttan geliyor (sözleşme §2.1). -->
    <StatusFilterPills
      v-model="bucketModel"
      :options="bucketOptions"
      wrapper-class="flex items-center gap-2 flex-wrap"
    />

    <!-- Araç çubuğu DataTableToolbar'ın görsel dilini birebir izliyor:
         `card !p-3`, içinde ikonlu `form-input-sm !pl-9`, temizleme çarpısı,
         ardından `hdr-btn-outlined` filtre düğmesi + etkin sayı rozeti.
         Kendi görünümünü uydurmak, aynı işi yapan iki ayrı arama kutusu
         demekti — kullanıcı ekranlar arası geçince aradığı şeyi bulamıyor.

         Bileşenin KENDİSİ kullanılamıyor: `useDataTable` state'ine bağlı,
         bu ekranın filtreleri ise URL sorgusunda tutuluyor (paylaşılabilir
         link — sözleşme gereği). Ortak olan sınıf sözlüğü, o kullanılıyor. -->
    <div class="card !p-3">
      <div class="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
        <div class="relative min-w-0 flex-1">
          <AppIcon
            name="search"
            :size="13"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400"
          />
          <input
            v-model="searchDraft"
            type="search"
            class="form-input-sm w-full !pl-9"
            :placeholder="t('logistics.packing.queue.searchPlaceholder')"
            @keyup.enter="applySearch"
          />
          <button
            v-if="searchDraft"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            :aria-label="t('logistics.packing.queue.clearSearch')"
            @click="clearSearch"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </div>

        <div ref="filterEl" class="relative">
          <button
            type="button"
            class="hdr-btn-outlined"
            :class="activeFilterCount ? '!border-brand-500 !bg-brand-500 !text-brand-ink' : ''"
            :aria-expanded="filtersOpen"
            @click="filtersOpen = !filtersOpen"
          >
            <AppIcon name="filter" :size="13" />
            {{ t("logistics.packing.queue.filters") }}
            <span
              v-if="activeFilterCount"
              class="rounded-full bg-black/15 px-1.5 text-[11px] font-bold"
            >
              {{ activeFilterCount }}
            </span>
          </button>

          <!-- `end-0`: düğme araç çubuğunun SAĞ ucunda. `start-0` ile açılan
               290px'lik panel sayfanın dışına taşıyor ve gövdeye yatay
               kaydırma çubuğu ekliyordu. -->
          <div
            v-if="filtersOpen"
            class="absolute end-0 top-full z-20 mt-1 w-[290px] space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          >
            <label class="block space-y-1">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{{ t("logistics.shipment.seller") }}</span>
              <AppSelect v-model="sellerDraft" :options="sellerOptions" @update:model-value="applyFilters" />
            </label>
            <label class="block space-y-1">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{{ t("logistics.shipment.carrier") }}</span>
              <AppSelect v-model="carrierDraft" :options="carrierOptions" @update:model-value="applyFilters" />
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="space-y-1">
                <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{{ t("logistics.packing.queue.dateFrom") }}</span>
                <input v-model="dateFromDraft" type="date" class="form-input-sm w-full" @change="applyFilters" />
              </label>
              <label class="space-y-1">
                <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{{ t("logistics.packing.queue.dateTo") }}</span>
                <input v-model="dateToDraft" type="date" class="form-input-sm w-full" @change="applyFilters" />
              </label>
            </div>
            <button
              v-if="activeFilterCount"
              type="button"
              class="th-btn-outline w-full justify-center text-xs"
              @click="clearFilters"
            >
              {{ t("logistics.packing.queue.clearFilters") }}
            </button>
          </div>
        </div>
      </div>
      <p class="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
        {{ t("logistics.packing.queue.shareableHint") }}
      </p>
    </div>

    <!-- DEMO paneli bir GELİŞTİRİCİ aracı: satıcıya gösterilmez.
         Gösterilirse satıcı "Yetki hatası" senaryosunu seçip kendi ekranını
         kilitleyebiliyor ve nedenini anlayamıyor (ölçüldü). -->
    <MockDevPanel v-if="auth.isAdmin" @changed="load" />

    <ErrorState v-if="store.error" :error="store.error" @retry="load" />

    <div v-else-if="store.loading" class="space-y-2" aria-busy="true">
      <Skeleton variant="row" :count="6" />
    </div>

    <EmptyState
      v-else-if="!store.queueRows.length"
      :filtered="hasFilters"
      :entity="activeBucketLabel"
      @clear-filters="clearFilters"
    />

    <div v-else class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      <table class="w-full text-sm">
        <thead class="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400 dark:border-slate-700">
          <tr>
            <th class="w-10 p-3">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate.prop="someSelected"
                :aria-label="t('logistics.label.selectAll')"
                @change="toggleAll"
              />
            </th>
            <th class="p-3 text-start">{{ t("logistics.shipment.number") }}</th>
            <th class="p-3 text-start">{{ t("logistics.shipment.order") }}</th>
            <th class="p-3 text-start">{{ t("logistics.shipment.buyer") }}</th>
            <th class="p-3 text-start">{{ t("logistics.shipment.seller") }}</th>
            <th class="p-3 text-end">{{ t("logistics.packing.queue.itemCount") }}</th>
            <th class="p-3 text-end">{{ t("logistics.packing.packages") }}</th>
            <th class="p-3 text-start">{{ t("logistics.packing.queue.waiting") }}</th>
            <th class="p-3 text-start">{{ t("logistics.shipment.carrier") }}</th>
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in store.queueRows"
            :key="row.shipment"
            class="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
          >
            <td class="p-3">
              <input
                type="checkbox"
                :checked="selection.includes(row.shipment)"
                :aria-label="row.shipment"
                @change="toggle(row.shipment)"
              />
            </td>
            <td class="p-3"><code class="font-mono text-xs font-semibold">{{ row.shipment }}</code></td>
            <td class="p-3 text-slate-600 dark:text-slate-400"><code class="font-mono text-xs">{{ row.order }}</code></td>
            <td class="p-3">{{ row.buyer_name }}</td>
            <td class="p-3 text-slate-600 dark:text-slate-400">{{ row.seller_name }}</td>
            <td class="p-3 text-end tabular-nums">{{ row.item_count }}</td>
            <td class="p-3 text-end tabular-nums">
              <span v-if="row.package_count">{{ row.package_count }}</span>
              <!-- Koli yokken "0" değil "—": sıfır bir ölçüm, veri yokluğu değil. -->
              <span v-else class="text-slate-300 dark:text-slate-600">—</span>
            </td>
            <td class="p-3">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="waitClass(row.waiting_hours)">
                {{ waitLabel(row.waiting_hours) }}
              </span>
            </td>
            <td class="p-3 text-xs text-slate-600 dark:text-slate-400">{{ row.carrier }}</td>
            <td class="p-3 text-end">
              <button type="button" class="th-btn-outline text-xs" @click="openWorkspace(row)">
                {{ t("logistics.packing.queue.openWorkspace") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ListPagination
      v-if="store.queueTotal > pageSize"
      v-model="pageModel"
      :total="store.queueTotal"
      :page-size="pageSize"
    />
  </div>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import AppSelect from "@/components/common/AppSelect.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import EmptyState from "@/components/logistics/EmptyState.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import MockDevPanel from "./components/MockDevPanel.vue";
  import { useAuthStore } from "@/stores/auth";
  import { useLogisticsStore } from "@/stores/logistics";
  import { usePackagingStore } from "@/stores/packaging";

  /**
   * **P1 · Paketleme kuyruğu.**
   *
   * Operatörün giriş kapısı. Sevkiyat detayından da paketlemeye girilebiliyor
   * ama o rota Bora'nın `shipments/` alanında — buradan bağımsız bir kapı
   * olmadan ekran yalnız URL ezberleyene açık kalırdı.
   *
   * FİLTRELER URL'DE: TUR-117 "filtreler paylaşılabilir" diyor. Operasyonda
   * "şu gecikenlere bak" linki gönderiliyor; filtre bileşen state'inde
   * kalsaydı link herkeste filtresiz liste açardı.
   */
  const store = usePackagingStore();
  const logisticsStore = useLogisticsStore();
  const auth = useAuthStore();
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const pageSize = 50;
  const BUCKETS = ["unpacked", "partial", "awaiting_label", "ready"];

  const selection = ref([]);
  const filtersOpen = ref(false);
  const filterEl = ref(null);

  const searchDraft = ref(route.query.search ?? "");
  const sellerDraft = ref(route.query.seller ?? "");
  const carrierDraft = ref(route.query.carrier ?? "");
  const dateFromDraft = ref(route.query.date_from ?? "");
  const dateToDraft = ref(route.query.date_to ?? "");

  const bucket = computed(() => (BUCKETS.includes(route.query.bucket) ? route.query.bucket : BUCKETS[0]));
  const page = computed(() => Number(route.query.page) || 1);

  // Yetkiler tek yerden: store `can` içinde normalize ediyor ve eksik
  // capability'ler için köprü kuruyor (bkz. stores/logistics.js).
  const can = computed(() => logisticsStore.can);

  const bucketOptions = computed(() =>
    BUCKETS.map((key) => ({
      value: key,
      label: t(`logistics.packing.bucket.${key}`),
      // `StatusFilterPills` sayacı yalnız > 0 iken çiziyor — "0" yazmak
      // "kayıt yok" demek olurdu, boş bırakmak doğru.
      count: store.buckets[key],
    }))
  );

  /** Kova ve sayfa URL'de tutuluyor; pill/pagination v-model'i oraya yazıyor. */
  const bucketModel = computed({
    get: () => bucket.value,
    set: (key) => pushQuery({ bucket: key }),
  });
  const pageModel = computed({
    get: () => page.value,
    set: (next) => router.replace({ query: { ...route.query, page: next > 1 ? next : undefined } }),
  });

  const activeBucketLabel = computed(() => t(`logistics.packing.bucket.${bucket.value}`));

  const sellerOptions = computed(() => [
    { value: "", label: t("logistics.packing.queue.allSellers") },
    ...uniqueBy(store.queueRows, "seller_name"),
  ]);
  const carrierOptions = computed(() => [
    { value: "", label: t("logistics.packing.queue.allCarriers") },
    ...uniqueBy(store.queueRows, "carrier"),
  ]);

  const hasFilters = computed(() =>
    Boolean(
      route.query.search || route.query.seller || route.query.carrier ||
      route.query.date_from || route.query.date_to
    )
  );

  /**
   * Açılırdaki etkin filtre sayısı.
   *
   * Arama SAYILMIYOR: kutusu ekranda duruyor, kullanıcı ne yazdığını görüyor.
   * Rozet yalnız GİZLENEN filtreleri sayar — amacı "görünmeyen bir kısıt var"
   * demek.
   */
  const activeFilterCount = computed(
    () =>
      ["seller", "carrier", "date_from", "date_to"].filter((k) => route.query[k]).length
  );

  const allSelected = computed(
    () => store.queueRows.length > 0 && selection.value.length === store.queueRows.length
  );
  const someSelected = computed(
    () => selection.value.length > 0 && selection.value.length < store.queueRows.length
  );

  /**
   * Bekleme eşikleri SUNUM kararı — sunucu ham saat veriyor.
   * 24 sa sarı, 72 sa kırmızı: `PendingWorkQueueScreen`'de kullanılan eşikle
   * aynı, operasyon iki ekranda farklı renk görmesin.
   */
  function waitClass(hours) {
    if (hours >= 72) return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400";
    if (hours >= 24) return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
    return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }

  function waitLabel(hours) {
    if (hours < 24) return t("logistics.queue.hours", { count: hours });
    return t("logistics.queue.days", { count: Math.floor(hours / 24) });
  }

  function uniqueBy(rows, key) {
    return [...new Set(rows.map((r) => r[key]).filter(Boolean))].map((v) => ({ value: v, label: v }));
  }

  function load() {
    selection.value = [];
    store.fetchQueue({
      bucket: bucket.value,
      seller: route.query.seller || null,
      carrier: route.query.carrier || null,
      search: route.query.search || null,
      dateFrom: route.query.date_from || null,
      dateTo: route.query.date_to || null,
      page: page.value,
      pageSize,
    });
  }

  /** Filtre değişince 1. sayfaya dön — 3. sayfada daraltma boş liste gösterirdi. */
  function pushQuery(patch) {
    router.replace({ query: { ...route.query, page: undefined, ...patch } });
  }

  function applySearch() {
    pushQuery({ search: searchDraft.value || undefined });
  }

  /** Çarpı — kutuyu boşaltmakla kalmaz, aramayı da kaldırır. */
  function clearSearch() {
    searchDraft.value = "";
    pushQuery({ search: undefined });
  }

  function applyFilters() {
    pushQuery({
      seller: sellerDraft.value || undefined,
      carrier: carrierDraft.value || undefined,
      date_from: dateFromDraft.value || undefined,
      date_to: dateToDraft.value || undefined,
    });
  }

  function clearFilters() {
    filtersOpen.value = false;
    searchDraft.value = "";
    sellerDraft.value = "";
    carrierDraft.value = "";
    dateFromDraft.value = "";
    dateToDraft.value = "";
    router.replace({ query: { bucket: bucket.value } });
  }

  function toggle(name) {
    selection.value = selection.value.includes(name)
      ? selection.value.filter((n) => n !== name)
      : [...selection.value, name];
  }

  function toggleAll() {
    selection.value = allSelected.value ? [] : store.queueRows.map((r) => r.shipment);
  }

  function openWorkspace(row) {
    router.push({ name: "LogisticsPacking", params: { name: row.shipment } });
  }

  /**
   * Etiket ekranı TEK sevkiyat üzerinde çalışıyor: koli seçimi orada yapılıyor
   * ve etiket alıcı adresini taşıyor. İki sevkiyatın kolisini tek listede
   * karıştırmak, yanlış koliye yanlış adresi basma riski demek.
   *
   * Bu yüzden çoklu seçimde buton sessizce ilkine gitmiyor — devre dışı
   * kalıyor ve nedenini söylüyor.
   */
  function openLabelsForSelection() {
    if (selection.value.length !== 1) return;
    router.push({ name: "LogisticsLabels", params: { name: selection.value[0] } });
  }

  /** Açılır dışına tıklanınca kapanır — tarih seçici tıklamaları hariç. */
  function onDocClick(event) {
    if (!filtersOpen.value) return;
    if (!filterEl.value?.contains(event.target)) filtersOpen.value = false;
  }

  onMounted(async () => {
    document.addEventListener("click", onDocClick);
    await logisticsStore.fetchPermissions();
    load();
  });

  onBeforeUnmount(() => document.removeEventListener("click", onDocClick));

  watch(
    () => [
      route.query.bucket, route.query.seller, route.query.carrier,
      route.query.search, route.query.date_from, route.query.date_to, route.query.page,
    ],
    load
  );
</script>
