<script setup>
  defineProps({
    modelValue: { type: String, default: "tr" },
  });
  defineEmits(["update:modelValue"]);

  const LANGS = [
    { value: "tr", label: "TR", name: "Türkçe" },
    { value: "en", label: "EN", name: "English" },
  ];
</script>

<template>
  <div class="inline-flex gap-1 p-1 bg-gray-100 rounded-md">
    <button
      v-for="lang in LANGS"
      :key="lang.value"
      type="button"
      class="px-3 py-1 text-xs font-medium rounded transition-colors"
      :class="
        modelValue === lang.value
          ? 'bg-white text-blue-700 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      "
      :title="lang.name"
      @click="$emit('update:modelValue', lang.value)"
    >
      {{ lang.label }}
    </button>
  </div>
</template>
