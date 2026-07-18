<template>
  <div class="sub-users-page">
    <div class="page-header">
      <div>
        <h1>{{ t("subUserManagement.title") }}</h1>
        <p class="subtitle">{{ t("subUserManagement.subtitle") }}</p>
      </div>
      <button class="btn-primary" type="button" data-tour="sub-invite" @click="openInviteModal">
        <UserPlus :size="16" />
        {{ t("subUserManagement.inviteEmployee") }}
      </button>
    </div>

    <p v-if="loading && !data.users.length" class="state">{{ t("subUserManagement.loading") }}</p>

    <!-- Active users -->
    <section v-if="data.users.length" class="card" data-tour="sub-table">
      <h2>{{ t("subUserManagement.activeEmployees") }} ({{ data.users.length }})</h2>
      <ul class="user-list">
        <li v-for="u in data.users" :key="u.name" class="user-row">
          <div class="u-main">
            <span class="u-name">{{ u.full_name || u.email }}</span>
            <span class="u-email">{{ u.email }}</span>
          </div>
          <div class="u-meta">
            <span v-if="u.tradehub_is_owner" class="owner-badge">{{
              t("subUserManagement.owner")
            }}</span>
            <span class="profile-chip">{{ u.role_profile_name || "—" }}</span>
            <span :class="['status-dot', u.enabled ? 'on' : 'off']" />
            <span class="u-status">{{
              u.enabled
                ? t("subUserManagement.statusActive")
                : t("subUserManagement.statusInactive")
            }}</span>
          </div>
          <div class="u-actions">
            <button
              v-if="!u.tradehub_is_owner && u.enabled"
              type="button"
              class="btn-ghost danger"
              @click="askDeactivate(u)"
            >
              {{ t("subUserManagement.deactivate") }}
            </button>
            <button
              v-else-if="!u.tradehub_is_owner && !u.enabled"
              type="button"
              class="btn-ghost"
              @click="askReactivate(u)"
            >
              {{ t("subUserManagement.activate") }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Pending invites -->
    <section v-if="data.pending_invites.length" class="card">
      <h2>{{ t("subUserManagement.pendingInvites") }} ({{ data.pending_invites.length }})</h2>
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
              {{ t("subUserManagement.cancelInvite") }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <p v-if="!loading && !data.users.length && !data.pending_invites.length" class="state">
      {{ t("subUserManagement.emptyState") }}
    </p>

    <!-- Davet Modal -->
    <div v-if="showInviteModal" class="modal-backdrop" @click.self="closeInviteModal">
      <div class="modal">
        <h3>{{ t("subUserManagement.inviteModalTitle") }}</h3>
        <form @submit.prevent="submitInvite">
          <label class="form-label">{{ t("subUserManagement.fullName") }}</label>
          <input v-model="invite.full_name" type="text" required class="form-input" />

          <label class="form-label">{{ t("subUserManagement.email") }}</label>
          <input v-model="invite.email" type="email" required class="form-input" />

          <label class="form-label">{{ t("subUserManagement.roleProfile") }}</label>
          <select v-model="invite.role_profile" required class="form-input">
            <option value="" disabled>{{ t("subUserManagement.selectOption") }}</option>
            <option v-for="rp in availableRoleProfiles" :key="rp" :value="rp">{{ rp }}</option>
          </select>

          <p v-if="inviteError" class="form-error">{{ inviteError }}</p>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeInviteModal">
              {{ t("subUserManagement.cancel") }}
            </button>
            <button type="submit" class="btn-primary" :disabled="inviteLoading">
              {{
                inviteLoading ? t("subUserManagement.sending") : t("subUserManagement.sendInvite")
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { UserPlus } from "lucide-vue-next";
  import api from "@/utils/api";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: çalışan listesi → davet aksiyonu.
  usePageTour("sub-users", () => [
    {
      target: '[data-tour="sub-table"]',
      title: t("tourSteps.page.subTable_t"),
      desc: t("tourSteps.page.subTable_d"),
    },
    {
      target: '[data-tour="sub-invite"]',
      title: t("tourSteps.page.subInvite_t"),
      desc: t("tourSteps.page.subInvite_d"),
    },
  ]);

  const data = reactive({ users: [], pending_invites: [] });
  const loading = ref(false);

  const showInviteModal = ref(false);
  const inviteLoading = ref(false);
  const inviteError = ref(null);
  const invite = reactive({
    full_name: "",
    email: "",
    role_profile: "",
  });

  // Karar dosyamızın §1.3'üne göre satıcının atayabileceği rol şablonları —
  // backend plan kelepçesi de zaten kontrol ediyor.
  const availableRoleProfiles = ref([
    "Seller Full Access",
    "Seller Co-Owner",
    "Seller Manager",
    "Seller Finance Staff",
    "Seller Operations",
  ]);

  async function reload() {
    loading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.api.v1.seller_users.list_sub_users");
      const payload = res?.message || res || {};
      data.users = payload.users || [];
      data.pending_invites = payload.pending_invites || [];
    } catch (err) {
      window.alert(err.message || t("subUserManagement.loadFailed"));
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
      await api.callMethod("tradehub_core.api.v1.seller_users.invite_sub_user", {
        full_name: invite.full_name,
        email: invite.email,
        role_profile: invite.role_profile,
      });
      closeInviteModal();
      await reload();
    } catch (err) {
      inviteError.value = err.message || t("subUserManagement.inviteFailed");
    } finally {
      inviteLoading.value = false;
    }
  }

  async function askDeactivate(user) {
    const reason = window.prompt(
      t("subUserManagement.deactivatePrompt", { name: user.full_name || user.email })
    );
    if (reason === null) return;
    try {
      await api.callMethod("tradehub_core.api.v1.seller_users.deactivate_sub_user", {
        user: user.name,
        reason,
      });
      await reload();
    } catch (err) {
      window.alert(err.message || t("subUserManagement.deactivateFailed"));
    }
  }

  async function askReactivate(user) {
    if (
      !window.confirm(
        t("subUserManagement.reactivateConfirm", { name: user.full_name || user.email })
      )
    )
      return;
    try {
      await api.callMethod("tradehub_core.api.v1.seller_users.reactivate_sub_user", {
        user: user.name,
      });
      await reload();
    } catch (err) {
      window.alert(err.message || t("subUserManagement.reactivateFailed"));
    }
  }

  async function askRevoke(inv) {
    const reason = window.prompt(t("subUserManagement.revokePrompt", { email: inv.email }));
    if (reason === null) return;
    try {
      await api.callMethod("tradehub_core.api.v1.seller_users.revoke_invite", {
        invite_name: inv.name,
        reason,
      });
      await reload();
    } catch (err) {
      window.alert(err.message || t("subUserManagement.revokeFailed"));
    }
  }

  function formatExpiry(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return t("subUserManagement.expiry", { date: d.toLocaleDateString("tr-TR") });
  }

  onMounted(reload);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .sub-users-page {
    padding: 1.5rem;
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: $l-text-900;
    margin: 0;
    letter-spacing: -0.01em;
    @include dark {
      color: $d-text-max;
    }
  }
  .subtitle {
    color: $l-text-500;
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    max-width: 720px;
    @include dark {
      color: $d-text-muted;
    }
  }

  .state,
  .muted {
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .state {
    padding: 2rem;
    text-align: center;
  }

  // ── Card (Aktif Çalışanlar) ───────────────────────────────
  .card {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    padding: 1.25rem 1.4rem;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .card h2 {
    margin: 0 0 1rem;
    color: $l-text-900;
    font-size: 0.95rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    @include dark {
      color: $d-text-max;
    }
  }

  .user-list,
  .invite-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .user-row,
  .invite-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 1rem;
    padding: 0.85rem 1rem;
    border: 1px solid $l-border-alt;
    border-radius: 10px;
    background: $l-bg-subtle;
    transition: border-color $t-base;

    &:hover {
      border-color: rgba($brand, 0.3);
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border-inner;
      &:hover {
        border-color: rgba($brand-light, 0.35);
      }
    }
  }
  .u-main {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }
  .u-name {
    font-weight: 600;
    color: $l-text-900;
    font-size: 0.95rem;
    @include dark {
      color: $d-text-max;
    }
  }
  .u-email {
    color: $l-text-600;
    font-size: 0.825rem;
    @include dark {
      color: $d-text-hi;
    }
  }
  .u-meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.825rem;
    flex-wrap: wrap;
  }
  .u-actions {
    display: flex;
    gap: 0.4rem;
  }

  .owner-badge {
    background: $c-warning;
    color: #fff;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .profile-chip {
    background: rgba($brand, 0.12);
    color: $brand;
    border: 1px solid rgba($brand, 0.25);
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 500;
    @include dark {
      background: rgba($brand-light, 0.18);
      color: $brand-light;
      border-color: rgba($brand-light, 0.35);
    }
  }
  .status-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
    &.on {
      background: $c-success;
      box-shadow: 0 0 0 3px rgba($c-success, 0.18);
    }
    &.off {
      background: $c-error;
      box-shadow: 0 0 0 3px rgba($c-error, 0.18);
    }
  }
  .u-status {
    color: $l-text-700;
    font-weight: 500;
    @include dark {
      color: $d-text-hi;
    }
  }

  // ── Butonlar — WCAG AA kontrast ───────────────────────────
  .btn-primary,
  .btn-secondary,
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1.1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: background-color $t-base, color $t-base, border-color $t-base, box-shadow $t-base, transform $t-base;
  }
  .btn-primary {
    background: $brand;
    color: #fff;
    box-shadow: 0 1px 2px rgba($brand, 0.2);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, $brand 88%, #000);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba($brand, 0.3);
    }
    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }
  .btn-secondary {
    background: $l-bg;
    color: $l-text-700;
    border: 1px solid $l-border;
    &:hover {
      border-color: $brand;
      color: $brand;
    }

    @include dark {
      background: $d-bg-card;
      color: $d-text-hi;
      border-color: $d-border;
      &:hover {
        border-color: $brand-light;
        color: $brand-light;
      }
    }
  }
  .btn-ghost {
    background: transparent;
    color: $brand;
    border: 1px solid rgba($brand, 0.3);

    &:hover {
      background: rgba($brand, 0.08);
    }

    &.danger {
      color: $c-error;
      border-color: rgba($c-error, 0.3);
      &:hover {
        background: rgba($c-error, 0.08);
      }
    }

    @include dark {
      color: $brand-light;
      border-color: rgba($brand-light, 0.35);
      &:hover {
        background: rgba($brand-light, 0.12);
      }
      &.danger {
        color: $c-error;
        border-color: rgba($c-error, 0.4);
      }
    }
  }

  // ── Modal ─────────────────────────────────────────────────
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
  }
  .modal {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    padding: 1.75rem;
    width: min(520px, 92vw);
    box-shadow: 0 12px 48px rgba(#000, 0.18);

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      box-shadow: 0 12px 48px rgba(#000, 0.5);
    }
  }
  .modal h3 {
    margin: 0 0 1.2rem;
    color: $l-text-900;
    font-size: 1.15rem;
    font-weight: 600;
    @include dark {
      color: $d-text-max;
    }
  }
  .form-label {
    display: block;
    color: $l-text-700;
    font-size: 0.85rem;
    font-weight: 600;
    margin: 1rem 0 0.4rem;
    @include dark {
      color: $d-text-max;
    }
  }
  .form-input {
    width: 100%;
    padding: 0.65rem 0.85rem;
    border: 1px solid $l-border;
    border-radius: 8px;
    font-size: 0.95rem;
    // NOT: shorthand `background` KULLANMA — select.form-input'taki
    // background-image/repeat/position'ı sıfırlayıp ok ikonunu döşüyor.
    background-color: $l-bg;
    color: $l-text-900;
    transition: border-color $t-base, box-shadow $t-base;

    &::placeholder {
      color: $l-text-400;
    }

    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.18);
    }

    @include dark {
      background-color: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-max;
      &::placeholder {
        color: $d-text-faint;
      }
      &:focus {
        border-color: $brand-light;
        box-shadow: 0 0 0 3px rgba($brand-light, 0.22);
      }
    }
  }
  /* Select için extra padding sağ tarafta */
  select.form-input {
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    background-repeat: no-repeat;
    background-position: right 0.9rem center;
    padding-right: 2.4rem;

    @include dark {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%23a78bfa' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    }
  }
  .form-error {
    color: $c-error;
    background: rgba($c-error, 0.08);
    border: 1px solid rgba($c-error, 0.25);
    padding: 0.6rem 0.85rem;
    border-radius: 8px;
    margin-top: 0.85rem;
    font-size: 0.85rem;
    font-weight: 500;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.55rem;
    margin-top: 1.5rem;
  }

  @media (max-width: 600px) {
    // Mobil padding zinciri: page(24) + page-content(16) + card(22) + row(16) ≈ 78px/kenar
    // 320px ekranda içeriğe ~164px kalıyordu; kök padding'i minimuma indirip
    // page-content'in 16px'ini negatif margin ile geri alarak ~31px/kenara düşürüyoruz.
    .sub-users-page {
      padding: 1rem 0.25rem;
      margin: 0 -0.75rem;
    }
    .card {
      padding: 0.75rem;
    }
    .user-row,
    .invite-row {
      grid-template-columns: 1fr;
      gap: 0.5rem;
      padding: 0.7rem;
    }
    .u-actions {
      flex-wrap: wrap;
    }
  }
</style>
