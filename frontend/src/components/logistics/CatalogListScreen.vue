<template>
  <div>
    <!-- Sayfa başlığı + eylemler — DocTypeListView ile birebir hiyerarşi -->
    <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ title }}
        </h1>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ t("docTypeList.recordsFound", { count: total }) }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <!-- Mobilde görünüm seçimi yok — kompakt liste zorunlu (aşağıdaki isLg watch'ı) -->
        <ViewModeToggle
          v-model="viewMode"
          :modes="['table', 'grid', 'list']"
          class="hidden lg:flex"
        />
        <button
          type="button"
          class="hdr-btn-outlined list-iconify"
          :title="t('docTypeList.refresh')"
          @click="$emit('refresh')"
        >
          <AppIcon name="refresh-cw" :size="14" />
          <span>{{ t("docTypeList.refresh") }}</span>
        </button>
        <!-- Yetki yoksa buton HİÇ render edilmez; disabled bırakmak
             "yapabilirim ama şu an olmaz" der, oysa yetki yok. -->
        <button v-if="can.create" type="button" class="hdr-btn-primary" @click="$emit('create')">
          <AppIcon name="plus" :size="14" />
          <span>{{ t("docTypeList.addNew") }}</span>
        </button>
      </div>
    </div>

    <!-- Başlığın ALTINDA ayrı satır: container'ın katalog seçicisi buraya
         girer. Durum pill'lerinin üstünde ve onlardan görsel olarak ayrık
         durması bilinçli — iki pill sırası üst üste gelince hangisinin
         kataloğu, hangisinin durumu seçtiği okunmuyordu. -->
    <slot name="subheader" />

    <!-- Aktiflik hızlı filtresi — yalnız desktop; mobilde yerini filtre
         çubuğundaki kompakt seçici alır (DocTypeListView L-2 deseni).
         `is_active` alanı OLMAYAN kataloglarda (durum eşlemesi, istisna kodu)
         hiç gösterilmez: uç filtreyi koşulsuz uyguluyor, alan yoksa hata. -->
    <StatusFilterPills
      v-if="hasActiveField"
      v-model="statusFilter"
      :options="statusPillOptions"
      wrapper-class="hidden lg:flex items-center gap-2 flex-wrap mb-4"
    />

    <!-- Filtre çubuğu -->
    <div class="card mb-5 !p-3">
      <div
        class="list-filtersbar flex flex-col lg:flex-row items-stretch lg:items-center gap-3 flex-wrap"
      >
        <div class="list-filtersbar-search relative flex-1 min-w-0 lg:min-w-[200px]">
          <AppIcon
            name="search"
            :size="13"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 pointer-events-none"
          />
          <input
            :value="dt.search.value"
            type="text"
            :placeholder="searchPlaceholder"
            class="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-600 dark:placeholder:text-gray-600"
            @input="dt.setSearch($event.target.value)"
          />
        </div>
        <!-- Mobil: aktiflik pill'lerinin kompakt karşılığı -->
        <div v-if="hasActiveField" class="flex items-center gap-2 lg:hidden">
          <AppIcon name="funnel" :size="13" class="text-gray-600 dark:text-gray-400" />
          <AppSelect v-model="statusFilter" :options="statusPillOptions" class="flex-1" />
        </div>
        <div class="flex items-center gap-2">
          <AppIcon
            name="arrow-down-wide-narrow"
            :size="13"
            class="text-gray-600 dark:text-gray-400"
          />
          <AppSelect v-model="sortBy" :options="sortOptions" class="flex-1 lg:min-w-[170px]" />
        </div>
      </div>
    </div>

    <!-- Hata: liste yerine geçer, tablo gösterilmez -->
    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <!-- Yükleniyor: iskelet, boş tablo değil — yerleşim kaymasın -->
    <div v-else-if="loading" class="card p-5" :aria-busy="true">
      <Skeleton variant="row" :count="7" />
    </div>

    <!-- Boş: filtre yüzünden mi gerçekten boş mu, ayrımı önemli -->
    <EmptyState
      v-else-if="!rows.length"
      :filtered="hasActiveFilters"
      :entity="title"
      @clear-filters="clearFilters"
    />

    <!-- TABLO — DataTable kendi `card`ını ve sayfalayıcısını çizer,
         bu yüzden bu dalda ayrıca ListPagination YOK. -->
    <DataTable
      v-else-if="viewMode === 'table'"
      :dt="dt"
      :rows="rows"
      :total="total"
      row-key="name"
      :page-size-options="[]"
      clickable
      @row-click="$emit('open', $event)"
    >
      <!-- Tümünü seç — `select` sütununda DataTable tıklamayı durduruyor -->
      <template #head-select>
        <input
          type="checkbox"
          class="form-checkbox rounded text-brand-800"
          :checked="allSelectedOnPage"
          :indeterminate.prop="someSelectedOnPage"
          @change="toggleSelectAll"
        />
      </template>
      <template #cell-select="{ row }">
        <input
          type="checkbox"
          class="form-checkbox rounded text-brand-800"
          :checked="isSelected(row.name)"
          @change="toggleSelect(row.name)"
        />
      </template>

      <!-- Aktiflik sütunu rozet olarak; 0/1 tamsayı geldiği unutulmasın -->
      <template #cell-is_active="{ row }">
        <span class="badge text-[10px] font-medium" :class="activeBadgeClass(row.is_active)">
          {{ row.is_active ? t("logistics.catalog.active") : t("logistics.catalog.passive") }}
        </span>
      </template>

      <template #cell-action="{ row }">
        <button
          type="button"
          class="text-gray-600 hover:text-gray-600 dark:hover:text-gray-300"
          @click="$emit('open', row)"
        >
          <AppIcon name="more-vertical" :size="14" />
        </button>
      </template>
    </DataTable>

    <!-- KART / KOMPAKT LİSTE — DataTable mount edilmediği için sayfalayıcı burada -->
    <div v-else class="card p-0 overflow-hidden">
      <div v-if="viewMode === 'grid'" class="list-grid">
        <div v-for="row in rows" :key="row.name" class="list-grid-card" @click="$emit('open', row)">
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="list-grid-card-title truncate">{{ primaryText(row) }}</span>
            <span
              v-if="hasActiveField"
              class="badge text-[10px] font-medium"
              :class="activeBadgeClass(row.is_active)"
            >
              {{ row.is_active ? t("logistics.catalog.active") : t("logistics.catalog.passive") }}
            </span>
          </div>
          <div
            v-for="col in cardColumns"
            :key="col.key"
            class="text-xs text-gray-600 dark:text-gray-400 mb-1"
          >
            <span class="font-medium">{{ col.label }}:</span> {{ row[col.key] || "—" }}
          </div>
        </div>
      </div>

      <div v-else>
        <div
          v-for="row in rows"
          :key="row.name"
          class="list-compact-item"
          @click="$emit('open', row)"
        >
          <input
            type="checkbox"
            class="form-checkbox rounded text-brand-800 flex-shrink-0"
            :checked="isSelected(row.name)"
            @click.stop
            @change="toggleSelect(row.name)"
          />
          <span
            v-if="hasActiveField"
            class="lc-dot"
            :class="row.is_active ? 'bg-emerald-400' : 'bg-gray-400'"
          ></span>
          <div class="lc-main">
            <div class="lc-line1">
              <span v-if="primaryText(row) !== row.name" class="lc-id">{{ row.name }}</span>
              <span class="list-compact-name">{{ primaryText(row) }}</span>
            </div>
            <div class="lc-sub">{{ secondaryText(row) }}</div>
          </div>
          <span
            v-if="hasActiveField"
            class="badge lc-badge text-[10px] font-medium"
            :class="activeBadgeClass(row.is_active)"
          >
            {{ row.is_active ? t("logistics.catalog.active") : t("logistics.catalog.passive") }}
          </span>
        </div>
      </div>

      <ListPagination
        v-if="total > 0"
        :model-value="dt.page.value"
        :total="total"
        :page-size="dt.pageSize.value"
        :page-size-options="[]"
        @update:model-value="dt.setPage($event)"
      />
    </div>

    <!-- Toplu eylem: yalnız `is_active` alanı OLAN kataloglarda anlamlı —
         durum eşlemesi / istisna kodu bu alanı taşımıyor, uç isteği
         reddederdi. -->
    <BulkActionBar :count="selection.length" @clear="clearSelection">
      <button
        v-if="can.write && hasActiveField"
        type="button"
        class="hdr-btn-outlined"
        @click="$emit('bulk-toggle-active', { names: [...selection], isActive: 0 })"
      >
        {{ t("logistics.catalog.deactivateSelected") }}
      </button>
    </BulkActionBar>
  </div>
</template>

<script setup>
  import { computed, onUnmounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import AppSelect from "@/components/common/AppSelect.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import DataTable from "@/components/common/datatable/DataTable.vue";
  import { useDataTable } from "@/composables/useDataTable";
  import { useResponsiveViewMode } from "@/composables/useResponsiveViewMode";

  import BulkActionBar from "./BulkActionBar.vue";
  import EmptyState from "./EmptyState.vue";
  import ErrorState from "./ErrorState.vue";
  import { catalogFieldsToTableFields, getCatalogMeta } from "./catalogMeta";

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
   *   Veri fetch ETMEZ, store bilmez. Container veriyi props ile verir ve
   *   `params-change` olayını dinleyip yeniden çeker. Böylece Storybook'ta
   *   mock, uygulamada gerçek veriyle aynı bileşen çalışır.
   *
   * GÖRSEL DİL: `views/doctype/DocTypeListView.vue` referans alındı —
   *   başlık ölçüleri, `hdr-btn-*` düğmeleri, `card` filtre çubuğu, durum
   *   pill'leri ve görünüm modları oradan birebir taşındı.
   *
   * SÜTUN KİMLİĞİ SABİT: `useDataTable` alan listesini BİR KEZ okur. Katalog
   *   değiştiğinde sütunlar eskisinde kalmasın diye container bu bileşeni
   *   `:key="activeKey"` ile yeniden kurar (bilinçli: bir kataloğun filtresi
   *   diğerine taşınmasın).
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
    /** `get_logistics_permissions` çıktısından türetilir. */
    can: {
      type: Object,
      default: () => ({ read: true, write: false, create: false, delete: false }),
    },
  });

  const emit = defineEmits([
    "create",
    "open",
    "retry",
    "refresh",
    "clear-selection",
    "bulk-toggle-active",
    "params-change",
  ]);

  /**
   * Seçili kayıt adları. `defineModel`: container v-model bağlamadığında da
   * kutucuklar çalışsın (yerel değer), bağladığında tek kaynak parent olsun.
   */
  const selection = defineModel("selection", { type: Array, default: () => [] });

  const { t, te } = useI18n();

  const meta = computed(() => getCatalogMeta(props.catalogKey));

  /**
   * Katalogda `is_active` alanı var mı?
   *
   * `carrier_status_mapping` ve `shipment_exception_code` bu alanı taşımıyor.
   * Uç `is_active` filtresini KOŞULSUZ uyguluyor (`_build_filters`), yani o
   * kataloglarda filtre göndermek hataya düşürür — pill'ler ve rozetler bu
   * yüzden koşullu.
   */
  const hasActiveField = computed(() =>
    meta.value.list_fields.some((field) => field.name === "is_active")
  );

  /**
   * Sütunlar: seçim kutusu + sözleşme alanları + satır kebabı.
   *
   * `filter` anahtarı BİLEREK düşürülüyor. Sözleşme artık DOĞRU biçimi
   * üretiyor (`{variant, options}` — `catalogMeta.buildFilter`), ama sütun
   * hunisinde girilen değerler hâlâ `currentParams()` payload'una
   * bağlanmıyor: uç `list_catalog` yalnız `search`/`is_active` alıyor.
   * Çalışmayan bir kontrol göstermektense hiç göstermemek doğru; filtre
   * değerleri `filters` parametresine bağlanınca bu satır kalkacak.
   * (`select`/`action` anahtarları DataTable'da satır tıklamasını durdurur.)
   */
  const columnFields = [
    { key: "select", label: "", sortable: false, minWidth: 36 },
    ...catalogFieldsToTableFields(props.catalogKey, t, te).map((field) => ({
      key: field.key,
      label: field.label,
      sortable: field.sortable,
      defaultHidden: field.defaultHidden,
    })),
    { key: "action", label: "", sortable: false, align: "right", minWidth: 44 },
  ];

  const dt = useDataTable(columnFields, { pageSize: 50 });

  // ── Görünüm modu ─────────────────────────────────────────────────────
  // Mobilde tablo/kart okunmaz — kompakt liste zorunlu; desktop'a dönünce
  // kullanıcının önceki modu geri gelir (DocTypeListView ile aynı davranış,
  // artık ortak composable'dan).
  const { viewMode } = useResponsiveViewMode("table");

  // ── Filtre / sıralama ────────────────────────────────────────────────
  const statusFilter = ref("");

  /** Seçicideki sıralama değerleri — `sortOptions` etiketlerinin karşılığı. */
  const SORT_VALUES = ["modified desc", "creation desc", "name asc"];

  /**
   * Başlangıç sıralaması SÖZLEŞMEDEN.
   *
   * `params-change` watch'ı `immediate` DEĞİL (ilk yükü container `onMounted`
   * içinde kendisi yapıyor, çift istek istemiyoruz). Yani ilk listede uç
   * `order_by` almıyor ve kataloğun `default_sort`'unu uyguluyor. Seçicide
   * sabit "Son değiştirilen" yazıyordu — ekran, ucun yaptığından BAŞKA bir şey
   * iddia ediyordu.
   *
   * `default_sort` üç genel seçenekten birine denk gelmiyorsa (sözleşmedeki
   * on kataloğun tamamı bugün alan bazlı A-Z sıralıyor) "modified desc"e
   * düşüyoruz — seçicide boş değer göstermek daha kötü. Bu kalan sapma
   * `default_sort` seçenek olarak eklenince ya da uç ilk istekte `order_by`
   * alınca kapanır.
   */
  const sortBy = ref(
    SORT_VALUES.includes(meta.value.default_sort) ? meta.value.default_sort : "modified desc"
  );

  const statusPillOptions = computed(() => [
    { value: "", label: t("docTypeList.all"), dot: "bg-brand-400" },
    { value: "1", label: t("logistics.catalog.active"), dot: "bg-emerald-400" },
    { value: "0", label: t("logistics.catalog.passive"), dot: "bg-gray-400" },
  ]);

  const sortOptions = computed(() => [
    { value: SORT_VALUES[0], label: t("docTypeList.sortLastModified") },
    { value: SORT_VALUES[1], label: t("docTypeList.sortLastCreated") },
    { value: SORT_VALUES[2], label: t("docTypeList.sortNameAsc") },
  ]);

  const searchPlaceholder = computed(() =>
    t("logistics.catalog.searchPlaceholder", { entity: props.title })
  );

  const hasActiveFilters = computed(
    () => Boolean(dt.search.value.trim()) || statusFilter.value !== ""
  );

  function clearFilters() {
    dt.clearAll();
    statusFilter.value = "";
  }

  // Sütun başlığından sıralama seçiciyi EZER; seçici değişince başlık
  // sıralaması sıfırlanır — iki kontrol aynı anda farklı şey söylemesin.
  const orderBy = computed(() =>
    dt.sorting.value.length
      ? dt.sorting.value.map((s) => `${s.field} ${s.desc ? "desc" : "asc"}`).join(", ")
      : sortBy.value
  );

  watch(sortBy, () => {
    dt.setSort([]);
    dt.setPage(1);
  });
  watch(statusFilter, () => dt.setPage(1));

  // ── Backend parametreleri ────────────────────────────────────────────
  // Sayfalama/arama/sıralama SUNUCUDA yapılıyor; container bu payload'u
  // `store.fetchCatalog(key, params)`'a geçirir.
  function currentParams() {
    return {
      page: dt.page.value,
      pageSize: dt.pageSize.value,
      search: dt.search.value.trim(),
      isActive:
        !hasActiveField.value || statusFilter.value === "" ? null : Number(statusFilter.value),
      orderBy: orderBy.value,
    };
  }

  const paramsPayload = computed(currentParams);

  let paramsTimer;
  watch(paramsPayload, (next, prev) => {
    clearTimeout(paramsTimer);
    // Arama yazarken her tuşta istek atma (DocTypeListView 400 ms deseni);
    // diğer değişiklikler anında gider. Değerler emit anında yeniden
    // okunuyor — araya giren sayfa sıfırlaması da payload'a yansısın.
    const delay = next.search !== prev.search ? 400 : 0;
    paramsTimer = setTimeout(() => emit("params-change", currentParams()), delay);
  });
  onUnmounted(() => clearTimeout(paramsTimer));

  // ── Seçim ────────────────────────────────────────────────────────────
  const isSelected = (name) => selection.value.includes(name);

  function toggleSelect(name) {
    selection.value = isSelected(name)
      ? selection.value.filter((n) => n !== name)
      : [...selection.value, name];
  }

  const allSelectedOnPage = computed(
    () => props.rows.length > 0 && props.rows.every((r) => isSelected(r.name))
  );
  const someSelectedOnPage = computed(
    () => props.rows.some((r) => isSelected(r.name)) && !allSelectedOnPage.value
  );

  function toggleSelectAll() {
    const pageNames = props.rows.map((r) => r.name);
    if (allSelectedOnPage.value) {
      const onPage = new Set(pageNames);
      selection.value = selection.value.filter((n) => !onPage.has(n));
      return;
    }
    selection.value = [...new Set([...selection.value, ...pageNames])];
  }

  function clearSelection() {
    selection.value = [];
    emit("clear-selection");
  }

  // ── Kart / kompakt liste yardımcıları ────────────────────────────────
  /** Kartta başlık olacak alan: aranabilir ilk alan, yoksa ilk veri alanı. */
  const primaryField = computed(() => {
    const searchable = meta.value.searchable?.[0];
    if (searchable) return searchable;
    const first = meta.value.list_fields.find((f) => f.name !== "name" && f.type === "Data");
    return first?.name ?? "name";
  });

  /** Kartta alt satır olarak yazılacak sütunlar (başlık ve aktiflik hariç). */
  const cardColumns = computed(() =>
    columnFields.filter(
      (col) => !["select", "action", "is_active", primaryField.value].includes(col.key)
    )
  );

  const primaryText = (row) => row[primaryField.value] || row.name;

  function secondaryText(row) {
    const col = cardColumns.value.find((c) => row[c.key]);
    return col ? String(row[col.key]) : row.name;
  }

  const activeBadgeClass = (isActive) =>
    isActive
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : "bg-gray-500/10 text-gray-600";
</script>

<!-- Mobil (≤767px) L-2 filtre çubuğu düzeni artık `scss/tables.scss`'te
     paylaşılan `.list-filtersbar` / `.list-iconify` sınıflarında — bu bileşen
     ve DocTypeListView aynı 28 satırı ayrı ayrı taşıyordu. -->
