/**
 * Satış Ekibi formu — saf yardımcılar (Vue'dan bağımsız, node --test ile sınanır).
 * Form durumu: { name, team_name, leader, members: [{agent, full_name}], is_active }
 */

export function emptyTeamForm() {
  return { name: null, team_name: "", leader: "", leader_name: "", members: [], is_active: 1 };
}

export function formFromTeam(team) {
  if (!team) return emptyTeamForm();
  return {
    name: team.name || null,
    team_name: team.team_name || team.name || "",
    leader: team.leader || "",
    leader_name: team.leader_name || team.leader || "",
    members: (team.members || []).map((m) => ({
      agent: m.agent,
      full_name: m.full_name || m.agent,
    })),
    is_active: team.is_active ? 1 : 0,
  };
}

/** Üye ekle — aynı kullanıcı iki kez eklenmez, yeni dizi döner. */
export function addMember(members, user) {
  const agent = typeof user === "string" ? user : user?.name || user?.agent;
  if (!agent) return members;
  if (members.some((m) => m.agent === agent)) return members;
  const full_name = (typeof user === "object" && (user.full_name || user.agent)) || agent;
  return [...members, { agent, full_name }];
}

export function removeMember(members, agent) {
  return members.filter((m) => m.agent !== agent);
}

/** Doğrulama — hata mesajı listesi (boşsa geçerli). */
export function validateTeamForm(form) {
  const errors = [];
  if (!String(form.team_name || "").trim()) errors.push("Ekip adı zorunlu.");
  if (!String(form.leader || "").trim()) errors.push("Ekip lideri seçin.");
  return errors;
}

/** Backend `save_sales_team` gövdesi. Lider üye listesinde de olsa çıkarılmaz; backend kabul eder. */
export function toPayload(form) {
  return {
    name: form.name || null,
    team_name: String(form.team_name || "").trim(),
    leader: String(form.leader || "").trim(),
    members: (form.members || []).map((m) => m.agent),
    is_active: form.is_active ? 1 : 0,
  };
}
