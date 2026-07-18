<template>
  <div class="compliance-matrix-page">
    <div class="page-header">
      <div>
        <h1><AppIcon name="shield" :size="22" /> {{ t("complianceMaskMatrix.title") }}</h1>
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

    <table v-else-if="isLg" class="matrix-table" data-tour="pii-matrix">
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
              ><AppIcon name="ban" :size="14"
            /></span>
            <span
              v-if="getRule(p, j)?.require_consent"
              class="badge cc"
              :title="t('complianceMaskMatrix.consentRequired')"
              ><AppIcon name="file-text" :size="14"
            /></span>
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

    <!-- Mobil (<768px): özet liste — satıra dokununca bottom sheet detayı (Mock D) -->
    <div v-else class="m-plist" data-tour="pii-matrix">
      <button
        v-for="p in policies"
        :key="p.name"
        type="button"
        class="m-prow"
        @click="openSheet(p)"
      >
        <span class="m-fld">
          <strong>{{ p.ref_doctype }}</strong>
          <code>{{ p.fieldname }}</code>
        </span>
        <span class="m-sums">
          <span
            v-for="j in jurisdictions.slice(0, 3)"
            :key="j"
            class="m-stg"
            :class="`strategy-${getRule(p, j)?.mask_strategy || 'none'}`"
          >
            {{ shortStrategy(p, j) }}
          </span>
        </span>
        <AppIcon name="chevron-right" :size="14" class="m-chev" />
      </button>
    </div>

    <!-- Mobil bottom sheet: 5 yargı bölgesinin tam detayı + Düzenle/Sil -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="sheetPolicy" class="pii-sheet-backdrop" aria-hidden="true" @click="closeSheet" />
      </Transition>
      <Transition name="pii-sheet">
        <div v-if="sheetPolicy" class="pii-sheet" role="dialog" aria-modal="true">
          <div class="pii-sheet-grab" aria-hidden="true"></div>
          <header class="pii-sheet-head">
            <div class="pii-sheet-title">
              <strong>{{ sheetPolicy.ref_doctype }}</strong>
              <code>{{ sheetPolicy.fieldname }}</code>
            </div>
            <button
              type="button"
              class="pii-sheet-close"
              :aria-label="t('complianceMaskMatrix.cancel')"
              @click="closeSheet"
            >
              <AppIcon name="x" :size="16" />
            </button>
          </header>
          <div class="pii-sheet-meta">
            <span class="pii-pill">{{ sheetPolicy.pii_category }}</span>
            <span class="pii-pill perm">
              {{ t("complianceMaskMatrix.colPermlevel") }}: {{ sheetPolicy.permlevel }}
            </span>
          </div>
          <div class="pii-sheet-body">
            <div v-for="j in jurisdictions" :key="j" class="pii-jrow">
              <span class="pii-jname">{{ j }}</span>
              <span
                class="pii-jrule"
                :class="`strategy-${getRule(sheetPolicy, j)?.mask_strategy || 'none'}`"
              >
                {{ getRule(sheetPolicy, j)?.mask_strategy || "—" }}
              </span>
              <span
                v-if="getRule(sheetPolicy, j)?.cross_border_block"
                class="pii-flag cb"
                :title="t('complianceMaskMatrix.crossBorderBlock')"
              >
                <AppIcon name="ban" :size="14" />
              </span>
              <span
                v-if="getRule(sheetPolicy, j)?.require_consent"
                class="pii-flag cc"
                :title="t('complianceMaskMatrix.consentRequired')"
              >
                <AppIcon name="file-text" :size="14" />
              </span>
            </div>
          </div>
          <footer class="pii-sheet-acts">
            <button type="button" class="btn-secondary pii-act" @click="sheetEdit">
              {{ t("complianceMaskMatrix.edit") }}
            </button>
            <button type="button" class="btn-secondary pii-act pii-danger" @click="sheetDelete">
              {{ t("complianceMaskMatrix.delete") }}
            </button>
          </footer>
        </div>
      </Transition>
    </Teleport>

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
  import { ref, reactive, onMounted, onUnmounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { usePageTour } from "@/composables/usePageTour";
  import { useBreakpoint } from "@/composables/useBreakpoint";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();

  // <768px: 9 sütunlu matris yerine özet liste + bottom sheet detayı (Mock D).
  const { isLg } = useBreakpoint();

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

  // ── Mobil bottom sheet (Mock D) ──────────────────────────────────────
  const sheetPolicy = ref(null);

  function openSheet(p) {
    sheetPolicy.value = p;
  }
  function closeSheet() {
    sheetPolicy.value = null;
  }
  function sheetEdit() {
    const p = sheetPolicy.value;
    closeSheet();
    editPolicy(p);
  }
  function sheetDelete() {
    const p = sheetPolicy.value;
    closeSheet();
    deletePolicy(p);
  }

  // Liste satırındaki kompakt strateji rozetleri (ilk 3 yargı bölgesi).
  const STRATEGY_SHORT = {
    none: "—",
    full: "FULL",
    last_4: "L4",
    first_3: "F3",
    email: "E-MSK",
    iban: "I-MSK",
    block: "BLK",
  };
  function shortStrategy(p, j) {
    const s = getRule(p, j)?.mask_strategy || "none";
    return STRATEGY_SHORT[s] || s.toUpperCase();
  }

  function onSheetKeydown(e) {
    if (e.key === "Escape" && sheetPolicy.value) closeSheet();
  }
  onMounted(() => document.addEventListener("keydown", onSheetKeydown));
  onUnmounted(() => document.removeEventListener("keydown", onSheetKeydown));

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
    // Mobilde padding zinciri: page-content 16px + 1.5rem kenar başına ~40px yiyor,
    // embed bağlamında daha da artıyor — sadece padding azalt (negatif margin YOK, embed ediliyor).
    .compliance-matrix-page {
      padding: 1rem 0.5rem;
    }
    // 9 sütunlu matris (doctype/alan + kategori + permlevel + 5 jurisdiction + aksiyon)
    // 320px'e sığamaz — tablo kendi içinde yatay kaydırılır, sayfa taşmaz.
    // Sarmalayıcı div eklemeden display:block ile scroll konteynerine çevrildi.
    .matrix-table {
      display: block;
      overflow-x: auto;
      font-size: 0.78rem;
    }
    .matrix-table th,
    .matrix-table td {
      padding: 0.4rem 0.5rem;
    }
    // Modal içindeki 4 sütun + select'li kural tablosu ~294px modal genişliğine
    // sığmaz — modal yerine tablo kendi içinde yatay kaydırılır.
    .rules-table {
      display: block;
      overflow-x: auto;
    }
    // Dar modalda iç padding'i kompaktlaştır.
    .modal-card {
      padding: 0.75rem;
    }
    // Başlık bloğu: desktop 1.55rem başlık + uzun alt metin 320px'te yarım
    // ekran yiyordu; tipografi mobil ölçeğe iner, buton tam genişlik olur.
    .page-header {
      flex-direction: column;
      gap: 0.6rem;
    }
    .page-header h1 {
      font-size: 1.15rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .subtitle {
      font-size: 0.8rem;
      line-height: 1.45;
      margin-top: 0.2rem;
    }
    .page-header .btn-primary {
      align-self: stretch;
      text-align: center;
      padding: 0.6rem;
    }
    // Filtre + Yenile tek satırda; "Modül Filtresi" etiketi görsel olarak
    // gizlenir (placeholder zaten örnek veriyor), erişilebilirlik için DOM'da kalır.
    .toolbar {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      // Listeye yapışmasın — "Yenile dibine yapışmış" düzeltmesi.
      margin: 0.75rem 0 0.9rem;
    }
    .toolbar .field {
      flex: 1;
      min-width: 0;
    }
    .toolbar .label {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    .toolbar input {
      width: 100%;
    }
    .toolbar .btn-secondary {
      flex-shrink: 0;
      padding: 0.55rem 0.9rem;
    }
  }

  // ── Mobil özet liste + bottom sheet (Mock D) — yalnızca <768px'te render ──
  .m-plist {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .m-prow {
    display: flex;
    align-items: center;
    gap: 8px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 11px;
    padding: 9px 11px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .m-fld {
    flex: 1;
    min-width: 0;
    strong {
      display: block;
      font-size: 12.5px;
      color: $l-text-900;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      @include dark {
        color: $d-text-hi;
      }
    }
    code {
      font-size: 10.5px;
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
  }
  .m-sums {
    display: flex;
    gap: 3px;
    flex-shrink: 0;
  }
  .m-stg {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.02em;
    padding: 3px 4px;
    border-radius: 6px;
    background: $l-bg-muted;
    @include dark {
      background: $d-bg-elevated;
    }
  }
  .m-chev {
    color: $l-text-300;
    flex-shrink: 0;
    @include dark {
      color: $d-text-faint;
    }
  }

  .pii-sheet-backdrop {
    position: fixed;
    inset: 0;
    z-index: 59;
    background: rgba(#0a0a0a, 0.4);
    @include dark {
      background: rgba(#000, 0.55);
    }
  }
  .pii-sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 60;
    display: flex;
    flex-direction: column;
    max-height: 82vh;
    background: $l-bg;
    border-radius: 18px 18px 0 0;
    box-shadow: 0 -12px 40px rgba(#000, 0.18);
    padding-bottom: env(safe-area-inset-bottom);
    @include dark {
      background: $d-panel-bg;
      box-shadow: 0 -12px 40px rgba(#000, 0.5);
    }
  }
  .pii-sheet-grab {
    width: 36px;
    height: 4px;
    border-radius: 99px;
    background: $l-text-300;
    margin: 8px auto 4px;
    flex-shrink: 0;
    @include dark {
      background: $d-text-faint;
    }
  }
  .pii-sheet-head {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 14px 8px;
  }
  .pii-sheet-title {
    flex: 1;
    min-width: 0;
    strong {
      display: block;
      font-size: 14.5px;
      color: $l-text-900;
      @include dark {
        color: $d-text-hi;
      }
    }
    code {
      font-size: 11px;
      color: $l-text-500;
      @include dark {
        color: $d-text-muted;
      }
    }
  }
  .pii-sheet-close {
    width: 30px;
    height: 30px;
    border: none;
    background: none;
    border-radius: 9px;
    color: $l-text-500;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    &:hover {
      background: $l-bg-soft;
    }
    @include dark {
      color: $d-text-muted;
      &:hover {
        background: $d-item-hover;
      }
    }
  }
  .pii-sheet-meta {
    display: flex;
    gap: 6px;
    padding: 0 14px 10px;
  }
  .pii-pill {
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2.5px 8px;
    border-radius: 99px;
    background: $l-bg-muted;
    color: $l-text-500;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
    &.perm {
      background: rgba(#6366f1, 0.12);
      color: #4f46e5;
    }
  }
  .pii-sheet-body {
    overflow-y: auto;
    padding: 0 14px 8px;
  }
  .pii-jrow {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 0;
    border-top: 1px solid $l-border-alt;
    @include dark {
      border-color: $d-border-inner;
    }
  }
  .pii-jname {
    width: 52px;
    font-size: 11px;
    font-weight: 800;
    color: $l-text-700;
    flex-shrink: 0;
    @include dark {
      color: $d-text;
    }
  }
  .pii-jrule {
    flex: 1;
    font-size: 12.5px;
    font-weight: 600;
  }
  .pii-flag {
    display: inline-flex;
    flex-shrink: 0;
    &.cb {
      color: $c-error;
    }
    &.cc {
      color: #4f46e5;
    }
  }
  .pii-sheet-acts {
    display: flex;
    gap: 8px;
    padding: 10px 14px 14px;
    border-top: 1px solid $l-border;
    @include dark {
      border-color: $d-border;
    }
    .pii-act {
      flex: 1;
      padding: 10px;
      font-weight: 700;
    }
    .pii-danger {
      color: $c-error;
      border-color: rgba($c-error, 0.35);
    }
  }

  // Sheet açılış animasyonu
  .pii-sheet-enter-active,
  .pii-sheet-leave-active {
    transition: transform 0.26s cubic-bezier(0.32, 0.72, 0.35, 1);
  }
  .pii-sheet-enter-from,
  .pii-sheet-leave-to {
    transform: translateY(105%);
  }
  @media (prefers-reduced-motion: reduce) {
    .pii-sheet-enter-active,
    .pii-sheet-leave-active {
      transition: none;
    }
  }
</style>
