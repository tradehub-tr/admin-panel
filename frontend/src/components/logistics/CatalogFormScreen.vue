<template>
  <form class="space-y-6" @submit.prevent="$emit('save', draft)">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-lg font-semibold">{{ title }}</h1>
      <span v-if="isNew" class="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-700">
        {{ t("logistics.form.newRecord") }}
      </span>
      <div class="ms-auto flex gap-2">
        <button type="button" class="th-btn-outline text-sm" @click="$emit('cancel')">
          {{ t("logistics.form.cancel") }}
        </button>
        <button v-if="can.write" type="submit" class="th-btn-primary text-sm" :disabled="saving">
          {{ saving ? t("logistics.form.saving") : t("logistics.form.save") }}
        </button>
      </div>
    </div>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <div v-else-if="loading" class="space-y-3">
      <Skeleton v-for="i in 5" :key="i" variant="rect" height="52px" />
    </div>

    <template v-else>
      <!-- Alanlar sözleşmeden; ekran hangi alanların olduğunu BİLMİYOR -->
      <div class="grid gap-4 sm:grid-cols-2">
        <label v-for="field in fields" :key="field.name" class="block">
          <span class="mb-1 block text-sm font-medium">
            {{ humanize(field.name) }}
            <span v-if="field.required" class="text-red-500" aria-hidden="true">*</span>
          </span>

          <!-- Check alanı 0/1 TAMSAYI — boolean değil (Frappe) -->
          <BaseSwitch
            v-if="field.type === 'Check'"
            v-model="draft[field.name]"
            :on-value="1"
            :off-value="0"
            :disabled="!can.write"
          />

          <AppSelect
            v-else-if="field.choices?.length"
            v-model="draft[field.name]"
            :options="field.choices.map((c) => ({ value: c, label: c }))"
            :disabled="!can.write"
          />

          <LinkInput
            v-else-if="field.type === 'Link'"
            v-model="draft[field.name]"
            :doctype="field.link"
            :disabled="!can.write"
          />

          <textarea
            v-else-if="field.type === 'Small Text'"
            v-model="draft[field.name]"
            rows="3"
            class="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            :disabled="!can.write"
          />

          <input
            v-else
            v-model="draft[field.name]"
            :type="['Int', 'Float', 'Currency'].includes(field.type) ? 'number' : 'text'"
            class="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            :disabled="!can.write"
          />

          <span v-if="field.note" class="mt-1 block text-xs text-slate-500">{{ field.note }}</span>
        </label>
      </div>

      <!-- Child tablolar — Provider Operating Channel, Carrier Service Item -->
      <section v-for="(childFields, table) in childTables" :key="table" class="space-y-2">
        <h2 class="text-sm font-semibold">{{ humanize(table) }}</h2>
        <ChildTable
          v-model="draft[table]"
          :columns="childFields.map((f) => ({ fieldname: f.name, label: humanize(f.name), fieldtype: f.type }))"
          :add-label="t('logistics.form.addRow')"
        />
      </section>
    </template>
  </form>
</template>

<script setup>
  import { computed, ref, toRaw, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppSelect from "@/components/common/AppSelect.vue";
  import BaseSwitch from "@/components/common/BaseSwitch.vue";
  import ChildTable from "@/components/common/ChildTable.vue";
  import LinkInput from "@/components/common/LinkInput.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  import ErrorState from "./ErrorState.vue";
  import { getCatalogMeta, humanize } from "./catalogMeta";

  /**
   * **M2 · Jenerik katalog formu.**
   *
   * Alan listesi ve tipleri sözleşmeden (`_catalog-meta.json`) geliyor; ekran
   * hangi kataloğu düzenlediğini bilmiyor. Kontrol tipi alan TİPİNDEN
   * seçiliyor — Check ise anahtar, Select ise açılır liste, Link ise seçici.
   *
   * `Check` alanları 0/1 TAMSAYI olarak taşınır (Frappe böyle döndürür);
   * anahtar `on-value="1"` ile bunu koruyor.
   */
  const props = defineProps({
    catalogKey: { type: String, required: true },
    title: { type: String, required: true },
    /** Düzenlenecek kayıt; boş ise yeni kayıt formu. */
    modelValue: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    error: { type: Object, default: null },
    can: { type: Object, default: () => ({ read: true, write: false }) },
  });

  defineEmits(["save", "cancel", "retry"]);

  const { t } = useI18n();

  const meta = computed(() => getCatalogMeta(props.catalogKey));
  const fields = computed(() =>
    [...meta.value.list_fields, ...meta.value.detail_fields].filter((f) => f.name !== "name")
  );
  const childTables = computed(() => meta.value.child_tables);

  const isNew = computed(() => !props.modelValue?.name);

  /**
   * Props'u doğrudan mutasyona uğratma (vue/no-mutating-props) — kopya üzerinde çalış.
   *
   * `toRaw` ŞART: parent reaktif bir nesne veriyorsa `structuredClone` Proxy'yi
   * kopyalayamaz ve `DataCloneError` fırlatır — ekran tamamen boş kalır.
   * Storybook story arg'ları da reaktif sarıldığı için bu yol her zaman sıcak.
   */
  const cloneDoc = (value) => structuredClone(toRaw(value) ?? {});

  const draft = ref(cloneDoc(props.modelValue));
  watch(
    () => props.modelValue,
    (next) => {
      draft.value = cloneDoc(next);
    },
    { deep: true }
  );
</script>
