<template>
  <span class="crm-pill" :class="cls" :style="inlineStyle">
    <span v-if="dot" class="dot" :style="dotStyle"></span>
    <span>{{ label || status || '-' }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
  label: { type: String, default: '' },
  variant: { type: String, default: '' }, // success|warning|error|info|brand|''
  color: { type: String, default: '' },    // custom hex ise kullan
  dot: { type: Boolean, default: true },
})

const VARIANT_MAP = {
  // Lead
  New: 'info', Open: 'info',
  Contacted: 'warning', Replied: 'warning',
  Nurture: 'brand', 'In Progress': 'brand',
  Qualified: 'success', Won: 'success', Completed: 'success', Done: 'success', Resolved: 'success',
  Unqualified: 'error', Lost: 'error', Canceled: 'error', Cancelled: 'error', Rejected: 'error',
  Junk: '',
  Backlog: '', Todo: 'info',
}

const cls = computed(() => {
  if (props.variant) return `crm-pill-${props.variant}`
  const v = VARIANT_MAP[props.status]
  return v ? `crm-pill-${v}` : ''
})

const inlineStyle = computed(() => {
  if (!props.color) return null
  return { background: `${props.color}22`, color: props.color }
})

const dotStyle = computed(() => {
  if (props.color) return { background: props.color, opacity: 1 }
  return null
})
</script>
