<script setup>
  /**
   * Sprint 2 - S16 Data Masking Widget
   *
   * permlevel=1 alanlarda (tax_id, IBAN, vb.) varsayilan olarak maskeli goster.
   * Goz-toggle ikonu ile tam degere gecis. Tiklama olayi audit icin loglanir.
   *
   * Props:
   *   - modelValue: gosterilecek deger
   *   - mode: "iban" | "tax_id" | "generic"
   *   - label: alan etiketi (audit log icin)
   *   - readonly: salt okuma mu
   *
   * IBAN: ilk 4 + son 4 hane, ortasi *.
   * TaxId: son 4 hane, oncesi *.
   * Generic: tum karakterler *.
   */
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";

  const { t } = useI18n();

  const props = defineProps({
    modelValue: { type: String, default: "" },
    mode: { type: String, default: "generic" },
    label: { type: String, default: "" },
    readonly: { type: Boolean, default: false },
    field: { type: Object, default: () => ({}) },
    formData: { type: Object, default: () => ({}) },
  });

  const emit = defineEmits(["update:modelValue"]);

  const visible = ref(false);

  const maskedValue = computed(() => {
    const val = props.modelValue || "";
    if (!val) return "";
    if (props.mode === "iban" && val.length >= 8) {
      return val.slice(0, 4) + "*".repeat(Math.max(0, val.length - 8)) + val.slice(-4);
    }
    if (props.mode === "tax_id" && val.length >= 4) {
      return "*".repeat(Math.max(0, val.length - 4)) + val.slice(-4);
    }
    return "*".repeat(val.length);
  });

  const displayValue = computed(() => (visible.value ? props.modelValue : maskedValue.value));

  function toggle() {
    visible.value = !visible.value;
    if (visible.value) {
      const auditLabel = props.label || props.field?.label || props.field?.fieldname || "field";
      // F-041: Server-side PII reveal audit log — console.warn yetersiz
      const doctype = props.formData?.doctype || "";
      const docname = props.formData?.name || "";
      api.call("tradehub_core.audit.log.log_pii_reveal", {
        doctype,
        name: docname,
        field: props.field?.fieldname || auditLabel,
      }).catch(() => {
        // Audit log başarısız olursa reveal'i engelleme
      });
    }
  }

  function onInput(event) {
    if (props.readonly) return;
    emit("update:modelValue", event.target.value);
  }
</script>

<template>
  <div class="data-masking-field">
    <label v-if="label" class="dm-label">{{ label }}</label>
    <div class="dm-input-wrapper">
      <input
        :value="displayValue"
        :readonly="readonly"
        type="text"
        class="dm-input"
        @input="onInput"
      />
      <button
        type="button"
        class="dm-toggle"
        :title="visible ? t('dataMaskingField.hide') : t('dataMaskingField.show')"
        @click="toggle"
      >
        {{ visible ? t("dataMaskingField.hide") : t("dataMaskingField.show") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
  .data-masking-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .dm-label {
    font-size: 12px;
    color: #6b7280;
  }
  .dm-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 4px 8px;
    background: #fff;
  }
  .dm-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 13px;
  }
  .dm-toggle {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 3px;
    padding: 2px 8px;
    cursor: pointer;
    font-size: 11px;
    color: #4b5563;
  }
  .dm-toggle:hover {
    background: #e5e7eb;
  }
</style>
