<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">Destek Talepleri</h1>
        <p class="text-xs text-gray-400">{{ hd.ticketsTotal }} kayıt · {{ activeScopeLabel }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
      </div>
    </div>

    <!-- Scope (Bana Atanan / Ekibim / Hepsi) -->
    <div class="flex items-center gap-2 flex-wrap mb-3">
      <button
        v-for="s in scopeOptions"
        :key="s.value"
        class="scope-chip"
        :class="{ active: activeScope === s.value }"
        @click="setScope(s.value)"
      >
        <AppIcon :name="s.icon" :size="13" />
        <span>{{ s.label }}</span>
      </button>
    </div>

    <!-- Status Tabs -->
    <div class="flex items-center gap-2 flex-wrap mb-4 border-b border-gray-100 dark:border-white/10">
      <button
        v-for="s in statusFilters"
        :key="s.value"
        class="status-tab"
        :class="{ active: activeStatus === s.value }"
        @click="activeStatus = s.value; page = 1; load()"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="s.dot"></span>
        <span>{{ s.label }}</span>
      </button>
    </div>

    <!-- Toolbar: search + priority + sort -->
    <div class="card mb-4 !p-3">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div class="relative flex-1 min-w-0">
          <AppIcon name="search" :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchQuery"
            @input="onSearch"
            type="text"
            placeholder="Konu, talep no veya açan e-posta ara..."
            class="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all dark:bg-white/5 dark:border-white/10 dark:text-gray-100"
          />
        </div>

        <!-- Priority pills -->
        <div class="flex items-center gap-1">
          <button
            v-for="p in priorityOptions"
            :key="p.value"
            class="prio-pill"
            :class="[priorityPillCls(p.value), { active: activePriority === p.value }]"
            @click="togglePriority(p.value)"
          >
            {{ p.label }}
          </button>
        </div>

        <select v-model="orderBy" class="form-input-sm w-auto" @change="load()">
          <option value="modified desc">Son Güncellenen</option>
          <option value="creation desc">En Yeni</option>
          <option value="creation asc">En Eski</option>
          <option value="priority asc">Önceliğe Göre</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="hd.loadingTickets" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <!-- Empty -->
    <div v-else-if="hd.tickets.length === 0" class="card text-center py-16">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center dark:bg-white/5">
        <AppIcon name="life-buoy" :size="28" class="text-gray-300" />
      </div>
      <h3 class="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Seçili filtreye uyan talep yok</h3>
      <p class="text-xs text-gray-400">Filtreleri değiştirip tekrar dene.</p>
    </div>

    <!-- Ticket list (card rows) -->
    <div v-else class="space-y-2">
      <div
        v-for="t in hd.tickets"
        :key="t.name"
        class="ticket-row group"
        @click="$router.push(`/helpdesk/tickets/${encodeURIComponent(t.name)}`)"
      >
        <!-- Priority bar -->
        <div class="ticket-prio-bar" :class="priorityBarCls(t.priority)"></div>

        <!-- Main -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span class="text-[10px] font-mono text-gray-400">#{{ t.name }}</span>
            <span class="status-chip" :class="statusCls(t.status)">
              <span class="w-1.5 h-1.5 rounded-full mr-1" :class="statusDot(t.status)"></span>
              {{ statusLabel(t.status) }}
            </span>
            <span v-if="t.priority" class="prio-chip" :class="priorityChipCls(t.priority)">
              {{ priorityLabel(t.priority) }}
            </span>
            <span v-if="t.agent_group" class="team-chip">
              <AppIcon name="users" :size="10" />{{ t.agent_group }}
            </span>
          </div>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
            {{ t.subject || '(konusuz)' }}
          </p>
          <div class="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
            <span class="inline-flex items-center gap-1">
              <AppIcon name="user" :size="11" />{{ t.raised_by || '-' }}
            </span>
            <span class="inline-flex items-center gap-1">
              <AppIcon name="clock" :size="11" />{{ formatDate(t.modified) }}
            </span>
            <span v-if="assigneeOf(t)" class="inline-flex items-center gap-1 text-violet-500">
              <AppIcon name="user-check" :size="11" />{{ assigneeOf(t) }}
            </span>
          </div>
        </div>

        <AppIcon name="chevron-right" :size="16" class="text-gray-300 group-hover:text-violet-500 transition-colors" />
      </div>

      <ListPagination v-model="page" :total="hd.ticketsTotal" :page-size="pageSize" @update:model-value="load()" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useHelpdeskStore } from '@/stores/helpdesk'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/common/AppIcon.vue'
