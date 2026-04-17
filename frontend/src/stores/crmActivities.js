/**
 * CRM Activities Store — aktivite timeline + comment ekleme
 *
 * Frappe CRM `crm.api.activities.get_activities` ve `crm.api.activities.get_deal_activities`
 * endpointlerini kullanir. Fallback olarak Frappe Comment DocType.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useCrmActivityStore = defineStore('crmActivities', () => {
  const cache = ref({}) // { "Doctype::name": [...items] }
  const loading = ref(false)

  function keyOf(doctype, name) {
    return `${doctype}::${name}`
  }

  async function fetchActivities(doctype, name) {
    loading.value = true
    try {
      // Lead icin get_activities, Deal icin get_deal_activities
      const method = doctype === 'CRM Deal'
        ? 'crm.api.activities.get_deal_activities'
        : 'crm.api.activities.get_activities'
      try {
        const res = await api.callMethod(method, { name })
        const items = res.message || []
        cache.value[keyOf(doctype, name)] = items
        return items
      } catch {
        // Fallback: Frappe Comment DocType uzerinden cek
        const res = await api.getList('Comment', {
          fields: ['name', 'comment_type', 'content', 'owner', 'creation'],
          filters: [
            ['reference_doctype', '=', doctype],
            ['reference_name', '=', name],
          ],
          order_by: 'creation desc',
          limit_page_length: 100,
        })
        const items = (res.data || []).map(c => ({
          name: c.name,
          activity_type: 'comment',
          content: c.content,
          owner: c.owner,
          creation: c.creation,
        }))
        cache.value[keyOf(doctype, name)] = items
        return items
      }
    } finally {
      loading.value = false
    }
  }

  async function addComment(doctype, name, content, attachments = []) {
    try {
      const res = await api.callMethod('crm.api.comment.add_comment', {
        reference_doctype: doctype,
        reference_name: name,
        content,
        attachments: JSON.stringify(attachments),
      })
      // Cache'i invalidate et
      delete cache.value[keyOf(doctype, name)]
      return res.message || res
    } catch {
      // Fallback: Frappe'nin standart add_comment'i
      const res = await api.callMethod('frappe.desk.form.utils.add_comment', {
        reference_doctype: doctype,
        reference_name: name,
        content,
        comment_email: '',
        comment_by: '',
      })
      delete cache.value[keyOf(doctype, name)]
      return res.message || res
    }
  }

  function getCached(doctype, name) {
    return cache.value[keyOf(doctype, name)] || []
  }

  function invalidate(doctype, name) {
    delete cache.value[keyOf(doctype, name)]
  }

  return {
    loading,
    fetchActivities, addComment, getCached, invalidate,
  }
})
