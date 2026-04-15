<template>
  <div class="seller-picker relative">
    <!-- Compact "chip" trigger when a seller is selected -->
    <button
      v-if="modelValue && !open"
      type="button"
      @click="openPicker"
      class="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-lg border text-xs font-medium transition-colors hover:bg-white/5"
      style="border-color: rgba(139,92,246,0.3); background: rgba(139,92,246,0.08); color: var(--th-text-primary)"
      :title="'Satıcı: ' + selectedLabel"
    >
      <i class="fas fa-store text-[10px] text-violet-500"></i>
      <span class="max-w-[140px] truncate">{{ selectedLabel }}</span>
      <span
        @click.stop="clearSelection"
        class="w-5 h-5 rounded hover:bg-red-500/15 flex items-center justify-center transition-colors"
        title="Seçimi temizle"
      >
        <i class="fas fa-xmark text-[10px] text-gray-400 hover:text-red-500"></i>
      </span>
    </button>

    <!-- Default "Tüm satıcılar" trigger -->
    <button
      v-else-if="!open"
      type="button"
      @click="openPicker"
      class="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors hover:bg-white/5"
      style="border-color: var(--th-border); color: var(--th-text-primary)"
    >
      <i class="fas fa-store text-[10px]" style="color: var(--th-text-tertiary)"></i>
      <span>Tüm satıcılar</span>
      <i class="fas fa-chevron-down text-[8px]" style="color: var(--th-text-tertiary)"></i>
    </button>

    <!-- Open state: search input + dropdown -->
    <div v-if="open" class="relative">
      <input
        ref="inputEl"
        :value="searchText"
        type="text"
        class="px-3 pr-9 py-1 text-xs rounded-lg border outline-none w-56"
        placeholder="Satıcı ara…"
        autocomplete="off"
        @input="onInput($event.target.value)"
        @keydown.escape="close"
        @blur="scheduleClose"
        :style="{
          borderColor: 'var(--th-border)',
          background: 'var(--th-surface-elevated)',
          color: 'var(--th-text-primary)',
        }"
      />
      <i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[10px]" style="color: var(--th-text-tertiary)"></i>

      <div
        class="absolute z-30 w-72 mt-1 right-0 rounded-lg border shadow-2xl max-h-72 overflow-y-auto"
        style="background: var(--th-surface-card); border-color: var(--th-border)"
      >
        <!-- "Tüm satıcılar" option -->
        <button
          type="button"
          @mousedown.prevent="select(null)"
          class="w-full text-left px-3 py-2 text-xs font-medium border-b transition-colors hover:bg-white/5"
          :class="!modelValue ? 'bg-violet-500/10 text-violet-500' : ''"
          style="border-color: var(--th-border); color: var(--th-text-primary)"
        >
          <i class="fas fa-globe text-[10px] mr-1.5" :class="!modelValue ? 'text-violet-500' : 'opacity-50'"></i>
          Tüm satıcılar
          <span v-if="!modelValue" class="float-right text-[10px]"><i class="fas fa-check"></i></span>
        </button>

        <div v-if="loading" class="px-3 py-3 text-xs flex items-center gap-2" style="color: var(--th-text-tertiary)">
          <i class="fas fa-spinner fa-spin text-[10px] text-violet-500"></i> Aranıyor…
        </div>

        <div v-else-if="results.length === 0" class="px-3 py-3 text-xs" style="color: var(--th-text-tertiary)">
          Eşleşen satıcı yok.
        </div>

        <button
          v-for="r in results"
          :key="r.name"
          type="button"
          @mousedown.prevent="select(r.name)"
          class="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5"
          :class="modelValue === r.name ? 'bg-violet-500/10' : ''"
          :style="{ color: 'var(--th-text-primary)' }"
        >
          <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1">
              <div class="font-medium truncate">{{ r.seller_name || r.name }}</div>
              <div class="text-[10px] mt-0.5" style="color: var(--th-text-tertiary)">
                {{ r.name }}<span v-if="r.status"> · {{ r.status }}</span>
              </div>
            </div>
            <i v-if="modelValue === r.name" class="fas fa-check text-[10px] text-violet-500"></i>
          </div>
        </button>

        <div v-if="!loading && results.length >= LIMIT" class="px-3 py-2 text-[10px] border-t" style="color: var(--th-text-tertiary); border-color: var(--th-border)">
          İlk {{ LIMIT }} sonuç gösterildi. Daha daraltmak için yazmaya devam edin.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import api from '@/utils/api'

const props = defineProps({
  modelValue: { type: [String, null], default: null },
})
const emit = defineEmits(['update:modelValue', 'selected'])

const LIMIT = 30

const open = ref(false)
const searchText = ref('')
const inputEl = ref(null)
const loading = ref(false)
const results = ref([])
const cache = ref(new Map())  // name → seller_name (for label resolution)
let timer = null
let closeTimer = null

const selectedLabel = computed(() => {
  if (!props.modelValue) return 'Tüm satıcılar'
  return cache.value.get(props.modelValue) || props.modelValue
})

async function fetchSellers(query) {
  loading.value = true
  try {
    const params = {
      fields: ['name', 'seller_name', 'status'],
      filters: [['status', '=', 'Active']],
      order_by: 'seller_name asc',
      limit_page_length: LIMIT,
    }
    if (query) {
      params.or_filters = [
        ['seller_name', 'like', `%${query}%`],
        ['name', 'like', `%${query}%`],
      ]
    }
    const res = await api.getList('Admin Seller Profile', params)
    results.value = res.data || []
    // Cache labels for chip display when only the id is known
    for (const s of results.value) {
      cache.value.set(s.name, s.seller_name || s.name)
    }
  } catch (e) {
    console.warn('Satıcı arama başarısız:', e)
    results.value = []
  } finally {
    loading.value = false
  }
}

function openPicker() {
  open.value = true
  searchText.value = ''
  fetchSellers('')
  nextTick(() => inputEl.value?.focus())
}

function close() {
  open.value = false
}

function scheduleClose() {
  closeTimer = setTimeout(() => { open.value = false }, 180)
}

function onInput(val) {
  searchText.value = val
  loading.value = true
  clearTimeout(timer)
  timer = setTimeout(() => fetchSellers(val), 250)
}

function select(name) {
  const seller = name ? results.value.find(r => r.name === name) : null
  emit('update:modelValue', name)
  emit('selected', seller || (name ? { name, seller_name: cache.value.get(name) } : null))
  open.value = false
  searchText.value = ''
}

function clearSelection() {
  emit('update:modelValue', null)
  emit('selected', null)
}

// When the modelValue changes externally (e.g. parent reset), keep the
// label cache aware so the chip can render properly.
watch(() => props.modelValue, (v) => {
  if (v && !cache.value.has(v)) {
    fetchSellers(v)
  }
}, { immediate: true })
</script>
