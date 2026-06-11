<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("categoryModeration.title") }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ t("categoryModeration.subtitle") }}
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap" data-tour="cmod-views">
        <ViewModeToggle v-model="viewMode" />
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadCategories">
          <AppIcon name="refresh-cw" :size="13" />
          {{ t("categoryModeration.refresh") }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">{{ t("categoryModeration.loading") }}</p>
    </div>

    <div v-else-if="categories.length === 0" class="card text-center py-12">
      <AppIcon name="check-circle" :size="32" class="text-emerald-400 mx-auto mb-3" />
      <p class="text-sm text-gray-400">{{ t("categoryModeration.empty") }}</p>
    </div>

    <!-- Table (default fallback when viewMode is unknown) -->
    <div
      v-else-if="!['grid', 'list', 'kanban'].includes(viewMode)"
      class="card overflow-hidden p-0"
      data-tour="cmod-table"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryModeration.colCategoryName") }}
            </th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryModeration.colSeller") }}
            </th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryModeration.colDescription") }}
            </th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryModeration.colDate") }}
            </th>
            <th
              class="text-center text-xs font-semibold text-gray-500 px-4 py-3"
              data-tour="cmod-actions"
            >
              {{ t("categoryModeration.colAction") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
          <tr
            v-for="cat in categories"
            :key="cat.name"
            class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <img v-if="cat.image" :src="cat.image" class="w-8 h-8 rounded object-cover" />
                <div
                  v-else
                  class="w-8 h-8 rounded bg-gray-100 dark:bg-[#2a2a35] flex items-center justify-center"
                >
                  <AppIcon name="folder" :size="14" class="text-gray-400" />
                </div>
                <span class="font-medium text-xs text-gray-800 dark:text-gray-200">{{
                  cat.category_name
                }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
              {{ cat.seller_name }}
            </td>
            <td
              class="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate"
              :title="cat.description"
            >
              {{ cat.description || "—" }}
            </td>
            <td class="px-4 py-3 text-center text-xs text-gray-500">
              {{ formatDate(cat.creation) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-center gap-2">
                <button
                  :disabled="processingId === cat.name"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
                  @click="handleAction(cat, 'approve')"
                >
                  <AppIcon
                    v-if="processingId === cat.name"
                    name="loader"
                    :size="11"
                    class="animate-spin"
                  />
                  <AppIcon v-else name="check" :size="11" />
                  {{ t("categoryModeration.approve") }}
                </button>
                <button
                  :disabled="processingId === cat.name"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
                  @click="openRejectModal(cat)"
                >
                  <AppIcon name="x" :size="11" />
                  {{ t("categoryModeration.reject") }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grid (cards) -->
    <div v-else-if="viewMode === 'grid'" class="cat-grid">
      <div v-for="cat in categories" :key="cat.name" class="cat-grid-card">
        <div class="flex items-start gap-2 mb-3">
          <img
            v-if="cat.image"
            :src="cat.image"
            class="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
          <div
            v-else
            class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#2a2a35] flex items-center justify-center flex-shrink-0"
          >
            <AppIcon name="folder" :size="16" class="text-gray-400" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="cat-grid-card-title truncate">{{ cat.category_name }}</p>
            <p class="text-[11px] text-gray-400 truncate">{{ cat.seller_name }}</p>
          </div>
          <span :class="['cat-status-badge', statusBadgeClass(statusOf(cat))]">{{
            statusOf(cat)
          }}</span>
        </div>
        <p
          class="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 min-h-[2rem]"
          :title="cat.description"
        >
          {{ cat.description || "—" }}
        </p>
        <div class="cat-grid-card-meta mb-3">
          <span>{{ formatDate(cat.creation) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            :disabled="processingId === cat.name"
            class="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
            @click="handleAction(cat, 'approve')"
          >
            <AppIcon
              v-if="processingId === cat.name"
              name="loader"
              :size="11"
              class="animate-spin"
            />
            <AppIcon v-else name="check" :size="11" />
            {{ t("categoryModeration.approve") }}
          </button>
          <button
            :disabled="processingId === cat.name"
            class="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
            @click="openRejectModal(cat)"
          >
            <AppIcon name="x" :size="11" />
            {{ t("categoryModeration.reject") }}
          </button>
        </div>
      </div>
    </div>

    <!-- List (compact) -->
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div v-for="cat in categories" :key="cat.name" class="cat-list-item">
        <img v-if="cat.image" :src="cat.image" class="w-8 h-8 rounded object-cover flex-shrink-0" />
        <div
          v-else
          class="w-8 h-8 rounded bg-gray-100 dark:bg-[#2a2a35] flex items-center justify-center flex-shrink-0"
        >
          <AppIcon name="folder" :size="13" class="text-gray-400" />
        </div>
        <span
          class="flex-1 min-w-0 truncate text-xs font-medium text-gray-800 dark:text-gray-200"
          >{{ cat.category_name }}</span
        >
        <span :class="['cat-status-badge', statusBadgeClass(statusOf(cat))]">{{
          statusOf(cat)
        }}</span>
        <span class="text-xs text-gray-400 hidden sm:inline truncate max-w-[140px]">{{
          cat.seller_name
        }}</span>
        <span class="text-xs text-gray-400 hidden md:inline">{{ formatDate(cat.creation) }}</span>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button
            :disabled="processingId === cat.name"
            class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
            :title="t('categoryModeration.approve')"
            @click="handleAction(cat, 'approve')"
          >
            <AppIcon name="check" :size="13" />
          </button>
          <button
            :disabled="processingId === cat.name"
            class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-60"
            :title="t('categoryModeration.reject')"
            @click="openRejectModal(cat)"
          >
            <AppIcon name="x" :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- Kanban (moderasyon durumuna göre: Pending / Active / Rejected) -->
    <!-- Onay/red sürükleyerek değil, kartlardaki mevcut buton akışından yapılır → :draggable="false" -->
    <div v-else-if="viewMode === 'kanban'">
      <KanbanBoard
        :items="categories"
        :columns="kanbanColumns"
        status-field="status"
        :draggable="false"
      >
        <template #card="{ item }">
          <div class="flex items-center gap-2 mb-2">
            <img
              v-if="item.image"
              :src="item.image"
              class="w-8 h-8 rounded object-cover flex-shrink-0"
            />
            <div
              v-else
              class="w-8 h-8 rounded bg-gray-100 dark:bg-[#2a2a35] flex items-center justify-center flex-shrink-0"
            >
              <AppIcon name="folder" :size="12" class="text-gray-400" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                {{ item.category_name }}
              </div>
              <div class="text-[10px] text-gray-400 truncate">{{ item.seller_name }}</div>
            </div>
          </div>
          <div class="flex items-center justify-between text-[10px] text-gray-400 mb-2">
            <span>{{ formatDate(item.creation) }}</span>
          </div>
          <div class="flex items-center gap-1.5" @click.stop>
            <button
              :disabled="processingId === item.name"
              class="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors disabled:opacity-60"
              @click="handleAction(item, 'approve')"
            >
              <AppIcon name="check" :size="10" />
              {{ t("categoryModeration.approve") }}
            </button>
            <button
              :disabled="processingId === item.name"
              class="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-60"
              @click="openRejectModal(item)"
            >
              <AppIcon name="x" :size="10" />
              {{ t("categoryModeration.reject") }}
            </button>
          </div>
        </template>
      </KanbanBoard>
    </div>

    <!-- Pagination -->
    <div
      v-if="total > pageSize"
      class="flex items-center justify-between mt-4 text-sm text-gray-500"
    >
      <span>{{ t("categoryModeration.totalCount", { count: total }) }}</span>
      <div class="flex items-center gap-2">
        <button
          :disabled="page <= 1"
          class="px-3 py-1 border rounded disabled:opacity-40"
          @click="prevPage"
        >
          ← {{ t("categoryModeration.prev") }}
        </button>
        <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
        <button
          :disabled="page >= Math.ceil(total / pageSize)"
          class="px-3 py-1 border rounded disabled:opacity-40"
          @click="nextPage"
        >
          {{ t("categoryModeration.next") }} →
        </button>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="rejectModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="rejectModal.show = false"></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[420px] max-w-[calc(100vw-32px)]"
      >
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
          {{ t("categoryModeration.rejectReasonTitle") }}
        </h3>
        <p class="text-xs text-gray-400 mb-3">
          <strong>{{ rejectModal.cat?.category_name }}</strong>
          {{ t("categoryModeration.rejectConfirm") }}
        </p>
        <textarea
          v-model="rejectModal.reason"
          rows="3"
          :placeholder="t('categoryModeration.rejectPlaceholder')"
          class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
        ></textarea>
        <div class="flex gap-3 justify-end mt-4">
          <button class="hdr-btn-outlined" @click="rejectModal.show = false">
            {{ t("categoryModeration.cancel") }}
          </button>
          <button :disabled="processingId !== null" class="hdr-btn-danger" @click="confirmReject">
            <AppIcon v-if="processingId" name="loader" :size="13" class="animate-spin" />
            {{ t("categoryModeration.reject") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { usePageTour } from "@/composables/usePageTour";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import KanbanBoard from "@/components/common/KanbanBoard.vue";

  const { t } = useI18n();
  const toast = useToast();
  const { viewMode } = useListViewMode("category-moderation", "table");

  // Sayfa-içi onboarding: görünüm seçimi → talep tablosu → onay/red aksiyonları.
  usePageTour("category-moderation", () => [
    {
      target: '[data-tour="cmod-views"]',
      title: t("tourSteps.page.cmodViews_t"),
      desc: t("tourSteps.page.cmodViews_d"),
    },
    {
      target: '[data-tour="cmod-table"]',
      title: t("tourSteps.page.cmodTable_t"),
      desc: t("tourSteps.page.cmodTable_d"),
    },
    {
      target: '[data-tour="cmod-actions"]',
      title: t("tourSteps.page.cmodActions_t"),
      desc: t("tourSteps.page.cmodActions_d"),
    },
  ]);

  // Seller Category.status Select değerleri (seller_category.json): Pending / Active / Rejected.
  // Bu view backend'ten yalnız Pending kayıt çeker; status field dönmediği için varsayılan "Pending".
  const statusOf = (cat) => cat.status || "Pending";

  const kanbanColumns = [
    { value: "Pending", label: "Pending", color: "#f59e0b" },
    { value: "Active", label: "Active", color: "#10b981" },
    { value: "Rejected", label: "Rejected", color: "#ef4444" },
  ];

  const STATUS_BADGE = {
    Pending: "is-pending",
    Active: "is-active",
    Rejected: "is-rejected",
  };
  const statusBadgeClass = (s) => STATUS_BADGE[s] || "is-pending";
  const categories = ref([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const pageSize = 20;
  const processingId = ref(null);
  const rejectModal = ref({ show: false, cat: null, reason: "" });

  async function loadCategories() {
    loading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.seller.get_pending_seller_categories", {
        page: page.value,
        page_size: pageSize,
      });
      categories.value = res.message?.categories || [];
      total.value = res.message?.total || 0;
    } catch (err) {
      toast.error(err.message || t("categoryModeration.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function handleAction(cat, action, rejectReason = "") {
    processingId.value = cat.name;
    try {
      await api.callMethod(
        "tradehub_core.api.seller.approve_seller_category",
        {
          category_name: cat.name,
          action,
          reject_reason: rejectReason,
        },
        true
      );
      const msgKey =
        action === "approve" ? "categoryModeration.approved" : "categoryModeration.rejected";
      toast.success(t(msgKey, { name: cat.category_name }));
      await loadCategories();
    } catch (err) {
      toast.error(err.message || t("categoryModeration.actionFailed"));
    } finally {
      processingId.value = null;
    }
  }

  function openRejectModal(cat) {
    rejectModal.value = { show: true, cat, reason: "" };
  }

  async function confirmReject() {
    const { cat, reason } = rejectModal.value;
    rejectModal.value.show = false;
    await handleAction(cat, "reject", reason);
  }

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function prevPage() {
    if (page.value > 1) {
      page.value--;
      loadCategories();
    }
  }
  function nextPage() {
    if (page.value < Math.ceil(total.value / pageSize)) {
      page.value++;
      loadCategories();
    }
  }

  onMounted(loadCategories);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .cat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.75rem;
  }
  .cat-grid-card {
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 0.75rem;
    padding: 0.875rem;
    transition: border-color $t-fast;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
    &:hover {
      border-color: $brand;
    }
  }
  .cat-grid-card-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: $l-text-700;
    @include dark {
      color: $d-text-hi;
    }
  }
  .cat-grid-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.6875rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }

  .cat-list-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 1rem;
    border-bottom: 1px solid $l-border;
    transition: background $t-fast;
    @include dark {
      border-color: $d-border;
    }
    &:last-child {
      border-bottom: none;
    }
    &:hover {
      background: $l-bg-soft;
      @include dark {
        background: $d-bg-hover;
      }
    }
  }

  .cat-status-badge {
    flex-shrink: 0;
    font-size: 0.625rem;
    font-weight: 600;
    border-radius: 999px;
    padding: 0.0625rem 0.5rem;
    line-height: 1.4;
    &.is-pending {
      color: $c-warning;
      background: rgba(245, 158, 11, 0.12);
    }
    &.is-active {
      color: $c-success;
      background: rgba(16, 185, 129, 0.12);
    }
    &.is-rejected {
      color: $c-error;
      background: rgba(239, 68, 68, 0.12);
    }
  }
</style>
