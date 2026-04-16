<template>
  <div
    class="border rounded-lg transition-all"
    :class="section.enabled ? 'border-gray-200 bg-white' : 'border-dashed border-gray-300 bg-gray-50 opacity-60'"
  >
    <!-- Header Row (tiklayarak ayarlari ac/kapa) -->
    <div class="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none" @click="expanded = !expanded">
      <!-- Icon + Label -->
      <i :class="meta.icon" class="text-sm flex-shrink-0" :style="{ color: meta.color }"></i>
      <span class="text-xs font-bold text-gray-800 flex-1 truncate">{{ meta.label }}</span>

      <!-- Toggle Switch -->
      <button
        class="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
        :class="section.enabled ? 'bg-violet-500' : 'bg-gray-300'"
        :title="section.enabled ? 'Kapat' : 'Ac'"
        @click.stop="$emit('toggle')"
      >
        <div
          class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          :class="section.enabled ? 'left-[18px]' : 'left-0.5'"
        ></div>
      </button>

      <!-- Remove (cop ikonu — Unicode + FA fallback, font yuklu olmasa bile gorunur) -->
      <button
        class="px-2 py-1 text-[11px] font-bold text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-md transition-colors flex-shrink-0 flex items-center gap-1 leading-none"
        title="Bolumu kaldir"
        @click.stop="$emit('remove')"
      >
        <i class="fas fa-trash text-[10px]"></i>
        <span>Sil</span>
      </button>

      <!-- Expand/Collapse chevron (Unicode okla — gorsel ipucu) -->
      <span class="text-[14px] text-gray-400 flex-shrink-0 leading-none w-4 text-center">
        {{ expanded ? '▲' : '▼' }}
      </span>
    </div>

    <!-- Settings Panel (expanded) -->
    <div v-show="expanded" class="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-3">
      <!-- Hero Banner Settings -->
      <template v-if="section.type === 'hero_banner'">
        <div>
          <label class="form-label">Goruntuleme Modu</label>
          <select v-model="section.settings.mode" class="form-input text-xs">
            <option value="slider">Slider (otomatik gecis)</option>
            <option value="static">Statik (tek gorsel)</option>
          </select>
          <p v-if="section.settings.mode === 'static'" class="text-[10px] text-amber-600 mt-1">
            Statik modda yalnizca ilk slayt gosterilir.
          </p>
        </div>

        <div v-if="section.settings.mode === 'slider'" class="flex items-center gap-3">
          <label class="flex items-center gap-2">
            <input v-model="section.settings.autoplay" type="checkbox" class="form-checkbox rounded text-violet-600" />
            <span class="text-xs text-gray-700">Otomatik Oynatma</span>
          </label>
          <div v-if="section.settings.autoplay" class="flex items-center">
            <input v-model.number="section.settings.delay" type="number" min="1000" step="500" class="form-input text-xs w-20" />
            <span class="text-[10px] text-gray-400 ml-1">ms</span>
          </div>
        </div>

        <!-- Slaytlar Editoru -->
        <div class="border-t border-gray-200 pt-3">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold text-gray-700">
              Slaytlar
              <span class="text-gray-400 font-normal">({{ slides.length }})</span>
            </label>
            <button
              type="button"
              class="text-[11px] font-semibold text-violet-600 hover:text-violet-800 px-2 py-1 rounded hover:bg-violet-50"
              @click="addSlide"
            >
              + Slayt Ekle
            </button>
          </div>

          <div v-if="slides.length === 0" class="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
            <p class="text-xs text-gray-400">Henuz slayt eklenmedi. "+ Slayt Ekle" ile baslayin.</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(slide, sIdx) in slides"
              :key="slide.id"
              class="border border-gray-200 rounded-lg p-3 bg-white space-y-2"
            >
              <!-- Slayt basligi + sirala/sil butonlari -->
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-gray-600">Slayt #{{ sIdx + 1 }}</span>
                <div class="flex items-center gap-1">
                  <button
                    :disabled="sIdx === 0"
                    type="button"
                    class="w-6 h-6 text-[10px] text-gray-500 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Yukari"
                    @click="moveSlide(sIdx, -1)"
                  >▲</button>
                  <button
                    :disabled="sIdx === slides.length - 1"
                    type="button"
                    class="w-6 h-6 text-[10px] text-gray-500 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Asagi"
                    @click="moveSlide(sIdx, 1)"
                  >▼</button>
                  <button
                    type="button"
                    class="px-2 py-0.5 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded"
                    title="Slayti sil"
                    @click="removeSlide(sIdx)"
                  >Sil</button>
                </div>
              </div>

              <!-- Gorsel -->
              <div class="flex items-start gap-2">
                <div class="w-24 h-16 rounded border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  <img v-if="slide.image" :src="resolveImageUrl(slide.image)" alt="" class="w-full h-full object-cover" />
                  <span v-else class="text-[10px] text-gray-400">Gorsel yok</span>
                </div>
                <div class="flex-1 space-y-1">
                  <input
                    :ref="el => (fileInputs[slide.id] = el)"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="onSlideFileChange($event, slide)"
                  />
                  <button
                    type="button"
                    :disabled="uploading[slide.id]"
                    class="text-[11px] px-2 py-1 border border-violet-300 text-violet-700 rounded hover:bg-violet-50 disabled:opacity-50"
                    @click="triggerFileInput(slide.id)"
                  >
                    {{ uploading[slide.id] ? 'Yukleniyor...' : (slide.image ? 'Gorseli Degistir' : 'Gorsel Yukle') }}
                  </button>
                  <button
                    v-if="slide.image"
                    type="button"
                    class="text-[11px] px-2 py-1 text-red-500 hover:bg-red-50 rounded ml-1"
                    @click="slide.image = ''"
                  >
                    Gorseli Kaldir
                  </button>
                  <p class="text-[10px] text-gray-400">Onerilen: 1920x600px, JPG/PNG, max 2MB</p>
                </div>
              </div>

              <!-- Metin alanlari -->
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">Baslik</label>
                  <input v-model="slide.title" type="text" class="form-input text-xs" placeholder="(opsiyonel)" />
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">Alt Baslik</label>
                  <input v-model="slide.subtitle" type="text" class="form-input text-xs" placeholder="(opsiyonel)" />
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">Buton Metni</label>
                  <input v-model="slide.ctaText" type="text" class="form-input text-xs" placeholder="(opsiyonel)" />
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">Buton Linki</label>
                  <input v-model="slide.ctaLink" type="text" class="form-input text-xs" placeholder="https://..." />
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">Metin Pozisyonu</label>
                  <select v-model="slide.textPosition" class="form-input text-xs">
                    <option value="left">Sol</option>
                    <option value="center">Orta</option>
                    <option value="right">Sag</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] font-semibold text-gray-500 uppercase">Metin Rengi</label>
                  <select v-model="slide.textColor" class="form-input text-xs">
                    <option value="white">Beyaz</option>
                    <option value="dark">Koyu</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Category Grid Settings -->
      <template v-if="section.type === 'category_grid'">
        <div>
          <label class="form-label">Sutun Sayisi</label>
          <select v-model.number="section.settings.columns" class="form-input text-xs">
            <option :value="3">3 Sutun</option>
            <option :value="4">4 Sutun</option>
            <option :value="6">6 Sutun</option>
          </select>
        </div>
      </template>

      <!-- Hot Products Settings -->
      <template v-if="section.type === 'hot_products'">
        <div>
          <label class="form-label">Baslik</label>
          <input v-model="section.settings.title" type="text" class="form-input text-xs" placeholder="Populer Urunler" />
        </div>
        <div>
          <label class="form-label">Urun Sayisi</label>
          <select v-model.number="section.settings.count" class="form-input text-xs">
            <option :value="6">6</option>
            <option :value="8">8</option>
            <option :value="12">12</option>
          </select>
        </div>
      </template>

      <!-- Category Listing Settings -->
      <template v-if="section.type === 'category_listing'">
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2">
            <input v-model="section.settings.showSort" type="checkbox" class="form-checkbox rounded text-violet-600" />
            <span class="text-xs text-gray-700">Siralama</span>
          </label>
        </div>
        <div>
          <label class="form-label">Gorunum Secenekleri</label>
          <div class="flex gap-2">
            <label class="flex items-center gap-1.5">
              <input v-model="section.settings.viewModes" type="checkbox" value="grid" class="form-checkbox rounded text-violet-600" />
              <span class="text-xs">Grid</span>
            </label>
            <label class="flex items-center gap-1.5">
              <input v-model="section.settings.viewModes" type="checkbox" value="list" class="form-checkbox rounded text-violet-600" />
              <span class="text-xs">Liste</span>
            </label>
          </div>
        </div>
        <div>
          <label class="form-label">Sutun Sayisi</label>
          <select v-model.number="section.settings.columns" class="form-input text-xs">
            <option :value="3">3</option>
            <option :value="4">4</option>
          </select>
        </div>
      </template>

      <!-- Certificates Settings -->
      <template v-if="section.type === 'certificates'">
        <div>
          <label class="form-label">Gorunum</label>
          <select v-model="section.settings.layout" class="form-input text-xs">
            <option value="carousel">Carousel</option>
            <option value="grid">Grid</option>
          </select>
        </div>
      </template>

      <!-- Gallery Settings -->
      <template v-if="section.type === 'gallery'">
        <div>
          <label class="form-label">Sutun Sayisi</label>
          <select v-model.number="section.settings.columns" class="form-input text-xs">
            <option :value="3">3</option>
            <option :value="4">4</option>
          </select>
        </div>
        <label class="flex items-center gap-2">
          <input v-model="section.settings.lightbox" type="checkbox" class="form-checkbox rounded text-violet-600" />
          <span class="text-xs text-gray-700">Lightbox</span>
        </label>
      </template>

      <!-- Common: Background Color (all types) -->
      <div>
        <label class="form-label">Arkaplan Rengi</label>
        <div class="flex items-center gap-2">
          <input v-model="section.settings.bgColor" type="color" class="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
          <input v-model="section.settings.bgColor" type="text" class="form-input text-xs w-24" placeholder="#ffffff" />
          <button v-if="section.settings.bgColor" class="text-xs text-gray-400 hover:text-red-500" @click="section.settings.bgColor = ''">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// NOTE: Bu bileşen `section` prop'unu doğrudan mutate ediyor (vue/no-mutating-props).
