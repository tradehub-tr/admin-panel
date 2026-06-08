<template>
  <div class="max-w-6xl mx-auto py-6 px-4 text-gray-900 dark:text-gray-100">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <AppIcon name="award" :size="24" class="text-emerald-600 dark:text-emerald-400" />
          {{ t("myCertifications.pageTitle") }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ t("myCertifications.pageSubtitle") }}
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="[
          'px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors inline-flex items-center gap-2',
          activeTab === tab.id
            ? 'text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400'
            : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200',
        ]"
        @click="setTab(tab.id)"
      >
        <AppIcon :name="tab.icon" :size="16" />
        {{ tab.label }}
        <span class="ml-1 text-xs text-gray-400">({{ tab.count }})</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-500 text-sm">
      {{ t("myCertifications.loading") }}
    </div>

    <!-- ─── TAB 1 — Mağaza Sertifikalarım ─── -->
    <div v-else-if="activeTab === 'seller'">
      <div
        class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2"
      >
        <AppIcon name="info" :size="14" class="text-blue-600 mt-0.5 shrink-0" />
        <div>
          <strong>{{ t("myCertifications.sellerInfoTitle") }}</strong>
          {{ t("myCertifications.sellerInfoBody") }}
        </div>
      </div>

      <div v-if="sellerCerts.length" class="flex items-center justify-end mb-3">
        <ViewModeToggle v-model="viewMode" />
      </div>

      <!-- ── Table modu (detaylı satır listesi) ── -->
      <div v-if="viewMode === 'table'" class="space-y-3">
        <div
          v-for="c in sellerCerts"
          :key="c.name"
          :class="[
            'border rounded-lg p-4 flex items-center gap-4',
            c.verification_status === 'Rejected'
              ? 'border-red-300 dark:border-red-700 bg-red-50/40 dark:bg-red-900/20'
              : '',
            c.verification_status === 'Pending'
              ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/40 dark:bg-yellow-900/20'
              : '',
            c.verification_status === 'Verified' && c.status_text === 'Expiring'
              ? 'border-orange-300 dark:border-orange-700 bg-orange-50/40 dark:bg-orange-900/20'
              : '',
            c.verification_status === 'Verified' && c.status_text === 'Expired'
              ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 opacity-75'
              : '',
            c.verification_status === 'Verified' && c.status_text === 'Active'
              ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              : '',
          ]"
        >
          <div
            class="w-10 h-10 rounded flex items-center justify-center"
            :class="
              c.verification_status === 'Rejected'
                ? 'bg-red-100 text-red-700'
                : c.verification_status === 'Pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : c.status_text === 'Active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : c.status_text === 'Expiring'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-200 text-gray-500'
            "
          >
            <AppIcon
              :name="
                c.verification_status === 'Rejected'
                  ? 'x-circle'
                  : c.verification_status === 'Pending'
                    ? 'clock'
                    : c.status_text === 'Expired'
                      ? 'x-circle'
                      : c.status_text === 'Expiring'
                        ? 'alert-triangle'
                        : 'check-circle'
              "
              :size="18"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {{ c.certification_type }}
              <span
                v-if="c.category"
                class="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2"
              >
                ({{
                  c.category === "Management"
                    ? t("myCertifications.categoryManagement")
                    : t("myCertifications.categoryProduct")
                }})
              </span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <template v-if="c.issued_date"
                >{{ t("myCertifications.issuedLabel") }} {{ c.issued_date }}</template
              >
              <template v-if="c.expiry_date">
                <span class="mx-1">·</span>
                {{ t("myCertifications.expiryLabel") }}
                <strong
                  :class="
                    c.status_text === 'Expiring'
                      ? 'text-orange-700'
                      : c.status_text === 'Expired'
                        ? 'text-gray-600'
                        : ''
                  "
                >
                  {{ c.expiry_date }}
                  <span v-if="c.days_left !== null && c.days_left >= 0 && c.days_left <= 30">
                    ({{ t("myCertifications.daysLeft", { n: c.days_left }) }})
                  </span>
                  <span v-else-if="c.days_left !== null && c.days_left < 0"
                    >({{ t("myCertifications.expiredShort") }})</span
                  >
                </strong>
              </template>
              <template v-if="c.certificate_number">
                <span class="mx-1">·</span>{{ t("myCertifications.numberLabel") }}
                {{ c.certificate_number }}
              </template>
            </div>
            <div class="mt-1 flex gap-2 items-center text-xs flex-wrap">
              <span
                :class="[
                  'px-2 py-0.5 rounded font-semibold',
                  verificationPillClass(c.verification_status),
                ]"
              >
                {{ verificationLabel(c.verification_status) }}
              </span>
              <a
                v-if="c.document"
                :href="c.document"
                target="_blank"
                class="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <AppIcon name="file-text" :size="12" /> {{ docFilename(c.document) }}
              </a>
              <span
                v-if="c.verification_status === 'Rejected' && c.rejection_reason"
                class="text-red-700"
              >
                · {{ t("myCertifications.reasonLabel") }} {{ c.rejection_reason }}
              </span>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              class="text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
              @click="openEditSellerCert(c)"
            >
              {{ t("myCertifications.edit") }}
            </button>
            <button
              class="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-3 py-1.5 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
              @click="deleteSellerCert(c)"
            >
              {{ t("myCertifications.delete") }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Grid (kart) modu ── -->
      <div
        v-else-if="viewMode === 'grid'"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <div
          v-for="c in sellerCerts"
          :key="c.name"
          class="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-4 flex flex-col gap-2"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-sm font-semibold truncate">{{ c.certification_type }}</p>
              <p v-if="c.category" class="text-[10px] text-gray-500">
                {{
                  c.category === "Management"
                    ? t("myCertifications.categoryManagement")
                    : t("myCertifications.categoryProduct")
                }}
              </p>
            </div>
            <span
              :class="[
                'text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
                verificationPillClass(c.verification_status),
              ]"
            >
              {{ verificationLabel(c.verification_status) }}
            </span>
          </div>
          <div class="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
            <div v-if="c.issued_date">
              {{ t("myCertifications.issuedLabel") }} {{ c.issued_date }}
            </div>
            <div v-if="c.expiry_date">
              {{ t("myCertifications.expiryLabel") }} {{ c.expiry_date }}
              <span v-if="c.days_left !== null && c.days_left >= 0 && c.days_left <= 30">
                ({{ t("myCertifications.daysLeft", { n: c.days_left }) }})
              </span>
              <span v-else-if="c.days_left !== null && c.days_left < 0">
                ({{ t("myCertifications.expiredShort") }})
              </span>
            </div>
            <div v-if="c.certificate_number">
              {{ t("myCertifications.numberLabel") }} {{ c.certificate_number }}
            </div>
          </div>
          <p
            v-if="c.verification_status === 'Rejected' && c.rejection_reason"
            class="text-[11px] text-red-700 dark:text-red-400"
          >
            {{ t("myCertifications.reasonLabel") }} {{ c.rejection_reason }}
          </p>
          <div class="flex items-center gap-2 flex-wrap pt-1">
            <a
              v-if="c.document"
              :href="c.document"
              target="_blank"
              class="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <AppIcon name="file-text" :size="12" /> {{ docFilename(c.document) }}
            </a>
            <button
              class="text-[11px] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-2 py-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
              @click="openEditSellerCert(c)"
            >
              {{ t("myCertifications.edit") }}
            </button>
            <button
              class="text-[11px] text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-2 py-1 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
              @click="deleteSellerCert(c)"
            >
              {{ t("myCertifications.delete") }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── List (kompakt) modu ── -->
      <div
        v-else-if="viewMode === 'list'"
        class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
      >
        <div
          v-for="c in sellerCerts"
          :key="c.name"
          class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900/40"
        >
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold truncate">
              {{ c.certification_type }}
              <span v-if="c.expiry_date" class="font-normal text-gray-500">
                · {{ t("myCertifications.expiryLabel") }} {{ c.expiry_date }}</span
              >
            </p>
            <a
              v-if="c.document"
              :href="c.document"
              target="_blank"
              class="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <AppIcon name="file-text" :size="10" /> {{ docFilename(c.document) }}
            </a>
          </div>
          <span
            :class="[
              'text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-none',
              verificationPillClass(c.verification_status),
            ]"
          >
            {{ verificationLabel(c.verification_status) }}
          </span>
          <div class="flex items-center gap-1 flex-none">
            <button
              class="text-[11px] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-2 py-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
              @click="openEditSellerCert(c)"
            >
              {{ t("myCertifications.edit") }}
            </button>
            <button
              class="text-[11px] text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-2 py-1 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
              @click="deleteSellerCert(c)"
            >
              {{ t("myCertifications.delete") }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Kanban modu — doğrulama durumuna göre (salt-okunur: satıcı durumu değiştiremez) ── -->
      <KanbanBoard
        v-else-if="viewMode === 'kanban'"
        :items="sellerCerts"
        :columns="sellerKanbanColumns"
        status-field="verification_status"
        :draggable="false"
        @item-click="openEditSellerCert"
      >
        <template #card="{ item }">
          <p class="text-xs font-semibold truncate">{{ item.certification_type }}</p>
          <p v-if="item.expiry_date" class="text-[11px] text-gray-600 dark:text-gray-300">
            {{ t("myCertifications.expiryLabel") }} {{ item.expiry_date }}
          </p>
          <p
            v-if="item.verification_status === 'Rejected' && item.rejection_reason"
            class="text-[10px] text-red-700 dark:text-red-400 mt-1 line-clamp-2"
          >
            {{ t("myCertifications.reasonLabel") }} {{ item.rejection_reason }}
          </p>
        </template>
      </KanbanBoard>

      <!-- Tüm modlarda ortak: ekleme düğmesi + boş durum -->
      <button
        class="w-full border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg py-3 text-sm font-medium flex items-center justify-center gap-2 mt-3"
        @click="openAddSellerCert"
      >
        <AppIcon name="plus" :size="16" /> {{ t("myCertifications.addSellerCert") }}
      </button>

      <div
        v-if="!sellerCerts.length"
        class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm"
      >
        {{ t("myCertifications.sellerEmpty") }}
      </div>
    </div>

    <!-- ─── TAB 2 — Ürün Sertifikalarım (matrix) ─── -->
    <div v-else-if="activeTab === 'product'">
      <!-- Filter bar -->
      <div class="flex items-center gap-2 mb-3 flex-wrap">
        <div class="relative flex-1 min-w-[180px]">
          <AppIcon
            name="search"
            :size="14"
            class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="productSearch"
            type="text"
            :placeholder="t('myCertifications.productSearchPlaceholder')"
            class="text-sm border rounded pl-8 pr-3 py-1.5 w-full"
            @input="onProductFilterChange"
          />
        </div>
        <select
          v-model="productCertFilter"
          class="text-sm border rounded px-2 py-1.5"
          @change="onProductFilterChange"
        >
          <option value="">{{ t("myCertifications.allCertsOption") }}</option>
          <option v-for="c in productCatalog" :key="c.name" :value="c.name">
            {{ c.certification_name }}
          </option>
        </select>
        <select
          v-model="productStatusFilter"
          class="text-sm border rounded px-2 py-1.5"
          @change="onProductFilterChange"
        >
          <option value="">{{ t("myCertifications.allStatusesOption") }}</option>
          <option value="expiring">{{ t("myCertifications.statusExpiring") }}</option>
          <option value="expired">{{ t("myCertifications.statusExpired") }}</option>
          <option value="unassigned">{{ t("myCertifications.statusUnassigned") }}</option>
        </select>
      </div>

      <div class="flex items-center justify-between mb-3 gap-3">
        <p class="text-xs text-gray-500 flex-1">
          {{ t("myCertifications.productMatrixHelp") }}
        </p>
        <div v-if="selectedListings.length > 0" class="flex gap-2 shrink-0">
          <button
            class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded font-medium"
            @click="openBulkAssignModal"
          >
            {{ t("myCertifications.bulkAssignBtn", { n: selectedListings.length }) }}
          </button>
          <button
            class="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-medium"
            @click="openBulkRemoveModal"
          >
            {{ t("myCertifications.bulkRemoveBtn", { n: selectedListings.length }) }}
          </button>
        </div>
      </div>

      <div
        class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
      >
        <table class="w-full text-sm">
          <thead
            class="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400"
          >
            <tr>
              <th class="px-3 py-2 text-left w-10">
                <input type="checkbox" :checked="allSelected" @change="toggleAll" />
              </th>
              <th class="text-left px-3 py-2">{{ t("myCertifications.colProduct") }}</th>
              <th class="text-left px-3 py-2">{{ t("myCertifications.colAssignedCerts") }}</th>
              <th class="text-right px-3 py-2 w-28">{{ t("myCertifications.colAction") }}</th>
            </tr>
          </thead>
          <tbody class="text-xs">
            <tr
              v-for="l in matrixListings"
              :key="l.name"
              class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40"
            >
              <td class="px-3 py-2">
                <input v-model="selectedListings" type="checkbox" :value="l.name" />
              </td>
              <td class="px-3 py-2 font-medium">
                {{ l.title || l.name }}
                <span class="text-gray-400 ml-1 font-normal">({{ l.name }})</span>
              </td>
              <td class="px-3 py-2">
                <span
                  v-for="c in l.certs"
                  :key="c.name"
                  :class="[
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded mr-1 mb-1 text-[10px] font-semibold cursor-pointer',
                    verificationPillClass(c.verification_status),
                  ]"
                  :title="
                    c.verification_status === 'Verified'
                      ? t('myCertifications.pillEditTitle')
                      : t('myCertifications.pillStatusTitle', {
                          status: verificationLabel(c.verification_status),
                        })
                  "
                  @click="openEditListingCert(l, c)"
                >
                  <span>
                    {{ c.certification_type }}
                    <span v-if="c.days_left !== null && c.days_left >= 0 && c.days_left <= 30">
                      ({{ t("myCertifications.daysShort", { n: c.days_left }) }})
                    </span>
                  </span>
                  <button
                    type="button"
                    class="hover:text-red-700 ml-0.5"
                    :title="t('myCertifications.removeAssignmentTitle')"
                    @click.stop="removeListingCert(l, c)"
                  >
                    ×
                  </button>
                </span>
                <span v-if="!l.certs.length" class="text-gray-400 italic">{{
                  t("myCertifications.notAssignedYet")
                }}</span>
              </td>
              <td class="px-3 py-2 text-right">
                <button
                  class="text-emerald-600 hover:text-emerald-800 text-xs font-medium"
                  @click="openAddListingCert(l)"
                >
                  {{ t("myCertifications.assignCertBtn") }}
                </button>
              </td>
            </tr>
            <tr v-if="!matrixListings.length">
              <td colspan="4" class="text-center py-8 text-gray-400">
                <template v-if="productSearch || productCertFilter || productStatusFilter">
                  {{ t("myCertifications.noProductsMatchFilter") }}
                </template>
                <template v-else>{{ t("myCertifications.noProductsYet") }}</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="matrixTotal > matrixPageSize"
        class="flex items-center justify-between mt-3 text-xs"
      >
        <span class="text-gray-500">
          {{
            t("myCertifications.pagination", {
              page: matrixPage,
              pages: Math.ceil(matrixTotal / matrixPageSize),
              total: matrixTotal,
            })
          }}
        </span>
        <div class="flex gap-1">
          <button
            class="px-3 py-1 border rounded disabled:opacity-40 inline-flex items-center gap-1"
            :disabled="matrixPage <= 1"
            @click="goPage(matrixPage - 1)"
          >
            <AppIcon name="chevron-left" :size="12" />
            {{ t("myCertifications.prev") }}
          </button>
          <button
            class="px-3 py-1 border rounded disabled:opacity-40 inline-flex items-center gap-1"
            :disabled="matrixPage >= Math.ceil(matrixTotal / matrixPageSize)"
            @click="goPage(matrixPage + 1)"
          >
            {{ t("myCertifications.next") }}
            <AppIcon name="chevron-right" :size="12" />
          </button>
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between text-[11px] text-gray-500">
        <p class="inline-flex items-center gap-1">
          <AppIcon name="lightbulb" :size="12" class="text-amber-500" />
          {{ t("myCertifications.matrixTip") }}
        </p>
        <button
          class="text-emerald-700 hover:underline inline-flex items-center gap-1"
          @click="exportMatrix"
        >
          <AppIcon name="download" :size="12" />
          {{ t("myCertifications.exportExcel") }}
        </button>
      </div>
    </div>

    <!-- ─── TAB 3 — Önerdiklerim ─── -->
    <div v-else-if="activeTab === 'suggestions'">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs text-gray-500">
          {{ t("myCertifications.suggestionsHelp") }}
        </p>
        <button
          class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded inline-flex items-center gap-2"
          @click="openSuggestModal"
        >
          <AppIcon name="plus" :size="14" /> {{ t("myCertifications.suggestNew") }}
        </button>
      </div>

      <div class="space-y-2">
        <div
          v-for="s in suggestions"
          :key="s.name"
          :class="[
            'border rounded-lg p-3',
            s.status === 'Pending'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : '',
            s.status === 'Approved'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : '',
            s.status === 'Rejected'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : '',
          ]"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium text-gray-900 dark:text-gray-100 text-sm">
                {{ s.certification_name }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{
                  s.category === "Management"
                    ? t("myCertifications.categoryManagement")
                    : t("myCertifications.categoryProduct")
                }}
              </div>
            </div>
            <span
              :class="[
                'text-xs px-2 py-1 rounded font-semibold',
                s.status === 'Pending'
                  ? 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                  : '',
                s.status === 'Approved'
                  ? 'bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                  : '',
                s.status === 'Rejected'
                  ? 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                  : '',
              ]"
            >
              {{ statusLabel(s.status) }}
            </span>
          </div>
          <div
            v-if="s.status === 'Rejected' && s.rejection_reason"
            class="mt-2 text-xs text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-2"
          >
            <strong>{{ t("myCertifications.rejectionReasonLabel") }}</strong>
            {{ s.rejection_reason }}
          </div>
        </div>
        <div
          v-if="!suggestions.length"
          class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm"
        >
          {{ t("myCertifications.suggestionsEmpty") }}
        </div>
      </div>
    </div>

    <!-- ─── TAB 4 — Sistem Kataloğu ─── -->
    <div v-else-if="activeTab === 'catalog'">
      <div class="flex gap-2 mb-3">
        <select v-model="catalogFilter" class="text-sm border rounded px-2 py-1">
          <option value="">{{ t("myCertifications.catalogAll") }}</option>
          <option value="Management">{{ t("myCertifications.categoryManagement") }}</option>
          <option value="Product">{{ t("myCertifications.categoryProduct") }}</option>
        </select>
        <div class="relative flex-1">
          <AppIcon
            name="search"
            :size="14"
            class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            v-model="catalogSearch"
            type="text"
            :placeholder="t('myCertifications.catalogSearchPlaceholder')"
            class="w-full text-sm border rounded pl-8 pr-3 py-1"
          />
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div
          v-for="c in filteredCatalog"
          :key="c.name"
          class="border border-gray-200 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-800"
        >
          <div class="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {{ c.certification_name }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span
              :class="
                c.category === 'Management'
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              "
            >
              {{
                c.category === "Management"
                  ? t("myCertifications.categoryManagement")
                  : t("myCertifications.categoryProduct")
              }}
            </span>
            <template v-if="c.description"> · {{ c.description }}</template>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Modal: Mağaza Sertifikası Ekle/Düzenle ─── -->
    <div
      v-if="showSellerModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showSellerModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold mb-4">
          {{
            editingCert
              ? t("myCertifications.editSellerCertTitle")
              : t("myCertifications.addSellerCertTitle")
          }}
        </h3>
        <form class="space-y-3" @submit.prevent="saveSellerCert">
          <div>
            <label class="form-label">{{ t("myCertifications.certLabel") }}</label>
            <select
              v-model="sellerForm.certification_type"
              :disabled="!!editingCert"
              required
              class="form-input"
            >
              <option value="">{{ t("myCertifications.selectOption") }}</option>
              <option v-for="c in catalog" :key="c.name" :value="c.name">
                {{ c.certification_name }} ({{
                  c.category === "Management"
                    ? t("myCertifications.categoryManagement")
                    : t("myCertifications.categoryProduct")
                }})
              </option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
              {{ t("myCertifications.certNotInList") }}
              <a
                href="#suggestions"
                class="text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                @click.prevent="
                  showSellerModal = false;
                  setTab('suggestions');
                  openSuggestModal();
                "
                >{{ t("myCertifications.suggestNew") }}<AppIcon name="arrow-right" :size="10"
              /></a>
            </p>
          </div>
          <div>
            <label class="form-label">{{ t("myCertifications.certNumberLabel") }}</label>
            <input v-model="sellerForm.certificate_number" type="text" class="form-input" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">{{ t("myCertifications.issuedDateLabel") }}</label>
              <input v-model="sellerForm.issued_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">{{ t("myCertifications.expiryDateLabel") }}</label>
              <input v-model="sellerForm.expiry_date" type="date" class="form-input" />
            </div>
          </div>
          <div>
            <label class="form-label"
              >{{ t("myCertifications.documentLabel") }} <span class="text-red-500">*</span></label
            >
            <!-- Container: document boş VEYA upload halen aktif (bar/✓ görünebilsin) -->
            <div v-if="!sellerForm.document || docUpload.status.value !== 'idle'" class="relative">
              <input
                id="seller-doc-upload"
                type="file"
                accept=".pdf,image/jpeg,image/png"
                class="hidden"
                @change="uploadDocument($event, 'seller')"
              />
              <label
                for="seller-doc-upload"
                class="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 rounded-lg p-3 cursor-pointer flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                :class="uploading ? 'opacity-60 pointer-events-none' : ''"
              >
                <AppIcon
                  :name="uploading ? 'loader' : 'upload-cloud'"
                  :size="16"
                  :class="uploading ? 'animate-spin' : ''"
                />
                {{
                  uploading
                    ? t("myCertifications.uploading")
                    : t("myCertifications.uploadDocPrompt")
                }}
              </label>

              <!-- tradehub-upload-ui pattern: bar overlay -->
              <div
                v-if="docUpload.status.value === 'uploading'"
                class="absolute bottom-2 left-[15%] right-[15%] h-2 bg-black/75 border border-black/80 rounded-full overflow-hidden z-10 pointer-events-none"
              >
                <div
                  class="h-full bg-white rounded-full transition-all duration-300"
                  :style="{ width: Math.max(4, docUpload.progress.value) + '%' }"
                ></div>
              </div>
              <Transition name="fade">
                <div
                  v-if="docUpload.status.value === 'success'"
                  class="absolute top-1/2 right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500/90 z-20 flex items-center justify-center text-white text-xs font-bold pointer-events-none"
                >
                  ✓
                </div>
              </Transition>
            </div>
            <div
              v-else
              class="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded"
            >
              <AppIcon name="file-text" :size="16" class="text-emerald-700 dark:text-emerald-400" />
              <a
                :href="sellerForm.document"
                target="_blank"
                class="text-sm text-emerald-700 dark:text-emerald-400 hover:underline truncate flex-1"
              >
                {{ docFilename(sellerForm.document) }}
              </a>
              <button
                type="button"
                class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                :title="t('myCertifications.removeDocumentTitle')"
                @click="sellerForm.document = ''"
              >
                <AppIcon name="x" :size="14" />
              </button>
            </div>
            <p v-if="uploadError" class="text-xs text-red-600 dark:text-red-400 mt-1">
              {{ uploadError }}
            </p>
          </div>
          <div
            class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2"
          >
            <AppIcon
              name="info"
              :size="14"
              class="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
            />
            <span>{{ t("myCertifications.sellerModalInfo") }}</span>
          </div>
          <div
            v-if="modalError"
            class="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded whitespace-pre-line"
          >
            {{ modalError }}
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              @click="showSellerModal = false"
            >
              {{ t("myCertifications.cancel") }}
            </button>
            <button
              type="submit"
              :disabled="modalSubmitting || !sellerForm.document || !sellerForm.certification_type"
              :title="
                !sellerForm.document
                  ? t('myCertifications.uploadDocFirstTitle')
                  : !sellerForm.certification_type
                    ? t('myCertifications.selectCertTitle')
                    : ''
              "
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ modalSubmitting ? t("myCertifications.saving") : t("myCertifications.save") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ─── Modal: Listing'e Tek Cert Ata ─── -->
    <div
      v-if="showListingAssignModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showListingAssignModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold mb-2">{{ t("myCertifications.assignCertToProductTitle") }}</h3>
        <p class="text-xs text-gray-500 mb-3">
          {{ t("myCertifications.productLabel") }}
          <strong>{{ listingAssignContext?.title || listingAssignContext?.name }}</strong>
        </p>
        <form class="space-y-3" @submit.prevent="submitListingAssign">
          <div>
            <label class="form-label">{{ t("myCertifications.sellerCertLabel") }}</label>
            <select v-model="listingAssignForm.certification_type" required class="form-input">
              <option value="">{{ t("myCertifications.selectVerifiedOption") }}</option>
              <option
                v-for="sc in verifiedProductSellerCerts"
                :key="sc.certification_type"
                :value="sc.certification_type"
              >
                {{ sc.certification_type }}
                <template v-if="sc.issued_date">
                  — {{ t("myCertifications.issuedInline") }} {{ sc.issued_date }}</template
                >
              </option>
            </select>
            <p
              v-if="!verifiedProductSellerCerts.length"
              class="text-xs text-orange-700 mt-1 inline-flex items-center gap-1"
            >
              <AppIcon name="alert-triangle" :size="12" />
              {{ t("myCertifications.noVerifiedProductCert") }}
              <a
                href="#seller"
                class="underline"
                @click.prevent="
                  showListingAssignModal = false;
                  setTab('seller');
                "
                >{{ t("myCertifications.addToSellerCertsLink") }}</a
              >
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">{{ t("myCertifications.issuedDateOptionalLabel") }}</label>
              <input v-model="listingAssignForm.issued_date" type="date" class="form-input" />
              <span class="text-[10px] text-gray-500">{{
                t("myCertifications.batchOverrideHint")
              }}</span>
            </div>
            <div>
              <label class="form-label">{{ t("myCertifications.expiryDateOptionalLabel") }}</label>
              <input v-model="listingAssignForm.expiry_date" type="date" class="form-input" />
              <span class="text-[10px] text-gray-500">{{
                t("myCertifications.batchOverrideHint")
              }}</span>
            </div>
          </div>
          <div
            class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2"
          >
            <AppIcon
              name="info"
              :size="14"
              class="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
            />
            <span>{{ t("myCertifications.docFromPoolInfo") }}</span>
          </div>
          <div
            v-if="modalError"
            class="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded"
          >
            {{ modalError }}
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              @click="showListingAssignModal = false"
            >
              {{ t("myCertifications.cancel") }}
            </button>
            <button
              type="submit"
              :disabled="modalSubmitting || !verifiedProductSellerCerts.length"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {{ modalSubmitting ? t("myCertifications.assigning") : t("myCertifications.assign") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ─── Modal: Listing Cert Düzenle (Rozet tıklama) ─── -->
    <div
      v-if="showListingEditModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showListingEditModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold mb-2">
          {{ listingEditContext?.cert?.certification_type }} — {{ t("myCertifications.editDates") }}
        </h3>
        <p class="text-xs text-gray-500 mb-3">
          {{ t("myCertifications.productLabel") }}
          <strong>{{ listingEditContext?.listing?.title }}</strong>
        </p>
        <form class="space-y-3" @submit.prevent="submitListingEdit">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">{{ t("myCertifications.issuedDateLabel") }}</label>
              <input v-model="listingEditForm.issued_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">{{ t("myCertifications.expiryDateLabel") }}</label>
              <input v-model="listingEditForm.expiry_date" type="date" class="form-input" />
            </div>
          </div>
          <div
            v-if="listingEditContext?.cert?.document"
            class="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded p-2 text-xs flex items-center gap-2"
          >
            <AppIcon name="file-text" :size="14" class="text-emerald-700 dark:text-emerald-400" />
            <a
              :href="listingEditContext.cert.document"
              target="_blank"
              class="text-emerald-700 dark:text-emerald-400 hover:underline truncate flex-1"
            >
              {{ docFilename(listingEditContext.cert.document) }}
            </a>
            <span class="text-[10px] text-gray-500 dark:text-gray-400">{{
              t("myCertifications.fromSellerPool")
            }}</span>
          </div>
          <div
            v-if="modalError"
            class="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded"
          >
            {{ modalError }}
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              @click="showListingEditModal = false"
            >
              {{ t("myCertifications.cancel") }}
            </button>
            <button
              type="submit"
              :disabled="modalSubmitting"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {{ modalSubmitting ? t("myCertifications.saving") : t("myCertifications.save") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ─── Modal: Yeni Sertifika Öner ─── -->
    <div
      v-if="showSuggestModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showSuggestModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold mb-4">{{ t("myCertifications.suggestModalTitle") }}</h3>
        <form class="space-y-3" @submit.prevent="submitSuggestion">
          <div>
            <label class="form-label">{{ t("myCertifications.certNameLabel") }}</label>
            <input
              v-model="suggestForm.certification_name"
              type="text"
              :placeholder="t('myCertifications.certNamePlaceholder')"
              required
              class="form-input"
            />
          </div>
          <div>
            <label class="form-label">{{ t("myCertifications.categoryLabel") }}</label>
            <select v-model="suggestForm.category" required class="form-input">
              <option value="">{{ t("myCertifications.selectOption") }}</option>
              <option value="Management">{{ t("myCertifications.managementCertOption") }}</option>
              <option value="Product">{{ t("myCertifications.productCertOption") }}</option>
            </select>
          </div>
          <div>
            <label class="form-label">{{ t("myCertifications.descriptionLabel") }}</label>
            <textarea v-model="suggestForm.description" rows="3" class="form-input"></textarea>
          </div>
          <div
            v-if="modalError"
            class="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded whitespace-pre-line"
          >
            {{ modalError }}
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              @click="showSuggestModal = false"
            >
              {{ t("myCertifications.cancel") }}
            </button>
            <button
              type="submit"
              :disabled="modalSubmitting"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {{
                modalSubmitting ? t("myCertifications.submitting") : t("myCertifications.suggest")
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ─── Modal: Toplu Atama (Form + Onay) ─── -->
    <div
      v-if="showBulkAssignModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showBulkAssignModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
      >
        <template v-if="bulkAssignStage === 'form'">
          <h3 class="text-lg font-bold mb-2">{{ t("myCertifications.bulkAssignTitle") }}</h3>
          <p class="text-xs text-gray-500 mb-4">
            {{ t("myCertifications.bulkAssignHelp", { n: selectedListings.length }) }}
          </p>
          <form class="space-y-3" @submit.prevent="bulkAssignStage = 'confirm'">
            <div>
              <label class="form-label">{{ t("myCertifications.sellerCertLabel") }}</label>
              <select v-model="bulkForm.certification_type" required class="form-input">
                <option value="">{{ t("myCertifications.selectOption") }}</option>
                <option
                  v-for="sc in verifiedProductSellerCerts"
                  :key="sc.certification_type"
                  :value="sc.certification_type"
                >
                  {{ sc.certification_type }}
                </option>
              </select>
              <p
                v-if="!verifiedProductSellerCerts.length"
                class="text-xs text-orange-700 mt-1 inline-flex items-center gap-1"
              >
                <AppIcon name="alert-triangle" :size="12" />
                {{ t("myCertifications.noVerifiedProductCert") }}
              </p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">{{
                  t("myCertifications.issuedDateOptionalLabel")
                }}</label>
                <input v-model="bulkForm.issued_date" type="date" class="form-input" />
              </div>
              <div>
                <label class="form-label">{{
                  t("myCertifications.expiryDateOptionalLabel")
                }}</label>
                <input v-model="bulkForm.expiry_date" type="date" class="form-input" />
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                @click="showBulkAssignModal = false"
              >
                {{ t("myCertifications.cancel") }}
              </button>
              <button
                type="submit"
                :disabled="!verifiedProductSellerCerts.length"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1"
              >
                {{ t("myCertifications.continue") }}
                <AppIcon name="arrow-right" :size="12" />
                {{ t("myCertifications.confirmStep") }}
              </button>
            </div>
          </form>
        </template>
        <template v-else>
          <h3 class="text-lg font-bold mb-2">{{ t("myCertifications.confirmAssignTitle") }}</h3>
          <div
            class="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded p-3 mb-3 text-xs space-y-2 text-gray-800 dark:text-gray-200"
          >
            <p>
              {{
                t("myCertifications.confirmAssignIntro", {
                  cert: bulkForm.certification_type,
                  n: selectedListings.length,
                })
              }}
            </p>
            <ul class="list-disc list-inside text-gray-700 max-h-32 overflow-y-auto">
              <li v-for="ln in selectedListingTitles" :key="ln">{{ ln }}</li>
            </ul>
            <p v-if="bulkForm.expiry_date" class="text-amber-800">
              {{ t("myCertifications.expiryDateInline") }}
              <strong>{{ bulkForm.expiry_date }}</strong>
            </p>
          </div>
          <div
            v-if="modalError"
            class="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded mb-2"
          >
            {{ modalError }}
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1"
              @click="bulkAssignStage = 'form'"
            >
              <AppIcon name="arrow-left" :size="12" />
              {{ t("myCertifications.back") }}
            </button>
            <button
              type="button"
              :disabled="modalSubmitting"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium disabled:opacity-50"
              @click="submitBulkAssign"
            >
              {{
                modalSubmitting
                  ? t("myCertifications.assigning")
                  : t("myCertifications.confirmAndAssign")
              }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- ─── Custom Confirm Dialog ─── -->
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

    <!-- ─── Modal: Toplu Kaldırma ─── -->
    <div
      v-if="showBulkRemoveModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showBulkRemoveModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold mb-2">{{ t("myCertifications.bulkRemoveTitle") }}</h3>
        <p class="text-xs text-gray-500 mb-3">
          {{ t("myCertifications.bulkRemoveHelp", { n: selectedListings.length }) }}
        </p>
        <div
          v-if="bulkRemoveCandidates.length === 0"
          class="text-sm text-gray-500 bg-gray-50 border rounded p-3 mb-3"
        >
          {{ t("myCertifications.bulkRemoveNoCommon") }}
        </div>
        <div
          v-else
          class="cert-chip-group mb-3 max-h-60 overflow-y-auto"
          role="radiogroup"
          :aria-label="t('myCertifications.bulkRemoveAriaLabel')"
        >
          <button
            v-for="opt in bulkRemoveCandidates"
            :key="opt.cert"
            type="button"
            class="cert-chip"
            :class="{ active: bulkRemoveCert === opt.cert }"
            :aria-pressed="bulkRemoveCert === opt.cert"
            @click="bulkRemoveCert = opt.cert"
          >
            <span class="cert-chip-label">{{ opt.cert }}</span>
            <span class="cert-chip-count">{{
              t("myCertifications.inNProducts", { n: opt.count })
            }}</span>
          </button>
        </div>
        <div
          v-if="modalError"
          class="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded mb-2"
        >
          {{ modalError }}
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            @click="showBulkRemoveModal = false"
          >
            {{ t("myCertifications.cancel") }}
          </button>
          <button
            type="button"
            :disabled="modalSubmitting || !bulkRemoveCert"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50"
            @click="submitBulkRemove"
          >
            {{
              modalSubmitting
                ? t("myCertifications.removing")
                : t("myCertifications.bulkRemoveBtnAction")
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import KanbanBoard from "@/components/common/KanbanBoard.vue";
  import { useImageUploadProgress } from "@/composables/useImageUploadProgress";
  import { useListViewMode } from "@/composables/useListViewMode";

  // tradehub-upload-ui pattern — sertifika belgesi upload bar overlay
  const docUpload = useImageUploadProgress();

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();

  // "Mağaza Sertifikalarım" sekmesi için görünüm modu — sekme veriyi süzer, toggle düzeni değiştirir.
  const { viewMode } = useListViewMode("my-certifications", "table");

  // verification_status DocType değerleri: Pending / Verified / Rejected
  const sellerKanbanColumns = computed(() => [
    { value: "Pending", label: t("myCertifications.verificationPending"), color: "#f59e0b" },
    { value: "Verified", label: t("myCertifications.verificationVerified"), color: "#10b981" },
    { value: "Rejected", label: t("myCertifications.verificationRejected"), color: "#ef4444" },
  ]);

  // ── State ─────────────────────────────────────────────────────────────
  const loading = ref(true);
  const activeTab = ref("seller");
  const sellerCerts = ref([]);
  const suggestions = ref([]);
  const catalog = ref([]);
  const matrixListings = ref([]);
  const matrixTotal = ref(0);
  const matrixPage = ref(1);
  const matrixPageSize = ref(50);
  const selectedListings = ref([]);

  const productSearch = ref("");
  const productCertFilter = ref("");
  const productStatusFilter = ref("");

  const catalogFilter = ref("");
  const catalogSearch = ref("");

  // Modals
  const showSellerModal = ref(false);
  const showSuggestModal = ref(false);
  const showBulkAssignModal = ref(false);
  const showBulkRemoveModal = ref(false);
  const showListingAssignModal = ref(false);
  const showListingEditModal = ref(false);
  const editingCert = ref(null);
  const modalSubmitting = ref(false);
  const modalError = ref("");
  const bulkAssignStage = ref("form");
  const bulkRemoveCert = ref("");

  const sellerForm = ref({
    certification_type: "",
    certificate_number: "",
    issued_date: "",
    expiry_date: "",
    document: "",
  });
  const suggestForm = ref({ certification_name: "", category: "", description: "" });
  const bulkForm = ref({ certification_type: "", issued_date: "", expiry_date: "" });

  const listingAssignContext = ref(null);
  const listingAssignForm = ref({ certification_type: "", issued_date: "", expiry_date: "" });
  const listingEditContext = ref(null);
  const listingEditForm = ref({ issued_date: "", expiry_date: "" });

  const uploading = ref(false);
  const uploadError = ref("");
  const MAX_DOC_SIZE = 10 * 1024 * 1024;
  const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];

  // Custom confirm dialog state
  const confirmOpen = ref(false);
  const confirmConfig = ref({
    title: "",
    message: "",
    confirmLabel: t("myCertifications.ok"),
    cancelLabel: t("myCertifications.cancel"),
    tone: "primary",
  });
  let confirmResolver = null;

  function askConfirm(config) {
    return new Promise((resolve) => {
      confirmConfig.value = {
        confirmLabel: t("myCertifications.ok"),
        cancelLabel: t("myCertifications.cancel"),
        tone: "primary",
        ...config,
      };
      confirmOpen.value = true;
      confirmResolver = resolve;
    });
  }

  function onConfirmYes() {
    if (confirmResolver) confirmResolver(true);
    confirmResolver = null;
  }
  function onConfirmNo() {
    if (confirmResolver) confirmResolver(false);
    confirmResolver = null;
  }

  // ── Computed ──────────────────────────────────────────────────────────
  const tabs = computed(() => [
    {
      id: "seller",
      label: t("myCertifications.tabSeller"),
      icon: "store",
      count: sellerCerts.value.length,
    },
    {
      id: "product",
      label: t("myCertifications.tabProduct"),
      icon: "package",
      count: matrixTotal.value,
    },
    {
      id: "suggestions",
      label: t("myCertifications.tabSuggestions"),
      icon: "lightbulb",
      count: suggestions.value.length,
    },
    {
      id: "catalog",
      label: t("myCertifications.tabCatalog"),
      icon: "book-open",
      count: catalog.value.length,
    },
  ]);

  const productCatalog = computed(() => catalog.value.filter((c) => c.category === "Product"));

  // Listing'lere atanabilir cert listesi: Verified + Product
  const verifiedProductSellerCerts = computed(() => {
    const productSet = new Set(productCatalog.value.map((c) => c.name));
    return sellerCerts.value.filter(
      (sc) => sc.verification_status === "Verified" && productSet.has(sc.certification_type)
    );
  });

  const filteredCatalog = computed(() => {
    let list = catalog.value;
    if (catalogFilter.value) list = list.filter((c) => c.category === catalogFilter.value);
    if (catalogSearch.value) {
      const q = catalogSearch.value.toLowerCase();
      list = list.filter((c) => c.certification_name.toLowerCase().includes(q));
    }
    return list;
  });

  const allSelected = computed(
    () =>
      matrixListings.value.length > 0 &&
      selectedListings.value.length === matrixListings.value.length
  );

  const selectedListingTitles = computed(() => {
    const set = new Set(selectedListings.value);
    return matrixListings.value.filter((l) => set.has(l.name)).map((l) => l.title || l.name);
  });

  const bulkRemoveCandidates = computed(() => {
    const set = new Set(selectedListings.value);
    const counter = {};
    for (const l of matrixListings.value) {
      if (!set.has(l.name)) continue;
      for (const c of l.certs || []) {
        counter[c.certification_type] = (counter[c.certification_type] || 0) + 1;
      }
    }
    return Object.entries(counter)
      .map(([cert, count]) => ({ cert, count }))
      .sort((a, b) => b.count - a.count);
  });

  // ── Helpers ──────────────────────────────────────────────────────────
  function setTab(id) {
    activeTab.value = id;
    router.replace({ hash: "#" + id });
    if (id === "product") loadMatrix();
  }

  function applyTabFromHash() {
    const valid = ["seller", "product", "suggestions", "catalog"];
    const hash = (route.hash || "").replace("#", "");
    if (valid.includes(hash)) activeTab.value = hash;
  }

  function verificationPillClass(status) {
    if (status === "Verified")
      return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300";
    if (status === "Rejected")
      return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
    return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300";
  }
  function verificationLabel(status) {
    if (status === "Verified") return t("myCertifications.verificationVerified");
    if (status === "Rejected") return t("myCertifications.verificationRejected");
    return t("myCertifications.verificationPending");
  }
  function statusLabel(s) {
    if (s === "Pending") return t("myCertifications.suggestionPending");
    if (s === "Approved") return t("myCertifications.suggestionApproved");
    if (s === "Rejected") return t("myCertifications.suggestionRejected");
    return s;
  }
  function docFilename(url) {
    if (!url) return "";
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1] || url);
  }

  async function loadAll() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.seller_certifications.get_my_certifications"
      );
      const data = res?.message || res;
      sellerCerts.value = data?.seller_certs || [];
      suggestions.value = data?.suggestions || [];
      catalog.value = data?.catalog || [];
      if (activeTab.value === "product") {
        await loadMatrix();
      }
    } catch (e) {
      console.error("Sertifikalar yüklenemedi:", e);
    } finally {
      loading.value = false;
    }
  }

  async function loadMatrix() {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.seller_certifications.get_listing_cert_matrix",
        {
          search: productSearch.value || "",
          cert_filter: productCertFilter.value || "",
          status_filter: productStatusFilter.value || "",
          page: matrixPage.value,
          page_size: matrixPageSize.value,
        }
      );
      const data = res?.message || res;
      matrixListings.value = data?.listings || [];
      matrixTotal.value = data?.total || 0;
    } catch (e) {
      console.error("Matrix yüklenemedi:", e);
    }
  }

  let filterDebounce = null;
  function onProductFilterChange() {
    matrixPage.value = 1;
    if (filterDebounce) clearTimeout(filterDebounce);
    filterDebounce = setTimeout(() => loadMatrix(), 250);
  }

  function goPage(p) {
    matrixPage.value = p;
    loadMatrix();
  }

  // ── Belge yükleme ────────────────────────────────────────────────────
  async function uploadDocument(event, target) {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadError.value = "";
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      uploadError.value = t("myCertifications.errInvalidFileType");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_DOC_SIZE) {
      uploadError.value = t("myCertifications.errFileTooLarge");
      event.target.value = "";
      return;
    }
    uploading.value = true;
    docUpload.start();
    try {
      const url = await api.uploadCertDocument(file);
      if (target === "seller") sellerForm.value.document = url;
      await docUpload.finish();
    } catch (e) {
      docUpload.fail();
      uploadError.value = e.message || t("myCertifications.errUploadFailed");
    } finally {
      uploading.value = false;
      event.target.value = "";
    }
  }

  // ── Mağaza CRUD ──────────────────────────────────────────────────────
  function openAddSellerCert() {
    editingCert.value = null;
    sellerForm.value = {
      certification_type: "",
      certificate_number: "",
      issued_date: "",
      expiry_date: "",
      document: "",
    };
    modalError.value = "";
    uploadError.value = "";
    showSellerModal.value = true;
  }

  function openEditSellerCert(c) {
    editingCert.value = c;
    sellerForm.value = {
      certification_type: c.certification_type,
      certificate_number: c.certificate_number || "",
      issued_date: c.issued_date || "",
      expiry_date: c.expiry_date || "",
      document: c.document || "",
    };
    modalError.value = "";
    uploadError.value = "";
    showSellerModal.value = true;
  }

  async function saveSellerCert() {
    modalError.value = "";
    modalSubmitting.value = true;
    try {
      const method = editingCert.value
        ? "tradehub_core.api.seller_certifications.update_seller_cert"
        : "tradehub_core.api.seller_certifications.add_seller_cert";
      const args = editingCert.value
        ? {
            row_name: editingCert.value.name,
            certificate_number: sellerForm.value.certificate_number,
            issued_date: sellerForm.value.issued_date || null,
            expiry_date: sellerForm.value.expiry_date || null,
            document: sellerForm.value.document,
          }
        : { ...sellerForm.value };
      await api.callMethod(method, args);
      showSellerModal.value = false;
      await loadAll();
    } catch (e) {
      modalError.value = e.message || t("myCertifications.errGeneric");
    } finally {
      modalSubmitting.value = false;
    }
  }

  async function deleteSellerCert(c) {
    const ok = await askConfirm({
      title: t("myCertifications.deleteSellerCertTitle"),
      message: t("myCertifications.deleteSellerCertMessage", { cert: c.certification_type }),
      confirmLabel: t("myCertifications.delete"),
      cancelLabel: t("myCertifications.dismiss"),
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.callMethod("tradehub_core.api.seller_certifications.delete_seller_cert", {
        row_name: c.name,
      });
      await loadAll();
    } catch (e) {
      alert(e.message || t("myCertifications.errDelete"));
    }
  }

  // ── Sertifika Öner Modal ─────────────────────────────────────────────
  function openSuggestModal() {
    suggestForm.value = { certification_name: "", category: "", description: "" };
    modalError.value = "";
    showSuggestModal.value = true;
  }

  async function submitSuggestion() {
    modalError.value = "";
    modalSubmitting.value = true;
    try {
      await api.callMethod("tradehub_core.api.certification.suggest_certification", {
        ...suggestForm.value,
      });
      showSuggestModal.value = false;
      await loadAll();
    } catch (e) {
      modalError.value = e.message || t("myCertifications.errGeneric");
    } finally {
      modalSubmitting.value = false;
    }
  }

  // ── Listing tek atama ────────────────────────────────────────────────
  function openAddListingCert(listing) {
    listingAssignContext.value = listing;
    listingAssignForm.value = { certification_type: "", issued_date: "", expiry_date: "" };
    modalError.value = "";
    showListingAssignModal.value = true;
  }

  async function submitListingAssign() {
    modalError.value = "";
    modalSubmitting.value = true;
    try {
      await api.callMethod("tradehub_core.api.seller_certifications.add_listing_cert", {
        listing_name: listingAssignContext.value.name,
        certification_type: listingAssignForm.value.certification_type,
        issued_date: listingAssignForm.value.issued_date || null,
        expiry_date: listingAssignForm.value.expiry_date || null,
      });
      showListingAssignModal.value = false;
      await loadMatrix();
    } catch (e) {
      modalError.value = e.message || t("myCertifications.errGeneric");
    } finally {
      modalSubmitting.value = false;
    }
  }

  function openEditListingCert(listing, cert) {
    listingEditContext.value = { listing, cert };
    listingEditForm.value = {
      issued_date: cert.issued_date || "",
      expiry_date: cert.expiry_date || "",
    };
    modalError.value = "";
    showListingEditModal.value = true;
  }

  async function submitListingEdit() {
    modalError.value = "";
    modalSubmitting.value = true;
    try {
      await api.callMethod("tradehub_core.api.seller_certifications.update_listing_cert", {
        row_name: listingEditContext.value.cert.name,
        issued_date: listingEditForm.value.issued_date || null,
        expiry_date: listingEditForm.value.expiry_date || null,
      });
      showListingEditModal.value = false;
      await loadMatrix();
    } catch (e) {
      modalError.value = e.message || t("myCertifications.errGeneric");
    } finally {
      modalSubmitting.value = false;
    }
  }

  // ── Toplu işlemler ───────────────────────────────────────────────────
  function toggleAll(e) {
    if (e.target.checked) selectedListings.value = matrixListings.value.map((l) => l.name);
    else selectedListings.value = [];
  }

  function openBulkAssignModal() {
    bulkForm.value = { certification_type: "", issued_date: "", expiry_date: "" };
    bulkAssignStage.value = "form";
    modalError.value = "";
    showBulkAssignModal.value = true;
  }

  function openBulkRemoveModal() {
    bulkRemoveCert.value = "";
    modalError.value = "";
    showBulkRemoveModal.value = true;
  }

  async function submitBulkAssign() {
    modalError.value = "";
    modalSubmitting.value = true;
    try {
      await api.callMethod("tradehub_core.api.seller_certifications.bulk_assign_listing_cert", {
        listing_names: selectedListings.value.join(","),
        certification_type: bulkForm.value.certification_type,
        issued_date: bulkForm.value.issued_date || null,
        expiry_date: bulkForm.value.expiry_date || null,
      });
      showBulkAssignModal.value = false;
      selectedListings.value = [];
      await loadMatrix();
    } catch (e) {
      modalError.value = e.message || t("myCertifications.errGeneric");
      bulkAssignStage.value = "form";
    } finally {
      modalSubmitting.value = false;
    }
  }

  async function submitBulkRemove() {
    modalError.value = "";
    if (!bulkRemoveCert.value) {
      modalError.value = t("myCertifications.errSelectCertToRemove");
      return;
    }
    modalSubmitting.value = true;
    try {
      await api.callMethod("tradehub_core.api.seller_certifications.bulk_remove_listing_cert", {
        listing_names: selectedListings.value.join(","),
        certification_type: bulkRemoveCert.value,
      });
      showBulkRemoveModal.value = false;
      selectedListings.value = [];
      await loadMatrix();
    } catch (e) {
      modalError.value = e.message || t("myCertifications.errGeneric");
    } finally {
      modalSubmitting.value = false;
    }
  }

  async function removeListingCert(listing, cert) {
    const ok = await askConfirm({
      title: t("myCertifications.removeAssignmentConfirmTitle"),
      message: t("myCertifications.removeAssignmentMessage", {
        cert: cert.certification_type,
        product: listing.title || listing.name,
      }),
      confirmLabel: t("myCertifications.remove"),
      cancelLabel: t("myCertifications.dismiss"),
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.callMethod("tradehub_core.api.seller_certifications.remove_listing_cert", {
        row_name: cert.name,
      });
      await loadMatrix();
    } catch (e) {
      alert(e.message || t("myCertifications.errRemove"));
    }
  }

  // ── Excel export ─────────────────────────────────────────────────────
  async function exportMatrix() {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.seller_certifications.export_listing_cert_matrix"
      );
      const data = res?.message || res;
      const columns = data?.columns || [];
      const rows = data?.data || [];
      // CSV oluştur
      const escape = (v) => {
        const s = String(v || "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const certHeaders = columns.slice(2); // ilk iki kolon Ürün + Adı
      const csvRows = [columns.map(escape).join(",")];
      for (const r of rows) {
        const line = [
          escape(r.name),
          escape(r.title),
          ...certHeaders.map((h) => escape(r[h] || "")),
        ];
        csvRows.push(line.join(","));
      }
      const blob = new Blob(["﻿" + csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sertifika-atamalari-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || t("myCertifications.errExport"));
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────
  onMounted(async () => {
    applyTabFromHash();
    await loadAll();
  });

  watch(() => route.hash, applyTabFromHash);
</script>

<style scoped>
  .form-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: #4b5563;
    margin-bottom: 4px;
  }
  .form-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    color: #111827;
    outline: none;
  }
  .form-input:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
  }
  :global(.dark) .form-input {
    background: #1f2937;
    border-color: #374151;
    color: #f3f4f6;
  }
  :global(.dark) .form-input::placeholder {
    color: #6b7280;
  }
  .cert-chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cert-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #4b5563;
    background: #f9fafb;
    border: 1px solid #d1d5db;
    border-radius: 999px;
    cursor: pointer;
    transition:
      color 0.15s ease,
      background 0.15s ease,
      border-color 0.15s ease;
  }
  .cert-chip:hover {
    border-color: #10b981;
  }
  .cert-chip:focus {
    outline: none;
  }
  .cert-chip:focus-visible {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.4);
  }
  .cert-chip.active {
    color: #fff;
    background: #10b981;
    border-color: #10b981;
  }
  .cert-chip-count {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.75;
  }
  :global(.dark) .cert-chip {
    color: #d1d5db;
    background: #1f2937;
    border-color: #374151;
  }
  :global(.dark) .cert-chip.active {
    color: #fff;
    background: #10b981;
    border-color: #10b981;
  }
</style>
