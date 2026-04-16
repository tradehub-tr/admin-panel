<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">{{ doctypeLabel }}</h1>
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ totalCount }} kayıt bulundu</p>
      </div>
      <div class="flex items-center gap-2">
        <ViewModeToggle v-model="viewMode" />
        <button v-if="doctype === 'Currency Rate Pair'" class="hdr-btn-outlined" :disabled="tcmbLoading" @click="tcmbRefresh">
          <AppIcon :name="tcmbLoading ? 'loader' : 'download-cloud'" :size="14" :class="tcmbLoading ? 'animate-spin' : ''" />
          <span>TCMB'den Güncelle</span>
        </button>
        <button class="hdr-btn-outlined" @click="refreshList">
          <AppIcon name="refresh-cw" :size="14" />
          <span>Yenile</span>
        </button>
        <button v-if="canCreate" class="hdr-btn-primary" @click="createNew">
          <AppIcon name="plus" :size="14" />
          <span>Yeni Ekle</span>
        </button>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="card mb-5 !p-3">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        <div class="relative flex-1 min-w-0 sm:min-w-[200px]">
          <AppIcon name="search" :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`${doctypeLabel} ara...`"
            class="w-full pl-9 pr-3 py-2 text-[13px] bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          >
        </div>
        <div v-if="hasStatusField" class="flex items-center gap-2">
          <AppIcon name="filter" :size="13" class="text-gray-400 dark:text-gray-500" />
          <select v-model="statusFilter" class="form-input-sm w-auto">
            <option value="">Tüm Durumlar</option>
            <template v-if="statusOptions.length > 0">
              <option v-for="opt in statusOptions" :key="opt" :value="opt">{{ opt }}</option>
            </template>
            <template v-else>
              <option value="Active">Aktif</option>
              <option value="Draft">Taslak</option>
              <option value="Disabled">Pasif</option>
            </template>
          </select>
        </div>
        <div v-for="f in extraFilterFields" :key="f.fieldname" class="flex items-center gap-2">
          <AppIcon name="filter" :size="13" class="text-gray-400 dark:text-gray-500" />
          <select
            :value="extraFilters[f.fieldname] || ''"
            @change="extraFilters[f.fieldname] = $event.target.value"
            class="form-input-sm w-auto"
          >
            <option value="">Tüm {{ f.label }}</option>
            <option v-for="opt in optionsFor(f)" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <AppIcon name="arrow-down-wide-narrow" :size="13" class="text-gray-400 dark:text-gray-500" />
          <select v-model="sortBy" class="form-input-sm w-auto">
            <option value="modified desc">Son Düzenlenen</option>
            <option value="creation desc">Son Oluşturulan</option>
            <option value="name asc">İsim (A-Z)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Yükleniyor...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="items.length === 0" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
        <AppIcon name="inbox" :size="24" class="text-gray-400 dark:text-gray-500" />
      </div>
      <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Henüz kayıt yok</h3>
      <p class="text-xs text-gray-400 mb-4">{{ canCreate ? `İlk ${doctypeLabel} kaydınızı oluşturun` : `Henüz ${doctypeLabel} kaydı yok` }}</p>
      <button v-if="canCreate" class="hdr-btn-primary" @click="createNew">
        <AppIcon name="plus" :size="14" />
        <span>Yeni Ekle</span>
      </button>
    </div>

    <!-- Content -->
    <div v-else class="card p-0 overflow-hidden">

      <!-- TABLE VIEW -->
      <div v-if="viewMode === 'table'" class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th w-8"><input type="checkbox" class="form-checkbox rounded text-violet-600"></th>
              <th class="tbl-th">İSİM</th>
              <th v-for="col in listViewFields" :key="col.fieldname" class="tbl-th">
                {{ col.label.toUpperCase() }}
              </th>
              <th v-if="(!doctypeHasStatusField && isSubmittable)" class="tbl-th">DURUM</th>
              <th class="tbl-th">OLUŞTURULMA</th>
              <th class="tbl-th">DÜZENLEME</th>
              <th class="tbl-th w-12"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.name"
              class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
              @click="openDoc(item.name)"
            >
              <td class="tbl-td" @click.stop><input type="checkbox" class="form-checkbox rounded text-violet-600"></td>
              <td class="tbl-td font-semibold text-gray-900 dark:text-gray-100">{{ item.name }}</td>
              <td v-for="col in listViewFields" :key="col.fieldname" class="tbl-td">
                <template v-if="col.fieldtype === 'Select' || col.fieldname === 'status'">
                  <span class="badge" :class="getStatusClass(item[col.fieldname])">
                    {{ item[col.fieldname] || '—' }}
                  </span>
                </template>
                <template v-else-if="col.fieldtype === 'Check'">
                  <span
                    class="badge text-[10px] font-medium"
                    :class="item[col.fieldname]
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-500/10 text-gray-500'"
                  >
                    {{ item[col.fieldname] ? 'Evet' : 'Hayır' }}
                  </span>
                </template>
                <template v-else-if="col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int'">
                  <span class="text-gray-700 dark:text-gray-300">{{ formatNumber(item[col.fieldname], col.fieldtype) }}</span>
                </template>
                <template v-else-if="col.fieldtype === 'Date' || col.fieldtype === 'Datetime'">
                  <span class="text-gray-400">{{ formatDate(item[col.fieldname]) }}</span>
                </template>
                <template v-else>
                  <span class="text-gray-700 dark:text-gray-300">{{ item[col.fieldname] || '—' }}</span>
                </template>
              </td>
              <td v-if="(!doctypeHasStatusField && isSubmittable)" class="tbl-td">
                <span class="badge" :class="getDocstatusClass(item.docstatus)">
                  {{ getDocstatusLabel(item.docstatus) }}
                </span>
              </td>
              <td class="tbl-td text-gray-400">{{ formatDate(item.creation) }}</td>
              <td class="tbl-td text-gray-400">{{ formatDate(item.modified) }}</td>
              <td class="tbl-td" @click.stop>
                <div v-if="getRowActions(item).length > 0" class="flex items-center gap-1.5">
                  <button
                    v-for="act in getRowActions(item)"
                    :key="act.key"
                    @click.stop="runInlineAction(item, act)"
                    :disabled="rowActionLoading[item.name + ':' + act.key]"
                    :title="act.label"
                    :class="['inline-row-btn', act.class]"
                  >
                    <AppIcon :name="rowActionLoading[item.name + ':' + act.key] ? 'loader' : act.icon" :size="13" :class="rowActionLoading[item.name + ':' + act.key] ? 'animate-spin' : ''" />
                    <span class="text-[11px] font-medium">{{ act.label }}</span>
                  </button>
                </div>
                <button v-else class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <AppIcon name="more-vertical" :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- LIST VIEW (compact) -->
      <div v-else-if="viewMode === 'list'">
        <div
          v-for="item in items"
          :key="item.name"
          class="list-compact-item"
          @click="openDoc(item.name)"
        >
          <input type="checkbox" class="form-checkbox rounded text-violet-600 flex-shrink-0" @click.stop>
          <span class="list-compact-name">{{ item.name }}</span>
          <!-- Primary status badge -->
          <template v-if="hasStatusField">
            <span class="badge" :class="getStatusClass(item[statusFieldName])">
              {{ item[statusFieldName] || '—' }}
            </span>
          </template>
          <template v-else>
            <span class="badge" :class="getDocstatusClass(item.docstatus)">
              {{ getDocstatusLabel(item.docstatus) }}
            </span>
          </template>
          <!-- Extra in_list_view fields (skip status, already shown) -->
          <template v-for="col in listViewFields.filter(c => c.fieldname !== statusFieldName && c.fieldtype !== 'Select')" :key="col.fieldname">
            <span class="text-xs text-gray-400 hidden sm:inline">{{ item[col.fieldname] || '' }}</span>
          </template>
          <span class="list-compact-date">{{ formatDate(item.modified) }}</span>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0" @click.stop>
            <AppIcon name="more-vertical" :size="14" />
          </button>
        </div>
      </div>

      <!-- GRID VIEW (cards) -->
      <div v-else-if="viewMode === 'grid'" class="list-grid">
        <div
          v-for="item in items"
          :key="item.name"
          class="list-grid-card"
          @click="openDoc(item.name)"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="list-grid-card-title">{{ item.name }}</span>
            <template v-if="hasStatusField">
              <span class="badge text-[10px]" :class="getStatusClass(item[statusFieldName])">
                {{ item[statusFieldName] || '—' }}
              </span>
            </template>
            <template v-else>
              <span class="badge text-[10px]" :class="getDocstatusClass(item.docstatus)">
                {{ getDocstatusLabel(item.docstatus) }}
              </span>
            </template>
          </div>
          <!-- Extra in_list_view fields -->
          <div v-for="col in listViewFields.filter(c => c.fieldname !== statusFieldName)" :key="col.fieldname" class="text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span class="font-medium">{{ col.label }}:</span> {{ item[col.fieldname] || '—' }}
          </div>
          <div class="list-grid-card-meta">
            <span>{{ formatDate(item.creation) }}</span>
            <span>{{ formatDate(item.modified) }}</span>
          </div>
        </div>
      </div>

      <!-- KANBAN VIEW -->
      <div v-else-if="viewMode === 'kanban'" class="list-kanban">
        <div
          v-for="col in kanbanColumns"
          :key="col.status"
          class="kanban-col"
        >
          <div class="kanban-col-header" :style="{ borderColor: col.color }">
            <span>{{ col.label }}</span>
            <span class="kanban-col-count">{{ col.items.length }}</span>
          </div>
          <div class="kanban-col-body">
            <div
              v-for="item in col.items"
              :key="item.name"
              class="kanban-card"
              @click="openDoc(item.name)"
            >
              <div class="kanban-card-title">{{ item.name }}</div>
              <div class="kanban-card-meta">{{ formatDate(item.modified) }}</div>
            </div>
            <div v-if="col.items.length === 0" class="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
              Kayıt yok
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <ListPagination
        v-model="currentPage"
        :total="totalCount"
        :page-size="pageSize"
        @update:model-value="loadData()"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/common/AppIcon.vue'
