<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ConditionRow from "@/views/eca/ConditionRow.vue";
  import { useEcaRule } from "@/composables/useEcaRule";

  const { t } = useI18n();
  const { compilePreview } = useEcaRule();

  // builderJson: kuralı saklayan ham JSON string (form.condition_builder).
  // python: derlenmiş ifade (form.condition'a yazılır).
  const builderJson = defineModel("builderJson", { type: String, default: "" });
  const compiledPython = defineModel("python", { type: String, default: "" });

  const props = defineProps({
    referenceDoctype: { type: String, default: "Listing" },
    ownerRole: { type: String, default: "Seller" },
  });

  // Alan tanımları — fieldtype operator setini belirler.
  // Link alanların "doctype"u değer dropdown'unu doldurur.
  // Seller görünür alanlar; admin de aynı seti kullanır (backend ayrıca kısıtlar).
  const FIELD_DEFS = [
    { name: "base_price", type: "number" },
    { name: "selling_price", type: "number" },
    { name: "discount_percentage", type: "number" },
    { name: "stock_qty", type: "number" },
    { name: "min_order_qty", type: "number" },
    { name: "weight", type: "number" },
    {
      name: "status",
      type: "select",
      options: ["Pending", "Draft", "Active", "Paused", "Out of Stock", "Archived", "Rejected"],
    },
    { name: "brand", type: "link", doctype: "Brand" },
    { name: "product_category", type: "link", doctype: "Product Category" },
    { name: "title", type: "text" },
    { name: "sku", type: "text" },
    { name: "short_description", type: "text" },
    { name: "barcode", type: "text" },
    { name: "tags", type: "text" },
    { name: "primary_image", type: "text" },
  ];

  const OPS_BY_TYPE = {
    number: ["gt", "lt", "gte", "lte", "eq", "neq", "is_set", "is_empty"],
    text: ["eq", "neq", "contains", "not_contains", "is_set", "is_empty"],
    select: ["eq", "neq", "in_list", "not_in_list", "is_set", "is_empty"],
    link: ["eq", "neq", "in_list", "not_in_list", "is_set", "is_empty"],
  };

  const NO_VALUE_OPS = new Set(["is_set", "is_empty"]);

  const fieldDef = (name) => FIELD_DEFS.find((f) => f.name === name) || FIELD_DEFS[0];

  const match = ref("all");
  const rows = ref([]);
  // Üst seviyeye eklenen alt gruplar — her grup kendi match + koşul satırlarını taşır.
  // Backend condition_compiler nested "groups" şemasını destekliyor (tek seviye yeterli).
  const groups = ref([]);
  const previewSentence = ref("");
  const previewError = ref("");

  // Link alan değer seçenekleri — doctype başına cache.
  const linkOptions = ref({});

  async function loadLinkOptions(doctype) {
    if (!doctype || linkOptions.value[doctype]) return;
    try {
      const res = await api.getList(doctype, {
        fields: ["name"],
        order_by: "name asc",
        limit_page_length: 200,
      });
      linkOptions.value = { ...linkOptions.value, [doctype]: (res.data || []).map((r) => r.name) };
    } catch {
      linkOptions.value = { ...linkOptions.value, [doctype]: [] };
    }
  }

  function emptyRow() {
    return { field: "base_price", op: "gt", value: "" };
  }

  function addRow() {
    rows.value.push(emptyRow());
  }

  function removeRow(idx) {
    rows.value.splice(idx, 1);
  }

  function addGroup() {
    groups.value.push({ match: "any", rows: [emptyRow()] });
  }

  function removeGroup(idx) {
    groups.value.splice(idx, 1);
  }

  function addGroupRow(group) {
    group.rows.push(emptyRow());
  }

  function removeGroupRow(group, idx) {
    group.rows.splice(idx, 1);
  }

  function onFieldChange(row) {
    const def = fieldDef(row.field);
    const allowed = OPS_BY_TYPE[def.type];
    if (!allowed.includes(row.op)) row.op = allowed[0];
    row.value = "";
    if (def.type === "link") loadLinkOptions(def.doctype);
  }

  // Tek bir koşul satırını backend şemasına serialize et (sayı/liste/string normalize).
  function serializeRow(r) {
    const def = fieldDef(r.field);
    const cond = { field: r.field, op: r.op };
    if (NO_VALUE_OPS.has(r.op)) return cond;
    if (r.op === "in_list" || r.op === "not_in_list") {
      cond.value = String(r.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (def.type === "number") {
      cond.value = Number(r.value);
    } else {
      cond.value = r.value ?? "";
    }
    return cond;
  }

  const serializeRows = (list) => list.filter((r) => r.field && r.op).map(serializeRow);

  // Builder modelini backend condition_compiler şemasına serialize et.
  function buildModel() {
    const model = { match: match.value, conditions: serializeRows(rows.value) };
    const serializedGroups = groups.value
      .map((g) => ({ match: g.match, conditions: serializeRows(g.rows) }))
      .filter((g) => g.conditions.length > 0);
    if (serializedGroups.length) model.groups = serializedGroups;
    return model;
  }

  // Serialize edilmiş koşulu düzenlenebilir satır state'ine çevir.
  function hydrateRow(c) {
    const def = fieldDef(c.field);
    if (def.type === "link") loadLinkOptions(def.doctype);
    const value = Array.isArray(c.value) ? c.value.join(", ") : (c.value ?? "");
    return { field: c.field, op: c.op, value: String(value) };
  }

  // builderJson string'inden başlangıç state'i kur (düzenleme modu).
  function hydrate(raw) {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      match.value = parsed.match === "any" ? "any" : "all";
      rows.value = (parsed.conditions || []).map(hydrateRow);
      groups.value = (parsed.groups || []).map((g) => ({
        match: g.match === "all" ? "all" : "any",
        rows: (g.conditions || []).map(hydrateRow),
      }));
    } catch {
      /* bozuk JSON — boş başla */
    }
  }

  // rows/groups/match değişince derle + iki model'i güncelle.
  let debounce = null;
  watch(
    [rows, groups, match],
    () => {
      const model = buildModel();
      const hasAny = model.conditions.length > 0 || (model.groups && model.groups.length > 0);
      const json = hasAny ? JSON.stringify(model) : "";
      builderJson.value = json;
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        if (!json) {
          compiledPython.value = "";
          previewSentence.value = "";
          previewError.value = "";
          return;
        }
        const res = await compilePreview(json, props.referenceDoctype);
        previewError.value = res.error || "";
        if (!res.error) {
          compiledPython.value = res.python;
          previewSentence.value = res.sentence;
        }
      }, 300);
    },
    { deep: true }
  );

  hydrate(builderJson.value);

  const hasRows = computed(() => rows.value.length > 0 || groups.value.length > 0);
