<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{
            isAdmin
              ? t("listingReviewModeration.titleAdmin")
              : t("listingReviewModeration.titleSeller")
          }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{
            isAdmin
              ? t("listingReviewModeration.subtitleAdmin")
              : t("listingReviewModeration.subtitleSeller")
          }}
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Görünüm modları yalnızca masaüstünde; mobilde tek kompakt liste kalıbı geçerli -->
        <ViewModeToggle v-if="isLg" v-model="viewMode" />
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadAll">
          <AppIcon name="refresh-cw" :size="13" />
          {{ t("listingReviewModeration.refresh") }}
        </button>
      </div>
    </div>

    <!-- Status Filter Pills -->
    <StatusFilterPills
      v-model="activeTab"
      :options="tabOptions"
      wrapper-class="flex items-center gap-2 mb-5 overflow-x-auto md:overflow-x-visible md:flex-wrap [&>.status-pill]:shrink-0 [&>.status-pill]:whitespace-nowrap [&::-webkit-scrollbar]:hidden"
      data-tour="rvm-tabs"
      @change="
        page = 1;
        loadReviews();
      "
    />

    <!-- Search & Filter Bar — mobile-first -->
    <div class="card p-3 mb-4" data-tour="rvm-filters">
      <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
        <!-- Search -->
        <div class="relative flex-1 min-w-0">
          <AppIcon
            name="search"
            :size="14"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            v-model="searchText"
            type="text"
            :placeholder="t('listingReviewModeration.searchPlaceholder')"
            class="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 dark:bg-[#1e1e2a] dark:border-[#2a2a35] dark:text-gray-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            @input="onSearchInput"
          />
          <button
            v-if="searchText"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            :title="t('listingReviewModeration.clear')"
            @click="
              searchText = '';
              onFilterChange();
            "
          >
            <AppIcon name="x" :size="13" />
          </button>
        </div>
        <!-- Reviewer e-posta + puan — mobilde yan yana, sm+ üstü satıra katılır -->
        <div class="grid grid-cols-2 gap-2 sm:contents">
          <input
            v-model="reviewerEmail"
            type="text"
            :placeholder="t('listingReviewModeration.reviewerEmailPlaceholder')"
            class="min-w-0 sm:w-56 px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 dark:bg-[#1e1e2a] dark:border-[#2a2a35] dark:text-gray-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            @input="onSearchInput"
          />
          <select
            v-model="minRating"
            class="min-w-0 sm:w-36 px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 dark:bg-[#1e1e2a] dark:border-[#2a2a35] dark:text-gray-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            @change="onFilterChange"
          >
            <option value="">{{ t("listingReviewModeration.allRatings") }}</option>
            <option value="5">★ 5</option>
            <option value="4">★ 4+</option>
            <option value="3">★ 3+</option>
            <option value="2">★ 2+</option>
            <option value="1">★ 1+</option>
          </select>
        </div>
        <!-- Reset -->
        <button
          v-if="searchText || reviewerEmail || minRating"
          type="button"
          class="hdr-btn-outlined text-xs flex items-center gap-1 justify-center"
          @click="clearFilters"
        >
          <AppIcon name="x" :size="12" />
          {{ t("listingReviewModeration.reset") }}
        </button>
      </div>
    </div>

    <!-- Reviews queue (kart/tablo/liste/kanban modları + aksiyon butonları) -->
    <div data-tour="rvm-table">
      <!-- Loading -->
      <div v-if="loading" class="card p-3">
        <Skeleton variant="row" :count="8" />
      </div>

      <!-- Empty -->
      <div v-else-if="reviews.length === 0" class="card text-center py-12">
        <AppIcon name="star" :size="32" class="text-gray-300 mx-auto mb-3" />
        <p class="text-sm text-gray-400">{{ t("listingReviewModeration.empty") }}</p>
      </div>

      <!-- Mobil (<768px): kompakt liste — satıra dokun, alttan aksiyon paneli açılır.
           Masaüstündeki grid/table/list/kanban modlarını mobilde tek kalıp devralır. -->
      <div v-else-if="!isLg" class="card p-0 overflow-hidden">
        <div
          v-for="r in reviews"
          :key="r.name"
          class="list-compact-item"
          role="button"
          tabindex="0"
          :aria-label="r.reviewer_display_name || r.reviewer_user"
          @click="openSheet(r)"
          @keydown.enter.prevent="openSheet(r)"
          @keydown.space.prevent="openSheet(r)"
        >
          <span
            class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[12px] flex-shrink-0"
            :style="{ background: avatarColor(r.reviewer_display_name || r.reviewer_user) }"
          >
            {{ (r.reviewer_display_name || r.reviewer_user || "?").charAt(0).toUpperCase() }}
          </span>
          <div class="lc-main">
            <div class="lc-line1 flex items-center gap-2">
              <span class="list-compact-name truncate">{{
                r.reviewer_display_name || r.reviewer_user
              }}</span>
              <span class="text-amber-400 text-[11px] flex-shrink-0"
                >{{ "★".repeat(r.rating)
                }}<span class="text-gray-300 dark:text-gray-600">{{
                  "★".repeat(5 - r.rating)
                }}</span></span
              >
            </div>
            <div class="lc-sub truncate">{{ r.title || excerpt(r.body, 70) }}</div>
          </div>
          <div class="flex flex-col items-end gap-1 flex-shrink-0">
            <span class="list-compact-date">{{ formatDateShort(r.submitted_at) }}</span>
            <span
              v-if="r.abuse_report_count > 0"
              class="badge text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 inline-flex items-center gap-1"
            >
              <AppIcon name="flag" :size="10" />{{ r.abuse_report_count }}
            </span>
            <span v-else class="badge text-[10px]" :class="statusBadgeClass(r.status)">{{
              statusLabel(r.status)
            }}</span>
          </div>
          <AppIcon name="chevron-right" :size="16" class="text-gray-400 flex-shrink-0" />
        </div>
      </div>

      <!-- Grid (rich review cards — varsayılan kart-liste bu moda atandı) -->
      <div v-else-if="viewMode === 'grid'" class="space-y-3">
        <div
          v-for="r in reviews"
          :key="r.name"
          class="card p-4 border-l-[3px]"
          :style="{ borderLeftColor: stripeColor(r.status) }"
        >
          <!-- Header -->
          <div class="flex items-start gap-3 mb-2">
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              :style="{ background: avatarColor(r.reviewer_display_name || r.reviewer_user) }"
            >
              {{ (r.reviewer_display_name || r.reviewer_user || "?").charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ r.reviewer_display_name || r.reviewer_user }}
                </span>
                <span
                  v-if="r.status !== 'Pending'"
                  class="badge text-[10px]"
                  :class="statusBadgeClass(r.status)"
                >
                  {{ statusLabel(r.status) }}
                </span>
                <span
                  v-if="r.is_verified_purchase"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium"
                >
                  {{ t("listingReviewModeration.verifiedPurchase") }}
                </span>
                <span
                  v-if="r.is_kyb_verified"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium"
                >
                  KYB ✓
                </span>
                <button
                  v-if="r.abuse_report_count > 0"
                  type="button"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium hover:bg-red-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  :title="
                    expandedAbuseId === r.name
                      ? t('listingReviewModeration.hideReports')
                      : t('listingReviewModeration.showReportDetails')
                  "
                  @click="toggleAbuseDetails(r.name)"
                >
                  <AppIcon name="flag" :size="14" />
                  {{ t("listingReviewModeration.reportCount", { count: r.abuse_report_count }) }}
                  <span class="text-[8px]" v-text="expandedAbuseId === r.name ? '▼' : '▶'"></span>
                </button>
              </div>
              <div class="flex items-center gap-1.5 mt-1">
                <span class="text-amber-400 text-xs"
                  >{{ "★".repeat(r.rating)
                  }}<span class="text-gray-300">{{ "★".repeat(5 - r.rating) }}</span></span
                >
                <span class="text-[11px] text-gray-400">·</span>
                <a
                  :href="storefrontUrlFor(r.listing)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[11px] text-brand-800 hover:underline truncate"
                  >{{ r.listing_title || r.listing }}</a
                >
                <span class="text-[11px] text-gray-400">· {{ formatDate(r.submitted_at) }}</span>
              </div>
            </div>

            <!-- V2: yuvarlak ikon aksiyonlar — kart başlığında, başparmak erişiminde -->
            <div v-if="isAdmin" class="flex items-center gap-1.5 shrink-0">
              <button
                v-if="r.status === 'Pending'"
                class="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                :disabled="working === r.name"
                :title="t('listingReviewModeration.approve')"
                @click="doAction(r.name, 'approve')"
              >
                <AppIcon name="check" :size="14" />
              </button>
              <button
                v-if="r.status === 'Pending' || r.status === 'Approved'"
                class="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                :disabled="working === r.name"
                :title="t('listingReviewModeration.reject')"
                @click="startReject(r.name)"
              >
                <AppIcon name="x" :size="14" />
              </button>
              <button
                v-if="r.status === 'Approved'"
                class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-500/10 text-gray-600 dark:text-gray-300 hover:bg-gray-500/20 transition-colors disabled:opacity-50"
                :disabled="working === r.name"
                :title="t('listingReviewModeration.hide')"
                @click="doAction(r.name, 'hide')"
              >
                <AppIcon name="eye-off" :size="13" />
              </button>
              <button
                v-if="r.status === 'Hidden' || r.status === 'Rejected'"
                class="w-8 h-8 rounded-full flex items-center justify-center bg-brand-500/15 text-brand-800 dark:text-brand-400 hover:bg-brand-500/25 transition-colors disabled:opacity-50"
                :disabled="working === r.name"
                :title="
                  r.status === 'Hidden'
                    ? t('listingReviewModeration.republish')
                    : t('listingReviewModeration.reapprove')
                "
                @click="doAction(r.name, r.status === 'Hidden' ? 'unhide' : 'approve')"
              >
                <AppIcon name="check" :size="14" />
              </button>
              <button
                class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                :disabled="working === r.name"
                :title="t('listingReviewModeration.cascadeDelete')"
                @click="confirmDelete(r.name)"
              >
                <AppIcon name="trash-2" :size="13" />
              </button>
            </div>
          </div>

          <!-- Title + Body -->
          <div
            v-if="r.title"
            class="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2 mb-1"
          >
            {{ r.title }}
          </div>
          <div class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {{ r.body }}
          </div>

          <!-- Images -->
          <div v-if="r.images && r.images.length > 0" class="flex gap-2 mt-3 flex-wrap">
            <a
              v-for="(img, idx) in r.images"
              :key="idx"
              :href="storefrontImageUrl(img.image)"
              target="_blank"
              rel="noopener noreferrer"
              class="block w-16 h-16 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 hover:border-brand-500 transition-colors"
            >
              <img :src="storefrontImageUrl(img.image)" class="w-full h-full object-cover" alt="" />
            </a>
          </div>

          <!-- Abuse reports detayı (rozet tıklanınca açılır) -->
          <div
            v-if="expandedAbuseId === r.name && r.abuse_reports && r.abuse_reports.length > 0"
            class="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg p-3"
          >
            <div
              class="text-[11px] font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1"
            >
              <AppIcon name="flag" :size="11" />
              {{
                t("listingReviewModeration.reportDetailsTitle", { count: r.abuse_reports.length })
              }}
            </div>
            <div class="space-y-2">
              <div
                v-for="ab in r.abuse_reports"
                :key="ab.name"
                class="bg-white dark:bg-[#1e1e2a] border border-red-100 dark:border-red-800/40 rounded p-2 text-[12px]"
                :class="ab.resolved ? 'opacity-60' : ''"
              >
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="font-medium text-gray-900 dark:text-gray-100">{{
                    ab.reporter
                  }}</span>
                  <span
                    class="px-1.5 py-0.5 rounded bg-red-200 text-red-800 text-[10px] font-semibold"
                  >
                    {{ abuseReasonLabel(ab.reason) }}
                  </span>
                  <span class="text-[10px] text-gray-400 ml-auto">
                    {{ formatDate(ab.created_at) }}
                  </span>
                  <span
                    v-if="ab.resolved"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium"
                    >{{ t("listingReviewModeration.markedInvalid") }}</span
                  >
                </div>
                <div v-if="ab.note" class="text-gray-700 dark:text-gray-300 italic">
                  "{{ ab.note }}"
                </div>
                <div v-else class="text-[11px] text-gray-400 italic">
                  {{ t("listingReviewModeration.noNote") }}
                </div>
                <!-- Geçersiz Say butonu (sadece resolved=false için) -->
                <div v-if="!ab.resolved && isAdmin" class="mt-2 flex justify-end">
                  <button
                    type="button"
                    class="text-[11px] px-2 py-0.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-1"
                    :disabled="dismissingAbuseId === ab.name"
                    @click="confirmDismissAbuse(ab.name, r.name)"
                  >
                    <AppIcon name="check" :size="10" />
                    {{ t("listingReviewModeration.markInvalid") }}
                  </button>
                </div>
              </div>
            </div>
            <div class="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
              <AppIcon name="info" :size="12" />
              {{
                t("listingReviewModeration.autoHideNote", { threshold: ABUSE_AUTO_HIDE_THRESHOLD })
              }}
            </div>
          </div>

          <!-- Rejected reason -->
          <div v-if="r.rejected_reason" class="mt-2 text-[11px] text-red-600 italic">
            <strong>{{ t("listingReviewModeration.rejectReasonLabel") }}</strong>
            {{ r.rejected_reason }}
          </div>

          <!-- Inline reject reason form -->
          <div v-if="rejectingId === r.name" class="mt-3">
            <textarea
              v-model="rejectReason"
              rows="2"
              maxlength="500"
              :placeholder="t('listingReviewModeration.rejectReasonPlaceholder')"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-[#1e1e2a] focus:outline-none focus:border-red-500"
            ></textarea>
            <div class="flex gap-2 mt-2">
              <button
                class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                @click="cancelReject"
              >
                {{ t("listingReviewModeration.cancel") }}
              </button>
              <button
                class="px-3 py-1 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
                :disabled="working === r.name || rejectReason.trim().length < 5"
                @click="doReject(r.name)"
              >
                {{ t("listingReviewModeration.reject") }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-sm">
            <thead>
              <tr
                class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]"
              >
                <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                  {{ t("listingReviewModeration.titleSeller") }}
                </th>
                <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                  {{ t("listingModeration.colProduct") }}
                </th>
                <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
                  {{ t("sellerMetricsList.rating") }}
                </th>
                <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
                  {{ t("bulkImportHistory.colStatus") }}
                </th>
                <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
                  {{ t("listingModeration.colDate") }}
                </th>
                <th
                  v-if="isAdmin"
                  class="text-center text-xs font-semibold text-gray-500 px-4 py-3"
                >
                  {{ t("listingModeration.colAction") }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
              <tr
                v-for="r in reviews"
                :key="r.name"
                class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors"
              >
                <td class="px-4 py-3">
                  <p class="text-xs font-medium text-gray-800 dark:text-gray-200">
                    {{ r.reviewer_display_name || r.reviewer_user }}
                  </p>
                  <p
                    v-if="r.title"
                    class="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mt-0.5"
                  >
                    {{ r.title }}
                  </p>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-[340px]">
                    {{ excerpt(r.body) }}
                  </p>
                </td>
                <td
                  class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[180px] truncate"
                >
                  {{ r.listing_title || r.listing }}
                </td>
                <td class="px-4 py-3 text-center whitespace-nowrap">
                  <span class="text-amber-400 text-xs"
                    >{{ "★".repeat(r.rating)
                    }}<span class="text-gray-300">{{ "★".repeat(5 - r.rating) }}</span></span
                  >
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="badge text-[10px]" :class="statusBadgeClass(r.status)">{{
                    statusLabel(r.status)
                  }}</span>
                </td>
                <td class="px-4 py-3 text-center text-xs text-gray-500 whitespace-nowrap">
                  {{ formatDate(r.submitted_at) }}
                </td>
                <td v-if="isAdmin" class="px-4 py-3">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      v-if="r.status === 'Pending'"
                      :disabled="working === r.name"
                      class="inline-row-btn bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      :title="t('listingReviewModeration.approve')"
                      @click="doAction(r.name, 'approve')"
                    >
                      <AppIcon name="check" :size="13" />
                    </button>
                    <button
                      v-if="r.status === 'Pending' || r.status === 'Approved'"
                      :disabled="working === r.name"
                      class="inline-row-btn bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                      :title="t('listingReviewModeration.reject')"
                      @click="startReject(r.name)"
                    >
                      <AppIcon name="x" :size="13" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- List (compact) -->
      <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
        <div v-for="r in reviews" :key="r.name" class="list-compact-item">
          <span
            class="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
            :style="{ background: avatarColor(r.reviewer_display_name || r.reviewer_user) }"
          >
            {{ (r.reviewer_display_name || r.reviewer_user || "?").charAt(0).toUpperCase() }}
          </span>
          <span class="text-amber-400 text-[11px] flex-shrink-0 hidden sm:inline">{{
            "★".repeat(r.rating)
          }}</span>
          <span class="list-compact-name flex-1 min-w-0 truncate">{{
            r.title || excerpt(r.body)
          }}</span>
          <span class="text-xs text-gray-400 hidden md:inline truncate max-w-[140px]">{{
            r.listing_title || r.listing
          }}</span>
          <span class="badge text-[10px] flex-shrink-0" :class="statusBadgeClass(r.status)">{{
            statusLabel(r.status)
          }}</span>
          <span class="list-compact-date">{{ formatDate(r.submitted_at) }}</span>
          <div v-if="isAdmin" class="flex items-center gap-1.5 flex-shrink-0">
            <button
              v-if="r.status === 'Pending'"
              :disabled="working === r.name"
              class="inline-row-btn bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              :title="t('listingReviewModeration.approve')"
              @click="doAction(r.name, 'approve')"
            >
              <AppIcon name="check" :size="13" />
            </button>
            <button
              v-if="r.status === 'Pending' || r.status === 'Approved'"
              :disabled="working === r.name"
              class="inline-row-btn bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
              :title="t('listingReviewModeration.reject')"
              @click="startReject(r.name)"
            >
              <AppIcon name="x" :size="13" />
            </button>
          </div>
        </div>
      </div>

      <!-- Kanban (moderasyon durumuna göre — salt-okunur, aksiyon kart butonlarından) -->
      <div v-else-if="viewMode === 'kanban'">
        <KanbanBoard
          :items="reviews"
          :columns="statusColumns"
          status-field="status"
          :draggable="false"
          @item-click="toggleAbuseDetails($event.name)"
        >
          <template #card="{ item }">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-amber-400 text-[11px]"
                >{{ "★".repeat(item.rating)
                }}<span class="text-gray-300">{{ "★".repeat(5 - item.rating) }}</span></span
              >
            </div>
            <div
              v-if="item.title"
              class="text-[12px] font-semibold text-gray-800 dark:text-gray-200 truncate"
            >
              {{ item.title }}
            </div>
            <div class="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
              {{ excerpt(item.body) }}
            </div>
            <div class="text-[10px] text-brand-800 dark:text-brand-500 truncate mt-1.5">
              {{ item.listing_title || item.listing }}
            </div>
            <div class="flex items-center justify-between gap-2 mt-2">
              <span class="text-[10px] text-gray-400 truncate">{{
                item.reviewer_display_name || item.reviewer_user
              }}</span>
              <span v-if="isAdmin && item.status === 'Pending'" class="flex items-center gap-1.5">
                <button
                  :disabled="working === item.name"
                  class="inline-row-btn bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  :title="t('listingReviewModeration.approve')"
                  @click.stop="doAction(item.name, 'approve')"
                >
                  <AppIcon name="check" :size="12" />
                </button>
                <button
                  :disabled="working === item.name"
                  class="inline-row-btn bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                  :title="t('listingReviewModeration.reject')"
                  @click.stop="startReject(item.name)"
                >
                  <AppIcon name="x" :size="12" />
                </button>
              </span>
            </div>
          </template>
        </KanbanBoard>
      </div>

      <!-- Pagination -->
      <div v-if="total > pageSize" class="flex justify-center mt-6 gap-2">
        <button
          :disabled="page === 1"
          class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50"
          @click="goPage(page - 1)"
        >
          {{ t("listingReviewModeration.prev") }}
        </button>
        <span class="px-3 py-1 text-xs text-gray-500">{{
          t("listingReviewModeration.pageOf", { page, total: totalPages })
        }}</span>
        <button
          :disabled="page >= totalPages"
          class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50"
          @click="goPage(page + 1)"
        >
          {{ t("listingReviewModeration.next") }}
        </button>
      </div>
    </div>

    <!-- Reddetme formu — grid dışındaki modlarda (table/list/kanban) inline kart formu yok,
         seçilen yorum için tek instance overlay kart göster. -->
    <div
      v-if="rejectingId && (!isLg || viewMode !== 'grid')"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div class="absolute inset-0 bg-black/40" @click="cancelReject"></div>
      <div class="relative card p-4 w-[420px] max-w-full">
        <textarea
          v-model="rejectReason"
          rows="3"
          maxlength="500"
          :placeholder="t('listingReviewModeration.rejectReasonPlaceholder')"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-[#1e1e2a] focus:outline-none focus:border-red-500"
        ></textarea>
        <div class="flex gap-2 mt-2 justify-end">
          <button
            class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            @click="cancelReject"
          >
            {{ t("listingReviewModeration.cancel") }}
          </button>
          <button
            class="px-3 py-1 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
            :disabled="working === rejectingId || rejectReason.trim().length < 5"
            @click="doReject(rejectingId)"
          >
            {{ t("listingReviewModeration.reject") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Mobil aksiyon paneli (bottom sheet) — kompakt liste satırına dokununca açılır.
         MobileTabBar ile aynı global .m-sheet kalıbı: backdrop z-51, gövde z-52 (tab bar z-50 üstünde). -->
    <Transition name="fade">
      <div v-if="sheetReview" class="m-sheet-backdrop" aria-hidden="true" @click="closeSheet"></div>
    </Transition>
    <Transition name="m-sheet">
      <div
        v-if="sheetReview"
        class="m-sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="sheetReview.reviewer_display_name || sheetReview.reviewer_user"
      >
        <div class="m-sheet-grab" aria-hidden="true"></div>
        <div class="m-sheet-head">
          <span class="m-sheet-title">{{
            sheetReview.reviewer_display_name || sheetReview.reviewer_user
          }}</span>
          <button
            type="button"
            class="m-sheet-close"
            :aria-label="t('listingReviewModeration.cancel')"
            @click="closeSheet"
          >
            <AppIcon name="x" :size="15" />
          </button>
        </div>
        <div class="m-sheet-body">
          <!-- Puan + durum + rozetler -->
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <span class="text-amber-400 text-sm"
              >{{ "★".repeat(sheetReview.rating)
              }}<span class="text-gray-300 dark:text-gray-600">{{
                "★".repeat(5 - sheetReview.rating)
              }}</span></span
            >
            <span class="badge text-[10px]" :class="statusBadgeClass(sheetReview.status)">{{
              statusLabel(sheetReview.status)
            }}</span>
            <span
              v-if="sheetReview.is_verified_purchase"
              class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium"
              >{{ t("listingReviewModeration.verifiedPurchase") }}</span
            >
            <span
              v-if="sheetReview.is_kyb_verified"
              class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium"
              >KYB ✓</span
            >
          </div>
          <!-- Ürün + tarih -->
          <div class="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
            <a
              :href="storefrontUrlFor(sheetReview.listing)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-brand-800 hover:underline"
              >{{ sheetReview.listing_title || sheetReview.listing }}</a
            >
            · {{ formatDate(sheetReview.submitted_at) }}
          </div>
          <!-- Başlık + metin -->
          <div
            v-if="sheetReview.title"
            class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1"
          >
            {{ sheetReview.title }}
          </div>
          <div class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {{ sheetReview.body }}
          </div>
          <!-- Görseller -->
          <div
            v-if="sheetReview.images && sheetReview.images.length > 0"
            class="flex gap-2 mt-3 flex-wrap"
          >
            <a
              v-for="(img, idx) in sheetReview.images"
              :key="idx"
              :href="storefrontImageUrl(img.image)"
              target="_blank"
              rel="noopener noreferrer"
              class="block w-16 h-16 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700"
            >
              <img :src="storefrontImageUrl(img.image)" class="w-full h-full object-cover" alt="" />
            </a>
          </div>
          <!-- Reddetme gerekçesi -->
          <div v-if="sheetReview.rejected_reason" class="mt-2 text-[11px] text-red-600 italic">
            <strong>{{ t("listingReviewModeration.rejectReasonLabel") }}</strong>
            {{ sheetReview.rejected_reason }}
          </div>
          <!-- Şikayet detayları -->
          <div
            v-if="
              sheetReview.abuse_report_count > 0 &&
              sheetReview.abuse_reports &&
              sheetReview.abuse_reports.length
            "
            class="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg p-3"
          >
            <div
              class="text-[11px] font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1"
            >
              <AppIcon name="flag" :size="11" />
              {{
                t("listingReviewModeration.reportDetailsTitle", {
                  count: sheetReview.abuse_reports.length,
                })
              }}
            </div>
            <div class="space-y-2">
              <div
                v-for="ab in sheetReview.abuse_reports"
                :key="ab.name"
                class="bg-white dark:bg-[#1e1e2a] border border-red-100 dark:border-red-800/40 rounded p-2 text-[12px]"
                :class="ab.resolved ? 'opacity-60' : ''"
              >
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="font-medium text-gray-900 dark:text-gray-100">{{ ab.reporter }}</span>
                  <span
                    class="px-1.5 py-0.5 rounded bg-red-200 text-red-800 text-[10px] font-semibold"
                    >{{ abuseReasonLabel(ab.reason) }}</span
                  >
                  <span class="text-[10px] text-gray-400 ml-auto">{{
                    formatDate(ab.created_at)
                  }}</span>
                </div>
                <div v-if="ab.note" class="text-gray-700 dark:text-gray-300 italic">
                  "{{ ab.note }}"
                </div>
                <div v-if="!ab.resolved && isAdmin" class="mt-2 flex justify-end">
                  <button
                    type="button"
                    class="text-[11px] px-2 py-0.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-1"
                    :disabled="dismissingAbuseId === ab.name"
                    @click="sheetDismissAbuse(ab.name, sheetReview.name)"
                  >
                    <AppIcon name="check" :size="10" />{{
                      t("listingReviewModeration.markInvalid")
                    }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Aksiyonlar — duruma göre (masaüstü kart mantığının aynısı) -->
          <div v-if="isAdmin" class="grid gap-2 mt-4">
            <button
              v-if="sheetReview.status === 'Pending'"
              type="button"
              class="rvm-sheet-btn bg-emerald-600 hover:bg-emerald-700 text-white"
              :disabled="working === sheetReview.name"
              @click="sheetAction('approve')"
            >
              <AppIcon name="check" :size="16" />{{ t("listingReviewModeration.approve") }}
            </button>
            <button
              v-if="sheetReview.status === 'Hidden'"
              type="button"
              class="rvm-sheet-btn bg-brand-500/15 text-brand-800 dark:text-brand-400 hover:bg-brand-500/25"
              :disabled="working === sheetReview.name"
              @click="sheetAction('unhide')"
            >
              <AppIcon name="check" :size="16" />{{ t("listingReviewModeration.republish") }}
            </button>
            <button
              v-if="sheetReview.status === 'Rejected'"
              type="button"
              class="rvm-sheet-btn bg-brand-500/15 text-brand-800 dark:text-brand-400 hover:bg-brand-500/25"
              :disabled="working === sheetReview.name"
              @click="sheetAction('approve')"
            >
              <AppIcon name="check" :size="16" />{{ t("listingReviewModeration.reapprove") }}
            </button>
            <button
              v-if="sheetReview.status === 'Pending' || sheetReview.status === 'Approved'"
              type="button"
              class="rvm-sheet-btn bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
              @click="sheetReject"
            >
              <AppIcon name="x" :size="16" />{{ t("listingReviewModeration.reject") }}
            </button>
            <button
              v-if="sheetReview.status === 'Approved'"
              type="button"
              class="rvm-sheet-btn bg-gray-500/10 text-gray-600 dark:text-gray-300 hover:bg-gray-500/20"
              :disabled="working === sheetReview.name"
              @click="sheetAction('hide')"
            >
              <AppIcon name="eye-off" :size="15" />{{ t("listingReviewModeration.hide") }}
            </button>
            <button
              type="button"
              class="rvm-sheet-btn border border-red-200 dark:border-red-800/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              @click="sheetDelete"
            >
              <AppIcon name="trash-2" :size="15" />{{ t("listingReviewModeration.cascadeDelete") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Onay dialog (sil + geçersiz say için tek instance) -->
    <ConfirmDialog
      v-model:open="confirmDialog.open"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-label="confirmDialog.confirmLabel"
      :tone="confirmDialog.tone"
      @confirm="confirmDialog.onConfirm?.()"
    />
  </div>
</template>

<script setup>
  import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import { useAuthStore } from "@/stores/auth";
  import api from "@/utils/api";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import KanbanBoard from "@/components/common/KanbanBoard.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: durum sekmeleri → filtreler → moderasyon kuyruğu/aksiyonlar.
  usePageTour("review-moderation", () => [
    {
      target: '[data-tour="rvm-tabs"]',
      title: t("tourSteps.page.rvmTabs_t"),
      desc: t("tourSteps.page.rvmTabs_d"),
    },
    {
      target: '[data-tour="rvm-filters"]',
      title: t("tourSteps.page.rvmFilters_t"),
      desc: t("tourSteps.page.rvmFilters_d"),
    },
    {
      target: '[data-tour="rvm-table"]',
      title: t("tourSteps.page.rvmTable_t"),
      desc: t("tourSteps.page.rvmTable_d"),
    },
  ]);
  const { viewMode } = useListViewMode("listing-review-moderation", "table");
  const toast = useToast();
  const auth = useAuthStore();
  const isAdmin = computed(() => auth.isAdmin);
  // Mobil (<768px) tespiti — bu boyutun altında kompakt liste + bottom sheet devreye girer.
  const { isLg } = useBreakpoint();

  // StatusFilterPills component'i için: { value, label, dot, count }
  // counts ref'i reactive olduğu için computed kullanıyoruz — yeniden hesaplanır.
  const tabOptions = computed(() => [
    {
      value: "Pending",
      label: t("listingReviewModeration.tabPending"),
      dot: "bg-amber-400",
      count: counts.value.pending,
    },
    {
      value: "Approved",
      label: t("listingReviewModeration.tabApproved"),
      dot: "bg-emerald-400",
      count: counts.value.approved,
    },
    {
      value: "Rejected",
      label: t("listingReviewModeration.tabRejected"),
      dot: "bg-red-400",
      count: counts.value.rejected,
    },
    {
      value: "Hidden",
      label: t("listingReviewModeration.tabHidden"),
      dot: "bg-gray-400",
      count: counts.value.hidden,
    },
    { value: "all", label: t("listingReviewModeration.tabAll"), dot: "bg-brand-400" },
  ]);

  // Kanban kolonları — gerçek moderasyon durumları (statusField = "status").
  // Tek bir tab seçiliyken yalnızca o kolon dolar; "Tümü" sekmesinde hepsi görünür.
  const statusColumns = computed(() => [
    { value: "Pending", label: t("listingReviewModeration.tabPending"), color: "#fbbf24" },
    { value: "Approved", label: t("listingReviewModeration.tabApproved"), color: "#34d399" },
    { value: "Rejected", label: t("listingReviewModeration.tabRejected"), color: "#f87171" },
    { value: "Hidden", label: t("listingReviewModeration.tabHidden"), color: "#9ca3af" },
  ]);

  const STATUS_LABEL = {
    Pending: "tabPending",
    Approved: "tabApproved",
    Rejected: "tabRejected",
    Hidden: "tabHidden",
  };
  const STATUS_BADGE = {
    Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
    Hidden: "bg-gray-500/10 text-gray-500 dark:text-gray-400",
  };
  function statusLabel(status) {
    return STATUS_LABEL[status]
      ? t(`listingReviewModeration.${STATUS_LABEL[status]}`)
      : status || "";
  }
  function statusBadgeClass(status) {
    return STATUS_BADGE[status] || "bg-gray-500/10 text-gray-500 dark:text-gray-400";
  }
  // V2 tasarımı: kartın sol kenarındaki durum şeridi rengi
  const STATUS_STRIPE = {
    Pending: "#f5b800",
    Approved: "#10b981",
    Rejected: "#ef4444",
    Hidden: "#64748b",
  };
  function stripeColor(status) {
    return STATUS_STRIPE[status] || "#9ca3af";
  }
  function excerpt(text, max = 140) {
    const s = (text || "").trim();
    return s.length > max ? `${s.slice(0, max)}…` : s;
  }

  const activeTab = ref("Pending");
  const reviews = ref([]);
  const loading = ref(false);
  const counts = ref({ pending: 0, approved: 0, rejected: 0, hidden: 0, total: 0 });
  const total = ref(0);
  const page = ref(1);
  const pageSize = 20;
  // Search & filter — server-side
  const searchText = ref("");
  const reviewerEmail = ref("");
  const minRating = ref("");
  let searchDebounce = null;
  const working = ref(null);
  const rejectingId = ref(null);
  const expandedAbuseId = ref(null);
  const dismissingAbuseId = ref(null);
  // Mobil bottom sheet — açık olan değerlendirme (null = kapalı)
  const sheetReview = ref(null);
  function openSheet(r) {
    sheetReview.value = r;
  }
  function closeSheet() {
    sheetReview.value = null;
  }
  // Sheet aksiyonları mevcut moderasyon fonksiyonlarını yeniden kullanır; önce sheet'i kapat.
  function sheetAction(action) {
    const name = sheetReview.value?.name;
    if (!name) return;
    closeSheet();
    doAction(name, action);
  }
  function sheetReject() {
    const name = sheetReview.value?.name;
    if (!name) return;
    closeSheet();
    startReject(name);
  }
  function sheetDelete() {
    const name = sheetReview.value?.name;
    if (!name) return;
    closeSheet();
    confirmDelete(name);
  }
  function sheetDismissAbuse(abuseName, reviewName) {
    closeSheet();
    confirmDismissAbuse(abuseName, reviewName);
  }
  function onKeydown(e) {
    if (e.key === "Escape" && sheetReview.value) closeSheet();
  }

  // Custom confirm dialog (native confirm() yerine, marka uyumlu)
  const confirmDialog = reactive({
    open: false,
    title: "",
    message: "",
    confirmLabel: t("listingReviewModeration.ok"),
    tone: "primary",
    onConfirm: null,
  });
  function openConfirm({
    title,
    message,
    confirmLabel = t("listingReviewModeration.confirm"),
    tone = "primary",
    onConfirm,
  }) {
    confirmDialog.title = title;
    confirmDialog.message = message;
    confirmDialog.confirmLabel = confirmLabel;
    confirmDialog.tone = tone;
    confirmDialog.onConfirm = onConfirm;
    confirmDialog.open = true;
  }
  const ABUSE_AUTO_HIDE_THRESHOLD = 3;

  function abuseReasonLabel(reason) {
    const labels = {
      Spam: t("listingReviewModeration.reasonSpam"),
      "Hate Speech": t("listingReviewModeration.reasonHateSpeech"),
      Fake: t("listingReviewModeration.reasonFake"),
      "Off-topic": t("listingReviewModeration.reasonOffTopic"),
      "Personal Info": t("listingReviewModeration.reasonPersonalInfo"),
      Other: t("listingReviewModeration.reasonOther"),
    };
    return labels[reason] || reason;
  }
  function toggleAbuseDetails(reviewName) {
    expandedAbuseId.value = expandedAbuseId.value === reviewName ? null : reviewName;
  }

  function confirmDismissAbuse(abuseName, reviewName) {
    openConfirm({
      title: t("listingReviewModeration.dismissAbuseTitle"),
      message: t("listingReviewModeration.dismissAbuseMessage"),
      confirmLabel: t("listingReviewModeration.markInvalid"),
      tone: "warning",
      onConfirm: () => doDismissAbuse(abuseName, reviewName),
    });
  }

  async function doDismissAbuse(abuseName, reviewName) {
    dismissingAbuseId.value = abuseName;
    try {
      await api.callMethod("tradehub_core.api.review.admin_dismiss_abuse_report", {
        name: abuseName,
      });
      toast.success(t("listingReviewModeration.abuseDismissedToast"));
      await loadAll();
      expandedAbuseId.value = reviewName;
    } catch (err) {
      toast.error(err?.message || t("listingReviewModeration.actionFailed"));
    } finally {
      dismissingAbuseId.value = null;
    }
  }
  const rejectReason = ref("");

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
  const storefrontBase = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5173/";
  const apiBase = import.meta.env.VITE_API_BASE || "";

  function storefrontUrlFor(listingId) {
    return `${storefrontBase.replace(/\/$/, "")}/pages/product-detail.html?id=${encodeURIComponent(listingId)}`;
  }

  function storefrontImageUrl(p) {
    if (!p) return "";
    if (p.startsWith("http")) return p;
    return `${apiBase || ""}${p}`;
  }

  const palette = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
  ];
  function avatarColor(name) {
    if (!name) return palette[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
    return palette[Math.abs(hash) % palette.length];
  }

  function formatDate(s) {
    if (!s) return "";
    try {
      return new Date(s).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(s).slice(0, 16);
    }
  }

  // Mobil kompakt liste için kısa tarih (ör. "18 Tem") — dar satırda taşmayı önler.
  function formatDateShort(s) {
    if (!s) return "";
    try {
      return new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
    } catch {
      return String(s).slice(0, 10);
    }
  }

  async function loadCounts() {
    try {
      const res = await api.callMethodGET("tradehub_core.api.review.get_admin_review_counts");
      counts.value = res?.message || counts.value;
    } catch (err) {
      console.warn("review counts load failed:", err);
    }
  }

  async function loadReviews() {
    loading.value = true;
    try {
      const args = { page: page.value, page_size: pageSize };
      if (activeTab.value && activeTab.value !== "all") args.status = activeTab.value;
      if (searchText.value.trim()) args.search = searchText.value.trim();
      if (reviewerEmail.value.trim()) args.reviewer = reviewerEmail.value.trim();
      if (minRating.value) args.min_rating = minRating.value;
      const res = await api.callMethodGET("tradehub_core.api.review.get_admin_review_list", args);
      reviews.value = res?.message?.reviews || [];
      total.value = res?.message?.total || 0;
    } catch (err) {
      toast.error(err?.message || t("listingReviewModeration.loadFailed"));
      reviews.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function onSearchInput() {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      page.value = 1;
      loadReviews();
    }, 350);
  }

  function onFilterChange() {
    page.value = 1;
    loadReviews();
  }

  function clearFilters() {
    searchText.value = "";
    reviewerEmail.value = "";
    minRating.value = "";
    page.value = 1;
    loadReviews();
  }

  async function loadAll() {
    await Promise.all([loadCounts(), loadReviews()]);
  }

  async function doAction(name, action) {
    working.value = name;
    try {
      await api.callMethod("tradehub_core.api.review.admin_moderate_review", {
        name,
        action,
      });
      toast.success(t("listingReviewModeration.actionSuccess", { action }));
      await loadAll();
    } catch (err) {
      toast.error(err?.message || t("listingReviewModeration.actionFailed"));
    } finally {
      working.value = null;
    }
  }

  function startReject(name) {
    rejectingId.value = name;
    rejectReason.value = "";
  }
  function cancelReject() {
    rejectingId.value = null;
    rejectReason.value = "";
  }

  async function doReject(name) {
    const reason = rejectReason.value.trim();
    if (reason.length < 5) {
      toast.error(t("listingReviewModeration.rejectReasonTooShort"));
      return;
    }
    working.value = name;
    try {
      await api.callMethod("tradehub_core.api.review.admin_moderate_review", {
        name,
        action: "reject",
        reason,
      });
      toast.success(t("listingReviewModeration.reviewRejectedToast"));
      cancelReject();
      await loadAll();
    } catch (err) {
      toast.error(err?.message || t("listingReviewModeration.actionFailed"));
    } finally {
      working.value = null;
    }
  }

  function confirmDelete(name) {
    openConfirm({
      title: t("listingReviewModeration.deleteReviewTitle"),
      message: t("listingReviewModeration.deleteReviewMessage", { name }),
      confirmLabel: t("listingReviewModeration.permanentDelete"),
      tone: "danger",
      onConfirm: () => doDelete(name),
    });
  }

  async function doDelete(name) {
    working.value = name;
    try {
      await api.callMethod("tradehub_core.api.review.admin_delete_listing_review", { name });
      toast.success(t("listingReviewModeration.reviewDeletedToast"));
      await loadAll();
    } catch (err) {
      toast.error(err?.message || t("listingReviewModeration.deleteFailed"));
    } finally {
      working.value = null;
    }
  }

  function goPage(p) {
    if (p < 1 || p > totalPages.value) return;
    page.value = p;
    loadReviews();
  }

  onMounted(() => {
    loadAll();
    document.addEventListener("keydown", onKeydown);
  });
  onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  // Bottom sheet aksiyon butonları — layout burada, renkler Tailwind semantik utility'lerinden.
  .rvm-sheet-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 14px;
    border-radius: 11px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-fast;

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
</style>
