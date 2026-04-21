<template>
  <Transition name="dropdown">
    <div
      v-if="activeOverlay === 'notifications'"
      id="notificationPanel"
      class="notif-panel"
      @click.stop
    >
      <!-- Header -->
      <div class="notif-header">
        <h3>Bildirimler</h3>
        <button class="notif-mark-all" @click="handleMarkAllRead">Tümünü Okundu İşaretle</button>
      </div>

      <!-- Category Tabs -->
      <div class="notif-tabs scrollbar-hide">
        <button
          v-for="tab in categoryTabs"
          :key="tab.key"
          class="notif-tab"
          :class="{ active: activeCategory === tab.key }"
          @click="activeCategory = tab.key"
        >
          {{ tab.label }}
          <span v-if="getCategoryCount(tab.key)" class="notif-tab-badge">{{
            getCategoryCount(tab.key)
          }}</span>
        </button>
      </div>

      <!-- Notification List -->
      <div class="notif-list">
        <div
          v-for="n in filteredNotifications"
          :key="n.id"
          class="notif-item"
          :class="{ unread: !n.read, clickable: !!n.action_url }"
          @click="handleNotificationClick(n)"
        >
          <div class="notif-dot" :class="`dot-${n.dot}`"></div>
          <div class="notif-content">
            <p class="notif-msg">
              <strong>{{ n.title }}</strong> {{ n.body }}
            </p>
            <p class="notif-time">{{ n.time }}</p>
          </div>
          <svg
            v-if="n.action_url"
            class="notif-arrow"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        <!-- Empty State -->
        <div v-if="filteredNotifications.length === 0" class="notif-empty">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="notif-empty-icon"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
          <p>Bu kategoride bildirim yok</p>
        </div>

        <!-- Load More -->
        <div v-if="notifications.hasNext" class="notif-load-more">
          <button :disabled="notifications.loadingMore" @click="notifications.loadMore()">
            {{ notifications.loadingMore ? "Yükleniyor..." : "Daha fazla yükle" }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="notif-footer">
        <router-link to="/messaging/notifications" class="notif-footer-link" @click="closeOverlay">
          Tüm Bildirimleri Gör
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </router-link>
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { ref, computed } from "vue";
  import { useRouter } from "vue-router";
  import { useNotificationStore } from "@/stores/notification";
  import { useToast } from "@/composables/useToast";
  import { useOverlay } from "@/composables/useOverlay";

  const notifications = useNotificationStore();
  const toast = useToast();
  const router = useRouter();
  const { active: activeOverlay, close: closeOverlay } = useOverlay();

  const activeCategory = ref("all");

  const categoryTabs = [
    { key: "all", label: "Tümü" },
    { key: "order", label: "Siparişler" },
    { key: "rfq", label: "Teklifler" },
    { key: "listing", label: "Ürünler" },
    { key: "review", label: "Değerlendirme" },
    { key: "system", label: "Sistem" },
  ];

  const filteredNotifications = computed(() => {
    if (activeCategory.value === "all") return notifications.notifications;
    return notifications.notifications.filter((n) => n.category === activeCategory.value);
  });

  function getCategoryCount(key) {
    if (key === "all") return notifications.unreadCount;
    return notifications.notifications.filter((n) => n.category === key && !n.read).length;
  }

  function handleNotificationClick(n) {
    notifications.markRead(n.id);
    if (!n.action_url) return;
    closeOverlay();
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
      window.open(url, "_blank");
    }
  }

  function handleMarkAllRead() {
    notifications.markAllRead();
    toast.success("Tüm bildirimler okundu");
  }
</script>

