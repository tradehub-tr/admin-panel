<template>
  <div class="card p-5">
    <h2 class="text-[14px] font-bold text-gray-900 dark:text-gray-100 mb-1">Genel Ayarlar</h2>
    <p class="text-xs text-gray-400 mb-5">CRM çapındaki varsayılanları buradan yönetin.</p>

    <div v-if="loading" class="text-center py-8">
      <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
    </div>
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Varsayılan Para Birimi</label>
          <input v-model="form.default_currency" class="form-input" placeholder="TRY" />
        </div>
        <div>
          <label class="form-label">Varsayılan Dil</label>
          <select v-model="form.default_language" class="form-input">
            <option value="">—</option>
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer">
        <input v-model="form.track_communications" type="checkbox" class="accent-violet-500" />
        <div>
          <div class="text-[13px] font-semibold">İletişimi otomatik izle</div>
          <div class="text-[11px] text-gray-400">E-posta ve çağrılar Lead/Deal timeline'ına otomatik eklensin.</div>
        </div>
      </label>

      <label class="flex items-center gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer">
        <input v-model="form.auto_capture_lead" type="checkbox" class="accent-violet-500" />
        <div>
          <div class="text-[13px] font-semibold">Website formundan lead oluştur</div>
          <div class="text-[11px] text-gray-400">İletişim formundan gelen talepler otomatik lead yapılır.</div>
        </div>
      </label>

      <div class="pt-4 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
        <button class="hdr-btn-primary" :disabled="saving" @click="save">
          <AppIcon name="save" :size="13" />
          <span>{{ saving ? 'Kaydediliyor...' : 'Kaydet' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCrmSettingsStore } from '@/stores/crmSettings'
import { useToast } from '@/composables/useToast'
import AppIcon from '@/components/common/AppIcon.vue'

const store = useCrmSettingsStore()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const form = ref({
  default_currency: 'TRY',
  default_language: '',
  track_communications: false,
  auto_capture_lead: false,
})

async function load() {
  loading.value = true
  try {
    const data = await store.fetchGlobalSettings()
    if (data) Object.assign(form.value, data)
  } finally { loading.value = false }
}

async function save() {
  saving.value = true
  try {
    await store.updateGlobalSettings({ ...form.value })
    toast.success('Ayarlar kaydedildi')
  } catch (e) {
    toast.error(e.message || 'Kaydetme başarısız')
  } finally { saving.value = false }
}

onMounted(load)
</script>
