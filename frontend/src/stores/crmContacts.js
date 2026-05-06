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

  // Frappe Contact email/telefonu child table olarak (email_ids, phone_nos)
  // tutar; flat email_id/mobile_no/phone alanları yalnız okuma içindir. Form
  // bu flat alanları bind ediyor — kayıt sırasında child table'a çeviriyoruz.
  function _toContactPayload(form) {
    const payload = { ...form };
    delete payload.email_id;
    delete payload.mobile_no;
    delete payload.phone;

    payload.email_ids = form.email_id
      ? [{ email_id: form.email_id, is_primary: 1 }]
      : [];

    const phones = [];
    if (form.mobile_no) {
      phones.push({ phone: form.mobile_no, is_primary_mobile_no: 1 });
    }
    if (form.phone) {
      phones.push({ phone: form.phone, is_primary_phone: 1 });
    }
    payload.phone_nos = phones;

    return payload;
  }

  // Frappe REST `/api/resource/Contact` PUT'u child table senkronunu güvenilir
  // yapmıyor — child rows ignore'lanıp top-level fields kaydoluyor. Bu yüzden
  // tradehub_core whitelisted endpoint'i kullanılıyor (server-side doc.save).
  async function createContact(data) {
    const res = await api.callMethod("tradehub_core.api.v1.crm_overrides.save_contact", {
      data: _toContactPayload(data),
    });
    return res.message || res;
  }

  async function updateContact(name, data) {
    const res = await api.callMethod("tradehub_core.api.v1.crm_overrides.save_contact", {
      name,
      data: _toContactPayload(data),
    });
    return res.message || res;
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
