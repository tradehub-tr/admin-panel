<template>
  <div class="flex gap-4 h-full">
    <!-- Left: Dashboard list -->
    <aside class="w-60 flex-shrink-0">
      <div class="th-widget">
        <div class="th-widget-header">
          <div>
            <h3 class="th-widget-title">Dashboard'lar</h3>
            <p class="th-widget-subtitle">Yönetilebilir dashboardlar</p>
          </div>
        </div>
        <div v-if="dashboardsLoading" class="text-xs text-center py-6" style="color: var(--th-text-tertiary)">
          <i class="fas fa-spinner fa-spin mr-1"></i> Yükleniyor…
        </div>
        <div v-else-if="!dashboards.length" class="text-xs text-center py-6" style="color: var(--th-text-tertiary)">
          Dashboard bulunamadı.
        </div>
        <div v-else class="space-y-1">
          <button
            v-for="d in dashboards"
            :key="d.dashboard_key"
            @click="selectDashboard(d.dashboard_key)"
            class="w-full flex flex-col items-start gap-0.5 p-2.5 rounded-lg border text-left transition-colors"
            :class="selectedKey === d.dashboard_key ? 'bg-violet-500/10 border-violet-500/40' : 'hover:bg-white/5'"
            :style="selectedKey === d.dashboard_key ? '' : 'border-color: var(--th-border)'"
          >
            <span class="text-sm font-medium" style="color: var(--th-text-primary)">{{ d.title }}</span>
            <span class="text-[10px]" style="color: var(--th-text-tertiary)">
              {{ d.enabled_count }}/{{ d.total }} aktif widget
            </span>
          </button>
        </div>
      </div>

      <div class="th-widget mt-4">
        <div class="th-widget-header">
          <div>
            <h3 class="th-widget-title">Bilgi</h3>
          </div>
        </div>
        <div class="text-[11px] space-y-2" style="color: var(--th-text-secondary)">
          <p>Bir dashboard seç, widget'ları sürükleyerek sırala.</p>
          <p class="pt-2 border-t" style="border-color: var(--th-border)">
            <router-link to="/app/Dashboard Widget" class="text-violet-500 hover:underline">
              Detaylı DocType listesini aç →
            </router-link>
          </p>
        </div>
      </div>
    </aside>

    <!-- Right: Widget list for selected dashboard -->
    <section class="flex-1 min-w-0">
      <div class="th-widget">
        <div class="th-widget-header">
          <div>
            <h3 class="th-widget-title">
              {{ selectedDashboard?.title || 'Dashboard seçin' }}
            </h3>
            <p class="th-widget-subtitle">
              {{ selectedKey ? 'Widget\'ları sürükleyerek sırala, aktiflik durumunu değiştir' : '' }}
            </p>
          </div>
          <div v-if="selectedKey" class="flex items-center gap-2">
            <button
              @click="openNewWidget"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors"
            >
              <i class="fas fa-plus text-[10px]"></i> Yeni Widget
            </button>
            <button
              @click="loadWidgets"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border hover:bg-white/5 transition-colors"
              style="border-color: var(--th-border); color: var(--th-text-secondary)"
              title="Yenile"
            >
              <i class="fas fa-rotate-right text-[10px]"></i>
            </button>
          </div>
        </div>

        <div v-if="!selectedKey" class="text-sm text-center py-12" style="color: var(--th-text-tertiary)">
          Soldan bir dashboard seç.
        </div>

        <div v-else-if="widgetsLoading" class="text-xs text-center py-6" style="color: var(--th-text-tertiary)">
          <i class="fas fa-spinner fa-spin mr-1"></i> Widget'lar yükleniyor…
        </div>

        <div v-else-if="!widgets.length" class="text-sm text-center py-12" style="color: var(--th-text-tertiary)">
          Bu dashboard'da henüz widget yok.
          <button @click="openNewWidget" class="text-violet-500 hover:underline ml-1">
            İlkini ekle →
          </button>
        </div>

        <draggable
          v-else
          v-model="widgets"
          item-key="name"
          handle=".drag-handle"
          @end="onDragEnd"
          :animation="160"
          ghost-class="dragging-ghost"
        >
          <template #item="{ element: w }">
            <div
              class="flex items-center gap-3 p-3 rounded-lg border mb-2 transition-all"
              :class="w.is_enabled ? '' : 'opacity-60'"
              style="border-color: var(--th-border); background: var(--th-surface-elevated)"
            >
              <i class="drag-handle fas fa-grip-vertical text-xs cursor-grab" style="color: var(--th-text-tertiary)" title="Sırala"></i>

              <div class="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-xs" style="background: var(--th-brand-50); color: var(--th-brand-500)">
                <i :class="widgetTypeIcon(w.widget_type)"></i>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-medium truncate" style="color: var(--th-text-primary)">{{ w.title }}</span>
                  <span class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded" style="background: var(--th-surface-card); color: var(--th-text-tertiary)">
                    {{ widgetTypeLabel(w.widget_type) }}
                  </span>
                </div>
                <div class="text-[11px] mt-0.5 truncate" style="color: var(--th-text-tertiary)">
                  <span>{{ w.name }}</span>
                  <span v-if="w.source_doctype"> · {{ w.source_doctype }}</span>
                  <span> · boyut: {{ w.size }}</span>
                  <span> · sıra: {{ w.position }}</span>
                </div>
              </div>

              <!-- Enable Toggle -->
              <button
                @click="toggleEnabled(w)"
                class="relative inline-flex items-center h-5 w-9 rounded-full transition-colors"
                :class="w.is_enabled ? 'bg-emerald-500' : 'bg-gray-600'"
                :title="w.is_enabled ? 'Aktif — tıkla devre dışı bırak' : 'Devre dışı — tıkla etkinleştir'"
              >
                <span
                  class="inline-block h-3 w-3 rounded-full bg-white transition-transform"
                  :class="w.is_enabled ? 'translate-x-5' : 'translate-x-1'"
                ></span>
              </button>

              <!-- Actions -->
              <router-link
                :to="`/app/Dashboard Widget/${encodeURIComponent(w.name)}`"
                class="text-[11px] font-medium text-violet-500 hover:underline px-2"
                title="Detaylı düzenle"
              >
                Düzenle
              </router-link>
            </div>
          </template>
        </draggable>

        <div v-if="reorderStatus" class="mt-3 text-[11px] text-right" :class="reorderStatus.error ? 'text-red-500' : 'text-emerald-500'">
          {{ reorderStatus.message }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import api from '@/utils/api'

const router = useRouter()

const dashboards = ref([])
const dashboardsLoading = ref(true)
const selectedKey = ref(null)
const widgets = ref([])
const widgetsLoading = ref(false)
const reorderStatus = ref(null)

const selectedDashboard = computed(() =>
  dashboards.value.find(d => d.dashboard_key === selectedKey.value)
)

const WIDGET_TYPE_META = {
  kpi_single: { label: 'KPI', icon: 'fas fa-hashtag' },
  line_chart: { label: 'Çizgi', icon: 'fas fa-chart-line' },
  bar_chart: { label: 'Bar', icon: 'fas fa-chart-bar' },
  donut_chart: { label: 'Pasta', icon: 'fas fa-chart-pie' },
  funnel_chart: { label: 'Funnel', icon: 'fas fa-filter' },
  status_breakdown: { label: 'Durum', icon: 'fas fa-list-check' },
  quick_links: { label: 'Link', icon: 'fas fa-link' },
}

function widgetTypeLabel(t) { return WIDGET_TYPE_META[t]?.label || t }
function widgetTypeIcon(t) { return WIDGET_TYPE_META[t]?.icon || 'fas fa-cube' }

async function loadDashboards() {
  dashboardsLoading.value = true
  try {
    const res = await api.callMethodGET('tradehub_core.tradehub_core.api.dashboard_engine.list_dashboards')
    dashboards.value = res.message || []
    if (dashboards.value.length && !selectedKey.value) {
      selectDashboard(dashboards.value[0].dashboard_key)
    }
  } catch (e) {
    console.error('Dashboard listesi yüklenemedi:', e)
    dashboards.value = []
  } finally {
    dashboardsLoading.value = false
  }
}

async function loadWidgets() {
  if (!selectedKey.value) return
  widgetsLoading.value = true
  reorderStatus.value = null
  try {
    const res = await api.callMethodGET(
      'tradehub_core.tradehub_core.api.dashboard_engine.list_widgets_for_admin',
      { dashboard_key: selectedKey.value },
    )
    widgets.value = res.message || []
  } catch (e) {
    console.error('Widget listesi yüklenemedi:', e)
    widgets.value = []
  } finally {
    widgetsLoading.value = false
  }
}

function selectDashboard(key) {
  selectedKey.value = key
  loadWidgets()
}

async function onDragEnd() {
  if (!widgets.value.length) return
  reorderStatus.value = { message: 'Sıralama kaydediliyor…' }
  try {
    const ordered = widgets.value.map(w => w.name)
    await api.callMethod('tradehub_core.tradehub_core.api.dashboard_engine.reorder_widgets', {
      dashboard_key: selectedKey.value,
      ordered_ids: JSON.stringify(ordered),
    })
    // Update position values locally for display
    widgets.value.forEach((w, idx) => { w.position = (idx + 1) * 10 })
    reorderStatus.value = { message: 'Sıralama kaydedildi ✓' }
    setTimeout(() => { reorderStatus.value = null }, 2500)
    // Refresh sidebar counts
    loadDashboards()
  } catch (e) {
    reorderStatus.value = { message: 'Sıralama kaydedilemedi: ' + (e.message || e), error: true }
  }
}

async function toggleEnabled(w) {
  const newValue = w.is_enabled ? 0 : 1
  const prev = w.is_enabled
  w.is_enabled = newValue
  try {
    await api.callMethod('tradehub_core.tradehub_core.api.dashboard_engine.toggle_widget', {
      widget_id: w.name,
      enabled: newValue,
    })
    loadDashboards()
  } catch (e) {
    w.is_enabled = prev
    alert('Durum değiştirilemedi: ' + (e.message || e))
  }
}

function openNewWidget() {
  const key = selectedKey.value || 'platform_overview'
  router.push({
    path: '/app/Dashboard Widget/new',
    query: {
      dashboard_key: key,
      returnTo: '/dashboard-manager',
    },
  })
}

onMounted(loadDashboards)
</script>

<style scoped>
.dragging-ghost {
  opacity: 0.4;
  background: rgba(124, 58, 237, 0.1) !important;
  border: 1px dashed rgb(124, 58, 237) !important;
}
</style>
