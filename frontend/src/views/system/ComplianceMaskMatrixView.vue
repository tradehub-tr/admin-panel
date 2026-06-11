<template>
  <div class="compliance-matrix-page">
    <div class="page-header">
      <div>
        <h1>🛡️ {{ t("complianceMaskMatrix.title") }}</h1>
        <p class="subtitle">
          {{ t("complianceMaskMatrix.subtitle") }}
        </p>
      </div>
      <button class="btn-primary" type="button" data-tour="pii-new" @click="openNewPolicy">
        {{ t("complianceMaskMatrix.newPolicy") }}
      </button>
    </div>

    <div class="toolbar" data-tour="pii-filter">
      <label class="field">
        <span class="label">{{ t("complianceMaskMatrix.doctypeFilter") }}</span>
        <input
          v-model="filterDoctype"
          type="text"
          :placeholder="t('complianceMaskMatrix.doctypeFilterPlaceholder')"
          @keyup.enter="loadPolicies"
        />
      </label>
      <button class="btn-secondary" type="button" @click="loadPolicies">
        {{ t("complianceMaskMatrix.refresh") }}
      </button>
    </div>

    <p v-if="loading" class="state">{{ t("complianceMaskMatrix.loading") }}</p>
    <p v-else-if="!policies.length" class="state empty">
      {{ t("complianceMaskMatrix.empty") }}
    </p>

    <table v-else class="matrix-table" data-tour="pii-matrix">
      <thead>
        <tr>
          <th>{{ t("complianceMaskMatrix.colDoctypeField") }}</th>
          <th>{{ t("complianceMaskMatrix.colCategory") }}</th>
          <th>{{ t("complianceMaskMatrix.colPermlevel") }}</th>
          <th v-for="j in jurisdictions" :key="j">{{ j }}</th>
          <th>{{ t("complianceMaskMatrix.colAction") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in policies" :key="p.name">
          <td class="cell-field">
            <strong>{{ p.ref_doctype }}</strong>
            <br />
            <code>{{ p.fieldname }}</code>
          </td>
          <td>{{ p.pii_category }}</td>
          <td class="cell-perm">{{ p.permlevel }}</td>
          <td v-for="j in jurisdictions" :key="j" class="cell-rule">
            <span :class="`strategy-${getRule(p, j)?.mask_strategy || 'none'}`">
              {{ getRule(p, j)?.mask_strategy || "—" }}
            </span>
            <span
              v-if="getRule(p, j)?.cross_border_block"
              class="badge cb"
              :title="t('complianceMaskMatrix.crossBorderBlock')"
              >⛔</span
            >
            <span
              v-if="getRule(p, j)?.require_consent"
              class="badge cc"
              :title="t('complianceMaskMatrix.consentRequired')"
              >📝</span
            >
          </td>
          <td>
            <button class="btn-link" type="button" @click="editPolicy(p)">
              {{ t("complianceMaskMatrix.edit") }}
            </button>
            <button class="btn-link danger" type="button" @click="deletePolicy(p)">
              {{ t("complianceMaskMatrix.delete") }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Edit modal -->
    <div v-if="editingPolicy" class="modal-overlay" @click.self="cancelEdit">
      <div class="modal-card">
        <h2>
          {{
            editingPolicy.name
              ? t("complianceMaskMatrix.editPolicy")
              : t("complianceMaskMatrix.newPiiPolicy")
          }}
        </h2>

        <div class="form-grid">
          <label class="field">
            <span class="label">{{ t("complianceMaskMatrix.fieldDoctype") }}</span>
            <input v-model="editingPolicy.ref_doctype" :disabled="!!editingPolicy.name" required />
          </label>
          <label class="field">
            <span class="label">{{ t("complianceMaskMatrix.fieldFieldname") }}</span>
            <input v-model="editingPolicy.fieldname" :disabled="!!editingPolicy.name" required />
          </label>
          <label class="field">
            <span class="label">{{ t("complianceMaskMatrix.fieldCategory") }}</span>
            <select v-model="editingPolicy.pii_category">
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label class="field">
            <span class="label">{{ t("complianceMaskMatrix.fieldPermlevel") }}</span>
            <input v-model.number="editingPolicy.permlevel" type="number" min="0" max="9" />
          </label>
        </div>

        <h3>{{ t("complianceMaskMatrix.jurisdictionRules") }}</h3>
        <table class="rules-table">
          <thead>
            <tr>
              <th>{{ t("complianceMaskMatrix.colJurisdiction") }}</th>
              <th>{{ t("complianceMaskMatrix.colMaskStrategy") }}</th>
              <th>{{ t("complianceMaskMatrix.colCrossBorder") }}</th>
              <th>{{ t("complianceMaskMatrix.colConsent") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in jurisdictions" :key="j">
              <td>{{ j }}</td>
              <td>
                <select v-model="rulesByJur[j].mask_strategy">
                  <option v-for="s in strategies" :key="s" :value="s">{{ s }}</option>
                </select>
              </td>
              <td>
                <input v-model="rulesByJur[j].cross_border_block" type="checkbox" />
              </td>
              <td>
                <input v-model="rulesByJur[j].require_consent" type="checkbox" />
              </td>
            </tr>
          </tbody>
        </table>

        <label class="field">
          <span class="label">{{ t("complianceMaskMatrix.fieldLegalBasis") }}</span>
          <input v-model="editingPolicy.legal_basis" type="text" />
        </label>

        <div class="modal-actions">
          <button class="btn-primary" type="button" @click="savePolicy">
            {{ t("complianceMaskMatrix.save") }}
          </button>
          <button class="btn-secondary" type="button" @click="cancelEdit">
            {{ t("complianceMaskMatrix.cancel") }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: filtre → maske matrisi → kayıt aksiyonu.
  usePageTour("pii-mask-matrix", () => [
    {
      target: '[data-tour="pii-filter"]',
      title: t("tourSteps.page.piiFilter_t"),
      desc: t("tourSteps.page.piiFilter_d"),
    },
    {
      target: '[data-tour="pii-matrix"]',
      title: t("tourSteps.page.piiMatrix_t"),
      desc: t("tourSteps.page.piiMatrix_d"),
    },
    {
      target: '[data-tour="pii-new"]',
      title: t("tourSteps.page.piiNew_t"),
      desc: t("tourSteps.page.piiNew_d"),
    },
  ]);

  const jurisdictions = ref(["KVKK", "GDPR", "MENA", "CIS", "OTHER"]);
  const strategies = ref(["none", "full", "last_4", "first_3", "email", "iban", "block"]);
  const categories = ref(["identity", "financial", "contact", "health", "location", "other"]);

  const policies = ref([]);
  const filterDoctype = ref("");
  const loading = ref(false);
  const errorMessage = ref("");
  const editingPolicy = ref(null);
  const rulesByJur = reactive({});

  function freshRulesByJur(existing = []) {
    const map = {};
    for (const j of jurisdictions.value) {
      const found = existing.find((r) => r.jurisdiction === j);
      map[j] = {
        jurisdiction: j,
        mask_strategy: found?.mask_strategy || "none",
        cross_border_block: !!found?.cross_border_block,
        require_consent: !!found?.require_consent,
      };
    }
    return map;
  }

  function getRule(policy, jurisdiction) {
    return (policy.jurisdiction_rules || []).find((r) => r.jurisdiction === jurisdiction);
  }

  async function loadMetadata() {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.compliance.get_compliance_metadata"
      );
      if (res?.message) {
        jurisdictions.value = res.message.jurisdictions;
        strategies.value = res.message.mask_strategies;
        categories.value = res.message.pii_categories;
      }
    } catch (_err) {
      /* defaults will do */
    }
  }

  async function loadPolicies() {
    loading.value = true;
    errorMessage.value = "";
    try {
      const params = filterDoctype.value ? { doctype: filterDoctype.value } : {};
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.compliance.get_field_policies",
        params
      );
      policies.value = res?.message || res || [];
    } catch (err) {
      errorMessage.value = err.message || t("complianceMaskMatrix.loadFailed");
    } finally {
      loading.value = false;
    }
  }

  function openNewPolicy() {
    editingPolicy.value = {
      name: null,
      ref_doctype: "",
      fieldname: "",
      pii_category: "other",
      permlevel: 1,
      legal_basis: "",
    };
    Object.assign(rulesByJur, freshRulesByJur());
  }

  function editPolicy(p) {
    editingPolicy.value = { ...p };
    Object.assign(rulesByJur, freshRulesByJur(p.jurisdiction_rules || []));
  }

  function cancelEdit() {
    editingPolicy.value = null;
  }

  async function savePolicy() {
    try {
      const rules = Object.values(rulesByJur);
      await api.callMethod("tradehub_core.api.v1.compliance.upsert_field_policy", {
        ref_doctype: editingPolicy.value.ref_doctype,
        fieldname: editingPolicy.value.fieldname,
        pii_category: editingPolicy.value.pii_category,
        permlevel: editingPolicy.value.permlevel,
        is_active: 1,
        jurisdiction_rules: JSON.stringify(rules),
        legal_basis: editingPolicy.value.legal_basis || "",
      });
      editingPolicy.value = null;
      await loadPolicies();
    } catch (err) {
      errorMessage.value = err.message || t("complianceMaskMatrix.saveFailed");
    }
  }

  async function deletePolicy(p) {
    if (
      !window.confirm(
        t("complianceMaskMatrix.deleteConfirm", { ref: `${p.ref_doctype}/${p.fieldname}` })
      )
    )
      return;
    try {
      await api.callMethod("tradehub_core.api.v1.compliance.delete_field_policy", { name: p.name });
      await loadPolicies();
    } catch (err) {
      errorMessage.value = err.message || t("complianceMaskMatrix.deleteFailed");
    }
  }

  onMounted(async () => {
    await loadMetadata();
    await loadPolicies();
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .compliance-matrix-page {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .page-header h1 {
    margin: 0;
    font-size: 1.55rem;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .subtitle {
    color: $l-text-600;
    margin-top: 0.25rem;
    line-height: 1.5;
    max-width: 700px;
    @include dark {
      color: $d-text-muted;
    }
  }
  .toolbar {
    margin-top: 1rem;
    display: flex;
    gap: 0.75rem;
    align-items: end;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.9rem;
  }
  .field .label {
    color: $l-text-600;
    font-weight: 500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .field input,
  .field select {
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    font-size: 0.92rem;
    background: $l-bg-subtle;
    color: $l-text-900;
    transition:
      border-color $t-base,
      box-shadow $t-base,
      background $t-base;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-max;
    }
    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }
  }
  .btn-primary {
    background: $brand;
    color: $l-bg;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition:
      background $t-base,
      transform $t-spring;
    &:hover {
      background: $brand-light;
    }
  }
  .btn-secondary {
    background: $l-border-alt;
    color: $l-text-700;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background $t-base;
    @include dark {
      background: $d-border-inner;
      color: $d-text-hi;
    }
    &:hover {
      background: $l-border;
      @include dark {
        background: $d-border;
      }
    }
  }
  .btn-link {
    background: none;
    color: $brand;
    border: none;
    cursor: pointer;
    padding: 0 0.4rem;
    transition: color $t-base;
    &:hover {
      color: $brand-light;
    }
  }
  .btn-link.danger {
    color: $c-error;
  }
  .matrix-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 8px;
    overflow: hidden;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .matrix-table th,
  .matrix-table td {
    padding: 0.55rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid $l-border-alt;
    font-size: 0.88rem;
    color: $l-text-900;
    @include dark {
      border-bottom-color: $d-border-inner;
      color: $d-text-max;
    }
  }
  .matrix-table th {
    background: $l-bg-subtle;
    font-weight: 600;
    color: $l-text-700;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
    }
  }
  .cell-field code {
    font-size: 0.78rem;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .cell-perm {
    text-align: center;
    font-weight: 600;
  }
  .cell-rule {
    font-size: 0.85rem;
  }
  .strategy-none {
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .strategy-block {
    color: $c-error;
    font-weight: 600;
  }
  .strategy-full,
  .strategy-last_4,
  .strategy-first_3,
  .strategy-email,
  .strategy-iban {
    color: $c-warning;
  }
  .badge {
    margin-left: 0.25rem;
  }
  .state {
    color: $l-text-500;
    padding: 1rem;
    text-align: center;
    @include dark {
      color: $d-text-muted;
    }
  }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-card {
    background: $l-bg;
    border-radius: 10px;
    padding: 1.5rem;
    width: min(720px, 92vw);
    max-height: 90vh;
    overflow: auto;
    color: $l-text-900;
    @include dark {
      background: $d-bg-card;
      color: $d-text-max;
    }
  }
  .modal-card h2 {
    margin: 0 0 1rem;
    font-size: 1.2rem;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.7rem 1rem;
  }
  .rules-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.7rem 0;
  }
  .rules-table th,
  .rules-table td {
    padding: 0.45rem;
    border-bottom: 1px solid $l-border-alt;
    text-align: left;
    @include dark {
      border-bottom-color: $d-border-inner;
    }
  }
  .modal-actions {
    display: flex;
    gap: 0.65rem;
    margin-top: 1rem;
    justify-content: flex-end;
  }
  .error-message {
    color: $c-error;
    margin-top: 0.8rem;
  }

  @media (max-width: 720px) {
    .matrix-table {
      font-size: 0.78rem;
    }
    .matrix-table th,
    .matrix-table td {
      padding: 0.4rem 0.5rem;
    }
    .page-header {
      flex-direction: column;
    }
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
