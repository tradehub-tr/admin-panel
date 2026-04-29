/**
 * Helpdesk Store — HD Ticket (headless) + Frappe Helpdesk standart akış.
 *
 * frappe/helpdesk app'i kurulu (UI kapalı: nginx 404). Bu store Frappe'nin
 * standart method RPC'leriyle konuşur — tüm akış Frappe'nin içinde:
 *   - assign_agent            → ajan atama
 *   - new_comment             → internal (agent arası) yorum
 *   - reply_via_agent         → müşteriye resmi yanıt (e-posta dahil)
 *   - status / priority       → REST resource update
 *   - Communication timeline  → /api/resource/Communication
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";

const TICKET_FIELDS = [
  "name",
  "subject",
  "description",
  "status",
  "priority",
  "ticket_type",
  "raised_by",
  "customer",
  "contact",
  "agent_group",
  "resolution_by",
  "first_responded_on",
  "resolution_date",
  "_assign",
  "modified",
  "creation",
  // Marketplace Link alanları (custom fields)
  "related_order",
  "related_rfq",
  "related_listing",
];

const STATUS_LIST = ["Open", "Replied", "Resolved", "Closed"];
const PRIORITY_LIST = ["Low", "Medium", "High", "Urgent"];

export const useHelpdeskStore = defineStore("helpdesk", () => {
  const tickets = ref([]);
  const ticketsTotal = ref(0);
  const loadingTickets = ref(false);

  const agents = ref([]); // [{ name, agent_name, user }]
  const teams = ref([]); // [{ name }]

  // ─── List ─────────────────────────────────────────────────
  async function fetchTickets({
    page = 1,
    pageSize = 20,
    filters = [],
    orderBy = "modified desc",
  } = {}) {
    loadingTickets.value = true;
    try {
      const [listRes, countRes] = await Promise.all([
        api.getList("HD Ticket", {
          fields: TICKET_FIELDS,
          filters,
          order_by: orderBy,
          limit_start: (page - 1) * pageSize,
          limit_page_length: pageSize,
        }),
        api.getCount("HD Ticket", filters),
      ]);
      tickets.value = listRes.data || [];
      ticketsTotal.value = countRes.message || 0;
    } finally {
      loadingTickets.value = false;
    }
  }

  async function fetchTicket(name) {
    const res = await api.getDoc("HD Ticket", name);
    return res.data;
  }

  // ─── Update (status/priority/type/agent_group) ────────────
  async function updateTicket(name, data) {
    const res = await api.updateDoc("HD Ticket", name, data);
    return res.data;
  }

  async function setStatus(name, status) {
    return updateTicket(name, { status });
  }

  async function setPriority(name, priority) {
    return updateTicket(name, { priority });
  }

  async function setAgentGroup(name, agent_group) {
    return updateTicket(name, { agent_group });
  }

  // ─── Agent atama — Frappe'nin standart assign endpoint'i ──
  async function assignAgent(name, agent_id) {
    return api.callMethod("frappe.desk.form.assign_to.add", {
      assign_to: JSON.stringify([agent_id]),
      doctype: "HD Ticket",
      name,
    });
  }

  // ─── Timeline: Communication + HD Ticket Comment ─────────
  // Agent/admin user'ın Communication doctype'ına direkt read yetkisi
  // olmayabilir — backend wrapper HD Ticket permission kontrolü sonrası
  // ignore_permissions ile döndürüyor.
  async function fetchCommunications(ticketName) {
    const res = await api.callMethod("tradehub_core.api.public.get_ticket_communications", {
      ticket: ticketName,
    });
    const list = res?.message || res || [];
    return (Array.isArray(list) ? list : []).map((c) => ({ ...c, kind: "comm" }));
  }

  async function fetchComments(ticketName) {
    const res = await api.getList("HD Ticket Comment", {
      fields: ["name", "commented_by", "content", "creation"],
      filters: [["reference_ticket", "=", ticketName]],
      order_by: "creation asc",
      limit_page_length: 200,
    });
    return (res.data || []).map((c) => ({ ...c, kind: "comment" }));
  }

  /** Ticket'a bagli dosyalari listele (agent/admin perspektifi). */
  async function fetchAttachments(ticketName) {
    const res = await api.callMethod("tradehub_core.api.public.list_ticket_attachments", {
      ticket: ticketName,
    });
    const list = res?.message || res || [];
    return Array.isArray(list) ? list : [];
  }

  /** Agent → müşteriye yanıt (headless wrapper — e-posta göndermez,
   * Communication oluşturur; müşteri RC üzerinden görür). */
  async function replyViaAgent(ticketName, message) {
    return api.callMethod("tradehub_core.api.public.agent_reply_ticket", {
      ticket: ticketName,
      content: message,
    });
  }

  /** Agent → internal yorum (yalnız ajanlar görür). */
  async function newComment(ticketName, content) {
    return api.callMethod(`frappe.handler.run_doc_method`, {
      dt: "HD Ticket",
      dn: ticketName,
      method: "new_comment",
      args: JSON.stringify({ content }),
    });
  }

  // ─── KPI özet (gömülü Helpdesk dashboard için) ────────────
  const kpis = ref({
    open: 0, // status=Open
    replied: 0, // status=Replied
    mine_open: 0, // bana atanmış + Open
    resolved_week: 0, // son 7 gün içinde Resolved'a geçti
    loading: false,
  });

  async function fetchKpis() {
    kpis.value.loading = true;
    try {
      // Permission-aware backend wrapper kullanılıyor: satıcı kendi
      // team'inin ticket'larını sayar, platform Support Manager hepsini.
      // (frappe.client.get_count permission query'sini honor etmiyor —
      //  yanlış sayı döndürüyordu.)
      const res = await api.callMethod(
        "tradehub_core.api.public.helpdesk_dashboard_kpis"
      );
      const data = res?.message || {};
      kpis.value.open = data.open || 0;
      kpis.value.replied = data.replied || 0;
      kpis.value.mine_open = data.mine_open || 0;
      kpis.value.resolved_week = data.resolved_week || 0;
    } catch (e) {
      console.warn("[helpdesk] fetchKpis failed", e);
    } finally {
      kpis.value.loading = false;
    }
  }

  // ─── Agent / Team listeleri ──────────────────────────────
  async function fetchAgents() {
    if (agents.value.length) return agents.value;
    const res = await api.getList("HD Agent", {
      fields: ["name", "agent_name", "user", "is_active"],
      filters: [["is_active", "=", 1]],
      limit_page_length: 200,
    });
    agents.value = res.data || [];
    return agents.value;
  }

  async function fetchTeams() {
    if (teams.value.length) return teams.value;
    const res = await api.getList("HD Team", {
      fields: ["name", "team_name"],
      limit_page_length: 200,
    });
    teams.value = res.data || [];
    return teams.value;
  }

  // ─── Canned Responses (composer "şablon ekle" dropdown) ──
  const cannedResponses = ref([]);

  async function fetchCannedResponses(force = false) {
    if (!force && cannedResponses.value.length) return cannedResponses.value;
    try {
      const res = await api.callMethod("tradehub_core.api.canned_response.list_for_user", {});
      cannedResponses.value = res?.message || [];
    } catch {
      cannedResponses.value = [];
    }
    return cannedResponses.value;
  }

  async function renderCannedResponse(name, ticketName) {
    const res = await api.callMethod("tradehub_core.api.canned_response.render", {
      canned_response: name,
      ticket: ticketName || "",
    });
    return res?.message || { title: "", content: "" };
  }

  return {
    // state
    tickets,
    ticketsTotal,
    loadingTickets,
    agents,
    teams,
    kpis,
    // constants
    STATUS_LIST,
    PRIORITY_LIST,
    // actions
    fetchTickets,
    fetchTicket,
    updateTicket,
    setStatus,
    setPriority,
    setAgentGroup,
    assignAgent,
    fetchCommunications,
    fetchComments,
    fetchAttachments,
    replyViaAgent,
    newComment,
    fetchAgents,
    fetchTeams,
    fetchKpis,
    cannedResponses,
    fetchCannedResponses,
    renderCannedResponse,
  };
});
