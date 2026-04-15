<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div>
        <h2 class="text-base font-semibold" style="color: var(--th-text-primary)">{{ effectiveTitle }}</h2>
        <p v-if="effectiveSubtitle" class="text-xs mt-0.5" style="color: var(--th-text-tertiary)">
          {{ effectiveSubtitle }}<span v-if="!isImpersonating && effectiveScope"> — <span class="text-violet-500 font-medium">{{ scopeLabel }}</span> bazında</span>
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Seller Filter (admin only): searchable picker, scales to thousands -->
        <SellerPicker
          v-if="showSellerFilter"
          v-model="sellerFilter"
          @selected="onSellerSelected"
        />
        <!-- Period Selector -->
        <div class="inline-flex rounded-lg border overflow-hidden" style="border-color: var(--th-border)">
          <button
            v-for="p in periods"
            :key="p.key"
            @click="changePeriod(p.key)"
            class="px-3 py-1.5 text-xs font-medium transition-colors"
            :class="period === p.key ? 'bg-violet-500 text-white' : 'hover:bg-white/5'"
            :style="period === p.key ? '' : 'color: var(--th-text-secondary)'"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Impersonation banner: super-admin viewing a seller's own dashboard -->
    <div
      v-if="isImpersonating"
      class="mb-4 p-3 rounded-lg border flex items-center justify-between gap-3 flex-wrap"
      style="background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.3)"
    >
      <div class="flex items-center gap-2.5 text-xs">
        <i class="fas fa-user-tie text-violet-500"></i>
        <span style="color: var(--th-text-secondary)">
          <strong style="color: var(--th-text-primary)">{{ scopeLabel }}</strong>
          satıcısının kendi mağaza panelini görüntülüyorsunuz. Platform geneline dönmek için satıcıyı temizleyin.
        </span>
      </div>
      <button
        @click="sellerFilter = null"
        class="text-[11px] font-medium px-2.5 py-1 rounded-md bg-violet-500/15 hover:bg-violet-500/25 text-violet-500 transition-colors flex items-center gap-1.5"
      >
        <i class="fas fa-arrow-left text-[9px]"></i> Platform Görünümüne Dön
      </button>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading && !widgets.length" class="th-widget-loading" style="min-height: 200px;">
      <div class="flex flex-col items-center gap-3">
        <i class="fas fa-spinner fa-spin text-lg" style="color: var(--th-brand-500)"></i>
        <span class="text-xs">Dashboard yükleniyor…</span>
      </div>
    </div>

    <div v-else-if="fatalError" class="th-widget-error">
      <i class="fas fa-exclamation-triangle text-xl"></i>
      <p class="text-xs">{{ fatalError }}</p>
      <button class="th-retry-btn" @click="loadLayout">
        <i class="fas fa-redo text-[10px] mr-1"></i> Tekrar Dene
      </button>
    </div>

    <!-- Widgets as a single flowing grid -->
    <DashboardGrid v-else>
      <component
        v-for="widget in widgets"
        :key="widget.name"
        :is="resolveComponent(widget)"
        :widget="widget"
        :period="period"
      />
    </DashboardGrid>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, markRaw } from 'vue'
import api from '@/utils/api'
import DashboardGrid from '@/components/dashboard/layout/DashboardGrid.vue'
import SellerPicker from '@/components/dashboard/SellerPicker.vue'
import { resolveWidget } from '@/components/dashboard/dynamic/registry'

const props = defineProps({
  dashboardKey: { type: String, required: true },
  title: { type: String, default: 'Genel Bakış' },
  subtitle: { type: String, default: '' },
  scope: { type: [String, null], default: null },
  defaultPeriod: { type: String, default: '30d' },
  showSellerFilter: { type: Boolean, default: false },
})

const periods = [
  { key: '7d', label: '7G' },
  { key: '30d', label: '30G' },
  { key: '90d', label: '90G' },
  { key: '365d', label: '1Y' },
]

const period = ref(props.defaultPeriod)
const loading = ref(true)
const fatalError = ref(null)
const widgets = ref([])
const sellerFilter = ref(null)
const sellerLabelCache = ref({})  // { sellerName: sellerLabel } populated by SellerPicker

function onSellerSelected(item) {
  if (item && item.name) {
    sellerLabelCache.value[item.name] = item.seller_name || item.name
  }
}

const effectiveScope = computed(() => {
  if (props.showSellerFilter && sellerFilter.value) return sellerFilter.value
  return props.scope
})

// Switcher: when a super-admin picks a specific seller from the platform
// dashboard, surface that seller's own dashboard exactly as the seller
// would see it. "All sellers" returns to the platform dashboard.
const effectiveDashboardKey = computed(() => {
  if (
    props.showSellerFilter &&
    props.dashboardKey === 'platform_overview' &&
    sellerFilter.value
  ) {
    return 'seller_overview'
  }
  return props.dashboardKey
})

const isImpersonating = computed(() =>
  props.dashboardKey === 'platform_overview' &&
  effectiveDashboardKey.value === 'seller_overview'
)

const scopeLabel = computed(() => {
  if (effectiveScope.value === '__me__') return 'Mağaza'
  if (!effectiveScope.value) return ''
  return sellerLabelCache.value[effectiveScope.value] || effectiveScope.value
})

const effectiveTitle = computed(() => {
  if (isImpersonating.value && scopeLabel.value) {
    return `${scopeLabel.value} — Mağaza Bakışı`
  }
  return props.title
})

const effectiveSubtitle = computed(() => {
  if (isImpersonating.value && scopeLabel.value) {
    return `${scopeLabel.value} satıcısının kendi panelini görüntülüyorsunuz.`
  }
  return props.subtitle
})

const UnknownWidget = markRaw({
  name: 'UnknownWidget',
  props: ['widget'],
  setup(p) {
    return () => null
  },
  render() {
    return null
  },
})

function resolveComponent(widget) {
  if (widget.error) {
    return markRaw({
      render() {
        return null
      },
    })
  }
  const comp = resolveWidget(widget.widget_type)
  if (!comp) {
    console.warn(`Bilinmeyen widget tipi: ${widget.widget_type}`)
    return UnknownWidget
  }
  return markRaw(comp)
}

async function loadLayout() {
  loading.value = true
  fatalError.value = null
  try {
    const args = { dashboard_key: effectiveDashboardKey.value, period: period.value }
    const scope = effectiveScope.value
    if (scope) args.scope = scope
    const res = await api.callMethodGET(
      'tradehub_core.tradehub_core.api.dashboard_engine.get_dashboard_layout',
      args,
    )
    widgets.value = res.message?.widgets || []
  } catch (e) {
    console.error('Dashboard yüklenemedi:', e)
    fatalError.value = e.message || 'Dashboard yüklenemedi.'
    widgets.value = []
  } finally {
    loading.value = false
  }
}

function changePeriod(newPeriod) {
  if (period.value === newPeriod) return
  period.value = newPeriod
}

watch(period, loadLayout)
watch(sellerFilter, loadLayout)
onMounted(loadLayout)
</script>
