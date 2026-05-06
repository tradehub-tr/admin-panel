/**
 * CRM Meta Store — durumlar, kaynaklar, kullanicilar, kurumlar, filtrelenebilir alanlar
 *
 * Bu store CACHE amacli — uygulama basladiginda bir kere cekilir, sonra yeniden.
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";

export const useCrmMetaStore = defineStore("crmMeta", () => {
  const users = ref([]);
  const organizations = ref([]);
  const leadStatuses = ref([]);
  const dealStatuses = ref([]);
  const leadSources = ref([]);
  const industries = ref([]);
  const territories = ref([]);
  const lostReasons = ref([]);
  const communicationStatuses = ref([]);
  const sessionFlags = ref({});
  const loaded = ref(false);

  async function loadAll() {
    if (loaded.value) return;
    await Promise.all([
      loadLeadStatuses(),
      loadDealStatuses(),
      loadLeadSources(),
      loadIndustries(),
      loadTerritories(),
      loadLostReasons(),
      loadCommunicationStatuses(),
      loadUsers(),
      loadOrganizations(),
    ]);
    loaded.value = true;
  }

  async function loadLeadStatuses() {
    try {
      const res = await api.getList("CRM Lead Status", {
        fields: ["name", "lead_status", "color", "position"],
        order_by: "position asc",
        limit_page_length: 100,
      });
      leadStatuses.value = res.data || [];
    } catch {
      leadStatuses.value = [];
    }
  }

  async function loadDealStatuses() {
    try {
      const res = await api.getList("CRM Deal Status", {
        fields: ["name", "deal_status", "color", "position"],
        order_by: "position asc",
        limit_page_length: 100,
      });
      dealStatuses.value = res.data || [];
    } catch {
      dealStatuses.value = [];
    }
  }

  async function loadLeadSources() {
    try {
      const res = await api.getList("CRM Lead Source", {
        fields: ["name", "lead_source"],
        limit_page_length: 100,
      });
      leadSources.value = res.data || [];
    } catch {
      leadSources.value = [];
    }
  }

  async function loadIndustries() {
    try {
      const res = await api.getList("CRM Industry", {
        fields: ["name", "industry"],
        limit_page_length: 200,
      });
      industries.value = res.data || [];
    } catch {
      industries.value = [];
    }
  }

  async function loadTerritories() {
    try {
      const res = await api.getList("CRM Territory", {
        fields: ["name", "territory_name"],
        limit_page_length: 200,
      });
      territories.value = res.data || [];
    } catch {
      territories.value = [];
    }
  }

  async function loadLostReasons() {
    try {
      const res = await api.getList("CRM Lost Reason", {
        fields: ["name", "lost_reason"],
        limit_page_length: 100,
      });
      lostReasons.value = res.data || [];
    } catch {
      lostReasons.value = [];
    }
  }

  async function loadCommunicationStatuses() {
    try {
      const res = await api.getList("CRM Communication Status", {
        fields: ["name", "status"],
        limit_page_length: 100,
      });
      communicationStatuses.value = res.data || [];
    } catch {
      communicationStatuses.value = [];
    }
  }

  async function loadUsers() {
    try {
      const res = await api.callMethod("crm.api.session.get_users");
      users.value = res.message || [];
    } catch {
      try {
        const res = await api.getList("User", {
          fields: ["name", "email", "full_name", "user_image", "enabled"],
          filters: [["enabled", "=", 1]],
          limit_page_length: 200,
        });
        users.value = res.data || [];
      } catch {
        users.value = [];
      }
    }
  }

  async function loadOrganizations() {
    try {
      const res = await api.callMethod("crm.api.session.get_organizations");
      organizations.value = res.message || [];
    } catch {
      // Frappe CRM endpoint yoksa standart resource list'inden çek;
      // permission_query_conditions zaten seller scope'ını uyguluyor.
      try {
        const res = await api.getList("CRM Organization", {
          fields: ["name", "organization_name", "industry", "territory"],
          order_by: "modified desc",
          limit_page_length: 500,
        });
        organizations.value = res.data || [];
      } catch {
        organizations.value = [];
      }
    }
  }

  async function loadSessionFlags() {
    try {
      const res = await api.callMethod("crm.api.session.get_session_role_flags");
      sessionFlags.value = res.message || {};
    } catch {
      sessionFlags.value = {};
    }
  }

  async function getFilterableFields(doctype) {
    try {
      const res = await api.callMethod("crm.api.doc.get_filterable_fields", { doctype });
      return res.message || [];
    } catch {
      return [];
    }
  }

  async function getQuickFilters(doctype) {
    try {
      const res = await api.callMethod("crm.api.doc.get_quick_filters", { doctype });
      return res.message || [];
    } catch {
      return [];
    }
  }

  async function getSortOptions(doctype) {
    try {
      const res = await api.callMethod("crm.api.doc.sort_options", { doctype });
      return res.message || [];
    } catch {
      return [];
    }
  }

  function userByEmail(email) {
    return users.value.find((u) => u.email === email || u.name === email) || null;
  }

  function invalidate() {
    loaded.value = false;
  }

  return {
    users,
    organizations,
    leadStatuses,
    dealStatuses,
    leadSources,
    industries,
    territories,
    lostReasons,
    communicationStatuses,
    sessionFlags,
    loaded,
    loadAll,
    loadLeadStatuses,
    loadDealStatuses,
    loadLeadSources,
    loadIndustries,
    loadTerritories,
    loadLostReasons,
    loadCommunicationStatuses,
    loadUsers,
    loadOrganizations,
    loadSessionFlags,
    getFilterableFields,
    getQuickFilters,
    getSortOptions,
    userByEmail,
    invalidate,
  };
});
