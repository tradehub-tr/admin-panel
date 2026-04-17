<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">CRM — Kişiler</h1>
        <p class="text-xs text-gray-400">{{ store.total }} kişi</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined" @click="load">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
        <button class="hdr-btn-primary" @click="$router.push('/crm/contacts/new')">
          <AppIcon name="user-plus" :size="14" /><span>Yeni Kişi</span>
        </button>
      </div>
    </div>

    <CrmListToolbar
      v-model:search="searchQuery"
      v-model:orderBy="orderBy"
      placeholder="Ad, e-posta veya şirket ara..."
      :order-by-options="orderByOptions"
      @search="onSearch"
      @update:orderBy="load"
    />

    <div v-if="store.loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!store.contacts.length" class="card crm-empty">
      <div class="icon"><AppIcon name="users" :size="22" /></div>
      <h3>Kişi yok</h3>
    </div>
    <div v-else class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th">KİŞİ</th>
              <th class="tbl-th">E-POSTA</th>
              <th class="tbl-th">TELEFON</th>
              <th class="tbl-th">ŞİRKET</th>
              <th class="tbl-th">POZİSYON</th>
              <th class="tbl-th">GÜNCELLEME</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in store.contacts"
              :key="c.name"
              class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
              @click="$router.push(`/crm/contacts/${encodeURIComponent(c.name)}`)"
            >
              <td class="tbl-td">
                <div class="flex items-center gap-2">
                  <UserAvatar :email="c.email_id" :name="c.full_name" :image="c.image" size="sm" />
                  <div>
                    <p class="text-xs font-semibold">{{ c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name }}</p>
                    <p class="text-[10px] text-gray-400 font-mono">{{ c.name }}</p>
                  </div>
                </div>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-600 dark:text-gray-300">{{ c.email_id || '-' }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500">{{ c.mobile_no || c.phone || '-' }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500 truncate block max-w-[180px]">{{ c.company_name || '-' }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-500">{{ c.designation || '-' }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-[10px] text-gray-500">
                  <RelativeTime :value="c.modified" />
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
import { useCrmContactStore } from '@/stores/crmContacts'
import AppIcon from '@/components/common/AppIcon.vue'
import ListPagination from '@/components/common/ListPagination.vue'
import UserAvatar from '@/components/crm/UserAvatar.vue'
import RelativeTime from '@/components/crm/RelativeTime.vue'
import CrmListToolbar from '@/components/crm/CrmListToolbar.vue'

const store = useCrmContactStore()

const page = ref(1)
const pageSize = ref(30)
const searchQuery = ref('')
const orderBy = ref('modified desc')

const orderByOptions = [
  { value: 'modified desc',   label: 'Son Güncellenen' },
  { value: 'creation desc',   label: 'En Yeni' },
  { value: 'first_name asc',  label: 'Ada Göre' },
]

function buildFilters() {
  const q = searchQuery.value.trim()
  if (!q) return { filters: [] }
  return {
    filters: [],
    orFilters: [
      ['first_name', 'like', `%${q}%`],
      ['last_name', 'like', `%${q}%`],
      ['email_id', 'like', `%${q}%`],
      ['company_name', 'like', `%${q}%`],
    ],
  }
}

function onSearch() { page.value = 1; load() }

async function load() {
  const { filters, orFilters } = buildFilters()
  await store.fetchContacts({
    page: page.value, pageSize: pageSize.value,
    filters, orFilters, orderBy: orderBy.value,
  })
}

onMounted(load)
</script>