<style scoped>
  /* ── Panel Container ── */
  .notif-panel {
    position: fixed;
    top: 60px;
    right: 8px;
    width: calc(100vw - 16px);
    max-width: 400px;
    background: #1a1a24;
    border: 1px solid #2a2a38;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 50;
    overflow: hidden;
  }

  /* ── Header ── */
  .notif-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px 12px;
    border-bottom: 1px solid #222230;
  }
  .notif-header h3 {
    font-size: 14px;
    font-weight: 700;
    color: #e8e8f0;
    margin: 0;
  }
  .notif-mark-all {
    font-size: 11px;
    font-weight: 500;
    color: #a78bfa;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.12s;
  }
  .notif-mark-all:hover {
    color: #c4b5fd;
  }

  /* ── Tabs ── */
  .notif-tabs {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 14px;
    border-bottom: 1px solid #222230;
    overflow-x: auto;
  }
  .notif-tab {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 500;
    padding: 10px 10px;
    color: #5c5c74;
    border: none;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    cursor: pointer;
    background: none;
    transition: all 0.12s;
  }
  .notif-tab:hover {
    color: #8888a0;
  }
  .notif-tab.active {
    color: #a78bfa;
    border-bottom-color: #7c3aed;
    font-weight: 600;
  }
  .notif-tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: #7c3aed;
    color: white;
    line-height: 1;
  }

  /* ── Notification List ── */
  .notif-list {
    max-height: 340px;
    overflow-y: auto;
  }

  .notif-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 18px;
    transition: background 0.12s;
    border-bottom: 1px solid #1e1e28;
  }
  .notif-item:last-child {
    border-bottom: none;
  }
  .notif-item:hover {
    background: #1e1e2c;
  }
  .notif-item.unread {
    background: rgba(124, 58, 237, 0.06);
  }
  .notif-item.unread:hover {
    background: rgba(124, 58, 237, 0.1);
  }
  .notif-item.clickable {
    cursor: pointer;
  }

  /* ── Dot ── */
  .notif-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 5px;
    flex-shrink: 0;
  }
  .dot-blue {
    background: #7c3aed;
  }
  .dot-green {
    background: #10b981;
  }
  .dot-amber {
    background: #f59e0b;
  }
  .dot-red {
    background: #ef4444;
  }
  .dot-gray {
    background: #3a3a4a;
  }

  /* ── Content ── */
  .notif-content {
    flex: 1;
    min-width: 0;
  }
  .notif-msg {
    font-size: 12px;
    color: #c8c8d8;
    line-height: 1.5;
    margin: 0;
  }
  .notif-msg :deep(b) {
    color: #e8e8f0;
    font-weight: 600;
  }
  .notif-time {
    font-size: 10px;
    color: #5c5c74;
    margin: 3px 0 0;
  }

  /* ── Arrow ── */
  .notif-arrow {
    color: #3a3a4a;
    margin-top: 4px;
    flex-shrink: 0;
    transition: color 0.12s;
  }
  .notif-item:hover .notif-arrow {
    color: #7c3aed;
  }

  /* ── Empty State ── */
  .notif-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 36px 20px;
  }
  .notif-empty-icon {
    color: #2a2a3a;
    margin-bottom: 10px;
  }
  .notif-empty p {
    font-size: 12px;
    color: #5c5c74;
    margin: 0;
  }

  /* ── Load More ── */
  .notif-load-more {
    padding: 10px 18px;
    text-align: center;
    border-top: 1px solid #1e1e28;
  }
  .notif-load-more button {
    font-size: 11px;
    font-weight: 500;
    color: #a78bfa;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 12px;
    border-radius: 6px;
    transition: all 0.12s;
  }
  .notif-load-more button:hover:not(:disabled) {
    background: rgba(124, 58, 237, 0.08);
    color: #c4b5fd;
  }
  .notif-load-more button:disabled {
    color: #5c5c74;
    cursor: default;
  }

  /* ── Footer ── */
  .notif-footer {
    padding: 12px 18px;
    border-top: 1px solid #222230;
    text-align: center;
  }
  .notif-footer-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #a78bfa;
    text-decoration: none;
    transition: color 0.12s;
  }
  .notif-footer-link:hover {
    color: #c4b5fd;
  }

  /* ── Scrollbar ── */
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .notif-list::-webkit-scrollbar {
    width: 4px;
  }
  .notif-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .notif-list::-webkit-scrollbar-thumb {
    background: #2a2a38;
    border-radius: 2px;
  }
  .notif-list::-webkit-scrollbar-thumb:hover {
    background: #3a3a4a;
  }
</style>
