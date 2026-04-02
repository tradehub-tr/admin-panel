<template>
  <div
    class="border rounded-lg transition-all"
    :class="section.enabled ? 'border-gray-200 bg-white' : 'border-dashed border-gray-300 bg-gray-50 opacity-60'"
  >
    <!-- Header Row -->
    <div class="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none" @click="expanded = !expanded">
      <!-- Drag Handle -->
      <i class="fas fa-grip-vertical drag-handle cursor-grab text-gray-300 hover:text-gray-500 text-sm"></i>

      <!-- Icon + Label -->
      <i :class="meta.icon" class="text-sm" :style="{ color: meta.color }"></i>
      <span class="text-xs font-bold text-gray-800 flex-1 truncate">{{ meta.label }}</span>

      <!-- Toggle Switch -->
      <button
        @click.stop="$emit('toggle')"
        class="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
        :class="section.enabled ? 'bg-violet-500' : 'bg-gray-300'"
        :title="section.enabled ? 'Kapat' : 'Ac'"
      >
        <div
          class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          :class="section.enabled ? 'left-[18px]' : 'left-0.5'"
        ></div>
      </button>

      <!-- Remove -->
      <button @click.stop="$emit('remove')" class="text-gray-300 hover:text-red-500 text-xs flex-shrink-0" title="Kaldir">
        <i class="fas fa-trash"></i>
      </button>

      <!-- Expand/Collapse -->
      <i
        :class="expanded ? 'fa-chevron-up' : 'fa-chevron-down'"
        class="fas text-[10px] text-gray-400 flex-shrink-0"
      ></i>
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
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="section.settings.autoplay" class="form-checkbox rounded text-violet-600" />
            <span class="text-xs text-gray-700">Otomatik Oynatma</span>
          </label>
          <div v-if="section.settings.autoplay">
            <input v-model.number="section.settings.delay" type="number" min="1000" step="500" class="form-input text-xs w-20" />
            <span class="text-[10px] text-gray-400 ml-1">ms</span>
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
            <input type="checkbox" v-model="section.settings.showSort" class="form-checkbox rounded text-violet-600" />
            <span class="text-xs text-gray-700">Siralama</span>
          </label>
        </div>
        <div>
          <label class="form-label">Gorunum Secenekleri</label>
          <div class="flex gap-2">
            <label class="flex items-center gap-1.5">
              <input type="checkbox" value="grid" v-model="section.settings.viewModes" class="form-checkbox rounded text-violet-600" />
              <span class="text-xs">Grid</span>
            </label>
            <label class="flex items-center gap-1.5">
              <input type="checkbox" value="list" v-model="section.settings.viewModes" class="form-checkbox rounded text-violet-600" />
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
          <input type="checkbox" v-model="section.settings.lightbox" class="form-checkbox rounded text-violet-600" />
          <span class="text-xs text-gray-700">Lightbox</span>
        </label>
      </template>

      <!-- Common: Background Color (all types) -->
      <div>
        <label class="form-label">Arkaplan Rengi</label>
        <div class="flex items-center gap-2">
          <input v-model="section.settings.bgColor" type="color" class="w-8 h-8 rounded border border-gray-200 cursor-pointer" />
          <input v-model="section.settings.bgColor" type="text" class="form-input text-xs w-24" placeholder="#ffffff" />
          <button v-if="section.settings.bgColor" @click="section.settings.bgColor = ''" class="text-xs text-gray-400 hover:text-red-500">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  section: { type: Object, required: true },
})

defineEmits(['toggle', 'remove'])

const expanded = ref(false)

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
