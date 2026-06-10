<template>
  <div class="eca-form-view">
    <header class="eca-form-header">
      <button class="back-btn" @click="goBack">
        <AppIcon name="arrow-left" :size="16" />
        {{ t("ecaRuleForm.back") }}
      </button>
      <div>
        <h1 class="eca-form-title">
          {{ isNew ? t("ecaRuleForm.newRule") : t("ecaRuleForm.editRule") }}
        </h1>
        <p class="eca-form-subtitle">
          {{ isSellerMode ? t("ecaRuleForm.subtitleSeller") : t("ecaRuleForm.subtitleAdmin") }}
        </p>
      </div>
    </header>

    <div v-if="loadingDoc" class="eca-loading">{{ t("ecaRuleForm.loading") }}</div>

    <!-- ── SATICI: Hazır şablon galerisi (yalnızca yeni kural) ─────────────── -->
    <section v-else-if="isSellerMode && showTemplatePicker" class="wiz-card">
      <h2 class="wiz-card-title">{{ t("ecaWizard.templatePickerTitle") }}</h2>
      <p class="wiz-card-desc">{{ t("ecaWizard.templatePickerDesc") }}</p>
      <div class="tpl-grid">
        <button
          v-for="tpl in RULE_TEMPLATES"
          :key="tpl.id"
          type="button"
          class="tpl"
          :class="{ sel: selectedTemplateId === tpl.id }"
          @click="selectedTemplateId = tpl.id"
        >
          <span class="tpl-ic"><AppIcon :name="tpl.icon" :size="18" /></span>
          <span class="tpl-body">
            <span class="tpl-tt">{{ t(tpl.titleKey) }}</span>
            <span class="tpl-td">{{ t(tpl.descKey) }}</span>
          </span>
        </button>
      </div>
      <div class="wiz-actions">
        <button type="button" class="btn-primary" :disabled="!selectedTemplateId" @click="applyTemplate">
          {{ t("ecaWizard.continue") }}
        </button>
        <button type="button" class="btn-outline" @click="startFromScratch">
          {{ t("ecaWizard.fromScratch") }}
        </button>
      </div>
    </section>

    <!-- ── SATICI: Sihirbaz ────────────────────────────────────────────────── -->
    <form v-else-if="isSellerMode" class="wiz-card" @submit.prevent="onWizardSubmit">
      <div class="field">
        <label>{{ t("ecaWizard.ruleNameLabel") }}</label>
        <input
          v-model="form.rule_name"
          type="text"
          class="field-input"
          :placeholder="t('ecaWizard.ruleNamePlaceholder')"
          required
        />
      </div>

      <!-- Adım 1: Hangi ürünlere -->
      <div class="stepbox">
        <div class="step-title">
          <span class="stepnum">1</span>
          {{ t("ecaWizard.step1Title") }}
        </div>
        <p class="step-hint">{{ t("ecaWizard.step1Hint") }}</p>

        <div class="cond-match">
          <button
            type="button"
            class="seg"
            :class="{ on: matchMode === 'all' }"
            @click="matchMode = 'all'"
          >
            {{ t("ecaWizard.matchAll") }}
          </button>
          <button
            type="button"
            class="seg"
            :class="{ on: matchMode === 'any' }"
            @click="matchMode = 'any'"
          >
            {{ t("ecaWizard.matchAny") }}
          </button>
        </div>

        <div v-for="(row, idx) in conditionRows" :key="row.uid" class="cond-row">
          <select class="field-input" :value="row.field" @change="onFieldChange(row, $event.target.value)">
            <option v-for="f in schema.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
          </select>
          <select v-model="row.op" class="field-input">
            <option v-for="op in operatorsFor(row.field)" :key="op" :value="op">
              {{ t("conditionBuilder.op." + op) }}
            </option>
          </select>
          <component
            :is="valueInputTag(row.field)"
            v-if="!isNoValueOp(row.op)"
            v-model="row.value"
            class="field-input"
            :type="valueInputType(row.field)"
            :placeholder="t('ecaWizard.valuePlaceholder')"
          >
            <template v-if="valueInputTag(row.field) === 'select'">
              <option value="">{{ t("conditionBuilder.selectValue") }}</option>
              <option v-for="opt in valueOptions(row.field)" :key="optKey(opt)" :value="optValue(opt)">
                {{ optLabel(opt) }}
              </option>
            </template>
          </component>
          <span v-else class="cond-novalue">—</span>
          <button
            type="button"
            class="cond-remove"
            :title="t('conditionBuilder.remove')"
            @click="removeCondition(idx)"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </div>

        <button type="button" class="add-cond" @click="addCondition">
          <AppIcon name="plus" :size="14" />
          {{ t("ecaWizard.addCondition") }}
        </button>

        <div class="preview" :class="{ 'is-error': !!countResult.error }">
          <AppIcon :name="countResult.error ? 'alert-circle' : 'check-circle-2'" :size="17" />
          <span v-if="countResult.error">{{ countResult.error }}</span>
          <span v-else-if="countLoading">{{ t("ecaWizard.countLoading") }}</span>
          <span v-else>{{ countMatchText }}</span>
        </div>
      </div>

      <!-- Adım 2: Ne yapılsın -->
      <div class="stepbox">
        <div class="step-title">
          <span class="stepnum">2</span>
          {{ t("ecaWizard.step2Title") }}
        </div>
        <p class="step-hint">{{ t("ecaWizard.step2Hint") }}</p>

        <div class="action-row">
          <select v-model="selectedAction" class="field-input action-select">
            <option v-for="a in schema.actions" :key="a.key" :value="a.key">{{ a.label }}</option>
          </select>

          <!-- Parametre UI — eylem tipine göre cascade -->
          <div v-if="activeActionParams.length" class="action-params">
            <template v-for="p in activeActionParams" :key="p.key">
              <span v-if="p.type === 'number'" class="param-pct">
                %<input v-model.number="actionParams[p.key]" type="number" class="field-input pct-input" />
                {{ t("ecaWizard.percentSuffix") }}
              </span>
              <select
                v-else-if="p.type === 'writable_field'"
                v-model="actionParams[p.key]"
                class="field-input"
              >
                <option value="">{{ t("ecaWizard.selectField") }}</option>
                <option v-for="wf in schema.writable_fields" :key="wf.key" :value="wf.key">
                  {{ wf.label }}
                </option>
              </select>
              <input
                v-else
                v-model="actionParams[p.key]"
                type="text"
                class="field-input"
                :placeholder="p.label"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Toplu yüklemede de uygula -->
      <label class="bulk-toggle">
        <BaseSwitch v-model="form.bulk_import" :on-value="true" :off-value="false" />
        <span>{{ t("ecaWizard.bulkImportToggle") }}</span>
      </label>

      <!-- Gelişmiş: teknik karşılık (salt-okunur) -->
      <details class="adv">
        <summary>{{ t("ecaWizard.advancedSummary") }}</summary>
        <p class="adv-hint">{{ t("ecaWizard.advancedHint") }}</p>
        <code class="adv-code">{{ advancedExpression }}</code>
      </details>

      <div class="wiz-actions">
        <button type="submit" class="btn-primary" :disabled="saving">
          <AppIcon name="check" :size="15" />
          {{ saving ? t("ecaRuleForm.saving") : t("ecaWizard.saveRule") }}
        </button>
        <button type="button" class="btn-outline" @click="goBack">
          {{ t("ecaRuleForm.cancel") }}
        </button>
      </div>
    </form>

    <!-- ── ADMIN: Mevcut teknik tam form (değişmedi) ───────────────────────── -->
    <form v-else class="eca-form-grid" @submit.prevent="onSubmit">
      <section class="eca-form-col">
        <div class="field">
          <label>{{ t("ecaRuleForm.ruleName") }}</label>
          <input v-model="form.rule_name" type="text" class="field-input" required />
        </div>

        <div class="field">
          <label>{{ t("ecaRuleForm.targetDoctype") }}</label>
          <select v-model="form.reference_doctype" class="field-input" required>
            <option value="Listing">Listing</option>
            <option value="Bulk Import Job">Bulk Import Job</option>
            <option value="Order">Order</option>
          </select>
        </div>

        <div class="field">
          <label>{{ t("ecaRuleForm.event") }}</label>
          <select v-model="form.event" class="field-input" required>
            <option value="before_save">{{ t("ecaRuleForm.eventBeforeSave") }}</option>
            <option value="after_insert">{{ t("ecaRuleForm.eventAfterInsert") }}</option>
            <option value="on_update">{{ t("ecaRuleForm.eventOnUpdate") }}</option>
            <option value="on_submit">{{ t("ecaRuleForm.eventOnSubmit") }}</option>
            <option value="on_cancel">{{ t("ecaRuleForm.eventOnCancel") }}</option>
          </select>
        </div>

        <div class="field-inline">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="form.context_filter === 'bulk_import'"
              @change="onBulkImportToggle($event.target.checked)"
            />
            <span>{{ t("ecaRuleForm.onlyBulkImport") }}</span>
          </label>
        </div>

        <div class="field">
          <label>{{ t("ecaRuleForm.scope") }}</label>
          <BaseSwitch
            v-model="form.rule_scope"
            on-value="Per-Seller"
            off-value="Platform"
            :label="t('ecaRuleForm.scopeSwitchLabel')"
            :description="t('ecaRuleForm.scopeSwitchDesc')"
            @update:model-value="onScopeChange"
          />
        </div>

        <div v-if="form.rule_scope === 'Per-Seller'" class="field">
          <label>{{ t("ecaRuleForm.seller") }}</label>
          <select v-model="form.seller_profile" class="field-input" required>
            <option value="">{{ t("ecaRuleForm.selectSeller") }}</option>
            <option v-for="s in sellers" :key="s.name" :value="s.name">
              {{ s.seller_name || s.name }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>{{ priorityLabel }}</label>
          <input
            v-model.number="form.priority"
            type="number"
            class="field-input"
            :min="priorityMin"
            :max="priorityMax"
            required
          />
          <p class="field-hint">
            {{ t("ecaRuleForm.priorityHintBase") }}
            {{ t("ecaRuleForm.priorityHintAdmin") }}
          </p>
        </div>
      </section>

      <section class="eca-form-col">
        <div class="field">
          <label>{{ t("ecaRuleForm.conditionBuilder") }}</label>
          <ConditionBuilder
            v-model:builder-json="form.condition_builder"
            v-model:python="builderPython"
            :reference-doctype="form.reference_doctype"
            :owner-role="ownerRole"
          />
        </div>

        <div class="field">
          <label>{{ t("ecaRuleForm.condition") }}</label>
          <textarea
            v-model="form.condition"
            class="field-input mono"
            rows="4"
            :readonly="usesBuilder"
            :placeholder="t('ecaRuleForm.conditionPlaceholder')"
          ></textarea>
          <p v-if="usesBuilder" class="field-hint">{{ t("ecaRuleForm.conditionAutoHint") }}</p>
        </div>

        <div class="condition-test">
          <label>{{ t("ecaRuleForm.sampleDocJson") }}</label>
          <textarea
            v-model="sampleDocJson"
            class="field-input mono"
            rows="5"
            spellcheck="false"
          ></textarea>
          <div class="test-row">
            <button type="button" class="btn-outline" @click="onTest">
              {{ t("ecaRuleForm.testCondition") }}
            </button>
            <span v-if="testResult" :class="['test-result', testResultClass]">
              <template v-if="testResult.error">
                {{ t("ecaRuleForm.testError", { error: testResult.error }) }}
              </template>
              <template v-else-if="testResult.result"> {{ t("ecaRuleForm.testTrue") }} </template>
              <template v-else> {{ t("ecaRuleForm.testFalse") }} </template>
            </span>
          </div>
        </div>

        <div class="field">
          <label>{{ t("ecaRuleForm.actionType") }}</label>
          <select v-model="form.action_type" class="field-input" required>
            <option v-for="opt in actionTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>{{ t("ecaRuleForm.actionTemplate") }}</label>
          <select v-model="form.action_template" class="field-input">
            <option value="">{{ t("ecaRuleForm.selectTemplate") }}</option>
            <option v-for="tpl in filteredTemplates" :key="tpl.name" :value="tpl.name">
              {{ tpl.template_name || tpl.name }}
            </option>
          </select>
          <p class="field-hint">
            <a class="link" :href="newTemplateLink" target="_blank" rel="noopener">
              {{ t("ecaRuleForm.createNewTemplate") }}
            </a>
          </p>
        </div>
      </section>

      <div class="form-actions">
        <button type="button" class="btn-outline" @click="goBack">
          {{ t("ecaRuleForm.cancel") }}
        </button>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{
            saving
              ? t("ecaRuleForm.saving")
              : isNew
                ? t("ecaRuleForm.saveAndActivate")
                : t("ecaRuleForm.update")
          }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
  import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { storeToRefs } from "pinia";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import BaseSwitch from "@/components/common/BaseSwitch.vue";
  import ConditionBuilder from "@/views/eca/ConditionBuilder.vue";
  import { useAuthStore } from "@/stores/auth";
  import { useEcaRule } from "@/composables/useEcaRule";
  import { useToast } from "@/composables/useToast";

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const authStore = useAuthStore();
  const { isAdmin } = storeToRefs(authStore);

  const {
    getRule,
    saveRule,
    testCondition,
    fetchActionTemplates,
    getRuleSchema,
    countMatching,
    saveWizardRule,
  } = useEcaRule();

  const ruleName = computed(() => {
    const raw = route.params.name;
    return raw && raw !== "new" ? String(raw) : null;
  });
  const isNew = computed(() => ruleName.value === null);

  // Satıcı modu: route /my-eca-rules altında, isAdmin false veya route path my-eca-rules ile başlıyorsa.
  const isSellerMode = computed(() => {
    return route.path.startsWith("/my-eca-rules") || !isAdmin.value;
  });

  const ownerRole = computed(() => (isSellerMode.value ? "Seller" : "Marketplace Admin"));

  // ── Hazır şablonlar (sözleşme §3 — 4 senaryo) ──────────────────────────────
  const RULE_TEMPLATES = [
    {
      id: "brand_discount",
      icon: "percent",
      titleKey: "ecaWizard.tplBrandDiscountTitle",
      descKey: "ecaWizard.tplBrandDiscountDesc",
      match: "all",
      conditions: [{ field: "brand", op: "eq", value: "" }],
      action: "discount_price",
      params: { percent: 15 },
      bulk_import: false,
    },
    {
      id: "low_stock",
      icon: "alert-triangle",
      titleKey: "ecaWizard.tplLowStockTitle",
      descKey: "ecaWizard.tplLowStockDesc",
      match: "all",
      conditions: [{ field: "stock_qty", op: "lte", value: 10 }],
      action: "email",
      params: { note: "" },
      bulk_import: false,
    },
    {
      id: "reject_row",
      icon: "ban",
      titleKey: "ecaWizard.tplRejectRowTitle",
      descKey: "ecaWizard.tplRejectRowDesc",
      match: "all",
      conditions: [{ field: "base_price", op: "is_empty", value: "" }],
      action: "reject_row",
      params: {},
      bulk_import: true,
    },
    {
      id: "fill_field",
      icon: "edit-3",
      titleKey: "ecaWizard.tplFillFieldTitle",
      descKey: "ecaWizard.tplFillFieldDesc",
      match: "all",
      conditions: [{ field: "currency", op: "is_empty", value: "" }],
      action: "set_field",
      params: { field: "currency", value: "TRY" },
      bulk_import: true,
    },
  ];

  // ── Admin mod state (mevcut form) ──────────────────────────────────────────
  const SELLER_DISABLED_ACTIONS = new Set(["custom_script", "create_document"]);
  const ALL_ACTION_TYPES = [
    { value: "field_update", labelKey: "ecaRuleForm.actionFieldUpdate" },
    { value: "email", labelKey: "ecaRuleForm.actionEmail" },
    { value: "webhook", labelKey: "ecaRuleForm.actionWebhook" },
    { value: "reject_row", labelKey: "ecaRuleForm.actionRejectRow" },
    { value: "create_document", labelKey: "ecaRuleForm.actionCreateDocument" },
    { value: "custom_script", labelKey: "ecaRuleForm.actionCustomScript" },
  ];
  const actionTypeOptions = computed(() =>
    ALL_ACTION_TYPES.map((o) => ({ value: o.value, label: t(o.labelKey) }))
  );

  const priorityMin = 1;
  const priorityMax = 99999;
  const priorityLabel = computed(() => t("ecaRuleForm.priorityLabelAdmin"));

  const form = reactive({
    rule_name: "",
    enabled: 1,
    reference_doctype: "Listing",
    event: "before_save",
    context_filter: "bulk_import",
    rule_scope: "Per-Seller",
    seller_profile: "",
    owner_role: "Seller",
    priority: 500,
    condition: "",
    condition_builder: "",
    action_type: "field_update",
    action_template: "",
    bulk_import: true,
  });

  const builderPython = ref("");
  const usesBuilder = computed(() => !!form.condition_builder);
  watch(builderPython, (py) => {
    if (usesBuilder.value) form.condition = py;
  });

  const sampleDocJson = ref(
    JSON.stringify(
      {
        base_price: 1500,
        stock_qty: 100,
        min_order_qty: 12,
        title: t("ecaRuleForm.sampleProductTitle"),
      },
      null,
      2
    )
  );

  const testResult = ref(null);
  const testResultClass = computed(() => {
    if (!testResult.value) return "";
    if (testResult.value.error) return "is-error";
    return testResult.value.result ? "is-success" : "is-warn";
  });

  const loadingDoc = ref(false);
  const saving = ref(false);
  const sellers = ref([]);
  const templates = ref([]);

  const filteredTemplates = computed(() => {
    if (!form.action_type) return templates.value;
    return templates.value.filter((tpl) => !tpl.action_type || tpl.action_type === form.action_type);
  });

  const newTemplateLink = computed(
    () => "/app/eca-action-template/new?action_type=" + encodeURIComponent(form.action_type || "")
  );

  function onBulkImportToggle(checked) {
    form.context_filter = checked ? "bulk_import" : "";
  }

  function onScopeChange() {
    if (form.rule_scope === "Platform") {
      form.seller_profile = "";
      form.owner_role = "Marketplace Admin";
      if (form.priority < 1000) form.priority = 1000;
    } else {
      form.owner_role = "Marketplace Admin";
    }
  }

  async function onTest() {
    testResult.value = null;
    testResult.value = await testCondition(form.condition || "", sampleDocJson.value || "{}", ownerRole.value);
  }

  function goBack() {
    router.push(isSellerMode.value ? "/my-eca-rules" : "/eca-rules");
  }

  // ── SİHİRBAZ state (satıcı modu) ───────────────────────────────────────────
  const schema = reactive({ fields: [], actions: [], writable_fields: [] });
  const showTemplatePicker = ref(false);
  const selectedTemplateId = ref("");

  const matchMode = ref("all");
  let condUid = 0;
  const conditionRows = ref([]);

  const selectedAction = ref("discount_price");
  const actionParams = reactive({});

  const fieldDef = (key) => schema.fields.find((f) => f.key === key);
  const operatorsFor = (key) => fieldDef(key)?.operators || [];
  const NO_VALUE_OPS = new Set(["is_set", "is_empty"]);
  const isNoValueOp = (op) => NO_VALUE_OPS.has(op);

  const valueInputTag = (key) => {
    const kind = fieldDef(key)?.value_source?.kind;
    return kind === "enum" || kind === "doctype" || kind === "bool" ? "select" : "input";
  };
  const valueInputType = (key) => (fieldDef(key)?.type === "number" ? "number" : "text");

  // Link/doctype değer seçenekleri — doctype başına cache.
  const linkOptions = reactive({});
  const valueOptions = (key) => {
    const src = fieldDef(key)?.value_source;
    if (!src) return [];
    if (src.kind === "enum") return src.options || [];
    if (src.kind === "bool") return [{ v: "1", l: t("ecaWizard.yes") }, { v: "0", l: t("ecaWizard.no") }];
    if (src.kind === "doctype") return linkOptions[src.doctype] || [];
    return [];
  };
  const optKey = (opt) => (typeof opt === "object" ? opt.v : opt);
  const optValue = (opt) => (typeof opt === "object" ? opt.v : opt);
  const optLabel = (opt) => (typeof opt === "object" ? opt.l : opt);

  async function loadLinkOptions(doctype) {
    if (!doctype || linkOptions[doctype]) return;
    try {
      const res = await api.getList(doctype, {
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 200,
      });
      linkOptions[doctype] = (res.data || []).map((r) => r.name);
    } catch {
      linkOptions[doctype] = [];
    }
  }

  function makeRow(field, op, value) {
    const def = field ? fieldDef(field) : schema.fields[0];
    const f = def?.key || "base_price";
    const o = op || (def?.operators?.[0] ?? "gt");
    if (def?.value_source?.kind === "doctype") loadLinkOptions(def.value_source.doctype);
    return { uid: ++condUid, field: f, op: o, value: value ?? "" };
  }

  function addCondition() {
    conditionRows.value.push(makeRow());
  }

  function removeCondition(idx) {
    conditionRows.value.splice(idx, 1);
  }

  function onFieldChange(row, newField) {
    row.field = newField;
    const ops = operatorsFor(newField);
    if (!ops.includes(row.op)) row.op = ops[0];
    row.value = "";
    const src = fieldDef(newField)?.value_source;
    if (src?.kind === "doctype") loadLinkOptions(src.doctype);
  }

  const activeAction = computed(() => schema.actions.find((a) => a.key === selectedAction.value));
  const activeActionParams = computed(() => activeAction.value?.params || []);

  // Programatik eylem değişiminde (şablon/düzenleme) watcher param sıfırlamasını atla.
  let suppressActionReset = false;

  function resetActionParams() {
    Object.keys(actionParams).forEach((k) => delete actionParams[k]);
    for (const p of activeActionParams.value) actionParams[p.key] = p.type === "number" ? 0 : "";
  }

  watch(selectedAction, () => {
    // Kullanıcı eylemi değiştirince eski parametreleri temizle, yeni paramlara default ver.
    if (suppressActionReset) return;
    resetActionParams();
  });

  // Builder JSON — count_matching + kaydetme için ConditionBuilder şemasıyla aynı.
  function serializeRow(row) {
    const def = fieldDef(row.field);
    const cond = { field: row.field, op: row.op };
    if (NO_VALUE_OPS.has(row.op)) return cond;
    if (row.op === "in_list" || row.op === "not_in_list") {
      cond.value = String(row.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (def?.type === "number") {
      cond.value = Number(row.value);
    } else {
      cond.value = row.value ?? "";
    }
    return cond;
  }

  const builderModel = computed(() => ({
    match: matchMode.value,
    conditions: conditionRows.value.filter((r) => r.field && r.op).map(serializeRow),
  }));

  const builderJson = computed(() => {
    const m = builderModel.value;
    return m.conditions.length ? JSON.stringify(m) : "";
  });

  // ── Canlı önizleme sayacı ───────────────────────────────────────────────────
  const countResult = reactive({ count: 0, total: 0, error: null });
  const countLoading = ref(false);
  const countMatchText = computed(() =>
    t("ecaWizard.countMatch", { count: countResult.count, total: countResult.total })
  );
  let countDebounce = null;

  watch(
    builderJson,
    (json) => {
      if (!isSellerMode.value) return;
      clearTimeout(countDebounce);
      countLoading.value = true;
      countDebounce = setTimeout(async () => {
        const res = await countMatching("Listing", json);
        countResult.count = res.count;
        countResult.total = res.total;
        countResult.error = res.error;
        countLoading.value = false;
      }, 350);
    },
    { immediate: true }
  );

  // Gelişmiş: teknik karşılık (salt-okunur özet).
  const advancedExpression = computed(() => {
    const parts = builderModel.value.conditions.map((c) => {
      if (NO_VALUE_OPS.has(c.op)) return `${c.field} ${c.op}`;
      return `${c.field} ${c.op} ${JSON.stringify(c.value)}`;
    });
    const joiner = matchMode.value === "all" ? " AND " : " OR ";
    const cond = parts.join(joiner) || "(koşul yok)";
    const evt = form.bulk_import ? "before_save + bulk_import" : "before_save";
    return `${cond}\n→ ${evt} · ${selectedAction.value}`;
  });

  function buildWizardConditionRows(conditions) {
    return (conditions || []).map((c) => makeRow(c.field, c.op, c.value));
  }

  // Eylemi + parametrelerini programatik ata; watcher reset'ini bastır
  // (selectedAction değişimi watcher'ı tetikler, atadığımız paramları silmesin).
  async function applyAction(actionKey, params) {
    suppressActionReset = true;
    selectedAction.value = actionKey;
    Object.keys(actionParams).forEach((k) => delete actionParams[k]);
    Object.assign(actionParams, params);
    await nextTick();
    suppressActionReset = false;
  }

  // ── Şablon seçimi ───────────────────────────────────────────────────────────
  function applyTemplate() {
    const tpl = RULE_TEMPLATES.find((x) => x.id === selectedTemplateId.value);
    if (!tpl) return;
    form.rule_name = t(tpl.titleKey);
    matchMode.value = tpl.match;
    conditionRows.value = buildWizardConditionRows(tpl.conditions);
    form.bulk_import = tpl.bulk_import;
    showTemplatePicker.value = false;
    applyAction(tpl.action, tpl.params);
  }

  function startFromScratch() {
    form.rule_name = "";
    matchMode.value = "all";
    conditionRows.value = [makeRow()];
    form.bulk_import = true;
    showTemplatePicker.value = false;
    applyAction("discount_price", { percent: 10 });
  }

  async function onWizardSubmit() {
    if (!form.rule_name?.trim()) {
      toast.error(t("ecaRuleForm.ruleNameRequired"));
      return;
    }
    saving.value = true;
    try {
      await saveWizardRule({
        name: ruleName.value || "",
        rule_name: form.rule_name.trim(),
        condition_builder: builderModel.value,
        action: { key: selectedAction.value, params: { ...actionParams } },
        bulk_import: !!form.bulk_import,
        enabled: true,
      });
      goBack();
    } catch {
      /* toast composable tarafından */
    } finally {
      saving.value = false;
    }
  }

  // ── Admin kaydet (mevcut akış) ──────────────────────────────────────────────
  function validateAdmin() {
    if (!form.rule_name?.trim()) {
      toast.error(t("ecaRuleForm.ruleNameRequired"));
      return false;
    }
    if (SELLER_DISABLED_ACTIONS.has(form.action_type) && isSellerMode.value) {
      toast.error(t("ecaRuleForm.actionTypeDisabledForSeller"));
      return false;
    }
    if (form.rule_scope === "Per-Seller" && !form.seller_profile) {
      toast.error(t("ecaRuleForm.sellerRequiredForPerSeller"));
      return false;
    }
    const p = Number(form.priority);
    if (Number.isNaN(p) || p < priorityMin || p > priorityMax) {
      toast.error(t("ecaRuleForm.priorityRangeError", { min: priorityMin, max: priorityMax }));
      return false;
    }
    return true;
  }

  async function onSubmit() {
    if (!validateAdmin()) return;
    saving.value = true;
    try {
      const payload = {
        rule_name: form.rule_name.trim(),
        enabled: form.enabled ? 1 : 0,
        reference_doctype: form.reference_doctype,
        event: form.event,
        context_filter: form.context_filter || "",
        rule_scope: form.rule_scope,
        seller_profile: form.rule_scope === "Per-Seller" ? form.seller_profile : "",
        owner_role: form.owner_role,
        priority: Number(form.priority),
        condition: form.condition || "",
        condition_builder: form.condition_builder || "",
        action_type: form.action_type,
        action_template: form.action_template || "",
      };
      await saveRule(payload, ruleName.value);
      goBack();
    } catch {
      /* toast composable tarafından */
    } finally {
      saving.value = false;
    }
  }

  async function loadSellers() {
    if (isSellerMode.value) return;
    try {
      const res = await api.getList("Admin Seller Profile", {
        fields: ["name", "seller_name"],
        order_by: "seller_name asc",
        limit_page_length: 200,
      });
      sellers.value = res.data || [];
    } catch {
      sellers.value = [];
    }
  }

  async function loadTemplates() {
    if (isSellerMode.value) return;
    templates.value = await fetchActionTemplates();
  }

  // Düzenleme modu: ECA Rule doc'unu sihirbaz state'ine geri yükle.
  function hydrateWizardFromDoc(doc) {
    form.rule_name = doc.rule_name || "";
    form.bulk_import = doc.context_filter === "bulk_import";
    matchMode.value = "all";
    conditionRows.value = [];
    try {
      const builder = doc.condition_builder ? JSON.parse(doc.condition_builder) : null;
      if (builder) {
        matchMode.value = builder.match === "any" ? "any" : "all";
        conditionRows.value = buildWizardConditionRows(builder.conditions);
      }
    } catch {
      /* bozuk JSON — boş başla */
    }
    if (!conditionRows.value.length) conditionRows.value = [makeRow()];
    // action_type -> sihirbaz eylem anahtarı. discount/markup_price backend'de field_update'e
    // derlendiği için ayırt edilemez; düzenlemede set_field gösterilir, paramları boş başlar.
    const map = { field_update: "set_field", email: "email", reject_row: "reject_row" };
    applyAction(map[doc.action_type] || "discount_price", {});
  }

  async function loadRuleAdmin(doc) {
    Object.assign(form, {
      rule_name: doc.rule_name || "",
      enabled: doc.enabled ?? 1,
      reference_doctype: doc.reference_doctype || "Listing",
      event: doc.event || "before_save",
      context_filter: doc.context_filter || "",
      rule_scope: doc.rule_scope || "Per-Seller",
      seller_profile: doc.seller_profile || "",
      owner_role: doc.owner_role || "Marketplace Admin",
      priority: doc.priority ?? 1100,
      condition: doc.condition || "",
      condition_builder: doc.condition_builder || "",
      action_type: doc.action_type || "field_update",
      action_template: doc.action_template || "",
    });
  }

  async function loadRule() {
    if (!ruleName.value) return;
    loadingDoc.value = true;
    try {
      const doc = await getRule(ruleName.value);
      if (!doc) return;
      if (isSellerMode.value) hydrateWizardFromDoc(doc);
      else await loadRuleAdmin(doc);
    } finally {
      loadingDoc.value = false;
    }
  }

  function setDefaultsForAdminNew() {
    const scopeQuery = route.query?.scope;
    if (scopeQuery === "Platform") {
      form.rule_scope = "Platform";
      form.owner_role = "Marketplace Admin";
      form.priority = 1100;
    } else {
      form.rule_scope = "Per-Seller";
      form.owner_role = "Marketplace Admin";
      form.priority = 500;
    }
  }

  watch(
    () => form.action_type,
    () => {
      if (form.action_template) {
        const tpl = templates.value.find((x) => x.name === form.action_template);
        if (tpl && tpl.action_type && tpl.action_type !== form.action_type) form.action_template = "";
      }
    }
  );

  onMounted(async () => {
    await Promise.all([loadSellers(), loadTemplates()]);
    if (isSellerMode.value) {
      const s = await getRuleSchema();
      schema.fields = s.fields || [];
      schema.actions = s.actions || [];
      schema.writable_fields = s.writable_fields || [];
    }
    if (isNew.value) {
      if (isSellerMode.value) {
        showTemplatePicker.value = true;
        conditionRows.value = [makeRow()];
        actionParams.percent = 10;
      } else {
        setDefaultsForAdminNew();
      }
    } else {
      await loadRule();
    }
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .eca-form-view {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .eca-form-header {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid $l-border;
    color: $l-text-700;
    font-size: 12px;
    border-radius: 6px;
    height: 32px;
    padding: 0 12px;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: $l-bg-subtle;
    }

    @include dark {
      border-color: $d-border;
      color: $d-text;

      &:hover {
        background: $d-bg-hover;
      }
    }
  }

  .eca-form-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .eca-form-subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    color: $l-text-500;
    max-width: 640px;

    @include dark {
      color: $d-text-muted;
    }
  }

  .eca-loading {
    padding: 48px;
    text-align: center;
    color: $l-text-500;
  }

  // ── Sihirbaz kartı ──────────────────────────────────────────────────────────
  .wiz-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 760px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 12px;
    padding: 24px;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .wiz-card-title {
    font-size: 16px;
    font-weight: 650;
    margin: 0;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .wiz-card-desc {
    margin: -8px 0 0;
    font-size: 13px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .tpl-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 11px;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  .tpl {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    text-align: left;
    padding: 13px;
    border: 1px solid $l-border;
    border-radius: 11px;
    background: $l-bg-subtle;
    cursor: pointer;
    transition:
      border-color $t-base,
      background $t-base;

    &:hover {
      border-color: $brand;
    }

    &.sel {
      border-color: $brand;
      background: rgba($brand, 0.08);
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .tpl-ic {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: rgba($brand, 0.16);
    color: $brand;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tpl-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tpl-tt {
    font-size: 13px;
    font-weight: 650;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .tpl-td {
    font-size: 11.5px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .stepbox {
    border: 1px solid $l-border;
    border-radius: 12px;
    padding: 15px;
    background: $l-bg-subtle;
    display: flex;
    flex-direction: column;
    gap: 10px;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .step-title {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13.5px;
    font-weight: 650;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .stepnum {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: $brand;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }

  .step-hint {
    margin: -6px 0 0 31px;
    font-size: 11.5px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .cond-match {
    display: inline-flex;
    gap: 6px;
  }

  .seg {
    font-size: 11.5px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid $l-border;
    color: $l-text-500;
    background: $l-bg;
    cursor: pointer;
    transition: all $t-base;

    &.on {
      background: rgba($brand, 0.12);
      color: $brand;
      border-color: rgba($brand, 0.5);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-muted;
    }
  }

  .cond-row {
    display: grid;
    grid-template-columns: 1fr 0.9fr 1fr auto;
    gap: 8px;
    align-items: center;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  .cond-novalue {
    color: $l-text-500;
    text-align: center;
  }

  .cond-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid $l-border;
    border-radius: 6px;
    background: transparent;
    color: $c-error;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: rgba($c-error, 0.1);
    }

    @include dark {
      border-color: $d-border;
    }
  }

  .add-cond {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border: 1px dashed $l-border;
    border-radius: 6px;
    background: transparent;
    color: $brand;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: rgba($brand, 0.08);
    }

    @include dark {
      border-color: $d-border;
    }
  }

  .preview {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 13px;
    border-radius: 10px;
    background: rgba($c-success, 0.08);
    border: 1px solid rgba($c-success, 0.3);
    font-size: 12.5px;
    color: $l-text-700;

    svg {
      color: $c-success;
      flex-shrink: 0;
    }

    b {
      color: darken($c-success, 12%);
    }

    &.is-error {
      background: rgba($c-error, 0.08);
      border-color: rgba($c-error, 0.3);

      svg {
        color: $c-error;
      }
    }

    @include dark {
      color: $d-text;
    }
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .action-select {
    min-width: 220px;
    flex: 0 0 auto;
  }

  .action-params {
    display: flex;
    gap: 8px;
    align-items: center;
    flex: 1;
    min-width: 160px;
  }

  .param-pct {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .pct-input {
    width: 70px;
    text-align: center;
  }

  .bulk-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: $l-text-700;

    @include dark {
      color: $d-text;
    }
  }

  .adv {
    border: 1px dashed $l-border;
    border-radius: 10px;
    padding: 11px 13px;
    background: $l-bg-subtle;

    summary {
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      color: $l-text-500;
    }

    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
    }
  }

  .adv-hint {
    margin: 8px 0 6px;
    font-size: 11.5px;
    color: $l-text-500;
  }

  .adv-code {
    display: block;
    white-space: pre-wrap;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
    color: $brand;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 10px 12px;

    @include dark {
      background: $d-bg;
      border-color: $d-border-inner;
    }
  }

  .wiz-actions {
    display: flex;
    gap: 9px;
  }

  // ── Admin form (mevcut) ──────────────────────────────────────────────────────
  .eca-form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 12px;
    padding: 24px;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }

    @media (max-width: 880px) {
      grid-template-columns: 1fr;
    }
  }

  .eca-form-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
      font-size: 12px;
      font-weight: 600;
      color: $l-text-700;

      @include dark {
        color: $d-text;
      }
    }
  }

  .field-inline {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .field-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid $l-border;
    border-radius: 6px;
    font-size: 13px;
    background: $l-bg;
    color: $l-text-900;
    outline: none;
    transition:
      border-color $t-base,
      box-shadow $t-base;

    &:focus {
      border-color: $brand;
      box-shadow: 0 0 0 2px rgba($brand, 0.18);
    }

    &.mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      line-height: 1.6;
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text;
    }
  }

  textarea.field-input {
    resize: vertical;
    min-height: 80px;
  }

  .field-hint {
    font-size: 11px;
    color: $l-text-500;
    margin: 2px 0 0;

    @include dark {
      color: $d-text-muted;
    }
  }

  .checkbox-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: $l-text-700;
    cursor: pointer;

    @include dark {
      color: $d-text;
    }
  }

  .condition-test {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: $l-bg-subtle;
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 12px;

    label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: $l-text-500;
      letter-spacing: 0.04em;
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .test-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .test-result {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 999px;

    &.is-success {
      background: rgba($c-success, 0.15);
      color: darken($c-success, 12%);
    }

    &.is-warn {
      background: rgba(#f59e0b, 0.15);
      color: #92400e;
    }

    &.is-error {
      background: rgba($c-error, 0.15);
      color: darken($c-error, 8%);
    }
  }

  .form-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid $l-border;

    @include dark {
      border-top-color: $d-border-inner;
    }
  }

  .btn-outline {
    height: 34px;
    padding: 0 14px;
    background: transparent;
    color: $l-text-700;
    border: 1px solid $l-border;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: $l-bg-subtle;
    }

    @include dark {
      color: $d-text;
      border-color: $d-border;

      &:hover {
        background: $d-bg-hover;
      }
    }
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 16px;
    background: $brand;
    color: #fff;
    border: 0;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: darken(#7c3aed, 6%);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .link {
    color: $brand;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
</style>
