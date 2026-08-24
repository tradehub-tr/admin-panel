<template>
  <div>
    <!-- Yıldızın anlamı bir kez, tablonun ÜSTÜNDE açıklanır: tek başına `*`
         zorunluluğu taşımaz (WCAG 3.3.2). -->
    <p v-if="hasRequired" class="mb-1.5 text-[11px] text-gray-500 dark:text-gray-400">
      {{ t("a11y.requiredFields") }}
    </p>
    <div
      v-if="modelValue.length > 0"
      class="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/8 mb-3"
    >
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-gray-50 dark:bg-white/3 border-b border-gray-200 dark:border-white/8">
            <!-- gray-400 beyazda 2.54:1 idi — küçük metin eşiği 4.5:1 (WCAG 1.4.3). -->
            <th class="w-8 px-2 py-2 text-gray-500 dark:text-gray-400 font-medium text-center">
              #
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap"
            >
              <!-- red-400 beyazda ~2.9:1 idi — küçük metin eşiği 4.5:1 (1.4.3). -->
              {{ col.label
              }}<span v-if="col.reqd" class="text-red-600 dark:text-red-400 ml-0.5">*</span>
            </th>
            <th class="w-8 px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in modelValue"
            :key="idx"
            class="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/2"
          >
            <td class="px-2 py-1.5 text-center text-gray-500 dark:text-gray-400">{{ idx + 1 }}</td>
            <td v-for="col in columns" :key="col.key" class="px-2 py-1.5">
              <!-- Hücre girdileri yalnız placeholder taşıyordu — kalıcı isim
                   kolon başlığından verilir (WCAG 3.3.2 / 4.1.2). -->
              <LinkInput
                v-if="col.type === 'link' && col.doctype"
                :model-value="row[col.key]"
                :doctype="col.doctype"
                :placeholder="col.placeholder || col.label"
                :aria-label="col.label"
                :required="!!col.reqd"
                @update:model-value="row[col.key] = $event"
              />
              <input
                v-else
                v-model="row[col.key]"
                :type="col.type === 'number' ? 'number' : 'text'"
                :step="col.type === 'number' ? 'any' : undefined"
                :placeholder="col.placeholder || col.label"
                :aria-label="col.label"
                :aria-required="col.reqd ? 'true' : undefined"
                class="w-full min-w-[80px] bg-transparent border border-gray-200 dark:border-white/10 rounded-md px-2 py-1 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:border-brand-400 placeholder-gray-400"
              />
            </td>
            <td class="px-2 py-1.5 text-center">
              <!-- 32px hedef (2.5.8, geri-ok deseni); -my-1 satır yüksekliğini korur. -->
              <button
                type="button"
                class="inline-flex items-center justify-center w-8 h-8 -my-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors rounded"
                :aria-label="t('a11y.removeRow', { row: idx + 1 })"
                @click="remove(idx)"
              >
                <AppIcon name="trash-2" :size="13" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-else
      class="text-center py-6 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/2 rounded-lg border border-dashed border-gray-200 dark:border-white/8 mb-3"
    >
      {{ t("childTable.noRecords") }}
    </div>
    <button
      type="button"
      class="flex items-center gap-1.5 text-xs text-brand-800 dark:text-brand-500 hover:text-brand-900 dark:hover:text-brand-400 font-medium transition-colors"
      @click="addRow"
    >
      <AppIcon name="plus" :size="13" :stroke-width="2.5" />
      {{ addLabel || t("childTable.addRow") }}
    </button>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import LinkInput from "@/components/common/LinkInput.vue";

  const { t } = useI18n();

  const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    columns: { type: Array, required: true },
    childDoctype: { type: String, default: "" },
    addLabel: { type: String, default: "" },
  });
  const emit = defineEmits(["update:modelValue"]);

  const hasRequired = computed(() => props.columns.some((col) => col.reqd));

  function addRow() {
    const row = {};
    props.columns.forEach((col) => {
      row[col.key] = col.type === "number" ? 0 : "";
    });
    emit("update:modelValue", [...props.modelValue, row]);
  }

  function remove(idx) {
    const updated = props.modelValue.filter((_, i) => i !== idx);
    emit("update:modelValue", updated);
  }
</script>
