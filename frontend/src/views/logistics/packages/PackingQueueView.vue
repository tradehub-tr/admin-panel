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
        <!-- Mobilde görünüm seçimi yok — kompakt liste zorunlu
             (`useResponsiveViewMode`, CatalogListScreen ile aynı desen). -->
        <ViewModeToggle
          v-model="viewMode"
          :modes="['table', 'grid', 'kanban', 'list']"
          class="hidden lg:flex"
        />
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
    <!-- Kanban'da GİZLİ: sütunlar ve pill'ler aynı işi yapıyor. Yan yana
         dururlarsa aynı ekranda iki ayrı filtreleme mantığı olur — pill bir
         kovayı seçerken pano dördünü birden gösteriyor, hangisinin geçerli
         olduğu okunmuyor. -->
    <StatusFilterPills
      v-if="!isKanban"
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
            class="form-input-sm w-full !pl-9 w-full"
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

    <!-- KANBAN — SALT-OKUNUR pano.
         Kova sevkiyatın KENDİ verisinden hesaplanıyor (`bucketOf`: koli
         girilmiş mi, etiket üretilmiş mi). Kartı "Paketlenmedi"den "Hazır"a
         sürüklemek koliyi fiziksel olarak paketlemiyor — kart bir sonraki
         yüklemede eski kovasına geri düşer ve kullanıcı işi yaptığını sanır.
         Bu yüzden sürükleme YOK: kart tıklanınca işin gerçekten yapıldığı
         yere, çalışma alanına gidiyor.

         Seçim de yok. Kutucuklar dört kovaya yayılınca "seçilenlere etiket
         üret" tek sevkiyat kuralını sessizce çiğneyebilir hâle geliyordu. -->
    <template v-else-if="isKanban">
      <p class="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400">
        <AppIcon name="lock" :size="12" />
        {{ t("logistics.packing.queue.kanbanReadonly") }}
      </p>

      <!-- SESSİZ KIRPMA YASAK: pano tek seferde sınırlı sayıda kayıt
           yüklüyor. Gerisi görünmüyorsa kullanıcı bunu bilmeli, yoksa
           panoyu "hepsi bu" diye okur. -->
      <p
        v-if="kanbanTruncated"
        class="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
        role="status"
      >
        {{ t("logistics.packing.queue.kanbanTruncated", { shown: store.queueRows.length, total: store.queueTotal }) }}
      </p>

      <div class="list-kanban">
        <div v-for="col in kanbanColumns" :key="col.key" class="kanban-col pq-kanban-col">
          <div class="kanban-col-header">
            <span>{{ col.label }}</span>
            <span class="kanban-col-count">{{ col.rows.length }}</span>
          </div>
          <div class="kanban-col-body">
            <button
              v-for="row in col.rows"
              :key="row.shipment"
              type="button"
              class="kanban-card w-full text-start"
              @click="openWorkspace(row)"
            >
              <span class="kanban-card-title block font-mono">{{ row.shipment }}</span>
              <span class="block truncate">{{ row.buyer_name }}</span>
              <span class="kanban-card-meta mt-1 block">
                {{ t("logistics.packing.queue.itemCount") }}: {{ row.item_count }}
                · {{ t("logistics.packing.packages") }}: {{ row.package_count || "—" }}
              </span>
              <span class="mt-1.5 flex items-center gap-1.5">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="waitClass(row.waiting_hours)">
                  {{ waitLabel(row.waiting_hours) }}
                </span>
                <span class="kanban-card-meta truncate">{{ row.carrier }}</span>
              </span>
            </button>
            <p
              v-if="!col.rows.length"
              class="px-2 py-6 text-center text-[11px] italic text-slate-600 dark:text-slate-400"
            >
              {{ t("logistics.packing.queue.kanbanEmptyColumn") }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- KART — dar ekranda tablonun yatay kaydırmasını bitiriyor. Seçim
         kutucuğu ve "çalışma alanını aç" tabloyla aynı işi görüyor. -->
    <div v-else-if="viewMode === 'grid'" class="list-grid !p-0">
      <div v-for="row in store.queueRows" :key="row.shipment" class="list-grid-card !cursor-default">
        <div class="mb-2 flex items-start justify-between gap-2">
          <label class="flex min-w-0 items-center gap-2">
            <input
              type="checkbox"
              :checked="selection.includes(row.shipment)"
              :aria-label="row.shipment"
              @change="toggle(row.shipment)"
            />
            <code class="list-grid-card-title !mb-0 truncate font-mono">{{ row.shipment }}</code>
          </label>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="waitClass(row.waiting_hours)">
            {{ waitLabel(row.waiting_hours) }}
          </span>
        </div>
        <p class="truncate text-sm">{{ row.buyer_name }}</p>
        <p class="truncate text-xs text-slate-600 dark:text-slate-400">{{ row.seller_name }}</p>
        <dl class="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
          <div class="flex justify-between gap-2">
            <dt>{{ t("logistics.shipment.order") }}</dt>
            <dd class="font-mono">{{ row.order }}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt>{{ t("logistics.packing.queue.itemCount") }}</dt>
            <dd class="tabular-nums">{{ row.item_count }}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt>{{ t("logistics.packing.packages") }}</dt>
            <dd class="tabular-nums">{{ row.package_count || "—" }}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt>{{ t("logistics.shipment.carrier") }}</dt>
            <dd class="truncate">{{ row.carrier }}</dd>
          </div>
        </dl>
        <button type="button" class="th-btn-outline mt-3 w-full justify-center text-xs" @click="openWorkspace(row)">
          {{ t("logistics.packing.queue.openWorkspace") }}
        </button>
      </div>
    </div>

    <!-- KOMPAKT LİSTE — mobilde zorlanan mod. -->
    <div
      v-else-if="viewMode === 'list'"
      class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
    >
      <div
        v-for="row in store.queueRows"
        :key="row.shipment"
        class="list-compact-item !cursor-default"
      >
        <input
          type="checkbox"
          :checked="selection.includes(row.shipment)"
          :aria-label="row.shipment"
          @change="toggle(row.shipment)"
        />
        <div class="lc-main">
          <div class="lc-line1">
            <code class="lc-id font-mono">{{ row.shipment }}</code>
            <span class="list-compact-name truncate">{{ row.buyer_name }}</span>
          </div>
          <p class="mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-400">
            {{ row.order }} · {{ row.seller_name }} ·
            {{ t("logistics.packing.queue.itemCount") }}: {{ row.item_count }} ·
            {{ t("logistics.packing.packages") }}: {{ row.package_count || "—" }}
          </p>
        </div>
        <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="waitClass(row.waiting_hours)">
          {{ waitLabel(row.waiting_hours) }}
        </span>
        <button type="button" class="th-btn-outline text-xs" @click="openWorkspace(row)">
          {{ t("logistics.packing.queue.openWorkspace") }}
        </button>
      </div>
    </div>

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

    <!-- Kanban sayfalanmıyor: pano bütün kovaları birden gösteriyor,
         "2. sayfanın panosu" diye bir şey yok. Kırpma varsa yukarıdaki
         uyarı bandı söylüyor. -->
    <ListPagination
      v-if="!isKanban && store.queueTotal > pageSize"
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
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import EmptyState from "@/components/logistics/EmptyState.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import MockDevPanel from "./components/MockDevPanel.vue";
  import { useResponsiveViewMode } from "@/composables/useResponsiveViewMode";
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

  const LIST_PAGE_SIZE = 50;
  /**
   * Kanban tek istekte DÖRT kovayı birden gösteriyor, dolayısıyla liste
   * sayfası kadar küçük bir pencere yetmez: 50'lik sayfada dördüncü kova
   * çoğu zaman boş görünürdü. 200 ölçülmüş bir tavan değil, makul bir
   * pencere — aşıldığında ekran bunu SÖYLÜYOR (`kanbanTruncated`), sessizce
   * kırpmıyor.
   */
  const KANBAN_PAGE_SIZE = 200;
  const BUCKETS = ["unpacked", "partial", "awaiting_label", "ready"];

  /**
   * Görünüm modu. Masaüstü tercihi `lv-mode:logistics-packing-queue` altında
   * hatırlanıyor; mobilde kompakt listeye zorlanıyor ve o ZORLANMIŞ değer
   * diske yazılmıyor (composable'ın gerekçesi orada yazılı).
   */
  const { viewMode } = useResponsiveViewMode("table", "list", "logistics-packing-queue");
  const isKanban = computed(() => viewMode.value === "kanban");

  const selection = ref([]);
  const filtersOpen = ref(false);
  const filterEl = ref(null);

  const searchDraft = ref(route.query.search ?? "");
  const sellerDraft = ref(route.query.seller ?? "");
  const carrierDraft = ref(route.query.carrier ?? "");
  const dateFromDraft = ref(route.query.date_from ?? "");
  const dateToDraft = ref(route.query.date_to ?? "");

  const pageSize = computed(() => (isKanban.value ? KANBAN_PAGE_SIZE : LIST_PAGE_SIZE));

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

  /**
   * Pano sütunları — kovadan TÜRETİLİYOR, ayrı bir sabit dizi tutulmuyor.
   * İki liste olsaydı biri (pill sırası) değişince diğeri bayatlardı.
   *
   * `row.bucket` sözleşmede zorunlu alan (§2.1) ve mock sözleşme testiyle
   * kilitli — sunucu kovayı hesaplayan taraf, ekran yeniden hesaplamıyor.
   */
  const kanbanColumns = computed(() =>
    BUCKETS.map((key) => ({
      key,
      label: t(`logistics.packing.bucket.${key}`),
      rows: store.queueRows.filter((row) => row.bucket === key),
    }))
  );

  /** Pano penceresine sığmayan kayıt var mı — uyarı bandını o açıyor. */
  const kanbanTruncated = computed(
    () => isKanban.value && store.queueTotal > store.queueRows.length
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
      // Panoda kova SÜZGEÇ DEĞİL sütun: dördü de aynı anda görünmeli.
      // Uç `bucket: null` ile hepsini döndürüyor (sözleşme §2.1) — ayrı bir
      // uca ya da dört ayrı isteğe gerek yok.
      bucket: isKanban.value ? null : bucket.value,
      seller: route.query.seller || null,
      carrier: route.query.carrier || null,
      search: route.query.search || null,
      dateFrom: route.query.date_from || null,
      dateTo: route.query.date_to || null,
      page: isKanban.value ? 1 : page.value,
      pageSize: pageSize.value,
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

  // Mod değişimi İSTEK parametrelerini değiştiriyor (kova süzgeci ve sayfa
  // boyutu), yalnız çizimi değil — bu yüzden yeniden yükleniyor. Kanban'dan
  // çıkarken de gerekli: elde 200 kayıtlık karışık kova listesi kalırdı ve
  // tablo yanlış kovanın satırlarını gösterirdi.
  watch(isKanban, load);
</script>

<style scoped>
  /* Dört kova SABİT (sözleşme §2.1) ve panonun tek gerekçesi dördünü birden
     görmek. Paylaşılan `.kanban-col` sütunu 280px'e sabitliyor; 1440px'lik bir
     dizüstünde pano alanı 1112px kalıyor, içerik 1200px oluyor ve dördüncü
     kova ekran dışına düşüyordu (ölçüldü, 2026-08-19). Sütunlar burada
     esniyor, 200px'in altına inmiyor — daha dar ekranda pano yine kendi içinde
     kayıyor, sayfa kaymıyor.

     Global sınıf DEĞİŞTİRİLMEDİ: aynı `.kanban-col` CRM ve helpdesk
     panolarında da kullanılıyor ve oralarda sütun sayısı değişken. */
  .kanban-col.pq-kanban-col {
    flex: 1 1 200px;
    min-width: 200px;
  }
</style>
