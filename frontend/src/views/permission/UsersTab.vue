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

    <table v-else class="users-table">
      <thead>
        <tr>
          <th>{{ t("users.colEmail") }}</th>
          <th>{{ t("users.colName") }}</th>
          <th>{{ t("users.colTenant") }}</th>
          <th>{{ t("users.colRoleProfile") }}</th>
          <th>{{ t("users.colStatus") }}</th>
          <th>{{ t("users.colLastLogin") }}</th>
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
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
  import { reactive, onMounted } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { RefreshCw } from "lucide-vue-next";
  import { usePermissionStore } from "@/stores/permission";

  const { t } = useI18n();
  const store = usePermissionStore();
  const {
    users,
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
    transition: all $t-base;

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
    transition: all $t-base;

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

  // ── Mobile ────────────────────────────────────────────────
  @media (max-width: 720px) {
    .filter-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .filter-input {
      min-width: 0;
      width: 100%;
    }
    .counts {
      margin-left: 0;
    }
    .users-table {
      font-size: 0.78rem;
    }
    .users-table th,
    .users-table td {
      padding: 0.5rem 0.55rem;
    }
  }
</style>
