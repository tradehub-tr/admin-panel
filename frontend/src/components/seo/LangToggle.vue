<script setup>
  defineProps({
    modelValue: { type: String, default: "tr" },
    // Opsiyonel dolu/eksik göstergesi: { tr: bool, en: bool, ar: bool, ru: bool }.
    // Verilirse her dil düğmesinde küçük nokta gösterilir (yeşil=dolu, gri=boş).
    filled: { type: Object, default: null },
  });
  defineEmits(["update:modelValue"]);

  const LANGS = [
    { value: "tr", label: "TR", name: "Türkçe" },
    { value: "en", label: "EN", name: "English" },
    { value: "ar", label: "AR", name: "العربية" },
    { value: "ru", label: "RU", name: "Русский" },
  ];
</script>

<template>
  <div class="inline-flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-md">
    <button
      v-for="lang in LANGS"
      :key="lang.value"
      type="button"
      class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded transition-colors"
      :class="
        modelValue === lang.value
          ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-700 dark:text-blue-300'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
      "
      :title="lang.name"
      @click="$emit('update:modelValue', lang.value)"
    >
      <span
        v-if="filled"
        class="h-1.5 w-1.5 rounded-full"
        :class="filled[lang.value] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'"
      ></span>
      {{ lang.label }}
    </button>
  </div>
</template>
