<template>
  <div class="eca-form-view">
    <header class="eca-form-header">
      <button class="back-btn" @click="goBack">
        <AppIcon name="arrow-left" :size="16" />
        Geri
      </button>
      <div>
        <h1 class="eca-form-title">
          {{ isNew ? "Yeni Kural" : "Kuralı Düzenle" }}
        </h1>
        <p class="eca-form-subtitle">
          {{
            isSellerMode
              ? "Bu kural sadece sizin ürünlerinizde, sadece toplu yükleme sırasında çalışır."
              : "Platform veya satıcı kuralı oluştur / güncelle."
          }}
        </p>
      </div>
    </header>

    <div v-if="loadingDoc" class="eca-loading">Yükleniyor...</div>

    <form v-else class="eca-form-grid" @submit.prevent="onSubmit">
      <section class="eca-form-col">
        <div class="field">
          <label>Kural Adı</label>
          <input v-model="form.rule_name" type="text" class="field-input" required />
        </div>

        <div class="field">
          <label>Hedef DocType</label>
          <select v-model="form.reference_doctype" class="field-input" required>
            <option value="Listing">Listing</option>
            <option value="Bulk Import Job">Bulk Import Job</option>
            <option value="Order">Order</option>
          </select>
        </div>

        <div class="field">
          <label>Olay</label>
          <select v-model="form.event" class="field-input" required>
            <option value="before_save">before_save — kaydedilirken</option>
            <option value="after_insert">after_insert — yaratıldıktan sonra</option>
            <option value="on_update">on_update — güncellenirken</option>
            <option value="on_submit">on_submit — submit edilirken</option>
            <option value="on_cancel">on_cancel — iptal edilirken</option>
          </select>
        </div>

        <div class="field-inline">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="form.context_filter === 'bulk_import'"
              @change="onBulkImportToggle($event.target.checked)"
            />
            <span>Sadece toplu yükleme sırasında çalışsın</span>
          </label>
        </div>

        <div v-if="!isSellerMode" class="field">
          <label>Kapsam</label>
          <BaseSwitch
            v-model="form.rule_scope"
            on-value="Per-Seller"
            off-value="Platform"
            label="Belirli bir satıcıya özel"
            description="Kapalı = Platform (tüm satıcılar). Açık = sadece seçilen satıcı."
            @update:model-value="onScopeChange"
          />
        </div>

        <div v-if="!isSellerMode && form.rule_scope === 'Per-Seller'" class="field">
          <label>Satıcı</label>
          <select v-model="form.seller_profile" class="field-input" required>
            <option value="">— Satıcı seç —</option>
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
            Düşük sayı önce çalışır.
            {{
              isSellerMode
                ? "Satıcı kuralları 100-999 aralığında."
                : "Platform kuralları 1000+, Per-Seller 100-999 aralığında."
            }}
          </p>
        </div>
      </section>

      <section class="eca-form-col">
        <div class="field">
          <label>Koşul (Python ifadesi)</label>
          <textarea
            v-model="form.condition"
            class="field-input mono"
            rows="4"
            placeholder="Örnek: cint(doc['min_order_qty']) >= 10"
          ></textarea>
        </div>

        <div class="condition-test">
          <label>Örnek doc JSON</label>
          <textarea
            v-model="sampleDocJson"
            class="field-input mono"
            rows="5"
            spellcheck="false"
          ></textarea>
          <div class="test-row">
            <button type="button" class="btn-outline" @click="onTest">Koşulu Test Et</button>
            <span v-if="testResult" :class="['test-result', testResultClass]">
              <template v-if="testResult.error"> Hata: {{ testResult.error }} </template>
              <template v-else-if="testResult.result"> Koşul True döndü </template>
              <template v-else> Koşul False döndü </template>
            </span>
          </div>
        </div>

        <div class="field">
          <label>Aksiyon Tipi</label>
          <select v-model="form.action_type" class="field-input" required>
            <option
              v-for="opt in actionTypeOptions"
              :key="opt.value"
              :value="opt.value"
              :disabled="opt.disabled"
            >
              {{ opt.label }}{{ opt.disabled ? " (admin only)" : "" }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Aksiyon Template'i</label>
          <select v-model="form.action_template" class="field-input">
            <option value="">— Şablon seç (opsiyonel) —</option>
            <option v-for="t in filteredTemplates" :key="t.name" :value="t.name">
              {{ t.template_name || t.name }}
            </option>
          </select>
          <p class="field-hint">
            <a class="link" :href="newTemplateLink" target="_blank" rel="noopener">
              Yeni aksiyon template'i oluştur ↗
            </a>
          </p>
        </div>
      </section>

      <div v-if="isSellerMode" class="whitelist-note">
        <strong>Yazabileceğin alanlar:</strong>
        {{ allowedFields.join(", ") }}.<br />
        <strong>Yasak alanlar:</strong>
        status, admin_review_flag, seller_profile, internal_score (sistem alanları).
      </div>

      <div class="form-actions">
        <button type="button" class="btn-outline" @click="goBack">İptal</button>
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? "Kaydediliyor..." : isNew ? "Kaydet ve Etkinleştir" : "Güncelle" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
  import { computed, onMounted, reactive, ref, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { storeToRefs } from "pinia";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import BaseSwitch from "@/components/common/BaseSwitch.vue";
  import { useAuthStore } from "@/stores/auth";
  import { useEcaRule } from "@/composables/useEcaRule";
  import { useToast } from "@/composables/useToast";

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const authStore = useAuthStore();
  const { isAdmin } = storeToRefs(authStore);

  const { getRule, saveRule, testCondition, fetchActionTemplates } = useEcaRule();

  const ALLOWED_SELLER_FIELDS = [
    "title",
    "sku",
    "base_price",
    "selling_price",
    "stock_qty",
    "primary_image",
    "product_category",
    "brand",
    "short_description",
    "description",
    "tags",
    "weight",
    "min_order_qty",
    "barcode",
    "discount_percentage",
  ];

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

  const priorityMin = computed(() => (isSellerMode.value ? 100 : 1));
  const priorityMax = computed(() => (isSellerMode.value ? 999 : 99999));
  const priorityLabel = computed(() =>
    isSellerMode.value ? "Öncelik (100-999)" : "Öncelik (1000+ platform için)"
  );

  const SELLER_DISABLED_ACTIONS = new Set(["custom_script", "create_document"]);
  const ALL_ACTION_TYPES = [
    { value: "field_update", label: "Field Update (alanı güncelle)" },
    { value: "email", label: "Email (bilgilendirme)" },
    { value: "webhook", label: "Webhook (URL'e POST)" },
    { value: "reject_row", label: "Reject Row (satırı reddet)" },
    { value: "create_document", label: "Create Document" },
    { value: "custom_script", label: "Custom Script (Python sandbox)" },
  ];

  const actionTypeOptions = computed(() => {
    return ALL_ACTION_TYPES.map((o) => ({
      ...o,
      disabled: isSellerMode.value && SELLER_DISABLED_ACTIONS.has(o.value),
    }));
  });

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
    action_type: "field_update",
    action_template: "",
  });

  const sampleDocJson = ref(
    JSON.stringify(
      {
        base_price: 1500,
        stock_qty: 100,
        min_order_qty: 12,
        title: "Test Ürün",
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
    return templates.value.filter((t) => !t.action_type || t.action_type === form.action_type);
  });

  const newTemplateLink = computed(() => {
    // Frappe Desk'te yeni Action Template form'una yönlendirme
    return "/app/eca-action-template/new?action_type=" + encodeURIComponent(form.action_type || "");
  });

  const allowedFields = computed(() => ALLOWED_SELLER_FIELDS);

  function onBulkImportToggle(checked) {
    form.context_filter = checked ? "bulk_import" : "";
  }

  function onScopeChange() {
    if (form.rule_scope === "Platform") {
      form.seller_profile = "";
      form.owner_role = "Marketplace Admin";
      if (form.priority < 1000) form.priority = 1000;
    } else {
      form.owner_role = isSellerMode.value ? "Seller" : "Marketplace Admin";
    }
  }

  async function onTest() {
    testResult.value = null;
    const res = await testCondition(
      form.condition || "",
      sampleDocJson.value || "{}",
      ownerRole.value
    );
    testResult.value = res;
  }

  function goBack() {
    router.push(isSellerMode.value ? "/my-eca-rules" : "/eca-rules");
  }

  function validate() {
    if (!form.rule_name?.trim()) {
      toast.error("Kural adı zorunlu");
      return false;
    }
    if (isSellerMode.value && SELLER_DISABLED_ACTIONS.has(form.action_type)) {
      toast.error("Bu aksiyon tipi satıcılar için kapalı");
      return false;
    }
    if (form.rule_scope === "Per-Seller" && !isSellerMode.value && !form.seller_profile) {
      toast.error("Per-Seller kuralında satıcı seçmelisin");
      return false;
    }
    const p = Number(form.priority);
    if (Number.isNaN(p) || p < priorityMin.value || p > priorityMax.value) {
      toast.error(`Öncelik ${priorityMin.value}-${priorityMax.value} aralığında olmalı`);
      return false;
    }
    return true;
  }

  async function onSubmit() {
    if (!validate()) return;

    saving.value = true;
    try {
      const payload = {
        rule_name: form.rule_name.trim(),
        enabled: form.enabled ? 1 : 0,
        reference_doctype: form.reference_doctype,
        event: form.event,
        context_filter: form.context_filter || "",
        rule_scope: isSellerMode.value ? "Per-Seller" : form.rule_scope,
        seller_profile: form.rule_scope === "Per-Seller" ? form.seller_profile : "",
        owner_role: isSellerMode.value ? "Seller" : form.owner_role,
        priority: Number(form.priority),
        condition: form.condition || "",
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
    templates.value = await fetchActionTemplates();
  }

  async function loadRule() {
    if (!ruleName.value) return;
    loadingDoc.value = true;
    try {
      const doc = await getRule(ruleName.value);
      if (doc) {
        Object.assign(form, {
          rule_name: doc.rule_name || "",
          enabled: doc.enabled ?? 1,
          reference_doctype: doc.reference_doctype || "Listing",
          event: doc.event || "before_save",
          context_filter: doc.context_filter || "",
          rule_scope: doc.rule_scope || "Per-Seller",
          seller_profile: doc.seller_profile || "",
          owner_role: doc.owner_role || (isSellerMode.value ? "Seller" : "Marketplace Admin"),
          priority: doc.priority ?? (isSellerMode.value ? 500 : 1100),
          condition: doc.condition || "",
          action_type: doc.action_type || "field_update",
          action_template: doc.action_template || "",
        });
      }
    } finally {
      loadingDoc.value = false;
    }
  }

  function setDefaultsForNew() {
    if (isSellerMode.value) {
      form.rule_scope = "Per-Seller";
      form.owner_role = "Seller";
      form.priority = 500;
      form.action_type = "field_update";
      return;
    }
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
      // Aksiyon tipi değişince template filtresi yenilenir — eski seçim uymazsa temizle
      if (form.action_template) {
        const tpl = templates.value.find((t) => t.name === form.action_template);
        if (tpl && tpl.action_type && tpl.action_type !== form.action_type) {
          form.action_template = "";
        }
      }
    }
  );

  onMounted(async () => {
    await Promise.all([loadSellers(), loadTemplates()]);
    if (isNew.value) {
      setDefaultsForNew();
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

  .whitelist-note {
    grid-column: 1 / -1;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    color: #92400e;
    font-size: 12px;
    line-height: 1.6;
    border-radius: 8px;
    padding: 12px 14px;
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
