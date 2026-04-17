<template>
  <div>
    <div v-if="loading" class="text-center py-6">
      <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!calls.length" class="crm-empty">
      <div class="icon"><AppIcon name="phone-call" :size="22" /></div>
      <h3>Arama kaydı yok</h3>
      <p>Twilio / Exotel entegrasyonu ile kayıtlar otomatik görünür.</p>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="c in calls"
        :key="c.name"
        class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
      >
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          :class="c.type === 'Incoming' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'"
        >
          <AppIcon :name="c.type === 'Incoming' ? 'phone-incoming' : 'phone-outgoing'" :size="14" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
              {{ c.type || 'Arama' }} · {{ c.from || c.caller || '-' }} → {{ c.to || c.receiver || '-' }}
            </span>
            <StatusPill :status="c.status" :label="c.status" />
          </div>
          <div class="flex items-center gap-3 mt-1">
            <span class="text-[11px] text-gray-500">
              <AppIcon name="clock" :size="11" class="inline mr-1" />
              {{ formatDuration(c.duration) }}
            </span>
            <span class="text-[11px] text-gray-500">
              <RelativeTime :value="c.start_time || c.creation" />
            </span>
            <span v-if="c.medium" class="text-[11px] text-gray-400">
              · {{ c.medium }}
            </span>
          </div>
        </div>
        <a
          v-if="c.recording_url"
          :href="c.recording_url"
          target="_blank"
          class="text-violet-500 hover:text-violet-600"
          title="Kaydı dinle"
        >
          <AppIcon name="play-circle" :size="18" />
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useCrmCallStore } from '@/stores/crmCalls'
import AppIcon from '@/components/common/AppIcon.vue'
import StatusPill from '@/components/crm/StatusPill.vue'
import RelativeTime from '@/components/crm/RelativeTime.vue'

const props = defineProps({
  doctype: { type: String, required: true },
  docname: { type: String, required: true },
})

const store = useCrmCallStore()
const calls = ref([])
const loading = ref(false)

function formatDuration(s) {
  const v = Number(s || 0)
  if (!v) return '0sn'
  const m = Math.floor(v / 60)
  const sec = v % 60
  if (m === 0) return `${sec}sn`
  return `${m}dk ${sec}sn`
}

async function load() {
  if (!props.docname || props.docname === 'new') return
  loading.value = true
  try {
    calls.value = await store.fetchCallsForRef(props.doctype, props.docname)
  } finally { loading.value = false }
}

watch(() => props.docname, load, { immediate: true })
onMounted(load)
</script>
