/**
 * CRM Settings Store — Global Settings, SLA, Assignment Rules, Email Accounts, Integrations
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useCrmSettingsStore = defineStore('crmSettings', () => {
  const globalSettings = ref(null)
  const twilioSettings = ref(null)
  const exotelSettings = ref(null)
  const erpnextSettings = ref(null)

  async function fetchGlobalSettings() {
    try {
      const res = await api.getDoc('CRM Global Settings', 'CRM Global Settings')
      globalSettings.value = res.data
      return res.data
    } catch { return null }
  }

  async function updateGlobalSettings(data) {
    const res = await api.updateDoc('CRM Global Settings', 'CRM Global Settings', data)
    globalSettings.value = res.data
    return res.data
  }

  async function fetchTwilioSettings() {
    try {
      const res = await api.getDoc('CRM Twilio Settings', 'CRM Twilio Settings')
      twilioSettings.value = res.data
      return res.data
    } catch { return null }
  }

  async function updateTwilioSettings(data) {
    const res = await api.updateDoc('CRM Twilio Settings', 'CRM Twilio Settings', data)
    twilioSettings.value = res.data
    return res.data
  }

  async function fetchExotelSettings() {
    try {
      const res = await api.getDoc('CRM Exotel Settings', 'CRM Exotel Settings')
      exotelSettings.value = res.data
      return res.data
    } catch { return null }
  }

  async function updateExotelSettings(data) {
    const res = await api.updateDoc('CRM Exotel Settings', 'CRM Exotel Settings', data)
    exotelSettings.value = res.data
    return res.data
  }

  async function fetchErpnextSettings() {
    try {
      const res = await api.getDoc('ERPNext CRM Settings', 'ERPNext CRM Settings')
      erpnextSettings.value = res.data
      return res.data
    } catch { return null }
  }

  async function updateErpnextSettings(data) {
    const res = await api.updateDoc('ERPNext CRM Settings', 'ERPNext CRM Settings', data)
    erpnextSettings.value = res.data
    return res.data
  }

  // ── SLA Service Level Agreements ────────────────────────
  async function fetchSlaList() {
    const res = await api.getList('CRM Service Level Agreement', {
      fields: ['name', 'sla_name', 'enabled', 'default', 'apply_on', 'description'],
      order_by: 'modified desc',
      limit_page_length: 100,
    })
    return res.data || []
  }

  async function fetchSla(name) {
    const res = await api.getDoc('CRM Service Level Agreement', name)
    return res.data
  }

  async function createSla(data) {
    const res = await api.createDoc('CRM Service Level Agreement', data)
    return res.data
  }

  async function updateSla(name, data) {
    const res = await api.updateDoc('CRM Service Level Agreement', name, data)
    return res.data
  }

  // ── Assignment Rules ────────────────────────────────────
  async function fetchAssignmentRules() {
    try {
      const res = await api.callMethod('crm.api.assignment_rule.get_assignment_rules_list')
      return res.message || []
    } catch {
      const res = await api.getList('Assignment Rule', {
        fields: ['name', 'rule_name', 'description', 'disabled', 'document_type'],
        limit_page_length: 100,
      })
      return res.data || []
    }
  }

  async function duplicateAssignmentRule(name) {
    return api.callMethod('crm.api.assignment_rule.duplicate_assignment_rule', { name })
  }

  async function toggleAssignmentRule(name, disabled) {
    return api.updateDoc('Assignment Rule', name, { disabled: disabled ? 1 : 0 })
  }

  // ── Email Accounts ──────────────────────────────────────
  async function fetchEmailAccounts() {
    const res = await api.getList('Email Account', {
      fields: ['name', 'email_id', 'service', 'enable_incoming', 'enable_outgoing', 'default_incoming', 'default_outgoing'],
      limit_page_length: 100,
    })
    return res.data || []
  }

  async function createEmailAccount(payload) {
    return api.callMethod('crm.api.settings.create_email_account', payload)
  }

  return {
    globalSettings, twilioSettings, exotelSettings, erpnextSettings,
    fetchGlobalSettings, updateGlobalSettings,
    fetchTwilioSettings, updateTwilioSettings,
    fetchExotelSettings, updateExotelSettings,
    fetchErpnextSettings, updateErpnextSettings,
    fetchSlaList, fetchSla, createSla, updateSla,
    fetchAssignmentRules, duplicateAssignmentRule, toggleAssignmentRule,
    fetchEmailAccounts, createEmailAccount,
  }
})
