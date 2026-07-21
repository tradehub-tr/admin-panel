<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("sellerListings.title") }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">{{ t("sellerListings.subtitle") }}</p>
      </div>
      <!-- Masaüstü aksiyonları (≥768px) — mobilde kompakt şerit + FAB devralır -->
      <div class="hidden lg:flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" />
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadListings">
          <AppIcon name="refresh-cw" :size="13" />
          {{ t("sellerListings.refresh") }}
        </button>

        <!-- Tüm ürünleri şablon formatında dışa aktar (düzenle → upsert ile geri yükle) -->
        <div class="relative">
          <button
            class="hdr-btn-outlined flex items-center gap-1.5"
            @click="exportMenuOpen = !exportMenuOpen"
          >
            <AppIcon name="file-down" :size="13" />
            Dışa Aktar
            <AppIcon name="chevron-down" :size="12" />
          </button>
          <template v-if="exportMenuOpen">
            <div class="fixed inset-0 z-40" @click="exportMenuOpen = false" />
            <div
              class="absolute right-0 mt-2 z-50 w-48 rounded-xl border border-gray-200 dark:border-[#2a2a35] bg-white dark:bg-[#16161f] shadow-xl py-1"
            >
              <div class="px-3 py-1.5 text-[11px] font-semibold uppercase text-gray-400">
                Tüm ürünler — şablon
              </div>
              <button
                class="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                @click="exportAll('xlsx')"
              >
                <AppIcon name="file-down" :size="13" class="text-brand-700" />
                Excel (.xlsx)
              </button>
              <button
                class="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                @click="exportAll('csv')"
              >
                <AppIcon name="file-down" :size="13" class="text-brand-700" />
                CSV (.csv)
              </button>
            </div>
          </template>
        </div>

        <button
          data-tour="sl-add"
          class="hdr-btn-primary flex items-center gap-1.5"
          @click="goToNewListing"
        >
          <AppIcon name="plus" :size="13" />
          {{ t("sellerListings.addNew") }}
        </button>
      </div>
    </div>

    <!-- Mobil araç çubuğu (<768px): arama + filtre + ⋯ taşma menüsü (V3 kalıbı).
         Onaylı sayfa-toolbar kalıbı: kompakt tek satır, hdr-more-menu reuse. -->
    <div class="flex lg:hidden items-center gap-2 mb-3">
      <div class="relative flex-1 min-w-0">
        <AppIcon
          name="search"
          :size="13"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          v-model="mobileSearch"
          type="text"
          :placeholder="t('sellerListings.mobileSearchPlaceholder')"
          class="form-input-sm w-full !pl-9"
          @input="onMobileSearchInput"
        />
        <button
          v-if="mobileSearch"
          type="button"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          @click="clearMobileSearch"
        >
          <AppIcon name="x" :size="14" />
        </button>
      </div>
      <button
        type="button"
        class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium border flex-shrink-0 transition-colors"
        :class="
          dt.activeFilterCount.value
            ? 'bg-brand-500 text-brand-ink border-brand-500'
            : 'border-gray-200 dark:border-[#2a2a35] text-gray-600 dark:text-gray-300'
        "
        @click="filterDrawerOpen = true"
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
          class="hdr-btn-outlined sl-more-toggle"
          :title="t('common.more')"
          @click.stop="mobileMenuOpen = !mobileMenuOpen"
        >
          <AppIcon name="ellipsis" :size="15" />
        </button>
        <Transition name="dropdown">
          <div v-if="mobileMenuOpen" class="hdr-more-menu sl-more-menu" @click.stop>
            <button class="hdr-more-item" @click="loadListings(), (mobileMenuOpen = false)">
              <AppIcon name="refresh-cw" :size="14" />
              <span>{{ t("sellerListings.refresh") }}</span>
            </button>
            <button class="hdr-more-item" @click="exportAll('xlsx'), (mobileMenuOpen = false)">
              <AppIcon name="file-down" :size="14" />
              <span>Excel (.xlsx)</span>
            </button>
            <button class="hdr-more-item" @click="exportAll('csv'), (mobileMenuOpen = false)">
              <AppIcon name="file-down" :size="14" />
              <span>CSV (.csv)</span>
            </button>
            <div class="sl-more-divider"></div>
            <div class="px-2.5 py-1 text-[11px] font-semibold uppercase text-gray-400">
              {{ t("sellerListings.mobileSortTitle") }}
            </div>
            <button
              v-for="opt in SORT_OPTIONS"
              :key="opt.key"
              class="hdr-more-item"
              :class="{ active: currentSortKey === opt.key }"
              @click="setMobileSort(opt), (mobileMenuOpen = false)"
            >
              <AppIcon :name="opt.icon" :size="14" />
              <span>{{ t(opt.labelKey) }}</span>
              <AppIcon v-if="currentSortKey === opt.key" name="check" :size="13" class="ml-auto" />
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Mobil özet şerit: portföyün durum dağılımı; dokununca durum filtresi -->
    <div v-if="summaryTiles.length" class="grid grid-cols-4 gap-2 mb-3 lg:hidden">
      <button
        v-for="tile in summaryTiles"
        :key="tile.key"
        type="button"
        class="sl-sum"
        :class="[tile.tone, { on: tile.active }]"
        @click="toggleStatusFilter(tile.key)"
      >
        <b>{{ tile.count }}</b>
        <span>{{ tile.label }}</span>
      </button>
    </div>

    <!-- Bulk Import filter banner -->
    <div
      v-if="bulkJobFilter"
      class="mb-4 flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-900/60 dark:bg-brand-900/20"
    >
      <div class="flex items-center gap-2 text-brand-800 dark:text-brand-200">
        <AppIcon name="filter" :size="14" />
        <span>
          <strong>{{ bulkJobFilter }}</strong> {{ t("sellerListings.bulkFilterMid") }}
          <strong>{{ total }}</strong> {{ t("sellerListings.bulkFilterEnd") }}
        </span>
      </div>
      <button
        type="button"
        class="text-xs font-medium text-brand-800 hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-100"
        @click="clearBulkJobFilter"
      >
        {{ t("sellerListings.clearFilter") }}
      </button>
    </div>

    <!-- Birleşik filtre araç çubuğu (arama + sırala + sütunlar + filtreler + çipler) —
         tüm görünüm modlarında ortak; sütun göster/gizle yalnızca table modunda. -->
    <DataTableToolbar
      v-model:drawer="filterDrawerOpen"
      :dt="dt"
      data-tour="sl-filter"
      class="sl-dt-toolbar"
      :show-columns="viewMode === 'table'"
      search-placeholder="Ürün adı, SKU veya ilan kodunda ara…"
    />

    <div v-if="loading" class="card p-3">
      <Skeleton variant="row" :count="8" />
    </div>

    <div v-else-if="listings.length === 0" class="card text-center py-12">
      <AppIcon name="package" :size="32" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400">
        {{ hasActiveFilters ? t("sellerListings.emptyFiltered") : t("sellerListings.emptyAll") }}
      </p>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="hdr-btn-outlined mt-4"
        @click="dt.clearAll()"
      >
        {{ t("sellerListings.clearFilter") }}
      </button>
    </div>

    <!-- Mobil (<768px): veri yoğun liste — görünüm modundan bağımsız varsayılan.
         Masaüstü modları (table/list/grid/kanban) yalnız lg+ ekranlarda çizilir. -->
    <div v-else-if="!isLg" class="card p-0 overflow-hidden">
      <button
        v-for="row in mobileRows"
        :key="row.name"
        type="button"
        class="sl-mrow"
        @click="goToListing(row.name)"
      >
        <span class="sl-mdot" :style="{ background: row.dotColor }"></span>
        <img
          v-if="row.primary_image"
          :src="row.primary_image"
          alt=""
          loading="lazy"
          class="sl-mthumb"
        />
        <div v-else class="sl-mthumb sl-mthumb-empty">
          <AppIcon name="image" :size="14" class="text-gray-300" />
        </div>
        <div class="sl-mmid">
          <div class="sl-mname">{{ row.title }}</div>
          <div class="sl-msub">
            <span class="font-semibold">{{ row.seller_sku || "—" }}</span>
            <span class="sl-msep">·</span>
            <span class="truncate">{{ row.listing_code }}</span>
            <SourceBadge :bulk-job="row.created_by_bulk_job" />
          </div>
          <p v-if="row.rejectNote" class="sl-mreject">{{ row.rejectNote }}</p>
        </div>
        <div class="sl-mnum">
          <span class="sl-mprice">{{ row.priceLabel }}</span>
          <span class="sl-mstock">{{ row.stockLabel }}</span>
          <div class="sl-mbar">
            <i :class="row.barClass" :style="{ width: row.barWidth }"></i>
          </div>
        </div>
      </button>
    </div>

    <!-- Table (enterprise DataTable) -->
    <DataTable
      v-else-if="viewMode === 'table'"
      data-tour="sl-table"
      :dt="dt"
      :rows="listings"
      :total="total"
      clickable
      @row-click="goToListing($event.name)"
    >
      <template #cell-seller_sku="{ row }">
        <span class="text-[11px] font-mono font-semibold text-gray-700 dark:text-gray-300">
          {{ row.seller_sku || "—" }}
        </span>
      </template>

      <template #cell-primary_image="{ row }">
        <img
          v-if="row.primary_image"
          :src="row.primary_image"
          alt=""
          loading="lazy"
          class="w-9 h-9 rounded object-cover mx-auto border border-gray-100 dark:border-[#2a2a35]"
        />
        <div
          v-else
          class="w-9 h-9 rounded bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto"
        >
          <AppIcon name="image" :size="14" class="text-gray-300" />
        </div>
      </template>

      <template #cell-title="{ row }">
        <EditableCell
          :model-value="row.title"
          type="text"
          @commit="requestEdit(row, 'title', $event)"
        >
          <span class="font-medium text-gray-800 dark:text-gray-200 text-xs">{{ row.title }}</span>
        </EditableCell>
        <div class="flex items-center gap-1.5 mt-0.5">
          <SourceBadge :bulk-job="row.created_by_bulk_job" />
          <router-link
            v-if="(certCounts[row.name] || 0) > 0"
            :to="'/my-certifications#product'"
            class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
            :title="t('sellerListings.certEditTitle')"
            @click.stop
          >
            <AppIcon name="award" :size="10" />
            {{ certCounts[row.name] }}
          </router-link>
        </div>
      </template>

      <template #cell-selling_price="{ row }">
        <EditableCell
          :model-value="row.selling_price"
          type="number"
          align="right"
          :display="`${row.currency} ${Number(row.selling_price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`"
          @commit="requestEdit(row, 'selling_price', $event)"
        >
          <span class="text-xs font-semibold text-gray-800 dark:text-gray-200">
            {{ row.currency }}
            {{
              Number(row.selling_price || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })
            }}
          </span>
        </EditableCell>
      </template>

      <template #cell-product_category="{ row }">
        <button
          type="button"
          class="group inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-brand-800 dark:hover:text-brand-600 transition-colors max-w-full"
          title="Kategori seç"
          @click.stop="openCategoryPicker(row)"
        >
          <span class="truncate">{{ row.product_category_name || "—" }}</span>
          <AppIcon
            name="folder-tree"
            :size="11"
            class="flex-shrink-0 opacity-0 group-hover:opacity-60"
          />
        </button>
      </template>

      <template #cell-listing_code="{ row }">
        <span class="text-[11px] font-mono text-gray-500 dark:text-gray-400">{{
          row.listing_code
        }}</span>
      </template>

      <template #cell-min_order_qty="{ row }">
        <EditableCell
          :model-value="row.min_order_qty"
          type="number"
          align="center"
          @commit="requestEdit(row, 'min_order_qty', $event)"
        >
          <span class="text-xs text-gray-600 dark:text-gray-400">{{ row.min_order_qty || 0 }}</span>
        </EditableCell>
      </template>

      <template #cell-published_at="{ row }">
        <span class="text-xs text-gray-500 dark:text-gray-400">{{
          formatDate(row.published_at)
        }}</span>
      </template>

      <template #cell-modified="{ row }">
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(row.modified) }}</span>
      </template>

      <template #cell-stock_qty="{ row }">
        <div class="flex flex-col items-center">
          <EditableCell
            :model-value="row.stock_qty"
            type="number"
            align="center"
            @commit="requestEdit(row, 'stock_qty', $event)"
          >
            <span class="text-xs text-gray-700 dark:text-gray-300">{{ row.stock_qty || 0 }}</span>
          </EditableCell>
          <span class="text-[10px] text-gray-400">mevcut: {{ row.available_qty || 0 }}</span>
        </div>
      </template>

      <template #cell-completeness_score="{ row }">
        <div class="flex items-center gap-1.5 justify-center">
          <div class="w-14 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="completenessBar(row.completeness_score)"
              :style="{ width: (row.completeness_score || 0) + '%' }"
            ></div>
          </div>
          <span class="text-[10px] font-mono" :class="completenessText(row.completeness_score)">
            %{{ row.completeness_score || 0 }}
          </span>
        </div>
      </template>

      <template #cell-status="{ row }">
        <span
          class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
          :class="statusClass(row.status)"
        >
          {{ statusLabel(row.status) }}
        </span>
        <!-- KYB onaylanmadan satıcının Active listing'i sitede görünür ama
             sipariş alınamaz; bunu göstermek için ek rozet. -->
        <div
          v-if="row.status === 'Active' && !auth.isVerifiedSeller"
          class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          :title="t('sellerListings.orderWaitingTitle')"
        >
          <AppIcon name="lock" :size="11" />
          {{ t("sellerListings.orderWaiting") }}
        </div>
      </template>

      <template #cell-action="{ row }">
        <div class="flex items-center justify-center gap-1.5">
          <!-- Onaylanmamış: değişiklik yapılamaz -->
          <div v-if="!isApproved(row.status)" class="min-w-0">
            <span class="text-xs text-gray-400 italic">
              {{
                row.status === "Pending"
                  ? t("sellerListings.awaitingApproval")
                  : t("sellerListings.rejected")
              }}
            </span>
            <p
              v-if="row.status === 'Rejected' && row.rejection_reason"
              class="text-[10px] text-red-400 mt-1 max-w-[180px] leading-snug"
            >
              {{ row.rejection_reason }}
            </p>
          </div>
          <!-- Onaylanmış: durum değiştirme -->
          <div v-else class="flex items-center gap-1">
            <select
              :value="row.status"
              :disabled="changingId === row.name || !auth.can('listing.publish')"
              :title="!auth.can('listing.publish') ? t('sellerListings.noPermission') : ''"
              class="text-xs border border-gray-200 dark:border-[#2a2a35] rounded-lg px-2 py-1 bg-white dark:bg-[#16161f] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-60"
              @click.stop
              @change="changeStatus(row, $event.target.value)"
            >
              <option value="Active">{{ t("sellerListings.optActive") }}</option>
              <option value="Paused">{{ t("sellerListings.optPaused") }}</option>
              <option value="Out of Stock">{{ t("sellerListings.optOutOfStock") }}</option>
            </select>
            <AppIcon
              v-if="changingId === row.name"
              name="loader"
              :size="13"
              class="animate-spin text-brand-700"
            />
          </div>
          <!-- Sil (her durumda; akıllı silme: bağlı kayıt varsa arşivler) -->
          <button
            type="button"
            class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :disabled="deletingId === row.name || !auth.can('listing.delete')"
            :title="
              auth.can('listing.delete')
                ? t('sellerListings.delete')
                : t('sellerListings.noPermission')
            "
            @click.stop="askDeleteListing(row)"
          >
            <AppIcon
              v-if="deletingId === row.name"
              name="loader"
              :size="14"
              class="animate-spin"
            />
            <AppIcon v-else name="trash-2" :size="14" />
          </button>
        </div>
      </template>
    </DataTable>

    <!-- List (compact) -->
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="listing in listings"
        :key="listing.name"
        class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-[#2a2a35] last:border-0 hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors cursor-pointer"
        @click="goToListing(listing.name)"
      >
        <!-- Fotoğraf -->
        <img
          v-if="listing.primary_image"
          :src="listing.primary_image"
          alt=""
          loading="lazy"
          class="w-10 h-10 rounded object-cover flex-shrink-0 border border-gray-100 dark:border-[#2a2a35]"
        />
        <div
          v-else
          class="w-10 h-10 rounded bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0"
        >
          <AppIcon name="image" :size="15" class="text-gray-300" />
        </div>

        <!-- Ad + kodlar -->
        <div class="flex-1 min-w-0">
          <div class="font-medium text-[13px] text-gray-800 dark:text-gray-200 truncate">
            {{ listing.title }}
          </div>
          <div class="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 font-mono">
            <span class="font-semibold text-gray-500 dark:text-gray-400">{{
              listing.seller_sku || "—"
            }}</span>
            <span class="text-gray-300 dark:text-gray-600">·</span>
            <span class="truncate">{{ listing.listing_code }}</span>
            <SourceBadge :bulk-job="listing.created_by_bulk_job" />
          </div>
        </div>

        <!-- Fiyat + stok -->
        <div class="hidden sm:flex flex-col items-end flex-shrink-0 w-28">
          <span class="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
            {{ listing.currency }}
            {{
              Number(listing.selling_price || 0).toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })
            }}
          </span>
          <span class="text-[11px] text-gray-400">
            Stok: {{ listing.available_qty || 0 }} / {{ listing.stock_qty || 0 }}
          </span>
        </div>

        <!-- Tamamlanma -->
        <div class="hidden md:flex items-center gap-1.5 flex-shrink-0 w-24">
          <div class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full"
              :class="completenessBar(listing.completeness_score)"
              :style="{ width: (listing.completeness_score || 0) + '%' }"
            ></div>
          </div>
          <span class="text-[10px] font-mono" :class="completenessText(listing.completeness_score)">
            %{{ listing.completeness_score || 0 }}
          </span>
        </div>

        <!-- Durum -->
        <span
          class="inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-medium rounded-full flex-shrink-0 w-24"
          :class="statusClass(listing.status)"
        >
          {{ statusLabel(listing.status) }}
        </span>
      </div>
    </div>

    <!-- Grid (cards) -->
    <div v-else-if="viewMode === 'grid'" class="list-grid">
      <div
        v-for="listing in listings"
        :key="listing.name"
        class="list-grid-card cursor-pointer"
        @click="goToListing(listing.name)"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <span class="list-grid-card-title">{{ listing.title }}</span>
          <span
            class="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0"
            :class="statusClass(listing.status)"
            >{{ statusLabel(listing.status) }}</span
          >
        </div>
        <div
          class="text-[11px] text-gray-700 dark:text-gray-300 font-mono font-semibold mb-0.5 flex items-center gap-1.5"
        >
          <span v-if="listing.seller_sku">{{ listing.seller_sku }}</span>
          <span v-else class="text-gray-400 font-normal italic">{{
            t("sellerListings.noSku")
          }}</span>
          <SourceBadge :bulk-job="listing.created_by_bulk_job" />
        </div>
        <div class="text-[10px] text-gray-400 font-mono mb-2">{{ listing.listing_code }}</div>
        <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {{ listing.currency }}
          {{
            Number(listing.selling_price || 0).toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })
          }}
        </div>
        <div class="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
          {{ t("sellerListings.stockLabel") }} {{ listing.available_qty || 0 }} /
          {{ listing.stock_qty || 0 }}
        </div>
        <div class="flex items-center gap-1.5 mb-2">
          <div class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="completenessBar(listing.completeness_score)"
              :style="{ width: (listing.completeness_score || 0) + '%' }"
            ></div>
          </div>
          <span class="text-[10px] font-mono" :class="completenessText(listing.completeness_score)">
            %{{ listing.completeness_score || 0 }}
          </span>
        </div>
        <p
          v-if="listing.status === 'Rejected' && listing.rejection_reason"
          class="text-[10px] text-red-400 leading-snug mt-2"
        >
          {{ listing.rejection_reason }}
        </p>
      </div>
    </div>

    <!-- Kanban (by status) -->
    <div v-else-if="viewMode === 'kanban'" class="list-kanban">
      <div v-for="col in kanbanColumns" :key="col.key" class="kanban-col">
        <div class="kanban-col-header" :style="{ borderColor: col.color }">
          <span>{{ col.label }}</span>
          <span class="kanban-col-count">{{ col.items.length }}</span>
        </div>
        <div class="kanban-col-body">
          <div
            v-for="listing in col.items"
            :key="listing.name"
            class="kanban-card"
            @click="goToListing(listing.name)"
          >
            <div class="kanban-card-title truncate">{{ listing.title }}</div>
            <div
              class="text-[11px] text-gray-700 dark:text-gray-300 font-mono font-semibold mb-0.5 truncate"
            >
              <span v-if="listing.seller_sku">{{ listing.seller_sku }}</span>
              <span v-else class="text-gray-400 font-normal italic">—</span>
            </div>
            <div class="text-[10px] text-gray-400 dark:text-gray-500 font-mono mb-1 truncate">
              {{ listing.listing_code }}
            </div>
            <div class="kanban-card-meta justify-between">
              <span class="font-semibold text-gray-700 dark:text-gray-300">
                {{ listing.currency }}
                {{ Number(listing.selling_price || 0).toLocaleString("tr-TR") }}
              </span>
              <span>%{{ listing.completeness_score || 0 }}</span>
            </div>
          </div>
          <div
            v-if="col.items.length === 0"
            class="text-center py-6 text-xs text-gray-400 dark:text-gray-500"
          >
            {{ t("sellerListings.noRecords") }}
          </div>
        </div>
      </div>
    </div>

    <!-- Sayfalama (table dışı modlar + mobil liste; table kendi pagination'ını içerir) -->
    <ListPagination
      v-if="!loading && listings.length && (viewMode !== 'table' || !isLg)"
      class="mt-4"
      :model-value="dt.page.value"
      :total="total"
      :page-size="dt.pageSize.value"
      :page-size-options="[10, 20, 50, 100]"
      @update:model-value="dt.setPage($event)"
      @update:page-size="dt.setPageSize($event)"
    />

    <!-- Inline düzenleme onay popup'ı -->
    <Teleport to="body">
      <div v-if="editConfirm" class="fixed inset-0 z-[85] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="savingEdit || (editConfirm = null)" />
        <div class="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#16161f] shadow-2xl p-5">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {{ editConfirm.label }} değiştirilsin mi?
          </h3>
          <div class="flex items-center gap-2 flex-wrap text-sm mb-5">
            <span class="line-through text-gray-400">{{ editConfirm.oldLabel }}</span>
            <AppIcon name="arrow-right" :size="14" class="text-gray-400" />
            <span class="font-semibold text-brand-800">{{ editConfirm.newLabel }}</span>
          </div>
          <div class="flex justify-end gap-2">
            <button class="hdr-btn-outlined" :disabled="savingEdit" @click="editConfirm = null">
              İptal
            </button>
            <button
              class="hdr-btn-primary flex items-center gap-1.5"
              :disabled="savingEdit"
              @click="applyEdit"
            >
              <AppIcon v-if="savingEdit" name="loader" :size="13" class="animate-spin" />
              Onayla
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <CategoryTreePicker v-model:open="categoryPickerOpen" @select="onCategorySelected" />

    <!-- Ürün silme onayı -->
    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="confirmConfig.title"
      :message="confirmConfig.message"
      :confirm-label="confirmConfig.confirmLabel"
      :cancel-label="confirmConfig.cancelLabel"
      :tone="confirmConfig.tone"
      @confirm="onConfirmYes"
      @cancel="onConfirmNo"
    />

    <!-- Mobil FAB: "Yeni Ekle" tab bar'ın üstünde her zaman parmak menzilinde -->
    <button type="button" class="sl-fab lg:hidden" @click="goToNewListing">
      <AppIcon name="plus" :size="16" />
      {{ t("sellerListings.addNew") }}
    </button>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { useToast } from "@/composables/useToast";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { useDataTable } from "@/composables/useDataTable";
  import { downloadFile } from "@/utils/downloadFile";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import ListPagination from "@/components/common/ListPagination.vue";
  import SourceBadge from "@/components/common/SourceBadge.vue";
  import DataTable from "@/components/common/datatable/DataTable.vue";
  import DataTableToolbar from "@/components/common/datatable/DataTableToolbar.vue";
  import EditableCell from "@/components/common/datatable/EditableCell.vue";
  import CategoryTreePicker from "@/components/common/datatable/CategoryTreePicker.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import { useAuthStore } from "@/stores/auth";
  import { usePageTour } from "@/composables/usePageTour";

  const auth = useAuthStore();
  const { t } = useI18n();

  // Sayfa-içi onboarding: filtreler → tablo → yeni ilan ekleme.
  usePageTour("seller-listings", () => [
    {
      target: '[data-tour="sl-table"]',
      title: t("tourSteps.page.slTable_t"),
      desc: t("tourSteps.page.slTable_d"),
    },
    {
      target: '[data-tour="sl-filter"]',
      title: t("tourSteps.page.slFilter_t"),
      desc: t("tourSteps.page.slFilter_d"),
    },
    {
      target: '[data-tour="sl-add"]',
      title: t("tourSteps.page.slAdd_t"),
      desc: t("tourSteps.page.slAdd_d"),
    },
  ]);

  const router = useRouter();
  const route = useRoute();
  const toast = useToast();
  // Bulk Import detail sayfasından gelen filtre — yalnızca bu job'tan eklenen
  // ürünleri göster. Banner template'te bu computed üzerinden çizilir.
  const bulkJobFilter = computed(() => route.query.bulk_job || null);
  const listings = ref([]);
  const loading = ref(false);
  const total = ref(0);
  const changingId = ref(null);
  const certCounts = ref({});

  const { viewMode } = useListViewMode("seller-listings");

  // ── Mobil (<768px) — V3 "veri yoğun liste": görünüm modu ne olursa olsun
  // mobilde tek kompakt liste çizilir; masaüstü modları lg+ ekranlara kalır.
  const { isLg } = useBreakpoint();
  const filterDrawerOpen = ref(false);
  const mobileMenuOpen = ref(false);
  const statusCounts = ref({});

  // Kompakt şeritteki arama — DataTableToolbar'daki ile aynı debounce deseni;
  // iki input da dt.search'ü yazar, watch ile senkron kalırlar.
  const mobileSearch = ref("");
  let mobileSearchTimer = null;
  // dt.search → mobileSearch senkron watch'ı `dt` tanımlandıktan SONRA kurulur
  // (aşağıda). Burada kurulursa setup'ta TDZ hatası olur:
  // "Cannot access 'dt' before initialization" → tüm sayfa boş kalır.
  function onMobileSearchInput() {
    clearTimeout(mobileSearchTimer);
    mobileSearchTimer = setTimeout(() => dt.setSearch(mobileSearch.value), 300);
  }
  function clearMobileSearch() {
    mobileSearch.value = "";
    dt.setSearch("");
  }

  // ⋯ menüsündeki sıralama kısayolları — tablo başlığı mobilde olmadığından.
  const SORT_OPTIONS = [
    {
      key: "newest",
      labelKey: "sellerListings.sortNewest",
      icon: "clock",
      sort: [{ field: "creation", desc: true }],
    },
    {
      key: "priceAsc",
      labelKey: "sellerListings.sortPriceAsc",
      icon: "arrow-up",
      sort: [{ field: "selling_price", desc: false }],
    },
    {
      key: "priceDesc",
      labelKey: "sellerListings.sortPriceDesc",
      icon: "arrow-down",
      sort: [{ field: "selling_price", desc: true }],
    },
    {
      key: "stockDesc",
      labelKey: "sellerListings.sortStockDesc",
      icon: "package",
      sort: [{ field: "stock_qty", desc: true }],
    },
  ];
  const currentSortKey = computed(() => {
    const s = dt.sorting.value[0];
    if (!s) return "newest";
    const match = SORT_OPTIONS.find(
      (o) => o.sort[0].field === s.field && o.sort[0].desc === s.desc
    );
    return match?.key || "";
  });
  function setMobileSort(opt) {
    dt.setSort(opt.sort.map((x) => ({ ...x })));
  }

  // Özet şerit: portföyün durum dağılımı; dokununca ilgili durum filtrelenir.
  const SUMMARY_STATUSES = [
    { key: "Active", labelKey: "sellerListings.kanbanActive", tone: "sl-sum-g" },
    { key: "Pending", labelKey: "sellerListings.kanbanPending", tone: "sl-sum-w" },
    { key: "Rejected", labelKey: "sellerListings.kanbanRejected", tone: "sl-sum-r" },
    { key: "Draft", labelKey: "sellerListings.kanbanDraft", tone: "sl-sum-n" },
  ];
  const summaryTiles = computed(() => {
    if (!Object.keys(statusCounts.value).length) return [];
    const active = dt.filters.status || [];
    return SUMMARY_STATUSES.map((s) => ({
      key: s.key,
      label: t(s.labelKey),
      count: statusCounts.value[s.key] || 0,
      tone: s.tone,
      active: active.length === 1 && active[0] === s.key,
    }));
  });
  function toggleStatusFilter(key) {
    const cur = dt.filters.status || [];
    dt.setFilter("status", cur.length === 1 && cur[0] === key ? [] : [key]);
  }

  // Mobil satırlar önceden formatlanır — template'te her render'da fonksiyon
  // çağrılmasın (20 satır × re-render maliyeti).
  const mobileRows = computed(() =>
    listings.value.map((l) => {
      const stock = Number(l.stock_qty || 0);
      const avail = Number(l.available_qty || 0);
      const pct = stock > 0 ? Math.min(100, Math.round((avail / stock) * 100)) : 0;
      return {
        ...l,
        dotColor: KANBAN_STATUS_META[l.status]?.color || "#9ca3af",
        priceLabel: `${l.currency} ${Number(l.selling_price || 0).toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
        })}`,
        stockLabel: `${avail}/${stock}`,
        // Stok tükendiyse çubuk tam genişlik kırmızı — boş çubuk "veri yok" okunur.
        barWidth: (avail === 0 ? 100 : pct) + "%",
        barClass: avail === 0 ? "sl-bar-zero" : pct < 50 ? "sl-bar-low" : "sl-bar-ok",
        rejectNote: l.status === "Rejected" ? l.rejection_reason || "" : "",
      };
    })
  );

  // ── Enterprise tablo şeması ───────────────────────────────────
  // key alanları backend Listing field adlarıyla eşleşir (sort/filter doğrudan
  // server-side'a map'lenir). "source" görünür sütun değil; sadece filtre.
  const STATUS_OPTIONS = [
    { value: "Active", label: t("sellerListings.filterActive"), dot: "bg-emerald-400" },
    { value: "Out of Stock", label: t("sellerListings.filterOutOfStock"), dot: "bg-amber-400" },
    { value: "Pending", label: t("sellerListings.filterPending"), dot: "bg-blue-400" },
    { value: "Paused", label: t("sellerListings.filterPaused"), dot: "bg-gray-400" },
    { value: "Draft", label: t("sellerListings.filterDraft"), dot: "bg-slate-400" },
    { value: "Rejected", label: t("sellerListings.filterRejected"), dot: "bg-red-400" },
  ];
  // Kategori filtre seçenekleri — satıcının fiilen ürün yüklediği kategoriler
  // (backend'den onMounted'te doldurulur). Getter ile reaktif okunur.
  const categoryOptions = ref([]);

  const LISTING_FIELDS = [
    { key: "seller_sku", label: "Ürünün Ana Kodu", align: "left", minWidth: 110 },
    { key: "primary_image", label: "Fotoğraf", align: "center" },
    {
      key: "title",
      label: "Ürün Adı",
      align: "left",
      sortable: true,
      hideable: false,
      minWidth: 220,
      filter: { variant: "text" },
    },
    {
      key: "status",
      label: t("sellerListings.colStatus"),
      align: "center",
      sortable: true,
      filter: { variant: "select", options: STATUS_OPTIONS },
    },
    {
      key: "selling_price",
      label: t("sellerListings.colPrice"),
      align: "right",
      sortable: true,
      filter: { variant: "range" },
    },
    {
      key: "product_category",
      sortKey: "product_category_name",
      label: "Kategori",
      align: "left",
      sortable: true,
      filter: {
        variant: "select",
        get options() {
          return categoryOptions.value;
        },
      },
    },
    {
      key: "listing_code",
      label: "İlan Kodu",
      align: "left",
      sortable: true,
      filter: { variant: "text" },
    },
    {
      key: "min_order_qty",
      label: "MOQ",
      align: "center",
      sortable: true,
      filter: { variant: "range" },
    },
    {
      key: "stock_qty",
      label: t("sellerListings.colStock"),
      align: "center",
      sortable: true,
      filter: { variant: "range" },
    },
    {
      key: "completeness_score",
      label: t("sellerListings.colCompleteness"),
      align: "center",
      sortable: true,
      filter: { variant: "range" },
    },
    {
      key: "published_at",
      label: "Yayın Tarihi",
      align: "left",
      sortable: true,
      defaultHidden: true,
      filter: { variant: "date" },
    },
    {
      key: "modified",
      label: "Değiştirme Tarihi",
      align: "left",
      sortable: true,
      defaultHidden: true,
      filter: { variant: "date" },
    },
    {
      key: "source",
      label: t("sellerListings.sourceLabel"),
      column: false,
      filter: {
        variant: "select",
        options: [
          { value: "feed", label: t("sellerListings.sourceFeed") },
          { value: "manual", label: t("sellerListings.sourceManual") },
        ],
      },
    },
    { key: "action", label: t("sellerListings.colAction"), align: "center", hideable: false },
  ];

  const dt = useDataTable(LISTING_FIELDS, {
    pageSize: 20,
    defaultSort: [{ field: "creation", desc: true }],
  });

  // Kompakt mobil arama ↔ dt.search senkronu — `dt` yukarıda kurulduktan sonra
  // (yukarıdaki mobileSearch bloğunda TDZ'yi önlemek için buraya taşındı).
  watch(
    () => dt.search.value,
    (v) => {
      if (v !== mobileSearch.value) mobileSearch.value = v;
    }
  );

  // Sayfa numarasını URL'den geri yükle: ürün düzenleyip "Geri" ile dönünce
  // (returnTo=route.fullPath) en son bulunulan sayfaya dönülür.
  if (route.query.page) dt.setPage(Number(route.query.page) || 1);

  const hasActiveFilters = computed(
    () => dt.activeFilterCount.value > 0 || dt.search.value.trim() !== ""
  );

  // dt state + bulk job → backend parametreleri. status çoklu (virgül), source
  // tek değer (iki seçili = filtre yok), sort JSON çoklu-sıralama payload'ı.
  const queryParams = computed(() => {
    const f = dt.filters;
    return {
      page: dt.page.value,
      page_size: dt.pageSize.value,
      search: dt.search.value.trim() || undefined,
      sort: dt.sorting.value.length ? JSON.stringify(dt.sorting.value) : undefined,
      title: f.title?.trim() || undefined,
      listing_code: f.listing_code?.trim() || undefined,
      status: f.status?.length ? f.status.join(",") : undefined,
      product_category: f.product_category?.length ? f.product_category.join(",") : undefined,
      source: f.source?.length === 1 ? f.source[0] : undefined,
      price_min: f.selling_price?.min ?? undefined,
      price_max: f.selling_price?.max ?? undefined,
      stock_min: f.stock_qty?.min ?? undefined,
      stock_max: f.stock_qty?.max ?? undefined,
      completeness_min: f.completeness_score?.min ?? undefined,
      completeness_max: f.completeness_score?.max ?? undefined,
      moq_min: f.min_order_qty?.min ?? undefined,
      moq_max: f.min_order_qty?.max ?? undefined,
      published_from: f.published_at?.from || undefined,
      published_to: f.published_at?.to || undefined,
      modified_from: f.modified?.from || undefined,
      modified_to: f.modified?.to || undefined,
      bulk_job: bulkJobFilter.value || undefined,
    };
  });

  const KANBAN_STATUS_META = {
    Draft: { label: () => t("sellerListings.kanbanDraft"), color: "#94a3b8" },
    Pending: { label: () => t("sellerListings.kanbanPending"), color: "#3b82f6" },
    Active: { label: () => t("sellerListings.kanbanActive"), color: "#10b981" },
    Paused: { label: () => t("sellerListings.kanbanPaused"), color: "#f59e0b" },
    "Out of Stock": { label: () => t("sellerListings.kanbanOutOfStock"), color: "#ef4444" },
    Archived: { label: () => t("sellerListings.kanbanArchived"), color: "#6b7280" },
    Rejected: { label: () => t("sellerListings.kanbanRejected"), color: "#dc2626" },
  };

  const KANBAN_STATUS_ORDER = [
    "Pending",
    "Active",
    "Paused",
    "Out of Stock",
    "Draft",
    "Rejected",
    "Archived",
  ];

  const kanbanColumns = computed(() => {
    const groups = new Map();
    for (const l of listings.value) {
      const k = l.status || "Draft";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(l);
    }
    return KANBAN_STATUS_ORDER.filter((s) => groups.has(s)).map((s) => ({
      key: s,
      label: KANBAN_STATUS_META[s]?.label() || s,
      color: KANBAN_STATUS_META[s]?.color || "#9ca3af",
      items: groups.get(s),
    }));
  });

  const APPROVED_STATUSES = new Set(["Active", "Paused", "Out of Stock"]);

  function isApproved(status) {
    return APPROVED_STATUSES.has(status);
  }

  function statusLabel(status) {
    const map = {
      Pending: t("sellerListings.kanbanPending"),
      Draft: t("sellerListings.kanbanDraft"),
      Active: t("sellerListings.kanbanActive"),
      Paused: t("sellerListings.kanbanPaused"),
      "Out of Stock": t("sellerListings.kanbanOutOfStock"),
      Archived: t("sellerListings.kanbanArchived"),
      Rejected: t("sellerListings.kanbanRejected"),
    };
    return map[status] || status;
  }

  function statusClass(status) {
    const map = {
      Pending: "bg-amber-50 text-amber-700 border border-amber-200",
      Draft: "bg-gray-100 text-gray-600 border border-gray-200",
      Active: "bg-green-50 text-green-700 border border-green-200",
      Paused: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      "Out of Stock": "bg-red-50 text-red-600 border border-red-200",
      Archived: "bg-gray-100 text-gray-500 border border-gray-200",
      Rejected: "bg-red-50 text-red-700 border border-red-200",
    };
    return map[status] || "bg-gray-100 text-gray-500";
  }

  function completenessBar(score) {
    return score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  }
  function completenessText(score) {
    return score >= 80
      ? "text-green-600 dark:text-green-400"
      : score >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-500 dark:text-red-400";
  }

  // Frappe datetime ("2024-01-01 12:00:00") → tr-TR tarih; boş → tire.
  function formatDate(val) {
    if (!val) return "—";
    const d = new Date(String(val).replace(" ", "T"));
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("tr-TR");
  }

  async function loadCategoryOptions() {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.listing.get_seller_listing_categories"
      );
      categoryOptions.value = res?.message?.categories || [];
    } catch {
      categoryOptions.value = [];
    }
  }

  // ── Inline düzenleme + onay popup ───────────────────────────────────────
  const FIELD_LABELS = {
    title: "Ürün Adı",
    selling_price: "Fiyat",
    stock_qty: "Stok",
    min_order_qty: "MOQ",
    product_category: "Kategori",
  };
  const editConfirm = ref(null); // { row, field, newValue, label, oldLabel, newLabel }
  const savingEdit = ref(false);

  function fmtVal(field, val, row) {
    if (field === "selling_price")
      return `${row.currency || ""} ${Number(val || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
    return String(val ?? "—");
  }

  function requestEdit(row, field, newValue) {
    editConfirm.value = {
      row,
      field,
      newValue,
      label: FIELD_LABELS[field] || field,
      oldLabel: fmtVal(field, row[field], row),
      newLabel: fmtVal(field, newValue, row),
    };
  }

  async function applyEdit() {
    if (!editConfirm.value || savingEdit.value) return;
    const { row, field, newValue } = editConfirm.value;
    savingEdit.value = true;
    try {
      const res = await api.callMethod(
        "tradehub_core.api.listing.update_listing_field",
        { listing_name: row.name, fieldname: field, value: newValue },
        true
      );
      Object.assign(row, res.message?.listing || {});
      toast.success(t("sellerListings.statusUpdated"));
      editConfirm.value = null;
    } catch (err) {
      toast.error(err.message || t("sellerListings.statusUpdateFailed"));
    } finally {
      savingEdit.value = false;
    }
  }

  // ── Kategori ağaç seçici ─────────────────────────────────────────────────
  const categoryPickerOpen = ref(false);
  const categoryPickerRow = ref(null);
  function openCategoryPicker(row) {
    categoryPickerRow.value = row;
    categoryPickerOpen.value = true;
  }
  function onCategorySelected(sel) {
    const row = categoryPickerRow.value;
    if (!row || sel.name === row.product_category) return;
    editConfirm.value = {
      row,
      field: "product_category",
      newValue: sel.name,
      label: "Kategori",
      oldLabel: row.product_category_name || "—",
      newLabel: sel.category_name,
    };
  }

  async function loadListings() {
    loading.value = true;
    try {
      const res = await api.callMethod(
        "tradehub_core.api.listing.get_seller_listings",
        queryParams.value
      );
      listings.value = res.message?.listings || [];
      total.value = res.message?.total || 0;
      statusCounts.value = res.message?.status_counts || {};
      await loadCertCounts();
    } catch (err) {
      toast.error(err.message || t("sellerListings.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function loadCertCounts() {
    try {
      const names = listings.value.map((l) => l.name);
      if (!names.length) {
        certCounts.value = {};
        return;
      }
      // Sertifikalarım matrisini sayfa bazlı çek — her ürünün cert sayısı için
      const res = await api.callMethodGET(
        "tradehub_core.api.seller_certifications.get_listing_cert_matrix",
        { page: 1, page_size: 500 }
      );
      const items = res?.message?.listings || [];
      const counts = {};
      for (const it of items) {
        counts[it.name] = (it.certs || []).length;
      }
      certCounts.value = counts;
    } catch {
      certCounts.value = {};
    }
  }

  async function changeStatus(listing, newStatus) {
    if (newStatus === listing.status) return;
    changingId.value = listing.name;
    try {
      await api.callMethod(
        "tradehub_core.api.listing.update_listing_status",
        {
          listing_name: listing.name,
          status: newStatus,
        },
        true
      );
      listing.status = newStatus;
      toast.success(t("sellerListings.statusUpdated"));
    } catch (err) {
      toast.error(err.message || t("sellerListings.statusUpdateFailed"));
    } finally {
      changingId.value = null;
    }
  }

  // ── Ürün silme ────────────────────────────────────────────────
  // Promise tabanlı ConfirmDialog köprüsü (MyCertifications deseni).
  const deletingId = ref(null);
  const confirmOpen = ref(false);
  const confirmConfig = ref({});
  let confirmResolver = null;
  function askConfirm(config) {
    return new Promise((resolve) => {
      confirmConfig.value = { tone: "primary", ...config };
      confirmOpen.value = true;
      confirmResolver = resolve;
    });
  }
  function onConfirmYes() {
    confirmResolver?.(true);
    confirmResolver = null;
  }
  function onConfirmNo() {
    confirmResolver?.(false);
    confirmResolver = null;
  }

  async function askDeleteListing(row) {
    if (!auth.can("listing.delete")) {
      toast.error(t("sellerListings.noPermission"));
      return;
    }
    const ok = await askConfirm({
      title: t("sellerListings.deleteTitle"),
      message: t("sellerListings.deleteMessage", { title: row.title }),
      confirmLabel: t("sellerListings.deleteConfirm"),
      cancelLabel: t("sellerListings.deleteCancel"),
      tone: "danger",
    });
    if (!ok) return;
    deletingId.value = row.name;
    try {
      // Akıllı silme: backend bağlı kayıt yoksa kalıcı siler ("deleted"),
      // varsa arşivler ("archived"). İki durumu ayrı toast ile bildir.
      const res = await api.callMethod("tradehub_core.api.listing.delete_listing", {
        listing_name: row.name,
      });
      toast.success(
        res.message?.action === "archived"
          ? t("sellerListings.archived")
          : t("sellerListings.deleted")
      );
      await loadListings();
    } catch (err) {
      toast.error(err.message || t("sellerListings.deleteFailed"));
    } finally {
      deletingId.value = null;
    }
  }

  function goToNewListing() {
    router.push({ path: "/app/Listing/new", query: { returnTo: "/seller-listings" } });
  }

  // Tüm ürünleri şablon formatında dışa aktar (filtresiz). Hata olursa (kayıt
  // yok vb.) toast gösterir — sunucu hata sayfasına atmaz.
  const exportMenuOpen = ref(false);
  async function exportAll(format) {
    exportMenuOpen.value = false;
    try {
      await downloadFile(
        `/api/method/tradehub_core.bulk_import.export.export_seller_listings?format=${format}`
      );
    } catch (err) {
      toast.error(err.message);
    }
  }

  function goToListing(name) {
    router.push({
      path: `/app/Listing/${encodeURIComponent(name)}`,
      // route.fullPath mevcut sayfa (?page=N) + filtreleri taşır; "Geri"/kaydet
      // sonrası kullanıcı tam bulunduğu sayfaya döner.
      query: { returnTo: route.fullPath },
    });
  }

  // Bulk job filtresini kaldır — route.query temizlenir, queryParams değişir,
  // aşağıdaki watch yeniden yükler.
  function clearBulkJobFilter() {
    const q = { ...route.query };
    delete q.bulk_job;
    router.replace({ query: q });
  }

  // Filtre / arama / sıralama / sayfa değişiminde server-side yeniden yükle.
  // queryParams her değişimde yeni nesne döndüğünden watch güvenle tetiklenir.
  watch(queryParams, loadListings);

  // Sayfa değişimini URL'e yansıt (page>1 ise ?page=N). Böylece route.fullPath
  // güncel kalır ve returnTo doğru sayfayı taşır. route.query.page queryParams'a
  // dahil olmadığından bu replace ek bir loadListings tetiklemez.
  watch(
    () => dt.page.value,
    (val) => {
      const q = { ...route.query };
      if (val > 1) q.page = String(val);
      else delete q.page;
      router.replace({ query: q });
    }
  );

  // Query parametresi değişirse listeyi yeniden yükle (banner toggling dahil) —
  // bulk_job zaten queryParams'a dahil olduğundan watch yukarıdaki ile birleşir.
  onMounted(() => {
    loadCategoryOptions();
    loadListings();
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  // ── Mobil V3 kalıbı (<768px). Masaüstünde bu sınıfların hiçbiri çizilmez
  // (isLg / lg:hidden), media query yalnız toolbar gizleme için gerekli.

  // DataTableToolbar'ın arama kartı mobilde gizlenir (kompakt şerit devralır);
  // aktif filtre çipleri + drawer (Teleport) çalışmaya devam eder.
  @media (max-width: 767px) {
    .sl-dt-toolbar :deep(.card) {
      display: none;
    }
  }

  .sl-more-toggle {
    padding: 0 9px; // yalnız ikon — kare görünüm
    height: 34px;
  }
  .sl-more-menu {
    width: 200px;
  }
  .sl-more-divider {
    height: 1px;
    margin: 4px 6px;
    background: $l-border;
    @include dark {
      background: $d-border;
    }
  }

  // Özet şerit karoları
  .sl-sum {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 8px 4px;
    border-radius: 12px;
    border: 1px solid $l-border;
    background: $l-bg;
    transition: border-color $t-fast;
    b {
      font-size: 16px;
      font-weight: 800;
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
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
    &.on {
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
  .sl-sum-g b {
    color: $c-success;
  }
  .sl-sum-w b {
    color: $c-warning;
  }
  .sl-sum-r b {
    color: $c-error;
  }
  html.dark .sl-sum-g b {
    color: $c-success;
  }
  html.dark .sl-sum-w b {
    color: $c-warning;
  }
  html.dark .sl-sum-r b {
    color: $c-error;
  }

  // Veri yoğun satır
  .sl-mrow {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: start;
    padding: 11px 12px;
    background: transparent;
    border: none;
    border-bottom: 1px solid $l-border;
    font-family: inherit;
    cursor: pointer;
    &:last-child {
      border-bottom: none;
    }
    @include dark {
      border-color: $d-border-inner;
    }
  }
  .sl-mdot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .sl-mthumb {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: 9px;
    object-fit: cover;
    border: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
  }
  .sl-mthumb-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    background: $l-bg-muted;
    @include dark {
      background: rgba(255, 255, 255, 0.05);
    }
  }
  .sl-mmid {
    flex: 1;
    min-width: 0;
  }
  .sl-mname {
    font-size: 12.5px;
    font-weight: 600;
    color: $l-text-700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    @include dark {
      color: $d-text-hi;
    }
  }
  .sl-msub {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 1px;
    font-size: 10.5px;
    font-family: "JetBrains Mono", monospace;
    color: $l-text-400;
    white-space: nowrap;
    overflow: hidden;
    @include dark {
      color: $d-text-muted;
    }
  }
  .sl-msep {
    color: $l-border-alt;
  }
  .sl-mreject {
    margin-top: 3px;
    font-size: 10.5px;
    line-height: 1.35;
    color: $c-error;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .sl-mnum {
    flex-shrink: 0;
    width: 92px;
    text-align: end;
  }
  .sl-mprice {
    display: block;
    font-size: 12.5px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: $l-text-900;
    @include dark {
      color: $d-text-hi;
    }
  }
  .sl-mstock {
    display: block;
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
    color: $l-text-400;
    @include dark {
      color: $d-text-muted;
    }
  }
  .sl-mbar {
    margin-top: 4px;
    height: 3px;
    border-radius: 2px;
    background: $l-bg-muted;
    overflow: hidden;
    @include dark {
      background: rgba(255, 255, 255, 0.08);
    }
    i {
      display: block;
      height: 100%;
      border-radius: 2px;
    }
  }
  .sl-bar-ok {
    background: $c-success;
  }
  .sl-bar-low {
    background: $c-warning;
  }
  .sl-bar-zero {
    background: $c-error;
  }

  // Yeni Ekle FAB — MobileTabBar (64px) + safe area üstünde
  .sl-fab {
    position: fixed;
    right: 16px;
    bottom: calc(64px + env(safe-area-inset-bottom) + 16px);
    z-index: 40;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 12px 18px;
    border: none;
    border-radius: 999px;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 700;
    // Sarı zemin üzerinde beyaz yasak (variables.scss) — $brand-ink kontrast çapası
    color: $brand-ink;
    background: $brand;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
    cursor: pointer;
  }

  // Yalnızca mobil FAB'ı: masaüstünde (lg+) gizle. Buton `lg:hidden` taşıyor ama
  // scoped stilin [data-v] eki `.sl-fab` specificity'sini artırıp Tailwind'in
  // hidden'ını eziyor → FAB desktop'ta da görünüp sağ-alt "Mağaza" butonuyla
  // çakışıyordu. Desktop'ta üst toolbar'daki "Yeni Ekle" zaten mevcut.
  @media (min-width: 1024px) {
    .sl-fab {
      display: none;
    }
  }
</style>
