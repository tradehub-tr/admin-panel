<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
      <div class="flex items-center gap-3 min-w-0">
        <button class="hd-action flex-shrink-0" @click="$router.push('/helpdesk/tickets')">
          <AppIcon name="arrow-left" :size="14" /><span>Geri</span>
        </button>
        <div class="min-w-0">
          <h1 class="hd-page-title truncate">{{ ticket.subject || '...' }}</h1>
          <p class="hd-page-sub"><span class="hd-mono">#{{ name }}</span> · {{ ticket.raised_by || '-' }}</p>
        </div>
      </div>

      <!-- Action bar -->
      <div class="flex items-center gap-2 flex-wrap">
        <select
          v-model="ticket.status"
          class="hd-action-select"
          :class="statusSelectCls(ticket.status)"
          @change="saveStatus"
        >
          <option value="Open">Açık</option>
          <option value="Replied">Yanıtlandı</option>
          <option value="Resolved">Çözüldü</option>
          <option value="Closed">Kapalı</option>
        </select>

        <select
          v-model="ticket.priority"
          class="hd-action-select"
          :class="prioritySelectCls(ticket.priority)"
          @change="savePriority"
        >
          <option value="">Öncelik —</option>
          <option value="Low">Düşük</option>
          <option value="Medium">Orta</option>
          <option value="High">Yüksek</option>
          <option value="Urgent">Acil</option>
        </select>

        <div class="relative" v-click-outside="() => assignOpen = false">
          <button class="hd-action" @click="openAssign">
            <AppIcon name="user-plus" :size="14" />
            <span>{{ assignedLabel || 'Ata' }}</span>
          </button>
          <div v-if="assignOpen" class="hd-dropdown">
            <div class="hd-dropdown-search">
              <input
                v-model="assignQuery"
                type="text"
                placeholder="Ajan ara..."
                class="hd-input"
                style="font-size: 12px; padding: 7px 10px;"
              />
            </div>
            <div class="hd-dropdown-list">
              <button
                v-for="a in filteredAgents"
                :key="a.name"
                class="hd-dropdown-item"
                @click="doAssign(a)"
              >
                <div class="hd-dropdown-avatar">
                  {{ (a.agent_name || a.user || '?').charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="hd-dropdown-name truncate">{{ a.agent_name || a.user }}</div>
                  <div class="hd-dropdown-sub truncate">{{ a.user }}</div>
                </div>
              </button>
              <div v-if="filteredAgents.length === 0" class="px-3 py-4 hd-empty-sub text-center">
                Eşleşen ajan yok.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Main column: conversation -->
      <div class="lg:col-span-2 space-y-3">
        <!-- Original request -->
        <article class="hd-timeline tl-customer">
          <div class="hd-tl-avatar av-customer">
            {{ initial(ticket.raised_by) }}
          </div>
          <div class="hd-tl-body">
            <header class="hd-tl-head">
              <span class="hd-tl-author">{{ ticket.raised_by || '-' }}</span>
              <span class="hd-tl-badge bd-customer">İlk Talep</span>
              <span class="hd-tl-meta">{{ formatDT(ticket.creation) }}</span>
            </header>
            <div class="hd-tl-content prose prose-sm max-w-none" v-html="ticket.description || '<p style=\'opacity:.5\'>Açıklama girilmedi</p>'"></div>
          </div>
        </article>

        <!-- Timeline -->
        <article
          v-for="item in timeline"
          :key="item.kind + ':' + item.name"
          class="hd-timeline"
          :class="timelineCls(item)"
        >
          <div class="hd-tl-avatar" :class="avatarCls(item)">
            {{ initial(authorOf(item)) }}
          </div>
          <div class="hd-tl-body">
            <header class="hd-tl-head">
              <span class="hd-tl-author">{{ authorLabelOf(item) }}</span>
              <span v-if="item.kind === 'comment'" class="hd-tl-badge bd-internal">İç Not</span>
              <span v-else-if="item.sent_or_received === 'Sent'" class="hd-tl-badge bd-agent">Ajan Yanıtı</span>
              <span v-else class="hd-tl-badge bd-customer">Müşteri</span>
              <span class="hd-tl-meta">{{ formatDT(item.communication_date || item.creation) }}</span>
            </header>
            <div class="hd-tl-content prose prose-sm max-w-none" v-html="item.content || ''"></div>
          </div>
        </article>

        <div v-if="timeline.length === 0" class="hd-empty-sub text-center py-3">
          Henüz yanıt yok.
        </div>

        <!-- Reply composer -->
        <div class="hd-composer mt-4">
          <div class="hd-composer-tabs">
            <button
              class="hd-composer-tab"
              :class="{ active: composerMode === 'reply' }"
              @click="composerMode = 'reply'"
            >
              <AppIcon name="reply" :size="13" /><span>Müşteriye Yanıt</span>
            </button>
            <button
              class="hd-composer-tab"
              :class="{ active: composerMode === 'comment' }"
              @click="composerMode = 'comment'"
            >
              <AppIcon name="message-square" :size="13" /><span>İç Not</span>
            </button>
          </div>
          <textarea
            v-model="replyText"
            :rows="composerMode === 'reply' ? 5 : 3"
            class="hd-textarea"
            :placeholder="composerMode === 'reply' ? 'Müşteriye yanıtınızı yazın...' : 'Ekip içi not ekleyin (müşteri görmez)...'"
          ></textarea>
          <div class="hd-composer-foot">
            <p class="hd-composer-hint">
              {{ composerMode === 'reply' ? 'E-posta müşteriye gönderilir (raised_by adresine).' : 'Sadece ajanlar görür.' }}
            </p>
            <button
              class="hd-btn-primary"
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
        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">Açan</h3>
          <div class="hd-customer">
            <div class="hd-customer-avatar">
              {{ initial(ticket.raised_by) }}
            </div>
            <div class="min-w-0">
              <p class="hd-customer-name truncate">{{ ticket.raised_by || '-' }}</p>
              <p class="hd-customer-sub">{{ ticket.customer || 'Müşteri bağlı değil' }}</p>
            </div>
          </div>
        </div>

        <!-- Details -->
        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">Detaylar</h3>
          <dl class="hd-dl">
            <div><dt>Durum</dt><dd>{{ statusLabel(ticket.status) }}</dd></div>
            <div><dt>Öncelik</dt><dd>{{ ticket.priority || '-' }}</dd></div>
            <div><dt>Tip</dt><dd>{{ ticket.ticket_type || '-' }}</dd></div>
            <div><dt>Ajan Grubu</dt><dd>{{ ticket.agent_group || '-' }}</dd></div>
            <div><dt>Atanan</dt><dd>{{ assignedLabel || '-' }}</dd></div>
            <div><dt>İlk Yanıt</dt><dd>{{ formatDT(ticket.first_responded_on) || '-' }}</dd></div>
            <div><dt>Oluşturma</dt><dd>{{ formatDT(ticket.creation) }}</dd></div>
            <div><dt>Son Güncelleme</dt><dd>{{ formatDT(ticket.modified) }}</dd></div>
          </dl>
        </div>

        <!-- Quick actions -->
        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">Hızlı İşlem</h3>
          <div class="space-y-2">
            <button class="hd-quick" @click="quickStatus('Resolved')"
              :disabled="ticket.status === 'Resolved' || ticket.status === 'Closed'">
              <AppIcon name="check-circle" :size="14" class="text-emerald-500" />
              <span>Çözüldü olarak işaretle</span>
            </button>
            <button class="hd-quick" @click="quickStatus('Closed')"
              :disabled="ticket.status === 'Closed'">
              <AppIcon name="archive" :size="14" class="text-gray-500 dark:text-white/40" />
              <span>Kapat</span>
            </button>
            <button class="hd-quick" @click="quickStatus('Open')"
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
    Open: 'hd-as-blue', Replied: 'hd-as-amber',
    Resolved: 'hd-as-emerald', Closed: 'hd-as-gray',
  }
  return m[s] || 'hd-as-gray'
}

function prioritySelectCls(p) {
  const m = { Low: 'hd-as-gray', Medium: 'hd-as-blue', High: 'hd-as-amber', Urgent: 'hd-as-rose' }
  return m[p] || 'hd-as-gray'
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
  if (item.kind === 'comment') return 'tl-internal'
  return item.sent_or_received === 'Sent' ? 'tl-agent' : 'tl-customer'
}

function avatarCls(item) {
  if (item.kind === 'comment') return 'av-internal'
  return item.sent_or_received === 'Sent' ? 'av-agent' : 'av-customer'
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
