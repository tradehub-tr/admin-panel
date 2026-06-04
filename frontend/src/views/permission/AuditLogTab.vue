<template>
  <div class="audit-tab">
    <!-- Log türü selector -->
    <div class="log-type-tabs">
      <button
        v-for="lt in logTypes"
        :key="lt.id"
        :class="['log-type-btn', { active: activeLogType === lt.id }]"
        type="button"
        @click="selectLogType(lt.id)"
      >
        {{ lt.label }}
      </button>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <template v-if="activeLogType === 'decision'">
        <select v-model="filters.severity" class="filter-select" @change="reload">
          <option value="">{{ t("auditLog.allSeverity") }}</option>
          <option value="LOW">LOW</option>
          <option value="NORMAL">NORMAL</option>
          <option value="HIGH">⚠️ HIGH</option>
        </select>
        <select v-model="filters.decision" class="filter-select" @change="reload">
          <option value="">{{ t("auditLog.allDecisions") }}</option>
          <option value="ALLOW">ALLOW</option>
          <option value="DENY">DENY</option>
          <option value="FIELD_MASKED">FIELD_MASKED</option>
          <option value="ALLOW_PENDING">ALLOW_PENDING</option>
        </select>
        <select v-model="filters.layer" class="filter-select" @change="reload">
          <option value="">{{ t("auditLog.allLayers") }}</option>
          <option value="L0">L0 (Entitlement)</option>
          <option value="L1">L1 (Tenant)</option>
          <option value="L2">L2 (Auth)</option>
          <option value="L3">L3 (Field/PII)</option>
        </select>
      </template>
      <template v-else-if="activeLogType === 'role_change'">
        <select v-model="filters.change_type" class="filter-select" @change="reload">
          <option value="">{{ t("auditLog.allTypes") }}</option>
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
          <option value="">{{ t("auditLog.allSeverity") }}</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
      </template>
      <button type="button" class="btn-primary" @click="reload">
        <RefreshCw :size="14" />
        {{ t("auditLog.refresh") }}
      </button>

      <!-- Sprint 5 — Hızlı filtre presetleri -->
      <div class="preset-bar">
        <button
          type="button"
          class="preset-btn mask"
          :class="{ active: filters.decision === 'FIELD_MASKED' }"
          title="Sadece PII maskeleme olayları (pii.field_masked / FIELD_MASKED / L3)"
          @click="applyMaskingPreset"
        >
          🔒 Maskeleme
        </button>
        <button type="button" class="preset-btn clear" @click="clearAllFilters">
          Filtreleri temizle
        </button>
      </div>
    </div>

    <p v-if="loading && !currentLogs.length" class="state">{{ t("auditLog.loading") }}</p>
    <p v-else-if="!currentLogs.length" class="state">{{ t("auditLog.noRecords") }}</p>

    <!-- Decision Log Table -->
    <table v-else-if="activeLogType === 'decision'" class="log-table">
      <thead>
        <tr>
          <th>{{ t("auditLog.colTime") }}</th>
          <th>{{ t("auditLog.colDecision") }}</th>
          <th>{{ t("auditLog.colActor") }}</th>
          <th>{{ t("auditLog.colAction") }}</th>
          <th>{{ t("auditLog.colLayer") }}</th>
          <th>{{ t("auditLog.colRule") }}</th>
          <th>{{ t("auditLog.colSeverity") }}</th>
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
            <div
              v-if="getMaskedFields(log).length"
              class="masked-fields-sub"
              :title="'Maskeli alanlar: ' + getMaskedFields(log).join(', ')"
            >
              <span class="mask-label">Maskeli:</span>
              <code v-for="f in getMaskedFields(log)" :key="f" class="mask-chip">{{ f }}</code>
            </div>
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
          <th>{{ t("auditLog.colTime") }}</th>
          <th>{{ t("auditLog.colType") }}</th>
          <th>{{ t("auditLog.colChangedBy") }}</th>
          <th>{{ t("auditLog.colTarget") }}</th>
          <th>{{ t("auditLog.colTenant") }}</th>
          <th>{{ t("auditLog.colBeforeAfter") }}</th>
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
          <th>{{ t("auditLog.colTime") }}</th>
          <th>{{ t("auditLog.colAdmin") }}</th>
          <th>{{ t("auditLog.colTarget") }}</th>
          <th>{{ t("auditLog.colAction") }}</th>
          <th>{{ t("auditLog.colSeverity") }}</th>
          <th>{{ t("auditLog.colJustification") }}</th>
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
  import { useI18n } from "vue-i18n";
  import { usePermissionStore } from "@/stores/permission";

  const { t } = useI18n();

  const store = usePermissionStore();
  const { decisionLogs, roleChangeLogs, overrideLogs, loading } = storeToRefs(store);

  const logTypes = computed(() => [
    { id: "decision", label: t("auditLog.logTypeDecision") },
    { id: "role_change", label: t("auditLog.logTypeRoleChange") },
    { id: "override", label: t("auditLog.logTypeOverride") },
  ]);

  const activeLogType = ref("decision");
  const filters = reactive({
    severity: "",
    decision: "",
    layer: "",
    change_type: "",
    action: "",
  });

  // Sprint 5 — hızlı filtre preset: "Sadece Maskeleme Olayları"
  function applyMaskingPreset() {
    activeLogType.value = "decision";
    filters.severity = "";
    filters.decision = "FIELD_MASKED";
    filters.layer = "L3";
    filters.action = "pii.field_masked";
    reload();
  }

  function clearAllFilters() {
    filters.severity = "";
    filters.decision = "";
    filters.layer = "";
    filters.change_type = "";
    filters.action = "";
    reload();
  }

  // ADL context (JSON string) → masked_fields array veya boş
  function getMaskedFields(log) {
    if (!log?.context) return [];
    try {
      const ctx = typeof log.context === "string" ? JSON.parse(log.context) : log.context;
      return Array.isArray(ctx?.masked_fields) ? ctx.masked_fields : [];
    } catch {
      return [];
    }
  }

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

  // Sprint 5 — Filter preset bar
  .preset-bar {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: auto;
    padding-left: 0.5rem;
    border-left: 1px solid $l-border;

    @include dark {
      border-color: $d-border;
    }
  }
  .preset-btn {
    background: transparent;
    border: 1px solid $l-border;
    border-radius: 999px;
    padding: 0.3rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    color: $l-text-700;
    transition: all $t-fast;

    @include dark {
      border-color: $d-border;
      color: $d-text;
    }

    &:hover {
      background: $l-bg-soft;
      @include dark {
        background: $d-bg-hover;
      }
    }
    &.active {
      background: rgba($c-warning, 0.15);
      border-color: $c-warning;
      color: $c-warning;
    }
    &.clear {
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
  }
  // Masked fields sub-text (decision tablosu içinde)
  .masked-fields-sub {
    margin-top: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    font-size: 0.7rem;
  }
  .mask-label {
    color: $c-warning;
    font-weight: 600;
  }
  .mask-chip {
    display: inline-block;
    padding: 1px 6px;
    background: rgba($c-warning, 0.12);
    color: $c-warning;
    border-radius: 4px;
    font-size: 0.7rem;
    font-family:
      ui-monospace,
      JetBrains Mono,
      monospace;
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
