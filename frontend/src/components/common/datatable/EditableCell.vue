<template>
  <div class="inline-flex items-center gap-1 max-w-full" :class="alignClass" @click.stop>
    <input
      v-if="editing"
      ref="inp"
      :type="type === 'number' ? 'number' : 'text'"
      :value="draft"
      class="form-input-sm w-full min-w-[80px]"
      @input="draft = $event.target.value"
      @keydown.enter.prevent="commit"
      @keydown.esc.prevent="cancel"
      @blur="commit"
    />
    <button
      v-else
      type="button"
      class="group inline-flex items-center gap-1 max-w-full text-left hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
      title="Düzenlemek için tıkla"
      @click="startEdit"
    >
      <span class="truncate"><slot>{{ display ?? modelValue }}</slot></span>
      <AppIcon
        name="pencil"
        :size="11"
        class="flex-shrink-0 opacity-0 group-hover:opacity-60 text-gray-400 transition-opacity"
      />
    </button>
  </div>
</template>

<script setup>
  import { ref, computed, nextTick } from "vue";
  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    modelValue: { type: [String, Number], default: "" },
    type: { type: String, default: "text" }, // "text" | "number"
    display: { type: String, default: null }, // formatlanmış görünüm (örn. "TRY 50,00")
    align: { type: String, default: "left" },
  });
  const emit = defineEmits(["commit"]);

  const editing = ref(false);
  const draft = ref("");
  const inp = ref(null);

  const alignClass = computed(() =>
    props.align === "right" ? "justify-end" : props.align === "center" ? "justify-center" : "justify-start"
  );

  function startEdit() {
    draft.value = props.modelValue ?? "";
    editing.value = true;
    nextTick(() => inp.value?.focus());
  }
  function cancel() {
    editing.value = false;
  }
  function commit() {
    if (!editing.value) return;
    editing.value = false;
    const next =
      props.type === "number"
        ? draft.value === ""
          ? null
          : Number(draft.value)
        : String(draft.value).trim();
    // Değişmediyse veya geçersiz sayıysa onay isteme.
    if (props.type === "number" && (next === null || Number.isNaN(next))) return;
    if (String(next) === String(props.modelValue ?? "")) return;
    emit("commit", next);
  }
</script>