import ListPagination from '@/components/common/ListPagination.vue'
import ViewModeToggle from '@/components/common/ViewModeToggle.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// ── Satıcı bazlı otomatik filtreler ──────────────────────────────────────────
// Satıcı rolündeki kullanıcı belirli doctype'lara eriştiğinde sadece
// kendi verilerini görmesi için arka plana filtre eklenir.
// admin_seller_profile: { name, seller_code } — auth.py'den geliyor
const SELLER_AUTO_FILTERS = {
  // Listing.seller_profile = Admin Seller Profile.seller_code
  'Listing': (user) => user.admin_seller_profile?.seller_code
    ? [['seller_profile', '=', user.admin_seller_profile.seller_code]]
    : [],
  // Order.seller = Admin Seller Profile.name
  'Order': (user) => user.admin_seller_profile?.name
    ? [['seller', '=', user.admin_seller_profile.name]]
    : [],
  // Seller Profile — sadece kendi profili
  'Seller Profile': (user) => user.seller_profile
    ? [['name', '=', user.seller_profile]]
    : [],
  // Admin Seller Profile — satıcı sadece kendi profilini görür
  'Admin Seller Profile': (user) => user.admin_seller_profile?.name
    ? [['name', '=', user.admin_seller_profile.name]]
    : [],
  // KYB Verification — sadece kendi KYB kaydı
  'KYB Verification': (user) => user.email
    ? [['user', '=', user.email]]
    : [],
  // Aşağıdakiler seller = Admin Seller Profile.name
  'Seller Balance': (user) => user.admin_seller_profile?.name
    ? [['seller', '=', user.admin_seller_profile.name]]
    : [],
  'Seller Review': (user) => user.admin_seller_profile?.name
    ? [['seller', '=', user.admin_seller_profile.name]]
    : [],
  'Seller Inquiry': (user) => user.admin_seller_profile?.name
    ? [['seller', '=', user.admin_seller_profile.name]]
    : [],
  'Seller Category': (user) => user.admin_seller_profile?.name
    ? [['seller', '=', user.admin_seller_profile.name]]
    : [],
  'Seller Gallery Image': (user) => user.admin_seller_profile?.name
    ? [['parent', '=', user.admin_seller_profile.name]]
    : [],
  // Certification Type: seller sees only Approved certs (Pending/Rejected shown in SuggestCertificationView)
  'Certification Type': (user) => [['status', '=', 'Approved']],
}

