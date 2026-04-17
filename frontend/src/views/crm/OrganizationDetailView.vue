<template>
  <div>
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <CrmEntityLayout
      v-else
      :title="form.organization_name || form.name || 'Yeni Kurum'"
      :subtitle="!isNew ? name : ''"
      :tabs="tabs"
      :active-tab="activeTab"
      @update:activeTab="activeTab = $event"
    >
      <template #actions>
        <button class="hdr-btn-primary" :disabled="saving" @click="save">
          <AppIcon name="save" :size="14" /><span>{{ saving ? 'Kaydediliyor...' : 'Kaydet' }}</span>
        </button>
      </template>

      <template #side-left>
        <div class="card p-4">
          <h3 class="crm-section-title">Genel</h3>
          <div class="space-y-3">
            <div>
              <label class="form-label">Kurum Adı</label>
              <input v-model="form.organization_name" class="form-input" />
            </div>
            <div>
              <label class="form-label">Website</label>
              <input v-model="form.website" class="form-input" placeholder="ornek.com" />
            </div>
            <div>
              <label class="form-label">Sektör</label>
              <select v-model="form.industry" class="form-input">
                <option value="">—</option>
                <option v-for="i in meta.industries" :key="i.name" :value="i.name">{{ i.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Bölge</label>
              <select v-model="form.territory" class="form-input">
                <option value="">—</option>
                <option v-for="t in meta.territories" :key="t.name" :value="t.name">{{ t.name }}</option>
              </select>
            </div>
          </div>
        </div>
      </template>

      <template #main>
        <div v-if="activeTab === 'details'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Çalışan Sayısı</label>
            <input v-model.number="form.no_of_employees" type="number" class="form-input" />
          </div>
          <div>
            <label class="form-label">Yıllık Gelir</label>
            <input v-model.number="form.annual_revenue" type="number" class="form-input" />
          </div>
          <div>
            <label class="form-label">Para Birimi</label>
            <input v-model="form.currency" class="form-input" placeholder="TRY" />
          </div>
          <div>
            <label class="form-label">Kur</label>
            <input v-model.number="form.exchange_rate" type="number" step="0.0001" class="form-input" />
          </div>
          <div class="md:col-span-2">
            <label class="form-label">Adres Satırı</label>
            <input v-model="form.address_line_1" class="form-input" />
          </div>
          <div>
            <label class="form-label">Şehir</label>
            <input v-model="form.city" class="form-input" />
          </div>
          <div>
            <label class="form-label">Ülke</label>
            <input v-model="form.country" class="form-input" />
          </div>
        </div>

        <div v-else-if="activeTab === 'deals'">
          <div v-if="loadingDeals" class="text-center py-6">
            <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
          </div>
          <div v-else-if="!deals.length" class="crm-empty">
            <div class="icon"><AppIcon name="trending-up" :size="22" /></div>
            <h3>Anlaşma yok</h3>
          </div>
          <div v-else class="space-y-2">
            <router-link
              v-for="d in deals"
              :key="d.name"
              :to="`/crm/deals/${encodeURIComponent(d.name)}`"
              class="block p-3 rounded-lg border border-gray-200 dark:border-white/10 hover:border-violet-300 transition-all"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-[13px] font-semibold">{{ d.name }}</div>
                  <div class="text-[11px] text-gray-500">
                    <CurrencyAmount :amount="d.deal_value" :currency="d.currency || 'TRY'" />
                  </div>
                </div>
                <StatusPill :status="d.status" :label="d.status" />
              </div>
            </router-link>
          </div>
        </div>

        <div v-else-if="activeTab === 'leads'">
          <div v-if="loadingLeads" class="text-center py-6">
            <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
          </div>
          <div v-else-if="!leads.length" class="crm-empty">
            <div class="icon"><AppIcon name="user-plus" :size="22" /></div>
            <h3>Lead yok</h3>
          </div>
          <div v-else class="space-y-2">
            <router-link
              v-for="l in leads"
              :key="l.name"
              :to="`/crm/leads/${encodeURIComponent(l.name)}`"
              class="block p-3 rounded-lg border border-gray-200 dark:border-white/10 hover:border-violet-300 transition-all"
            >
              <div class="flex items-center justify-between">
                <div class="min-w-0">
                  <div class="text-[13px] font-semibold truncate">{{ l.lead_name || `${l.first_name || ''} ${l.last_name || ''}`.trim() || l.email }}</div>
                  <div class="text-[11px] text-gray-500">{{ l.email }}</div>
                </div>
                <StatusPill :status="l.status" :label="l.status" />
              </div>
            </router-link>
          </div>
        </div>
      </template>

      <template #side-right>
        <div class="card p-4">
          <h3 class="crm-section-title">Bilgi</h3>
          <div class="text-[11px] text-gray-500 space-y-2">
            <div>Oluşturuldu: <RelativeTime :value="form.creation" /></div>
            <div>Güncellendi: <RelativeTime :value="form.modified" /></div>
          </div>
        </div>
      </template>
    </CrmEntityLayout>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCrmOrganizationStore } from '@/stores/crmOrganizations'
import { useCrmMetaStore } from '@/stores/crmMeta'
import { useToast } from '@/composables/useToast'
import api from '@/utils/api'
import AppIcon from '@/components/common/AppIcon.vue'
import CrmEntityLayout from '@/components/crm/CrmEntityLayout.vue'
import StatusPill from '@/components/crm/StatusPill.vue'
import CurrencyAmount from '@/components/crm/CurrencyAmount.vue'
import RelativeTime from '@/components/crm/RelativeTime.vue'

const store = useCrmOrganizationStore()
const meta = useCrmMetaStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const name = computed(() => route.params.name)
const isNew = computed(() => name.value === 'new')

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('details')

const form = ref({
  organization_name: '', website: '',
  industry: '', territory: '',
  no_of_employees: null, annual_revenue: null,
  currency: 'TRY', exchange_rate: null,
  address_line_1: '', city: '', country: '',
  creation: null, modified: null,
})

const deals = ref([])
const leads = ref([])
const loadingDeals = ref(false)
const loadingLeads = ref(false)

const tabs = computed(() => [
  { value: 'details', label: 'Detay', icon: 'info' },
  { value: 'deals',   label: 'Anlaşmalar', icon: 'trending-up', count: deals.value.length || null },
  { value: 'leads',   label: "Lead'ler",  icon: 'user-plus',    count: leads.value.length || null },
])

async function loadDoc() {
  if (isNew.value) return
  loading.value = true
  try {
    const doc = await store.fetchOrganization(name.value)
    Object.assign(form.value, doc)
  } catch (e) {
    toast.error(e.message || 'Yüklenemedi')
  } finally { loading.value = false }
}

async function loadDeals() {
  loadingDeals.value = true
  try {
    const res = await api.getList('CRM Deal', {
      fields: ['name', 'status', 'deal_value', 'currency', 'modified'],
      filters: [['organization', '=', form.value.organization_name || name.value]],
      order_by: 'modified desc',
      limit_page_length: 50,
    })
    deals.value = res.data || []
  } finally { loadingDeals.value = false }
}

async function loadLeads() {
  loadingLeads.value = true
  try {
    const res = await api.getList('CRM Lead', {
      fields: ['name', 'first_name', 'last_name', 'lead_name', 'email', 'status'],
      filters: [['organization', '=', form.value.organization_name || name.value]],
      order_by: 'modified desc',
      limit_page_length: 50,
    })
    leads.value = res.data || []
  } finally { loadingLeads.value = false }
}

async function save() {
  saving.value = true
  try {
    if (isNew.value) {
      const created = await store.createOrganization(form.value)
      toast.success('Kurum oluşturuldu')
      router.replace(`/crm/organizations/${encodeURIComponent(created.name)}`)
    } else {
      await store.updateOrganization(name.value, form.value)
      toast.success('Kaydedildi')
    }
  } catch (e) {
    toast.error(e.message || 'Kaydetme başarısız')
  } finally { saving.value = false }
}

watch(activeTab, t => {
  if (t === 'deals' && !deals.value.length) loadDeals()
  if (t === 'leads' && !leads.value.length) loadLeads()
})

onMounted(async () => {
  await meta.loadAll()
  await loadDoc()
})
</script>
