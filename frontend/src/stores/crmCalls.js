/**
 * CRM Call Log Store — CRM Call Log DocType
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

const CALL_FIELDS = [
  'name', 'id', 'from', 'to', 'status', 'type',
  'duration', 'start_time', 'end_time', 'medium',
  'recording_url', 'reference_doctype', 'reference_docname',
  'caller', 'receiver', 'telephony_medium',
  'modified', 'creation',
]

export const useCrmCallStore = defineStore('crmCalls', () => {
  const calls = ref([])
  const total = ref(0)
  const loading = ref(false)

  async function fetchCalls({ page = 1, pageSize = 30, filters = [], orderBy = 'creation desc' } = {}) {
    loading.value = true
    try {
      const [listRes, countRes] = await Promise.all([
        api.getList('CRM Call Log', {
          fields: CALL_FIELDS,
          filters,
          order_by: orderBy,
          limit_start: (page - 1) * pageSize,
          limit_page_length: pageSize,
        }),
        api.getCount('CRM Call Log', filters),
      ])
      calls.value = listRes.data || []
      total.value = countRes.message || 0
    } finally {
      loading.value = false
    }
  }

  async function fetchCallsForRef(doctype, docname) {
    const res = await api.getList('CRM Call Log', {
      fields: CALL_FIELDS,
      filters: [
        ['reference_doctype', '=', doctype],
        ['reference_docname', '=', docname],
      ],
      order_by: 'creation desc',
      limit_page_length: 100,
    })
    return res.data || []
  }

  async function fetchCall(name) {
    const res = await api.getDoc('CRM Call Log', name)
    return res.data
  }

  return {
    calls, total, loading,
    fetchCalls, fetchCallsForRef, fetchCall,
  }
})
