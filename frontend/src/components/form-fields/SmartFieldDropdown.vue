<template>
  <div class="smart-field-dropdown">
    <select
      v-if="!loadingMeta && effectiveDoctype && options.length > 0"
      :value="modelValue"
      class="form-input"
      @change="onChange($event.target.value)"
    >
      <option value="">— Seçiniz —</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <input
      v-else-if="!effectiveDoctype"
      :value="modelValue"
      type="text"
      class="form-input opacity-60 cursor-not-allowed"
      :placeholder="placeholderNoDoctype"
      readonly
    />

    <div v-else-if="loadingMeta" class="form-input flex items-center gap-2 opacity-70">
      <i class="fas fa-spinner fa-spin text-xs text-violet-500"></i>
      <span class="text-xs">Alanlar yükleniyor…</span>
    </div>

    <div v-else class="space-y-1">
      <input
        :value="modelValue"
        type="text"
        class="form-input"
        :placeholder="placeholderEmpty"
        @input="onChange($event.target.value)"
      />
      <p class="text-[10px]" style="color: var(--th-text-tertiary)">
        {{ effectiveDoctype }} için {{ filterLabel }} alanı bulunamadı; manuel girebilirsiniz.
      </p>
    </div>

    <p
      v-if="modelValue && options.length > 0 && !options.find((o) => o.value === modelValue)"
      class="text-[10px] mt-1 text-amber-500"
    >
      <i class="fas fa-triangle-exclamation"></i>
      Seçili alan ({{ modelValue }}) {{ effectiveDoctype }} içinde yok. Yeni bir alan seçin.
    </p>
    <p v-if="loadError" class="text-[10px] mt-1 text-red-500">
      <i class="fas fa-circle-xmark"></i> {{ loadError }}
    </p>
  </div>
</template>

<script setup>
  import { ref, computed, watch, inject } from "vue";
  import api from "@/utils/api";

  const props = defineProps({
    /** Field's current value (fieldname string) */
    modelValue: { type: String, default: "" },
    /** Reactive form data — kept for backward compat; provider preferred */
    formData: { type: Object, default: () => ({}) },
    /** Field meta from DocType */
    field: { type: Object, default: () => ({}) },
    /** Optional explicit doctype override (defaults to inject/formData.source_doctype) */
    doctype: { type: String, default: null },
    /**
     * What kinds of fields to list:
     *   numeric  → Currency, Float, Int, Percent
     *   date     → Date, Datetime
     *   grouping → Select, Link, Data (categorical)
     */
    filterType: { type: String, required: true },
  });
  const emit = defineEmits(["update:modelValue"]);

  const loadingMeta = ref(false);
  const fields = ref([]);
  const loadError = ref(null);

  // Prefer injected formData ref (guaranteed reactivity) over the prop binding.
  const injectedFormData = inject("formData", null);

  const effectiveDoctype = computed(() => {
    if (props.doctype) return props.doctype;
    if (injectedFormData?.value?.source_doctype) return injectedFormData.value.source_doctype;
    return props.formData?.source_doctype || "";
  });

  const TYPE_FILTERS = {
    numeric: ["Currency", "Float", "Int", "Percent"],
    date: ["Date", "Datetime"],
    grouping: ["Select", "Link", "Data", "Small Text"],
  };

  const filterLabel = computed(
    () =>
      ({
        numeric: "sayısal",
        date: "tarih",
        grouping: "gruplanabilir",
      })[props.filterType] || ""
  );

  const placeholderNoDoctype = computed(() => "Önce Kaynak DocType seçin");
  const placeholderEmpty = computed(() => `${filterLabel.value} alan adı`);

  const options = computed(() => {
    const allowed = TYPE_FILTERS[props.filterType] || [];
    return fields.value
      .filter((f) => allowed.includes(f.fieldtype))
      .filter(
        (f) =>
          !["name", "docstatus", "idx", "parent", "parenttype", "parentfield"].includes(f.fieldname)
      )
      .map((f) => ({
        value: f.fieldname,
        label: `${f.label || f.fieldname} (${f.fieldname})`,
      }));
  });

  async function loadFields(dt) {
    if (!dt) {
      fields.value = [];
      loadError.value = null;
      return;
    }
    loadingMeta.value = true;
    loadError.value = null;
    try {
      const res = await api.getMeta(dt);
      fields.value = res?.message?.fields || [];
      if (fields.value.length === 0) {
        loadError.value = `${dt} için alan listesi boş geldi.`;
      }
    } catch (e) {
      fields.value = [];
      loadError.value = `${dt} meta alınamadı: ${e.message || e}`;
    } finally {
      loadingMeta.value = false;
    }
  }

  function onChange(val) {
    emit("update:modelValue", val);
  }

  watch(
    effectiveDoctype,
    (next, prev) => {
      if (next !== prev) loadFields(next);
    },
    { immediate: true }
  );
</script>
