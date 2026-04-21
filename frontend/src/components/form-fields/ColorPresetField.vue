<template>
  <div class="color-preset-field">
    <div class="grid grid-cols-9 gap-2">
      <button
        v-for="preset in PRESETS"
        :key="preset.key"
        type="button"
        class="relative w-full aspect-square rounded-lg border-2 transition-all hover:scale-110"
        :class="[
          preset.bg,
          modelValue === preset.key
            ? 'border-violet-500 ring-2 ring-violet-500/30'
            : 'border-transparent hover:border-white/20',
        ]"
        :title="preset.label"
        @click="select(preset.key)"
      >
        <span
          v-if="modelValue === preset.key"
          class="absolute inset-0 flex items-center justify-center"
        >
          <i class="fas fa-check text-white text-xs drop-shadow"></i>
        </span>
      </button>
    </div>
    <p class="mt-2 text-[11px]" style="color: var(--th-text-tertiary)">
      Seçilen:
      <span class="font-medium" style="color: var(--th-text-secondary)">{{ selectedLabel }}</span>
    </p>
  </div>
</template>

<script setup>
  import { computed } from "vue";

  const props = defineProps({
    modelValue: { type: String, default: "violet" },
    formData: { type: Object, default: () => ({}) },
    field: { type: Object, default: () => ({}) },
  });
  const emit = defineEmits(["update:modelValue"]);

  const PRESETS = [
    { key: "violet", label: "Mor", bg: "bg-violet-500" },
    { key: "blue", label: "Mavi", bg: "bg-blue-500" },
    { key: "emerald", label: "Yeşil", bg: "bg-emerald-500" },
    { key: "teal", label: "Teal", bg: "bg-teal-500" },
    { key: "indigo", label: "İndigo", bg: "bg-indigo-500" },
    { key: "amber", label: "Sarı", bg: "bg-amber-500" },
    { key: "orange", label: "Turuncu", bg: "bg-orange-500" },
    { key: "rose", label: "Pembe", bg: "bg-rose-500" },
    { key: "gray", label: "Gri", bg: "bg-gray-500" },
  ];

  const selectedLabel = computed(
    () => PRESETS.find((p) => p.key === props.modelValue)?.label || "—"
  );

  function select(key) {
    emit("update:modelValue", key);
  }
</script>
