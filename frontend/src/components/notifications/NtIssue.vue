<script setup>
  /**
   * Tek doğrulama mesajı. Cümle TEK sözlükten gelir
   * (`utils/notificationTemplates/validation.js` → `describeIssue`):
   * tür · açıklama · etkilenen kanal ve dil · çözüm.
   */
  import { computed } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { describeIssue } from "@/utils/notificationTemplates/validation";

  const props = defineProps({
    issue: { type: Object, required: true },
  });

  const text = computed(() => describeIssue(props.issue));
  const tone = computed(() =>
    props.issue.severity === "blocking"
      ? "err"
      : props.issue.severity === "warning"
        ? "warn"
        : "info"
  );
</script>

<template>
  <p class="nt-msg" :class="`nt-msg--${tone}`">
    <AppIcon :name="tone === 'info' ? 'info' : 'triangle-alert'" :size="14" class="nt-msg__icon" />
    <span>
      <strong>{{ text.title }}:</strong> {{ text.text }}
      <span class="nt-msg__scope">{{ text.scope }}</span>
      <template v-if="text.fix"> Çözüm: {{ text.fix }}</template>
    </span>
  </p>
</template>

<style scoped lang="scss">
  .nt-msg {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    overflow-wrap: anywhere;

    @media (max-width: 767px) {
      font-size: 13px;
    }
  }

  .nt-msg__icon {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .nt-msg__scope {
    display: inline-block;
    padding: 0 6px;
    border-radius: 4px;
    background: var(--nt-bg-muted);
    color: var(--nt-fg-2);
    font-weight: 600;
  }

  .nt-msg--err {
    color: var(--nt-err-fg);
  }

  .nt-msg--warn {
    color: var(--nt-warn-fg);
  }

  .nt-msg--info {
    color: var(--nt-muted);
  }
</style>
