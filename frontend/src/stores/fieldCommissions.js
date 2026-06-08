/**
 * Field Commission (Saha Pazarlama Hakediş) store.
 * Saha elemanı kendi hakedişlerini görür; super admin tümünü yönetir.
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";

const M = "tradehub_core.api.v1.field_commission";

export const useFieldCommissionsStore = defineStore("fieldCommissions", () => {
  const rows = ref([]);
  const total = ref(0);
  const summary = ref({});
  const loading = ref(false);

  async function fetchMine({ status = null, page = 1, pageSize = 50 } = {}) {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${M}.get_my_commissions`, {
        status,
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      });
      const data = res.message || {};
      rows.value = data.rows || [];
      total.value = data.total || 0;
      summary.value = data.summary || {};
    } finally {
      loading.value = false;
    }
  }

  async function fetchAll({
    agent = null,
    status = null,
    plan = null,
    page = 1,
    pageSize = 50,
  } = {}) {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${M}.list_commissions`, {
        agent,
        status,
        plan,
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      });
      const data = res.message || {};
      rows.value = data.rows || [];
      total.value = data.total || 0;
      summary.value = data.summary || {};
    } finally {
      loading.value = false;
    }
  }

  async function approve(name) {
    await api.callMethod(`${M}.approve_commission`, { name });
  }
  async function reject(name, note) {
    await api.callMethod(`${M}.reject_commission`, { name, note });
  }
  async function markPaid(name) {
    await api.callMethod(`${M}.mark_paid`, { name });
  }

  async function fetchTeam({ status = null, agent = null, page = 1, pageSize = 50 } = {}) {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${M}.get_team_commissions`, {
        status,
        agent,
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
      });
      const data = res.message || {};
      rows.value = data.rows || [];
      total.value = data.total || 0;
      summary.value = data.summary || {};
    } finally {
      loading.value = false;
    }
  }

  async function leaderApprove(name) {
    await api.callMethod(`${M}.leader_approve`, { name });
  }
  async function leaderReject(name, note) {
    await api.callMethod(`${M}.leader_reject`, { name, note });
  }

  const settings = ref({ quota_period: "Aylık" });

  async function fetchSettings() {
    const res = await api.callMethodGET(`${M}.get_settings`);
    settings.value = res.message || { quota_period: "Aylık" };
  }

  async function saveSettings(payload) {
    const res = await api.callMethod(`${M}.update_settings`, payload);
    settings.value = { ...settings.value, ...(res.message || {}) };
  }

  return {
    rows,
    total,
    summary,
    loading,
    fetchMine,
    fetchAll,
    approve,
    reject,
    markPaid,
    fetchTeam,
    leaderApprove,
    leaderReject,
    settings,
    fetchSettings,
    saveSettings,
  };
});
