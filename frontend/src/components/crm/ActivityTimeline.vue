<template>
  <div>
    <div v-if="loading" class="text-center py-6">
      <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
    </div>

    <div v-else-if="!items.length" class="crm-empty">
      <div class="icon"><AppIcon name="activity" :size="22" /></div>
      <h3>Aktivite yok</h3>
      <p>Yorum ekleyerek veya işlem yaparak zaman çizelgesi oluşacak.</p>
    </div>

    <div v-else class="crm-timeline">
      <div
        v-for="item in items"
        :key="item.name || item.creation"
        class="crm-timeline-item"
      >
        <div class="crm-timeline-header">
          <UserAvatar :email="item.owner" size="sm" />
          <span class="actor">{{ ownerLabel(item.owner) }}</span>
          <span class="action">{{ actionLabel(item) }}</span>
          <span class="time"><RelativeTime :value="item.creation" /></span>
        </div>
        <div
          v-if="item.content || item.data || item.comment"
          class="crm-timeline-content"
          v-html="sanitizedContent(item)"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import AppIcon from '@/components/common/AppIcon.vue'
import UserAvatar from './UserAvatar.vue'
import RelativeTime from './RelativeTime.vue'

defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

function ownerLabel(email) {
  if (!email) return 'Sistem'
  return email.split('@')[0]
}

function actionLabel(item) {
  const t = item.activity_type || item.comment_type || ''
  const MAP = {
    comment: 'yorum ekledi',
    Comment: 'yorum ekledi',
    creation: 'kaydı oluşturdu',
    updated: 'güncelledi',
    Assigned: 'atadı',
    status_changed: 'durumu değiştirdi',
    email: 'e-posta gönderdi',
    call_log: 'arama kaydı ekledi',
    'Like': 'beğendi',
  }
  return MAP[t] || t || 'güncelledi'
}

function sanitizedContent(item) {
  const raw = item.content || item.data || item.comment || ''
  if (typeof raw !== 'string') return String(raw)
  // Basit sanitize — <script>/<style> tag'lerini temizle
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
}
</script>
