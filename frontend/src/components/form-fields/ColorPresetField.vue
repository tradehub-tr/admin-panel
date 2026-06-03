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
      {{ t("colorPresetField.selected") }}
      <span class="font-medium" style="color: var(--th-text-secondary)">{{ selectedLabel }}</span>
    </p>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  const { t } = useI18n();

  const props = defineProps({
    modelValue: { type: String, default: "violet" },
    formData: { type: Object, default: () => ({}) },
    field: { type: Object, default: () => ({}) },
  });
  const emit = defineEmits(["update:modelValue"]);

  const PRESETS = computed(() => [
    { key: "violet", label: t("colorPresetField.violet"), bg: "bg-violet-500" },
    { key: "blue", label: t("colorPresetField.blue"), bg: "bg-blue-500" },
    { key: "emerald", label: t("colorPresetField.green"), bg: "bg-emerald-500" },
    { key: "teal", label: t("colorPresetField.teal"), bg: "bg-teal-500" },
    { key: "indigo", label: t("colorPresetField.indigo"), bg: "bg-indigo-500" },
    { key: "amber", label: t("colorPresetField.yellow"), bg: "bg-amber-500" },
    { key: "orange", label: t("colorPresetField.orange"), bg: "bg-orange-500" },
    { key: "rose", label: t("colorPresetField.pink"), bg: "bg-rose-500" },
    { key: "gray", label: t("colorPresetField.gray"), bg: "bg-gray-500" },
  ]);

  const selectedLabel = computed(
    () => PRESETS.value.find((p) => p.key === props.modelValue)?.label || "—"
  );

  function select(key) {
    emit("update:modelValue", key);
  }
</script>
