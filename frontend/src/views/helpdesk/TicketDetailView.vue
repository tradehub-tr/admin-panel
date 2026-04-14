<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-2 min-w-0">
        <button class="hdr-btn-outlined flex-shrink-0" @click="$router.push('/helpdesk/tickets')">
          <AppIcon name="arrow-left" :size="14" /><span>Geri</span>
        </button>
        <div class="min-w-0">
          <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">{{ ticket.subject || '...' }}</h1>
          <p class="text-[10px] text-gray-400 font-mono">#{{ name }} · {{ ticket.raised_by || '-' }}</p>
        </div>
      </div>

      <!-- Action bar: status + priority + assign -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Status -->
        <select
          v-model="ticket.status"
          class="action-select"
          :class="statusSelectCls(ticket.status)"
          @change="saveStatus"
        >
          <option value="Open">Açık</option>
          <option value="Replied">Yanıtlandı</option>
          <option value="Resolved">Çözüldü</option>
          <option value="Closed">Kapalı</option>
        </select>

        <!-- Priority -->
        <select
          v-model="ticket.priority"
          class="action-select"
          :class="prioritySelectCls(ticket.priority)"
          @change="savePriority"
        >
          <option value="">Öncelik —</option>
          <option value="Low">Düşük</option>
          <option value="Medium">Orta</option>
          <option value="High">Yüksek</option>
          <option value="Urgent">Acil</option>
        </select>

        <!-- Agent assign -->
        <div class="relative" v-click-outside="() => assignOpen = false">
          <button class="hdr-btn-outlined" @click="openAssign">
            <AppIcon name="user-plus" :size="14" />
            <span>{{ assignedLabel || 'Ata' }}</span>
          </button>
          <div
            v-if="assignOpen"
            class="absolute right-0 top-full mt-1 z-20 w-64 bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-gray-800 dark:border-white/10"
          >
            <div class="p-2 border-b border-gray-100 dark:border-white/10">
              <input
                v-model="assignQuery"
                type="text"
                placeholder="Ajan ara..."
                class="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-violet-500/20 dark:bg-white/5 dark:border-white/10 dark:text-gray-100"
              />
            </div>
            <div class="max-h-64 overflow-y-auto py-1">
              <button
                v-for="a in filteredAgents"
                :key="a.name"
                class="w-full text-left px-3 py-2 text-xs hover:bg-violet-50 dark:hover:bg-violet-500/15 flex items-center gap-2"
                @click="doAssign(a)"
              >
                <div class="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold">
                  {{ (a.agent_name || a.user || '?').charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{{ a.agent_name || a.user }}</div>
                  <div class="text-[10px] text-gray-400 truncate">{{ a.user }}</div>
                </div>
              </button>
              <div v-if="filteredAgents.length === 0" class="px-3 py-4 text-xs text-gray-400 text-center">
                Eşleşen ajan yok.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Main column: conversation -->
      <div class="lg:col-span-2 space-y-3">
        <!-- Original request -->
        <article class="timeline-item timeline-customer">
          <div class="tl-avatar bg-blue-100 text-blue-600">
            {{ initial(ticket.raised_by) }}
          </div>
          <div class="tl-body">
            <header class="tl-head">
              <span class="tl-author">{{ ticket.raised_by || '-' }}</span>
              <span class="tl-meta">{{ formatDT(ticket.creation) }} · İlk Talep</span>
            </header>
            <div class="tl-content prose prose-sm max-w-none" v-html="ticket.description || '<p class=\'text-gray-400\'>Açıklama girilmedi</p>'"></div>
          </div>
        </article>

        <!-- Timeline (comms + comments merged & sorted) -->
        <article
          v-for="item in timeline"
          :key="item.kind + ':' + item.name"
          class="timeline-item"
          :class="timelineCls(item)"
        >
          <div class="tl-avatar" :class="avatarCls(item)">
            {{ initial(authorOf(item)) }}
          </div>
          <div class="tl-body">
            <header class="tl-head">
              <span class="tl-author">{{ authorLabelOf(item) }}</span>
              <span v-if="item.kind === 'comment'" class="tl-badge tl-badge-internal">İç Not</span>
              <span v-else-if="item.sent_or_received === 'Sent'" class="tl-badge tl-badge-agent">Ajan Yanıtı</span>
              <span v-else class="tl-badge tl-badge-customer">Müşteri</span>
              <span class="tl-meta">{{ formatDT(item.communication_date || item.creation) }}</span>
            </header>
            <div class="tl-content prose prose-sm max-w-none" v-html="item.content || ''"></div>
          </div>
        </article>

        <div v-if="timeline.length === 0" class="text-[11px] text-gray-400 text-center py-3">
          Henüz yanıt yok.
        </div>

        <!-- Reply composer -->
        <div class="card p-4 mt-4">
          <div class="flex items-center gap-2 mb-3 border-b border-gray-100 dark:border-white/10 pb-2">
            <button
              class="composer-tab"
              :class="{ active: composerMode === 'reply' }"
              @click="composerMode = 'reply'"
            >
              <AppIcon name="reply" :size="13" /><span>Müşteriye Yanıt</span>
            </button>
            <button
              class="composer-tab"
              :class="{ active: composerMode === 'comment' }"
              @click="composerMode = 'comment'"
            >
              <AppIcon name="message-square" :size="13" /><span>İç Not</span>
            </button>
          </div>
          <textarea
            v-model="replyText"
            :rows="composerMode === 'reply' ? 5 : 3"
            class="form-input"
            :placeholder="composerMode === 'reply' ? 'Müşteriye yanıtınızı yazın...' : 'Ekip içi not ekleyin (müşteri görmez)...'"
          ></textarea>
          <div class="flex items-center justify-between gap-2 mt-3">
            <p class="text-[10px] text-gray-400">
              {{ composerMode === 'reply' ? 'E-posta müşteriye gönderilir (raised_by adresine).' : 'Sadece ajanlar görür.' }}
            </p>
            <button
              class="hdr-btn-primary"
              :disabled="sending || !replyText.trim()"
              @click="sendMessage"
            >
              <AppIcon :name="composerMode === 'reply' ? 'send' : 'message-square'" :size="14" />
              <span>{{ sending ? 'Gönderiliyor...' : (composerMode === 'reply' ? 'Gönder' : 'Not Ekle') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="space-y-3">
        <!-- Customer card -->
        <div class="card p-4">
          <h3 class="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-wide">Açan</h3>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              {{ initial(ticket.raised_by) }}
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{{ ticket.raised_by || '-' }}</p>
              <p class="text-[10px] text-gray-400">{{ ticket.customer || 'Müşteri bağlı değil' }}</p>
            </div>
          </div>
        </div>

        <!-- Details -->
        <div class="card p-4">
          <h3 class="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-wide">Detaylar</h3>
          <dl class="space-y-2.5 text-[11px]">
            <div class="flex justify-between gap-2"><dt class="text-gray-400">Durum</dt><dd class="font-medium">{{ statusLabel(ticket.status) }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-gray-400">Öncelik</dt><dd class="font-medium">{{ ticket.priority || '-' }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-gray-400">Tip</dt><dd class="font-medium">{{ ticket.ticket_type || '-' }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-gray-400">Ajan Grubu</dt><dd class="font-medium">{{ ticket.agent_group || '-' }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-gray-400">Atanan</dt><dd class="font-medium">{{ assignedLabel || '-' }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-gray-400">İlk Yanıt</dt><dd class="font-medium">{{ formatDT(ticket.first_responded_on) || '-' }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-gray-400">Oluşturma</dt><dd class="font-medium">{{ formatDT(ticket.creation) }}</dd></div>
            <div class="flex justify-between gap-2"><dt class="text-gray-400">Son Güncelleme</dt><dd class="font-medium">{{ formatDT(ticket.modified) }}</dd></div>
          </dl>
        </div>

        <!-- Quick actions -->
        <div class="card p-4">
          <h3 class="text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-wide">Hızlı İşlem</h3>
          <div class="space-y-2">
            <button class="quick-action" @click="quickStatus('Resolved')"
              :disabled="ticket.status === 'Resolved' || ticket.status === 'Closed'">
              <AppIcon name="check-circle" :size="14" class="text-emerald-500" />
              <span>Çözüldü olarak işaretle</span>
            </button>
            <button class="quick-action" @click="quickStatus('Closed')"
              :disabled="ticket.status === 'Closed'">
              <AppIcon name="archive" :size="14" class="text-gray-500" />
              <span>Kapat</span>
            </button>
            <button class="quick-action" @click="quickStatus('Open')"
              :disabled="ticket.status === 'Open'">
              <AppIcon name="refresh-cw" :size="14" class="text-blue-500" />
              <span>Yeniden Aç</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHelpdeskStore } from '@/stores/helpdesk'
import { useToast } from '@/composables/useToast'
import AppIcon from '@/components/common/AppIcon.vue'

const route = useRoute()
const hd = useHelpdeskStore()
const toast = useToast()

const name = computed(() => route.params.name)
const loading = ref(true)
const sending = ref(false)
const composerMode = ref('reply')     // reply | comment
const replyText = ref('')

const ticket = ref({})
const comms = ref([])
const comments = ref([])

const assignOpen = ref(false)
const assignQuery = ref('')

const timeline = computed(() => {
  const merged = [...comms.value, ...comments.value]
  return merged.sort((a, b) => {
    const ta = new Date(a.communication_date || a.creation).getTime()
    const tb = new Date(b.communication_date || b.creation).getTime()
    return ta - tb
  })
})

const filteredAgents = computed(() => {
  const q = assignQuery.value.toLowerCase().trim()
  const list = hd.agents
  if (!q) return list
  return list.filter(a =>
    (a.agent_name || '').toLowerCase().includes(q) ||
    (a.user || '').toLowerCase().includes(q)
  )
})

const assignedLabel = computed(() => {
  try {
    const raw = ticket.value._assign
    if (!raw) return ''
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!arr?.length) return ''
    return arr.length === 1 ? arr[0] : `${arr[0]} +${arr.length - 1}`
  } catch { return '' }
})

function initial(s) {
  return s ? String(s).trim().charAt(0).toUpperCase() : '?'
}

function statusLabel(s) {
  const m = { Open: 'Açık', Replied: 'Yanıtlandı', Resolved: 'Çözüldü', Closed: 'Kapalı' }
  return m[s] || s || '-'
}

function statusSelectCls(s) {
  const m = {
    Open: 'as-blue', Replied: 'as-amber',
    Resolved: 'as-emerald', Closed: 'as-gray',
  }
  return m[s] || 'as-gray'
}

function prioritySelectCls(p) {
  const m = { Low: 'as-gray', Medium: 'as-blue', High: 'as-amber', Urgent: 'as-rose' }
  return m[p] || 'as-gray'
}

function formatDT(s) {
  if (!s) return ''
  try {
    return new Date(s).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return s }
}

function timelineCls(item) {
  if (item.kind === 'comment') return 'timeline-internal'
  return item.sent_or_received === 'Sent' ? 'timeline-agent' : 'timeline-customer'
}

function avatarCls(item) {
  if (item.kind === 'comment') return 'bg-amber-100 text-amber-600'
  return item.sent_or_received === 'Sent' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'
}

function authorOf(item) {
  return item.sender_full_name || item.sender || item.commented_by || '?'
}

function authorLabelOf(item) {
  return authorOf(item)
}

async function loadAll() {
  loading.value = true
  try {
    const [doc, cms, cmts] = await Promise.all([
      hd.fetchTicket(name.value),
      hd.fetchCommunications(name.value),
      hd.fetchComments(name.value),
    ])
    ticket.value = doc
    comms.value = cms
    comments.value = cmts
    await hd.fetchAgents()
  } catch (e) {
    toast.error(e.message || 'Talep yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function saveStatus() {
  try {
    await hd.setStatus(name.value, ticket.value.status)
    toast.success('Durum güncellendi')
  } catch (e) {
    toast.error(e.message || 'Başarısız')
  }
}

async function savePriority() {
  try {
    await hd.setPriority(name.value, ticket.value.priority)
    toast.success('Öncelik güncellendi')
  } catch (e) {
    toast.error(e.message || 'Başarısız')
  }
}

async function quickStatus(s) {
  ticket.value.status = s
  await saveStatus()
}

function openAssign() {
  assignOpen.value = !assignOpen.value
  if (assignOpen.value) hd.fetchAgents()
}

async function doAssign(agent) {
  assignOpen.value = false
  try {
    await hd.assignAgent(name.value, agent.user)
    toast.success(`${agent.agent_name || agent.user} atandı`)
    // refresh ticket (_assign güncellenir)
    ticket.value = await hd.fetchTicket(name.value)
  } catch (e) {
    toast.error(e.message || 'Atama başarısız')
  }
}

async function sendMessage() {
  if (!replyText.value.trim()) return
  sending.value = true
  try {
    if (composerMode.value === 'reply') {
      await hd.replyViaAgent(name.value, replyText.value)
      toast.success('Yanıt gönderildi')
    } else {
      await hd.newComment(name.value, replyText.value)
      toast.success('İç not eklendi')
    }
    replyText.value = ''
    // refresh timeline + ticket status
    const [cms, cmts, doc] = await Promise.all([
      hd.fetchCommunications(name.value),
      hd.fetchComments(name.value),
      hd.fetchTicket(name.value),
    ])
    comms.value = cms
    comments.value = cmts
    ticket.value = doc
  } catch (e) {
    toast.error(e.message || 'Gönderilemedi')
  } finally {
    sending.value = false
  }
}

// v-click-outside lightweight inline directive
const vClickOutside = {
  mounted(el, binding) {
    el.__clickOutside__ = (ev) => { if (!el.contains(ev.target)) binding.value?.() }
    document.addEventListener('click', el.__clickOutside__)
  },
  unmounted(el) {
    document.removeEventListener('click', el.__clickOutside__)
  },
}

onMounted(loadAll)
</script>

<style scoped>
/* Tailwind CDN modu: @apply yok, raw CSS */
.action-select {
  padding: 0.375rem 0.75rem; font-size: 12px; font-weight: 500;
  border-radius: 0.5rem; cursor: pointer;
  background: white; border: 1px solid rgb(229 231 235); color: rgb(55 65 81);
}
.action-select:focus { outline: none; box-shadow: 0 0 0 2px rgba(139,92,246,0.2); border-color: rgb(167 139 250); }
.action-select.as-blue    { background: rgb(239 246 255); border-color: rgb(191 219 254); color: rgb(29 78 216); }
.action-select.as-amber   { background: rgb(255 251 235); border-color: rgb(253 230 138); color: rgb(180 83 9); }
.action-select.as-emerald { background: rgb(236 253 245); border-color: rgb(167 243 208); color: rgb(4 120 87); }
.action-select.as-rose    { background: rgb(255 241 242); border-color: rgb(254 205 211); color: rgb(190 18 60); }
.action-select.as-gray    { background: rgb(249 250 251); border-color: rgb(229 231 235); color: rgb(75 85 99); }

.timeline-item {
  display: flex; gap: 0.75rem; padding: 1rem;
  border-radius: 0.75rem; background: white;
  border: 1px solid rgb(243 244 246);
}
.timeline-internal { background: rgba(255, 251, 235, 0.5); border-color: rgb(254 243 199); }
.timeline-agent    { background: rgba(245, 243, 255, 0.4); border-color: rgb(237 233 254); }

.tl-avatar {
  width: 2.25rem; height: 2.25rem; border-radius: 9999px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.tl-body { flex: 1; min-width: 0; }
.tl-head {
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  font-size: 11px; margin-bottom: 0.375rem;
}
.tl-author { font-weight: 600; color: rgb(55 65 81); }
.tl-meta   { color: rgb(156 163 175); }

.tl-badge {
  display: inline-flex; align-items: center;
  padding: 0.0625rem 0.375rem; border-radius: 0.25rem;
  font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;
}
.tl-badge-customer { background: rgb(219 234 254); color: rgb(29 78 216); }
.tl-badge-agent    { background: rgb(237 233 254); color: rgb(109 40 217); }
.tl-badge-internal { background: rgb(254 243 199); color: rgb(146 64 14); }

.tl-content { font-size: 12px; color: rgb(55 65 81); }
.tl-content :deep(p) { margin-bottom: 0.25rem; }

.composer-tab {
  display: inline-flex; align-items: center; gap: 0.375rem;
  padding: 0.375rem 0.625rem; font-size: 12px; font-weight: 500;
  color: rgb(107 114 128); border-radius: 0.375rem; cursor: pointer;
  transition: background 0.15s;
}
.composer-tab:hover { background: rgb(249 250 251); }
.composer-tab.active { color: rgb(124 58 237); background: rgb(245 243 255); }

.quick-action {
  width: 100%;
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.75rem; font-size: 12px; color: rgb(55 65 81);
  border-radius: 0.5rem; background: rgb(249 250 251);
  border: 1px solid transparent; cursor: pointer; transition: background 0.15s;
}
.quick-action:hover:not(:disabled) { background: rgb(243 244 246); }
.quick-action:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Dark mode override (html.dark) ── */
:global(html.dark) .action-select {
  background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: rgb(243 244 246);
}
:global(html.dark) .action-select.as-blue    { background: rgba(59,130,246,0.10);  border-color: rgba(59,130,246,0.30);  color: rgb(147 197 253); }
:global(html.dark) .action-select.as-amber   { background: rgba(245,158,11,0.10);  border-color: rgba(245,158,11,0.30);  color: rgb(252 211 77); }
:global(html.dark) .action-select.as-emerald { background: rgba(16,185,129,0.10);  border-color: rgba(16,185,129,0.30);  color: rgb(110 231 183); }
:global(html.dark) .action-select.as-rose    { background: rgba(244,63,94,0.10);   border-color: rgba(244,63,94,0.30);   color: rgb(253 164 175); }
:global(html.dark) .action-select.as-gray    { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);  color: rgb(209 213 219); }

:global(html.dark) .timeline-item     { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
:global(html.dark) .timeline-internal { background: rgba(245,158,11,0.05);  border-color: rgba(245,158,11,0.20); }
:global(html.dark) .timeline-agent    { background: rgba(139,92,246,0.05);  border-color: rgba(139,92,246,0.20); }

:global(html.dark) .tl-author { color: rgb(229 231 235); }
:global(html.dark) .tl-content { color: rgb(209 213 219); }

:global(html.dark) .tl-badge-customer { background: rgba(59,130,246,0.20); color: rgb(147 197 253); }
:global(html.dark) .tl-badge-agent    { background: rgba(139,92,246,0.20); color: rgb(196 181 253); }
:global(html.dark) .tl-badge-internal { background: rgba(245,158,11,0.20); color: rgb(252 211 77); }

:global(html.dark) .composer-tab        { color: rgb(156 163 175); }
:global(html.dark) .composer-tab:hover  { background: rgba(255,255,255,0.05); }
:global(html.dark) .composer-tab.active { color: rgb(196 181 253); background: rgba(139,92,246,0.15); }

:global(html.dark) .quick-action {
  background: rgba(255,255,255,0.05); color: rgb(209 213 219);
}
:global(html.dark) .quick-action:hover:not(:disabled) { background: rgba(255,255,255,0.10); }

/* Genel text override (timeline, kartlar, sidebar) */
:global(html.dark) .timeline-item .text-gray-800,
:global(html.dark) .timeline-item .text-gray-700,
:global(html.dark) .timeline-item .text-gray-900 { color: rgb(243 244 246); }
:global(html.dark) .timeline-item .text-gray-500,
:global(html.dark) .timeline-item .text-gray-400 { color: rgb(156 163 175); }
</style>
