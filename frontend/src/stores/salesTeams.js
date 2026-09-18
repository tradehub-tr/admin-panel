/**
 * Satış Ekipleri (saha pazarlama) store — süper admin ekip kurar, lider/üye atar.
 * Backend: tradehub_core.api.v1.sales_team
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";

const M = "tradehub_core.api.v1.sales_team";

export const useSalesTeamsStore = defineStore("salesTeams", () => {
  const teams = ref([]);
  const loading = ref(false);

  async function fetchTeams() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(`${M}.list_sales_teams`);
      teams.value = res.message || [];
    } finally {
      loading.value = false;
    }
  }

  async function searchUsers(q) {
    const res = await api.callMethodGET(`${M}.search_users`, { q, limit: 20 });
    return res.message || [];
  }

  /** payload: { name?, team_name, leader, members: [email], is_active } */
  async function saveTeam(payload) {
    const res = await api.callMethod(`${M}.save_sales_team`, payload);
    return res.message;
  }

  async function deleteTeam(name) {
    await api.callMethod(`${M}.delete_sales_team`, { name });
  }

  return { teams, loading, fetchTeams, searchUsers, saveTeam, deleteTeam };
});
