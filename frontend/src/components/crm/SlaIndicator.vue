<template>
  <div v-if="hasSla" class="crm-sla" :class="state">
    <div class="crm-sla-label">{{ label }}</div>
    <div class="crm-sla-value">{{ remainingLabel }}</div>
    <div v-if="responseByLabel" class="text-[11px] text-gray-400 mt-1">Hedef: {{ responseByLabel }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  responseBy: { type: [String, Date, null], default: null },
  resolutionBy: { type: [String, Date, null], default: null },
  respondedOn: { type: [String, Date, null], default: null },
  label: { type: String, default: 'SLA' },
})

const hasSla = computed(() => !!(props.responseBy || props.resolutionBy))

const deadline = computed(() => {
  const target = props.responseBy || props.resolutionBy
  return target ? new Date(target) : null
})

const state = computed(() => {
  if (props.respondedOn) return 'ok'
  if (!deadline.value) return ''
  const diffMin = (deadline.value.getTime() - Date.now()) / 60000
  if (diffMin < 0) return 'breach'
  if (diffMin < 60) return 'warn'
  return 'ok'
})

const remainingLabel = computed(() => {
  if (props.respondedOn) return 'Karşılandı'
  if (!deadline.value) return '—'
  const diffMs = deadline.value.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const min = Math.floor(abs / 60000)
  const hrs = Math.floor(min / 60)
  const days = Math.floor(hrs / 24)
  let lbl = ''
  if (days > 0) lbl = `${days}g ${hrs % 24}sa`
  else if (hrs > 0) lbl = `${hrs}sa ${min % 60}dk`
  else lbl = `${min}dk`
  return diffMs < 0 ? `${lbl} aşıldı` : `${lbl} kaldı`
})

const responseByLabel = computed(() => {
  if (!deadline.value) return ''
  try {
    return deadline.value.toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
})
</script>
