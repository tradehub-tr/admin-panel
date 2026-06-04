<template>
  <teleport to="body">
    <div class="crm-drawer-overlay" :class="{ open: modelValue }" @click="close"></div>
    <aside class="crm-drawer" :class="{ open: modelValue }">
      <header class="crm-drawer-header">
        <h3>{{ title || t("quickCreateDrawer.defaultTitle") }}</h3>
        <button class="hdr-btn-outlined" @click="close"><AppIcon name="x" :size="14" /></button>
      </header>
      <div class="crm-drawer-body">
        <slot />
      </div>
      <footer class="crm-drawer-footer">
        <button class="hdr-btn-outlined" @click="close">{{ t("quickCreateDrawer.cancel") }}</button>
        <button class="hdr-btn-primary" :disabled="saving" @click="submit">
          <AppIcon name="check" :size="13" />
          <span>{{ saving ? t("quickCreateDrawer.saving") : resolvedSubmitLabel }}</span>
        </button>
      </footer>
    </aside>
  </teleport>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: "" },
    submitLabel: { type: String, default: "" },
    saving: { type: Boolean, default: false },
  });

  const emit = defineEmits(["update:modelValue", "submit"]);

  const resolvedSubmitLabel = computed(() => props.submitLabel || t("quickCreateDrawer.save"));

  function close() {
    if (props.saving) return;
    emit("update:modelValue", false);
  }

  function submit() {
    emit("submit");
  }
</script>
