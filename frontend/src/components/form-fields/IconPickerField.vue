<template>
  <div class="icon-picker-field">
    <!-- Selected icon preview + open-modal trigger -->
    <button
      type="button"
      @click="openModal"
      class="w-full flex items-center gap-3 px-3 py-2 rounded-lg border bg-transparent hover:bg-white/5 transition-colors text-left"
      style="border-color: var(--th-border)"
    >
      <span
        class="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
        style="background: rgba(139,92,246,0.1); color: rgb(139,92,246)"
      >
        <i v-if="modelValue" :class="modelValue"></i>
        <i v-else class="fas fa-image opacity-40"></i>
      </span>
      <span class="flex-1 min-w-0">
        <span v-if="modelValue" class="text-sm block truncate" style="color: var(--th-text-primary)">
          {{ labelFor(modelValue) }}
        </span>
        <span v-else class="text-sm" style="color: var(--th-text-tertiary)">İkon seç...</span>
        <span v-if="modelValue" class="text-[11px] block truncate" style="color: var(--th-text-tertiary)">
          {{ modelValue }}
        </span>
      </span>
      <i class="fas fa-chevron-down text-[10px]" style="color: var(--th-text-tertiary)"></i>
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.6)"
        @click.self="close"
      >
        <div
          class="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl border shadow-2xl"
          style="background: var(--th-surface-card); border-color: var(--th-border)"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b" style="border-color: var(--th-border)">
            <div>
              <h3 class="text-sm font-semibold" style="color: var(--th-text-primary)">İkon Seç</h3>
              <p class="text-[11px] mt-0.5" style="color: var(--th-text-tertiary)">
                {{ filteredIcons.length }} ikon · {{ activeCategory === 'all' ? 'Tümü' : activeCategory }}
              </p>
            </div>
            <button @click="close" class="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center">
              <i class="fas fa-xmark text-xs" style="color: var(--th-text-tertiary)"></i>
            </button>
          </div>

          <!-- Search + categories -->
          <div class="p-4 space-y-3 border-b" style="border-color: var(--th-border)">
            <div class="relative">
              <i class="fas fa-search text-[10px] absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--th-text-tertiary)"></i>
              <input
                v-model="search"
                type="text"
                placeholder="İkon ara (örn. para, sepet, kullanıcı)..."
                class="w-full pl-8 pr-3 py-2 text-xs rounded-lg outline-none border"
                style="background: var(--th-surface-elevated); border-color: var(--th-border); color: var(--th-text-primary)"
              />
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="cat in CATEGORIES"
                :key="cat"
                @click="activeCategory = cat"
                class="px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors"
                :class="activeCategory === cat ? 'bg-violet-500 text-white' : 'hover:bg-white/5'"
                :style="activeCategory === cat ? '' : 'color: var(--th-text-secondary)'"
              >
                {{ cat === 'all' ? 'Tümü' : cat }}
              </button>
            </div>
          </div>

          <!-- Icon grid -->
          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="filteredIcons.length === 0" class="text-center py-12 text-xs" style="color: var(--th-text-tertiary)">
              <i class="fas fa-magnifying-glass text-2xl mb-2 opacity-40"></i>
              <p>Eşleşen ikon yok.</p>
            </div>
            <div v-else class="grid grid-cols-6 sm:grid-cols-8 gap-2">
              <button
                v-for="ic in filteredIcons"
                :key="ic.fa"
                type="button"
                @click="pick(ic.fa)"
                class="aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 transition-all hover:scale-105"
                :class="modelValue === ic.fa
                  ? 'border-violet-500 bg-violet-500/15'
                  : 'hover:bg-white/5'"
                :style="modelValue === ic.fa ? '' : 'border-color: var(--th-border)'"
                :title="ic.label"
              >
                <i :class="ic.fa" class="text-base" :style="modelValue === ic.fa ? 'color: rgb(167,139,250)' : 'color: var(--th-text-secondary)'"></i>
                <span class="text-[9px] truncate w-full text-center px-1" style="color: var(--th-text-tertiary)">
                  {{ ic.label }}
                </span>
              </button>
            </div>
          </div>

          <!-- Custom input + footer -->
          <div class="p-4 border-t flex items-center gap-2" style="border-color: var(--th-border)">
            <input
              v-model="customInput"
              type="text"
              placeholder="Veya özel class yaz: fas fa-..."
              class="flex-1 px-3 py-2 text-xs rounded-lg outline-none border"
              style="background: var(--th-surface-elevated); border-color: var(--th-border); color: var(--th-text-primary)"
              @keydown.enter.prevent="applyCustom"
            />
            <button
              @click="applyCustom"
              :disabled="!customInput"
              class="px-3 py-2 text-xs font-medium rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Uygula
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  formData: { type: Object, default: () => ({}) },
  field: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const search = ref('')
