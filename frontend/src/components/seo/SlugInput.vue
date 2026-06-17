<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import { useSeoEditorStore } from "@/stores/seoEditor";
  import { useSlugCheck } from "@/composables/useSlugCheck";

  const { t } = useI18n();

  const props = defineProps({
    modelValue: { type: String, default: "" },
    // Kilitli mod: input düzenlenemez, slug başlıktan otomatik türetilir.
    // Uniqueness/öneri UI'ı gizlenir (kullanıcı override edemez, backend dedup eder).
    disabled: { type: Boolean, default: false },
  });

  const emit = defineEmits(["update:modelValue"]);

  const store = useSeoEditorStore();
  const { check } = useSlugCheck();

  function onInput(e) {
    const value = e.target.value;
    emit("update:modelValue", value);
    check(value);
  }

  const statusIcon = computed(() => {
    if (store.slugStatus === "checking") return "…";
    if (store.slugStatus === "unique") return "✓";
    if (store.slugStatus === "duplicate") return "✗";
    return "";
  });

  const statusColor = computed(() => {
    if (store.slugStatus === "unique") return "text-green-500";
    if (store.slugStatus === "duplicate") return "text-red-500";
    return "text-gray-400";
  });

  const inputBorderClass = computed(() => {
    if (store.slugStatus === "duplicate") return "border-red-300 focus:ring-red-200";
    if (store.slugStatus === "unique") return "border-green-300 focus:ring-green-200";
    return "border-gray-200 focus:ring-blue-200";
  });

  function applySuggestion() {
    if (store.slugSuggestion) {
      emit("update:modelValue", store.slugSuggestion);
      check(store.slugSuggestion);
    }
  }

  // SEO için önerilen slug aralığı: 3-60 karakter
  const MIN_LEN = 3;
  const MAX_LEN = 60;
  const charCount = computed(() => (props.modelValue || "").length);
  const counterColor = computed(() => {
    if (charCount.value === 0) return "text-gray-400";
    if (charCount.value < MIN_LEN || charCount.value > MAX_LEN) return "text-red-500";
    return "text-gray-500";
  });
</script>

<template>
  <div>
    <div class="relative">
      <input
        type="text"
        :value="modelValue"
        :disabled="disabled"
        :readonly="disabled"
        class="w-full px-3 py-2 pr-8 text-sm border rounded-md focus:outline-none focus:ring-2 transition-colors"
        :class="
          disabled
            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
            : inputBorderClass
        "
        :placeholder="t('slugInput.placeholder')"
        @input="onInput"
      />
      <span
        v-if="!disabled"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
        :class="statusColor"
      >
        {{ statusIcon }}
      </span>
    </div>
    <p class="text-xs mt-1" :class="counterColor">
      {{ t("slugInput.charCount", { count: charCount, max: MAX_LEN }) }}
      <span v-if="charCount > 0 && charCount < MIN_LEN" class="ml-1">
        {{ t("slugInput.recommendedMin", { min: MIN_LEN }) }}
      </span>
      <span v-else-if="charCount > MAX_LEN" class="ml-1">{{ t("slugInput.limitExceeded") }}</span>
    </p>
    <p
      v-if="!disabled && store.slugStatus === 'duplicate' && store.slugSuggestion"
      class="text-xs text-red-500 mt-1"
    >
      {{ t("slugInput.alreadyUsed", { slug: modelValue }) }}
      <button type="button" class="underline ml-1 font-medium" @click="applySuggestion">
        {{ t("slugInput.useSuggestion", { slug: store.slugSuggestion }) }}
      </button>
    </p>
  </div>
</template>
