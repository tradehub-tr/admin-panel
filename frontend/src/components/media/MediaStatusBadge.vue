<script setup>
  import { useI18n } from "vue-i18n";
  import { phaseTone } from "@/lib/media/status.js";
  defineProps({ phase: { type: String, required: true } });
  const { t } = useI18n();
</script>
<template>
  <span class="media-status" :class="`media-status--${phaseTone(phase)}`">{{
    t(`mediaFlow.phase.${phase}`)
  }}</span>
</template>
<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  .media-status {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    padding: 2px 7px;
    border-radius: 6px;
    font-size: 11px;
    line-height: 16px;
    font-weight: 500;
    white-space: normal;
    overflow-wrap: normal;
    background: $l-bg-muted;
    color: $l-text-600;
  }
  .media-status--success {
    background: rgba($c-success, 0.1);
    color: $c-success-text;
  }
  .media-status--danger {
    background: rgba($c-error, 0.1);
    color: $c-error-text;
  }
  .media-status--warning {
    background: rgba($c-warning, 0.1);
    color: $c-warning-text;
  }
  html.dark {
    .media-status {
      background: $d-bg-elevated;
      color: $d-text;
    }
    .media-status--success {
      color: $c-success;
    }
    .media-status--danger {
      color: $c-error;
    }
    .media-status--warning {
      color: $c-warning;
    }
  }
</style>