import ListPagination from '@/components/common/ListPagination.vue'

const hd = useHelpdeskStore()
const auth = useAuthStore()

const page = ref(1)
const pageSize = ref(20)
const activeStatus = ref('all')
const activePriority = ref('')
const activeScope = ref('all')        // all | mine | team
const searchQuery = ref('')
const orderBy = ref('modified desc')

const statusFilters = [
  { value: 'all',      label: 'Tümü',      dot: 'bg-gray-300' },
  { value: 'Open',     label: 'Açık',      dot: 'bg-blue-400' },
  { value: 'Replied',  label: 'Yanıtlandı', dot: 'bg-amber-400' },
  { value: 'Resolved', label: 'Çözüldü',   dot: 'bg-emerald-400' },
  { value: 'Closed',   label: 'Kapalı',    dot: 'bg-gray-400' },
]

const priorityOptions = [
  { value: 'Low',    label: 'Düşük' },
  { value: 'Medium', label: 'Orta' },
  { value: 'High',   label: 'Yüksek' },
  { value: 'Urgent', label: 'Acil' },
]

const scopeOptions = [
  { value: 'all',  label: 'Hepsi',         icon: 'list' },
  { value: 'mine', label: 'Bana Atanan',   icon: 'user-check' },
  { value: 'team', label: 'Ekibim',        icon: 'users' },
]

const activeScopeLabel = computed(
  () => scopeOptions.find(s => s.value === activeScope.value)?.label || 'Hepsi'
)

function statusLabel(s) {
  return statusFilters.find(x => x.value === s)?.label || s || '-'
}
function statusCls(s) {
  const m = {
    Open: 'sc-blue', Replied: 'sc-amber',
    Resolved: 'sc-emerald', Closed: 'sc-gray',
  }
  return m[s] || 'sc-gray'
}
function statusDot(s) {
  const m = {
    Open: 'bg-blue-400', Replied: 'bg-amber-400',
    Resolved: 'bg-emerald-400', Closed: 'bg-gray-400',
  }
  return m[s] || 'bg-gray-300'
}
function priorityLabel(p) {
  return priorityOptions.find(x => x.value === p)?.label || p
}
function priorityChipCls(p) {
  const m = {
    Low: 'pc-gray', Medium: 'pc-blue',
    High: 'pc-amber', Urgent: 'pc-rose',
  }
  return m[p] || 'pc-gray'
}
function priorityPillCls(p) {
  return `pp-${p.toLowerCase()}`
}
function priorityBarCls(p) {
  const m = { Low: 'bg-gray-200', Medium: 'bg-blue-300', High: 'bg-amber-300', Urgent: 'bg-rose-400' }
  return m[p] || 'bg-gray-100'
}

function formatDate(s) {
  if (!s) return ''
  try {
    const d = new Date(s)
    const diff = (Date.now() - d.getTime()) / 1000
    if (diff < 60) return 'az önce'
    if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return s }
}

function assigneeOf(t) {
  if (!t._assign) return ''
  try {
    const arr = typeof t._assign === 'string' ? JSON.parse(t._assign) : t._assign
    return (arr && arr[0]) || ''
  } catch { return '' }
}

