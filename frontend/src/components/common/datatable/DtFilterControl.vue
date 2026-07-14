<template>
  <!-- text -->
  <input
    v-if="variant === 'text'"
    :value="modelValue || ''"
    type="text"
    :placeholder="`${field.label} içinde ara`"
    class="form-input-sm w-full"
    @input="$emit('update:modelValue', $event.target.value || undefined)"
  />

  <!-- select (çoklu) -->
  <div v-else-if="variant === 'select'" class="flex flex-col gap-1.5">
    <label
      v-for="opt in field.filter.options"
      :key="opt.value"
      class="flex items-center gap-2 cursor-pointer text-[13px] text-gray-700 dark:text-gray-300"
    >
      <input
        type="checkbox"
        class="accent-brand-600"
        :checked="selected.includes(opt.value)"
        @change="toggleOption(opt.value)"
      />
      <span class="flex items-center gap-1.5">
        <span v-if="opt.dot" class="w-2 h-2 rounded-full inline-block" :class="opt.dot" />
        {{ opt.label }}
      </span>
    </label>
  </div>

  <!-- range (sayısal) -->
  <div v-else-if="variant === 'range'" class="flex items-center gap-2">
    <input
      :value="range.min ?? ''"
      type="number"
      placeholder="En az"
      class="form-input-sm w-full"
      @input="setRange('min', $event.target.value)"
    />
    <span class="text-gray-400">–</span>
    <input
      :value="range.max ?? ''"
      type="number"
      placeholder="En çok"
      class="form-input-sm w-full"
      @input="setRange('max', $event.target.value)"
    />
  </div>

  <!-- date (tarih aralığı) -->
  <div v-else class="flex flex-col gap-2">
    <label class="text-[11px] text-gray-500 dark:text-gray-400">
      Başlangıç
      <input
        :value="dateVal.from || ''"
        type="date"
        class="form-input-sm w-full mt-1"
        @input="setDate('from', $event.target.value)"
      />
    </label>
    <label class="text-[11px] text-gray-500 dark:text-gray-400">
      Bitiş
      <input
        :value="dateVal.to || ''"
        type="date"
        class="form-input-sm w-full mt-1"
        @input="setDate('to', $event.target.value)"
      />
    </label>
  </div>
</template>

<script setup>
  import { computed } from "vue";

  const props = defineProps({
    field: { type: Object, required: true },
    modelValue: { type: [String, Array, Object], default: undefined },
  });
  const emit = defineEmits(["update:modelValue"]);

  const variant = computed(() => props.field.filter?.variant);
  const selected = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
  const range = computed(() => props.modelValue || {});
  const dateVal = computed(() => props.modelValue || {});

  function toggleOption(value) {
    const next = selected.value.includes(value)
      ? selected.value.filter((v) => v !== value)
      : [...selected.value, value];
    emit("update:modelValue", next.length ? next : undefined);
  }

  function setRange(key, raw) {
    const next = { ...range.value, [key]: raw === "" ? null : Number(raw) };
    emit("update:modelValue", next.min == null && next.max == null ? undefined : next);
  }

  function setDate(key, raw) {
    const next = { ...dateVal.value, [key]: raw || null };
    emit("update:modelValue", !next.from && !next.to ? undefined : next);
  }
</script>
