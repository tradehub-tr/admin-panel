<script setup>
  /**
   * Olayın dört kanalı, üç durumla:
   *   Zorunlu           dolgu + kilit
   *   Kullanıcı seçer   düz kenarlık
   *   Platformda kapalı kesikli kenarlık + eksi
   * Görsel özettir (aria-hidden); metin karşılığını çağıranın `aria-label`'ı taşır.
   */
  import { computed } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { CHANNELS, CHANNEL_STATES } from "@/constants/notificationTemplates";
  import { channelState } from "@/utils/notificationTemplates/catalog";

  const props = defineProps({
    event: { type: Object, required: true },
  });

  const cells = computed(() =>
    CHANNELS.map((c) => {
      const state = channelState(props.event, c.id);
      return {
        id: c.id,
        icon: c.icon,
        short: c.short,
        state,
        stateIcon: state === "secmeli" ? "" : CHANNEL_STATES[state].icon,
      };
    })
  );
</script>

<template>
  <span class="nt-chans" aria-hidden="true">
    <span v-for="c in cells" :key="c.id" class="nt-chan" :class="`nt-chan--${c.state}`">
      <AppIcon :name="c.icon" :size="15" />
      <AppIcon v-if="c.stateIcon" :name="c.stateIcon" :size="10" class="nt-chan__state" />
      <span class="nt-chan__label">{{ c.short }}</span>
    </span>
  </span>
</template>

<style scoped lang="scss">
  .nt-chans {
    display: inline-grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    width: 100%;
    max-width: 252px;
  }

  .nt-chan {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    min-width: 0;
    height: 40px;
    padding: 2px;
    border: 1px solid var(--nt-field-line);
    border-radius: 6px;
    color: var(--nt-fg);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.1;
  }

  .nt-chan__label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nt-chan__state {
    position: absolute;
    top: 3px;
    inset-inline-end: 3px;
  }

  .nt-chan--zorunlu {
    border-color: var(--nt-brand-line);
    background: var(--nt-brand-bg);
  }

  .nt-chan--kapali {
    border-style: dashed;
    color: var(--nt-muted);
    font-weight: 500;
  }
</style>
