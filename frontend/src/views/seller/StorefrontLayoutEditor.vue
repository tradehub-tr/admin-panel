<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-3">
        <button class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0" @click="$router.push('/dashboard')">
          <i class="fas fa-arrow-left text-xs"></i>
        </button>
        <div class="min-w-0">
          <h1 class="text-[15px] font-bold text-gray-900">Sayfa Duzeni</h1>
          <p class="text-xs text-gray-400">Magaza sayfanizin bolumlerini surukleyerek duzenleyin</p>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
        <a v-if="sellerCode" :href="storefrontUrl" target="_blank" class="hdr-btn-outlined text-xs">
          <i class="fas fa-external-link mr-1.5"></i>Onizle
        </a>
        <button class="hdr-btn-outlined" :class="{ 'opacity-50': !hasChanges }" :disabled="!hasChanges" @click="resetLayout">
          <i class="fas fa-undo mr-1.5 text-xs"></i>Sifirla
        </button>
        <button class="hdr-btn-primary" :disabled="saving" @click="saveLayout">
          <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-floppy-disk'" class="mr-1.5 text-xs"></i>
          {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <i class="fas fa-spinner fa-spin text-2xl text-violet-500"></i>
      <p class="text-sm text-gray-400 mt-3">Yukleniyor...</p>
    </div>

    <!-- No Seller -->
    <div v-else-if="!sellerCode" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
        <i class="fas fa-store text-2xl text-gray-500"></i>
      </div>
      <h3 class="text-sm font-bold text-gray-700 mb-1">Satici profili bulunamadi</h3>
      <p class="text-xs text-gray-400">Sayfa duzeni icin satici profiliniz gereklidir.</p>
    </div>

    <!-- Editor -->
    <template v-else>
      <div class="grid grid-cols-12 gap-4">

        <!-- LEFT: Section Palette -->
        <div class="col-span-12 lg:col-span-3">
          <div class="card sticky top-4">
            <h3 class="text-sm font-bold text-gray-900 mb-3">
              <i class="fas fa-puzzle-piece text-violet-500 mr-2"></i>Bolumler
            </h3>
            <p class="text-[10px] text-gray-400 mb-3">Surukleyerek saga birakin veya cift tiklayin. Kaldirmak icin sagdaki cop ikonunu kullanin.</p>

            <draggable
              :list="availableSections"
              :group="{ name: 'sections', pull: 'clone', put: false }"
              :clone="cloneSection"
              item-key="type"
              :sort="false"
              class="space-y-1.5"
            >
              <template #item="{ element }">
                <div
                  class="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-grab hover:border-violet-400 hover:bg-violet-50/30 bg-white transition-all"
                  @dblclick="addSection(element.type)"
                >
                  <i :class="element.icon" class="text-xs" :style="{ color: element.color }"></i>
                  <span class="text-[11px] font-medium text-gray-700">{{ element.label }}</span>
                </div>
              </template>
            </draggable>

            <!-- Theme Settings -->
            <div class="mt-5 pt-4 border-t border-gray-100">
              <h3 class="text-sm font-bold text-gray-900 mb-3">
                <i class="fas fa-palette text-amber-500 mr-2"></i>Tema
              </h3>
              <div class="space-y-3">
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">Ana Renk</label>
                  <div class="flex items-center gap-2 mt-1">
                    <input v-model="theme.primaryColor" type="color" class="w-7 h-7 rounded border cursor-pointer" />
                    <input v-model="theme.primaryColor" type="text" class="form-input text-xs flex-1" />
                  </div>
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">Aksan Renk</label>
                  <div class="flex items-center gap-2 mt-1">
                    <input v-model="theme.accentColor" type="color" class="w-7 h-7 rounded border cursor-pointer" />
                    <input v-model="theme.accentColor" type="text" class="form-input text-xs flex-1" />
                  </div>
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">Nav Arkaplan</label>
                  <div class="flex items-center gap-2 mt-1">
                    <input v-model="theme.navBgColor" type="color" class="w-7 h-7 rounded border cursor-pointer" />
                    <input v-model="theme.navBgColor" type="text" class="form-input text-xs flex-1" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- RIGHT: Active Sections (sortable) -->
        <div class="col-span-12 lg:col-span-9">
          <!-- Fixed: Store Header (silinemez ama duzenlenebilir — logo, slogan, header bg) -->
          <div class="mb-2 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden">
            <div class="flex items-center gap-2 px-3 py-2 cursor-pointer select-none" @click="headerExpanded = !headerExpanded">
              <i class="fas fa-lock text-[10px] text-gray-400"></i>
              <span class="text-xs font-medium text-gray-600 flex-1">Magaza Basligi (sabit - silinemez)</span>
              <span class="text-[14px] text-gray-400 leading-none w-4 text-center">
                {{ headerExpanded ? '▲' : '▼' }}
              </span>
            </div>

            <div v-show="headerExpanded" class="border-t border-gray-200 px-4 py-3 bg-white space-y-4">
              <!-- Logo Upload -->
              <div>
                <label class="text-[10px] font-semibold text-gray-500 uppercase block mb-2">Sirket Logosu</label>
                <div class="flex items-center gap-3">
                  <div class="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img v-if="storeHeader.logo" :src="resolveStoreHeaderUrl(storeHeader.logo)" alt="Logo" class="w-full h-full object-cover" />
                    <i v-else class="fas fa-building text-2xl text-gray-300"></i>
                  </div>
                  <div class="flex-1">
                    <input ref="logoInputEl" type="file" accept="image/*" class="hidden" @change="onHeaderFileChange($event, 'logo')" />
                    <button
                      type="button"
                      :disabled="headerUploading.logo"
                      class="text-[11px] px-3 py-1.5 border border-violet-300 text-violet-700 rounded hover:bg-violet-50 disabled:opacity-50"
                      @click="$refs.logoInputEl.click()"
                    >
                      <i class="fas fa-cloud-arrow-up mr-1.5"></i>
                      {{ headerUploading.logo ? 'Yukleniyor...' : (storeHeader.logo ? 'Logoyu Degistir' : 'Logo Yukle') }}
                    </button>
                    <button
                      v-if="storeHeader.logo"
                      type="button"
                      class="text-[11px] ml-1 px-2 py-1.5 text-red-500 hover:bg-red-50 rounded"
                      @click="storeHeader.logo = ''; saveStoreHeader()"
                    >
                      Kaldir
                    </button>
                    <p class="text-[10px] text-gray-400 mt-1">PNG/JPG/WEBP — Maks 5MB. Onerilen: 200x200px kare.</p>
                  </div>
                </div>
              </div>

              <!-- Slogan -->
              <div>
                <label class="text-[10px] font-semibold text-gray-500 uppercase block mb-1">Slogan (opsiyonel)</label>
                <input
                  v-model="storeHeader.slogan"
                  type="text"
                  class="form-input text-xs"
                  placeholder="Kisa, akilda kalici bir slogan..."
                  @blur="saveStoreHeader()"
                />
              </div>

              <!-- Save status -->
              <div class="text-[10px] text-gray-400 italic">
                <span v-if="headerSaving"><i class="fas fa-spinner fa-spin mr-1"></i>Kaydediliyor...</span>
                <span v-else-if="headerSavedAt">Kaydedildi.</span>
              </div>
            </div>
          </div>

          <!-- Draggable Sections (sadece sol palette'ten drop kabul eder, mevcut kartlar tasinamaz) -->
          <draggable
            v-model="sections"
            :group="{ name: 'sections', pull: false, put: true }"
            item-key="id"
            :sort="false"
            animation="200"
            ghost-class="opacity-30"
            handle=".__no-drag-handle__"
            class="space-y-2 min-h-[200px]"
            @change="onSectionChange"
          >
            <template #item="{ element, index }">
              <LayoutSectionCard
                :section="element"
                @toggle="toggleSection(index)"
                @remove="removeSection(index)"
              />
            </template>
          </draggable>

          <!-- Drop zone hint -->
          <div v-if="sections.length === 0" class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mt-2">
            <i class="fas fa-arrows-alt text-3xl text-gray-300 mb-3 block"></i>
            <p class="text-sm text-gray-400">Soldaki bolumlerden surukleyerek buraya birakin</p>
          </div>

          <!-- Fixed: Footer -->
          <div class="mt-2 px-3 py-2 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
            <div class="flex items-center gap-2 text-xs text-gray-400">
              <i class="fas fa-lock text-[10px]"></i>
              <span class="font-medium">Alt Bilgi (sabit - silinemez)</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import draggable from 'vuedraggable'
import { useToast } from '@/composables/useToast'
import api from '@/utils/api'
import LayoutSectionCard from '@/components/seller/LayoutSectionCard.vue'

const { success, error } = useToast()

// ─── State ──────────────────────────────────────────────
const loading = ref(true)
const saving = ref(false)
const sellerCode = ref('')
const sections = ref([])
const originalSections = ref('')
const theme = ref({
  primaryColor: '#1e3a5f',
  accentColor: '#f59e0b',
  bgColor: '#ffffff',
  navBgColor: '#1e3a5f',
  navTextColor: '#ffffff',
})

// Magaza Basligi (sabit section — silinemez ama duzenlenebilir)
const headerExpanded = ref(false)
const headerSaving = ref(false)
const headerSavedAt = ref(0)
const headerUploading = ref({ logo: false })
const storeHeader = ref({ logo: '', slogan: '' })

let nextId = 100

// ─── Available Sections (palette) ───────────────────────
const SECTION_META = {
  hero_banner: { label: 'Hero Banner', icon: 'fas fa-images', color: '#6366f1' },
  category_grid: { label: 'Kategori Grid', icon: 'fas fa-th-large', color: '#f59e0b' },
  hot_products: { label: 'Populer Urunler', icon: 'fas fa-fire', color: '#ef4444' },
  category_listing: { label: 'Urun Listeleme', icon: 'fas fa-list', color: '#3b82f6' },
  company_info: { label: 'Sirket Bilgisi', icon: 'fas fa-building', color: '#6b7280' },
  certificates: { label: 'Sertifikalar', icon: 'fas fa-certificate', color: '#10b981' },
  why_choose_us: { label: 'Neden Biz', icon: 'fas fa-star', color: '#f59e0b' },
  gallery: { label: 'Galeri', icon: 'fas fa-photo-video', color: '#8b5cf6' },
  company_introduction: { label: 'Sirket Tanitimi', icon: 'fas fa-info-circle', color: '#06b6d4' },
  contact_form: { label: 'Iletisim Formu', icon: 'fas fa-envelope', color: '#ec4899' },
}

const availableSections = ref(
  Object.entries(SECTION_META).map(([type, meta]) => ({
    type,
    ...meta,
  }))
)

const storefrontUrl = computed(() => {
  const base = import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5173'
  return `${base}/pages/seller/seller-shop.html?seller=${sellerCode.value}`
})

const hasChanges = computed(() => {
  return JSON.stringify(sections.value) !== originalSections.value
})

// ─── Default section settings ───────────────────────────
const DEFAULT_SETTINGS = {
  hero_banner: { mode: 'slider', autoplay: true, delay: 5000, bgColor: '', slides: [] },
  category_grid: { columns: 4, bgColor: '' },
  hot_products: { title: '', bgColor: '', count: 8 },
  category_listing: { showSort: true, viewModes: ['grid', 'list'], columns: 4, bgColor: '' },
  company_info: { bgColor: '' },
  certificates: { layout: 'carousel', columns: 4, bgColor: '' },
  why_choose_us: { bgColor: '' },
  gallery: { columns: 4, lightbox: true, bgColor: '' },
  company_introduction: { bgColor: '' },
  contact_form: { bgColor: '' },
}

// ─── Methods ────────────────────────────────────────────
function cloneSection(original) {
  return {
    id: nextId++,
    type: original.type,
    order: sections.value.length + 1,
    enabled: true,
    settings: { ...(DEFAULT_SETTINGS[original.type] || {}) },
  }
}

function addSection(type) {
  sections.value.push({
    id: nextId++,
    type,
    order: sections.value.length + 1,
    enabled: true,
    settings: { ...(DEFAULT_SETTINGS[type] || {}) },
  })
}

function toggleSection(index) {
  sections.value[index].enabled = !sections.value[index].enabled
}

function removeSection(index) {
  sections.value.splice(index, 1)
  reorderSections()
}

function reorderSections() {
  sections.value.forEach((s, i) => { s.order = i + 1 })
}

function onSectionChange() {
  reorderSections()
}

function resetLayout() {
  if (!confirm('Degisiklikler sifirlanacak. Emin misiniz?')) return
  sections.value = JSON.parse(originalSections.value)
}

async function saveLayout() {
  saving.value = true
  try {
    // Clean sections for API (remove palette metadata)
    const cleanSections = sections.value.map((s, i) => ({
      type: s.type,
      order: i + 1,
      enabled: s.enabled,
      settings: s.settings || {},
    }))

    await api.callMethod('tradehub_core.api.seller.save_storefront_layout', {
      seller_code: sellerCode.value,
      sections: JSON.stringify(cleanSections),
      theme_config: JSON.stringify(theme.value),
    })

    originalSections.value = JSON.stringify(sections.value)
    success('Sayfa duzeni kaydedildi!')
  } catch (e) {
    error('Kayit sirasinda hata olustu.')
  }
  saving.value = false
}

// ─── Magaza Basligi handlers ────────────────────────────
function resolveStoreHeaderUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  const base = import.meta.env.VITE_API_BASE || ''
  return base + url
}

async function onHeaderFileChange(event, field) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    error('Dosya 5MB\'dan buyuk olamaz.')
    event.target.value = ''
    return
  }
  if (!file.type.startsWith('image/')) {
    error('Yalnizca gorsel dosyalar yuklenebilir.')
    event.target.value = ''
    return
  }
  headerUploading.value[field] = true
  try {
    const fileUrl = await api.uploadFile(file, 'Home')
    if (fileUrl) {
      storeHeader.value[field] = fileUrl
      await saveStoreHeader()
    }
  } catch (e) {
    error('Gorsel yuklenirken hata olustu.')
  } finally {
    headerUploading.value[field] = false
    event.target.value = ''
  }
}