// Sadece admin görebilecek doctype'lar (satıcı erişemez)
const ADMIN_ONLY_DOCTYPES = new Set([
  'Buyer Profile', 'Cart', 'Supplier Profile',
  'Currency Rate Pair', 'Seller Application',
])

// Hiç kimsenin yeni kayıt oluşturamayacağı doctype'lar (otomatik yönetilen veriler)
const NO_CREATE_DOCTYPES = new Set([
  'Currency Rate Pair',
])

// Satıcının yeni kayıt oluşturamayacağı doctype'lar (sistem tarafından yönetilir)
const NO_CREATE_FOR_SELLER = new Set([
  'Seller Profile', 'Seller Balance', 'Seller Application',
  'Buyer Profile', 'Admin Seller Profile', 'KYB Verification',
  'Certification Type',
  // Admin-only katalog master data
  'Product Type', 'Attribute Set',
])

const canCreate = computed(() => {
  if (NO_CREATE_DOCTYPES.has(doctype.value)) return false
  if (auth.isAdmin) return true
  if (NO_CREATE_FOR_SELLER.has(doctype.value)) return false
  return true
})

function getSellerAutoFilter() {
  if (auth.isAdmin || !auth.isSeller) return []
  const filterFn = SELLER_AUTO_FILTERS[doctype.value]
  return filterFn ? filterFn(auth.user) : []
}

