<template>
  <teleport to="body">
    <div class="crm-drawer-overlay" :class="{ open: modelValue }" @click="close"></div>
    <aside class="crm-drawer" :class="{ open: modelValue }">
      <header class="crm-drawer-header">
        <h3>{{ title }}</h3>
        <button class="hdr-btn-outlined" @click="close"><AppIcon name="x" :size="14" /></button>
      </header>
      <div class="crm-drawer-body">
        <slot />
      </div>
      <footer class="crm-drawer-footer">
        <button class="hdr-btn-outlined" @click="close">İptal</button>
        <button class="hdr-btn-primary" :disabled="saving" @click="submit">
          <AppIcon name="check" :size="13" />
          <span>{{ saving ? "Kaydediliyor..." : submitLabel }}</span>
        </button>
      </footer>
    </aside>
  </teleport>
</template>

<script setup>
  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: "Yeni" },
    submitLabel: { type: String, default: "Kaydet" },
    saving: { type: Boolean, default: false },
  });

  const emit = defineEmits(["update:modelValue", "submit"]);

  function close() {
    if (props.saving) return;
    emit("update:modelValue", false);
  }

  function submit() {
    emit("submit");
  }
</script>
