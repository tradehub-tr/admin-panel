<template>
  <div class="mpage">
    <header class="mpage__head">
      <div>
        <h1 class="mpage__title">
          <AppIcon name="image" :size="24" class="mpage__title-icon" />
          {{ t("media.pageTitle") }}
        </h1>
        <p class="mpage__subtitle">
          {{ t("media.pageSubtitle", { count: counts.all, size: formatBytes(counts.bytes) }) }}
        </p>
      </div>

      <div class="mpage__actions">
        <button type="button" class="mpage__btn" @click="pickerOpen = true">
          <AppIcon name="package" :size="16" />
          {{ t("media.openPicker") }}
        </button>
        <label class="mpage__btn mpage__btn--primary">
          <AppIcon name="upload" :size="16" />
          {{ t("media.upload.button") }}
          <input type="file" multiple :accept="ACCEPT" @change="onFileInput" />
        </label>
      </div>
    </header>

    <div class="mpage__layout" :class="{ 'mpage__layout--detail': Boolean(activeItem) }">
      <!-- ── Sol filtre rayı (mobilde drawer) ── -->
      <aside class="mrail" :class="{ 'mrail--open': filtersOpen }">
        <MediaFilterRail
          v-model:archived="showArchived"
          :groups="filterGroups"
          :tags="availableTags"
          :active-tags="tagFilter"
          :quick-views="quickViews"
          :archived-count="counts.archived"
          :has-active-filter="hasActiveFilter"
          :used-bytes="counts.bytes"
          :quota-bytes="STORAGE_QUOTA_BYTES"
          @toggle-tag="store.toggleTag"
          @reset="store.resetFilters"
          @close="filtersOpen = false"
        />
      </aside>
      <Transition name="fade">
        <div v-if="filtersOpen" class="mrail__scrim" @click="filtersOpen = false" />
      </Transition>

      <!-- ── Orta sütun ── -->
      <section class="mpage__main">
        <div class="mtoolbar">
          <button type="button" class="mtoolbar__filters" @click="filtersOpen = true">
            <AppIcon name="funnel" :size="16" />
            {{ t("media.filters.title") }}
          </button>

          <label class="mtoolbar__search">
            <AppIcon name="search" :size="16" />
            <input
              ref="searchInput"
              v-model="search"
              type="search"
              :placeholder="t('media.searchPlaceholder')"
              :aria-label="t('media.searchPlaceholder')"
            />
            <kbd class="mtoolbar__kbd">/</kbd>
          </label>

          <select v-model="sortBy" class="mtoolbar__sort" :aria-label="t('media.sort.label')">
            <option v-for="opt in SORT_OPTIONS" :key="opt" :value="opt">
              {{ t(`media.sort.${opt}`) }}
            </option>
          </select>

          <button
            type="button"
            class="mtoolbar__icon"
            :title="t(`media.sort.${sortDir}`)"
            :aria-label="t(`media.sort.${sortDir}`)"
            @click="store.toggleSortDir"
          >
            <AppIcon :name="sortDir === 'asc' ? 'arrow-up' : 'arrow-down'" :size="16" />
          </button>

          <ViewModeToggle v-model="viewMode" :modes="['grid', 'list']" />

          <!-- Kısayol yardımı telefonda gizli: klavye yok, açtığı modal 11
               klavye kısayolunu listeliyor. Dar araç çubuğunda yer kaplıyordu. -->
          <button
            type="button"
            class="mtoolbar__icon mtoolbar__icon--help"
            :title="t('media.help.title')"
            :aria-label="t('media.help.title')"
            @click="helpOpen = true"
          >
            <AppIcon name="circle-help" :size="16" />
          </button>
        </div>

        <MediaFilterChips :state="chipState" :labels="chipLabels" @clear="clearFilter" />

        <MediaUploadQueue
          :uploads="uploads"
          @retry="store.retryUpload"
          @cancel="store.cancelUpload"
          @clear="store.clearFinishedUploads"
        />

        <label
          class="mdrop"
          :class="{ 'mdrop--over': dz.isOver.value }"
          @dragenter="dz.onDragEnter"
          @dragover="dz.onDragOver"
          @dragleave="dz.onDragLeave"
          @drop="dz.onDrop"
        >
          <input type="file" multiple :accept="ACCEPT" @change="onFileInput" />
          <AppIcon name="cloud-upload" :size="20" />
          <span class="mdrop__text">
            <strong>{{ t("media.upload.dropTitle") }}</strong>
            {{ t("media.upload.dropHint") }}
          </span>
          <span class="mdrop__text--tap">{{ t("media.upload.dropTap") }}</span>
        </label>

        <div class="mresults">
          <p class="mresults__count">
            {{ t("media.resultRange", { from: rangeFrom, to: rangeTo, total: filtered.length }) }}
          </p>
          <div v-if="filtered.length" class="mresults__actions">
            <button type="button" class="mresults__link" @click="store.selectPage">
              {{ t("media.selectPage", { count: paged.length }) }}
            </button>
            <button type="button" class="mresults__link" @click="store.selectAllVisible">
              {{ t("media.selectAllVisible") }}
            </button>
          </div>
        </div>

        <!-- Grid -->
        <ul v-if="viewMode === 'grid' && paged.length" ref="gridEl" class="mgrid">
          <li v-for="(item, i) in paged" :key="item.id">
            <MediaCard
              :item="item"
              :selected="store.isSelected(item.id)"
              :active="item.id === activeId"
              :focused="i === cursor"
              :editable="store.canEdit(item)"
              @open="openDetail(item.id, i)"
              @toggle="onCardToggle(item.id, i, $event)"
              @action="onAction(item, $event)"
            />
          </li>
        </ul>

        <!-- Liste — dar ekranda tablo değil yığılmış satır.
             Tablo 6 sütun × nowrap ≈ 740px istiyor; ray açıkken orta sütun
             1280px viewport'ta bile ~712px. Yatay kaydırma yerine projenin
             mobil satır kalıbı (SellerListingsView `sl-mrow`) uygulanıyor. -->
        <ul v-else-if="paged.length && rowsMode" ref="gridEl" class="mrows">
          <li v-for="(item, i) in paged" :key="item.id">
            <div
              class="mrow"
              :class="{
                'mrow--active': item.id === activeId,
                'mrow--selected': store.isSelected(item.id),
              }"
            >
              <button
                type="button"
                role="checkbox"
                :aria-checked="store.isSelected(item.id)"
                :aria-label="t('media.card.selectAria', { name: item.fileName })"
                class="mrow__check"
                @click.stop="onCardToggle(item.id, i, { range: $event.shiftKey })"
              >
                <span class="mrow__box">
                  <AppIcon name="check" :size="12" :stroke-width="3.5" />
                </span>
              </button>

              <button type="button" class="mrow__open" @click="openDetail(item.id, i)">
                <MediaThumb :item="item" :icon-size="16" class="mrow__thumb" />
                <span class="mrow__mid">
                  <span class="mrow__name">{{ item.fileName }}</span>
                  <span class="mrow__sub">
                    {{ item.ext }} · {{ formatBytes(item.bytes) }} ·
                    {{ formatDate(item.uploadedAt, locale) }}
                  </span>
                </span>
                <span :class="`mpill mpill--${item.usedIn.length ? 'used' : 'unused'}`">
                  {{
                    item.usedIn.length
                      ? t("media.usedInCount", { count: item.usedIn.length })
                      : t("media.unused")
                  }}
                </span>
              </button>
            </div>
          </li>
        </ul>

        <div v-else-if="paged.length" class="mtable-wrap">
          <table class="mtable">
            <thead>
              <tr>
                <th scope="col" class="mtable__check">
                  <span class="mpage__sr">{{ t("media.select") }}</span>
                </th>
                <th v-for="col in TABLE_COLUMNS" :key="col" scope="col" :class="`mcol--${col}`">
                  {{ t(`media.table.${col}`) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, i) in paged"
                :key="item.id"
                :class="{ 'mtable__row--active': item.id === activeId }"
                @click="openDetail(item.id, i)"
              >
                <td class="mtable__check">
                  <button
                    type="button"
                    role="checkbox"
                    :aria-checked="store.isSelected(item.id)"
                    :aria-label="t('media.card.selectAria', { name: item.fileName })"
                    class="mtable__box"
                    :class="{ 'mtable__box--on': store.isSelected(item.id) }"
                    @click.stop="onCardToggle(item.id, i, { range: $event.shiftKey })"
                  >
                    <AppIcon name="check" :size="11" :stroke-width="3.5" />
                  </button>
                </td>
                <td class="mcol--fileName">
                  <span class="mtable__name">
                    <AppIcon :name="iconForKind(item.kind)" :size="16" />
                    <span class="mtable__name-text">{{ item.fileName }}</span>
                  </span>
                </td>
                <td class="mcol--kind">{{ item.ext }}</td>
                <td class="mcol--size">{{ formatBytes(item.bytes) }}</td>
                <td class="mcol--dimensions">{{ formatDimensions(item) }}</td>
                <td class="mcol--uploadedAt">{{ formatDate(item.uploadedAt, locale) }}</td>
                <td class="mcol--usage">
                  <span :class="`mpill mpill--${item.usedIn.length ? 'used' : 'unused'}`">
                    {{
                      item.usedIn.length
                        ? t("media.usedInCount", { count: item.usedIn.length })
                        : t("media.unused")
                    }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="mempty">
          <AppIcon name="image" :size="34" />
          <p class="mempty__title">{{ t("media.empty.title") }}</p>
          <p class="mempty__body">{{ t("media.empty.body") }}</p>
          <button
            v-if="hasActiveFilter"
            type="button"
            class="mpage__btn"
            @click="store.resetFilters"
          >
            {{ t("media.filters.reset") }}
          </button>
        </div>

        <ListPagination
          v-if="filtered.length > PAGE_SIZES[0]"
          v-model="page"
          v-model:page-size="pageSize"
          :total="filtered.length"
          :page-size-options="PAGE_SIZES"
          class="mpage__pagination"
        />
      </section>

      <!-- Detay paneli sütun olarak yalnız ≥1280px'te durur; altında sheet olarak
           açılır (dar ekranda sütun orta alanı 100–300px'e düşürüyordu). -->
      <Transition name="fade">
        <div
          v-if="activeItem && !detailDocked"
          class="mdetail__scrim"
          @click="store.setActive(null)"
        />
      </Transition>

      <!-- Geldiği yönden girip aynı yönden çıkar: sağa yaslıyken yatay,
           telefonda tam ekran alttan (ANIMATION_AUDIT §7 Standart 4). -->
      <Transition name="mdetail">
        <MediaDetailPanel
          v-if="activeItem"
          :item="activeItem"
          :editable="store.canEdit(activeItem)"
          :sheet="!detailDocked"
          class="mpage__detail"
          @save="onSave"
          @replace="onReplaceFile"
          @action="onAction(activeItem, $event)"
          @close="store.setActive(null)"
        />
      </Transition>
    </div>

    <!-- Geri alma şeridi — yıkıcı işlemden sonra tek tıkla dönüş -->
    <div v-if="undoEntry" class="mundo" role="status">
      <AppIcon name="rotate-ccw" :size="16" />
      <span>{{ t(`media.undo.${undoEntry.type}`, { count: undoEntry.count }) }}</span>
      <button type="button" class="mundo__btn" @click="onUndo">{{ t("media.undo.action") }}</button>
      <button
        type="button"
        class="mundo__close"
        :aria-label="t('media.undo.dismiss')"
        @click="undoEntry = null"
      >
        <AppIcon name="x" :size="14" />
      </button>
    </div>

    <MediaBulkBar
      v-if="selectedIds.length > 1"
      :count="selectedIds.length"
      @tag="onBulkTag"
      @download="onBulkDownload"
      @archive="onBulkArchive"
      @delete="onBulkDelete"
      @clear="store.clearSelection"
    />

    <MediaPreviewModal
      :item="previewItem"
      :index="previewIndex"
      :total="filtered.length"
      @close="previewItem = null"
      @navigate="navigatePreview"
      @edit="openFromPreview"
      @download="onAction(previewItem, 'download')"
    />

    <MediaShortcutsModal v-model:open="helpOpen" />

    <MediaPickerModal
      v-model:open="pickerOpen"
      :items="items"
      @confirm="onPickerConfirm"
      @upload="store.enqueueUploads"
    />

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="confirmPayload.title"
      :message="confirmPayload.message"
      :confirm-label="t('media.actions.delete')"
      tone="danger"
      @confirm="runDelete"
    />
  </div>
</template>

<script setup>
  import { computed, ref, useTemplateRef, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import MediaBulkBar from "@/components/media/MediaBulkBar.vue";
  import MediaCard from "@/components/media/MediaCard.vue";
  import MediaDetailPanel from "@/components/media/MediaDetailPanel.vue";
  import MediaFilterChips from "@/components/media/MediaFilterChips.vue";
  import MediaFilterRail from "@/components/media/MediaFilterRail.vue";
  import MediaPickerModal from "@/components/media/MediaPickerModal.vue";
  import MediaPreviewModal from "@/components/media/MediaPreviewModal.vue";
  import MediaShortcutsModal from "@/components/media/MediaShortcutsModal.vue";
  import MediaThumb from "@/components/media/MediaThumb.vue";
  import MediaUploadQueue from "@/components/media/MediaUploadQueue.vue";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { useDropzone } from "@/composables/useDropzone";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { useMediaShortcuts } from "@/composables/useMediaShortcuts";
  import { useScrollLock } from "@/composables/useScrollLock";
  import { useToast } from "@/composables/useToast";
  import { STORAGE_QUOTA_BYTES, useMediaStore } from "@/stores/media";
  import { formatBytes, formatDate, formatDimensions, iconForKind } from "@/utils/mediaFormat";

  const ACCEPT = "image/*,video/*,.pdf";
  const SORT_OPTIONS = ["newest", "oldest", "name", "size", "usage"];
  const PAGE_SIZES = [12, 24, 48];
  const TABLE_COLUMNS = ["fileName", "kind", "size", "dimensions", "uploadedAt", "usage"];

  const { t, locale } = useI18n();
  const toast = useToast();

  const store = useMediaStore();
  const {
    items,
    uploads,
    filtered,
    paged,
    availableTags,
    availableFormats,
    counts,
    activeItem,
    activeId,
    selectedIds,
    undoEntry,
    hasActiveFilter,
    search,
    kindFilter,
    usageFilter,
    ownerFilter,
    showArchived,
    formatFilter,
    orientationFilter,
    dateFilter,
    sizeFilter,
    tagFilter,
    onlyFavorites,
    onlyMissingAlt,
    sortBy,
    sortDir,
    page,
    pageSize,
  } = storeToRefs(store);

  const { viewMode } = useListViewMode("seller-media", "grid");
  // Sayfa AppLayout içinde: ≥768px'te IconRail+SidePanel 280px yatay alan yiyor.
  // Detay paneli ancak ≥1280px viewport'ta sütun olarak durabiliyor (bkz.
  // media.scss §Kırılma noktaları); altında sheet olarak açılır.
  const { isXl, is2xl: detailDocked } = useBreakpoint();
  // Liste görünümü <1024px'te tablo değil yığılmış satır: o genişliğin altında
  // orta sütun ~700px'in altına düşüyor, 6 sütunluk tablo yatay kayıyordu.
  const rowsMode = computed(() => !isXl.value);

  const filtersOpen = ref(false);
  // Drawer ve sheet ekranı kaplarken arka plan kaymasın.
  useScrollLock(filtersOpen);
  useScrollLock(() => Boolean(activeItem.value) && !detailDocked.value);

  const pickerOpen = ref(false);
  const previewItem = ref(null);
  const helpOpen = ref(false);
  const confirmOpen = ref(false);
  const pendingDelete = ref([]);
  const confirmPayload = ref({ title: "", message: "" });
  /** Klavye imleci — görünen listedeki konum. */
  const cursor = ref(-1);
  const searchInput = useTemplateRef("searchInput");
  const gridEl = useTemplateRef("gridEl");

  const dz = useDropzone((files) => store.enqueueUploads(files), {
    accept: ACCEPT,
    multiple: true,
    maxBytes: 25 * 1024 * 1024,
    onValidationError: (file) => toast.error(t("media.upload.rejected", { name: file.name })),
  });

  // ── Filtreler ──────────────────────────────────────────────────────
  const optionLabel = (group, id) => t(`media.${group}.${id}`);

  const chipLabels = computed(() => ({
    kind: Object.fromEntries(
      ["image", "video", "document"].map((k) => [k, optionLabel("kinds", k)])
    ),
    usage: Object.fromEntries(["used", "unused"].map((k) => [k, optionLabel("usage", k)])),
    owner: Object.fromEntries(["self", "shared"].map((k) => [k, optionLabel("owner", k)])),
    orientation: Object.fromEntries(
      ["landscape", "portrait", "square"].map((k) => [k, optionLabel("orientation", k)])
    ),
    date: Object.fromEntries(
      ["today", "week", "month", "year"].map((k) => [k, optionLabel("date", k)])
    ),
    size: Object.fromEntries(["small", "medium", "large"].map((k) => [k, optionLabel("size", k)])),
  }));

  const chipState = computed(() => ({
    search: search.value,
    kind: kindFilter.value,
    usage: usageFilter.value,
    owner: ownerFilter.value,
    format: formatFilter.value,
    orientation: orientationFilter.value,
    date: dateFilter.value,
    size: sizeFilter.value,
    tags: tagFilter.value,
    favorites: onlyFavorites.value,
    missingAlt: onlyMissingAlt.value,
    archived: showArchived.value,
  }));

  /** Ray üstündeki tek tıklık görünümler — filtre grubu değil, aç/kapa. */
  const quickViews = computed(() => [
    {
      id: "favorites",
      icon: "star",
      label: t("media.quick.favorites"),
      count: counts.value.favorite,
      active: onlyFavorites.value,
      toggle: () => (onlyFavorites.value = !onlyFavorites.value),
    },
    {
      id: "missingAlt",
      icon: "circle-alert",
      label: t("media.quick.missingAlt"),
      count: counts.value.missingAlt,
      active: onlyMissingAlt.value,
      toggle: () => (onlyMissingAlt.value = !onlyMissingAlt.value),
    },
  ]);

  /** Ray grupları veriden üretilir — üç kez kopyalanmış <nav> bloğu yerine. */
  const filterGroups = computed(() => [
    {
      id: "kind",
      label: t("media.filters.kind"),
      value: kindFilter.value,
      set: (v) => (kindFilter.value = v),
      options: [
        {
          id: "all",
          icon: "layout-grid",
          label: optionLabel("kinds", "all"),
          count: counts.value.all,
        },
        {
          id: "image",
          icon: "image",
          label: optionLabel("kinds", "image"),
          count: counts.value.image,
        },
        {
          id: "video",
          icon: "video",
          label: optionLabel("kinds", "video"),
          count: counts.value.video,
        },
        {
          id: "document",
          icon: "file-text",
          label: optionLabel("kinds", "document"),
          count: counts.value.document,
        },
      ],
    },
    {
      id: "usage",
      label: t("media.filters.usage"),
      value: usageFilter.value,
      set: (v) => (usageFilter.value = v),
      options: [
        { id: "all", icon: "list", label: optionLabel("usage", "all"), count: counts.value.all },
        {
          id: "used",
          icon: "circle-check",
          label: optionLabel("usage", "used"),
          count: counts.value.used,
        },
        {
          id: "unused",
          icon: "circle-alert",
          label: optionLabel("usage", "unused"),
          count: counts.value.unused,
        },
      ],
    },
    {
      id: "owner",
      label: t("media.filters.owner"),
      value: ownerFilter.value,
      set: (v) => (ownerFilter.value = v),
      options: [
        { id: "all", icon: "users", label: optionLabel("owner", "all"), count: counts.value.all },
        {
          id: "self",
          icon: "user",
          label: optionLabel("owner", "self"),
          count: counts.value.all - counts.value.shared,
        },
        {
          id: "shared",
          icon: "share-2",
          label: optionLabel("owner", "shared"),
          count: counts.value.shared,
        },
      ],
    },
    {
      id: "format",
      label: t("media.filters.format"),
      value: formatFilter.value,
      set: (v) => (formatFilter.value = v),
      // Seçenekler veriden üretilir; kütüphanede olmayan format listelenmez.
      options: [
        {
          id: "all",
          icon: "file-text",
          label: optionLabel("kinds", "all"),
          count: counts.value.all,
        },
        ...availableFormats.value.map((f) => ({
          id: f.ext,
          icon: "file-text",
          label: f.ext,
          count: f.count,
        })),
      ],
    },
    {
      id: "orientation",
      label: t("media.filters.orientation"),
      value: orientationFilter.value,
      set: (v) => (orientationFilter.value = v),
      options: [
        {
          id: "all",
          icon: "layout-grid",
          label: optionLabel("kinds", "all"),
          count: counts.value.all,
        },
        { id: "landscape", icon: "image", label: optionLabel("orientation", "landscape") },
        { id: "portrait", icon: "file-text", label: optionLabel("orientation", "portrait") },
        { id: "square", icon: "square", label: optionLabel("orientation", "square") },
      ],
    },
    {
      id: "date",
      label: t("media.filters.date"),
      value: dateFilter.value,
      set: (v) => (dateFilter.value = v),
      options: [
        {
          id: "all",
          icon: "calendar",
          label: optionLabel("kinds", "all"),
          count: counts.value.all,
        },
        { id: "today", icon: "clock", label: optionLabel("date", "today") },
        { id: "week", icon: "calendar", label: optionLabel("date", "week") },
        { id: "month", icon: "calendar", label: optionLabel("date", "month") },
        { id: "year", icon: "calendar", label: optionLabel("date", "year") },
      ],
    },
    {
      id: "size",
      label: t("media.filters.size"),
      value: sizeFilter.value,
      set: (v) => (sizeFilter.value = v),
      options: [
        { id: "all", icon: "layers", label: optionLabel("kinds", "all"), count: counts.value.all },
        { id: "small", icon: "chevron-down", label: optionLabel("size", "small") },
        { id: "medium", icon: "minus", label: optionLabel("size", "medium") },
        { id: "large", icon: "chevron-up", label: optionLabel("size", "large") },
      ],
    },
  ]);

  // Filtre veya sıralama değişince ilk sayfaya dön; boş sayfada kalınmasın.
  watch(
    [
      search,
      kindFilter,
      usageFilter,
      ownerFilter,
      formatFilter,
      orientationFilter,
      dateFilter,
      sizeFilter,
      tagFilter,
      onlyFavorites,
      onlyMissingAlt,
      showArchived,
      sortBy,
      sortDir,
      pageSize,
    ],
    () => (page.value = 1)
  );

  const rangeFrom = computed(() =>
    filtered.value.length ? (page.value - 1) * pageSize.value + 1 : 0
  );
  const rangeTo = computed(() => Math.min(page.value * pageSize.value, filtered.value.length));

  function clearFilter(key) {
    if (key === "all") return store.resetFilters();
    if (key.startsWith("tag:")) return store.toggleTag(key.slice(4));
    const setters = {
      search: () => (search.value = ""),
      kind: () => (kindFilter.value = "all"),
      usage: () => (usageFilter.value = "all"),
      owner: () => (ownerFilter.value = "all"),
      format: () => (formatFilter.value = "all"),
      orientation: () => (orientationFilter.value = "all"),
      date: () => (dateFilter.value = "all"),
      size: () => (sizeFilter.value = "all"),
      favorites: () => (onlyFavorites.value = false),
      missingAlt: () => (onlyMissingAlt.value = false),
      archived: () => (showArchived.value = false),
    };
    setters[key]?.();
  }

  // ── Etkileşim ──────────────────────────────────────────────────────
  function onFileInput(event) {
    const files = Array.from(event.target.files || []);
    if (files.length) store.enqueueUploads(files);
    event.target.value = "";
  }

  function openDetail(id, index) {
    store.setActive(id);
    if (index !== undefined) cursor.value = index;
  }

  function onCardToggle(id, index, payload = {}) {
    cursor.value = index;
    if (payload.range) store.selectRangeTo(id);
    else store.toggleSelect(id);
  }

  function onSave(patch) {
    const { fileName, ...rest } = patch;
    const renamed = fileName && fileName !== activeItem.value?.fileName;
    if (renamed) store.rename(activeId.value, fileName);
    if (store.update(activeId.value, rest) || renamed) toast.success(t("media.toast.saved"));
    else toast.error(t("media.toast.readonly"));
  }

  function onReplaceFile(file) {
    if (store.replaceFile(activeId.value, file)) toast.success(t("media.toast.replaced"));
    else toast.error(t("media.toast.readonly"));
  }

  function askDelete(ids) {
    const blocked = ids.filter((id) => !store.canEdit(items.value.find((m) => m.id === id)));
    if (blocked.length === ids.length) {
      toast.error(t("media.toast.readonly"));
      return;
    }
    const inUse = ids
      .map((id) => items.value.find((m) => m.id === id))
      .filter((m) => m && m.usedIn.length > 0).length;

    pendingDelete.value = ids;
    confirmPayload.value = {
      title: t("media.confirm.deleteTitle", { count: ids.length }),
      // Kullanımdaki medya için ekstra uyarı — medya.md §Satıcı Kuralları
      message: inUse
        ? t("media.confirm.deleteInUse", { count: inUse })
        : t("media.confirm.deleteBody"),
    };
    confirmOpen.value = true;
  }

  function runDelete() {
    const removed = store.removeMany(pendingDelete.value);
    pendingDelete.value = [];
    toast.success(t("media.toast.deleted", { count: removed }));
  }

  /** Kart menüsü, detay paneli ve klavye aynı işlem tablosunu kullanır. */
  function onAction(item, action) {
    if (!item) return;
    const handlers = {
      preview: () => {
        previewItem.value = item;
      },
      edit: () => store.setActive(item.id),
      use: () => (pickerOpen.value = true),
      download: () => toast.info(t("media.toast.downloadMock", { name: item.fileName })),
      archive: () => {
        store.archiveMany([item.id], !item.archived);
        toast.success(item.archived ? t("media.toast.unarchived") : t("media.toast.archived"));
      },
      delete: () => askDelete([item.id]),
      favorite: () => {
        const on = store.toggleFavorite(item.id);
        toast.success(t(on ? "media.toast.favorited" : "media.toast.unfavorited"));
      },
      copyLink: () => {
        navigator.clipboard?.writeText(store.fileUrl(item));
        toast.success(t("media.toast.linkCopied"));
      },
      duplicate: () => {
        const copy = store.duplicate(item.id);
        if (copy) toast.success(t("media.toast.duplicated", { name: copy.fileName }));
      },
    };
    handlers[action]?.();
  }

  function onUndo() {
    if (store.undo()) toast.success(t("media.toast.undone"));
  }

  // ── Önizleme gezinmesi ─────────────────────────────────────────────
  const previewIndex = computed(() =>
    previewItem.value ? filtered.value.findIndex((m) => m.id === previewItem.value.id) : 0
  );

  function navigatePreview(step) {
    const list = filtered.value;
    if (!list.length) return;
    const next = (previewIndex.value + step + list.length) % list.length;
    previewItem.value = list[next];
    cursor.value = next;
  }

  function openFromPreview() {
    if (previewItem.value) store.setActive(previewItem.value.id);
    previewItem.value = null;
  }

  // ── Toplu işlemler ─────────────────────────────────────────────────
  function onBulkTag(tag) {
    toast.success(
      t("media.toast.tagged", { count: store.addTagToMany(selectedIds.value, tag), tag })
    );
  }

  function onBulkDownload() {
    toast.info(t("media.toast.bulkDownloadMock", { count: selectedIds.value.length }));
  }

  function onBulkArchive() {
    toast.success(
      t("media.toast.bulkArchived", { count: store.archiveMany(selectedIds.value, true) })
    );
  }

  function onBulkDelete() {
    askDelete([...selectedIds.value]);
  }

  function onPickerConfirm({ ids, primary }) {
    const primaryItem = items.value.find((m) => m.id === primary);
    toast.success(
      t("media.toast.pickerConfirmed", {
        count: ids.length,
        primary: primaryItem ? primaryItem.fileName : "—",
      })
    );
  }

  // ── Klavye ─────────────────────────────────────────────────────────
  function itemAtCursor() {
    return paged.value[cursor.value] || null;
  }

  /**
   * Izgaranın gerçek sütun sayısı — yukarı/aşağı adımı için.
   * Satır listesinde (`.mrows`) grid değil, `gridTemplateColumns` "none" döner
   * → 1 sütun, yani yukarı/aşağı bir satır ilerler. İstenen davranış bu.
   */
  function columnCount() {
    if (!gridEl.value) return 1;
    const cols = getComputedStyle(gridEl.value).gridTemplateColumns;
    if (cols === "none") return 1;
    return cols.split(" ").filter(Boolean).length || 1;
  }

  function moveCursor(step) {
    const total = paged.value.length;
    if (!total) return;
    cursor.value = cursor.value < 0 ? 0 : Math.min(total - 1, Math.max(0, cursor.value + step));
    gridEl.value?.children[cursor.value]?.scrollIntoView({ block: "nearest" });
  }

  useMediaShortcuts({
    focusSearch: () => searchInput.value?.focus(),
    blurSearch: () => searchInput.value?.blur(),
    move: (dir) => moveCursor(dir),
    moveRow: (dir) => moveCursor(dir * columnCount()),
    openDetail: () => itemAtCursor() && openDetail(itemAtCursor().id, cursor.value),
    toggleSelect: () => itemAtCursor() && onCardToggle(itemAtCursor().id, cursor.value),
    selectRange: () =>
      itemAtCursor() && onCardToggle(itemAtCursor().id, cursor.value, { range: true }),
    selectAll: () => store.selectAllVisible(),
    preview: () => onAction(itemAtCursor(), "preview"),
    archive: () => onAction(itemAtCursor(), "archive"),
    remove: () =>
      selectedIds.value.length
        ? askDelete([...selectedIds.value])
        : onAction(itemAtCursor(), "delete"),
    undo: onUndo,
    escape: () => {
      if (previewItem.value) previewItem.value = null;
      else if (filtersOpen.value) filtersOpen.value = false;
      else if (selectedIds.value.length) store.clearSelection();
      else if (activeId.value) store.setActive(null);
      else if (hasActiveFilter.value) store.resetFilters();
    },
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mpage {
    max-width: 96rem;
    margin: 0 auto;
    padding: media.$s-5 media.$s-4 media.$s-10;
  }

  .mpage__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-4;
    flex-wrap: wrap;
    margin-bottom: media.$s-5;
  }

  .mpage__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    @include media.heading;
  }

  .mpage__title-icon {
    color: $brand;
  }

  .mpage__subtitle {
    margin: media.$s-1 0 0;
    @include media.text("sm");
    @include media.muted;
  }

  .mpage__actions {
    display: flex;
    gap: media.$s-2;
    flex-wrap: wrap;

    // Dar ekranda iki buton yan yana sığmıyor; yarımşar satır alsınlar.
    @media (max-width: media.$m-bp-sm) {
      width: 100%;

      .mpage__btn {
        flex: 1 1 10rem;
        justify-content: center;
      }
    }
  }

  .mpage__btn {
    @include media.button;
    @include media.focus-ring;

    input[type="file"] {
      display: none;
    }

    &--primary {
      @include media.button("primary");
    }
  }

  .mpage__sr {
    @include media.sr-only;
  }

  .mpage__shortcuts {
    margin: media.$s-5 0 0;
    @include media.text("sm");
    text-align: center;
    @include media.muted(2);
  }

  // ── Yerleşim ─────────────────────────────────────────────────────
  //
  // Sütun genişlikleri viewport'tan değil, sayfaya KALAN genişlikten hesaplandı
  // (media.scss §Kırılma noktaları): uygulama kabuğu ≥768px'te 280px yiyor.
  // ≤1279px'te detay paneli, ≤1023px'te ray akıştan çıkıp sheet/drawer olur —
  // out-of-flow oldukları için grid kolonları da o noktada kaldırılmalı, yoksa
  // orta sütun boş bir 15rem kolonuna sıkışıp kalıyor.
  .mpage__layout {
    display: grid;
    grid-template-columns: 14rem minmax(0, 1fr);
    gap: media.$s-4;
    align-items: start;
  }

  .mpage__layout--detail {
    grid-template-columns: 14rem minmax(0, 1fr) 19rem;
  }

  @media (min-width: 1536px) {
    .mpage__layout {
      grid-template-columns: 15rem minmax(0, 1fr);
    }

    .mpage__layout--detail {
      grid-template-columns: 15rem minmax(0, 1fr) 21rem;
    }
  }

  @media (max-width: media.$m-bp-detail) {
    .mpage__layout--detail {
      grid-template-columns: 14rem minmax(0, 1fr);
    }
  }

  @media (max-width: media.$m-bp-rail) {
    .mpage__layout,
    .mpage__layout--detail {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  // Yalnız sütun modunda sticky; sheet modunda panelin kendi `position: fixed`'i
  // geçerli olmalı (iki scoped stil arasında sıra garantisi yok).
  @media (min-width: 1280px) {
    .mpage__detail {
      position: sticky;
      top: media.$m-sticky-top;
    }
  }

  .mdetail__scrim {
    position: fixed;
    inset: 0;
    z-index: 59;
    background: rgb(0 0 0 / 45%);
    overscroll-behavior: contain;
    touch-action: none;
  }

  // Detay paneli girişi — giriş güçlü, çıkış hızlı; yalnız transform/opacity
  // (GPU). `prefers-reduced-motion` base.scss'teki global guard'la kapanıyor.
  .mdetail-enter-active {
    transition:
      transform $d-sheet $ease-drawer,
      opacity $d-fast ease-out;
  }

  .mdetail-leave-active {
    transition:
      transform $d-modal $ease-drawer,
      opacity $d-fast ease-out;
  }

  .mdetail-enter-from,
  .mdetail-leave-to {
    opacity: 0;
    transform: translateX(100%);
  }

  // Telefonda panel tam ekran ve alta dayalı → dikey yön.
  @media (max-width: media.$m-bp-md) {
    .mdetail-enter-from,
    .mdetail-leave-to {
      transform: translateY(100%);
    }
  }

  // ── Sol ray kabuğu ────────────────────────────────────────────────
  // İç stiller MediaFilterRail'de; burada yalnız yerleşim ve mobil drawer.
  .mrail {
    position: sticky;
    // Header (56px) aynı scroll kabında sticky duruyor; 0.5rem verilirse ray
    // header'ın ARKASINA girip kayboluyordu.
    top: media.$m-sticky-top;
    max-height: calc(100vh - #{media.$m-header-h} - #{media.$s-5});
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .mrail__scrim {
    display: none;
  }

  @media (max-width: media.$m-bp-rail) {
    .mrail {
      position: fixed;
      max-height: none;
      inset: 0 auto 0 0;
      width: min(20rem, 88vw);
      z-index: 65;
      overflow-y: auto;
      // Kapalıyken görünmez OLMALI: yalnız translate ile kaydırılırsa ekran
      // dışındaki butonlar hâlâ Tab ile odaklanıyor ve okuyucuya okunuyor.
      visibility: hidden;
      transform: translateX(-100%);
      // Kapanış: transform bitince görünmezliğe geç (asimetri ilkesi —
      // giriş güçlü/uzun, çıkış hızlı; ANIMATION_AUDIT §7 Standart 1).
      transition:
        transform $d-modal $ease-drawer,
        visibility 0s linear $d-modal;
      background: $l-bg;
      box-shadow: 0 0 40px rgb(0 0 0 / 18%);

      @include dark {
        background: $d-bg;
      }
    }

    .mrail--open {
      visibility: visible;
      transform: translateX(0);
      transition:
        transform $d-sheet $ease-drawer,
        visibility 0s;
    }

    .mrail__scrim {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 64;
      background: rgb(0 0 0 / 45%);
      overscroll-behavior: contain;
      touch-action: none;
    }
  }

  // Telefonda onaylı kalıp yan çekmece değil BOTTOM SHEET (ANIMATION_AUDIT
  // §7.1.b): başparmak erişimi ve "geldiği yönden gider" mekânsal tutarlılık.
  // Tablette (768–1023px) yan çekmece kalır — orada dikey alan sorun değil.
  @media (max-width: media.$m-bp-md) {
    .mrail {
      inset: auto 0 0 0;
      width: auto;
      max-height: 85dvh;
      border-radius: 18px 18px 0 0;
      box-shadow: 0 -12px 40px rgb(0 0 0 / 18%);
      transform: translateY(105%); // 105% = gölge payı
    }

    .mrail--open {
      transform: translateY(0);
    }
  }

  // ── Araç çubuğu ──────────────────────────────────────────────────
  .mtoolbar {
    position: sticky;
    // Header'ın altı — 0.5rem verilince araç çubuğu header'ın arkasında kayboluyordu.
    top: media.$m-sticky-top;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-wrap: wrap;
    padding: media.$s-3;
    margin-bottom: media.$s-4;
    box-shadow: 0 4px 16px rgb(26 26 26 / 6%);
    @include media.surface("raised");

    @include dark {
      box-shadow: 0 4px 16px rgb(0 0 0 / 30%);
    }
  }

  // Mixin ÖNCE gelmeli: media.button `display: inline-flex` set ediyor,
  // sonra yazılmazsa `display: none` eziliyor.
  // Ray drawer'a döndüğü noktada (≤1023px) filtre butonu görünür olmalı —
  // 767px'te kalırsa 768–1023 arasında filtrelere hiçbir yoldan ulaşılamıyor.
  .mtoolbar__filters {
    @include media.button;

    display: none;

    @media (max-width: media.$m-bp-rail) {
      display: inline-flex;
    }
  }

  .mtoolbar__search {
    flex: 1 1 12rem;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: media.$s-2;
    @include media.field-input;
    @include media.muted;

    width: auto;
    padding-inline: media.$s-3;

    input {
      flex: 1;
      min-width: 0;
      border: 0;
      background: none;
      font: inherit;
      @include media.text;
      outline: 0;
      @include media.heading;
    }

    // Dar ekranda arama tek başına bir satır olsun: 16px tipografiyle sıra
    // (filtre · arama · sıralama · yön · görünüm · yardım) tek satıra sığmıyor.
    @media (max-width: media.$m-bp-sm) {
      flex-basis: 100%;
      order: -1;
    }
  }

  .mtoolbar__kbd {
    padding: media.$s-05 media.$s-2;
    border: 1px solid $l-border;
    border-radius: media.$r-sm;
    @include media.text("xs");
    font-family: inherit;
    @include media.muted(2);

    @include dark {
      border-color: $d-border;
    }

    @media (max-width: media.$m-bp-md) {
      display: none;
    }
  }

  .mtoolbar__icon {
    @include media.button;
    @include media.focus-ring;

    width: 2.75rem;
    flex-shrink: 0;
    padding: 0;
    justify-content: center;

    // Mixin display'i set ediyor; gizleme ondan SONRA gelmeli.
    &--help {
      @media (max-width: media.$m-bp-md) {
        display: none;
      }
    }
  }

  .mtoolbar__sort {
    @include media.field-input;

    width: auto;
    max-width: 100%;
    padding-inline: media.$s-3;

    option {
      @include media.text;
    }

    // 16px tipografide sıralama etiketleri uzun; kalan satırı doldursun.
    @media (max-width: media.$m-bp-sm) {
      flex: 1 1 auto;
      min-width: 0;
    }
  }

  // ── Dropzone ─────────────────────────────────────────────────────
  .mdrop {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: media.$s-3;
    padding: media.$s-4;
    margin-bottom: media.$s-4;
    border: 1.5px dashed $l-border;
    border-radius: media.$r-lg;
    background: $l-bg-subtle;
    @include media.text;
    text-align: center;
    cursor: pointer;
    transition:
      border-color $t-fast,
      background $t-fast;
    @include media.muted;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }

    // `--over` (sürükleme) her cihazda geçerli; `:hover` yalnız imleçli
    // cihazda — dokunmatikte tap sonrası dropzone marka renginde takılıyordu.
    &--over,
    &:active {
      border-color: $brand;
      background: rgb(245 184 0 / 8%);
    }

    @include media.hoverable {
      &:hover {
        border-color: $brand;
        background: rgb(245 184 0 / 8%);
      }
    }

    strong {
      @include media.heading;
    }

    input[type="file"] {
      display: none;
    }

    // Telefonda sürükle-bırak diye bir şey yok; alan yalnız dosya seçiciyi
    // açan bir hedef. İki satırlık sürükleme metni yerine tek satır "dokun",
    // yarı yükseklikte — üstelik başlıkta zaten "Medya Yükle" butonu var.
    @media (max-width: media.$m-bp-md) {
      padding: media.$s-3;
      gap: media.$s-2;
    }
  }

  .mdrop__text--tap {
    display: none;
  }

  @media (max-width: media.$m-bp-md) {
    .mdrop__text {
      display: none;
    }

    .mdrop__text--tap {
      display: inline;
    }
  }

  // ── Sonuç başlığı ────────────────────────────────────────────────
  .mresults {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: media.$s-2 media.$s-3;
    margin-bottom: media.$s-4;

    // Dar ekranda sayaç ve seçim bağlantıları yan yana sıkışıyordu.
    @media (max-width: media.$m-bp-sm) {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  .mresults__count {
    margin: 0;
    @include media.text("xs");
    @include media.muted;
    @include media.numeric;
  }

  .mresults__actions {
    display: flex;
    gap: media.$s-3;
  }

  .mresults__link {
    text-decoration: underline;
    @include media.button("ghost");
    @include media.focus-ring;
  }

  .mpage__pagination {
    margin-top: media.$s-4;

    // ListPagination ve AppSelect panel geneline ait bileşenler; proje ölçeğinde
    // 12px yazıyorlar. medya.md §Responsive mobilde 1rem istiyor — global stili
    // bozmamak için yalnız bu sayfada ve yalnız mobilde büyütülür.
    @media (max-width: media.$m-bp-md) {
      :deep(.list-pagination-info),
      :deep(.list-pagination-btn),
      :deep(.as-label),
      :deep(.as-option) {
        font-size: 1rem;
      }
    }
  }

  // ── Izgara ───────────────────────────────────────────────────────
  .mgrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(11rem, 100%), 1fr));
    gap: media.$s-3;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  @media (max-width: 639px) {
    .mgrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  // 360px altında (iPhone SE vb.) iki kolon ~120px kart demek — dosya adı
  // tamamen kesiliyor. medya.md tek kolona izin veriyor: "bir veya iki sütun".
  @media (max-width: media.$m-bp-xs) {
    .mgrid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  // ── Satır listesi (<1024px) ──────────────────────────────────────
  // Tablonun dar ekran karşılığı. Yatay kaydırma yok: her şey tek satırda
  // kesiliyor, ikincil bilgi alt satıra iniyor (SellerListingsView `sl-mrow`).
  .mrows {
    margin: 0;
    padding: 0;
    list-style: none;
    overflow: hidden;
    @include media.surface;
  }

  .mrow {
    display: flex;
    align-items: center;
    @include media.divider;

    li:last-child & {
      border-bottom: 0;
    }

    &--active,
    &--selected {
      background: rgb(245 184 0 / 12%);
    }
  }

  // 44×44 dokunma hedefi, içinde 22px görsel kutu (medya.md §Responsive).
  .mrow__check {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    border: 0;
    background: none;
    cursor: pointer;
    @include media.focus-ring;
  }

  .mrow__box {
    display: grid;
    place-items: center;
    width: 1.375rem;
    height: 1.375rem;
    border: 1.5px solid $l-border;
    border-radius: media.$r-sm;
    color: transparent;
    transition:
      background $t-fast,
      border-color $t-fast,
      color $t-fast,
      transform $d-press $ease-out;

    @include dark {
      border-color: $d-border;
    }
  }

  .mrow__check:active .mrow__box {
    transform: scale(0.88);
  }

  .mrow--selected .mrow__box {
    background: $brand;
    border-color: $brand;
    color: $brand-ink;
  }

  .mrow__open {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-2 media.$s-3 media.$s-2 0;
    border: 0;
    background: none;
    text-align: start;
    cursor: pointer;
    transition: background 100ms ease-out;
    @include media.focus-ring;

    @include media.hoverable {
      &:hover {
        background: $l-bg-muted;

        @include dark {
          background: $d-item-hover;
        }
      }
    }

    &:active {
      background: $l-bg-muted;

      @include dark {
        background: $d-item-hover;
      }
    }
  }

  .mrow__thumb {
    width: 2.5rem;
    flex-shrink: 0;
    border-radius: media.$r-sm;
  }

  .mrow__mid {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: media.$s-05;
  }

  .mrow__name {
    @include media.text;
    font-weight: 550;
    @include media.heading;
    @include media.truncate;
  }

  .mrow__sub {
    @include media.text("xs");
    @include media.muted;
    @include media.numeric;
    @include media.truncate;
  }

  // ── Tablo (≥1024px) ──────────────────────────────────────────────
  .mtable-wrap {
    // Sütunlar artık genişliğe göre eleniyor; kaydırma yalnız emniyet ağı.
    overflow-x: auto;
    border-radius: media.$r-lg;
    @include media.surface;
  }

  .mtable {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    @include media.text;

    th,
    td {
      padding: media.$s-3 media.$s-3;
      text-align: start;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      @include media.divider;
    }

    th {
      @include media.field-label;
    }

    td {
      color: $l-text-700;
      @include media.numeric;

      @include dark {
        color: $d-text;
      }
    }

    tbody tr {
      cursor: pointer;
      transition: background 100ms ease-out;

      @include media.hoverable {
        &:hover {
          background: $l-bg-muted;

          @include dark {
            background: $d-item-hover;
          }
        }
      }

      // Satırın dokunma tepkisi (ANIMATION_AUDIT §7.2) — tablo satırında
      // scale kullanılmaz, hücre hizası bozulur.
      &:active {
        background: $l-bg-muted;

        @include dark {
          background: $d-item-hover;
        }
      }
    }
  }

  .mtable__row--active {
    background: rgb(245 184 0 / 12%);
  }

  .mtable__check {
    width: 2.75rem;
  }

  .mtable__box {
    display: grid;
    place-items: center;
    width: 1.375rem;
    height: 1.375rem;
    border: 1.5px solid $l-border;
    border-radius: media.$r-sm;
    background: none;
    color: transparent;
    cursor: pointer;
    @include media.focus-ring;
    @include media.press(0.88);

    @include dark {
      border-color: $d-border;
    }

    &--on {
      background: $brand;
      border-color: $brand;
      color: $brand-ink;
    }
  }

  // `table-layout: fixed` + sütun genişlikleri: ad sütunu kalanı alır ve
  // taşırmak yerine keser. Öncesinde nowrap'li 6 sütun tabloyu ~740px'e
  // şişirip orta sütunu yatay kaydırıyordu.
  .mcol--fileName {
    width: auto;
  }

  .mcol--kind {
    width: 5rem;
  }

  .mcol--size {
    width: 6.5rem;
  }

  .mcol--dimensions {
    width: 8rem;
  }

  .mcol--uploadedAt {
    width: 8.5rem;
  }

  .mcol--usage {
    width: 8rem;
  }

  // <1536px'te tablo tüm sütunlarla sığmıyor: en düşük öncelikliler elenir.
  // Uzantı zaten dosya adının sonunda görünüyor, çözünürlük detay panelinde.
  @media (max-width: 1535px) {
    .mcol--kind,
    .mcol--dimensions {
      display: none;
    }
  }

  .mtable__name {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    min-width: 0;

    svg {
      flex-shrink: 0;
    }
  }

  .mtable__name-text {
    @include media.truncate;
  }

  .mpill {
    &--used {
      @include media.chip("success");
    }

    &--unused {
      @include media.chip("warning");
    }
  }

  // ── Boş durum ────────────────────────────────────────────────────
  .mempty {
    display: grid;
    justify-items: center;
    gap: media.$s-2;
    padding: media.$s-8 media.$s-4;
    border: 1px dashed $l-border;
    border-radius: media.$r-lg;
    @include media.muted(2);

    @include dark {
      border-color: $d-border;
    }
  }

  .mempty__title {
    margin: 0;
    font-size: 1.125rem;
    @include media.heading;
  }

  .mempty__body {
    margin: 0;
    @include media.text("sm");
  }

  // ── Geri alma şeridi ─────────────────────────────────────────────
  .mundo {
    position: fixed;
    inset-inline-start: 50%;
    bottom: 5rem;
    z-index: 55;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    gap: media.$s-2 media.$s-3;
    // Genişlik sınırı yoktu: uzun metinle şerit ekranın dışına taşıyordu.
    max-width: calc(100vw - 2rem);
    padding: media.$s-3 media.$s-3;
    transform: translateX(-50%);
    border-radius: media.$r-lg;
    box-shadow: 0 12px 36px rgb(26 26 26 / 16%);
    @include media.text;
    @include media.surface("raised");
    @include media.heading;

    // Mobilde ekranın altında 64px'lik tab bar var; şerit onun üstünde durmalı.
    // Toplu işlem çubuğu da aynı köşede — geri alma şeridi onun üzerine çıkar.
    @media (max-width: media.$m-bp-md) {
      inset-inline: media.$s-3;
      bottom: calc(#{media.$m-float-bottom} + 4.5rem);
      transform: none;
      max-width: none;
    }
  }

  .mundo__btn {
    text-decoration: underline;
    @include media.button("ghost");
    @include media.focus-ring;

    color: $brand;
    font-weight: 620;
  }

  .mundo__close {
    @include media.button("ghost");

    min-height: auto;
    padding: 0;
  }
</style>
