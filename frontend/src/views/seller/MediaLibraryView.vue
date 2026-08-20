<template>
  <div class="mpage">
    <header class="mpage__head">
      <div>
        <h1 class="mpage__title">
          <AppIcon name="image" :size="16" class="mpage__title-icon" />
          {{ t("media.pageTitle") }}
        </h1>
        <p class="mpage__subtitle">
          {{ t("media.pageSubtitle", { count: counts.all, size: formatBytes(counts.bytes) }) }}
        </p>
      </div>

      <!-- Görünüm kontrolleri sayfa başlığında, aksiyonların solunda —
           SellerListingsView ile aynı konum.

           `v-if` ile kaldırılıyor, Tailwind `hidden` ile değil: scoped stilin
           `[data-v]` eki `.hidden`'ı ezip bloğu telefonda geri getiriyordu
           (aynı tuzak §mfab'da da yaşandı). Telefonda görünüm/yoğunluk seçici
           yok — liste görünümü sabit, yükleme FAB'da, seçici ⋯ menüsünde. -->
      <div v-if="isDesktop" class="mpage__actions">
        <ViewModeToggle v-model="viewMode" :modes="VIEW_MODES" />

        <!-- Izgara yoğunluğu: 2 / 3 / 6 sütun. Mod değil, ızgaranın üst
             sınırı — dar ekranda kalan genişliğe göre aşağı çekilir. -->
        <div
          v-if="effectiveMode === 'grid'"
          class="mdensity"
          role="group"
          :aria-label="t('media.density.label')"
        >
          <button
            v-for="d in GRID_DENSITIES"
            :key="d"
            type="button"
            class="mdensity__btn"
            :class="{ 'mdensity__btn--on': density === d }"
            :aria-pressed="density === d"
            :title="t('media.density.cols', { count: d })"
            @click="density = d"
          >
            {{ d }}
          </button>
        </div>

        <button type="button" class="hdr-btn-outlined" @click="pickerOpen = true">
          <AppIcon name="package" :size="13" />
          {{ t("media.openPicker") }}
        </button>
        <!-- "Yükle" artık gizli dosya seçicisi DEĞİL: T-091 yükleyicisini
             (MediaUploader — slot ön kontrolü, kuyruk, kopya uyarısı) açar.
             Eski yol boyut kapısına hiç bakmıyordu; 1000×1000 altı ürün
             görseli sessizce kabul ediliyordu (rapor 75 · Bulgu 1). -->
        <button type="button" class="hdr-btn-primary" @click="uploaderOpen = true">
          <AppIcon name="upload" :size="13" />
          {{ t("media.upload.button") }}
        </button>
      </div>
    </header>

    <div class="mpage__layout" :class="{ 'mpage__layout--detail': Boolean(activeItem) }">
      <!-- ── Sol filtre rayı (mobilde drawer) ── -->
      <aside class="mrail" :class="{ 'mrail--open': filtersOpen }">
        <MediaFilterRail
          v-model:archived="archivedModel"
          :groups="filterGroups"
          :tags="availableTags"
          :active-tags="activeTags"
          :quick-views="quickViews"
          :archived-count="counts.archived"
          :has-active-filter="hasActiveFilter"
          :used-bytes="store.storage.bytes"
          :quota-bytes="store.storage.quotaBytes"
          @toggle-tag="toggleArrayFilter('tags', $event)"
          @reset="dt.clearAll()"
          @close="filtersOpen = false"
        />
      </aside>
      <Transition name="fade">
        <div v-if="filtersOpen" class="mrail__scrim" @click="filtersOpen = false" />
      </Transition>

      <!-- ── Orta sütun ── -->
      <section class="mpage__main">
        <!-- Mobil araç şeridi (<768px) — SellerListingsView kalıbı:
             arama + filtre + ⋯ taşma menüsü tek satırda. Sıralama ve ikincil
             aksiyonlar menüye iner; birincil aksiyon (yükleme) FAB'a. -->
        <div v-if="!isDesktop" class="flex items-center gap-2 mb-3">
          <div class="relative flex-1 min-w-0">
            <AppIcon
              name="search"
              :size="13"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="searchText"
              type="text"
              :placeholder="t('media.searchPlaceholder')"
              :aria-label="t('media.searchPlaceholder')"
              class="form-input-sm w-full !pl-9"
              @input="onSearchInput"
            />
            <button
              v-if="searchText"
              type="button"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              :aria-label="t('media.filters.reset')"
              @click="clearSearch"
            >
              <AppIcon name="x" :size="14" />
            </button>
          </div>

          <button
            type="button"
            class="flex items-center gap-1.5 px-3 rounded-lg text-[13px] font-medium border flex-shrink-0 transition-colors mtoolbar__mobile-btn"
            :class="
              dt.activeFilterCount.value
                ? 'bg-brand-500 text-brand-ink border-brand-500'
                : 'border-gray-200 dark:border-[#2a2a35] text-gray-600 dark:text-gray-300'
            "
            :aria-label="t('media.filters.title')"
            @click="filtersOpen = true"
          >
            <AppIcon name="filter" :size="13" />
            <span
              v-if="dt.activeFilterCount.value"
              class="px-1.5 rounded-full text-[11px] bg-white/25"
            >
              {{ dt.activeFilterCount.value }}
            </span>
          </button>

          <div class="relative flex-shrink-0">
            <button
              type="button"
              class="hdr-btn-outlined mtoolbar__mobile-btn !px-2.5"
              :aria-label="t('common.more')"
              @click.stop="mobileMenuOpen = !mobileMenuOpen"
            >
              <AppIcon name="ellipsis" :size="15" />
            </button>
            <Transition name="dropdown">
              <div v-if="mobileMenuOpen" class="hdr-more-menu mmore-menu" @click.stop>
                <button class="hdr-more-item" @click="openPickerFromMenu">
                  <AppIcon name="package" :size="14" />
                  <span>{{ t("media.openPicker") }}</span>
                </button>
                <button class="hdr-more-item" @click="selectPageFromMenu">
                  <AppIcon name="check" :size="14" />
                  <span>{{ t("media.selectPage", { count: paged.length }) }}</span>
                </button>

                <div class="mmore-divider"></div>
                <div class="px-2.5 py-1 text-[11px] font-semibold uppercase text-gray-400">
                  {{ t("media.sort.label") }}
                </div>
                <button
                  v-for="opt in MOBILE_SORTS"
                  :key="opt.key"
                  class="hdr-more-item"
                  :class="{ active: currentSortKey === opt.key }"
                  @click="setMobileSort(opt)"
                >
                  <AppIcon :name="opt.icon" :size="14" />
                  <span>{{ opt.label() }}</span>
                  <AppIcon
                    v-if="currentSortKey === opt.key"
                    name="check"
                    :size="13"
                    class="ml-auto"
                  />
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Mobil özet şerit: kütüphanenin tür dağılımı; dokununca filtreler -->
        <div v-if="!isDesktop" class="grid grid-cols-4 gap-2 mb-3">
          <button
            v-for="tile in summaryTiles"
            :key="tile.key"
            type="button"
            class="msum"
            :class="{ 'msum--on': tile.active }"
            @click="tile.toggle()"
          >
            <b>{{ tile.count }}</b>
            <span>{{ tile.label }}</span>
          </button>
        </div>

        <!-- Masaüstü araç çubuğu (≥768px) — `DataTableToolbar` ile birebir aynı
             yapı ve ölçüler: arama (flex-1) → [Sütunlar] → [Filtreler].
             Sıralama ve yardım medyaya özel eklerdir, standart ikilinin
             SOLUNDA durur ki Sütunlar/Filtreler her liste sayfasında aynı
             yerde olsun. -->
        <div v-if="isDesktop" class="mtoolbar-wrap">
          <div class="card !p-3">
            <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
              <!-- Global arama -->
              <div class="relative flex-1 min-w-0">
                <AppIcon
                  name="search"
                  :size="13"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref="searchInput"
                  v-model="searchText"
                  type="text"
                  :placeholder="t('media.searchPlaceholder')"
                  :aria-label="t('media.searchPlaceholder')"
                  class="form-input-sm w-full !pl-9"
                  @input="onSearchInput"
                />
                <button
                  v-if="searchText"
                  type="button"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  :aria-label="t('media.filters.reset')"
                  @click="clearSearch"
                >
                  <AppIcon name="x" :size="14" />
                </button>
              </div>

              <!-- Sıralama (medyaya özel ek) -->
              <select
                :value="primarySort.field"
                class="form-input-sm lg:w-40"
                :aria-label="t('media.sort.label')"
                @change="setPrimarySort($event.target.value)"
              >
                <option v-for="col in dt.sortableFields.value" :key="col.key" :value="col.key">
                  {{ col.label }}
                </option>
              </select>

              <button
                type="button"
                class="hdr-btn-outlined !px-2.5 justify-center"
                :title="t(`media.sort.${primarySort.desc ? 'desc' : 'asc'}`)"
                :aria-label="t(`media.sort.${primarySort.desc ? 'desc' : 'asc'}`)"
                @click="toggleSortDir"
              >
                <AppIcon :name="primarySort.desc ? 'arrow-down' : 'arrow-up'" :size="13" />
              </button>

              <!-- Kısayol yardımı: araç çubuğu zaten yalnız masaüstünde. -->
              <button
                type="button"
                class="hdr-btn-outlined !px-2.5 justify-center"
                :title="t('media.help.title')"
                :aria-label="t('media.help.title')"
                @click="helpOpen = true"
              >
                <AppIcon name="circle-help" :size="13" />
              </button>

              <!-- Sütunlar (yalnız tablo modu) -->
              <div v-if="effectiveMode === 'table'" class="relative">
                <button
                  type="button"
                  class="hdr-btn-outlined w-full lg:w-auto justify-center lg:justify-start"
                  :aria-expanded="columnsOpen"
                  @click="columnsOpen = !columnsOpen"
                >
                  <AppIcon name="columns-2" :size="13" />
                  {{ t("media.columns.title") }}
                </button>
                <template v-if="columnsOpen">
                  <div class="fixed inset-0 z-40" @click="columnsOpen = false" />
                  <div
                    class="absolute right-0 mt-2 z-50 w-56 rounded-xl border border-gray-200 dark:border-[#2a2a35] bg-white dark:bg-[#16161f] shadow-xl py-2"
                  >
                    <div class="px-4 py-1.5 text-[11px] font-semibold uppercase text-gray-400">
                      {{ t("media.columns.visible") }}
                    </div>
                    <label
                      v-for="col in dt.columns.value"
                      :key="col.key"
                      class="flex items-center gap-2 px-4 py-1.5 text-[13px] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                      :class="{ 'opacity-50 cursor-not-allowed': col.hideable === false }"
                    >
                      <input
                        type="checkbox"
                        class="accent-brand-600"
                        :checked="!dt.hidden[col.key]"
                        :disabled="col.hideable === false"
                        @change="dt.toggleColumn(col.key)"
                      />
                      {{ col.label }}
                    </label>
                  </div>
                </template>
              </div>

              <!-- Filtreler — sağdan çekmeceyi açar -->
              <button
                type="button"
                class="flex items-center justify-center lg:justify-start gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors"
                :class="
                  dt.activeFilterCount.value
                    ? 'bg-brand-500 text-brand-ink border-brand-500'
                    : 'border-gray-200 dark:border-[#2a2a35] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                "
                @click="filtersOpen = true"
              >
                <AppIcon name="filter" :size="13" />
                {{ t("media.filters.title") }}
                <span
                  v-if="dt.activeFilterCount.value"
                  class="ml-0.5 px-1.5 rounded-full text-[11px] bg-white/25"
                >
                  {{ dt.activeFilterCount.value }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <MediaFilterChips :chips="dt.chips.value" @clear="clearChip" />

        <MediaUploadQueue
          :uploads="uploads"
          @retry="store.retryUpload"
          @cancel="store.cancelUpload"
          @clear="store.clearFinishedUploads"
        />

        <!-- Sürükle-bırak alanı yalnız imleçli/geniş ekranda. Telefonda
             sürükleme diye bir etkileşim yok; alan sadece dosya seçiciyi açan
             büyük bir hedefe dönüşüyordu ki onun karşılığı zaten FAB. -->
        <label
          v-if="isDesktop"
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
        </label>

        <div class="mresults">
          <p class="mresults__count">
            {{ t("media.resultRange", { from: rangeFrom, to: rangeTo, total: filtered.length }) }}
          </p>
          <!-- Telefonda karşılığı ⋯ menüsündeki "Sayfadakileri seç". -->
          <div v-if="isDesktop && filtered.length" class="mresults__actions">
            <button type="button" class="mresults__link" @click="store.selectPage">
              {{ t("media.selectPage", { count: paged.length }) }}
            </button>
            <button type="button" class="mresults__link" @click="store.selectAllVisible">
              {{ t("media.selectAllVisible") }}
            </button>
          </div>
        </div>

        <!-- Grid — uzun sayfalarda PENCERELENİR (T-092).
             Basılan kalem `visibleCards`, listedeki gerçek yeri `cardOffset + i`.
             `i` artık kalemin indeksi DEĞİL: seçim, imleç, `aria-posinset` ve
             detay açma hep mutlak indeksi kullanmak zorunda. `data-cell` de
             mutlak — imleci görünmeyen bir karta taşırken düğüm bununla
             bulunuyor (`revealCard`). -->
        <ul
          v-if="effectiveMode === 'grid' && paged.length"
          ref="gridEl"
          class="mgrid"
          :style="[{ '--mgrid-cols': gridColumns }, gridPadStyle]"
        >
          <li
            v-for="(item, i) in visibleCards"
            :key="item.id"
            :data-cell="cardOffset + i"
            :aria-setsize="paged.length"
            :aria-posinset="cardOffset + i + 1"
          >
            <MediaCard
              :item="item"
              :selected="store.isSelected(item.id)"
              :active="item.id === activeId"
              :focused="cardOffset + i === cursor"
              :editable="store.canEdit(item)"
              :density="gridColumns"
              :detail-open="detailSutunuAcik"
              :uniform="gridWindowed"
              @open="openDetail(item.id, cardOffset + i)"
              @toggle="onCardToggle(item.id, cardOffset + i, $event)"
              @action="onAction(item, $event)"
            />
          </li>
        </ul>

        <!-- Satır listesi — hem `list` modu hem de dar ekranda tablo/kanban'ın
             karşılığı. Tablo 6+ sütun × nowrap ≈ 740px istiyor; ray açıkken
             orta sütun 1024px viewport'ta ~700px'e düşüyor. Yatay kaydırma
             yerine projenin satır kalıbı (SellerListingsView `sl-mrow`). -->
        <ul v-else-if="effectiveMode === 'rows' && paged.length" ref="gridEl" class="mrows">
          <!-- `data-cell` ızgarayla aynı: imleç düğümü tek bir yoldan bulunuyor.
               Satır listesi PENCERELENMİYOR (satır yüksekliği ada göre değişir),
               burada indeks zaten mutlak. -->
          <li v-for="(item, i) in paged" :key="item.id" :data-cell="i">
            <!-- Seçim kutusu yok: satır tek bir hedef, tıklamak detayı açar.
                 Toplu seçim ⋯ menüsündeki "Sayfadakileri seç" ve klavye
                 kısayollarıyla yapılır; kutu satırın 44px'ini yiyor ve tek
                 satırda iki farklı tıklama anlamı yaratıyordu. -->
            <button
              type="button"
              class="mrow"
              :class="{
                'mrow--active': item.id === activeId,
                'mrow--selected': store.isSelected(item.id),
              }"
              @click="openDetail(item.id, i)"
            >
              <MediaThumb :item="item" region="rowThumb" :icon-size="16" class="mrow__thumb" />

              <span class="mrow__mid">
                <span class="mrow__name">
                  <span class="mrow__name-text">{{ item.fileName }}</span>
                  <span v-if="item.owner === 'shared'" class="mrow__badge">
                    {{ t("media.shared") }}
                  </span>
                  <span v-if="item.archived" class="mrow__badge">
                    {{ t("media.filters.archive") }}
                  </span>
                </span>
                <!-- İkinci satır telefonda yer kaplamasın diye ≥768px'te açılır. -->
                <span class="mrow__desc">
                  <span class="mrow__title">{{ item.title || "—" }}</span>
                  <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="mrow__tag">
                    {{ tag }}
                  </span>
                </span>
              </span>

              <!-- Meta ≥768px'te sabit genişlikli sütunlara, altında ise tek
                   satırda "·" ile ayrılmış özete dönüşür — aynı DOM. -->
              <span class="mrow__meta">
                <span class="mrow__cell">{{ item.ext }}</span>
                <span class="mrow__cell">{{ formatBytes(item.bytes) }}</span>
                <span class="mrow__cell mrow__cell--dim">{{ formatDimensions(item) }}</span>
                <span class="mrow__cell">{{ formatDate(item.uploadedAt, locale) }}</span>
              </span>

              <span :class="`mpill mpill--${item.liveUsage || 0 ? 'used' : 'unused'}`">
                {{
                  item.liveUsage || 0
                    ? t("media.usedInCount", { count: item.liveUsage || 0 })
                    : t("media.unused")
                }}
              </span>
            </button>
          </li>
        </ul>

        <!-- Tablo — panelin standart DataTable'ı: sıralanabilir başlık
             (Shift+tık çoklu), sütun filtresi popover'ı, sayfalama. Sütun
             görünürlüğü araç çubuğundaki "Sütunlar" menüsünden yönetilir. -->
        <DataTable
          v-else-if="effectiveMode === 'table' && paged.length"
          :dt="dt"
          :rows="paged"
          :total="filtered.length"
          :page-size-options="PAGE_SIZES"
          row-key="id"
          clickable
          class="mtable-dt"
          @row-click="openDetail($event.id, paged.indexOf($event))"
        >
          <template #head-select>
            <button
              type="button"
              role="checkbox"
              :aria-checked="allOnPageSelected"
              :aria-label="t('media.selectPage', { count: paged.length })"
              class="mcheck"
              :class="{ 'mcheck--on': allOnPageSelected }"
              @click.stop="toggleSelectPage"
            >
              <AppIcon name="check" :size="11" :stroke-width="3.5" />
            </button>
          </template>

          <template #cell-select="{ row }">
            <button
              type="button"
              role="checkbox"
              :aria-checked="store.isSelected(row.id)"
              :aria-label="t('media.card.selectAria', { name: row.fileName })"
              class="mcheck"
              :class="{ 'mcheck--on': store.isSelected(row.id) }"
              @click.stop="onCardToggle(row.id, paged.indexOf(row), { range: $event.shiftKey })"
            >
              <AppIcon name="check" :size="11" :stroke-width="3.5" />
            </button>
          </template>

          <template #cell-preview="{ row }">
            <MediaThumb :item="row" region="cellThumb" :icon-size="14" class="mcell__thumb" />
          </template>

          <template #cell-fileName="{ row }">
            <span class="mcell__name">
              <AppIcon :name="iconForKind(row.kind)" :size="15" />
              <span class="mcell__name-text">{{ row.fileName }}</span>
              <span v-if="row.owner === 'shared'" class="mcell__tag">{{ t("media.shared") }}</span>
            </span>
          </template>

          <template #cell-ext="{ row }">{{ row.ext }}</template>
          <template #cell-bytes="{ row }">{{ formatBytes(row.bytes) }}</template>
          <template #cell-dimensions="{ row }">{{ formatDimensions(row) }}</template>
          <template #cell-uploadedAt="{ row }">{{ formatDate(row.uploadedAt, locale) }}</template>

          <template #cell-usageCount="{ row }">
            <span :class="`mpill mpill--${row.liveUsage || 0 ? 'used' : 'unused'}`">
              {{
                row.liveUsage || 0
                  ? t("media.usedInCount", { count: row.liveUsage || 0 })
                  : t("media.unused")
              }}
            </span>
          </template>

          <template #cell-owner="{ row }">
            {{ t(`media.owner.${row.owner}`) }}
          </template>

          <template #cell-tags="{ row }">
            <span class="mcell__name-text">{{ row.tags.join(", ") || "—" }}</span>
          </template>

          <template #cell-action="{ row }">
            <span class="mcell__actions">
              <button
                v-for="act in rowActions(row)"
                :key="act.id"
                type="button"
                class="mcell__btn"
                :title="act.title"
                :aria-label="act.title"
                :disabled="act.disabled"
                @click.stop="onAction(row, act.id)"
              >
                <AppIcon :name="act.icon" :size="15" />
              </button>
            </span>
          </template>
        </DataTable>

        <!-- Kanban — kullanım durumuna göre üç kova. Sürükle-bırak yok:
             KanbanBoard'ın native HTML5 DnD'si dokunmatikte ölü
             (ANIMATION_AUDIT §7.4.c); kart tıklaması detayı açar. -->
        <div v-else-if="effectiveMode === 'kanban' && paged.length" class="mkanban">
          <section v-for="col in kanbanColumns" :key="col.key" class="mkanban__col">
            <h3 class="mkanban__head" :style="{ borderColor: col.color }">
              <span>{{ col.label }}</span>
              <span class="mkanban__count">{{ col.items.length }}</span>
            </h3>
            <ul class="mkanban__body">
              <li v-for="item in col.items" :key="item.id">
                <button
                  type="button"
                  class="mkanban__card"
                  :class="{ 'mkanban__card--active': item.id === activeId }"
                  @click="openDetail(item.id, paged.indexOf(item))"
                >
                  <MediaThumb
                    :item="item"
                    region="kanbanThumb"
                    :icon-size="16"
                    class="mkanban__thumb"
                  />
                  <span class="mkanban__name">{{ item.fileName }}</span>
                  <span class="mkanban__meta">
                    {{ item.ext }} · {{ formatBytes(item.bytes) }}
                  </span>
                </button>
              </li>
              <li v-if="!col.items.length" class="mkanban__empty">{{ t("media.kanban.empty") }}</li>
            </ul>
          </section>
        </div>

        <div v-else class="mempty">
          <AppIcon name="image" :size="34" />
          <p class="mempty__title">{{ t("media.empty.title") }}</p>
          <p class="mempty__body">{{ t("media.empty.body") }}</p>
          <button v-if="hasActiveFilter" type="button" class="mpage__btn" @click="dt.clearAll()">
            {{ t("media.filters.reset") }}
          </button>
        </div>

        <!-- Tablo kendi sayfalamasını içeriyor (DataTable); diğer modlarda burada. -->
        <ListPagination
          v-if="effectiveMode !== 'table' && filtered.length > PAGE_SIZES[0]"
          :model-value="dt.page.value"
          :total="filtered.length"
          :page-size="dt.pageSize.value"
          :page-size-options="PAGE_SIZES"
          class="mpage__pagination"
          @update:model-value="dt.setPage($event)"
          @update:page-size="dt.setPageSize($event)"
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

    <!-- Mobil birincil aksiyon: yükleme (SellerListingsView'daki "Yeni Ekle"
         FAB'ının karşılığı). Masaüstünde başlıktaki buton üstleniyor.
         Masaüstü düğmesiyle aynı yere gider: T-091 yükleyici modalı. -->
    <button type="button" class="mfab lg:hidden" @click="uploaderOpen = true">
      <AppIcon name="upload" :size="16" />
      {{ t("media.upload.button") }}
    </button>

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

    <!-- Kısmi sonuç dökümü seçim boşaldıktan SONRA da okunabilmeli: toplu
         işlem seçimi temizliyor, `selectedIds` koşuluna bağlı kalsaydı hata
         listesi tam yazıldığı anda ekrandan kalkardı. -->
    <MediaBulkBar
      v-if="selectedIds.length > 1 || bulkBusy || bulkReport"
      :count="selectedIds.length"
      :archived="store.showArchived"
      :busy="bulkBusy"
      :report="bulkReport"
      @tag="onBulkTag"
      @download="onBulkDownload"
      @archive="onBulkArchive"
      @delete="onBulkDelete"
      @clear="store.clearSelection"
      @dismiss-report="store.clearBulkReport"
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

    <!-- Kırpma Stüdyosu ağır (tuval + önizleme şeridi); yalnız açılınca
         yüklenir. `asset` = seçili dosyanın `Media Asset` adı; Uygula ancak
         bununla etkinleşir ve `save_intent` bu ekrandan çağrılabilir olur
         (rapor 75 · Bulgu 3). Varlığı olmayan dosyada boş kalır — modal
         dürüst "kaydedilemez" durumunda açılır, bu bilinçli. -->
    <CropStudioModal
      v-if="cropItem"
      :open="Boolean(cropItem)"
      :source="cropSource"
      :asset="cropAsset"
      slot-key="company.cover_image"
      @close="cropItem = null"
    />

    <MediaShortcutsModal v-model:open="helpOpen" />

    <MediaPickerModal
      v-model:open="pickerOpen"
      :items="items"
      @confirm="onPickerConfirm"
      @upload="(files) => store.enqueueUploads(files, { slotKey: uploadSlotKey })"
    />

    <!-- T-091 yükleyicisi — "Yükle" düğmesinin hedefi. Slot ön kontrolü
         (ör. product.image → en az 1000×1000), kuyruk, kopya uyarısı ve
         devam/yeniden deneme akışı bileşenin kendi içinde. Slot seçimi
         çağıranın işi (MediaUploader başlığı) — seçici burada. -->
    <MediaModal
      v-model:open="uploaderOpen"
      :title="t('media.upload.button')"
      width="46rem"
      class="mupload-modal"
    >
      <template #head>
        <label class="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400">
          <span>{{ t("cropStudio.slot") }}</span>
          <select
            v-model="uploadSlotKey"
            class="form-input-sm"
            :aria-label="t('cropStudio.slot')"
          >
            <option v-for="s in uploadSlots" :key="s.slotKey" :value="s.slotKey">
              {{ s.title }}
            </option>
          </select>
        </label>
      </template>
      <MediaUploader :slot-key="uploadSlotKey" :show-header="false" @uploaded="onUploaderUploaded" />
    </MediaModal>

    <!-- Tek onay penceresi: "Sil" artık her yerde KALICI silme.
         Önce iki pencere vardı çünkü "Sil" arşive taşıyordu; o ayrım kalktı. -->
    <ConfirmDialog
      v-model:open="purgeConfirmOpen"
      :title="confirmPayload.title"
      :message="confirmPayload.message"
      :confirm-label="t('media.actions.purge')"
      tone="danger"
      @confirm="runPurge"
    />
  </div>
</template>

<script setup>
  import {
    computed,
    defineAsyncComponent,
    onMounted,
    onUnmounted,
    ref,
    useTemplateRef,
    watch,
  } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";

  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import DataTable from "@/components/common/datatable/DataTable.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import MediaBulkBar from "@/components/media/MediaBulkBar.vue";
  import MediaCard from "@/components/media/MediaCard.vue";
  import MediaDetailPanel from "@/components/media/MediaDetailPanel.vue";
  import MediaFilterChips from "@/components/media/MediaFilterChips.vue";
  import MediaFilterRail from "@/components/media/MediaFilterRail.vue";
  import MediaPickerModal from "@/components/media/MediaPickerModal.vue";
  import MediaPreviewModal from "@/components/media/MediaPreviewModal.vue";
  const CropStudioModal = defineAsyncComponent(
    () => import("@/components/media/crop/CropStudioModal.vue")
  );
  // Yükleyici de ağır (ölçüm işçisi + sıkıştırma); yalnız modal açılınca gelsin.
  const MediaUploader = defineAsyncComponent(
    () => import("@/components/media/upload/MediaUploader.vue")
  );
  import MediaModal from "@/components/media/MediaModal.vue";
  import MediaShortcutsModal from "@/components/media/MediaShortcutsModal.vue";
  import MediaThumb from "@/components/media/MediaThumb.vue";
  import MediaUploadQueue from "@/components/media/MediaUploadQueue.vue";
  import { useCardGridWindow } from "@/components/media/useCardGridWindow";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { useDataTable } from "@/composables/useDataTable";
  import { useDropzone } from "@/composables/useDropzone";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { useMediaShortcuts } from "@/composables/useMediaShortcuts";
  import { useScrollLock } from "@/composables/useScrollLock";
  import { useToast } from "@/composables/useToast";
  import { slotsForRole } from "@/lib/media/upload/preflight.js";
  import { useMediaStore } from "@/stores/media";
  import { formatBytes, formatDate, formatDimensions, iconForKind } from "@/utils/mediaFormat";
  import {
    decodeFilterQuery,
    encodeFilterQuery,
    foreignParams,
    sameQuery,
  } from "@/utils/mediaFilterUrl";
  import * as uploadPolicy from "@/utils/uploadPolicy";

  /**
   * Dosya seçme penceresinin süzgeci — sunucunun izin listesinden (TUR-123).
   *
   * Burada sabit bir liste duruyordu ve sunucudaki listeyle ayrışabilirdi:
   * pencerede seçilebilen bir dosya sunucuda reddedilirdi. Sınırlar henüz
   * gelmediyse geniş süzgeç kullanılıyor — pencereyi kapatmaktansa açık
   * bırakıp sunucuya sormak doğru, asıl kapı zaten orada.
   */
  const ACCEPT = computed(() => {
    const izinli = uploadPolicy.cachedLimits()?.media_extensions;
    return izinli?.length ? izinli.join(",") : "image/*,video/*,.pdf";
  });
  const PAGE_SIZES = [12, 24, 48];
  const VIEW_MODES = ["table", "grid", "list", "kanban"];
  const GRID_DENSITIES = [2, 3, 6];
  const DENSITY_KEY = "media-grid-density";
  const SEARCH_DEBOUNCE = 300;
  /** Tablo satırındaki hızlı işlemler — kart menüsüyle aynı `onAction` tablosu. */
  /**
   * Satır eylemleri — dosyanın durumuna göre değişir.
   *
   * İki şey sabit yazılıydı ve ikisi de yanlış görünüyordu:
   *   • Arşivdeki bir dosyada düğme yine "Arşivle" diyordu; oysa oradan
   *     yapılacak tek şey geri almak.
   *   • Ürününde kullanılan bir dosyada silme düğmesi açıktı; basılınca
   *     arka taraf reddediyor ama kullanıcı sebebini göremiyordu.
   */
  function rowActions(row) {
    const kullanimda = (row.liveUsage || 0) > 0;
    const duzenlenebilir = store.canEdit(row);
    return [
      { id: "preview", icon: "eye", title: t("media.actions.preview"), disabled: false },
      { id: "download", icon: "download", title: t("media.actions.download"), disabled: false },
      {
        id: "archive",
        icon: row.archived ? "archive-restore" : "archive",
        title: row.archived ? t("media.actions.unarchive") : t("media.actions.archive"),
        disabled: !duzenlenebilir,
      },
      // "Sil" her iki görünümde de KALICI silme. Arşivleme ayrı düğme ve ayrı
      // iş: biri geri alınabilir, diğeri alınamaz. Önce ikisi de aynı şeyi
      // yapıyordu — "Sil" dosyayı arşive taşıyordu, yani arşivle düğmesinden
      // farkı yoktu.
      {
        id: "purge",
        icon: "trash-2",
        title: kullanimda ? t("media.actions.deleteBlocked") : t("media.actions.purge"),
        disabled: !duzenlenebilir || kullanimda,
      },
    ];
  }

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
    bulkBusy,
    bulkReport,
    hasActiveFilter,
  } = storeToRefs(store);

  // ── Tablo denetleyicisi (panelin table list standardı) ─────────────
  //
  // Filtre + sıralama + sütun görünürlüğü TEK kaynakta: `dt`. Sol ray, sütun
  // başlığındaki huni, "Sütunlar" menüsü ve araç çubuğu hep buraya yazar;
  // store bunun türevi olarak beslenir (aşağıdaki `applyToStore`). İki ayrı
  // filtre state'i tutulsaydı ray ile tablo birbirini ezerdi.
  //
  // `column: false` → tabloda sütun değil, yalnız filtre (ray grubu).
  const optionsOf = (group, ids) =>
    ids.map((id) => ({ value: id, label: t(`media.${group}.${id}`) }));

  const formatOptions = computed(() =>
    availableFormats.value.map((f) => ({ value: f.ext, label: f.ext }))
  );
  const tagOptions = computed(() =>
    availableTags.value.map((x) => ({ value: x.tag, label: x.tag }))
  );

  const MEDIA_FIELDS = [
    { key: "select", label: t("media.select"), align: "center", hideable: false, minWidth: 44 },
    { key: "preview", label: t("media.table.preview"), align: "center", hideable: false },
    {
      key: "fileName",
      label: t("media.table.fileName"),
      sortable: true,
      hideable: false,
      minWidth: 220,
      filter: { variant: "text" },
    },
    {
      key: "ext",
      label: t("media.table.kind"),
      align: "center",
      sortable: true,
      filter: {
        variant: "select",
        get options() {
          return formatOptions.value;
        },
      },
    },
    {
      key: "bytes",
      label: `${t("media.table.size")} (MB)`,
      align: "right",
      sortable: true,
      filter: { variant: "range" },
    },
    { key: "dimensions", label: t("media.table.dimensions"), align: "center", defaultHidden: true },
    {
      key: "usageCount",
      label: t("media.table.usage"),
      align: "center",
      sortable: true,
      filter: { variant: "range" },
    },
    {
      key: "owner",
      label: t("media.filters.owner"),
      align: "center",
      defaultHidden: true,
      filter: { variant: "select", options: optionsOf("owner", ["self", "shared"]) },
    },
    {
      key: "tags",
      label: t("media.filters.tags"),
      defaultHidden: true,
      filter: {
        variant: "select",
        get options() {
          return tagOptions.value;
        },
      },
    },
    {
      key: "uploadedAt",
      label: t("media.table.uploadedAt"),
      sortable: true,
      filter: { variant: "date" },
    },
    { key: "action", label: t("media.table.action"), align: "center", hideable: false },
    // Sütunu olmayan filtreler — ray grupları ve hızlı görünümler.
    {
      key: "kind",
      label: t("media.filters.kind"),
      column: false,
      filter: { variant: "select", options: optionsOf("kinds", ["image", "video", "document"]) },
    },
    {
      key: "usage",
      label: t("media.filters.usage"),
      column: false,
      filter: { variant: "select", options: optionsOf("usage", ["used", "unused"]) },
    },
    {
      key: "orientation",
      label: t("media.filters.orientation"),
      column: false,
      filter: {
        variant: "select",
        options: optionsOf("orientation", ["landscape", "portrait", "square"]),
      },
    },
    {
      key: "sizeBucket",
      label: t("media.filters.size"),
      column: false,
      filter: { variant: "select", options: optionsOf("size", ["small", "medium", "large"]) },
    },
    {
      key: "dateBucket",
      label: t("media.filters.date"),
      column: false,
      filter: { variant: "select", options: optionsOf("date", ["today", "week", "month", "year"]) },
    },
    {
      key: "flags",
      label: t("media.filters.quick"),
      column: false,
      filter: {
        variant: "select",
        options: [
          { value: "favorite", label: t("media.quick.favorites") },
          { value: "missingAlt", label: t("media.quick.missingAlt") },
        ],
      },
    },
    {
      key: "archived",
      // Çip "Arşiv: Arşivlenenler" okunsun diye alan ve seçenek etiketi ayrı.
      label: t("media.filters.archive"),
      column: false,
      filter: {
        variant: "select",
        options: [{ value: "archived", label: t("media.filters.archivedOnly") }],
      },
    },
  ];

  const dt = useDataTable(MEDIA_FIELDS, {
    pageSize: PAGE_SIZES[0],
    defaultSort: [{ field: "uploadedAt", desc: true }],
  });

  /** dt → store: tek yönlü. Store yalnız burada yazılır, başka yerde değil. */
  function applyToStore() {
    const f = dt.filters;
    store.search = dt.search.value;
    store.nameFilter = f.fileName || "";
    store.kindFilter = f.kind || [];
    store.usageFilter = f.usage || [];
    store.ownerFilter = f.owner || [];
    store.formatFilter = f.ext || [];
    store.orientationFilter = f.orientation || [];
    store.sizeFilter = f.sizeBucket || [];
    store.dateFilter = f.dateBucket || [];
    store.sizeRange = f.bytes || null;
    store.usageRange = f.usageCount || null;
    store.dateRange = f.uploadedAt || null;
    store.tagFilter = f.tags || [];
    store.flagFilter = f.flags || [];
    store.showArchived = Boolean(f.archived?.length);
    // Sıralama boşaltılabilir (başlığa 3. tık); listede kararsız sıra olmasın.
    store.sorting = dt.sorting.value.length
      ? dt.sorting.value
      : [{ field: "uploadedAt", desc: true }];
    store.page = dt.page.value;
    store.pageSize = dt.pageSize.value;
  }

  watch([() => ({ ...dt.filters }), dt.search, dt.sorting, dt.page, dt.pageSize], applyToStore, {
    deep: true,
    immediate: true,
  });

  // ── Arama (debounce) ───────────────────────────────────────────────
  const searchText = ref(dt.search.value);
  let searchTimer = null;
  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => dt.setSearch(searchText.value), SEARCH_DEBOUNCE);
  }
  function clearSearch() {
    clearTimeout(searchTimer);
    searchText.value = "";
    dt.setSearch("");
  }
  watch(dt.search, (v) => {
    if (v !== searchText.value) searchText.value = v;
  });

  // ── Filtreler adres çubuğunda (T-092) ──────────────────────────────
  //
  // Filtre durumu bugüne kadar yalnız bellekteydi: kurulan süzgeç ne
  // paylaşılabiliyor ne de sayfa yenilenince hayatta kalıyordu. Satıcı
  // "kullanılmayan videolar" listesini ekibine gönderdiğinde karşı taraf
  // filtresiz kütüphaneyi açıyordu.
  //
  // Yön ÇİFT: adres ekranı, ekran adresi besliyor. Döngüye girmemesinin tek
  // sebebi her iki tarafta da yazmadan önce eşitlik kontrolü yapılması
  // (`sameQuery`) — bayrak/kilit yok, çünkü bayrak async bir gezinmede
  // kilitli kalabilir ve senkron sessizce ölür.
  const route = useRoute();
  const router = useRouter();

  /**
   * Sayfadan ÇIKARKEN adres yazılmasın.
   *
   * Gezinme onaylandığında `route` yeni sayfayı gösteriyor ama bu bileşen
   * henüz sökülmemiş oluyor. O aralıkta aşağıdaki iki izleyici birbirini
   * tetikleyip medya filtrelerini BAŞKA bir sayfanın adresine yazabilirdi.
   */
  const OWN_PATH = route.path;
  const onOwnRoute = () => route.path === OWN_PATH;

  const FILTER_SCHEMA = MEDIA_FIELDS.filter((f) => f.filter).map((f) => ({
    key: f.key,
    variant: f.filter.variant,
  }));
  const URL_DEFAULTS = {
    sorting: [{ field: "uploadedAt", desc: true }],
    pageSize: PAGE_SIZES[0],
    pageSizes: PAGE_SIZES,
    sortableKeys: MEDIA_FIELDS.filter((f) => f.sortable).map((f) => f.key),
  };

  function currentQuery() {
    return encodeFilterQuery(
      {
        search: dt.search.value,
        filters: dt.filters,
        sorting: dt.sorting.value,
        page: dt.page.value,
        pageSize: dt.pageSize.value,
      },
      FILTER_SCHEMA,
      URL_DEFAULTS
    );
  }

  /**
   * Adres → ekran. Yalnız adreste YAZAN alanlar kurulur, gerisi temizlenir:
   * aksi hâlde geri tuşuyla dönülen adres eski filtrenin üstüne binerdi.
   */
  function applyQueryToTable() {
    const gelen = decodeFilterQuery(route.query, FILTER_SCHEMA, URL_DEFAULTS);
    for (const { key } of FILTER_SCHEMA) dt.setFilter(key, gelen.filters[key]);
    // Bekleyen arama gecikmesi iptal: geri tuşuna basıldığında yarım kalmış
    // bir tuş vuruşu 300 ms sonra adresten gelen aramayı ezerdi.
    clearTimeout(searchTimer);
    dt.setSearch(gelen.search);
    searchText.value = gelen.search;
    dt.setSort((gelen.sorting || URL_DEFAULTS.sorting).map((s) => ({ ...s })));
    dt.setPageSize(gelen.pageSize || URL_DEFAULTS.pageSize);
    // Sayfa EN SONA: setFilter/setSearch/setPageSize hepsi sayfayı 1'e çekiyor.
    dt.setPage(gelen.page);
  }

  applyQueryToTable();

  // Ekran → adres. `replace` bilinçli: arama 300 ms gecikmeli de olsa her
  // tuşta yazıyor, `push` olsaydı tek bir kelime aramak geçmişe on kayıt
  // eklerdi ve geri tuşu sayfadan çıkamaz hâle gelirdi.
  watch(
    [() => ({ ...dt.filters }), dt.search, dt.sorting, dt.page, dt.pageSize],
    () => {
      if (!onOwnRoute()) return;
      const hedef = { ...foreignParams(route.query, FILTER_SCHEMA), ...currentQuery() };
      if (sameQuery(route.query, hedef)) return;
      router.replace({ query: hedef }).catch(() => {});
    },
    { deep: true }
  );

  // Adres → ekran (geri/ileri tuşu, paylaşılan bağlantı, elle düzenleme).
  watch(
    () => route.query,
    () => {
      if (!onOwnRoute()) return;
      const bizdeki = { ...foreignParams(route.query, FILTER_SCHEMA), ...currentQuery() };
      if (sameQuery(route.query, bizdeki)) return;
      applyQueryToTable();
    }
  );

  // ── Sütun tercihleri (localStorage) ────────────────────────────────
  //
  // `useDataTable` sütun görünürlüğünü kalıcılaştırmıyor (server-side listelerde
  // gerek yoktu). Burada yalnız bu sayfa için saklanıyor; ortak composable'ın
  // davranışı değişmiyor.
  const COLUMNS_KEY = "media-cols:seller-media";

  function restoreColumns() {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(COLUMNS_KEY) || "null");
    } catch {
      stored = null;
    }
    if (!Array.isArray(stored)) return;
    for (const col of dt.columns.value) {
      if (Boolean(dt.hidden[col.key]) !== stored.includes(col.key)) dt.toggleColumn(col.key);
    }
  }

  restoreColumns();

  watch(
    () => ({ ...dt.hidden }),
    (hidden) => {
      const off = Object.keys(hidden).filter((k) => hidden[k]);
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(off));
    },
    { deep: true }
  );

  // ── Sıralama (araç çubuğu ↔ tablo başlığı aynı state) ──────────────
  const primarySort = computed(() => dt.sorting.value[0] || { field: "uploadedAt", desc: true });

  // Sıralama değişince ilk sayfaya dön — 4. sayfada sıralama değiştirince
  // kullanıcı listenin ortasına düşüyordu (setFilter/setSearch zaten yapıyor).
  //
  // `flush: "sync"` şart: adresten durum kurulurken (`applyQueryToTable`)
  // sıralama sayfadan ÖNCE yazılıyor. Varsayılan gecikmeli akışta bu sıfırlama
  // sayfa yazıldıktan SONRA çalışır ve "?sort=bytes:asc&page=3" bağlantısı hep
  // 1. sayfayı açardı. Kullanıcı açısından fark yok — sıfırlama zaten aynı
  // etkileşim içinde oluyor.
  watch(dt.sorting, () => dt.setPage(1), { flush: "sync" });

  function setPrimarySort(field) {
    dt.setSort([{ field, desc: primarySort.value.desc }]);
  }

  function toggleSortDir() {
    const [first, ...rest] = dt.sorting.value;
    dt.setSort(first ? [{ ...first, desc: !first.desc }, ...rest] : []);
  }

  // ── Görünüm modu ve ızgara yoğunluğu ───────────────────────────────
  const { viewMode } = useListViewMode("seller-media", "grid");
  const density = ref(Number(localStorage.getItem(DENSITY_KEY)) || 3);
  watch(density, (v) => localStorage.setItem(DENSITY_KEY, String(v)));

  // Sayfa AppLayout içinde: ≥768px'te IconRail+SidePanel 280px yatay alan yiyor.
  // Detay paneli ancak ≥1280px viewport'ta sütun olarak durabiliyor (bkz.
  // media.scss §Kırılma noktaları); altında sheet olarak açılır.
  const { isXl: isDesktop, is2xl: detailDocked } = useBreakpoint();

  /**
   * Çizilen mod.
   *
   * Sayfanın TEK mobil sınırı 1024px: kompakt araç şeridi, özet karolar ve
   * yükleme FAB'ı zaten burada devreye giriyor. Altında **her zaman satır
   * listesi** — görünüm seçici yok (SellerListingsView mobil kalıbı).
   *
   * 768px'i sınır almak yetmiyordu: yatay tutulan telefon (ör. 800×360) ve
   * büyük telefonlar 768'i geçiyor, sayfa mobil kabuğunu giymişken ortada
   * kart ızgarası çiziliyordu. Üstelik ≥768'de kabuk 280px yediği için orta
   * sütuna ~456px kalıyor — ızgaranın da tablonun da sığmadığı genişlik.
   */
  const effectiveMode = computed(() => {
    if (!isDesktop.value) return "rows";
    return viewMode.value === "list" ? "rows" : viewMode.value;
  });

  /** Yoğunluk üst sınır; gerçek sütun sayısı kalan genişliğe göre düşer. */
  const gridColumns = computed(() =>
    detailDocked.value ? density.value : Math.min(density.value, 4)
  );

  /**
   * Detay SÜTUNU açık mı — `sizes` hesabı için. Kayan panel (`sheet`)
   * ızgaranın genişliğini almaz; yalnız yerleşik sütun alır. İkisini bir
   * saymak, dar ekranda kart genişliğini olduğundan küçük hesaplardı.
   */
  const detailSutunuAcik = computed(() => Boolean(activeItem.value) && detailDocked.value);

  const columnsOpen = ref(false);
  watch(effectiveMode, (mode) => {
    if (mode !== "table") columnsOpen.value = false;
  });

  // ── Kanban — kullanım durumuna göre üç kova ────────────────────────
  const KANBAN_BUCKETS = [
    { key: "unused", color: "#f59e0b", match: (m) => (m.liveUsage || 0) === 0 },
    { key: "single", color: "#10b981", match: (m) => (m.liveUsage || 0) === 1 },
    { key: "multi", color: "#3b82f6", match: (m) => (m.liveUsage || 0) > 1 },
  ];

  const kanbanColumns = computed(() =>
    KANBAN_BUCKETS.map((b) => ({
      key: b.key,
      color: b.color,
      label: t(`media.kanban.${b.key}`),
      items: paged.value.filter(b.match),
    }))
  );

  // ── Mobil ⋯ menüsü ────────────────────────────────────────────────
  //
  // Telefonda tablo başlığı yok → sıralama buraya iner (referans kalıp:
  // SellerListingsView `sl-more-menu`). Birincil aksiyon FAB'da.
  const mobileMenuOpen = ref(false);

  const MOBILE_SORTS = [
    {
      key: "newest",
      icon: "clock",
      label: () => t("media.sort.newest"),
      sort: [{ field: "uploadedAt", desc: true }],
    },
    {
      key: "oldest",
      icon: "clock",
      label: () => t("media.sort.oldest"),
      sort: [{ field: "uploadedAt", desc: false }],
    },
    {
      key: "name",
      icon: "arrow-down-a-z",
      label: () => t("media.sort.name"),
      sort: [{ field: "fileName", desc: false }],
    },
    {
      key: "size",
      icon: "hard-drive",
      label: () => t("media.sort.size"),
      sort: [{ field: "bytes", desc: true }],
    },
    {
      key: "usage",
      icon: "package",
      label: () => t("media.sort.usage"),
      sort: [{ field: "usageCount", desc: true }],
    },
  ];

  const currentSortKey = computed(() => {
    const active = dt.sorting.value[0];
    if (!active) return "";
    const match = MOBILE_SORTS.find(
      (o) => o.sort[0].field === active.field && o.sort[0].desc === active.desc
    );
    return match?.key || "";
  });

  function setMobileSort(opt) {
    dt.setSort(opt.sort.map((x) => ({ ...x })));
    mobileMenuOpen.value = false;
  }

  function openPickerFromMenu() {
    pickerOpen.value = true;
    mobileMenuOpen.value = false;
  }

  function selectPageFromMenu() {
    store.selectPage();
    mobileMenuOpen.value = false;
  }

  // Dışarı tıklayınca kapan — menü `@click.stop` ile kendini korur.
  function closeMobileMenu() {
    mobileMenuOpen.value = false;
  }
  onMounted(() => document.addEventListener("click", closeMobileMenu));
  onUnmounted(() => document.removeEventListener("click", closeMobileMenu));

  // Gerçek dosyalar. Ekran eskiden bellekte üretilen örneklerle açılıyordu;
  // artık satıcının kendi dosyaları arka taraftan geliyor.
  onMounted(() => store.loadReal());

  // Arşiv görünümü ayrı bir sorgu: bırakılan dosyalar aktif listede yok.
  watch(
    () => store.showArchived,
    (arsivde) => store.loadReal({ trashed: Boolean(arsivde) })
  );

  // Detay paneli açılınca kullanım bilgisi istenir. Listeyle birlikte çekmek
  // her satır için ayrı tarama demek olurdu; açılan satır için bir kez yeter.
  watch(
    () => activeItem.value?.id,
    (id) => {
      if (id) store.loadUsage(id).catch(() => {});
    }
  );

  // ── Mobil özet şerit ───────────────────────────────────────────────
  // Tür dağılımı + arşiv; dokununca ilgili filtreyi açar/kapatır.
  const summaryTiles = computed(() => {
    const kinds = dt.filters.kind || [];
    const tiles = ["image", "video", "document"].map((kind) => ({
      key: kind,
      label: t(`media.kinds.${kind}`),
      count: counts.value[kind],
      active: kinds.length === 1 && kinds[0] === kind,
      toggle: () => toggleSingleFilter("kind", kind),
    }));
    return [
      ...tiles,
      {
        key: "archived",
        label: t("media.filters.archive"),
        count: counts.value.archived,
        active: archivedModel.value,
        toggle: () => (archivedModel.value = !archivedModel.value),
      },
    ];
  });

  /** Karo davranışı: aynı değere tekrar dokunmak filtreyi kaldırır. */
  function toggleSingleFilter(key, value) {
    const current = dt.filters[key] || [];
    const on = current.length === 1 && current[0] === value;
    dt.setFilter(key, on ? undefined : [value]);
  }

  const allOnPageSelected = computed(
    () => paged.value.length > 0 && paged.value.every((m) => store.isSelected(m.id))
  );

  function toggleSelectPage() {
    if (allOnPageSelected.value) store.clearSelection();
    else store.selectPage();
  }

  const filtersOpen = ref(false);
  // Drawer ve sheet ekranı kaplarken arka plan kaymasın.
  useScrollLock(filtersOpen);
  useScrollLock(() => Boolean(activeItem.value) && !detailDocked.value);

  const pickerOpen = ref(false);
  const previewItem = ref(null);

  // ── T-091 yükleyici modalı ─────────────────────────────────────────
  // Satıcının kullanabildiği slotlar; varsayılan ürün görseli — kütüphanenin
  // ana kullanım yolu ve 1000×1000 kapısının sahibi.
  const uploaderOpen = ref(false);
  const uploadSlots = slotsForRole("seller");
  const uploadSlotKey = ref("product.image");

  /**
   * Yükleme bitince listeyi tazele — store'un mevcut yolu (`loadReal`).
   * Çok dosyalı yüklemede her `uploaded` olayı ayrı ayrı yeniden yüklemesin
   * diye kısa bir bekleme ile toplanıyor.
   */
  let uploadRefreshTimer = null;
  function onUploaderUploaded() {
    clearTimeout(uploadRefreshTimer);
    uploadRefreshTimer = setTimeout(() => {
      store.loadReal({ trashed: store.showArchived });
    }, 400);
  }
  onUnmounted(() => clearTimeout(uploadRefreshTimer));

  /** Kırpma Stüdyosuna verilen dosya; `null` iken modal hiç kurulmaz. */
  const cropItem = ref(null);
  /**
   * Seçili dosyanın `Media Asset` adı — `save_intent`in hedefi. Modal
   * AÇILMADAN ÖNCE çözülür: stüdyo `asset`i kuruluşta okuyor, sonradan
   * gelen ad Uygula'yı açmaz. Varlığı olmayan dosyada boş kalır ve modal
   * bugünkü dürüst "kaydedilemez" durumunda açılır.
   */
  const cropAsset = ref("");
  const cropSource = computed(() => ({
    url: cropItem.value ? store.fileUrl(cropItem.value) : "",
    width: cropItem.value?.width || 0,
    height: cropItem.value?.height || 0,
  }));
  const helpOpen = ref(false);
  const pendingPurge = ref([]);
  const purgeConfirmOpen = ref(false);
  const confirmPayload = ref({ title: "", message: "" });
  /** Klavye imleci — görünen listedeki konum. */
  const cursor = ref(-1);
  const searchInput = useTemplateRef("searchInput");
  const gridEl = useTemplateRef("gridEl");

  // ── Izgara pencereleme (T-092) ─────────────────────────────────────
  //
  // Pencereleme YALNIZ ızgara kipinde. Satır listesinin yüksekliği dosya adına
  // göre değişiyor (ad iki satıra iniyor), tablo kendi sayfalamasını taşıyor,
  // kanban üç ayrı sütun — üçünde de sabit satır yüksekliği yok, yani
  // matematiğin şartı yok.
  //
  // Eşik sayfa boyutlarından (12/24/48) türetilmedi, elle seçildi: 24 ve altı
  // zaten bir-iki ekran dolusu kart. Pencereleme 48'lik sayfada devreye girer.
  const GRID_VIRTUAL_THRESHOLD = 24;

  const {
    windowed: gridWindowed,
    visible: visibleCards,
    offset: cardOffset,
    padStyle: gridPadStyle,
    reveal: revealCard,
  } = useCardGridWindow(gridEl, {
    items: () => paged.value,
    enabled: () => effectiveMode.value === "grid",
    threshold: GRID_VIRTUAL_THRESHOLD,
  });

  /**
   * Sürükle-bırak — süzme YAPMIYOR, kuyruğa veriyor (TUR-123).
   *
   * Burada ikinci bir kural kümesi vardı: kendi uzantı süzgeci ve elle yazılmış
   * 25 MB sınırı. İki sorun çıkardı. Birincisi, sınır sunucudakinden ayrı
   * duruyordu — biri değişince diğeri sessizce eski kuralla çalışırdı.
   * İkincisi, reddedilen dosya için tek satırlık "kabul edilmedi" uyarısı
   * veriyordu; sebebini söylemiyordu.
   *
   * Artık dosyalar doğrudan kuyruğa gidiyor; ön kontrol orada, sunucudan
   * alınan kurallarla çalışıyor ve her dosya kendi sebebini gösteriyor.
   */
  // Sürükle-bırak da seçili slotun asgari-boyut kapısından geçer: küçük görsel
  // (kısa kenar / alan < slot sınırı) burada elenir, boşa yükleme turlamaz.
  const dz = useDropzone((files) => store.enqueueUploads(files, { slotKey: uploadSlotKey.value }), {
    accept: "",
    multiple: true,
    maxBytes: Number.MAX_SAFE_INTEGER,
  });

  // ── Filtreler ──────────────────────────────────────────────────────
  //
  // Ray tek seçimli (radyo mantığı), `dt` çok seçimli dizi tutar: ray seçili
  // değeri dizinin ilkinden okur. Sütun filtresinden 2+ değer seçilirse ray
  // ilkini gösterir, çip şeridi tamamını — bilgi kaybolmaz.
  const optionLabel = (group, id) => t(`media.${group}.${id}`);
  const groupValue = (key) => dt.filters[key]?.[0] ?? "all";
  const setGroupValue = (key) => (v) => dt.setFilter(key, v === "all" ? undefined : [v]);

  /** Çoklu filtrede tek değeri aç/kapat (etiket bulutu, hızlı görünümler). */
  function toggleArrayFilter(key, value) {
    const current = dt.filters[key] || [];
    const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
    dt.setFilter(key, next.length ? next : undefined);
  }

  const archivedModel = computed({
    get: () => Boolean(dt.filters.archived?.length),
    set: (on) => dt.setFilter("archived", on ? ["archived"] : undefined),
  });

  /** Huni içindeki tarih aralığı — sütun filtresiyle aynı `uploadedAt` state'i. */
  function setDateBound(bound, value) {
    const current = dt.filters.uploadedAt || {};
    const next = { ...current, [bound]: value || null };
    dt.setFilter("uploadedAt", next.from || next.to ? next : undefined);
  }

  const activeTags = computed(() => dt.filters.tags || []);

  /** Çip şeridi `dt.chips`'ten gelir — her filtre kaynağı aynı listeye düşer. */
  function clearChip(key) {
    if (key === "all") {
      dt.clearAll();
      return;
    }
    dt.chips.value.find((c) => c.key === key)?.clear();
  }

  /** Ray üstündeki tek tıklık görünümler — filtre grubu değil, aç/kapa. */
  const quickViews = computed(() => {
    const flags = dt.filters.flags || [];
    return [
      {
        id: "favorites",
        label: t("media.quick.favorites"),
        count: counts.value.favorite,
        active: flags.includes("favorite"),
        toggle: () => toggleArrayFilter("flags", "favorite"),
      },
      {
        id: "missingAlt",
        label: t("media.quick.missingAlt"),
        count: counts.value.missingAlt,
        active: flags.includes("missingAlt"),
        toggle: () => toggleArrayFilter("flags", "missingAlt"),
      },
    ];
  });

  /**
   * Ray grupları veriden üretilir — üç kez kopyalanmış <nav> bloğu yerine.
   * Seçeneklerde ikon yok (bkz. MediaFilterRail): etiket + sayı yeterli,
   * seçili durumu dolu marka zemini anlatıyor.
   */
  const filterGroups = computed(() => [
    {
      id: "kind",
      label: t("media.filters.kind"),
      value: groupValue("kind"),
      set: setGroupValue("kind"),
      options: [
        { id: "all", label: optionLabel("kinds", "all"), count: counts.value.all },
        { id: "image", label: optionLabel("kinds", "image"), count: counts.value.image },
        { id: "video", label: optionLabel("kinds", "video"), count: counts.value.video },
        { id: "document", label: optionLabel("kinds", "document"), count: counts.value.document },
      ],
    },
    {
      id: "usage",
      label: t("media.filters.usage"),
      value: groupValue("usage"),
      set: setGroupValue("usage"),
      options: [
        { id: "all", label: optionLabel("usage", "all"), count: counts.value.all },
        { id: "used", label: optionLabel("usage", "used"), count: counts.value.used },
        { id: "unused", label: optionLabel("usage", "unused"), count: counts.value.unused },
      ],
    },
    {
      id: "owner",
      label: t("media.filters.owner"),
      value: groupValue("owner"),
      set: setGroupValue("owner"),
      options: [
        { id: "all", label: optionLabel("owner", "all"), count: counts.value.all },
        {
          id: "self",
          label: optionLabel("owner", "self"),
          count: counts.value.all - counts.value.shared,
        },
        { id: "shared", label: optionLabel("owner", "shared"), count: counts.value.shared },
      ],
    },
    {
      id: "format",
      label: t("media.filters.format"),
      value: groupValue("ext"),
      set: setGroupValue("ext"),
      // Seçenekler veriden üretilir; kütüphanede olmayan format listelenmez.
      options: [
        { id: "all", label: optionLabel("kinds", "all"), count: counts.value.all },
        ...availableFormats.value.map((f) => ({ id: f.ext, label: f.ext, count: f.count })),
      ],
    },
    {
      id: "orientation",
      label: t("media.filters.orientation"),
      value: groupValue("orientation"),
      set: setGroupValue("orientation"),
      options: [
        { id: "all", label: optionLabel("kinds", "all"), count: counts.value.all },
        { id: "landscape", label: optionLabel("orientation", "landscape") },
        { id: "portrait", label: optionLabel("orientation", "portrait") },
        { id: "square", label: optionLabel("orientation", "square") },
      ],
    },
    {
      id: "date",
      label: t("media.filters.date"),
      value: groupValue("dateBucket"),
      set: setGroupValue("dateBucket"),
      // Tam tarih aralığı huninin içinde: tablo sütun filtresine gitmeden
      // (ve ızgara/kanban modunda da) girilebilsin.
      range: {
        type: "date",
        fromLabel: t("media.filters.dateFrom"),
        toLabel: t("media.filters.dateTo"),
        from: dt.filters.uploadedAt?.from || "",
        to: dt.filters.uploadedAt?.to || "",
        set: (bound, value) => setDateBound(bound, value),
      },
      options: [
        { id: "all", label: optionLabel("kinds", "all"), count: counts.value.all },
        { id: "today", label: optionLabel("date", "today") },
        { id: "week", label: optionLabel("date", "week") },
        { id: "month", label: optionLabel("date", "month") },
        { id: "year", label: optionLabel("date", "year") },
      ],
    },
    {
      id: "size",
      label: t("media.filters.size"),
      value: groupValue("sizeBucket"),
      set: setGroupValue("sizeBucket"),
      options: [
        { id: "all", label: optionLabel("kinds", "all"), count: counts.value.all },
        { id: "small", label: optionLabel("size", "small") },
        { id: "medium", label: optionLabel("size", "medium") },
        { id: "large", label: optionLabel("size", "large") },
      ],
    },
  ]);

  // Sayfa sıfırlama `useDataTable` içinde: setFilter/setSearch/setPageSize
  // page'i 1'e çeker. Burada ayrıca watcher tutmak çift kaynak olurdu.
  const rangeFrom = computed(() =>
    filtered.value.length ? (dt.page.value - 1) * dt.pageSize.value + 1 : 0
  );
  const rangeTo = computed(() =>
    Math.min(dt.page.value * dt.pageSize.value, filtered.value.length)
  );

  // ── Etkileşim ──────────────────────────────────────────────────────
  function onFileInput(event) {
    const files = Array.from(event.target.files || []);
    if (files.length) store.enqueueUploads(files, { slotKey: uploadSlotKey.value });
    event.target.value = "";
  }

  function openDetail(id, index) {
    store.setActive(id);
    if (index !== undefined) cursor.value = index;
    // Ölçüsü hiç sorulmamış görselde Kırp pasif kalıyordu; panel açılırken
    // gerçek ölçü arka planda tamamlanır (varsa ağ isteği yok).
    store.ensureDimensions(id);
  }

  function onCardToggle(id, index, payload = {}) {
    cursor.value = index;
    if (payload.range) store.selectRangeTo(id);
    else store.toggleSelect(id);
  }

  /**
   * Kaydet — arka taraf yanıtı BEKLENİR.
   *
   * Eskiden `await` yoktu: fonksiyon bir söz (Promise) döndürüyor, o da her
   * zaman "dolu" sayıldığı için işlem başarısız olsa bile "kaydedildi" yazıyordu.
   */
  async function onSave(patch) {
    const { fileName, ...rest } = patch;
    const renamed = fileName && fileName !== activeItem.value?.fileName;
    try {
      if (renamed) await store.rename(activeId.value, fileName);
      const ok = await store.update(activeId.value, rest);
      if (ok || renamed) toast.success(t("media.toast.saved"));
      else toast.error(t("media.toast.readonly"));
    } catch (e) {
      toast.error(e.message || t("media.toast.readonly"));
    }
  }

  async function onReplaceFile(file) {
    try {
      if (await store.replaceFile(activeId.value, file)) {
        toast.success(t("media.toast.replaced"));
      } else {
        toast.error(t("media.toast.readonly"));
      }
    } catch (e) {
      // Paylaşılan dosyada arka taraf reddediyor; sebebi kullanıcıya gösterilir.
      toast.error(e.message || t("media.toast.readonly"));
    }
  }

  /**
   * Kalıcı silme onayı — geri alınamaz olduğu AÇIKÇA yazılır.
   *
   * Dosya diskten yalnız son sahip de sildiğinde gider ama satıcı için sonuç
   * aynı: kendi kütüphanesinden tamamen çıkar ve geri getiremez.
   */
  async function askPurge(ids) {
    const blocked = ids.filter((id) => !store.canEdit(items.value.find((m) => m.id === id)));
    if (blocked.length === ids.length) {
      toast.error(t("media.toast.readonly"));
      return;
    }

    // Kullanımdaki dosya silinemez; hiç denenmez, sebebi söylenir.
    const secilenler = ids.map((id) => items.value.find((m) => m.id === id)).filter(Boolean);
    const kullanimda = secilenler.filter((m) => (m.liveUsage || 0) > 0);
    const silinebilir = secilenler.filter((m) => !(m.liveUsage || 0));

    if (!silinebilir.length) {
      const toplam = kullanimda.reduce((n, m) => n + (m.liveUsage || 0), 0);
      toast.error(
        kullanimda.length === 1
          ? t("media.toast.inUseOne", { uses: toplam })
          : t("media.toast.inUseMany", { count: kullanimda.length })
      );
      return;
    }

    const adaylar = silinebilir.map((m) => m.id);

    /**
     * SUNUCUYA SOR — hiçbir şey silmez, yalnız okur (`preview_release`).
     *
     * Yukarıdaki `liveUsage` sayıları listenin YÜKLENDİĞİ andan kalma. Aradan
     * geçen sürede aynı görsel bir ürüne bağlanmış olabilir; ekran "hiçbir
     * yerde kullanılmıyor" der, kullanıcı KALICI silmeyi onaylar. Uç zaten
     * vardı ama hiçbir yerden çağrılmıyordu.
     *
     * Yanıt gelmezse (ağ hatası) onay yine açılır, istemci sayısıyla:
     * silmeyi engellemek doğru cevap değil — asıl kapı arka tarafta, orası
     * kullanımdaki dosyayı zaten reddediyor.
     */
    let sunucuKullanimda = 0;
    try {
      const onizleme = await store.previewRelease(adaylar);
      sunucuKullanimda = Number(onizleme?.in_use) || 0;
    } catch {
      sunucuKullanimda = 0;
    }

    pendingPurge.value = adaylar;
    const atlanan = kullanimda.length;
    confirmPayload.value = {
      title: t("media.confirm.purgeTitle", { count: adaylar.length }),
      message: sunucuKullanimda
        ? // Sunucu "bunlardan n tanesi şu an kullanılıyor" diyor; liste
          // yüklendiğinden beri değişmiş demektir. En sert uyarı bu.
          t("media.confirm.purgeNowInUse", { count: sunucuKullanimda })
        : atlanan
          ? t("media.confirm.purgeSkipped", { count: adaylar.length, skipped: atlanan })
          : t("media.confirm.purgeBody"),
    };
    purgeConfirmOpen.value = true;
  }

  async function runPurge() {
    const ids = pendingPurge.value;
    pendingPurge.value = [];
    try {
      reportBulk(await store.purgeMany(ids), "media.toast.purged");
    } catch (e) {
      toast.error(e.message || t("media.toast.readonly"));
    }
  }

  /**
   * Toplu işlemin sonucunu kullanıcıya SÖYLE — eksik kalanı gizlemeden (T-094).
   *
   * Önceden yalnız başarı sayacı okunuyordu: 50 dosyadan 2'si hata verdiğinde
   * ekran "48 medya arşivlendi" deyip susuyordu. Artık kısmi sonuçta başarı
   * bildirimi yerine uyarı çıkıyor; dosya dökümü toplu işlem çubuğunda kalıcı
   * duruyor (`bulkReport`), toast kaybolduktan sonra da okunabilsin.
   */
  function reportBulk(rapor, successKey) {
    if (!rapor) return;
    if (!rapor.partial) {
      if (successKey) toast.success(t(successKey, { count: rapor.ok }));
      return;
    }
    // `useToast`'ta uyarı tonu yok; kısmi sonuç hata tonunda veriliyor —
    // "işlem bitti" izlenimi vermemesi başarı tonundan daha önemli.
    toast.error(
      t("media.toast.bulkPartial", {
        ok: rapor.ok,
        failed: rapor.failed.length,
        skipped: rapor.skipped,
      })
    );
  }

  /** Kart menüsü, detay paneli ve klavye aynı işlem tablosunu kullanır. */
  function onAction(item, action) {
    if (!item) return;
    const handlers = {
      preview: () => {
        previewItem.value = item;
      },
      edit: () => store.setActive(item.id),
      // Kırpma yalnız ölçüsü bilinen görsellerde; detay panelindeki düğme de
      // aynı şarta bakıyor, burada ikinci kez kontrol ediliyor çünkü aksiyon
      // tablosuna klavye ve kart menüsü de giriyor.
      crop: async () => {
        // Ölçü eksikse önce tamamlamayı dene — klavye/menüden ilk istek
        // panel hiç açılmadan gelebilir.
        if (item.kind === "image" && !(item.width > 0 && item.height > 0)) {
          await store.ensureDimensions(item.id);
        }
        if (!(item.kind === "image" && item.width > 0 && item.height > 0)) return;
        // Asset adı modala girmeden çözülür (bkz. `cropAsset`). Çözülemezse
        // (varlık yok / uç erişilemedi) boş kalır — kaydetme kapalı, dürüst.
        cropAsset.value = "";
        try {
          cropAsset.value = await store.assetNameOf(item.id);
        } catch {
          cropAsset.value = "";
        }
        cropItem.value = item;
      },
      use: () => (pickerOpen.value = true),
      download: () => toast.info(t("media.toast.downloadMock", { name: item.fileName })),
      archive: async () => {
        try {
          const rapor = await store.archiveMany([item.id], !item.archived);
          // Tek dosyada da sessiz başarı yok: sahiplik kontrolünden düşen
          // ("skipped") ya da hata veren dosya "arşivlendi" diye bildiriliyordu.
          if (rapor.partial) reportBulk(rapor, "");
          else
            toast.success(item.archived ? t("media.toast.unarchived") : t("media.toast.archived"));
        } catch (e) {
          toast.error(e.message || t("media.toast.readonly"));
        }
      },
      // "Sil" = KALICI silme; arşivleme ayrı eylem (`archive`). Önce ikisi de
      // aynı işi yapıyordu — "Sil" dosyayı arşive taşıyordu, yani arşivle
      // düğmesinden farkı yoktu.
      delete: () => askPurge([item.id]),
      purge: () => askPurge([item.id]),
      favorite: async () => {
        try {
          const on = await store.toggleFavorite(item.id);
          toast.success(t(on ? "media.toast.favorited" : "media.toast.unfavorited"));
        } catch (e) {
          toast.error(e.message || t("media.toast.readonly"));
        }
      },
      copyLink: () => {
        navigator.clipboard?.writeText(store.fileUrl(item));
        toast.success(t("media.toast.linkCopied"));
      },
      duplicate: async () => {
        try {
          const copy = await store.duplicate(item.id);
          if (copy) toast.success(t("media.toast.duplicated", { name: copy.fileName }));
        } catch (e) {
          toast.error(e.message || t("media.toast.readonly"));
        }
      },
    };
    handlers[action]?.();
  }

  async function onUndo() {
    if (await store.undo()) toast.success(t("media.toast.undone"));
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
  async function onBulkTag(tag) {
    try {
      const count = await store.addTagToMany(selectedIds.value, tag);
      toast.success(t("media.toast.tagged", { count, tag }));
    } catch (e) {
      toast.error(e.message || t("media.toast.readonly"));
    }
  }

  function onBulkDownload() {
    toast.info(t("media.toast.bulkDownloadMock", { count: selectedIds.value.length }));
  }

  async function onBulkArchive() {
    // Arşiv görünümündeysek işlem TERSİ: geri alma.
    const arsivle = !store.showArchived;
    try {
      reportBulk(
        await store.archiveMany([...selectedIds.value], arsivle),
        arsivle ? "media.toast.bulkArchived" : "media.toast.bulkUnarchived"
      );
    } catch (e) {
      toast.error(e.message || t("media.toast.readonly"));
    }
  }

  function onBulkDelete() {
    askPurge([...selectedIds.value]);
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

  /**
   * İmleci taşı ve gittiği kartı görünür kıl.
   *
   * `children[index]` ARTIK KULLANILAMAZ: pencereleme görünmeyen kartları
   * DOM'dan kaldırdığı için çocuk sırası ile liste indeksi aynı değil —
   * 40. karta gitmek istediğinde `children[40]` ya yok ya da başka bir kart.
   * `revealCard` önce o kalemi pencereye sabitler, DOM güncellendikten sonra
   * `data-cell` ile gerçek düğümü verir.
   */
  async function moveCursor(step) {
    const total = paged.value.length;
    if (!total) return;
    const next = cursor.value < 0 ? 0 : Math.min(total - 1, Math.max(0, cursor.value + step));
    cursor.value = next;
    const cell = await revealCard(next);
    cell?.scrollIntoView({ block: "nearest" });
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
        ? askPurge([...selectedIds.value])
        : onAction(itemAtCursor(), "delete"),
    undo: onUndo,
    escape: () => {
      if (previewItem.value) previewItem.value = null;
      else if (filtersOpen.value) filtersOpen.value = false;
      else if (selectedIds.value.length) store.clearSelection();
      else if (activeId.value) store.setActive(null);
      else if (hasActiveFilter.value) dt.clearAll();
    },
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mpage {
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

    // base.scss'teki global `html.dark header` kuralı buraya gri kart zemini
    // ($d-bg-card) basıyor; bu sayfada başlık sayfa zeminiyle aynı kalsın.
    @include dark {
      background-color: transparent !important;
    }
  }

  // Başlık ölçeği panel geneliyle aynı (SellerListingsView: 15px bold).
  .mpage__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    @include media.heading;
  }

  .mpage__title-icon {
    color: $brand;
  }

  // Dosya sayısı satırı soluk değil, normal metin renginde okunur.
  .mpage__subtitle {
    margin: 2px 0 0;
    font-size: 12px;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  // Görünüm modu + yoğunluk + aksiyonlar; sınıflar panel geneline ait
  // (`hdr-btn-outlined` / `hdr-btn-primary`) — SellerListingsView ile aynı.
  // Blok yalnız ≥1024px'te render ediliyor (template `v-if="isDesktop"`), bu
  // yüzden dar ekrana özel kural gerekmiyor.
  .mpage__actions {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-wrap: wrap;
  }

  // Boş durumdaki tek buton — liste sayfalarının ikincil buton dili.
  .mpage__btn {
    @include media.button;
    @include media.focus-ring;
  }

  // ── Yerleşim ─────────────────────────────────────────────────────
  //
  // Filtre rayı artık akışta değil: huni düğmesiyle sağdan açılan çekmece
  // (SellerListingsView kalıbı). Orta sütun bu sayede rayın yediği ~14rem'i
  // geri kazanıyor. Detay paneli yalnız ≥1280px'te sütun olarak durur —
  // altında sheet/slide-over olduğu için grid kolonu da orada kalkar.
  .mpage__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: media.$s-4;
    align-items: start;
  }

  @media (min-width: 1280px) {
    .mpage__layout--detail {
      grid-template-columns: minmax(0, 1fr) 19rem;
    }
  }

  @media (min-width: 1536px) {
    .mpage__layout--detail {
      grid-template-columns: minmax(0, 1fr) 21rem;
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

  // ── Filtre çekmecesi ─────────────────────────────────────────────
  // İç stiller MediaFilterRail'de; burada yalnız çekmece kabuğu.
  //
  // Her genişlikte sağdan sola açılır (huni düğmesi) — panelin onaylı liste
  // filtre kalıbı bu (`DataTableToolbar` çekmecesi de sağdan). Telefonda da
  // yan çekmece: filtre listesi uzun, bottom sheet 85dvh tavanına dayanıp
  // iki katmanlı kaydırma yaratıyordu. ANIMATION_AUDIT §7.1.b'nin bottom
  // sheet kuralı bu katman için bilinçli olarak uygulanmıyor; giriş/çıkış
  // yönü yine aynı (sağdan girer, sağdan çıkar).
  .mrail {
    position: fixed;
    inset: 0 0 0 auto;
    z-index: 65;
    width: min(24rem, 92vw);
    overflow-y: auto;
    overscroll-behavior: contain;
    // Kapalıyken görünmez OLMALI: yalnız translate ile kaydırılırsa ekran
    // dışındaki butonlar hâlâ Tab ile odaklanıyor ve okuyucuya okunuyor.
    visibility: hidden;
    transform: translateX(100%);
    // Çıkış girişten hızlı (asimetri ilkesi — ANIMATION_AUDIT §7 Standart 1).
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
    position: fixed;
    inset: 0;
    z-index: 64;
    background: rgb(0 0 0 / 45%);
    overscroll-behavior: contain;
    touch-action: none;
  }

  // ── Araç çubuğu ──────────────────────────────────────────────────
  //
  // İçerik tamamen panelin global sınıflarıyla (`card`, `form-input-sm`,
  // `hdr-btn-outlined`) kuruldu — DataTableToolbar ile aynı ölçüler. Blok
  // yalnız ≥1024px'te render ediliyor; dar ekranın karşılığı `.mtoolbar__mobile-*`.
  .mtoolbar-wrap {
    position: sticky;
    // Header (56px) aynı scroll kabında sticky; 0 verilirse arkasına girer.
    top: media.$m-sticky-top;
    z-index: 20;
    margin-bottom: media.$s-4;
  }

  // ── Mobil şerit (<768px) ─────────────────────────────────────────
  // Ölçüler SellerListingsView mobil şeridiyle aynı (`.sl-more-toggle`):
  // 34px yükseklik, 13px yazı. Input global `form-input-sm` ölçüsünde kalır.
  .mtoolbar__mobile-btn {
    height: 34px;
    min-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    font-size: 13px;
  }

  .mmore-menu {
    width: 220px;
  }

  .mmore-divider {
    height: 1px;
    margin: 4px 6px;
    background: $l-border;

    @include dark {
      background: $d-border;
    }
  }

  // Özet karolar — SellerListingsView `sl-sum` kalıbı.
  .msum {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-height: 2.75rem;
    padding: 8px 4px;
    border: 1px solid $l-border;
    border-radius: 12px;
    background: $l-bg;
    cursor: pointer;
    transition: border-color $t-fast;
    @include media.press(0.97);

    b {
      font-size: 16px;
      font-weight: 800;
      line-height: 1.2;
      @include media.numeric;
      color: $l-text-900;
    }

    span {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: $l-text-400;
      white-space: nowrap;
    }

    &--on {
      border-color: $brand;
      box-shadow: 0 0 0 1px $brand;
    }

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;

      b {
        color: $d-text-hi;
      }

      span {
        color: $d-text-muted;
      }
    }
  }

  // Yükleme FAB'ı — MobileTabBar (64px) + safe-area üstünde.
  .mfab {
    position: fixed;
    inset-inline-end: 16px;
    bottom: media.$m-float-bottom;
    z-index: 40;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 12px 18px;
    // Artık <button>: tarayıcının varsayılan çerçevesi kalksın.
    border: 0;
    border-radius: media.$r-pill;
    font-size: 13.5px;
    font-weight: 700;
    // Sarı zemin üzerinde beyaz yasak (variables.scss) — $brand-ink kontrast çapası
    color: $brand-ink;
    background: $brand;
    box-shadow: 0 6px 16px rgb(0 0 0 / 22%);
    cursor: pointer;
    @include media.press(0.97);

    input[type="file"] {
      display: none;
    }
  }

  // Scoped [data-v] eki Tailwind'in `lg:hidden`ını ezebiliyor (SellerListings'te
  // yaşanmış hata) — masaüstünde FAB'ı burada da kapat. Sınır sayfanın tek
  // mobil sınırı olan 1024px: altında başlıktaki yükleme butonu render
  // edilmiyor, tek yükleme yolu FAB.
  @media (min-width: 1024px) {
    .mfab {
      display: none;
    }
  }

  // ── Izgara yoğunluğu (2 / 3 / 6 sütun) ───────────────────────────
  // Ölçüler `hdr-btn-outlined` ile hizalı: 34px yükseklik, 8px köşe.
  .mdensity {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 2px;
    height: 34px;
    padding: 0 3px;
    border: 1px solid $l-border;
    border-radius: 8px;
    background: $l-bg;

    @include dark {
      border-color: rgb(255 255 255 / 10%);
      background: transparent;
    }
  }

  .mdensity__btn {
    min-width: 26px;
    height: 26px;
    border: 0;
    border-radius: 6px;
    background: none;
    font-size: 12.5px;
    font-weight: 600;
    @include media.numeric;
    color: $l-text-500;
    cursor: pointer;
    @include media.focus-ring;
    @include media.press(0.94);

    @include dark {
      color: $d-text-muted;
    }

    &--on {
      background: $brand;
      color: $brand-ink;
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
  // Sütun sayısı yoğunluk seçicisinden gelir (--mgrid-cols); değer JS'te kalan
  // genişliğe göre zaten kırpılıyor, aşağıdaki media query'ler son emniyet ağı.
  .mgrid {
    display: grid;
    grid-template-columns: repeat(var(--mgrid-cols, 3), minmax(0, 1fr));
    gap: media.$s-3;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  // ── Satır listesi ────────────────────────────────────────────────
  // Hem `list` modu hem de dar ekranda tablo/kanban'ın karşılığı. Yatay
  // kaydırma yok: uzun metin kesiliyor, dar ekranda meta alt satıra iniyor
  // (SellerListingsView `sl-mrow`).
  .mrows {
    margin: 0;
    padding: 0;
    list-style: none;
    overflow: hidden;
    @include media.surface;
  }

  // Satırın tamamı tek buton: seçim kutusu kalktığı için satır içinde iki
  // farklı tıklama hedefi kalmadı.
  // Yerleşim grid: dar ekranda meta ikinci satıra iner (ad ile yarışmasın),
  // ≥1024px'te aynı DOM tek satırda dört sütuna açılır. Sınır 1024: altında
  // sayfaya kalan genişlik (viewport − 280px kabuk) meta sütunlarını
  // taşırıyordu — bkz. media.scss §Kırılma noktaları.
  .mrow {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr) auto;
    grid-template-areas:
      "thumb mid  pill"
      "thumb meta meta";
    align-items: center;
    column-gap: media.$s-3;
    row-gap: media.$s-05;
    width: 100%;
    padding: media.$s-2 media.$s-3;
    border: 0;
    background: none;
    text-align: start;
    cursor: pointer;
    transition: background 100ms ease-out;
    @include media.divider;
    @include media.focus-ring;

    @media (min-width: 1024px) {
      grid-template-columns: 2.5rem minmax(0, 1fr) auto auto;
      grid-template-areas: "thumb mid meta pill";
      row-gap: 0;
    }

    li:last-child & {
      border-bottom: 0;
    }

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

    &--active,
    &--selected {
      background: rgba($brand, 0.12);

      @include dark {
        background: rgba($brand, 0.12);
      }
    }
  }

  .mrow__thumb {
    grid-area: thumb;
    width: 2.5rem;
    border-radius: media.$r-sm;
  }

  .mrow__mid {
    grid-area: mid;
    min-width: 0;
    display: grid;
    gap: media.$s-05;
  }

  .mrow__name {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    min-width: 0;
    @include media.text;
    font-weight: 550;
    @include media.heading;
  }

  .mrow__name-text {
    min-width: 0;
    @include media.truncate;
  }

  .mrow__badge {
    flex-shrink: 0;
    @include media.chip("info");
  }

  // İkinci satır (başlık + etiketler) yalnız ≥1024px'te: dar ekranda satırı
  // üç satıra çıkarıp listeyi seyreltiyordu.
  .mrow__desc {
    display: none;
    align-items: center;
    gap: media.$s-2;
    min-width: 0;
    @include media.text("xs");

    @media (min-width: 1024px) {
      display: flex;
    }
  }

  .mrow__title {
    min-width: 0;
    @include media.muted;
    @include media.truncate;
  }

  .mrow__tag {
    flex-shrink: 0;
    @include media.chip;
  }

  // Meta: dar ekranda "·" ile ayrılmış tek satır özet, ≥1024px'te sabit
  // genişlikli sütunlar — ad ile kullanım rozeti arasındaki boşluğu bilgiyle
  // doldurur, sayılar sütun sütun hizalanır.
  .mrow__meta {
    grid-area: meta;
    display: flex;
    min-width: 0;
    align-items: center;
    gap: media.$s-1;
    @include media.text("xs");
    @include media.muted;
    @include media.numeric;

    @media (min-width: 1024px) {
      display: grid;
      grid-template-columns: 3.25rem 4.5rem 6rem 6.5rem;
      gap: media.$s-2;
      text-align: end;
    }
  }

  .mrow__cell {
    min-width: 0;
    @include media.truncate;

    // Dar ekranda ayraç; sütunlara geçince ayraç gereksiz.
    & + &::before {
      content: "· ";
    }

    @media (min-width: 1024px) {
      & + &::before {
        content: none;
      }
    }
  }

  // Ölçüler dar ekranda ilk feda edilen bilgi — belge/ses için zaten "—".
  .mrow__cell--dim {
    @media (max-width: media.$m-bp-sm) {
      display: none;
    }
  }

  .mrow .mpill {
    grid-area: pill;
    justify-self: end;
    white-space: nowrap;
  }

  // ── Tablo (≥1024px) — standart DataTable kabuğu ──────────────────
  //
  // İç yapı `components/common/datatable/DataTable.vue`'da; burada yalnız
  // medyaya özel hücre içerikleri ve mobil tipografi düzeltmesi var.
  .mtable-dt {
    :deep(.tbl-th),
    :deep(.tbl-td) {
      white-space: nowrap;
    }

    @media (max-width: media.$m-bp-md) {
      :deep(.list-pagination-info),
      :deep(.list-pagination-btn) {
        font-size: 1rem;
      }
    }
  }

  // 44×44 dokunma hedefi içinde 22px kutu — satır listesiyle aynı kalıp.
  .mcheck {
    display: grid;
    place-items: center;
    width: 1.375rem;
    height: 1.375rem;
    margin-inline: auto;
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

  .mcell__thumb {
    width: 2.25rem;
    margin-inline: auto;
    border-radius: media.$r-sm;
  }

  .mcell__name {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    min-width: 0;
    @include media.heading;

    svg {
      flex-shrink: 0;
      color: $l-text-400;

      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .mcell__name-text {
    max-width: 22rem;
    @include media.truncate;
  }

  .mcell__tag {
    flex-shrink: 0;
    @include media.chip("info");
  }

  .mcell__actions {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: media.$s-1;
  }

  .mcell__btn {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: media.$r-sm;
    background: none;
    color: $l-text-500;
    cursor: pointer;
    @include media.focus-ring;
    @include media.press(0.94);

    @include dark {
      color: $d-text-muted;
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    @include media.hoverable {
      &:hover:not(:disabled) {
        background: $l-bg-muted;
        color: $brand;

        @include dark {
          background: $d-item-hover;
        }
      }
    }
  }

  // ── Kanban (≥1024px) ─────────────────────────────────────────────
  .mkanban {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: media.$s-3;
    align-items: start;
  }

  .mkanban__col {
    min-width: 0;
    padding: media.$s-3;
    border-radius: media.$r-lg;
    @include media.surface;
  }

  .mkanban__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-2;
    margin: 0 0 media.$s-3;
    padding-bottom: media.$s-2;
    border-bottom: 2px solid;
    @include media.text("sm");
    font-weight: 620;
    @include media.heading;
  }

  .mkanban__count {
    @include media.text("xs");
    @include media.numeric;
    @include media.muted;
  }

  .mkanban__body {
    display: grid;
    gap: media.$s-2;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .mkanban__card {
    display: grid;
    grid-template-columns: 2.25rem minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-items: center;
    gap: media.$s-05 media.$s-2;
    width: 100%;
    padding: media.$s-2;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    background: none;
    text-align: start;
    cursor: pointer;
    transition: background 100ms ease-out;
    @include media.focus-ring;

    @include dark {
      border-color: $d-border;
    }

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

    &--active {
      border-color: $brand;
      background: rgb(245 184 0 / 12%);
    }
  }

  .mkanban__thumb {
    grid-row: span 2;
    width: 2.25rem;
    border-radius: media.$r-sm;
  }

  .mkanban__name {
    @include media.text("sm");
    font-weight: 550;
    @include media.heading;
    @include media.truncate;
  }

  .mkanban__meta {
    @include media.text("xs");
    @include media.numeric;
    @include media.muted;
    @include media.truncate;
  }

  .mkanban__empty {
    padding: media.$s-4 0;
    text-align: center;
    @include media.text("xs");
    @include media.muted(2);
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