const items = ref([])
const totalCount = ref(0)
const loading = ref(false)
const tcmbLoading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const extraFilters = ref({})

const extraFilterFields = computed(() =>
  metaFields.value.filter(f =>
    f.in_standard_filter &&
    f.fieldname !== statusFieldName.value &&
    f.fieldtype === 'Select' &&
    f.options
  )
)

function optionsFor(f) {
  return (f.options || '').split('\n').map(o => o.trim()).filter(Boolean)
}
const sortBy = ref('modified desc')
const currentPage = ref(1)
const pageSize = 12
const viewMode = ref('table')

// DocType meta
const metaFields = ref([])
const isSubmittable = ref(false)
const metaTitleField = ref(null)
const metaLoaded = ref(false)

const doctype = computed(() => {
  const raw = route.params.doctype || ''
  return decodeURIComponent(raw)
})

const doctypeLabel = computed(() => doctype.value || 'Döküman')

// Fields marked as in_list_view (excluding name/creation/modified/docstatus)
const listViewFields = computed(() => {
  return metaFields.value.filter(f =>
    f.in_list_view &&
    !['name', 'creation', 'modified', 'docstatus', 'owner', 'modified_by'].includes(f.fieldname) &&
    !['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Table', 'Table MultiSelect', 'Button'].includes(f.fieldtype)
  )
})

// Find status Select field
const statusFieldName = computed(() => {
  const field = metaFields.value.find(f => f.fieldname === 'status' && f.fieldtype === 'Select')
  return field ? field.fieldname : null
})

// Hide status filter for sellers on Certification Type (they only see Approved + own suggestions)
const HIDE_STATUS_FILTER_FOR_SELLER = new Set(['Certification Type'])
// Whether the doctype actually has a status field (regardless of visibility)
const doctypeHasStatusField = computed(() => !!statusFieldName.value)
// Whether to show the status filter dropdown (hidden for sellers on some doctypes)
const hasStatusField = computed(() => {
  if (!auth.isAdmin && auth.isSeller && HIDE_STATUS_FILTER_FOR_SELLER.has(doctype.value)) return false
  return doctypeHasStatusField.value
})

// Status options from meta
const statusOptions = computed(() => {
  const field = metaFields.value.find(f => f.fieldname === 'status' && f.fieldtype === 'Select')
  if (!field || !field.options) return []
  return field.options.split('\n').map(o => o.trim()).filter(Boolean)
})

// Fields to request from API
const fieldsToFetch = computed(() => {
  const base = ['name', 'creation', 'modified', 'docstatus']
  const listFields = listViewFields.value.map(f => f.fieldname)
  if (statusFieldName.value && !listFields.includes(statusFieldName.value)) {
    listFields.push(statusFieldName.value)
  }
  return [...new Set([...base, ...listFields])]
})

// Kanban: use status field if available, else docstatus
const kanbanColumns = computed(() => {
  if (hasStatusField.value && statusOptions.value.length > 0) {
    const KANBAN_COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899']
    return statusOptions.value.map((status, i) => ({
      status,
      label: status,
      color: KANBAN_COLORS[i % KANBAN_COLORS.length],
      items: items.value.filter(item => item[statusFieldName.value] === status),
    }))
  }
  return [
    { status: 0, label: 'Taslak', color: '#f59e0b', items: items.value.filter(i => i.docstatus === 0) },
    { status: 1, label: 'Onaylı', color: '#10b981', items: items.value.filter(i => i.docstatus === 1) },
    { status: 2, label: 'İptal', color: '#ef4444', items: items.value.filter(i => i.docstatus === 2) },
  ]
})

