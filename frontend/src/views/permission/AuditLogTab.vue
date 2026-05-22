<template>
  <div class="audit-tab">
    <!-- Log türü selector -->
    <div class="log-type-tabs">
      <button
        v-for="t in logTypes"
        :key="t.id"
        :class="['log-type-btn', { active: activeLogType === t.id }]"
        type="button"
        @click="selectLogType(t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <template v-if="activeLogType === 'decision'">
        <select v-model="filters.severity" class="filter-select" @change="reload">
          <option value="">Tüm Önem</option>
          <option value="LOW">LOW</option>
          <option value="NORMAL">NORMAL</option>
          <option value="HIGH">⚠️ HIGH</option>
        </select>
        <select v-model="filters.decision" class="filter-select" @change="reload">
          <option value="">Tüm Kararlar</option>
          <option value="ALLOW">ALLOW</option>
          <option value="DENY">DENY</option>
          <option value="FIELD_MASKED">FIELD_MASKED</option>
          <option value="ALLOW_PENDING">ALLOW_PENDING</option>
        </select>
        <select v-model="filters.layer" class="filter-select" @change="reload">
          <option value="">Tüm Katmanlar</option>
          <option value="L0">L0 (Entitlement)</option>
          <option value="L1">L1 (Tenant)</option>
          <option value="L2">L2 (Auth)</option>
          <option value="L3">L3 (Field/PII)</option>
        </select>
      </template>
      <template v-else-if="activeLogType === 'role_change'">
        <select v-model="filters.change_type" class="filter-select" @change="reload">
          <option value="">Tüm Tipler</option>
          <option value="invite">Invite</option>
          <option value="activate">Activate</option>
          <option value="deactivate">Deactivate</option>
          <option value="role_assign">Role Assign</option>
          <option value="role_remove">Role Remove</option>
          <option value="profile_change">Profile Change</option>
        </select>
      </template>
      <template v-else-if="activeLogType === 'override'">
        <select v-model="filters.severity" class="filter-select" @change="reload">
          <option value="">Tüm Önem</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
      </template>
      <button type="button" class="btn-primary" @click="reload">
        <RefreshCw :size="14" />
        Yenile
      </button>
    </div>

    <p v-if="loading && !currentLogs.length" class="state">Yükleniyor…</p>
    <p v-else-if="!currentLogs.length" class="state">Kayıt bulunamadı.</p>

    <!-- Decision Log Table -->
    <table v-else-if="activeLogType === 'decision'" class="log-table">
      <thead>
        <tr>
          <th>Zaman</th>
          <th>Karar</th>
          <th>Aktör</th>
          <th>Eylem</th>
          <th>Katman</th>
          <th>Kural</th>
          <th>Önem</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in decisionLogs" :key="log.name" :class="{ high: log.severity === 'HIGH' }">
          <td class="muted">{{ formatDate(log.timestamp) }}</td>
          <td>
            <span :class="['badge', `dec-${log.decision?.toLowerCase()}`]">
              {{ log.decision }}
            </span>
          </td>
          <td>{{ log.actor }}</td>
          <td>
            <code>{{ log.action }}</code>
          </td>
          <td>{{ log.layer || "—" }}</td>
          <td>
            <code class="rule">{{ log.rule_id || "—" }}</code>
          </td>
          <td>
            <span :class="['sev-badge', `sev-${log.severity?.toLowerCase()}`]">
              {{ log.severity }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Role Change Log Table -->
    <table v-else-if="activeLogType === 'role_change'" class="log-table">
      <thead>
        <tr>
          <th>Zaman</th>
          <th>Tip</th>
          <th>Yapan</th>
          <th>Hedef</th>
          <th>Tenant</th>
          <th>Önce → Sonra</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in roleChangeLogs" :key="log.name">
          <td class="muted">{{ formatDate(log.timestamp) }}</td>
          <td>
            <span class="badge type-badge">{{ log.change_type }}</span>
          </td>
          <td>{{ log.changed_by }}</td>
          <td>{{ log.target_user }}</td>
          <td>
            <span v-if="log.tenant" class="tenant-chip">{{ log.tenant }}</span>
          </td>
          <td class="diff">
            <code>{{ log.before_roles || "[]" }}</code>
            →
            <code>{{ log.after_roles || "[]" }}</code>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Override Log Table -->
    <table v-else-if="activeLogType === 'override'" class="log-table">
      <thead>
        <tr>
          <th>Zaman</th>
          <th>Admin</th>
          <th>Hedef</th>
          <th>Eylem</th>
          <th>Önem</th>
          <th>Gerekçe</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in overrideLogs" :key="log.name">
          <td class="muted">{{ formatDate(log.timestamp) }}</td>
          <td>{{ log.admin_user }}</td>
          <td>
            <code>{{ log.target_object }}</code>
          </td>
          <td>{{ log.override_action }}</td>
          <td>
            <span :class="['sev-badge', `sev-${log.severity?.toLowerCase()}`]">
              {{ log.severity }}
            </span>
          </td>
          <td class="justification">{{ log.justification }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
  import { ref, reactive, computed, onMounted } from "vue";
  import { storeToRefs } from "pinia";
  import { RefreshCw } from "lucide-vue-next";
  import { usePermissionStore } from "@/stores/permission";

  const store = usePermissionStore();
  const { decisionLogs, roleChangeLogs, overrideLogs, loading } = storeToRefs(store);

  const logTypes = [
    { id: "decision", label: "Karar Log'ları (ADL)" },
    { id: "role_change", label: "Rol Değişikliği (RCL)" },
    { id: "override", label: "Override (POL)" },
  ];

  const activeLogType = ref("decision");
  const filters = reactive({
    severity: "",
    decision: "",
    layer: "",
    change_type: "",
  });

  const currentLogs = computed(() => {
    if (activeLogType.value === "decision") return decisionLogs.value;
    if (activeLogType.value === "role_change") return roleChangeLogs.value;
    if (activeLogType.value === "override") return overrideLogs.value;
    return [];
  });

  function selectLogType(id) {
    activeLogType.value = id;
    // Filter reset
    filters.severity = "";
    filters.decision = "";
    filters.layer = "";
    filters.change_type = "";
    reload();
  }

  async function reload() {
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });

      if (activeLogType.value === "decision") {
        await store.fetchDecisionLogs(params);
      } else if (activeLogType.value === "role_change") {
        await store.fetchRoleChangeLogs(params);
      } else if (activeLogType.value === "override") {
        await store.fetchOverrideLogs(params);
      }
    } catch {
      // banner
    }
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  onMounted(reload);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .audit-tab {
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

  .log-type-tabs {
    display: flex;
    gap: 0.3rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .log-type-btn {
    background: $l-bg;
    border: 1px solid $l-border;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    color: $l-text-600;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all $t-base;

    &:hover {
      border-color: rgba($brand, 0.4);
      color: $brand;
    }
    &.active {
      background: $brand;
      color: #fff;
      border-color: $brand;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-hi;

      &:hover {
        border-color: rgba($brand-light, 0.5);
        color: $brand-light;
      }
      &.active {
        background: $brand-light;
        border-color: $brand-light;
        color: $d-bg;
      }
    }
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
  .filter-select {
    padding: 0.5rem 0.7rem;
    border: 1px solid $l-border;
    border-radius: 8px;
    font-size: 0.875rem;
    min-width: 140px;
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
    transition: background $t-base;

    &:hover {
      background: color-mix(in srgb, $brand 88%, #000);
    }
  }

  .log-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
  }
  .log-table th {
    text-align: left;
    padding: 0.6rem 0.75rem;
    background: $l-bg-subtle;
    color: $l-text-700;
    font-weight: 600;
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-bottom: 1px solid $l-border;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
      border-bottom-color: $d-border;
    }
  }
  .log-table td {
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid $l-border-alt;
    color: $l-text-900;

    @include dark {
      border-bottom-color: $d-border-inner;
      color: $d-text-hi;
    }
  }
  .log-table tr:hover td {
    background: $l-bg-subtle;

    @include dark {
      background: $d-bg-hover;
    }
  }
  .log-table tr.high td {
    background: rgba($c-error, 0.05);

    @include dark {
      background: rgba($c-error, 0.08);
    }
  }
  code {
    background: $l-bg-muted;
    color: $l-text-700;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-family: ui-monospace, monospace;
    font-size: 0.75rem;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
    }
  }
  code.rule {
    color: $brand;

    @include dark {
      color: $brand-light;
    }
  }
  .badge {
    padding: 0.15rem 0.55rem;
    border-radius: 5px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;

    &.dec-allow {
      background: rgba($c-success, 0.12);
      color: $c-success;
    }
    &.dec-deny {
      background: rgba($c-error, 0.12);
      color: $c-error;
    }
    &.dec-field_masked {
      background: rgba($c-warning, 0.12);
      color: $c-warning;
    }
    &.dec-allow_pending {
      background: rgba($c-info, 0.12);
      color: $c-info;
    }

    @include dark {
      &.dec-allow {
        background: rgba($c-success, 0.18);
      }
      &.dec-deny {
        background: rgba($c-error, 0.18);
      }
      &.dec-field_masked {
        background: rgba($c-warning, 0.18);
      }
      &.dec-allow_pending {
        background: rgba($c-info, 0.18);
      }
    }
  }
  .sev-badge {
    padding: 0.15rem 0.55rem;
    border-radius: 5px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  .sev-low {
    background: $l-bg-muted;
    color: $l-text-500;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }
  .sev-normal {
    background: rgba($c-info, 0.12);
    color: $c-info;
  }
  .sev-medium {
    background: rgba($c-warning, 0.12);
    color: $c-warning;
  }
  .sev-high {
    background: rgba($c-error, 0.12);
    color: $c-error;
  }
  .sev-critical {
    background: $c-error;
    color: #fff;
  }
  .type-badge {
    background: rgba($brand, 0.1);
    color: $brand;
    padding: 0.15rem 0.55rem;
    border-radius: 5px;
    font-size: 0.7rem;
    font-weight: 500;

    @include dark {
      background: rgba($brand-light, 0.12);
      color: $brand-light;
    }
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
  .diff {
    font-size: 0.75rem;
  }
  .justification {
    max-width: 320px;
    color: $l-text-600;
    font-size: 0.8125rem;

    @include dark {
      color: $d-text-hi;
    }
  }

  // ── Mobile ────────────────────────────────────────────────
  @media (max-width: 720px) {
    .filter-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .filter-select {
      min-width: 0;
      width: 100%;
    }
    .log-table {
      font-size: 0.74rem;
    }
    .log-table th,
    .log-table td {
      padding: 0.4rem 0.5rem;
    }
  }
</style>
