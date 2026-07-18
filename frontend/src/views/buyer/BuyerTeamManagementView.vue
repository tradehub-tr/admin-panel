<template>
  <div class="buyer-team-page">
    <!-- Boş durum: henüz organizasyon yüklenmedi -->
    <template v-if="!loadedOrg">
      <div class="page-header">
        <h1>{{ t("buyerTeamManagement.title") }}</h1>
        <p class="subtitle">{{ t("buyerTeamManagement.subtitle") }}</p>
      </div>

      <form class="org-search" data-tour="btm-invite" @submit.prevent="reload">
        <div class="org-search__field" data-tour="btm-org">
          <Search :size="15" class="org-search__icon" />
          <input
            v-model="selectedOrg"
            type="text"
            :placeholder="t('buyerTeamManagement.orgPlaceholder')"
            class="org-search__input"
            enterkeyhint="go"
          />
        </div>
        <button class="btn-primary" type="submit">{{ t("buyerTeamManagement.load") }}</button>
      </form>

      <p v-if="loading" class="state">{{ t("buyerTeamManagement.loading") }}</p>

      <div v-else-if="recentOrgs.length" class="recent">
        <h2 class="section-label">{{ t("buyerTeamManagement.recentOrgs") }}</h2>
        <button
          v-for="org in recentOrgs"
          :key="org"
          type="button"
          class="recent__row"
          @click="pickOrg(org)"
        >
          <Building2 :size="16" class="recent__icon" />
          <span class="recent__name">{{ org }}</span>
          <ChevronRight :size="14" class="recent__chev" />
        </button>
      </div>

      <div v-else class="empty">
        <div class="empty__icon"><Users :size="24" /></div>
        <p class="empty__text">{{ t("buyerTeamManagement.selectOrg") }}</p>
      </div>
    </template>

    <!-- Dolu durum: org chip + segment + üye kartları -->
    <template v-else>
      <div class="org-chip" data-tour="btm-org">
        <Building2 :size="17" class="org-chip__icon" />
        <div class="org-chip__info">
          <strong>{{ loadedOrg }}</strong>
          <small>{{
            t("buyerTeamManagement.orgSummary", {
              users: data.users.length,
              invites: data.pending_invites.length,
            })
          }}</small>
        </div>
        <button
          type="button"
          class="org-chip__clear"
          :aria-label="t('buyerTeamManagement.clearOrg')"
          :title="t('buyerTeamManagement.clearOrg')"
          @click="clearOrg"
        >
          <X :size="15" />
        </button>
        <button
          class="btn-primary org-chip__invite"
          type="button"
          data-tour="btm-invite"
          @click="openInviteModal"
        >
          <UserPlus :size="14" />
          {{ t("buyerTeamManagement.inviteEmployee") }}
        </button>
      </div>

      <div class="seg" role="tablist">
        <button
          v-for="s in segments"
          :key="s.key"
          type="button"
          role="tab"
          :aria-selected="tab === s.key"
          :class="['seg__btn', { on: tab === s.key }]"
          @click="setTab(s.key)"
        >
          {{ s.label }} <span class="seg__count">{{ s.count }}</span>
        </button>
      </div>

      <p v-if="loading" class="state">{{ t("buyerTeamManagement.loading") }}</p>

      <template v-else>
        <ul v-if="visibleRows.length" class="member-list" data-tour="btm-table">
          <li v-for="row in visibleRows" :key="row.key" class="member-card">
            <span :class="['avatar', avatarClass(row.title)]">{{ initials(row.title) }}</span>
            <div class="member-card__info">
              <span class="member-card__name">{{ row.title }}</span>
              <span class="member-card__email">{{ row.email }}</span>
              <span class="member-card__tags">
                <span :class="['role-chip', { muted: row.kind === 'passive' }]">{{
                  row.role
                }}</span>
                <span v-if="row.expiry" class="member-card__expiry">{{
                  formatExpiry(row.expiry)
                }}</span>
              </span>
            </div>
            <div class="member-card__menu">
              <button
                type="button"
                class="menu-btn"
                :aria-label="t('buyerTeamManagement.rowActions')"
                @click="toggleMenu(row.key)"
              >
                <MoreVertical :size="17" />
              </button>
              <div v-if="menuFor === row.key" class="menu-pop">
                <button
                  v-if="row.kind === 'active'"
                  type="button"
                  class="menu-pop__item danger"
                  @click="runAction(askDeactivate, row.raw)"
                >
                  {{ t("buyerTeamManagement.deactivate") }}
                </button>
                <button
                  v-else-if="row.kind === 'passive'"
                  type="button"
                  class="menu-pop__item"
                  @click="runAction(askReactivate, row.raw)"
                >
                  {{ t("buyerTeamManagement.reactivate") }}
                </button>
                <button
                  v-else
                  type="button"
                  class="menu-pop__item danger"
                  @click="runAction(askRevoke, row.raw)"
                >
                  {{ t("buyerTeamManagement.cancel") }}
                </button>
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="state">
          {{
            data.users.length || data.pending_invites.length
              ? t("buyerTeamManagement.tabEmpty")
              : t("buyerTeamManagement.noEmployees")
          }}
        </p>
      </template>

      <!-- Menü açıkken dış tıklamayı yakalar -->
      <div v-if="menuFor" class="menu-backdrop" @click="menuFor = null" />

      <!-- Mobil: tab bar üstü sabit davet çubuğu -->
      <div class="mobile-invite-bar">
        <button class="btn-primary mobile-invite-bar__btn" type="button" @click="openInviteModal">
          <UserPlus :size="15" />
          {{ t("buyerTeamManagement.inviteEmployee") }}
        </button>
      </div>
    </template>

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
  import { ref, reactive, computed } from "vue";
  import { useI18n } from "vue-i18n";
  import {
    Building2,
    ChevronRight,
    MoreVertical,
    Search,
    UserPlus,
    Users,
    X,
  } from "lucide-vue-next";
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
  const loadedOrg = ref("");
  const tab = ref("active");
  const menuFor = ref(null);

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

  // Son yüklenen organizasyonlar — boş durumda hızlı erişim
  const RECENT_KEY = "btm-recent-orgs";
  const recentOrgs = ref([]);
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    if (Array.isArray(stored)) recentOrgs.value = stored.filter((o) => typeof o === "string");
  } catch {
    recentOrgs.value = [];
  }

  function addRecent(org) {
    recentOrgs.value = [org, ...recentOrgs.value.filter((o) => o !== org)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentOrgs.value));
  }

  const segments = computed(() => [
    {
      key: "active",
      label: t("buyerTeamManagement.active"),
      count: data.users.filter((u) => u.enabled).length,
    },
    {
      key: "passive",
      label: t("buyerTeamManagement.inactive"),
      count: data.users.filter((u) => !u.enabled).length,
    },
    {
      key: "invites",
      label: t("buyerTeamManagement.invitesTab"),
      count: data.pending_invites.length,
    },
  ]);

  const visibleRows = computed(() => {
    if (tab.value === "invites")
      return data.pending_invites.map((inv) => ({
        key: inv.name,
        title: inv.full_name || inv.email,
        email: inv.email,
        role: inv.role_profile || "—",
        expiry: inv.expires_at,
        kind: "invite",
        raw: inv,
      }));
    const wantEnabled = tab.value === "active";
    return data.users
      .filter((u) => !!u.enabled === wantEnabled)
      .map((u) => ({
        key: u.name,
        title: u.full_name || u.email,
        email: u.email,
        role: u.role_profile_name || "—",
        expiry: null,
        kind: wantEnabled ? "active" : "passive",
        raw: u,
      }));
  });

  function setTab(key) {
    tab.value = key;
    menuFor.value = null;
  }

  function toggleMenu(key) {
    menuFor.value = menuFor.value === key ? null : key;
  }

  async function runAction(fn, raw) {
    menuFor.value = null;
    await fn(raw);
  }

  function initials(title) {
    const parts = String(title).trim().split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
  }

  function avatarClass(title) {
    const sum = [...String(title)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return `avatar--${sum % 4}`;
  }

  function pickOrg(org) {
    selectedOrg.value = org;
    reload();
  }

  function clearOrg() {
    loadedOrg.value = "";
    selectedOrg.value = "";
    data.users = [];
    data.pending_invites = [];
    tab.value = "active";
    menuFor.value = null;
  }

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
      loadedOrg.value = selectedOrg.value;
      addRecent(selectedOrg.value);
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

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "sass:color";

  .buyer-team-page {
    padding: 1.5rem;
    max-width: 680px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 14px;

    h1 {
      font-size: 20px;
      letter-spacing: -0.01em;
      color: $l-text-900;
      margin: 0;

      @include dark {
        color: $d-text-max;
      }
    }

    .subtitle {
      color: $l-text-500;
      margin: 4px 0 0;
      font-size: 12.5px;
      line-height: 1.5;

      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .state {
    color: $l-text-400;
    padding: 2rem 1rem;
    text-align: center;
    font-size: 13.5px;

    @include dark {
      color: $d-text-faint;
    }
  }

  // ── Org arama (boş durum) ──────────────────────────────────
  .org-search {
    display: flex;
    gap: 8px;
  }

  .org-search__field {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 8px;

    &:focus-within {
      border-color: $brand;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;

      &:focus-within {
        border-color: $brand;
      }
    }
  }

  .org-search__icon {
    color: $l-text-400;
    flex-shrink: 0;

    @include dark {
      color: $d-text-faint;
    }
  }

  .org-search__input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    padding: 9px 0;
    font-size: 13.5px;
    color: $l-text-900;

    &::placeholder {
      color: $l-text-400;
    }

    @include dark {
      color: $d-text;

      &::placeholder {
        color: $d-text-faint;
      }
    }
  }

  // ── Son görüntülenenler ────────────────────────────────────
  .section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: $l-text-400;
    margin: 20px 2px 8px;

    @include dark {
      color: $d-text-faint;
    }
  }

  .recent__row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    margin-bottom: 8px;
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 10px;
    font-size: 13px;
    color: $l-text-700;
    cursor: pointer;
    text-align: start;
    transition: background $t-fast;

    &:hover {
      background: $l-bg-subtle;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;

      &:hover {
        background: $d-bg-hover;
      }
    }
  }

  .recent__icon,
  .recent__chev {
    color: $l-text-400;
    flex-shrink: 0;

    @include dark {
      color: $d-text-faint;
    }
  }

  .recent__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recent__chev {
    [dir="rtl"] & {
      transform: scaleX(-1);
    }
  }

  // ── Boş durum ──────────────────────────────────────────────
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 56px 24px;
    text-align: center;
  }

  .empty__icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $l-bg-muted;
    color: $l-text-400;

    @include dark {
      background: $d-bg-card;
      color: $d-text-faint;
    }
  }

  .empty__text {
    font-size: 13px;
    color: $l-text-500;
    line-height: 1.5;
    margin: 0;

    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Org chip (dolu durum) ──────────────────────────────────
  .org-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: $l-bg;
    border: 1px solid rgba($brand, 0.45);
    border-radius: 10px;

    @include dark {
      background: $d-bg-card;
      border-color: rgba($brand, 0.35);
    }
  }

  .org-chip__icon {
    color: $brand;
    flex-shrink: 0;
  }

  .org-chip__info {
    min-width: 0;
    flex: 1;

    strong {
      display: block;
      font-size: 13.5px;
      font-weight: 600;
      color: $l-text-900;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      @include dark {
        color: $d-text-max;
      }
    }

    small {
      display: block;
      margin-top: 1px;
      font-size: 11px;
      color: $l-text-500;

      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .org-chip__clear {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: $l-text-400;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background: $l-bg-muted;
      color: $l-text-700;
    }

    @include dark {
      color: $d-text-faint;

      &:hover {
        background: $d-bg-hover;
        color: $d-text;
      }
    }
  }

  // ── Segment kontrol ────────────────────────────────────────
  .seg {
    display: flex;
    padding: 3px;
    margin-top: 12px;
    background: $l-bg-muted;
    border: 1px solid $l-border-alt;
    border-radius: 10px;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .seg__btn {
    flex: 1;
    padding: 7px 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-size: 12.5px;
    font-weight: 600;
    color: $l-text-500;
    cursor: pointer;
    transition: background $t-fast;

    &.on {
      background: $l-bg;
      color: $l-text-900;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }

    @include dark {
      color: $d-text-muted;

      &.on {
        background: $d-bg-elevated;
        color: $d-text-max;
        box-shadow: inset 0 0 0 1px $d-border;
      }
    }
  }

  .seg__count {
    font-size: 11px;
    font-weight: 700;
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }

  .seg__btn.on .seg__count {
    color: color.adjust($brand, $lightness: -12%);

    @include dark {
      color: $brand;
    }
  }

  // ── Üye kartları ───────────────────────────────────────────
  .member-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .member-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px;
    margin-top: 10px;
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12.5px;
    font-weight: 700;
    flex-shrink: 0;
    align-self: flex-start;

    &--0 {
      background: rgba($c-info, 0.14);
      color: color.adjust($c-info, $lightness: -8%);
    }

    &--1 {
      background: rgba($c-success, 0.14);
      color: color.adjust($c-success, $lightness: -8%);
    }

    &--2 {
      background: rgba($brand, 0.16);
      color: color.adjust($brand, $lightness: -22%);
    }

    &--3 {
      background: rgba(#8b5cf6, 0.14);
      color: color.adjust(#8b5cf6, $lightness: -8%);
    }

    @include dark {
      &--0 {
        color: #7fb2ff;
      }

      &--1 {
        color: #4ade9f;
      }

      &--2 {
        color: $brand-light;
      }

      &--3 {
        color: #b8a4ff;
      }
    }
  }

  .member-card__info {
    min-width: 0;
    flex: 1;
  }

  .member-card__name {
    display: block;
    font-size: 13.5px;
    font-weight: 600;
    color: $l-text-900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include dark {
      color: $d-text;
    }
  }

  .member-card__email {
    display: block;
    margin-top: 1px;
    font-size: 11.5px;
    color: $l-text-500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include dark {
      color: $d-text-muted;
    }
  }

  .member-card__tags {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    flex-wrap: wrap;
  }

  .role-chip {
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 99px;
    background: rgba($brand, 0.15);
    color: color.adjust($brand, $lightness: -26%);
    border: 1px solid rgba($brand, 0.3);
    white-space: nowrap;

    &.muted {
      background: $l-bg-muted;
      color: $l-text-500;
      border-color: $l-border;
    }

    @include dark {
      background: rgba($brand, 0.12);
      color: $brand-light;
      border-color: rgba($brand, 0.25);

      &.muted {
        background: $d-bg-elevated;
        color: $d-text-muted;
        border-color: $d-border;
      }
    }
  }

  .member-card__expiry {
    font-size: 11px;
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }

  // ── Satır ⋯ menüsü ─────────────────────────────────────────
  .member-card__menu {
    align-self: flex-start;
    position: relative;
    flex-shrink: 0;
  }

  .menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: $l-text-400;
    cursor: pointer;

    &:hover {
      background: $l-bg-muted;
      color: $l-text-700;
    }

    @include dark {
      color: $d-text-faint;

      &:hover {
        background: $d-bg-hover;
        color: $d-text;
      }
    }
  }

  .menu-pop {
    position: absolute;
    inset-inline-end: 0;
    top: calc(100% + 4px);
    min-width: 180px;
    padding: 4px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    z-index: 40;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    }
  }

  .menu-pop__item {
    display: block;
    width: 100%;
    padding: 9px 10px;
    border: none;
    border-radius: 7px;
    background: transparent;
    font-size: 13px;
    color: $l-text-700;
    text-align: start;
    cursor: pointer;

    &:hover {
      background: $l-bg-muted;
    }

    &.danger {
      color: $c-error;
    }

    @include dark {
      color: $d-text;

      &:hover {
        background: $d-bg-hover;
      }

      &.danger {
        color: #f87171;
      }
    }
  }

  .menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
  }

  // ── Butonlar ───────────────────────────────────────────────
  .btn-primary,
  .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    white-space: nowrap;
  }

  .btn-primary {
    background: $brand;
    color: $brand-ink;
    transition: background $t-fast;

    &:hover {
      background: $brand-light;
    }

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }

  .btn-secondary {
    background: transparent;
    color: $l-text-600;
    border: 1px solid $l-border;

    @include dark {
      color: $d-text-muted;
      border-color: $d-border;
    }
  }

  // ── Modal ──────────────────────────────────────────────────
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
    background: $l-bg;
    border-radius: 12px;
    padding: 1.5rem;
    width: 90%;
    max-width: 480px;

    @include dark {
      background: $d-bg-elevated;
      border: 1px solid $d-border;
    }

    h3 {
      margin: 0 0 1rem;
      font-size: 16px;
      color: $l-text-900;

      @include dark {
        color: $d-text-max;
      }
    }
  }

  .form-label {
    display: block;
    color: $l-text-700;
    font-size: 12.5px;
    font-weight: 500;
    margin: 0.75rem 0 0.25rem;

    @include dark {
      color: $d-text;
    }
  }

  .form-input {
    width: 100%;
    padding: 0.5rem 0.625rem;
    border: 1px solid $l-border;
    border-radius: 8px;
    font-size: 0.875rem;
    background: $l-bg;
    color: $l-text-900;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
    }
  }

  .form-error {
    color: $c-error;
    background: rgba($c-error, 0.08);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    margin-top: 0.75rem;
    font-size: 12.5px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  // Masaüstünde mobil davet çubuğu render edilmez (yalnızca ≤767px görünür)
  .mobile-invite-bar {
    display: none;
  }

  // ── Mobil (≤767px) ─────────────────────────────────────────
  $m-tabbar-h: 64px; // mobile-nav.scss ile senkron tut
  $m-invitebar-h: 64px;

  @media (max-width: 767px) {
    .buyer-team-page {
      // page-content'in 16px yan padding'ini negatif margin ile geri al (referans: SocialProofSettingsView)
      margin: 0 -0.75rem;
      // Alt boşluk: sabit davet çubuğu içeriğin sonunu örtmesin
      padding: 16px 0.75rem calc(#{$m-invitebar-h} + 16px);
    }

    .page-header h1 {
      font-size: 17px;
    }

    // Davet eylemi mobilde alt çubukta — chip içindeki buton gizlenir
    .org-chip__invite {
      display: none;
    }

    .mobile-invite-bar {
      display: flex;
      align-items: center;
      position: fixed;
      left: 0;
      right: 0;
      bottom: calc(#{$m-tabbar-h} + env(safe-area-inset-bottom));
      z-index: 40; // tab bar (50) altında, içerik üstünde
      min-height: $m-invitebar-h;
      padding: 10px 16px;
      background: $l-bg;
      border-top: 1px solid $l-border;

      @include dark {
        background: $d-panel-bg;
        border-color: $d-panel-border;
      }
    }

    .mobile-invite-bar__btn {
      width: 100%;
      padding: 12px;
      font-size: 14px;
      border-radius: 10px;
    }
  }
</style>
