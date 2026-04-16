<template>
  <div class="filter-builder space-y-3">
    <!-- Mode toggle + helper -->
    <div class="flex items-center justify-between">
      <p class="text-[11px]" style="color: var(--th-text-tertiary)">
        <span v-if="mode === 'visual'">Filtre satırları AND ile birleştirilir.</span>
        <span v-else>Frappe filter formatı: <code>[["alan", "operatör", değer], ...]</code></span>
      </p>
      <div class="inline-flex rounded border overflow-hidden text-[11px]" style="border-color: var(--th-border)">
        <button
          type="button"
          class="px-2.5 py-1 font-medium transition-colors"
          :class="mode === 'visual' ? 'bg-violet-500 text-white' : 'hover:bg-white/5'"
          :style="mode === 'visual' ? '' : 'color: var(--th-text-secondary)'"
          @click="switchToVisual"
        >
          Görsel
        </button>
        <button
          type="button"
          class="px-2.5 py-1 font-medium transition-colors"
          :class="mode === 'json' ? 'bg-violet-500 text-white' : 'hover:bg-white/5'"
          :style="mode === 'json' ? '' : 'color: var(--th-text-secondary)'"
          @click="switchToJson"
        >
          JSON
        </button>
      </div>
    </div>

    <!-- Warning when visual mode can't represent existing filters -->
    <div
      v-if="mode === 'visual' && unrepresentable"
      class="p-2.5 rounded-lg text-[11px] flex items-start gap-2"
      style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: rgb(245,158,11)"
    >
      <i class="fas fa-triangle-exclamation mt-0.5"></i>
      <span>Bu filtre görsel modda gösterilemiyor (karmaşık operatör veya yapı). JSON modunda düzenlemeye devam edin.</span>
    </div>

    <!-- VISUAL mode -->
    <div v-if="mode === 'visual' && !unrepresentable" class="space-y-2">
      <div
        v-for="(row, idx) in rows"
        :key="idx"
        class="grid grid-cols-12 gap-2 items-start p-2 rounded-lg border"
        style="border-color: var(--th-border); background: rgba(139,92,246,0.03)"
      >
        <!-- Field -->
        <div class="col-span-4">
          <SmartFieldDropdown
            :model-value="row[0]"
            :form-data="liveFormData"
            filter-type="grouping"
            @update:model-value="updateRow(idx, 0, $event)"
          />
        </div>
        <!-- Operator -->
        <div class="col-span-3">
          <select
            :value="row[1]"
            class="form-input"
            @change="updateRow(idx, 1, $event.target.value)"
          >
            <option v-for="op in OPERATORS" :key="op.value" :value="op.value">
              {{ op.label }}
            </option>
          </select>
        </div>
        <!-- Value -->
        <div class="col-span-4">
          <input
            v-if="!isUnaryOp(row[1])"
            :value="formatValueForInput(row[2])"
            type="text"
            class="form-input"
            :placeholder="placeholderForOp(row[1])"
            @input="updateRow(idx, 2, parseValue($event.target.value, row[1]))"
          />
          <input v-else type="text" class="form-input opacity-50" disabled placeholder="(değer gerekmez)" />
        </div>
        <!-- Remove -->
        <div class="col-span-1 flex items-center justify-end pt-1">
          <button
            type="button"
            class="w-7 h-7 rounded-md hover:bg-red-500/10 flex items-center justify-center text-red-500 transition-colors"
            title="Bu satırı sil"
            @click="removeRow(idx)"
          >
            <i class="fas fa-xmark text-xs"></i>
          </button>
        </div>
      </div>

      <button
        type="button"
        class="text-[11px] font-medium text-violet-500 hover:underline flex items-center gap-1.5"
        @click="addRow"
      >
        <i class="fas fa-plus text-[10px]"></i> Filtre Ekle
      </button>

      <p v-if="rows.length === 0" class="text-[11px]" style="color: var(--th-text-tertiary)">
        Henüz filtre yok. Tüm kayıtlar kullanılır.
      </p>
    </div>

    <!-- JSON mode -->
    <div v-if="mode === 'json' || (mode === 'visual' && unrepresentable)">
      <textarea
        :value="jsonText"
        rows="6"
        class="form-input font-mono text-xs resize-none"
        placeholder='[["status", "!=", "İptal Edildi"]]'
        @input="onJsonInput($event.target.value)"
      />
      <p v-if="jsonError" class="text-[11px] text-red-500 mt-1">
        <i class="fas fa-circle-xmark"></i> {{ jsonError }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import SmartFieldDropdown from './SmartFieldDropdown.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  formData: { type: Object, default: () => ({}) },
  field: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

// Prefer injected formData ref so SmartFieldDropdown children stay reactive.
const injectedFormData = inject('formData', null)
const liveFormData = computed(() => injectedFormData?.value || props.formData || {})

const OPERATORS = [
  { value: '=',    label: 'eşit' },
  { value: '!=',   label: 'eşit değil' },
  { value: 'like', label: 'içerir' },
  { value: 'in',   label: 'liste içinde' },
  { value: 'not in', label: 'liste dışında' },
  { value: '>',    label: 'büyük' },
  { value: '>=',   label: 'büyük eşit' },
  { value: '<',    label: 'küçük' },
  { value: '<=',   label: 'küçük eşit' },
  { value: 'between', label: 'arasında' },
  { value: 'is',   label: 'dolu / boş' },
]

const SUPPORTED_OPS = new Set(OPERATORS.map(o => o.value))

function isUnaryOp(op) {
  return op === 'is'
}

function placeholderForOp(op) {
  if (op === 'in' || op === 'not in') return 'değer1, değer2'
  if (op === 'between') return 'min, max'
  if (op === 'like') return '%aranan%'
  return 'değer'
}

function formatValueForInput(v) {
  if (Array.isArray(v)) return v.join(', ')
  return v ?? ''
}

function parseValue(text, op) {
  if (op === 'in' || op === 'not in' || op === 'between') {
    return text.split(',').map(s => s.trim()).filter(Boolean)
  }
  return text
}

const mode = ref('visual')
const rows = ref([])
const jsonText = ref('')
const jsonError = ref('')
const unrepresentable = ref(false)

function tryParseRows(jsonStr) {
  if (!jsonStr || !jsonStr.trim()) {
    return { ok: true, rows: [], representable: true }
  }
  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) {
      return { ok: false, rows: [], representable: false, error: 'Filtreler bir dizi (array) olmalı.' }
    }
    let representable = true
    const out = []
    for (const r of parsed) {
      if (!Array.isArray(r) || r.length < 2 || r.length > 3) {
        representable = false
        break
      }
      const op = r[1]
      if (!SUPPORTED_OPS.has(op)) {
        representable = false
        break
      }
      out.push([r[0] || '', op, r[2] !== undefined ? r[2] : ''])
    }
    return { ok: true, rows: out, representable }
  } catch (e) {
    return { ok: false, rows: [], representable: false, error: 'Geçersiz JSON: ' + e.message }
  }
}

