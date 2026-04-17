<template>
  <span class="crm-avatar-stack">
    <UserAvatar
      v-for="u in visibleUsers"
      :key="u.email || u.name"
      :email="u.email"
      :name="u.full_name || u.name"
      :image="u.user_image"
      size="sm"
    />
    <span v-if="extra > 0" class="crm-avatar crm-avatar-sm" :title="`+${extra} daha`">
      +{{ extra }}
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import UserAvatar from './UserAvatar.vue'

const props = defineProps({
  users: { type: Array, default: () => [] },
  limit: { type: Number, default: 3 },
})

const visibleUsers = computed(() => props.users.slice(0, props.limit))
const extra = computed(() => Math.max(0, props.users.length - props.limit))
</script>
