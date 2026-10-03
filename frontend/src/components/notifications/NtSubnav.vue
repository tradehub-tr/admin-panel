<script setup>
  /** Modül içi gezinme: Olaylar · Düzenleyici · Sürüm geçmişi (seçili olayın bağlamında). */
  import AppIcon from "@/components/common/AppIcon.vue";

  defineProps({
    eventKey: { type: String, required: true },
    /** editor | history */
    current: { type: String, required: true },
  });
</script>

<template>
  <nav class="nt-subnav" aria-label="Bildirim şablonları">
    <router-link class="nt-subnav__link" :to="{ name: 'NotificationEvents' }">
      <AppIcon name="arrow-left" :size="14" />Olaylar
    </router-link>
    <router-link
      class="nt-subnav__link"
      :class="{ 'is-current': current === 'editor' }"
      :aria-current="current === 'editor' ? 'page' : undefined"
      :to="{ name: 'NotificationTemplateEditor', params: { key: eventKey } }"
    >
      Düzenleyici
    </router-link>
    <router-link
      class="nt-subnav__link"
      :class="{ 'is-current': current === 'history' }"
      :aria-current="current === 'history' ? 'page' : undefined"
      :to="{ name: 'NotificationTemplateHistory', params: { key: eventKey } }"
    >
      <AppIcon name="history" :size="14" />Sürüm geçmişi
    </router-link>
  </nav>
</template>

<style scoped lang="scss">
  .nt-subnav {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    border-radius: 10px;
    background: var(--nt-bg-muted);
    align-self: flex-start;
    max-width: 100%;
  }

  .nt-subnav__link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 7px;
    color: var(--nt-fg-2);
    font-weight: 600;
    text-decoration: none;

    &:hover {
      color: var(--nt-fg);
    }

    &.is-current {
      background: var(--nt-bg);
      color: var(--nt-fg);
      box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
    }

    @media (max-width: 767px) {
      min-height: 44px;
    }
  }
</style>