// Belirli doctype'lar için özel create route'ları
const CUSTOM_CREATE_ROUTES = {
  'Product': '/app/product-add',
}

function createNew() {
  const custom = CUSTOM_CREATE_ROUTES[doctype.value]
  if (custom) {
    router.push(custom)
  } else {
    router.push(`/app/${encodeURIComponent(doctype.value)}/new`)
  }
}

async function loadMeta() {
  metaLoaded.value = false
  metaFields.value = []
  isSubmittable.value = false
  metaTitleField.value = null
  try {
    const res = await api.getMeta(doctype.value)
    metaFields.value = res?.message?.fields || []
    isSubmittable.value = !!res?.message?.is_submittable
    // Resolve the searchable title field: prefer meta.title_field,
    // otherwise fall back to a Data field named "title" if it exists.
    const explicit = res?.message?.title_field
    if (explicit) {
      metaTitleField.value = explicit
    } else {
      const titleField = metaFields.value.find(
        f => f.fieldname === 'title' && ['Data', 'Small Text'].includes(f.fieldtype)
      )
      metaTitleField.value = titleField ? 'title' : null
    }
  } catch {
    metaFields.value = []
    isSubmittable.value = false
    metaTitleField.value = null
  } finally {
    metaLoaded.value = true
  }
}

async function loadData() {
  // Satıcı admin-only doctype'a erişmeye çalışıyorsa dashboard'a yönlendir
  if (!auth.isAdmin && auth.isSeller && ADMIN_ONLY_DOCTYPES.has(doctype.value)) {
    router.push('/dashboard')
    return
  }

  loading.value = true
  try {
    const filters = []
    const orFilters = []
    if (searchQuery.value) {
      const q = `%${searchQuery.value}%`
      orFilters.push(['name', 'like', q])
      if (metaTitleField.value && metaTitleField.value !== 'name') {
        orFilters.push([metaTitleField.value, 'like', q])
      }
    }
    if (statusFilter.value) {
      const filterField = statusFieldName.value || 'status'
      filters.push([filterField, '=', statusFilter.value])
    }
    for (const [fname, value] of Object.entries(extraFilters.value)) {
      if (value) filters.push([fname, '=', value])
    }
    // URL query'den Link/Data filtreleri ekle (örn. ?listing=LST-00013)
    const reservedQuery = new Set(['status', 'page', 'sortBy', 'search', 'q', 'returnTo'])
    const metaFieldSet = new Set((metaFields.value || []).map(f => f.fieldname))
    for (const [key, val] of Object.entries(route.query || {})) {
      if (reservedQuery.has(key) || !val) continue
      if (metaFieldSet.has(key)) {
        filters.push([key, '=', String(Array.isArray(val) ? val[0] : val)])
      }
    }
    // Satıcı için otomatik filtreler ekle
    const sellerFilters = getSellerAutoFilter()
    filters.push(...sellerFilters)

    const isSearching = !!searchQuery.value
    const res = await api.getList(doctype.value, {
      fields: fieldsToFetch.value,
      filters,
      or_filters: orFilters,
      order_by: sortBy.value,
      limit_start: isSearching ? 0 : (currentPage.value - 1) * pageSize,
      limit_page_length: isSearching ? 2000 : pageSize,
    })
    items.value = res.data || []

    // Satıcı kendi profilini görüyorsa (tek kayıt) direkt form'a yönlendir
    if (!auth.isAdmin && items.value.length === 1 && sellerFilters.length > 0) {
      const singleDocTypes = new Set(['Admin Seller Profile', 'Seller Balance'])
      if (singleDocTypes.has(doctype.value)) {
        router.replace(`/app/${encodeURIComponent(doctype.value)}/${encodeURIComponent(items.value[0].name)}`)
        return
      }
    }

    if (isSearching) {
      totalCount.value = items.value.length
    } else {
      const countRes = await api.getCount(doctype.value, filters)
      totalCount.value = countRes.message || 0
    }
  } catch {
    items.value = []
    totalCount.value = 0
  } finally {
    loading.value = false
  }
}

// ── Inline row actions (doctype-specific) ────────────────────────────────────
const rowActionLoading = ref({})

