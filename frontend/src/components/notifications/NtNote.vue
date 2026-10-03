<script setup>
  /** Açıklayıcı bant: salt okunur, hata, uyarı, bilgi. İkon + metin + (isteğe bağlı) eylem. */
  import { computed } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";

  const props = defineProps({
    /** neutral | info | warn | err | ok */
    tone: { type: String, default: "neutral" },
    icon: { type: String, default: "" },
    /** Hata bandı ekran okuyucuya hemen duyurulsun mu? */
    alert: { type: Boolean, default: false },
  });

  const ICONS = {
    neutral: "info",
    info: "info",
    warn: "triangle-alert",
    err: "triangle-alert",
    ok: "circle-check",
  };
  const iconName = computed(() => props.icon || ICONS[props.tone] || "info");
</script>

<template>
  <div class="nt-note" :class="`nt-note--${tone}`" :role="alert ? 'alert' : undefined">
    <AppIcon :name="iconName" :size="16" class="nt-note__icon" />
    <div class="nt-note__body"><slot /></div>
    <div v-if="$slots.action" class="nt-note__action"><slot name="action" /></div>
  </div>
</template>

<style scoped lang="scss">
  .nt-note {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--nt-line);
    border-radius: 10px;
    background: var(--nt-bg-soft);
    color: var(--nt-fg);
  }

  .nt-note__icon {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--nt-muted);
  }

  .nt-note__body {
    flex: 1 1 220px;
    min-width: 0;
  }

  .nt-note__action {
    flex-shrink: 0;
  }

  .nt-note--info {
    border-color: transparent;
    background: var(--nt-info-bg);

    .nt-note__icon {
      color: var(--nt-info-fg);
    }
  }

  .nt-note--warn {
    border-color: transparent;
    background: var(--nt-warn-bg);

    .nt-note__icon {
      color: var(--nt-warn-fg);
    }
  }

  .nt-note--err {
    border-color: var(--nt-err-line);
    background: var(--nt-err-bg);

    .nt-note__icon {
      color: var(--nt-err-fg);
    }
  }

  .nt-note--ok {
    border-color: transparent;
    background: var(--nt-ok-bg);

    .nt-note__icon {
      color: var(--nt-ok-fg);
    }
  }
</style>
