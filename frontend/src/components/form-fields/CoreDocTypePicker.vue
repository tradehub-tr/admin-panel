<template>
  <div class="core-doctype-picker relative">
    <input
      :value="searchText"
      type="text"
      class="form-input pr-9"
      :placeholder="placeholder"
      autocomplete="off"
      @input="onInput($event.target.value)"
      @focus="onFocus"
      @blur="scheduleClose"
    />
    <!-- Right-side action overlay: clear (×) when value is set, search icon otherwise -->
    <div class="absolute right-2 inset-y-0 flex items-center pointer-events-none">
      <button
        v-if="modelValue"
        type="button"
        @mousedown.prevent="clearSelection"
        class="pointer-events-auto w-6 h-6 rounded-md hover:bg-red-500/15 flex items-center justify-center transition-colors"
        title="Seçimi temizle"
      >
        <i class="fas fa-xmark text-[11px] text-gray-400 hover:text-red-500"></i>
      </button>
      <i v-else class="fas fa-search text-xs text-gray-400 mr-1"></i>
    </div>

    <div
      v-if="show"
      class="absolute z-30 w-full mt-1 bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto"
    >
      <div v-if="loading" class="px-3 py-3 text-xs text-gray-400 flex items-center gap-2">
        <i class="fas fa-spinner fa-spin text-xs"></i> Aranıyor…
      </div>
      <div v-else-if="results.length === 0" class="px-3 py-3 text-xs text-gray-400">
        Eşleşen DocType yok.
      </div>
      <div
        v-for="r in results"
        :key="r.name"
        class="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
        @mousedown.prevent="onSelect(r.name)"
      >
        <div class="font-medium">{{ r.name }}</div>
        <div v-if="r.module" class="text-[10px] text-gray-400">{{ r.module }}</div>
      </div>
    </div>

    <p class="mt-1 text-[10px]" style="color: var(--th-text-tertiary)">
      Sadece tradehub_core DocType'ları listelenir.
    </p>

    <!-- Change confirmation modal -->
    <Teleport to="body">
      <div
        v-if="modal.open"
        class="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.65)"
        @click.self="modal.open = false"
      >
        <div
          class="w-full max-w-md rounded-xl border shadow-2xl"
          style="background: var(--th-surface-card); border-color: var(--th-border)"
        >
          <div class="p-4 border-b flex items-start gap-3" style="border-color: var(--th-border)">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(245,158,11,0.15)">
              <i class="fas fa-triangle-exclamation text-amber-500"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-semibold" style="color: var(--th-text-primary)">Veri Kaynağı Değişiyor</h3>
              <p class="text-xs mt-0.5" style="color: var(--th-text-tertiary)">
                <span class="font-medium">{{ modelValue }}</span> →
                <span class="text-violet-500 font-medium">{{ modal.newDoctype }}</span>
              </p>
            </div>
          </div>

          <div class="p-4 space-y-3 text-xs" style="color: var(--th-text-secondary)">
            <p>Bu değişiklik şu alanları etkileyecek:</p>
            <ul class="space-y-1.5">
              <li v-for="item in modal.impacts" :key="item.label" class="flex items-start gap-2">
                <i v-if="item.kept" class="fas fa-check text-emerald-500 text-[10px] mt-1"></i>
                <i v-else class="fas fa-xmark text-red-500 text-[10px] mt-1"></i>
                <span>
                  <span class="font-medium" style="color: var(--th-text-primary)">{{ item.label }}:</span>
                  <span v-if="item.kept"> "{{ item.value }}" yeni DocType'ta da var, korunacak.</span>
                  <span v-else> "{{ item.value }}" yeni DocType'ta yok, temizlenecek.</span>
                </span>
              </li>
              <li v-if="modal.impacts.length === 0" class="text-emerald-500">
                <i class="fas fa-check"></i> Hiçbir alan etkilenmiyor, güvenle değiştirebilirsiniz.
              </li>
            </ul>
          </div>

          <div class="p-4 border-t flex justify-end gap-2" style="border-color: var(--th-border)">
            <button
              @click="modal.open = false"
              class="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-white/5"
              style="border-color: var(--th-border); color: var(--th-text-secondary)"
            >
              İptal
            </button>
            <button
              @click="confirmChange"
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500 text-white hover:bg-violet-600"
            >
              Devam Et
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, inject } from 'vue'
import api from '@/utils/api'

const props = defineProps({
  modelValue: { type: String, default: '' },
  formData: { type: Object, default: () => ({}) },
  field: { type: Object, default: () => ({}) },
  placeholder: { type: String, default: 'DocType ara…' },
})
const emit = defineEmits(['update:modelValue'])

const injectedFormData = inject('formData', null)

