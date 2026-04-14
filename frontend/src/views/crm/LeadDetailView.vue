<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="$router.push('/crm/leads')">
          <AppIcon name="arrow-left" :size="14" /><span>Geri</span>
        </button>
        <div>
          <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
            {{ isNew ? 'Yeni Lead' : (form.lead_name || form.first_name || form.email || name) }}
          </h1>
          <p v-if="!isNew" class="text-[10px] text-gray-400 font-mono">{{ name }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="!isNew && form.status !== 'Qualified'"
          class="hdr-btn-outlined"
          @click="convertToDeal"
        >
          <AppIcon name="trending-up" :size="14" /><span>Fırsata Dönüştür</span>
        </button>
        <button class="hdr-btn-primary" :disabled="saving" @click="save">
          <AppIcon name="save" :size="14" /><span>{{ saving ? 'Kaydediliyor...' : 'Kaydet' }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="card lg:col-span-2 p-5">
        <h3 class="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wide">Kişi Bilgileri</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Ad</label>
            <input v-model="form.first_name" class="form-input" placeholder="Ad" />
          </div>
          <div>
            <label class="form-label">Soyad</label>
            <input v-model="form.last_name" class="form-input" placeholder="Soyad" />
          </div>
          <div>
            <label class="form-label">E-posta</label>
            <input v-model="form.email" class="form-input" type="email" placeholder="ornek@sirket.com" />
          </div>
          <div>
            <label class="form-label">Telefon</label>
            <input v-model="form.mobile_no" class="form-input" placeholder="+90 555 ..." />
          </div>
          <div class="sm:col-span-2">
            <label class="form-label">Kurum</label>
            <input v-model="form.organization" class="form-input" placeholder="Şirket adı" />
          </div>
        </div>
      </div>

      <div class="card p-5">
        <h3 class="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wide">Durum</h3>
        <div class="space-y-4">
          <div>
            <label class="form-label">Durum</label>
            <select v-model="form.status" class="form-input">
              <option value="New">Yeni</option>
              <option value="Contacted">İletişime Geçildi</option>
              <option value="Nurture">Takip</option>
              <option value="Qualified">Nitelikli</option>
              <option value="Unqualified">Reddedildi</option>
              <option value="Junk">Spam</option>
            </select>
          </div>
          <div>
            <label class="form-label">Kaynak</label>
            <input v-model="form.source" class="form-input" placeholder="Website, Referral..." />
          </div>
        </div>
      </div>

      <div class="card lg:col-span-3 p-5">
        <h3 class="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wide">Not</h3>
        <textarea v-model="form.lead_note" rows="4" class="form-input" placeholder="İç notlar..."></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCrmStore } from '@/stores/crm'
import { useToast } from '@/composables/useToast'
import AppIcon from '@/components/common/AppIcon.vue'

const crm = useCrmStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const name = computed(() => route.params.name)
const isNew = computed(() => name.value === 'new')

const loading = ref(false)
const saving = ref(false)
const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  mobile_no: '',
  organization: '',
  status: 'New',
  source: 'Manual',
  lead_note: '',
})

async function loadDoc() {
  if (isNew.value) return
  loading.value = true
  try {
    const doc = await crm.fetchLead(name.value)
    Object.assign(form.value, doc)
  } catch (e) {
    toast.error(e.message || 'Lead yüklenemedi')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    if (isNew.value) {
      const created = await crm.createLead(form.value)
      toast.success('Lead oluşturuldu')
      router.replace(`/crm/leads/${encodeURIComponent(created.name)}`)
    } else {
      await crm.updateLead(name.value, form.value)
      toast.success('Değişiklikler kaydedildi')
    }
  } catch (e) {
    toast.error(e.message || 'Kaydetme başarısız')
  } finally {
    saving.value = false
  }
}

async function convertToDeal() {
  try {
    const res = await crm.convertLeadToDeal(name.value)
    const dealName = res?.message?.name || res?.message
    toast.success('Lead fırsata dönüştürüldü')
    if (dealName) router.push(`/crm/deals/${encodeURIComponent(dealName)}`)
  } catch (e) {
    toast.error(e.message || 'Dönüştürme başarısız')
  }
}

onMounted(loadDoc)
</script>