// Emit pattern'ine refactor edilene kadar kural eslint.config.js'de warning'e indirilmiştir.
import { ref, computed, watchEffect, reactive } from 'vue'
import api from '@/utils/api'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  section: { type: Object, required: true },
})

defineEmits(['toggle', 'remove'])

const expanded = ref(false)
const { error: toastError } = useToast()

// ─── Hero Banner: slaytlar yonetimi ──────────────────────
const fileInputs = reactive({})
const uploading = reactive({})

// Slides array reactive referansi (settings icinde olusturmazsa olustur)
const slides = computed(() => {
  if (!props.section.settings) props.section.settings = {}
  if (!Array.isArray(props.section.settings.slides)) props.section.settings.slides = []
  return props.section.settings.slides
})

// Eski layout'larda slides yoksa garanti et
watchEffect(() => {
  if (props.section.type === 'hero_banner') {
    if (!props.section.settings) props.section.settings = {}
    if (!Array.isArray(props.section.settings.slides)) props.section.settings.slides = []
  }
})

function generateSlideId() {
  return 'slide-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

function addSlide() {
  slides.value.push({
    id: generateSlideId(),
    image: '',
    title: '',
    subtitle: '',
    ctaText: '',
    ctaLink: '',
    textPosition: 'left',
    textColor: 'white',
  })
}

function removeSlide(idx) {
  slides.value.splice(idx, 1)
}

function moveSlide(idx, dir) {
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= slides.value.length) return
  const arr = slides.value
  ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
}

