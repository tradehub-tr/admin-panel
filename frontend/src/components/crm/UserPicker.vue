<template>
  <div class="relative">
    <button
      type="button"
      class="w-full flex items-center gap-2 px-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg dark:bg-white/5 dark:border-white/10 dark:text-gray-100 hover:border-violet-300 transition-all"
      @click="open = !open"
    >
      <UserAvatar v-if="modelValue" :email="modelValue" size="sm" />
      <AppIcon v-else name="user-plus" :size="14" class="text-gray-400" />
      <span class="flex-1 text-left truncate">
        {{ displayLabel }}
      </span>
      <AppIcon name="chevron-down" :size="13" class="text-gray-400" />
    </button>
    <div
      v-if="open"
      class="absolute z-20 mt-1 w-full bg-white dark:bg-[#1e1e28] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto"
    >
      <input
        ref="searchRef"
        v-model="q"
        type="text"
        placeholder="Kullanıcı ara..."
        class="w-full px-3 py-2 text-[12px] border-b border-gray-100 dark:border-white/10 outline-none bg-transparent"
      />
      <button
        v-if="allowEmpty"
        class="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500"
        @click="pick(null)"
      >
        — Atama yok —
      </button>
      <button
        v-for="u in filtered"
        :key="u.name || u.email"
        class="w-full flex items-center gap-2 text-left px-3 py-2 text-[12px] hover:bg-violet-50 dark:hover:bg-violet-500/10"
        :class="modelValue === (u.email || u.name) ? 'bg-violet-50 dark:bg-violet-500/10' : ''"
        @click="pick(u.email || u.name)"
      >
        <UserAvatar :email="u.email || u.name" :name="u.full_name" :image="u.user_image" size="sm" />
        <div class="min-w-0">
          <div class="truncate text-gray-800 dark:text-gray-100">{{ u.full_name || u.name }}</div>
          <div class="text-[10px] text-gray-400 truncate">{{ u.email || u.name }}</div>
        </div>
      </button>
      <div v-if="!filtered.length" class="text-center py-3 text-[11px] text-gray-400">
        Kullanıcı bulunamadı
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import UserAvatar from './UserAvatar.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  users: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Kullanıcı seç' },
  allowEmpty: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const q = ref('')
const searchRef = ref(null)

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return props.users
  return props.users.filter(u => {
    const hay = `${u.full_name || ''} ${u.email || u.name || ''}`.toLowerCase()
    return hay.includes(term)
  })
})

const displayLabel = computed(() => {
  if (!props.modelValue) return props.placeholder
  const u = props.users.find(x => (x.email || x.name) === props.modelValue)
  return u ? (u.full_name || u.email || u.name) : props.modelValue
})

function pick(value) {
  emit('update:modelValue', value || '')
  open.value = false
  q.value = ''
}

watch(open, async v => {
  if (v) { await nextTick(); searchRef.value?.focus() }
})
</script>
