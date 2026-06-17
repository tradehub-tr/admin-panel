<template>
  <div class="buyer-team-page">
    <div class="page-header">
      <div>
        <h1>{{ t("buyerTeamManagement.title") }}</h1>
        <p class="subtitle">
          {{ t("buyerTeamManagement.subtitle") }}
        </p>
      </div>
    </div>

    <!-- Org seçici (Süper Admin için) -->
    <div class="filter-bar" data-tour="btm-invite">
      <input
        v-model="selectedOrg"
        type="text"
        :placeholder="t('buyerTeamManagement.orgPlaceholder')"
        class="filter-input"
        data-tour="btm-org"
        @keyup.enter="reload"
      />
      <button class="btn-primary" type="button" @click="reload">
        <RefreshCw :size="14" />
        {{ t("buyerTeamManagement.load") }}
      </button>
      <button v-if="selectedOrg" class="btn-secondary" type="button" @click="openInviteModal">
        <UserPlus :size="14" />
        {{ t("buyerTeamManagement.inviteEmployee") }}
      </button>
    </div>

    <p v-if="loading && !data.users.length" class="state">{{ t("buyerTeamManagement.loading") }}</p>
    <p v-else-if="!selectedOrg" class="state">{{ t("buyerTeamManagement.selectOrg") }}</p>

    <!-- Aktif kullanıcılar -->
    <section v-if="data.users.length" class="card" data-tour="btm-table">
      <h2>{{ t("buyerTeamManagement.activeEmployees", { n: data.users.length }) }}</h2>
      <ul class="user-list">
        <li v-for="u in data.users" :key="u.name" class="user-row">
          <div class="u-main">
            <span class="u-name">{{ u.full_name || u.email }}</span>
            <span class="u-email">{{ u.email }}</span>
          </div>
          <div class="u-meta">
            <span class="profile-chip">{{ u.role_profile_name || "—" }}</span>
            <span :class="['status-dot', u.enabled ? 'on' : 'off']" />
            <span class="u-status">{{
              u.enabled ? t("buyerTeamManagement.active") : t("buyerTeamManagement.inactive")
            }}</span>
          </div>
          <div class="u-actions">
            <button
              v-if="u.enabled"
              type="button"
              class="btn-ghost danger"
              @click="askDeactivate(u)"
            >
              {{ t("buyerTeamManagement.deactivate") }}
            </button>
            <button v-else type="button" class="btn-ghost" @click="askReactivate(u)">
              {{ t("buyerTeamManagement.reactivate") }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Pending invites -->
    <section v-if="data.pending_invites.length" class="card">
      <h2>{{ t("buyerTeamManagement.pendingInvites", { n: data.pending_invites.length }) }}</h2>
      <ul class="invite-list">
        <li v-for="inv in data.pending_invites" :key="inv.name" class="invite-row">
          <div class="u-main">
            <span class="u-name">{{ inv.full_name }}</span>
            <span class="u-email">{{ inv.email }}</span>
          </div>
          <div class="u-meta">
            <span class="profile-chip">{{ inv.role_profile }}</span>
            <span class="muted">{{ formatExpiry(inv.expires_at) }}</span>
          </div>
          <div class="u-actions">
            <button type="button" class="btn-ghost danger" @click="askRevoke(inv)">
              {{ t("buyerTeamManagement.cancel") }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <p
      v-if="selectedOrg && !loading && !data.users.length && !data.pending_invites.length"
      class="state"
    >
      {{ t("buyerTeamManagement.noEmployees") }}
    </p>

    <!-- Davet Modal -->
    <div v-if="showInviteModal" class="modal-backdrop" @click.self="closeInviteModal">
      <div class="modal">
        <h3>{{ t("buyerTeamManagement.inviteModalTitle") }}</h3>
        <form @submit.prevent="submitInvite">
          <label class="form-label">{{ t("buyerTeamManagement.fullName") }}</label>
          <input v-model="invite.full_name" type="text" required class="form-input" />

          <label class="form-label">{{ t("buyerTeamManagement.email") }}</label>
          <input v-model="invite.email" type="email" required class="form-input" />

          <label class="form-label">{{ t("buyerTeamManagement.roleProfile") }}</label>
          <select v-model="invite.role_profile" required class="form-input">
            <option value="" disabled>{{ t("buyerTeamManagement.selectOption") }}</option>
            <option v-for="rp in availableRoleProfiles" :key="rp" :value="rp">{{ rp }}</option>
          </select>

          <p v-if="inviteError" class="form-error">{{ inviteError }}</p>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeInviteModal">
              {{ t("buyerTeamManagement.cancelButton") }}
            </button>
            <button type="submit" class="btn-primary" :disabled="inviteLoading">
              {{
                inviteLoading
                  ? t("buyerTeamManagement.sending")
                  : t("buyerTeamManagement.sendInvite")
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive } from "vue";
  import { useI18n } from "vue-i18n";
  import { RefreshCw, UserPlus } from "lucide-vue-next";
  import api from "@/utils/api";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: org seçimi → çalışan listesi → davet/aksiyonlar.
  usePageTour("buyer-team", () => [
    {
      target: '[data-tour="btm-org"]',
      title: t("tourSteps.page.btmOrg_t"),
      desc: t("tourSteps.page.btmOrg_d"),
    },
    {
      target: '[data-tour="btm-table"]',
      title: t("tourSteps.page.btmTable_t"),
      desc: t("tourSteps.page.btmTable_d"),
    },
    {
      target: '[data-tour="btm-invite"]',
      title: t("tourSteps.page.btmInvite_t"),
      desc: t("tourSteps.page.btmInvite_d"),
    },
  ]);

  const data = reactive({ users: [], pending_invites: [] });
  const loading = ref(false);
  const selectedOrg = ref("");

  const showInviteModal = ref(false);
  const inviteLoading = ref(false);
  const inviteError = ref(null);
  const invite = reactive({
    full_name: "",
    email: "",
    role_profile: "",
  });

  // Karar dosyamızdaki buyer rol profilleri
  const availableRoleProfiles = ref([
    "Buyer Full Access",
    "Buyer Operations",
    "Buyer Finance Staff",
    "Buyer Approver L1",
    "Buyer Approver L2",
    "Buyer Viewer Only",
  ]);

  async function reload() {
    if (!selectedOrg.value) return;
    loading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.api.v1.buyer_team.list_buyer_sub_users", {
        organization: selectedOrg.value,
      });
      const payload = res?.message || res || {};
      data.users = payload.users || [];
      data.pending_invites = payload.pending_invites || [];
    } catch (err) {
      window.alert(err.message || t("buyerTeamManagement.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  function openInviteModal() {
    invite.full_name = "";
    invite.email = "";
    invite.role_profile = "";
    inviteError.value = null;
    showInviteModal.value = true;
  }

  function closeInviteModal() {
    showInviteModal.value = false;
  }

  async function submitInvite() {
    if (!invite.full_name || !invite.email || !invite.role_profile) return;
    inviteLoading.value = true;
    inviteError.value = null;
    try {
      await api.callMethod("tradehub_core.api.v1.buyer_team.invite_buyer_sub_user", {
        full_name: invite.full_name,
        email: invite.email,
        role_profile: invite.role_profile,
        organization: selectedOrg.value,
      });
      closeInviteModal();
      await reload();
    } catch (err) {
      inviteError.value = err.message || t("buyerTeamManagement.inviteFailed");
    } finally {
      inviteLoading.value = false;
    }
  }

  async function askDeactivate(user) {
    const reason = window.prompt(
      t("buyerTeamManagement.deactivatePrompt", { name: user.full_name || user.email })
    );
    if (reason === null) return;
    try {
      await api.callMethod("tradehub_core.api.v1.buyer_team.deactivate_buyer_sub_user", {
        user: user.name,
        reason,
      });
      await reload();
    } catch (err) {
      window.alert(err.message || t("buyerTeamManagement.deactivateFailed"));
    }
  }

  async function askReactivate(user) {
    if (
      !window.confirm(
        t("buyerTeamManagement.reactivateConfirm", { name: user.full_name || user.email })
      )
    )
      return;
    try {
      await api.callMethod("tradehub_core.api.v1.buyer_team.reactivate_buyer_sub_user", {
        user: user.name,
      });
      await reload();
    } catch (err) {
      window.alert(err.message || t("buyerTeamManagement.reactivateFailed"));
    }
  }

  async function askRevoke(inv) {
    const reason = window.prompt(t("buyerTeamManagement.revokePrompt", { email: inv.email }));
    if (reason === null) return;
    try {
      await api.callMethod("tradehub_core.api.v1.buyer_team.revoke_buyer_invite", {
        invite_name: inv.name,
        reason,
      });
      await reload();
    } catch (err) {
      window.alert(err.message || t("buyerTeamManagement.revokeFailed"));
    }
  }

  function formatExpiry(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return t("buyerTeamManagement.expiry", { date: d.toLocaleDateString("tr-TR") });
  }
</script>

<style scoped>
  .buyer-team-page {
    padding: 1.5rem;
    max-width: 1100px;
    margin: 0 auto;
  }
  .page-header {
    margin-bottom: 1.5rem;
  }
  h1 {
    font-size: 1.5rem;
    color: #1f2937;
    margin: 0;
  }
  .subtitle {
    color: #6b7280;
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
  }

  .filter-bar {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .filter-input {
    padding: 0.5rem 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    min-width: 280px;
  }

  .state,
  .muted {
    color: #9ca3af;
  }
  .state {
    padding: 2rem;
    text-align: center;
  }

  .card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
  }
  .card h2 {
    margin: 0 0 0.75rem;
    color: #1f2937;
    font-size: 1rem;
  }

  .user-list,
  .invite-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .user-row,
  .invite-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 1rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    margin-bottom: 0.5rem;
  }
  .u-main {
    display: flex;
    flex-direction: column;
  }
  .u-name {
    font-weight: 500;
    color: #1f2937;
  }
  .u-email {
    color: #6b7280;
    font-size: 0.8125rem;
  }
  .u-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
  }
  .u-actions {
    display: flex;
    gap: 0.5rem;
  }

  .profile-chip {
    background: #ede9fe;
    color: #5b21b6;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .status-dot.on {
    background: #10b981;
  }
  .status-dot.off {
    background: #ef4444;
  }
  .u-status {
    color: #6b7280;
  }

  .btn-primary,
  .btn-secondary,
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.8125rem;
    cursor: pointer;
    border: none;
  }
  .btn-primary {
    background: #7c3aed;
    color: #fff;
  }
  .btn-primary:disabled {
    background: #c4b5fd;
    cursor: not-allowed;
  }
  .btn-secondary {
    background: #fff;
    color: #6b7280;
    border: 1px solid #d1d5db;
  }
  .btn-ghost {
    background: transparent;
    color: #6366f1;
    border: 1px solid #c7d2fe;
  }
  .btn-ghost.danger {
    color: #dc2626;
    border-color: #fecaca;
  }
  .btn-ghost.danger:hover {
    background: #fef2f2;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: #fff;
    border-radius: 8px;
    padding: 1.5rem;
    width: 90%;
    max-width: 480px;
  }
  .modal h3 {
    margin: 0 0 1rem;
    color: #1f2937;
  }
  .form-label {
    display: block;
    color: #374151;
    font-size: 0.8125rem;
    font-weight: 500;
    margin: 0.75rem 0 0.25rem;
  }
  .form-input {
    width: 100%;
    padding: 0.5rem 0.625rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
  }
  .form-error {
    color: #dc2626;
    background: #fef2f2;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    margin-top: 0.75rem;
    font-size: 0.8125rem;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
