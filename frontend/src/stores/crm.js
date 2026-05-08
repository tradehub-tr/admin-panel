/**
 * CRM Store — CRM Lead & CRM Deal (headless)
 *
 * Frappe CRM app'i kurulu ama UI'i kapali (nginx 404).
 * Admin-panel bu store uzerinden REST API ile konusur.
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";

const LEAD_FIELDS = [
  "name",
  "first_name",
  "last_name",
  "lead_name",
  "email",
  "mobile_no",
  "organization",
  "status",
  "source",
  "industry",
  "territory",
  "job_title",
  "lead_owner",
  "modified",
  "creation",
  "no_of_employees",
  "annual_revenue",
];

const DEAL_FIELDS = [
  "name",
  "organization",
  "deal_owner",
  "status",
  "closed_date",
  "annual_revenue",
  "probability",
  "currency",
  "deal_value",
  "expected_deal_value",
  "expected_closure_date",
  "industry",
  "territory",
  "no_of_employees",
  "modified",
  "creation",
];

export const useCrmStore = defineStore("crm", () => {
  const leads = ref([]);
  const leadsTotal = ref(0);
  const loadingLeads = ref(false);

  const deals = ref([]);
  const dealsTotal = ref(0);
  const loadingDeals = ref(false);

  // ── CRM Lead ─────────────────────────────────────────
  async function fetchLeads({
    page = 1,
    pageSize = 20,
    filters = [],
    orFilters,
    orderBy = "modified desc",
  } = {}) {
    loadingLeads.value = true;
    try {
      const params = {
        fields: LEAD_FIELDS,
        filters,
        order_by: orderBy,
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      };
      if (orFilters) params["or_filters"] = orFilters;
      const [listRes, countRes] = await Promise.all([
        api.getList("CRM Lead", params),
        api.getCount("CRM Lead", filters),
      ]);
      leads.value = listRes.data || [];
      leadsTotal.value = countRes.message || 0;
    } finally {
      loadingLeads.value = false;
    }
  }

  async function fetchLead(name) {
    const res = await api.getDoc("CRM Lead", name);
    return res.data;
  }

  async function createLead(data) {
    const res = await api.createDoc("CRM Lead", data);
    return res.data;
  }

  async function updateLead(name, data) {
    const res = await api.updateDoc("CRM Lead", name, data);
    return res.data;
  }

  async function convertLeadToDeal(name) {
    return api.callMethod("crm.fcrm.doctype.crm_lead.crm_lead.convert_to_deal", { lead: name });
  }

  // ── CRM Deal ─────────────────────────────────────────
  async function fetchDeals({
    page = 1,
    pageSize = 20,
    filters = [],
    orFilters,
    orderBy = "modified desc",
  } = {}) {
    loadingDeals.value = true;
    try {
      const params = {
        fields: DEAL_FIELDS,
        filters,
        order_by: orderBy,
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      };
      if (orFilters) params["or_filters"] = orFilters;
      const [listRes, countRes] = await Promise.all([
        api.getList("CRM Deal", params),
        api.getCount("CRM Deal", filters),
      ]);
      deals.value = listRes.data || [];
      dealsTotal.value = countRes.message || 0;
    } finally {
      loadingDeals.value = false;
    }
  }

  async function fetchAllDealsForKanban(filters = []) {
    // Kanban icin tum deal'lari cek (pageSize buyuk)
    const res = await api.getList("CRM Deal", {
      fields: DEAL_FIELDS,
      filters,
      order_by: "modified desc",
      limit_page_length: 500,
    });
    return res.data || [];
  }

  async function fetchDeal(name) {
    const res = await api.getDoc("CRM Deal", name);
    return res.data;
  }

  async function createDeal(data) {
    const res = await api.createDoc("CRM Deal", data);
    return res.data;
  }

  async function updateDeal(name, data) {
    const res = await api.updateDoc("CRM Deal", name, data);
    return res.data;
  }

  async function updateDealStatus(name, status) {
    return updateDeal(name, { status });
  }

  return {
    leads,
    leadsTotal,
    loadingLeads,
    deals,
    dealsTotal,
    loadingDeals,
    fetchLeads,
    fetchLead,
    createLead,
    updateLead,
    convertLeadToDeal,
    fetchDeals,
    fetchAllDealsForKanban,
    fetchDeal,
    createDeal,
    updateDeal,
    updateDealStatus,
  };
});