function triggerFileInput(slideId) {
  const el = fileInputs[slideId]
  if (el) el.click()
}

async function onSlideFileChange(event, slide) {
  const file = event.target.files?.[0]
  if (!file) return

  // Boyut kontrolu (5MB)
  if (file.size > 5 * 1024 * 1024) {
    toastError('Dosya 5MB\'dan buyuk olamaz.')
    event.target.value = ''
    return
  }
  if (!file.type.startsWith('image/')) {
    toastError('Yalnizca gorsel dosyalar yuklenebilir.')
    event.target.value = ''
    return
  }

  uploading[slide.id] = true
  try {
    // 'Home' Frappe varsayilan klasoru — her zaman vardir.
    // Fiziksel dosya yine /files/<uuid>/<isim> altinda saklanir.
    const fileUrl = await api.uploadFile(file, 'Home')
    if (fileUrl) {
      slide.image = fileUrl
    }
  } catch (e) {
    toastError('Gorsel yuklenirken hata: ' + (e.message || e))
  } finally {
    uploading[slide.id] = false
    event.target.value = ''
  }
}

// Backend'den gelen /files/... yollarini tarayicida gorebilmek icin VITE_API_BASE prefix'i
function resolveImageUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  const base = import.meta.env.VITE_API_BASE || ''
  return base + url
}

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

const meta = computed(() => SECTION_META[props.section.type] || { label: props.section.type, icon: 'fas fa-puzzle-piece', color: '#9ca3af' })
</script>