async function saveStoreHeader() {
  headerSaving.value = true
  try {
    await api.callMethod('tradehub_core.api.seller.update_my_admin_seller_profile', {
      logo: storeHeader.value.logo || '',
      slogan: storeHeader.value.slogan || '',
    })
    headerSavedAt.value = Date.now()
  } catch (e) {
    error('Magaza basligi kaydedilemedi.')
  } finally {
    headerSaving.value = false
  }
}

async function loadLayout() {
  loading.value = true
  try {
    // Get seller profile first
    const profileRes = await api.callMethod('tradehub_core.api.seller.get_my_admin_seller_profile')
    const profile = profileRes?.message
    if (profile?.seller_code) {
      sellerCode.value = profile.seller_code
    }
    if (profile) {
      storeHeader.value = {
        logo: profile.logo || '',
        slogan: profile.slogan || '',
      }
    }

    if (!sellerCode.value) {
      loading.value = false
      return
    }

    // Get existing layout
    const layoutRes = await api.callMethod('tradehub_core.api.seller.get_storefront_layout', {
      seller_code: sellerCode.value,
    })

    const layoutData = layoutRes?.message
    if (layoutData?.sections) {
      sections.value = layoutData.sections.map((s, i) => {
        // DEFAULT_SETTINGS ile merge et — eski layout'larda yeni alanlari (slides vb.) garanti eder
        const merged = { ...(DEFAULT_SETTINGS[s.type] || {}), ...(s.settings || {}) }
        return {
          id: nextId++,
          type: s.type,
          order: s.order || i + 1,
          enabled: s.enabled !== false,
          settings: merged,
        }
      })
    } else {
      // Default sections
      sections.value = [
        { id: nextId++, type: 'hero_banner', order: 1, enabled: true, settings: { ...DEFAULT_SETTINGS.hero_banner } },
        { id: nextId++, type: 'category_grid', order: 2, enabled: true, settings: { ...DEFAULT_SETTINGS.category_grid } },
        { id: nextId++, type: 'hot_products', order: 3, enabled: true, settings: { ...DEFAULT_SETTINGS.hot_products } },
        { id: nextId++, type: 'category_listing', order: 4, enabled: true, settings: { ...DEFAULT_SETTINGS.category_listing } },
      ]
    }

    if (layoutData?.theme) {
      Object.assign(theme.value, layoutData.theme)
    }

    originalSections.value = JSON.stringify(sections.value)
  } catch (e) {
    // Use defaults if API fails
    sections.value = [
      { id: nextId++, type: 'hero_banner', order: 1, enabled: true, settings: { ...DEFAULT_SETTINGS.hero_banner } },
      { id: nextId++, type: 'category_grid', order: 2, enabled: true, settings: { ...DEFAULT_SETTINGS.category_grid } },
      { id: nextId++, type: 'hot_products', order: 3, enabled: true, settings: { ...DEFAULT_SETTINGS.hot_products } },
      { id: nextId++, type: 'category_listing', order: 4, enabled: true, settings: { ...DEFAULT_SETTINGS.category_listing } },
    ]
    originalSections.value = JSON.stringify(sections.value)
  }
  loading.value = false
}

// ─── Lifecycle ──────────────────────────────────────────
onMounted(loadLayout)
</script>
