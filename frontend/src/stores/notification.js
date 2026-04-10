import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

const MAX_CONSECUTIVE_ERRORS = 5
const PAGE_SIZE = 20

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const serverUnreadCount = ref(0)
  const unreadCount = computed(() => serverUnreadCount.value)
  const hasUnread = computed(() => unreadCount.value > 0)

  // Pagination state
  const currentPage = ref(1)
  const hasNext = ref(false)
  const totalCount = ref(0)
  const loadingMore = ref(false)

  let intervalId = null
  let errorCount = 0

  // Kategori → dot renk mapping
  const DOT_COLORS = {
    order: 'green',
    rfq: 'blue',
    stock: 'amber',
    review: 'blue',
    listing: 'blue',
    dispute: 'red',
    system: 'gray',
    promo: 'green',
  }

  // Zaman farkı hesapla
  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Az önce'
    if (mins < 60) return `${mins} dakika önce`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} saat önce`
    const days = Math.floor(hours / 24)
    return `${days} gün önce`
  }

  function _mapNotification(n) {
    return {
      id: n.name,
      category: n.type,
      title: n.title || '',
      body: n.message || '',
      time: timeAgo(n.creation),
      read: !!n.is_read,
      dot: n.is_read ? 'gray' : (DOT_COLORS[n.type] || 'blue'),
      action_url: n.action_url,
      role: n.recipient_role || '',
      reference_doctype: n.reference_doctype || '',
      reference_name: n.reference_name || '',
    }
  }

  // Backend'den bildirimleri çek (ilk sayfa — polling ve initial load)
  async function fetchNotifications() {
    if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
      console.warn('[NotificationStore] Too many errors, stopping polling')
      stopPolling()
      return
    }

    try {
      const res = await api.callMethodGET(
        'tradehub_core.api.notification.get_notifications',
        { page: 1, page_size: PAGE_SIZE }
      )
      const result = res.message

      errorCount = 0
      currentPage.value = 1
      hasNext.value = !!result.has_next
      totalCount.value = result.total || 0
      serverUnreadCount.value = result.unread_count || 0
      notifications.value = (result.data || []).map(_mapNotification)
    } catch (err) {
      errorCount++
      console.warn(`[NotificationStore] fetchNotifications error (${errorCount}/${MAX_CONSECUTIVE_ERRORS}):`, err)
    }
  }

  // Sonraki sayfayı yükle — mevcut listeye ekler
  async function loadMore() {
    if (!hasNext.value || loadingMore.value) return

    loadingMore.value = true
    try {
      const nextPage = currentPage.value + 1
      const res = await api.callMethodGET(
        'tradehub_core.api.notification.get_notifications',
        { page: nextPage, page_size: PAGE_SIZE }
      )
      const result = res.message

      currentPage.value = nextPage
      hasNext.value = !!result.has_next
      totalCount.value = result.total || 0

      const newItems = (result.data || []).map(_mapNotification)
      // Duplicate kontrolü — polling sırasında aynı bildirim tekrar gelebilir
      const existingIds = new Set(notifications.value.map(n => n.id))
      const uniqueNew = newItems.filter(n => !existingIds.has(n.id))
      notifications.value.push(...uniqueNew)
    } catch (err) {
      console.warn('[NotificationStore] loadMore error:', err)
    } finally {
      loadingMore.value = false
    }
  }

  async function markAllRead() {
    try {
      await api.callMethod('tradehub_core.api.notification.mark_all_read')
      notifications.value.forEach(n => { n.read = true; n.dot = 'gray' })
      serverUnreadCount.value = 0
    } catch (err) {
      console.warn('[NotificationStore] markAllRead error:', err)
    }
  }

  async function markRead(id) {
    try {
      await api.callMethod('tradehub_core.api.notification.mark_read', {
        notification_name: id,
      })
      const n = notifications.value.find(n => n.id === id)
      if (n && !n.read) {
        n.read = true
        n.dot = 'gray'
        serverUnreadCount.value = Math.max(0, serverUnreadCount.value - 1)
      } else if (n) {
        n.read = true
        n.dot = 'gray'
      }
    } catch (err) {
      console.warn('[NotificationStore] markRead error:', err)
    }
  }

  function startPolling() {
    errorCount = 0
    fetchNotifications()
    intervalId = setInterval(() => {
      if (!document.hidden) fetchNotifications()
    }, 30_000)
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return {
    notifications,
    unreadCount,
    hasUnread,
    hasNext,
    totalCount,
    loadingMore,
    markAllRead,
    markRead,
    fetchNotifications,
    loadMore,
    startPolling,
    stopPolling,
  }
})
