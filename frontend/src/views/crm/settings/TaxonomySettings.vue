<template>
  <div class="card p-5">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h2 class="text-[14px] font-bold text-gray-900 dark:text-gray-100 mb-1">{{ cfg.title }}</h2>
        <p class="text-xs text-gray-400">{{ cfg.description }}</p>
      </div>
      <button class="hdr-btn-primary" @click="openCreate">
        <AppIcon name="plus" :size="13" /><span>Yeni</span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-8">
      <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!items.length" class="crm-empty">
      <div class="icon"><AppIcon name="inbox" :size="20" /></div>
      <h3>Kayıt yok</h3>
      <p>Yukarıdaki "Yeni" butonu ile ekleyebilirsiniz.</p>
    </div>
    <div v-else class="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
      <div v-for="item in items" :key="item.name" class="crm-taxo-row">
        <span class="crm-taxo-handle">
          <AppIcon name="grip-vertical" :size="14" />
        </span>
        <div class="flex items-center gap-2 min-w-0">
          <span v-if="item.color" class="crm-taxo-color" :style="{ '--taxo-color': item.color }"></span>
          <span class="text-[13px] font-semibold text-gray-800 dark:text-gray-100 truncate">{{ item.name }}</span>
          <span class="text-[10px] text-gray-400 font-mono">({{ item.name }})</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="text-gray-400 hover:text-violet-500" title="Düzenle" @click="openEdit(item)">
            <AppIcon name="pencil" :size="14" />
          </button>
          <button class="text-gray-400 hover:text-rose-500" title="Sil" @click="remove(item)">
            <AppIcon name="trash-2" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <QuickCreateDrawer
      v-model="drawerOpen"
      :title="editing ? 'Düzenle' : 'Yeni ' + cfg.singular"
      submit-label="Kaydet"
      :saving="saving"
      @submit="save"
    >
      <div class="space-y-3">
        <div>
          <label class="form-label">{{ cfg.nameLabel }}</label>
          <input v-model="form.nameVal" class="form-input" :placeholder="cfg.nameLabel" />
        </div>
        <div v-if="cfg.hasColor">
          <label class="form-label">Renk</label>
          <div class="flex items-center gap-2">
            <input v-model="form.color" type="color" class="w-10 h-10 p-0 border rounded-lg" />
            <input v-model="form.color" class="form-input flex-1" placeholder="#8b5cf6" />
          </div>
        </div>
        <div v-if="cfg.hasPosition">
          <label class="form-label">Sıra</label>
          <input v-model.number="form.position" type="number" class="form-input" placeholder="0" />
        </div>
      </div>
    </QuickCreateDrawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/utils/api'
import { useToast } from '@/composables/useToast'
import AppIcon from '@/components/common/AppIcon.vue'
import QuickCreateDrawer from '@/components/crm/QuickCreateDrawer.vue'

const props = defineProps({
  preset: { type: String, required: true },
})

const toast = useToast()

const PRESETS = {
  'lead-status': {
    doctype: 'CRM Lead Status',
    title: 'Lead Durumları',
    description: 'Lead yaşam döngüsü durumları (Yeni, Takip, Nitelikli vb.)',
    singular: 'Durum',
    nameLabel: 'Durum Adı',
    nameField: 'lead_status',
    hasColor: true,
    hasPosition: true,
  },
  'deal-status': {
    doctype: 'CRM Deal Status',
    title: 'Deal Durumları',
    description: 'Anlaşma aşamaları (Nitelendirme, Teklif, Müzakere, Kazanıldı vb.)',
    singular: 'Durum',
    nameLabel: 'Durum Adı',
    nameField: 'deal_status',
    hasColor: true,
    hasPosition: true,
  },
  'lead-source': {
    doctype: 'CRM Lead Source',
    title: 'Lead Kaynakları',
    description: 'Website, Referans, Reklam, Sosyal Medya vb.',
    singular: 'Kaynak',
    nameLabel: 'Kaynak Adı',
    nameField: 'lead_source',
    hasColor: false,
    hasPosition: false,
  },
  industry: {
    doctype: 'CRM Industry',
    title: 'Sektörler',
    description: 'Kurum sektörleri',
    singular: 'Sektör',
    nameLabel: 'Sektör Adı',
    nameField: 'industry',
    hasColor: false,
    hasPosition: false,
  },
  territory: {
    doctype: 'CRM Territory',
    title: 'Bölgeler',
    description: 'Coğrafi veya pazar bölgeleri',
    singular: 'Bölge',
    nameLabel: 'Bölge Adı',
    nameField: 'territory_name',
    hasColor: false,
    hasPosition: false,
  },
  'lost-reason': {
    doctype: 'CRM Lost Reason',
    title: 'Kayıp Nedenleri',
    description: 'Anlaşma neden kaybedildi (Fiyat, Zamanlama, Rakip vb.)',
    singular: 'Neden',
    nameLabel: 'Neden',
    nameField: 'lost_reason',
    hasColor: false,
    hasPosition: false,
  },
  communication: {
    doctype: 'CRM Communication Status',
    title: 'İletişim Durumları',
    description: 'İletişim takip durumları',
    singular: 'Durum',
    nameLabel: 'Durum Adı',
    nameField: 'status',
    hasColor: false,
    hasPosition: false,
  },
}

const cfg = computed(() => PRESETS[props.preset] || PRESETS['lead-status'])

const items = ref([])
const loading = ref(false)
const saving = ref(false)
const drawerOpen = ref(false)
const editing = ref(null)
const form = ref({ nameVal: '', color: '#8b5cf6', position: 0 })

async function load() {
  loading.value = true
  try {
    const fields = ['name']
    if (cfg.value.hasColor) fields.push('color')
    if (cfg.value.hasPosition) fields.push('position')
    const res = await api.getList(cfg.value.doctype, {
      fields,
      order_by: cfg.value.hasPosition ? 'position asc' : 'name asc',
      limit_page_length: 200,
    })
    items.value = res.data || []
  } catch (e) {
    toast.error(e.message || 'Yüklenemedi')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { nameVal: '', color: '#8b5cf6', position: items.value.length }
  drawerOpen.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    nameVal: item.name,
    color: item.color || '#8b5cf6',
    position: item.position || 0,
  }
  drawerOpen.value = true
}

async function save() {
  if (!form.value.nameVal.trim()) {
    toast.error('İsim alanı zorunlu')
    return
  }
  saving.value = true
  try {
    const payload = {}
    payload[cfg.value.nameField] = form.value.nameVal
    payload.name = form.value.nameVal
    if (cfg.value.hasColor) payload.color = form.value.color
    if (cfg.value.hasPosition) payload.position = form.value.position
    if (editing.value) {
      await api.updateDoc(cfg.value.doctype, editing.value.name, payload)
      toast.success('Güncellendi')
    } else {
      await api.createDoc(cfg.value.doctype, payload)
      toast.success('Eklendi')
    }
    drawerOpen.value = false
    await load()
  } catch (e) {
    toast.error(e.message || 'Kaydetme başarısız')
  } finally {
    saving.value = false
  }
}

async function remove(item) {
  if (!confirm(`"${item.name}" silinsin mi?`)) return
  try {
    await api.deleteDoc(cfg.value.doctype, item.name)
    items.value = items.value.filter(x => x.name !== item.name)
    toast.success('Silindi')
  } catch (e) {
    toast.error(e.message || 'Silinemedi')
  }
}

watch(() => props.preset, load, { immediate: false })
onMounted(load)
</script>
