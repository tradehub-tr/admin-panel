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
            <!-- gray-400 beyazda 2.54:1 idi — küçük metin eşiği 4.5:1 (WCAG 1.4.3).
                 `scope="col"` yoksa okuyucu başlık-hücre ilişkisini tahmin eder
                 (WCAG 1.3.1). -->
            <th
              scope="col"
              class="w-8 px-2 py-2 text-gray-500 dark:text-gray-400 font-medium text-center"
            >
              #
            </th>
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              class="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap"
            >
              <!-- red-400 beyazda ~2.9:1 idi — küçük metin eşiği 4.5:1 (1.4.3). -->
              {{ col.label
              }}<span v-if="col.reqd" class="text-red-600 dark:text-red-400 ml-0.5">*</span>
            </th>
            <th scope="col" class="w-8 px-2 py-2"></th>
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
                   kolon başlığından verilir (WCAG 3.3.2 / 4.1.2).
                   Metin girdisi elle kurulmuş Tailwind zinciri yerine ORTAK
                   `.form-input-sm`e bağlandı: eski zincir `focus:outline-none`
                   ile odağı silip yerine 1px `brand-400` halkası (1.54:1)
                   koyuyordu — eşik 3:1 (WCAG 1.4.11). Ortak sınıf $c-info
                   outline'ını ve okunur placeholder rengini devralır. -->
              <LinkInput
                v-if="col.type === 'link' && col.doctype"
                :model-value="row[col.key]"
                :doctype="col.doctype"
                :placeholder="col.placeholder || col.label"
                :aria-label="col.label"
                :required="!!col.reqd"
                :disabled="disabled"
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
                :disabled="disabled"
                class="form-input-sm w-full min-w-[80px] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </td>
            <td class="px-2 py-1.5 text-center">
              <!-- 32px hedef (2.5.8, geri-ok deseni); -my-1 satır yüksekliğini korur. -->
              <button
                v-if="!disabled"
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
      v-if="!disabled"
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
    // Salt-okunur mod: hücre girdileri kilitlenir, satır ekle/sil kalkar.
    // Kilit tek prop'tan geçsin ki yeni kontrol tipi de aynı kapıya uysun.
    disabled: { type: Boolean, default: false },
  });
  const emit = defineEmits(["update:modelValue"]);

  const hasRequired = computed(() => props.columns.some((col) => col.reqd));

  // `disabled` kontrolü bugün ULAŞILAMAZ — tetikleyiciler `v-if="!disabled"`.
  // Ucuz sigorta olarak duruyor: kontrol tipi değişirse (ör. buton gizlenmek
  // yerine `:disabled` ile kilitlenirse) mutasyon yolu yine kapalı kalır.
  function addRow() {
    if (props.disabled) return;
    const row = {};
    props.columns.forEach((col) => {
      row[col.key] = col.type === "number" ? 0 : "";
    });
    emit("update:modelValue", [...props.modelValue, row]);
  }

  // Aynı gerekçe: bugün ulaşılamaz, tip değişikliğine karşı duruyor.
  function remove(idx) {
    if (props.disabled) return;
    const updated = props.modelValue.filter((_, i) => i !== idx);
    emit("update:modelValue", updated);
  }
</script>
