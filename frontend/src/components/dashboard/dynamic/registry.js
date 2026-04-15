/**
 * Widget Registry — maps widget_type to its Vue component.
 *
 * Adding a new widget type:
 * 1. Add a handler in backend (tradehub_core/api/dashboard_engine.py HANDLERS)
 * 2. Create a Dynamic<Type>.vue component that accepts { widget, period }
 * 3. Register it here
 */
import DynamicKpi from './DynamicKpi.vue'
import DynamicLineChart from './DynamicLineChart.vue'
import DynamicBarChart from './DynamicBarChart.vue'
import DynamicDonutChart from './DynamicDonutChart.vue'
import DynamicFunnelChart from './DynamicFunnelChart.vue'
import DynamicStatusBreakdown from './DynamicStatusBreakdown.vue'
import DynamicQuickLinks from './DynamicQuickLinks.vue'

export const WIDGET_REGISTRY = {
  kpi_single: DynamicKpi,
  line_chart: DynamicLineChart,
  bar_chart: DynamicBarChart,
  donut_chart: DynamicDonutChart,
  funnel_chart: DynamicFunnelChart,
  status_breakdown: DynamicStatusBreakdown,
  quick_links: DynamicQuickLinks,
}

export function resolveWidget(widgetType) {
  return WIDGET_REGISTRY[widgetType] || null
}
