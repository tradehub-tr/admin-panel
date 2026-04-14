/**
 * CRM Store — CRM Lead & CRM Deal (headless)
 *
 * frappe/crm app'i kurulu ama UI'i kapali (nginx 404).
 * Admin-panel bu store uzerinden REST API ile konusur.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

const LEAD_FIELDS = [
  'name', 'first_name', 'last_name', 'lead_name', 'email',
  'mobile_no', 'organization', 'status', 'source',
  'lead_owner', 'modified', 'creation',
]

const DEAL_FIELDS = [
  'name', 'organization', 'deal_owner', 'status',
  'close_date', 'annual_revenue', 'probability',
  'modified', 'creation',
]

export const useCrmStore = defineStore('crm', () => {
  const leads = ref([])
  const leadsTotal = ref(0)
  const loadingLeads = ref(false)

  const deals = ref([])
  const dealsTotal = ref(0)
  const loadingDeals = ref(false)

  // ── CRM Lead ─────────────────────────────────────────
  async function fetchLeads({ page = 1, pageSize = 20, filters = [], orderBy = 'modified desc' } = {}) {
    loadingLeads.value = true
    try {
      const [listRes, countRes] = await Promise.all([
        api.getList('CRM Lead', {
          fields: LEAD_FIELDS,
          filters,
          order_by: orderBy,
          limit_start: (page - 1) * pageSize,
          limit_page_length: pageSize,
        }),
        api.getCount('CRM Lead', filters),
      ])
      leads.value = listRes.data || []
      leadsTotal.value = countRes.message || 0
    } finally {
      loadingLeads.value = false
    }
  }

  async function fetchLead(name) {
    const res = await api.getDoc('CRM Lead', name)
    return res.data
  }

  async function createLead(data) {
    const res = await api.createDoc('CRM Lead', data)
    return res.data
  }

  async function updateLead(name, data) {
    const res = await api.updateDoc('CRM Lead', name, data)
    return res.data
  }

  async function convertLeadToDeal(name) {
    // CRM'de convert action whitelisted method'dir.
    return api.callMethod(
      'crm.fcrm.doctype.crm_lead.crm_lead.convert_to_deal',
      { lead: name }
    )
  }

  // ── CRM Deal ─────────────────────────────────────────
  async function fetchDeals({ page = 1, pageSize = 20, filters = [], orderBy = 'modified desc' } = {}) {
    loadingDeals.value = true
    try {
      const [listRes, countRes] = await Promise.all([
        api.getList('CRM Deal', {
          fields: DEAL_FIELDS,
          filters,
          order_by: orderBy,
          limit_start: (page - 1) * pageSize,
          limit_page_length: pageSize,
        }),
        api.getCount('CRM Deal', filters),
      ])
      deals.value = listRes.data || []
      dealsTotal.value = countRes.message || 0
    } finally {
      loadingDeals.value = false
    }
  }

  async function fetchDeal(name) {
    const res = await api.getDoc('CRM Deal', name)
    return res.data
  }

  async function updateDeal(name, data) {
    const res = await api.updateDoc('CRM Deal', name, data)
    return res.data
  }

  return {
    leads, leadsTotal, loadingLeads,
    deals, dealsTotal, loadingDeals,
    fetchLeads, fetchLead, createLead, updateLead, convertLeadToDeal,
    fetchDeals, fetchDeal, updateDeal,
  }
})
