<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-3">
        <button
          @click="$router.push('/dashboard')"
          class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors flex-shrink-0"
        >
          <i class="fas fa-arrow-left text-xs"></i>
        </button>
        <div class="min-w-0">
          <h1 class="text-[15px] font-bold text-gray-900">Site Teması</h1>
          <p class="text-xs text-gray-400">Tüm butonların görünümünü ve davranışını tek yerden yönetin</p>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
        <a
          v-if="storefrontUrl"
          :href="storefrontUrl"
          target="_blank"
          class="hdr-btn-outlined text-xs"
        >
          <i class="fas fa-external-link mr-1.5"></i>Canlı Site
        </a>
        <button
          class="hdr-btn-outlined text-xs"
          :class="{ 'opacity-50 cursor-not-allowed': !hasChanges || saving }"
          :disabled="!hasChanges || saving"
          @click="discardChanges"
          title="Kaydedilmemiş değişiklikleri at"
        >
          <i class="fas fa-undo mr-1.5 text-xs"></i>Değişiklikleri Geri Al
        </button>
        <button
          class="hdr-btn-outlined text-xs"
          :class="{ 'opacity-50 cursor-not-allowed': saving }"
          :disabled="saving"
          @click="confirmResetDefaults"
          title="Tüm özelleştirmeleri silip fabrika ayarlarına dön"
        >
          <i class="fas fa-rotate-left mr-1.5 text-xs"></i>Varsayılana Dön
        </button>
        <button
          class="hdr-btn-primary"
          :class="{ 'opacity-50 cursor-not-allowed': !hasChanges || saving }"
          :disabled="!hasChanges || saving"
          @click="saveChanges"
        >
          <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-floppy-disk'" class="mr-1.5 text-xs"></i>
          {{ saving ? 'Kaydediliyor...' : hasChanges ? `Kaydet (${dirtyCount})` : 'Kaydet' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <i class="fas fa-spinner fa-spin text-2xl text-amber-500"></i>
      <p class="text-sm text-gray-400 mt-3">Tema ayarları yükleniyor...</p>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="card text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
        <i class="fas fa-triangle-exclamation text-2xl text-red-500"></i>
      </div>
      <h3 class="text-sm font-bold text-gray-700 mb-1">Yükleme Hatası</h3>
      <p class="text-xs text-gray-400 mb-3">{{ loadError }}</p>
      <button class="hdr-btn-outlined text-xs" @click="loadSettings">
        <i class="fas fa-rotate mr-1.5"></i>Tekrar Dene
      </button>
    </div>

    <!-- Editor -->
    <template v-else>
      <div class="grid grid-cols-12 gap-4">
        <!-- LEFT: Form sections -->
        <div class="col-span-12 lg:col-span-8 space-y-4">
          <div
            v-for="group in groups"
            :key="group.id"
            class="card"
          >
            <div class="flex items-start justify-between gap-3 mb-4">
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <i class="fas text-amber-500" :class="iconClassFor(group.icon)"></i>
                  {{ group.title }}
                </h3>
                <p class="text-xs text-gray-400 mt-0.5">{{ group.subtitle }}</p>
              </div>
              <span
                v-if="dirtyCountInGroup(group) > 0"
                class="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap"
              >
                {{ dirtyCountInGroup(group) }} değişiklik
              </span>
            </div>

            <div class="space-y-3">
              <div
                v-for="token in group.tokens"
                :key="token.var"
                class="grid grid-cols-12 gap-3 items-center"
              >
                <label class="col-span-12 sm:col-span-4 text-xs font-semibold text-gray-600 flex items-center gap-2">
                  {{ token.label }}
                  <span
                    v-if="isDirty(token.var)"
                    class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"
                    title="Değiştirildi"
                  ></span>
                </label>

                <!-- Color -->
                <div v-if="token.type === 'color'" class="col-span-12 sm:col-span-8 flex items-center gap-2">
                  <input
                    type="color"
                    :value="colorAsHex(getValue(token.var))"
                    @input="onColorInput(token.var, $event)"
                    class="w-9 h-9 rounded border border-gray-200 cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    :value="getValue(token.var)"
                    @input="onTextInput(token.var, $event)"
                    class="form-input text-xs flex-1 font-mono"
                    :placeholder="String(token.default)"
                  />
                  <button
                    v-if="isDirty(token.var)"
                    class="text-[10px] text-gray-400 hover:text-red-500"
                    @click="resetToken(token.var)"
                    title="Bu değeri varsayılana döndür"
                  >
                    <i class="fas fa-xmark"></i>
                  </button>
                </div>

                <!-- Range -->
                <div v-else-if="token.type === 'range'" class="col-span-12 sm:col-span-8 flex items-center gap-2">
                  <input
                    type="range"
                    :min="token.min"
                    :max="token.max"
                    :step="token.step"
                    :value="numericPart(getValue(token.var))"
                    @input="onRangeInput(token, $event)"
                    class="flex-1"
                  />
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="number"
                      :min="token.min"
                      :max="token.max"
                      :step="token.step"
                      :value="numericPart(getValue(token.var))"
                      @input="onRangeInput(token, $event)"
                      class="form-input text-xs w-20 text-right"
                    />
                    <span v-if="token.unit" class="text-[10px] text-gray-400 w-6">{{ token.unit }}</span>
                  </div>
                  <button
                    v-if="isDirty(token.var)"
                    class="text-[10px] text-gray-400 hover:text-red-500"
                    @click="resetToken(token.var)"
                    title="Bu değeri varsayılana döndür"
                  >
                    <i class="fas fa-xmark"></i>
                  </button>
                </div>

                <!-- Text -->
                <div v-else class="col-span-12 sm:col-span-8 flex items-center gap-2">
                  <input
                    type="text"
                    :value="getValue(token.var)"
                    @input="onTextInput(token.var, $event)"
                    class="form-input text-xs flex-1"
                    :placeholder="String(token.default)"
                  />
                  <button
                    v-if="isDirty(token.var)"
                    class="text-[10px] text-gray-400 hover:text-red-500"
                    @click="resetToken(token.var)"
                    title="Bu değeri varsayılana döndür"
                  >
                    <i class="fas fa-xmark"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Info note -->
          <div class="card bg-amber-50/50 border border-amber-100">
            <div class="flex gap-3">
              <i class="fas fa-circle-info text-amber-500 mt-0.5"></i>
              <div class="text-xs text-amber-900 space-y-1.5">
                <p class="font-semibold">Ortak ayarlar hem dolu hem outline butonu etkiler.</p>
                <p class="text-amber-700">
                  Köşe yuvarlaklığı, padding, yazı boyutu ve kalınlığı iki varyant için ortaktır
                  (CSS tarafında aynı değişkeni paylaşıyorlar). Sadece arka plan, yazı rengi ve
                  çerçeve gibi ayırıcı özellikler varyanta özeldir.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Live preview (sticky) -->
        <div class="col-span-12 lg:col-span-4">
          <div class="card sticky top-4">
            <h3 class="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i class="fas fa-eye text-amber-500"></i>
              Canlı Önizleme
            </h3>

            <div class="space-y-4" :style="previewVars">
              <div>
                <p class="text-[10px] font-semibold text-gray-500 uppercase mb-2">Dolu Buton</p>
                <div class="flex gap-2 flex-wrap p-3 bg-gray-50 rounded-lg">
                  <button type="button" class="preview-btn preview-btn-solid">Normal</button>
                  <button type="button" class="preview-btn preview-btn-solid preview-btn-hover">Hover</button>
                </div>
              </div>
              <div>
                <p class="text-[10px] font-semibold text-gray-500 uppercase mb-2">Outline Buton</p>
                <div class="flex gap-2 flex-wrap p-3 bg-gray-50 rounded-lg">
                  <button type="button" class="preview-btn preview-btn-outline">Normal</button>
                  <button type="button" class="preview-btn preview-btn-outline preview-btn-hover-outline">Hover</button>
                </div>
              </div>
              <div>
                <p class="text-[10px] font-semibold text-gray-500 uppercase mb-2">Yan Yana</p>
                <div class="flex gap-2 flex-wrap p-3 bg-gray-50 rounded-lg">
                  <button type="button" class="preview-btn preview-btn-solid">Kaydet</button>
                  <button type="button" class="preview-btn preview-btn-outline">İptal</button>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400 space-y-0.5">
              <div v-if="lastUpdatedAt">Son kayıt: {{ lastUpdatedAt }}</div>
              <div v-if="lastUpdatedBy">Güncelleyen: {{ lastUpdatedBy }}</div>
              <div v-if="!hasChanges && !lastUpdatedAt">Henüz kayıt yok</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Reset confirm modal -->
    <div
      v-if="showResetModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showResetModal = false"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
        <div class="flex items-start gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-triangle-exclamation text-red-500"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold text-gray-900">Varsayılana Dönülsün mü?</h3>
            <p class="text-xs text-gray-500 mt-1">
              Tüm özel buton ayarları silinecek ve site orijinal görünüme dönecek.
              Bu işlem hemen kaydedilir ve geri alınamaz.
            </p>
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button class="hdr-btn-outlined text-xs" @click="showResetModal = false">Vazgeç</button>
          <button class="hdr-btn-primary text-xs" style="background:#ef4444" @click="resetToDefaults">
            <i class="fas fa-rotate-left mr-1.5"></i>Evet, Varsayılana Dön
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/api'
import { buttonTokenGroups, buildDefaultsMap } from '@/data/themeTokens'

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const showResetModal = ref(false)

// Backend'den gelen "kaydedilmiş" override'lar
const loaded = ref({})
// Kullanıcının değiştirdiği çalışan kopya
const draft = ref({})

const lastUpdatedAt = ref('')
const lastUpdatedBy = ref('')

const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL || ''

const groups = buttonTokenGroups
const defaults = buildDefaultsMap()

// ---------- Computed ----------

const dirtyCount = computed(() => {
  let n = 0
  const keys = new Set([...Object.keys(draft.value), ...Object.keys(loaded.value)])
  for (const k of keys) {
    if ((draft.value[k] || '') !== (loaded.value[k] || '')) n++
  }
  return n
})

const hasChanges = computed(() => dirtyCount.value > 0)

// Preview için draft + default birleştirilip CSS vars olarak verilir
const previewVars = computed(() => {
  const vars = { ...defaults }
  for (const [k, v] of Object.entries(draft.value)) {
    if (v) vars[k] = v
  }
  return vars
})

// ---------- Methods ----------

function isDirty(varName) {
  return (draft.value[varName] || '') !== (loaded.value[varName] || '')
}

function dirtyCountInGroup(group) {
  let n = 0
  for (const t of group.tokens) {
    if (isDirty(t.var)) n++
  }
  return n
}

function getValue(varName) {
  if (varName in draft.value) return draft.value[varName]
  return defaults[varName] || ''
}

function setValue(varName, value) {
  // Default ile aynıysa override'ı kaldır (clean JSON)
  const def = defaults[varName] || ''
  if (!value || value === def) {
    delete draft.value[varName]
  } else {
    draft.value[varName] = value
  }
  // Reactivity için referansı yenile
  draft.value = { ...draft.value }
}

function resetToken(varName) {
  delete draft.value[varName]
  draft.value = { ...draft.value }
}

function discardChanges() {
  draft.value = { ...loaded.value }
}

function confirmResetDefaults() {
  showResetModal.value = true
}

async function resetToDefaults() {
  showResetModal.value = false
  draft.value = {}
  await saveChanges()
}

async function loadSettings() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.callMethod('tradehub_core.api.theme.get_theme_settings')
    const msg = res?.message || {}
    const overrides = (msg.overrides && typeof msg.overrides === 'object') ? msg.overrides : {}
    loaded.value = { ...overrides }
    draft.value = { ...overrides }
    lastUpdatedAt.value = msg.last_updated_at || ''
    lastUpdatedBy.value = msg.last_updated_by || ''
  } catch (e) {
    loadError.value = e.message || 'Tema ayarları yüklenemedi'
  } finally {
    loading.value = false
  }
}