// Local search text decoupled from modelValue: typing should not commit until
// the user picks a real DocType from the dropdown (or clears the field).
const searchText = ref(props.modelValue || '')
const show = ref(false)
const loading = ref(false)
const results = ref([])
let timer = null
let closeTimer = null

watch(() => props.modelValue, (v) => {
  searchText.value = v || ''
})

const modal = reactive({
  open: false,
  newDoctype: '',
  impacts: [],     // [{ field: 'metric_field', label: 'Metrik Alanı', value: 'total', kept: false }]
  filterImpacts: [],  // raw filter rows that need removal
})

const FIELD_LABELS = {
  metric_field: 'Metrik Alanı',
  date_field: 'Tarih Alanı',
  group_by_field: 'Gruplama Alanı',
}

async function fetchDocTypes(query) {
  loading.value = true
  try {
    const res = await api.getList('DocType', {
      fields: ['name', 'module'],
      filters: [
        ['module', '=', 'Tradehub Core'],
        ['istable', '=', 0],
      ],
      or_filters: query ? [['name', 'like', `%${query}%`]] : [],
      order_by: 'name asc',
      limit_page_length: 100,
    })
    results.value = (res.data || []).slice(0, 50)
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

function onInput(val) {
  // Update local search text only — committing to formData happens on
  // explicit selection from the dropdown, not on every keystroke.
  searchText.value = val
  show.value = true
  clearTimeout(timer)
  timer = setTimeout(() => fetchDocTypes(val), 250)
}

function onFocus() {
  show.value = true
  clearTimeout(closeTimer)
  if (results.value.length === 0) fetchDocTypes(searchText.value || '')
}

function scheduleClose() {
  // On blur, restore the input to the committed value (lose half-typed text).
  closeTimer = setTimeout(() => {
    show.value = false
    searchText.value = props.modelValue || ''
  }, 180)
}

function clearSelection() {
  searchText.value = ''
  emit('update:modelValue', '')
}

function readFormData() {
  return injectedFormData?.value || props.formData || {}
}

async function onSelect(name) {
  show.value = false
  const oldDoctype = props.modelValue
  if (!oldDoctype || oldDoctype === name) {
    searchText.value = name
    emit('update:modelValue', name)
    return
  }
  // Compute impact: which currently-set fields/filters reference fieldnames
  // that don't exist in the new DocType?
  const newFields = await loadFieldnames(name)
  const fd = readFormData()
  const impacts = []
  for (const fname of Object.keys(FIELD_LABELS)) {
    const value = fd?.[fname]
    if (!value) continue
    impacts.push({
      field: fname,
      label: FIELD_LABELS[fname],
      value,
      kept: newFields.has(value),
    })
  }
  // Filter row impacts (best-effort: parse JSON and check first element of each row)
  const filterImpacts = []
  const rawFilters = fd?.filters_json
  if (rawFilters) {
    try {
      const parsed = JSON.parse(rawFilters)
      if (Array.isArray(parsed)) {
        parsed.forEach((row, idx) => {
          if (Array.isArray(row) && row.length >= 1) {
            const filterField = row[0]
            if (filterField && !newFields.has(filterField)) {
              filterImpacts.push({ idx, field: filterField })
              impacts.push({
                field: `filter_${idx}`,
                label: `Filtre #${idx + 1}`,
                value: filterField,
                kept: false,
              })
            }
          }
        })
      }
    } catch {
      // Ignore: invalid JSON, leave it for the filter editor to handle
    }
  }
  modal.newDoctype = name
  modal.impacts = impacts
  modal.filterImpacts = filterImpacts
  modal.open = true
}

async function loadFieldnames(doctype) {
  try {
    const res = await api.getMeta(doctype)
    const fields = res?.message?.fields || []
    const standard = ['name', 'creation', 'modified', 'owner', 'modified_by', 'docstatus']
    return new Set([...fields.map(f => f.fieldname), ...standard])
  } catch {
    return new Set()
  }
}

function confirmChange() {
  const fd = readFormData()
  // Clear fields whose values no longer exist in the new DocType.
  for (const item of modal.impacts) {
    if (item.kept) continue
    if (item.field.startsWith('filter_')) continue  // handled below
    if (fd) fd[item.field] = ''
  }
  // Remove individual filter rows whose field is gone.
  if (modal.filterImpacts.length > 0 && fd?.filters_json) {
    try {
      const parsed = JSON.parse(fd.filters_json)
      if (Array.isArray(parsed)) {
        const removeSet = new Set(modal.filterImpacts.map(f => f.idx))
        const remaining = parsed.filter((_, idx) => !removeSet.has(idx))
        fd.filters_json = remaining.length ? JSON.stringify(remaining) : ''
      }
    } catch { /* ignore */ }
  }
  searchText.value = modal.newDoctype
  emit('update:modelValue', modal.newDoctype)
  modal.open = false
}

onMounted(() => {
  fetchDocTypes('')
})
</script>
