/**
 * CRM Contacts Store — Frappe Contact (CRM override)
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";

const CONTACT_FIELDS = [
  "name",
  "first_name",
  "last_name",
  "full_name",
  "email_id",
  "mobile_no",
  "phone",
  "company_name",
  "designation",
  "salutation",
  "gender",
  "image",
  "modified",
  "creation",
];

export const useCrmContactStore = defineStore("crmContacts", () => {
  const contacts = ref([]);
  const total = ref(0);
  const loading = ref(false);

  async function fetchContacts({
    page = 1,
    pageSize = 30,
    filters = [],
    orFilters,
    orderBy = "modified desc",
  } = {}) {
    loading.value = true;
    try {
      const params = {
        fields: CONTACT_FIELDS,
        filters,
        order_by: orderBy,
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      };
      if (orFilters) params["or_filters"] = orFilters;
      const [listRes, countRes] = await Promise.all([
        api.getList("Contact", params),
        api.getCount("Contact", filters),
      ]);
      contacts.value = listRes.data || [];
      total.value = countRes.message || 0;
    } finally {
      loading.value = false;
    }
  }

  async function fetchContact(name) {
    const res = await api.getDoc("Contact", name);
    return res.data;
  }

  async function createContact(data) {
    // CRM ozel create endpoint
    try {
      const res = await api.callMethod("crm.api.contact.create_new", data);
      return res.message || res;
    } catch {
      const res = await api.createDoc("Contact", data);
      return res.data;
    }
  }

  async function updateContact(name, data) {
    const res = await api.updateDoc("Contact", name, data);
    return res.data;
  }

  async function getLinkedDeals(contactName) {
    try {
      const res = await api.callMethod("crm.api.contact.get_linked_deals", {
        contact: contactName,
      });
      return res.message || [];
    } catch {
      return [];
    }
  }

  async function setAsPrimary(contactName, field /* 'email' | 'mobile' */, value) {
    return await api.callMethod("crm.api.contact.set_as_primary", {
      contact: contactName,
      field,
      value,
    });
  }

  async function searchEmails(query) {
    try {
      const res = await api.callMethod("crm.api.contact.search_emails", { query });
      return res.message || [];
    } catch {
      return [];
    }
  }

  return {
    contacts,
    total,
    loading,
    fetchContacts,
    fetchContact,
    createContact,
    updateContact,
    getLinkedDeals,
    setAsPrimary,
    searchEmails,
  };
});
