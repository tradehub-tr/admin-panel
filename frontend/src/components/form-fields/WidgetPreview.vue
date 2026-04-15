<template>
  <div
    class="widget-preview rounded-xl border p-4 mb-4"
    style="background: rgba(139,92,246,0.04); border-color: rgba(139,92,246,0.25)"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <i class="fas fa-eye text-xs text-violet-500"></i>
        <h4 class="text-xs font-semibold uppercase tracking-wide" style="color: var(--th-text-secondary)">Önizleme</h4>
        <span v-if="loading" class="text-[10px]" style="color: var(--th-text-tertiary)">
          <i class="fas fa-spinner fa-spin"></i> Yenileniyor…
        </span>
      </div>
      <p class="text-[10px]" style="color: var(--th-text-tertiary)">canlı veri · 30 gün</p>
    </div>

    <!-- Empty state -->
    <div v-if="!isReady" class="text-center py-6 text-xs" style="color: var(--th-text-tertiary)">
      <i class="fas fa-circle-info mr-1"></i>
      Önizleme için eksik:
      <span v-for="(m, i) in missingFields" :key="m" class="font-medium" style="color: var(--th-text-secondary)">
        <span v-if="i > 0">, </span>{{ m }}
      </span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="p-3 rounded-lg text-xs" style="background: rgba(239,68,68,0.1); color: rgb(239,68,68)">
      <i class="fas fa-circle-xmark"></i> Önizleme oluşturulamadı: {{ error }}
    </div>

    <!-- Render via the same dynamic widget components -->
    <component
      v-else-if="renderableWidget && rendererComponent"
      :is="rendererComponent"
      :widget="renderableWidget"
      :period="'30d'"
    />

    <div v-else class="text-xs" style="color: var(--th-text-tertiary)">
      <i class="fas fa-circle-info"></i> Bu widget tipi için önizleme şu an mevcut değil.
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import api from '@/utils/api'
import { resolveWidget } from '@/components/dashboard/dynamic/registry'

const props = defineProps({
  modelValue: { type: String, default: '' },
  formData: { type: Object, default: () => ({}) },
  field: { type: Object, default: () => ({}) },
})

const injectedFormData = inject('formData', null)
const liveFormData = computed(() => injectedFormData?.value || props.formData || {})

const loading = ref(false)
const error = ref(null)
const previewData = ref(null)

const missingFields = computed(() => {
  const f = liveFormData.value
  const missing = []
  if (!f?.widget_type) { missing.push('Widget Tipi'); return missing }
  const t = f.widget_type
  if (t === 'quick_links' || t === 'funnel_chart') {
    if (!f.config_json) missing.push('Config JSON')
    return missing
  }
  if (!f.source_doctype) missing.push('Kaynak DocType')
  if (['line_chart', 'kpi_single'].includes(t) && f.aggregation && f.aggregation !== 'count' && !f.metric_field) {
    missing.push('Metrik Alanı')
  }
  if (['kpi_single', 'line_chart', 'bar_chart'].includes(t) && !f.aggregation) {
    missing.push('Hesaplama')
  }
  if (['bar_chart', 'donut_chart', 'status_breakdown'].includes(t) && !f.group_by_field) {
    missing.push('Gruplama Alanı')
  }
  if (t === 'line_chart' && !f.date_field) missing.push('Tarih Alanı')
  return missing
})

const isReady = computed(() => missingFields.value.length === 0)

const rendererComponent = computed(() => resolveWidget(liveFormData.value?.widget_type))

const renderableWidget = computed(() => {
  if (!previewData.value || !previewData.value.ok) return null
  const f = liveFormData.value
  return {
    name: '__preview__',
    widget_type: f?.widget_type,
    title: f?.title || 'Önizleme',
    subtitle: f?.subtitle || '',
    size: 'full',
    icon: f?.icon || '',
    icon_bg_class: bgClassFor(f?.color_preset),
    icon_color_class: textClassFor(f?.color_preset),
    is_currency: f?.is_currency || 0,
    data: previewData.value.data,
  }
})

const COLOR_BG = {
  violet: 'bg-violet-100 dark:bg-violet-500/10',
  blue: 'bg-blue-100 dark:bg-blue-500/10',
  emerald: 'bg-emerald-100 dark:bg-emerald-500/10',
  amber: 'bg-amber-100 dark:bg-amber-500/10',
  rose: 'bg-rose-100 dark:bg-rose-500/10',
  indigo: 'bg-indigo-100 dark:bg-indigo-500/10',
  teal: 'bg-teal-100 dark:bg-teal-500/10',
  orange: 'bg-orange-100 dark:bg-orange-500/10',
  gray: 'bg-gray-100 dark:bg-gray-500/10',
}
const COLOR_TXT = {
  violet: 'text-violet-500', blue: 'text-blue-500', emerald: 'text-emerald-500',
  amber: 'text-amber-500', rose: 'text-rose-500', indigo: 'text-indigo-500',
  teal: 'text-teal-500', orange: 'text-orange-500', gray: 'text-gray-500',
}
function bgClassFor(p) { return COLOR_BG[p] || COLOR_BG.violet }
function textClassFor(p) { return COLOR_TXT[p] || COLOR_TXT.violet }

let debounceTimer = null

async function fetchPreview() {
  if (!isReady.value) {
    previewData.value = null
    error.value = null
    return
  }
  loading.value = true
  error.value = null
  const f = liveFormData.value
  try {
    const config = {
      widget_type: f.widget_type,
      source_doctype: f.source_doctype,
      aggregation: f.aggregation,
      metric_field: f.metric_field,
      date_field: f.date_field,
      date_bucket: f.date_bucket,
      group_by_field: f.group_by_field,
      result_limit: f.result_limit,
      filters_json: f.filters_json,
      config_json: f.config_json,
      is_currency: f.is_currency,
      period_scoped: f.period_scoped,
      compare_previous: f.compare_previous,
    }
    const res = await api.callMethod('tradehub_core.tradehub_core.api.dashboard_engine.preview_dashboard_widget', {
      config: JSON.stringify(config),
      period: '30d',
    })
    const msg = res.message || {}
    if (!msg.ok) {
      error.value = msg.error || 'Bilinmeyen hata'
      previewData.value = null
    } else {
      previewData.value = msg
    }
  } catch (e) {
    error.value = e.message || 'Önizleme alınamadı'
    previewData.value = null
  } finally {
    loading.value = false
  }
}

watch(liveFormData, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchPreview, 500)
}, { deep: true, immediate: true })
</script>
