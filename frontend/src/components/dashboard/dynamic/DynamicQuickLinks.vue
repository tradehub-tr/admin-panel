<template>
  <WidgetWrapper
    :title="widget.title"
    :subtitle="widget.subtitle"
    :size="widget.size || 'full'"
    :empty="!links.length"
  >
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <router-link
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
        style="border-color: var(--th-border)"
      >
        <div class="w-9 h-9 rounded-lg flex items-center justify-center text-sm" :class="link.icon_class">
          <i :class="link.icon"></i>
        </div>
        <div>
          <div class="text-sm font-medium" style="color: var(--th-text-primary)">{{ link.label }}</div>
          <div v-if="link.count !== null" class="text-[11px]" style="color: var(--th-text-tertiary)">{{ link.count }} kayıt</div>
        </div>
      </router-link>
    </div>
  </WidgetWrapper>
</template>

<script setup>
import { computed } from 'vue'
import WidgetWrapper from '@/components/dashboard/layout/WidgetWrapper.vue'

const props = defineProps({
  widget: { type: Object, required: true },
})

const links = computed(() => props.widget.data?.links || [])
</script>