function getRowActions(item) {
  if (!auth.isAdmin) return []
  if (doctype.value === 'Brand') {
    const s = item.status || ''
    const actions = []
    if (s !== 'Approved') {
      actions.push({
        key: 'approve',
        label: 'Onayla',
        icon: 'check-circle',
        class: 'inline-row-btn-approve',
        apiMethod: 'tradehub_core.api.brand.approve',
      })
    }
    if (s !== 'Rejected') {
      actions.push({
        key: 'reject',
        label: 'Reddet',
        icon: 'x-circle',
        class: 'inline-row-btn-reject',
        apiMethod: 'tradehub_core.api.brand.reject',
        requiresReason: true,
      })
    }
    return actions
  }
  return []
}

async function runInlineAction(item, act) {
  const loadKey = item.name + ':' + act.key
  if (rowActionLoading.value[loadKey]) return

  let reason = ''
  if (act.requiresReason) {
    reason = window.prompt(`${act.label} gerekçesi:`)
    if (reason === null) return
    reason = reason.trim()
    if (!reason) {
      alert('Gerekçe zorunludur')
      return
    }
  }

  rowActionLoading.value = { ...rowActionLoading.value, [loadKey]: true }
  try {
    const args = { name: item.name }
    if (act.requiresReason) args.reason = reason
    const res = await api.callMethod(act.apiMethod, args)
    const newStatus = res?.message?.status
    if (newStatus) item.status = newStatus
    alert(`${item.name}: ${act.label.toLowerCase()}${act.key === 'approve' ? 'ndı' : 'dildi'}`)
  } catch (err) {
    alert(err.message || 'İşlem başarısız')
  } finally {
    const copy = { ...rowActionLoading.value }
    delete copy[loadKey]
    rowActionLoading.value = copy
  }
}

function applyQueryFilters() {
  const q = route.query || {}
  if (q.status && statusFieldName.value) {
    statusFilter.value = String(q.status)
  } else if (q.status) {
    statusFilter.value = String(q.status)
  }
}

async function init() {
  await loadMeta()
  applyQueryFilters()
  await loadData()
}

function refreshList() {
  currentPage.value = 1
  loadData()
}

async function tcmbRefresh() {
  tcmbLoading.value = true
  try {
    await api.callMethod('tradehub_core.services.tcmb.manual_refresh')
    refreshList()
  } catch {
    // silent
  } finally {
    tcmbLoading.value = false
  }
}

function openDoc(name) {
  router.push(`/app/${encodeURIComponent(doctype.value)}/${encodeURIComponent(name)}`)
}

// Status coloring for Select fields
const STATUS_COLOR_MAP = {
  // Green
  'Approved': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  'Active': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  'Completed': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  'Enabled': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  'Published': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  'Paid': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  // Amber
  'Draft': 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  'Submitted': 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  'Pending': 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  'Waiting for payment': 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  // Blue
  'Under Review': 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  'Confirming': 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  'Delivering': 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  'Processing': 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  'In Transit': 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  // Red
  'Rejected': 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  'Cancelled': 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  'Disabled': 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  'Suspended': 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  'Revoked': 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  // Violet
  'Preparing Shipment': 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
}

function getStatusClass(val) {
  if (!val) return 'bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400'
  return STATUS_COLOR_MAP[val] || 'bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400'
}

function getDocstatusClass(docstatus) {
  const map = {
    0: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    1: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    2: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  }
  return map[docstatus] || 'bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400'
}

function getDocstatusLabel(docstatus) {
  const map = { 0: 'Taslak', 1: 'Aktif', 2: 'İptal' }
  return map[docstatus] || 'Bilinmiyor'
}

function formatDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('tr-TR')
}

function formatNumber(val, fieldtype) {
  if (val === null || val === undefined || val === '') return '—'
  if (fieldtype === 'Currency') return Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (fieldtype === 'Float') return Number(val).toLocaleString('tr-TR', { maximumFractionDigits: 4 })
  return String(val)
}

watch(() => route.params.doctype, () => {
  currentPage.value = 1
  statusFilter.value = ''
  extraFilters.value = {}
  init()
})

watch(() => route.query.status, (val) => {
  if (val && String(val) !== statusFilter.value) {
    statusFilter.value = String(val)
    currentPage.value = 1
    loadData()
  }
})

let searchTimeout
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadData()
  }, 400)
})

watch([statusFilter, sortBy], () => {
  currentPage.value = 1
  loadData()
})

watch(extraFilters, () => {
  currentPage.value = 1
  loadData()
}, { deep: true })

onMounted(init)
</script>