const activeCategory = ref('all')
const customInput = ref('')

// FontAwesome 6 icons (free) — curated list grouped by category
const ICONS = [
  // Finans
  { fa: 'fas fa-lira-sign',     label: 'Lira',         keywords: 'para tl lira',           cat: 'Finans' },
  { fa: 'fas fa-dollar-sign',   label: 'Dolar',        keywords: 'para dolar usd',         cat: 'Finans' },
  { fa: 'fas fa-euro-sign',     label: 'Euro',         keywords: 'para euro eur',          cat: 'Finans' },
  { fa: 'fas fa-coins',         label: 'Bozuk',        keywords: 'para bozuk coin',        cat: 'Finans' },
  { fa: 'fas fa-money-bill',    label: 'Banknot',      keywords: 'para banknot kasa',      cat: 'Finans' },
  { fa: 'fas fa-credit-card',   label: 'Kart',         keywords: 'kart ödeme kredi',       cat: 'Finans' },
  { fa: 'fas fa-receipt',       label: 'Fiş',          keywords: 'fiş fatura sepet',       cat: 'Finans' },
  { fa: 'fas fa-wallet',        label: 'Cüzdan',       keywords: 'cüzdan para',            cat: 'Finans' },
  { fa: 'fas fa-piggy-bank',    label: 'Kumbara',      keywords: 'kumbara birikim',        cat: 'Finans' },
  { fa: 'fas fa-percent',       label: 'Yüzde',        keywords: 'yüzde indirim oran',     cat: 'Finans' },

  // Sipariş & E-ticaret
  { fa: 'fas fa-shopping-bag',  label: 'Sepet',        keywords: 'sepet alışveriş çanta',  cat: 'Sipariş' },
  { fa: 'fas fa-shopping-cart', label: 'Araba',        keywords: 'sepet araba',            cat: 'Sipariş' },
  { fa: 'fas fa-cart-plus',     label: 'Ekle',         keywords: 'sepet ekle',             cat: 'Sipariş' },
  { fa: 'fas fa-box',           label: 'Kutu',         keywords: 'kutu paket ürün',        cat: 'Sipariş' },
  { fa: 'fas fa-boxes-stacked', label: 'Kutular',      keywords: 'depo stok kutu',         cat: 'Sipariş' },
  { fa: 'fas fa-truck',         label: 'Kamyon',       keywords: 'kargo teslimat kamyon',  cat: 'Sipariş' },
  { fa: 'fas fa-truck-fast',    label: 'Hızlı Kargo',  keywords: 'kargo hızlı',            cat: 'Sipariş' },
  { fa: 'fas fa-tag',           label: 'Etiket',       keywords: 'fiyat etiket',           cat: 'Sipariş' },
  { fa: 'fas fa-tags',          label: 'Etiketler',    keywords: 'fiyat etiket',           cat: 'Sipariş' },
  { fa: 'fas fa-store',         label: 'Mağaza',       keywords: 'mağaza dükkan satıcı',   cat: 'Sipariş' },

  // Kullanıcı & İletişim
  { fa: 'fas fa-user',          label: 'Kullanıcı',    keywords: 'kullanıcı kişi profil',  cat: 'Kullanıcı' },
  { fa: 'fas fa-users',         label: 'Kullanıcılar', keywords: 'kullanıcı grup ekip',    cat: 'Kullanıcı' },
  { fa: 'fas fa-user-plus',     label: 'Yeni',         keywords: 'kullanıcı yeni ekle',    cat: 'Kullanıcı' },
  { fa: 'fas fa-user-tie',      label: 'Yönetici',     keywords: 'admin yönetici',         cat: 'Kullanıcı' },
  { fa: 'fas fa-handshake',     label: 'Anlaşma',      keywords: 'anlaşma rfq teklif',     cat: 'Kullanıcı' },
  { fa: 'fas fa-comments',      label: 'Yorum',        keywords: 'yorum sohbet mesaj',     cat: 'Kullanıcı' },
  { fa: 'fas fa-envelope',      label: 'Mektup',       keywords: 'eposta mesaj mail',      cat: 'Kullanıcı' },
  { fa: 'fas fa-bell',          label: 'Zil',          keywords: 'bildirim uyarı zil',     cat: 'Kullanıcı' },
  { fa: 'fas fa-headset',       label: 'Destek',       keywords: 'destek müşteri',         cat: 'Kullanıcı' },

  // Analiz & Veri
  { fa: 'fas fa-chart-line',    label: 'Çizgi',        keywords: 'grafik trend çizgi',     cat: 'Analiz' },
  { fa: 'fas fa-chart-bar',     label: 'Bar',          keywords: 'grafik bar',             cat: 'Analiz' },
  { fa: 'fas fa-chart-pie',     label: 'Pasta',        keywords: 'grafik pasta donut',     cat: 'Analiz' },
  { fa: 'fas fa-chart-area',    label: 'Alan',         keywords: 'grafik alan',            cat: 'Analiz' },
  { fa: 'fas fa-arrow-trend-up', label: 'Yükseliş',    keywords: 'yükseliş trend artış',   cat: 'Analiz' },
  { fa: 'fas fa-arrow-trend-down', label: 'Düşüş',     keywords: 'düşüş trend azalış',     cat: 'Analiz' },
  { fa: 'fas fa-bullseye',      label: 'Hedef',        keywords: 'hedef kpi başarı',       cat: 'Analiz' },
  { fa: 'fas fa-gauge',         label: 'Gösterge',     keywords: 'gösterge ölçer',         cat: 'Analiz' },
  { fa: 'fas fa-filter',        label: 'Filtre',       keywords: 'filtre funnel',          cat: 'Analiz' },
  { fa: 'fas fa-database',      label: 'Veritabanı',   keywords: 'veri db data',           cat: 'Analiz' },

  // Genel & Sistem
  { fa: 'fas fa-star',          label: 'Yıldız',       keywords: 'yıldız puan rating',     cat: 'Genel' },
  { fa: 'fas fa-heart',         label: 'Kalp',         keywords: 'favori beğeni kalp',     cat: 'Genel' },
  { fa: 'fas fa-circle-check',  label: 'Onay',         keywords: 'onay tamam başarı',      cat: 'Genel' },
  { fa: 'fas fa-circle-xmark',  label: 'Red',          keywords: 'red iptal hata',         cat: 'Genel' },
  { fa: 'fas fa-clock',         label: 'Saat',         keywords: 'saat zaman bekleme',     cat: 'Genel' },
  { fa: 'fas fa-calendar',      label: 'Takvim',       keywords: 'takvim tarih',           cat: 'Genel' },
  { fa: 'fas fa-flag',          label: 'Bayrak',       keywords: 'bayrak ülke',            cat: 'Genel' },
  { fa: 'fas fa-globe',         label: 'Dünya',        keywords: 'dünya küre global',      cat: 'Genel' },
  { fa: 'fas fa-cog',           label: 'Ayar',         keywords: 'ayar dişli',             cat: 'Genel' },
  { fa: 'fas fa-shield-halved', label: 'Kalkan',       keywords: 'güvenlik kalkan',        cat: 'Genel' },
  { fa: 'fas fa-file-lines',    label: 'Belge',        keywords: 'belge dosya doküman',    cat: 'Genel' },
  { fa: 'fas fa-folder',        label: 'Klasör',       keywords: 'klasör dosya',           cat: 'Genel' },
  { fa: 'fas fa-link',          label: 'Bağlantı',     keywords: 'link bağlantı',          cat: 'Genel' },
  { fa: 'fas fa-cube',          label: 'Küp',          keywords: 'ürün küp',               cat: 'Genel' },
]

const CATEGORIES = ['all', ...Array.from(new Set(ICONS.map(i => i.cat)))]

const filteredIcons = computed(() => {
  const q = search.value.trim().toLowerCase()
  return ICONS.filter(ic => {
    if (activeCategory.value !== 'all' && ic.cat !== activeCategory.value) return false
    if (!q) return true
    return ic.label.toLowerCase().includes(q) ||
           ic.keywords.toLowerCase().includes(q) ||
           ic.fa.toLowerCase().includes(q)
  })
})

function labelFor(fa) {
  return ICONS.find(i => i.fa === fa)?.label || 'Özel ikon'
}

function openModal() {
  isOpen.value = true
  customInput.value = props.modelValue || ''
  search.value = ''
}

function close() {
  isOpen.value = false
}

function pick(fa) {
  emit('update:modelValue', fa)
  close()
}

function applyCustom() {
  const val = customInput.value.trim()
  if (!val) return
  emit('update:modelValue', val)
  close()
}
</script>