function setScope(v) {
  activeScope.value = v
  page.value = 1
  load()
}

function togglePriority(p) {
  activePriority.value = activePriority.value === p ? '' : p
  page.value = 1
  load()
}

function buildFilters() {
  const out = []
  if (activeStatus.value !== 'all') out.push(['status', '=', activeStatus.value])
  if (activePriority.value) out.push(['priority', '=', activePriority.value])
  if (activeScope.value === 'mine' && auth.user?.email) {
    out.push(['_assign', 'like', `%${auth.user.email}%`])
  }
  // 'team' kapsamı için server-side zaten permission query satıcıyı team'ine kısıtlar
  const q = searchQuery.value.trim()
  if (q) {
    if (/^\d+$/.test(q)) out.push(['name', '=', q])
    else out.push(['subject', 'like', `%${q}%`])
  }
  return out
}

let searchT = null
function onSearch() {
  clearTimeout(searchT)
  searchT = setTimeout(() => { page.value = 1; load() }, 300)
}

async function load() {
  await hd.fetchTickets({
    page: page.value,
    pageSize: pageSize.value,
    filters: buildFilters(),
    orderBy: orderBy.value,
  })
}

onMounted(load)
</script>

<style scoped>
/* Tailwind CDN modu: @apply yok, raw CSS ile aynı sonuç */
.scope-chip {
  display: inline-flex; align-items: center; gap: 0.375rem;
  padding: 0.375rem 0.75rem; border-radius: 0.5rem;
  font-size: 12px; font-weight: 500;
  color: rgb(75 85 99); background: rgb(249 250 251);
  border: 1px solid rgb(229 231 235);
  cursor: pointer; transition: all 0.15s;
}
.scope-chip:hover { background: rgb(245 243 255); border-color: rgb(221 214 254); color: rgb(124 58 237); }
.scope-chip.active { background: rgb(139 92 246); border-color: rgb(139 92 246); color: white; }

.status-tab {
  display: inline-flex; align-items: center; gap: 0.375rem;
  padding: 0.5rem 0.75rem 0.625rem; font-size: 12px; font-weight: 500;
  color: rgb(107 114 128); border-bottom: 2px solid transparent;
  cursor: pointer; transition: color 0.15s;
}
.status-tab:hover { color: rgb(55 65 81); }
.status-tab.active { color: rgb(124 58 237); border-bottom-color: rgb(139 92 246); }

.prio-pill {
  padding: 0.375rem 0.625rem; border-radius: 0.375rem;
  font-size: 11px; font-weight: 500; cursor: pointer;
  background: white; border: 1px solid rgb(229 231 235); color: rgb(75 85 99);
  transition: all 0.15s;
}
.prio-pill:hover { background: rgb(249 250 251); }
.prio-pill.active.pp-low    { background: rgb(107 114 128); border-color: rgb(107 114 128); color: white; }
.prio-pill.active.pp-medium { background: rgb(59 130 246); border-color: rgb(59 130 246); color: white; }
.prio-pill.active.pp-high   { background: rgb(245 158 11); border-color: rgb(245 158 11); color: white; }
.prio-pill.active.pp-urgent { background: rgb(244 63 94);  border-color: rgb(244 63 94);  color: white; }

