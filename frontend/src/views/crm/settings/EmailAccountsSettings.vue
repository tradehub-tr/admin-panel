<template>
  <div class="card p-5">
    <div class="flex items-start justify-between mb-5">
      <div>
        <h2 class="text-[14px] font-bold text-gray-900 dark:text-gray-100 mb-1">E-posta Hesapları</h2>
        <p class="text-xs text-gray-400">Gmail, Outlook, Sendgrid vb. üzerinden e-posta gönderme/alma.</p>
      </div>
      <router-link to="/app/Email Account/new" class="hdr-btn-primary">
        <AppIcon name="plus" :size="13" /><span>Yeni Hesap</span>
      </router-link>
    </div>

    <div v-if="loading" class="text-center py-8">
      <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!accounts.length" class="crm-empty">
      <div class="icon"><AppIcon name="mail" :size="20" /></div>
      <h3>E-posta hesabı yok</h3>
    </div>
    <div v-else class="space-y-2">
      <router-link
        v-for="a in accounts"
        :key="a.name"
        :to="`/app/Email Account/${encodeURIComponent(a.name)}`"
        class="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-white/10 hover:border-violet-300 transition-all"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h4 class="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate">{{ a.email_id }}</h4>
            <span class="text-[10px] text-gray-400">{{ a.service || '-' }}</span>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span v-if="a.enable_incoming" class="crm-pill crm-pill-info">Gelen</span>
            <span v-if="a.enable_outgoing" class="crm-pill crm-pill-brand">Giden</span>
            <span v-if="a.default_incoming" class="crm-pill crm-pill-success">Varsayılan Gelen</span>
            <span v-if="a.default_outgoing" class="crm-pill crm-pill-success">Varsayılan Giden</span>
          </div>
        </div>
        <AppIcon name="chevron-right" :size="16" class="text-gray-300" />
      </router-link>
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

const accounts = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    accounts.value = await store.fetchEmailAccounts()
  } catch (e) {
    toast.error(e.message || 'Liste yüklenemedi')
  } finally { loading.value = false }
}

onMounted(load)
</script>
