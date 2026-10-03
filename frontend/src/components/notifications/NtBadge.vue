<script setup>
  /** Durum rozeti — renk tek başına anlam taşımaz: ikon + metin birlikte. */
  import AppIcon from "@/components/common/AppIcon.vue";

  defineProps({
    /** ok | warn | err | info | neutral | brand | outline */
    tone: { type: String, default: "neutral" },
    icon: { type: String, default: "" },
    /** İkon yerine dolu nokta (yayında). */
    dot: { type: Boolean, default: false },
  });
</script>

<template>
  <span class="nt-badge" :class="`nt-badge--${tone}`">
    <span v-if="dot" class="nt-badge__dot" aria-hidden="true" />
    <AppIcon v-else-if="icon" :name="icon" :size="12" class="nt-badge__icon" />
    <slot />
  </span>
</template>

<style scoped lang="scss">
  .nt-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 22px;
    padding: 1px 9px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: var(--nt-bg-muted);
    color: var(--nt-fg-2);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
  }

  .nt-badge--ok {
    background: var(--nt-ok-bg);
    color: var(--nt-ok-fg);
  }

  .nt-badge--warn {
    background: var(--nt-warn-bg);
    color: var(--nt-warn-fg);
  }

  .nt-badge--err {
    background: var(--nt-err-bg);
    color: var(--nt-err-fg);
  }

  .nt-badge--info {
    background: var(--nt-info-bg);
    color: var(--nt-info-fg);
  }

  .nt-badge--brand {
    background: var(--nt-brand-bg);
    color: var(--nt-fg);
  }

  .nt-badge--outline {
    border-color: var(--nt-field-line);
    background: transparent;
  }

  .nt-badge__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentcolor;
  }

  .nt-badge__icon {
    flex-shrink: 0;
  }
</style>
