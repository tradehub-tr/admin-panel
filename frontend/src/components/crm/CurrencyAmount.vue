<template>
  <span class="crm-currency">{{ formatted }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  amount: { type: [Number, String], default: 0 },
  currency: { type: String, default: 'TRY' },
})

const formatted = computed(() => {
  const n = Number(props.amount || 0)
  if (isNaN(n)) return '-'
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: props.currency || 'TRY',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${n.toLocaleString('tr-TR')} ${props.currency || ''}`
  }
})
</script>