function syncFromModelValue() {
  const r = tryParseRows(props.modelValue || '')
  if (r.ok) {
    rows.value = r.rows
    unrepresentable.value = !r.representable
    jsonText.value = props.modelValue || ''
    jsonError.value = ''
  } else {
    jsonText.value = props.modelValue || ''
    jsonError.value = r.error || ''
    unrepresentable.value = true
  }
}

function emitFromRows() {
  if (rows.value.length === 0) {
    emit('update:modelValue', '')
    return
  }
  const out = rows.value
    .filter(r => r[0])
    .map(r => isUnaryOp(r[1]) ? [r[0], r[1], 'set'] : [r[0], r[1], r[2]])
  const text = out.length ? JSON.stringify(out) : ''
  jsonText.value = text
  emit('update:modelValue', text)
}

function addRow() {
  rows.value.push(['', '=', ''])
}

function removeRow(idx) {
  rows.value.splice(idx, 1)
  emitFromRows()
}

function updateRow(idx, col, val) {
  if (!rows.value[idx]) return
  rows.value[idx] = [...rows.value[idx]]
  rows.value[idx][col] = val
  emitFromRows()
}

function onJsonInput(val) {
  jsonText.value = val
  if (!val.trim()) {
    jsonError.value = ''
    emit('update:modelValue', '')
    return
  }
  try {
    JSON.parse(val)
    jsonError.value = ''
    emit('update:modelValue', val)
  } catch (e) {
    jsonError.value = 'Geçersiz JSON: ' + e.message
  }
}

function switchToVisual() {
  // Re-parse current json into rows.
  const r = tryParseRows(jsonText.value)
  if (r.ok) {
    rows.value = r.rows
    unrepresentable.value = !r.representable
  }
  mode.value = 'visual'
}

function switchToJson() {
  mode.value = 'json'
}

watch(() => props.modelValue, (v) => {
  // Only re-sync if the external value differs from what we last emitted.
  if (v !== jsonText.value) syncFromModelValue()
}, { immediate: true })
</script>
