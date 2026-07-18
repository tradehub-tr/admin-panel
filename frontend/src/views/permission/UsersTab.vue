<template>
  <div class="users-tab">
    <!-- Filter -->
    <div class="filter-bar">
      <input
        v-model="filters.tenant"
        type="text"
        :placeholder="t('users.tenantPlaceholder')"
        class="filter-input"
        @keyup.enter="reload"
      />
      <select v-model="filters.enabled" class="filter-select" @change="reload">
        <option :value="undefined">{{ t("users.allStatuses") }}</option>
        <option :value="1">{{ t("users.active") }}</option>
        <option :value="0">{{ t("users.inactive") }}</option>
      </select>
      <button type="button" class="btn-primary" @click="reload">
        <RefreshCw :size="14" />
        {{ t("users.refresh") }}
      </button>
      <div class="counts">
        <span class="count-pill on">{{ t("users.activeCount", { n: activeCount }) }}</span>
        <span class="count-pill off">{{ t("users.inactiveCount", { n: inactiveCount }) }}</span>
      </div>
    </div>

    <p v-if="loading && !users.length" class="state">{{ t("users.loading") }}</p>
    <p v-else-if="!users.length" class="state">{{ t("users.empty") }}</p>

    <!-- Mobil: avatar'lı kullanıcı kartları (tablo yalnızca desktop) -->
    <div v-else-if="!isLg" class="u-cards">
      <button
        v-for="u in users"
        :key="u.name"
        type="button"
        class="u-card"
        :class="{ 'is-inactive': !u.enabled }"
        @click="openEdit(u)"
      >
        <span class="u-avatar" aria-hidden="true">
          {{ initials(u) }}
          <span :class="['u-status', u.enabled ? 'on' : 'off']"></span>
        </span>
        <div class="u-main">
          <div class="u-top">
            <span class="u-name">{{ u.full_name || u.email }}</span>
            <span v-if="u.tradehub_is_owner" class="owner-badge">Owner</span>
            <span v-if="!u.enabled" class="u-inactive-badge">{{ t("users.inactive") }}</span>
          </div>
          <span class="u-email">{{ u.email }}</span>
          <div class="u-chips">
            <span v-if="u.tradehub_tenant" class="tenant-chip">{{ u.tradehub_tenant }}</span>
            <span v-if="u.role_profile_name" class="profile-chip">{{ u.role_profile_name }}</span>
            <span class="u-login">
              <Clock :size="11" aria-hidden="true" />
              {{ formatDate(u.last_login) }}
            </span>
          </div>
        </div>
        <AppIcon name="chevron-right" :size="15" class="u-chev" />
      </button>
    </div>

    <table v-else class="users-table">
      <thead>
        <tr>
          <th>{{ t("users.colEmail") }}</th>
          <th>{{ t("users.colName") }}</th>
          <th>{{ t("users.colTenant") }}</th>
          <th>{{ t("users.colRoleProfile") }}</th>
          <th>{{ t("users.colStatus") }}</th>
          <th>{{ t("users.colLastLogin") }}</th>
          <th class="col-actions">{{ t("users.colActions") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.name">
          <td>
            <span class="email">{{ u.email }}</span>
            <span v-if="u.tradehub_is_owner" class="owner-badge">Owner</span>
          </td>
          <td>{{ u.full_name || "—" }}</td>
          <td>
            <span v-if="u.tradehub_tenant" class="tenant-chip">{{ u.tradehub_tenant }}</span>
            <span v-else class="muted">—</span>
          </td>
          <td>
            <span v-if="u.role_profile_name" class="profile-chip">{{ u.role_profile_name }}</span>
            <span v-else class="muted">—</span>
          </td>
          <td>
            <span :class="['status-dot', u.enabled ? 'on' : 'off']" />
            {{ u.enabled ? t("users.active") : t("users.inactive") }}
          </td>
          <td class="muted">{{ formatDate(u.last_login) }}</td>
          <td class="col-actions">
            <button type="button" class="edit-link" @click="openEdit(u)">
              {{ t("users.edit") }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Düzenleme modalı (mobilde bottom sheet) -->
    <Teleport to="body">
      <div v-if="edit.open && edit.user" class="ue-backdrop" @click.self="edit.open = false">
        <div class="ue-modal" role="dialog" aria-modal="true">
          <header class="ue-head">
            <div class="ue-head-text">
              <h3>{{ t("users.editTitle") }}</h3>
              <span class="ue-email">{{ edit.user.email }}</span>
            </div>
            <button type="button" class="ue-close" aria-label="×" @click="edit.open = false">
              ×
            </button>
          </header>
          <div class="ue-body">
            <label class="ue-switch">
              <span class="ue-label">{{ t("users.colStatus") }}</span>
              <span class="ue-switch-right">
                <input v-model="edit.enabled" type="checkbox" />
                <span>{{ edit.enabled ? t("users.active") : t("users.inactive") }}</span>
              </span>
            </label>
            <label class="ue-field">
              <span class="ue-label">{{ t("users.colRoleProfile") }}</span>
              <select v-model="edit.role_profile" class="ue-select">
                <option value="">{{ t("users.noProfile") }}</option>
                <option v-for="r in roles" :key="r.name" :value="r.name">
                  {{ r.role_profile || r.name }}
                </option>
              </select>
            </label>
          </div>
          <footer class="ue-foot">
            <button type="button" class="ue-btn-secondary" @click="edit.open = false">
              {{ t("users.cancel") }}
            </button>
            <button
              type="button"
              class="ue-btn-primary"
              :disabled="edit.submitting"
              @click="saveEdit"
            >
              {{ edit.submitting ? t("users.saving") : t("users.save") }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
  import { reactive, onMounted } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { RefreshCw, Clock } from "lucide-vue-next";
  import { usePermissionStore } from "@/stores/permission";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();
  const store = usePermissionStore();
  const toast = useToast();
  const { isLg } = useBreakpoint();
  const {
    users,
    roles,
    loading,
    activeUsersCount: activeCount,
    inactiveUsersCount: inactiveCount,
  } = storeToRefs(store);

  const filters = reactive({
    tenant: "",
    enabled: undefined,
  });

  async function reload() {
    const params = {};
    if (filters.tenant) params.tenant = filters.tenant.trim();
    if (filters.enabled !== undefined) params.enabled = filters.enabled;
    try {
      await store.fetchUsers(params);
    } catch {
      // banner
    }
  }

  // ── Kullanıcı düzenleme (admin: aktif/pasif + rol profili) ──
  const edit = reactive({
    open: false,
    user: null,
    enabled: true,
    role_profile: "",
    submitting: false,
  });

  function openEdit(u) {
    Object.assign(edit, {
      open: true,
      user: u,
      enabled: !!u.enabled,
      role_profile: u.role_profile_name || "",
      submitting: false,
    });
    // Rol profili seçenekleri Roller sekmesi açılmadıysa henüz yüklü olmayabilir.
    if (!roles.value.length) store.fetchRoles().catch(() => {});
  }

  async function saveEdit() {
    if (edit.submitting || !edit.user) return;
    edit.submitting = true;
    try {
      await store.updateUser(edit.user.name, {
        enabled: edit.enabled ? 1 : 0,
        role_profile: edit.role_profile,
      });
      toast.success(t("users.updated"));
      edit.open = false;
      await reload();
    } catch (e) {
      toast.error(e?.message || t("users.updateFailed"));
    } finally {
      edit.submitting = false;
    }
  }

  // Avatar baş harfleri: ad-soyaddan (yoksa e-postadan) en fazla 2 harf.
  function initials(u) {
    const src = (u.full_name || u.email || "").trim();
    const words = src.split(/[\s.@_-]+/).filter(Boolean);
    return words
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join("")
      .toLocaleUpperCase("tr");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  onMounted(reload);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .users-tab {
    display: block;
  }
  .state,
  .muted {
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }
  .state {
    padding: 2rem;
    text-align: center;
  }

  .filter-bar {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid $l-border;
    flex-wrap: wrap;

    @include dark {
      border-bottom-color: $d-border;
    }
  }
  .filter-input,
  .filter-select {
    padding: 0.5rem 0.7rem;
    border: 1px solid $l-border;
    border-radius: 8px;
    font-size: 0.875rem;
    background: $l-bg;
    color: $l-text-900;
    transition: border-color $t-base, box-shadow $t-base;

    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-hi;

      &:focus {
        border-color: $brand-light;
        box-shadow: 0 0 0 3px rgba($brand-light, 0.2);
      }
    }
  }
  .filter-input {
    min-width: 240px;
  }
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: $brand;
    color: #fff;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color $t-base;

    &:hover {
      background: color-mix(in srgb, $brand 88%, #000);
    }
  }
  .counts {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
  }
  .count-pill {
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    border: 1px solid transparent;

    &.on {
      background: rgba($c-success, 0.12);
      color: $c-success;
      border-color: rgba($c-success, 0.25);
    }
    &.off {
      background: rgba($c-error, 0.1);
      color: $c-error;
      border-color: rgba($c-error, 0.25);
    }

    @include dark {
      &.on {
        background: rgba($c-success, 0.15);
      }
      &.off {
        background: rgba($c-error, 0.15);
      }
    }
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  .users-table th {
    text-align: left;
    padding: 0.7rem 0.85rem;
    background: $l-bg-subtle;
    color: $l-text-700;
    font-weight: 600;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-bottom: 1px solid $l-border;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
      border-bottom-color: $d-border;
    }
  }
  .users-table td {
    padding: 0.7rem 0.85rem;
    border-bottom: 1px solid $l-border-alt;
    color: $l-text-900;

    @include dark {
      border-bottom-color: $d-border-inner;
      color: $d-text-hi;
    }
  }
  .users-table tr:hover td {
    background: $l-bg-subtle;

    @include dark {
      background: $d-bg-hover;
    }
  }
  .email {
    font-weight: 500;
  }
  .owner-badge {
    background: $c-warning;
    color: #fff;
    padding: 0.15rem 0.55rem;
    border-radius: 5px;
    font-size: 0.65rem;
    font-weight: 600;
    margin-left: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .tenant-chip {
    background: rgba($brand, 0.1);
    color: $brand;
    padding: 0.15rem 0.55rem;
    border-radius: 5px;
    font-size: 0.72rem;
    border: 1px solid rgba($brand, 0.2);

    @include dark {
      background: rgba($brand-light, 0.12);
      color: $brand-light;
      border-color: rgba($brand-light, 0.25);
    }
  }
  .profile-chip {
    background: $l-bg-muted;
    color: $l-text-700;
    padding: 0.15rem 0.55rem;
    border-radius: 5px;
    font-size: 0.72rem;
    border: 1px solid $l-border-alt;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
      border-color: $d-border;
    }
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 0.35rem;

    &.on {
      background: $c-success;
      box-shadow: 0 0 0 3px rgba($c-success, 0.15);
    }
    &.off {
      background: $c-error;
      box-shadow: 0 0 0 3px rgba($c-error, 0.12);
    }
  }

  // ── Mobil kullanıcı kartları (<768px'te tablo yerine) ─────
  .u-cards {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .u-card {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    width: 100%;
    text-align: start;
    font-family: inherit;
    cursor: pointer;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 11px;
    padding: 11px 12px;
    transition: border-color $t-fast;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
    &:active {
      border-color: rgba($brand, 0.5);
      background: rgba($brand, 0.04);
    }
    &.is-inactive {
      opacity: 0.6;
    }
  }
  .u-chev {
    flex-shrink: 0;
    align-self: center;
    color: $l-text-300;
    @include dark {
      color: $d-text-faint;
    }
  }
  .u-avatar {
    position: relative;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba($brand, 0.14);
    color: color-mix(in srgb, $brand 75%, #000);
    font-size: 13px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    @include dark {
      background: rgba($brand-light, 0.16);
      color: $brand-light;
    }
  }
  .u-status {
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid $l-bg;
    @include dark {
      border-color: $d-bg-card;
    }
    &.on {
      background: $c-success;
    }
    &.off {
      background: $c-error;
    }
  }
  .u-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .u-top {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
  }
  .u-name {
    font-size: 13px;
    font-weight: 700;
    color: $l-text-900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    @include dark {
      color: $d-text-hi;
    }
  }
  .u-card .owner-badge {
    margin-left: 0;
    flex-shrink: 0;
  }
  .u-inactive-badge {
    flex-shrink: 0;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $c-error;
    background: rgba($c-error, 0.1);
    border-radius: 999px;
    padding: 2px 8px;
  }
  .u-email {
    font-size: 0.75rem;
    color: $l-text-500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    @include dark {
      color: $d-text-muted;
    }
  }
  .u-chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
  }
  .u-login {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.68rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }

  // ── Düzenleme (İşlem sütunu + modal) ──────────────────────
  .col-actions {
    width: 90px;
    text-align: right;
  }
  .edit-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.78rem;
    font-weight: 600;
    color: $brand;
    cursor: pointer;
    &:hover {
      opacity: 0.75;
    }
    @include dark {
      color: $brand-light;
    }
  }
  .ue-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 1000;
  }
  .ue-modal {
    background: $l-bg;
    border-radius: 12px;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    @include dark {
      background: $d-bg-card;
    }
  }
  .ue-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-bottom-color: $d-border;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }
  .ue-head-text {
    min-width: 0;
  }
  .ue-email {
    display: block;
    font-size: 0.75rem;
    color: $l-text-500;
    margin-top: 2px;
    overflow-wrap: anywhere;
    @include dark {
      color: $d-text-muted;
    }
  }
  .ue-close {
    background: none;
    border: none;
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    color: $l-text-500;
    flex-shrink: 0;
    @include dark {
      color: $d-text-muted;
    }
  }
  .ue-body {
    padding: 1.1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .ue-label {
    font-size: 0.78rem;
    font-weight: 500;
    color: $l-text-700;
    @include dark {
      color: $d-text-hi;
    }
  }
  .ue-switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    cursor: pointer;
    min-height: 32px;
  }
  .ue-switch-right {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-hi;
    }
    input {
      width: 18px;
      height: 18px;
      accent-color: $brand;
    }
  }
  .ue-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .ue-select {
    width: 100%;
    padding: 0.5rem 0.7rem;
    border: 1px solid $l-border;
    border-radius: 8px;
    background: $l-bg;
    color: $l-text-900;
    font-size: 0.875rem;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-hi;
    }
    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }
  }
  .ue-foot {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    padding: 0.9rem 1.25rem;
    border-top: 1px solid $l-border;
    @include dark {
      border-top-color: $d-border;
    }
  }
  .ue-btn-primary,
  .ue-btn-secondary {
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: opacity $t-fast;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
  .ue-btn-primary {
    background: $brand;
    color: #fff;
  }
  .ue-btn-secondary {
    background: transparent;
    border-color: $l-border;
    color: $l-text-700;
    @include dark {
      border-color: $d-border;
      color: $d-text-hi;
    }
  }
  @keyframes ue-slide-up {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  // ── Mobile ────────────────────────────────────────────────
  @media (max-width: 767px) {
    // Düzenleme modalı alttan açılan sheet olur
    .ue-backdrop {
      align-items: flex-end;
      padding: 0;
    }
    .ue-modal {
      max-width: none;
      border-radius: 16px 16px 0 0;
      animation: ue-slide-up 0.26s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ue-foot {
      padding-bottom: calc(0.9rem + env(safe-area-inset-bottom));
      .ue-btn-primary,
      .ue-btn-secondary {
        flex: 1;
        min-height: 44px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ue-modal {
        animation: none;
      }
    }
    // Arama tam genişlik kendi satırında; durum filtresi + Yenile ikinci
    // satırı paylaşır; sayaç rozetleri altta kendi satırında.
    .filter-input {
      min-width: 0;
      width: 100%;
    }
    .filter-select {
      flex: 1;
      min-height: 40px;
    }
    .btn-primary {
      min-height: 40px;
    }
    .counts {
      margin-left: 0;
      width: 100%;
    }
  }
</style>
