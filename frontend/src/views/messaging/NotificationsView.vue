<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-lg font-bold text-gray-800">Bildirimler</h1>
      <button
        v-if="notifications.hasUnread"
        @click="handleMarkAllRead"
        class="text-xs text-violet-600 hover:text-violet-700 font-medium"
      >
        Tümünü Okundu İşaretle
      </button>
    </div>

    <!-- Category Tabs -->
    <div class="flex items-center gap-1 border-b border-gray-200 mb-4 overflow-x-auto scrollbar-hide">
      <button
        v-for="tab in categoryTabs"
        :key="tab.key"
        class="notif-page-tab"
        :class="{ active: activeCategory === tab.key }"
        @click="activeCategory = tab.key"
      >
        {{ tab.label }}
        <span v-if="getCategoryCount(tab.key)" class="notif-page-badge">{{ getCategoryCount(tab.key) }}</span>
      </button>
    </div>

    <!-- Notification List -->
    <div class="space-y-1">
      <div
        v-for="n in filteredNotifications"
        :key="n.id"
        class="flex items-start gap-3 p-4 rounded-lg border transition-colors"
        :class="n.read ? 'bg-white border-gray-100' : 'bg-violet-50/30 border-violet-100'"
        @click="handleClick(n)"
        :style="{ cursor: n.action_url ? 'pointer' : 'default' }"
      >
        <div class="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" :class="`notif-dot-${n.dot}`"></div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-800"><strong>{{ n.title }}</strong> {{ n.body }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ n.time }}</p>
        </div>
      </div>

      <div v-if="filteredNotifications.length === 0" class="py-16 text-center">
        <p class="text-sm text-gray-400">Bu kategoride bildirim yok</p>
      </div>

      <!-- Load More -->
      <div v-if="notifications.hasNext" class="pt-4 text-center">
        <button
          @click="notifications.loadMore()"
          :disabled="notifications.loadingMore"
          class="load-more-btn"
        >
          {{ notifications.loadingMore ? 'Yükleniyor...' : 'Daha fazla yükle' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import { useToast } from '@/composables/useToast'

const notifications = useNotificationStore()
const toast = useToast()
const router = useRouter()

const activeCategory = ref('all')

const categoryTabs = [
  { key: 'all', label: 'Tümü' },
  { key: 'order', label: 'Siparişler' },
  { key: 'rfq', label: 'Teklifler' },
  { key: 'listing', label: 'Ürünler' },
  { key: 'review', label: 'Değerlendirme' },
  { key: 'system', label: 'Sistem' },
]

const filteredNotifications = computed(() => {
  if (activeCategory.value === 'all') return notifications.notifications
  return notifications.notifications.filter(n => n.category === activeCategory.value)
})

function getCategoryCount(key) {
  if (key === 'all') return notifications.unreadCount
  return notifications.notifications.filter(n => n.category === key && !n.read).length
}

function handleClick(n) {
  notifications.markRead(n.id)
  if (!n.action_url) return
  const url = n.action_url
  if (url.startsWith('/panel/')) {
    router.push(url.slice('/panel'.length) || '/')
  } else if (url.startsWith('/seller/') || url.startsWith('/dashboard') || url.startsWith('/seller-')) {
    router.push(url)
  } else {
    window.open(url, '_blank')
  }
}

function handleMarkAllRead() {
  notifications.markAllRead()
  toast.success('Tüm bildirimler okundu')
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
  color: #7c3aed;
  border-bottom-color: #7c3aed;
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
  color: #7c3aed;
  background: none;
  border: 1px solid #e5e7eb;
  padding: 8px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.load-more-btn:hover:not(:disabled) {
  background: #f5f3ff;
  border-color: #7c3aed;
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
