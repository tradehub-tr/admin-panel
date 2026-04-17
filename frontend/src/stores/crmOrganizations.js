/**
 * CRM Organizations Store — CRM Organization DocType
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

const ORG_FIELDS = [
  'name', 'organization_name', 'website',
  'industry', 'no_of_employees', 'territory',
  'annual_revenue', 'currency', 'exchange_rate',
  'address_line_1', 'city', 'state', 'country',
  'modified', 'creation',
]

export const useCrmOrganizationStore = defineStore('crmOrganizations', () => {
  const organizations = ref([])
  const total = ref(0)
  const loading = ref(false)

  async function fetchOrganizations({ page = 1, pageSize = 30, filters = [], orFilters, orderBy = 'modified desc' } = {}) {
    loading.value = true
    try {
      const params = {
        fields: ORG_FIELDS,
        filters,
        order_by: orderBy,
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      }
      if (orFilters) params['or_filters'] = orFilters
      const [listRes, countRes] = await Promise.all([
        api.getList('CRM Organization', params),
        api.getCount('CRM Organization', filters),
      ])
      organizations.value = listRes.data || []
      total.value = countRes.message || 0
    } finally {
      loading.value = false
    }
  }

  async function fetchOrganization(name) {
    const res = await api.getDoc('CRM Organization', name)
    return res.data
  }

  async function createOrganization(data) {
    const res = await api.createDoc('CRM Organization', data)
    return res.data
  }

  async function updateOrganization(name, data) {
    const res = await api.updateDoc('CRM Organization', name, data)
    return res.data
  }

  async function deleteOrganization(name) {
    return api.deleteDoc('CRM Organization', name)
  }

  return {
    organizations, total, loading,
    fetchOrganizations, fetchOrganization, createOrganization, updateOrganization, deleteOrganization,
  }
})
