<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">CRM — Arama Kayıtları</h1>
        <p class="text-xs text-gray-400">{{ store.total }} kayıt</p>
      </div>
      <button class="hdr-btn-outlined" @click="load">
        <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
      </button>
    </div>

    <div class="flex items-center gap-2 flex-wrap mb-4">
      <button
        v-for="t in typeOptions"
        :key="t.value"
        class="status-pill"
        :class="{ active: activeType === t.value }"
        @click="setType(t.value)"
      >
        <AppIcon :name="t.icon" :size="12" class="inline mr-1" />{{ t.label }}
      </button>
    </div>

    <CrmListToolbar
      v-model:search="searchQuery"
      v-model:orderBy="orderBy"
      placeholder="Telefon numarası ara..."
      :order-by-options="orderByOptions"
      @search="onSearch"
      @update:orderBy="load"
    />

    <div v-if="store.loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!store.calls.length" class="card crm-empty">
      <div class="icon"><AppIcon name="phone-off" :size="22" /></div>
      <h3>Arama kaydı yok</h3>
      <p>Twilio / Exotel entegrasyonu ile kayıtlar otomatik görünür.</p>
    </div>
    <div v-else class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th">TÜR</th>
              <th class="tbl-th">KAYNAK → HEDEF</th>
              <th class="tbl-th">DURUM</th>
              <th class="tbl-th">SÜRE</th>
              <th class="tbl-th">KANAL</th>
              <th class="tbl-th">KAYNAK KAYIT</th>
              <th class="tbl-th">ZAMAN</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in store.calls" :key="c.name" class="tbl-row border-b border-gray-50 dark:border-white/5">
              <td class="tbl-td">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center"
                  :class="c.type === 'Incoming' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'"
                >
                  <AppIcon :name="c.type === 'Incoming' ? 'phone-incoming' : 'phone-outgoing'" :size="13" />
                </div>
              </td>
              <td class="tbl-td">
                <div class="text-xs font-medium">{{ c.from || c.caller || '-' }} <span class="text-gray-400">→</span> {{ c.to || c.receiver || '-' }}</div>
                <div class="text-[10px] text-gray-400 font-mono">{{ c.name }}</div>
              </td>
              <td class="tbl-td">
                <StatusPill :status="c.status" :label="c.status" />
              </td>
              <td class="tbl-td">
                <span class="text-xs">{{ formatDuration(c.duration) }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-[11px] text-gray-500">{{ c.medium || c.telephony_medium || '-' }}</span>
              </td>
              <td class="tbl-td">
                <router-link
                  v-if="c.reference_doctype && c.reference_docname"
                  :to="refLink(c)"
                  class="text-[11px] text-violet-500 hover:underline"
                >
                  {{ c.reference_docname }}
                </router-link>
                <span v-else class="text-[11px] text-gray-400">—</span>
              </td>
              <td class="tbl-td">
                <span class="text-[10px] text-gray-500">
                  <RelativeTime :value="c.start_time || c.creation" />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ListPagination v-model="page" :total="store.total" :page-size="pageSize" @update:model-value="load" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCrmCallStore } from '@/stores/crmCalls'
import AppIcon from '@/components/common/AppIcon.vue'
import ListPagination from '@/components/common/ListPagination.vue'
import StatusPill from '@/components/crm/StatusPill.vue'
import RelativeTime from '@/components/crm/RelativeTime.vue'
import CrmListToolbar from '@/components/crm/CrmListToolbar.vue'

const store = useCrmCallStore()

const page = ref(1)
const pageSize = ref(30)
const activeType = ref('all')
const searchQuery = ref('')
const orderBy = ref('creation desc')

const typeOptions = [
  { value: 'all',      label: 'Tümü',     icon: 'list' },
  { value: 'Incoming', label: 'Gelen',    icon: 'phone-incoming' },
  { value: 'Outgoing', label: 'Giden',    icon: 'phone-outgoing' },
]

const orderByOptions = [
  { value: 'creation desc',    label: 'En Yeni' },
  { value: 'duration desc',    label: 'En Uzun' },
]

function formatDuration(s) {
  const v = Number(s || 0)
  if (!v) return '0sn'
  const m = Math.floor(v / 60)
  const sec = v % 60
  return m === 0 ? `${sec}sn` : `${m}dk ${sec}sn`
}
function refLink(c) {
  if (c.reference_doctype === 'CRM Lead') return `/crm/leads/${encodeURIComponent(c.reference_docname)}`
  if (c.reference_doctype === 'CRM Deal') return `/crm/deals/${encodeURIComponent(c.reference_docname)}`
  return `/app/${encodeURIComponent(c.reference_doctype)}/${encodeURIComponent(c.reference_docname)}`
}

function buildFilters() {
  const f = []
  if (activeType.value !== 'all') f.push(['type', '=', activeType.value])
  const q = searchQuery.value.trim()
  if (q) f.push(['from', 'like', `%${q}%`])
  return f
}

function setType(t) {
  activeType.value = t
  page.value = 1
  load()
}
function onSearch() { page.value = 1; load() }

async function load() {
  await store.fetchCalls({
    page: page.value, pageSize: pageSize.value,
    filters: buildFilters(), orderBy: orderBy.value,
  })
}

onMounted(load)
</script>
