<template>
  <div class="max-w-2xl mx-auto py-6 px-4">
    <h1 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
        <AppIcon name="award" :size="20" class="text-emerald-600" />
      </div>
      Yeni Sertifika Öner
    </h1>

    <!-- Success message -->
    <div v-if="success" class="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
      <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
        <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <p class="text-green-800 font-semibold text-lg mb-1">Öneri Gönderildi</p>
      <p class="text-green-700 text-sm mb-4">{{ successMessage }}</p>
      <div class="flex justify-center gap-3">
        <button class="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors" @click="resetForm">
          Başka bir sertifika öner
        </button>
        <router-link to="/app/Certification Type" class="px-5 py-2 border border-green-300 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors">
          Sertifika Listesi
        </router-link>
      </div>
    </div>

    <!-- Form -->
    <form v-else class="space-y-5" @submit.prevent="submitSuggestion">
      <!-- Certification Name -->
      <div>
        <label for="cert-name" class="form-label">
          Sertifika Adı <span class="text-red-500">*</span>
        </label>
        <input
          id="cert-name"
          v-model="form.certification_name"
          type="text"
          class="form-input"
          placeholder="Örn: OEKO-TEX, GOTS, ISO 50001"
          required
        />
      </div>

      <!-- Category -->
      <div>
        <label for="cert-category" class="form-label">
          Kategori <span class="text-red-500">*</span>
        </label>
        <select id="cert-category" v-model="form.category" class="form-input" required>
          <option value="" disabled>Seçiniz</option>
          <option value="Management">Yönetim Sertifikası</option>
          <option value="Product">Ürün Sertifikası</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          Yönetim: Şirket kalite sistemi (ISO 9001, BSCI vb.) — Ürün: Ürün güvenliği (CE, ROHS vb.)
        </p>
      </div>

      <!-- Description -->
      <div>
        <label for="cert-desc" class="form-label">Açıklama</label>
        <textarea
          id="cert-desc"
          v-model="form.description"
          class="form-input"
          rows="3"
          placeholder="Bu sertifika hakkında kısa açıklama (opsiyonel)"
        ></textarea>
      </div>

      <!-- Error message -->
      <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <!-- Submit -->
      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="submitting"
          class="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ submitting ? 'Gönderiliyor...' : 'Öner' }}
        </button>
        <router-link
          to="/app/Certification Type"
          class="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Mevcut Sertifikaları Gör
        </router-link>
      </div>

      <p class="text-xs text-gray-400 mt-2">
        Öneriniz admin onayından sonra tüm satıcıların kullanımına açılacaktır.
      </p>
    </form>

    <!-- Pending suggestions -->
    <div v-if="pendingSuggestions.length > 0" class="mt-8 border-t pt-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Onay Bekleyen Önerilerim</h2>
      <div class="space-y-2">
        <div
          v-for="s in pendingSuggestions"
          :key="s.name"
          class="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <div>
            <span class="font-medium text-gray-900">{{ s.certification_name }}</span>
            <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">
              {{ s.category === 'Management' ? 'Yönetim' : 'Ürün' }}
            </span>
          </div>
          <span class="text-xs text-yellow-700">Onay bekleniyor</span>
        </div>
      </div>
    </div>

    <!-- Rejected suggestions -->
    <div v-if="rejectedSuggestions.length > 0" class="mt-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Reddedilen Önerilerim</h2>
      <div class="space-y-2">
        <div
          v-for="s in rejectedSuggestions"
          :key="s.name"
          class="p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium text-gray-900">{{ s.certification_name }}</span>
            <span class="text-xs text-red-700">Reddedildi</span>
          </div>
          <p v-if="s.rejection_reason" class="mt-1 text-xs text-red-600">
            Sebep: {{ s.rejection_reason }}
          </p>
        </div>
      </div>
    </div>

    <!-- Approved suggestions -->
    <div v-if="approvedSuggestions.length > 0" class="mt-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-3">Onaylanan Sertifikalarım</h2>
      <div class="space-y-2">
        <div
          v-for="s in approvedSuggestions"
          :key="s.name"
          class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <div>
            <span class="font-medium text-gray-900">{{ s.certification_name }}</span>
            <span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-800">
              {{ s.category === 'Management' ? 'Yönetim' : 'Ürün' }}
            </span>
          </div>
          <span class="text-xs text-green-700 font-medium">Onaylandı</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/common/AppIcon.vue'

const auth = useAuthStore()

const form = ref({
  certification_name: '',
  category: '',
  description: '',
})
const submitting = ref(false)
const success = ref(false)
const successMessage = ref('')
const error = ref('')
const pendingSuggestions = ref([])
const rejectedSuggestions = ref([])
const approvedSuggestions = ref([])

async function loadMySuggestions() {
  try {
    // Ensure user data is available (may not be loaded when onMounted fires)
    if (!auth.user?.email) {
      await auth.fetchUser()
    }
    const userEmail = auth.user?.email
    if (!userEmail) return

    const pendingRes = await api.getList('Certification Type', {
      filters: { suggested_by: userEmail, status: 'Pending' },
      fields: ['name', 'certification_name', 'category'],
      limit_page_length: 50,
    })
    pendingSuggestions.value = pendingRes.data || pendingRes || []

    const rejectedRes = await api.getList('Certification Type', {
      filters: { suggested_by: userEmail, status: 'Rejected' },
      fields: ['name', 'certification_name', 'category', 'rejection_reason'],
      limit_page_length: 50,
    })
    rejectedSuggestions.value = rejectedRes.data || rejectedRes || []

    const approvedRes = await api.getList('Certification Type', {
      filters: { suggested_by: userEmail, status: 'Approved' },
      fields: ['name', 'certification_name', 'category'],
      limit_page_length: 50,
    })
    approvedSuggestions.value = approvedRes.data || approvedRes || []
  } catch {
    // Silent fail — permission or network issue
  }
}

async function submitSuggestion() {
  error.value = ''
  submitting.value = true
  try {
    const res = await api.callMethod('tradehub_core.api.certification.suggest_certification', {
      certification_name: form.value.certification_name,
      category: form.value.category,
      description: form.value.description,
    })
    success.value = true
    const msg = res?.message
    successMessage.value = (typeof msg === 'object' && msg?.message) ? msg.message : (typeof msg === 'string' ? msg : 'Sertifika öneriniz admin onayına gönderildi.')
    await loadMySuggestions()
  } catch (err) {
    error.value = err.message || 'Bir hata oluştu.'
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.value = { certification_name: '', category: '', description: '' }
  success.value = false
  error.value = ''
}

onMounted(loadMySuggestions)
</script>