</script>

<template>
  <div class="condition-builder">
    <div class="cb-match">
      <span class="cb-match-label">{{ t("conditionBuilder.matchLabel") }}</span>
      <label class="cb-radio">
        <input v-model="match" type="radio" value="all" />
        <span>{{ t("conditionBuilder.matchAll") }}</span>
      </label>
      <label class="cb-radio">
        <input v-model="match" type="radio" value="any" />
        <span>{{ t("conditionBuilder.matchAny") }}</span>
      </label>
    </div>

    <ConditionRow
      v-for="(row, idx) in rows"
      :key="idx"
      v-model:row="rows[idx]"
      :field-defs="FIELD_DEFS"
      :ops-by-type="OPS_BY_TYPE"
      :no-value-ops="NO_VALUE_OPS"
      :link-options="linkOptions"
      @field-change="onFieldChange(row)"
      @remove="removeRow(idx)"
    />

    <div v-for="(group, gIdx) in groups" :key="'g' + gIdx" class="cb-group">
      <div class="cb-group-head">
        <span class="cb-match-label">{{ t("conditionBuilder.groupMatchLabel") }}</span>
        <label class="cb-radio">
          <input v-model="group.match" type="radio" value="all" />
          <span>{{ t("conditionBuilder.matchAll") }}</span>
        </label>
        <label class="cb-radio">
          <input v-model="group.match" type="radio" value="any" />
          <span>{{ t("conditionBuilder.matchAny") }}</span>
        </label>
        <button
          type="button"
          class="cb-remove cb-group-remove"
          :title="t('conditionBuilder.removeGroup')"
          @click="removeGroup(gIdx)"
        >
          <AppIcon name="trash-2" :size="14" />
        </button>
      </div>

      <ConditionRow
        v-for="(row, idx) in group.rows"
        :key="idx"
        v-model:row="group.rows[idx]"
        :field-defs="FIELD_DEFS"
        :ops-by-type="OPS_BY_TYPE"
        :no-value-ops="NO_VALUE_OPS"
        :link-options="linkOptions"
        @field-change="onFieldChange(row)"
        @remove="removeGroupRow(group, idx)"
      />

      <button type="button" class="cb-add cb-add-sub" @click="addGroupRow(group)">
        <AppIcon name="plus" :size="14" />
        {{ t("conditionBuilder.addCondition") }}
      </button>
    </div>

    <div class="cb-actions">
      <button type="button" class="cb-add" @click="addRow">
        <AppIcon name="plus" :size="14" />
        {{ t("conditionBuilder.addCondition") }}
      </button>
      <button type="button" class="cb-add" @click="addGroup">
        <AppIcon name="plus" :size="14" />
        {{ t("conditionBuilder.addGroup") }}
      </button>
    </div>

    <div v-if="hasRows" class="cb-preview">
      <div v-if="previewError" class="cb-preview-error">{{ previewError }}</div>
      <template v-else>
        <p v-if="previewSentence" class="cb-sentence">{{ previewSentence }}</p>
        <code v-if="compiledPython" class="cb-python">{{ compiledPython }}</code>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .condition-builder {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cb-match {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 12px;
  }

  .cb-match-label {
    font-weight: 600;
    color: $l-text-700;

    @include dark {
      color: $d-text;
    }
  }

  .cb-radio {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    color: $l-text-700;

    @include dark {
      color: $d-text;
    }
  }

  .cb-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border: 1px solid $l-border;
    border-left: 3px solid $brand;
    border-radius: 8px;
    background: $l-bg-subtle;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      border-left-color: $brand;
    }
  }

  .cb-group-head {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 12px;
  }

  .cb-group-remove {
    margin-left: auto;
  }

  .cb-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .cb-add-sub {
    align-self: flex-start;
  }

  .cb-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
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

  .cb-add {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
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

  .cb-preview {
    background: $l-bg-subtle;
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .cb-sentence {
    margin: 0 0 6px;
    color: $l-text-700;

    @include dark {
      color: $d-text;
    }
  }

  .cb-python {
    display: block;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: $l-text-500;
    word-break: break-all;

    @include dark {
      color: $d-text-muted;
    }
  }

  .cb-preview-error {
    color: $c-error;
  }
</style>
