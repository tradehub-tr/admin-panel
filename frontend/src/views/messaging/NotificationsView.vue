<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-lg font-bold text-gray-800">{{ t("notifications.title") }}</h1>
      <div class="flex items-center gap-3" data-tour="ntf-actions">
        <button
          v-if="notifications.hasUnread"
          class="text-xs text-brand-800 hover:text-brand-900 font-medium"
          @click="handleMarkAllRead"
        >
          {{ t("notifications.markAllRead") }}
        </button>
        <ViewModeToggle v-model="viewMode" :modes="['table', 'list']" />
      </div>
    </div>

    <!-- Category Tabs -->
    <div
      class="flex items-center gap-1 border-b border-gray-200 mb-4 overflow-x-auto scrollbar-hide"
      data-tour="ntf-tabs"
    >
      <button
        v-for="tab in categoryTabs"
        :key="tab.key"
        class="notif-page-tab"
        :class="{ active: activeCategory === tab.key }"
        @click="activeCategory = tab.key"
      >
        {{ tab.label }}
        <span v-if="getCategoryCount(tab.key)" class="notif-page-badge">{{
          getCategoryCount(tab.key)
        }}</span>
      </button>
    </div>

    <div data-tour="ntf-list">
      <div v-if="filteredNotifications.length === 0" class="py-16 text-center">
        <p class="text-sm text-gray-400">{{ t("notifications.emptyCategory") }}</p>
      </div>

      <!-- List View (default) -->
      <div v-else-if="viewMode === 'list'" class="space-y-1">
        <div
          v-for="n in filteredNotifications"
          :key="n.id"
          class="flex items-start gap-3 p-4 rounded-lg border transition-colors"
          :class="n.read ? 'bg-white border-gray-100' : 'bg-brand-50/30 border-brand-100'"
          :style="{ cursor: n.action_url ? 'pointer' : 'default' }"
          @click="handleClick(n)"
        >
          <div
            class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
            :class="`notif-dot-${n.dot}`"
          ></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-800">
              <strong>{{ n.title }}</strong> {{ n.body }}
            </p>
            <p class="text-xs text-gray-400 mt-1">{{ n.time }}</p>
          </div>
        </div>
      </div>

      <!-- Table View -->
      <div v-else class="card p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-100 dark:border-white/10">
                <th class="tbl-th">{{ t("cannedResponses.colTitle") }}</th>
                <th class="tbl-th">{{ t("cannedResponses.colCategory") }}</th>
                <th class="tbl-th">{{ t("cannedResponses.colStatus") }}</th>
                <th class="tbl-th">{{ t("leadsList.colDate") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="n in filteredNotifications"
                :key="n.id"
                class="tbl-row border-b border-gray-50 dark:border-white/5"
                :style="{ cursor: n.action_url ? 'pointer' : 'default' }"
                @click="handleClick(n)"
              >
                <td class="tbl-td">
                  <div class="flex items-start gap-2.5">
                    <span
                      class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                      :class="`notif-dot-${n.dot}`"
                    ></span>
                    <p class="text-xs text-gray-800 whitespace-normal">
                      <strong>{{ n.title }}</strong> {{ n.body }}
                    </p>
                  </div>
                </td>
                <td class="tbl-td">
                  <span class="text-xs text-gray-500">{{ categoryLabel(n.category) }}</span>
                </td>
                <td class="tbl-td">
                  <span
                    v-if="!n.read"
                    class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-800"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                    {{ t("buyerMessages.unread") }}
                  </span>
                  <span v-else class="text-xs text-gray-400">—</span>
                </td>
                <td class="tbl-td">
                  <span class="text-[11px] text-gray-500">{{ n.time }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Load More -->
    <div v-if="filteredNotifications.length > 0 && notifications.hasNext" class="pt-4 text-center">
      <button
        :disabled="notifications.loadingMore"
        class="load-more-btn"
        @click="notifications.loadMore()"
      >
        {{ notifications.loadingMore ? t("notifications.loading") : t("notifications.loadMore") }}
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";
  import { useNotificationStore } from "@/stores/notification";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { usePageTour } from "@/composables/usePageTour";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";

  const { t } = useI18n();
  const notifications = useNotificationStore();
  const toast = useToast();
  const router = useRouter();

  // Sayfa-içi onboarding: kategori sekmeleri → bildirim listesi → toplu işlemler.
  usePageTour("notifications", () => [
    {
      target: '[data-tour="ntf-tabs"]',
      title: t("tourSteps.page.ntfTabs_t"),
      desc: t("tourSteps.page.ntfTabs_d"),
    },
    {
      target: '[data-tour="ntf-list"]',
      title: t("tourSteps.page.ntfList_t"),
      desc: t("tourSteps.page.ntfList_d"),
    },
    {
      target: '[data-tour="ntf-actions"]',
      title: t("tourSteps.page.ntfActions_t"),
      desc: t("tourSteps.page.ntfActions_d"),
    },
  ]);

  const { viewMode } = useListViewMode("notifications", "list");

  const activeCategory = ref("all");

  const categoryTabs = computed(() => [
    { key: "all", label: t("notifications.tabAll") },
    { key: "order", label: t("notifications.tabOrders") },
    { key: "rfq", label: t("notifications.tabRfq") },
    { key: "listing", label: t("notifications.tabProducts") },
    { key: "review", label: t("notifications.tabReviews") },
    { key: "system", label: t("notifications.tabSystem") },
  ]);

  const categoryLabel = (key) =>
    categoryTabs.value.find((tab) => tab.key === key)?.label ?? t("notifications.tabAll");

  const filteredNotifications = computed(() => {
    if (activeCategory.value === "all") return notifications.notifications;
    return notifications.notifications.filter((n) => n.category === activeCategory.value);
  });

  function getCategoryCount(key) {
    if (key === "all") return notifications.unreadCount;
    return notifications.notifications.filter((n) => n.category === key && !n.read).length;
  }

  /** action_url whitelist (#5) — backend sanitize ediyor, bu da defansif. */
  function isSafeActionUrl(url) {
    if (!url || typeof url !== "string") return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
    if (trimmed.toLowerCase().startsWith("https://")) {
      try {
        return new URL(trimmed).protocol === "https:";
      } catch {
        return false;
      }
    }
    return false;
  }

  function handleClick(n) {
    notifications.markRead(n.id);
    if (!n.action_url) return;
    if (!isSafeActionUrl(n.action_url)) {
      console.warn("[NotificationsView] Güvensiz action_url, açılmadı:", n.action_url);
      return;
    }
    const url = n.action_url;
    if (url.startsWith("/panel/")) {
      router.push(url.slice("/panel".length) || "/");
    } else if (
      url.startsWith("/seller/") ||
      url.startsWith("/dashboard") ||
      url.startsWith("/seller-")
    ) {
      router.push(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function handleMarkAllRead() {
    notifications.markAllRead();
    toast.success(t("notifications.allMarkedRead"));
  }
</script>

<style scoped>
  .notif-page-tab {
    display: inline-flex;
    align-items: center;
    font-size: 13px;
    font-weight: 500;
    padding: 10px 14px;
    color: #9ca3af;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    cursor: pointer;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    transition: all 0.15s;
  }
  .notif-page-tab:hover {
    color: #6b7280;
  }
  .notif-page-tab.active {
    color: #8a6a00;
    border-bottom-color: #f5b800;
    font-weight: 600;
  }
  .notif-page-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    margin-left: 6px;
    background: #ef4444;
    color: white;
  }
  .load-more-btn {
    font-size: 13px;
    font-weight: 500;
    color: #8a6a00;
    background: none;
    border: 1px solid #e5e7eb;
    padding: 8px 24px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .load-more-btn:hover:not(:disabled) {
    background: #f5f3ff;
    border-color: #f5b800;
  }
  .load-more-btn:disabled {
    color: #9ca3af;
    cursor: default;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