async function saveChanges() {
  if (saving.value) return
  saving.value = true
  try {
    const res = await api.callMethod('tradehub_core.api.theme.save_theme_settings', {
      overrides: draft.value,
    })
    if (res?.message?.ok) {
      loaded.value = { ...draft.value }
      // Yeniden yükle ki audit alanları güncellensin
      await loadSettings()
    } else {
      throw new Error('Beklenmeyen cevap')
    }
  } catch (e) {
    alert('Kaydedilemedi: ' + (e.message || e))
  } finally {
    saving.value = false
  }
}

// ---------- Input handlers ----------

function onColorInput(varName, event) {
  setValue(varName, event.target.value)
}

function onTextInput(varName, event) {
  setValue(varName, event.target.value)
}

function onRangeInput(token, event) {
  const n = event.target.value
  const unit = token.unit || ''
  setValue(token.var, `${n}${unit}`)
}

// ---------- Utils ----------

function numericPart(value) {
  if (!value) return 0
  const match = String(value).match(/^-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function colorAsHex(value) {
  if (!value) return '#000000'
  const v = String(value).trim()
  if (v.startsWith('#')) {
    // #rgb → #rrggbb
    if (v.length === 4) {
      return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]
    }
    if (v.length === 7) return v
    if (v.length === 9) return v.slice(0, 7)
  }
  // rgba/hsla gibi değerler için color picker neutralize
  return '#000000'
}

function iconClassFor(name) {
  const map = {
    sliders: 'fa-sliders',
    square: 'fa-square',
    'square-dashed': 'fa-square-dashed',
  }
  return map[name] || 'fa-palette'
}

// ---------- Lifecycle ----------

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
/* Preview butonlar — scope'lu, admin panelin hiçbir global stilini etkilemez */
.preview-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  line-height: 1.25;
  transition: all 0.15s ease;
  border-radius: var(--radius-button);
  padding: var(--spacing-button-y) var(--spacing-button-x);
  font-size: var(--btn-font-size);
  font-weight: var(--btn-font-weight);
}

.preview-btn-solid {
  background: var(--btn-bg);
  color: var(--btn-text);
  border: var(--btn-border-width) solid var(--btn-border-color);
  box-shadow: var(--btn-shadow);
}

.preview-btn-outline {
  background: var(--btn-outline-bg);
  color: var(--btn-outline-text);
  border: var(--btn-outline-border-width) solid var(--btn-outline-border-color);
}

.preview-btn-gradient {
  background: linear-gradient(135deg, var(--btn-bg), var(--btn-hover-bg));
  color: var(--btn-text);
  border: none;
}

/* Hover durumunu sabit göstermek için */
.preview-btn-hover {
  background: var(--btn-hover-bg) !important;
  color: var(--btn-hover-text) !important;
}

.preview-btn-hover-outline {
  background: var(--btn-outline-hover-bg) !important;
  color: var(--btn-outline-hover-text) !important;
}

.preview-btn-hover-gradient {
  background: linear-gradient(135deg, var(--btn-hover-bg), var(--btn-bg)) !important;
  color: var(--btn-hover-text, var(--btn-text)) !important;
}
</style>