.ticket-row {
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding: 1rem; border-radius: 0.75rem;
  background: white; border: 1px solid rgb(243 244 246);
  cursor: pointer; transition: all 0.15s;
}
.ticket-row:hover { border-color: rgb(221 214 254); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.ticket-prio-bar { width: 4px; border-radius: 9999px; align-self: stretch; flex-shrink: 0; }

.status-chip {
  display: inline-flex; align-items: center;
  padding: 0.0625rem 0.5rem; border-radius: 0.375rem;
  font-size: 10px; font-weight: 500;
}
.status-chip.sc-blue    { background: rgb(239 246 255); color: rgb(37 99 235); }
.status-chip.sc-amber   { background: rgb(255 251 235); color: rgb(217 119 6); }
.status-chip.sc-emerald { background: rgb(236 253 245); color: rgb(5 150 105); }
.status-chip.sc-gray    { background: rgb(243 244 246); color: rgb(107 114 128); }

.prio-chip {
  display: inline-flex; align-items: center;
  padding: 0.0625rem 0.5rem; border-radius: 0.375rem;
  font-size: 10px; font-weight: 500;
}
.prio-chip.pc-gray  { background: rgb(243 244 246); color: rgb(107 114 128); }
.prio-chip.pc-blue  { background: rgb(239 246 255); color: rgb(37 99 235); }
.prio-chip.pc-amber { background: rgb(255 251 235); color: rgb(217 119 6); }
.prio-chip.pc-rose  { background: rgb(255 241 242); color: rgb(225 29 72); }

.team-chip {
  display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 0.0625rem 0.5rem; border-radius: 0.375rem;
  font-size: 10px; font-weight: 500;
  background: rgb(245 243 255); color: rgb(124 58 237);
}

/* ── Dark mode override (mevcut tema html.dark sınıfı kullanıyor) ── */
:global(html.dark) .scope-chip {
  background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: rgb(209 213 219);
}
:global(html.dark) .scope-chip:hover { background: rgba(124,58,237,0.18); border-color: rgba(124,58,237,0.4); color: rgb(196 181 253); }
:global(html.dark) .scope-chip.active { background: rgb(139 92 246); border-color: rgb(139 92 246); color: white; }

:global(html.dark) .status-tab        { color: rgb(156 163 175); }
:global(html.dark) .status-tab:hover  { color: rgb(243 244 246); }
:global(html.dark) .status-tab.active { color: rgb(196 181 253); border-bottom-color: rgb(167 139 250); }

:global(html.dark) .prio-pill {
  background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: rgb(209 213 219);
}
:global(html.dark) .prio-pill:hover { background: rgba(255,255,255,0.08); }

:global(html.dark) .ticket-row {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  color: rgb(229 231 235);
}
:global(html.dark) .ticket-row:hover { border-color: rgba(139,92,246,0.4); }
/* Subject + diğer Tailwind text class'ları dark modda görünür yap */
:global(html.dark) .ticket-row .text-gray-800,
:global(html.dark) .ticket-row .text-gray-700,
:global(html.dark) .ticket-row .text-gray-900 { color: rgb(243 244 246); }
:global(html.dark) .ticket-row .text-gray-500,
:global(html.dark) .ticket-row .text-gray-400 { color: rgb(156 163 175); }
:global(html.dark) .ticket-row .text-violet-500 { color: rgb(196 181 253); }

:global(html.dark) .status-chip.sc-blue    { background: rgba(59,130,246,0.15);  color: rgb(147 197 253); }
:global(html.dark) .status-chip.sc-amber   { background: rgba(245,158,11,0.15);  color: rgb(252 211 77); }
:global(html.dark) .status-chip.sc-emerald { background: rgba(16,185,129,0.15);  color: rgb(110 231 183); }
:global(html.dark) .status-chip.sc-gray    { background: rgba(255,255,255,0.10); color: rgb(156 163 175); }

:global(html.dark) .prio-chip.pc-gray  { background: rgba(255,255,255,0.10); color: rgb(156 163 175); }
:global(html.dark) .prio-chip.pc-blue  { background: rgba(59,130,246,0.15);  color: rgb(147 197 253); }
:global(html.dark) .prio-chip.pc-amber { background: rgba(245,158,11,0.15);  color: rgb(252 211 77); }
:global(html.dark) .prio-chip.pc-rose  { background: rgba(244,63,94,0.15);   color: rgb(253 164 175); }

:global(html.dark) .team-chip { background: rgba(139,92,246,0.15); color: rgb(196 181 253); }
</style>
