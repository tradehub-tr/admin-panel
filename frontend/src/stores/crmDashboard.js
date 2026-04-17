/**
 * CRM Dashboard Store — KPI'lar, pipeline, son aktiviteler
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useCrmDashboardStore = defineStore('crmDashboard', () => {
  const dashboard = ref(null)
  const loading = ref(false)

  async function fetchDashboard({ fromDate = null, toDate = null, user = null } = {}) {
    loading.value = true
    try {
      try {
        const res = await api.callMethod('crm.api.dashboard.get_dashboard', {
          from_date: fromDate, to_date: toDate, user,
        })
        dashboard.value = res.message || null
        return dashboard.value
      } catch {
        // Fallback: minimal KPI paketi (sayimlar) olustur
        const [openLeads, wonDeals, lostDeals, openTasks] = await Promise.all([
          api.getCount('CRM Lead', [['status', 'not in', ['Junk', 'Unqualified']]]),
          api.getCount('CRM Deal', [['status', '=', 'Won']]),
          api.getCount('CRM Deal', [['status', '=', 'Lost']]),
          api.getCount('CRM Task', [['status', 'not in', ['Done', 'Canceled']]]),
        ])
        const fallback = {
          kpis: {
            open_leads: openLeads.message || 0,
            won_deals: wonDeals.message || 0,
            lost_deals: lostDeals.message || 0,
            open_tasks: openTasks.message || 0,
          },
          pipeline: [],
          recent: [],
        }
        dashboard.value = fallback
        return fallback
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchPipelineByStatus() {
    // Status gruplari ve deger toplamlari
    try {
      const res = await api.callMethod('frappe.client.get_list', {
        doctype: 'CRM Deal',
        fields: ['status', 'deal_value', 'expected_deal_value', 'annual_revenue'],
        limit_page_length: 1000,
      })
      const rows = res.message || []
      const groups = {}
      for (const r of rows) {
        const s = r.status || '—'
        if (!groups[s]) groups[s] = { status: s, count: 0, value: 0 }
        groups[s].count += 1
        groups[s].value += Number(r.deal_value || r.expected_deal_value || r.annual_revenue || 0)
      }
      return Object.values(groups)
    } catch {
      return []
    }
  }

  async function fetchRecentActivities(limit = 10) {
    try {
      const res = await api.getList('Comment', {
        fields: ['name', 'content', 'comment_type', 'owner', 'creation', 'reference_doctype', 'reference_name'],
        filters: [['reference_doctype', 'in', ['CRM Lead', 'CRM Deal']]],
        order_by: 'creation desc',
        limit_page_length: limit,
      })
      return res.data || []
    } catch {
      return []
    }
  }

  return {
    dashboard, loading,
    fetchDashboard, fetchPipelineByStatus, fetchRecentActivities,
  }
})
