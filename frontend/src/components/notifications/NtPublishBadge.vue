<script setup>
  /** Yayın durumu rozeti (çeviri durumundan bağımsız). */
  import { computed } from "vue";

  import { PUBLISH_STATES } from "@/constants/notificationTemplates";

  import NtBadge from "./NtBadge.vue";

  const props = defineProps({
    /** { state, version } */
    publish: { type: Object, required: true },
    /** Düzenleyici başlığında "yeni taslak var" metni rozetin içinde yazılır. */
    full: { type: Boolean, default: false },
  });

  const view = computed(() => {
    const { state, version } = props.publish;
    if (state === "taslak")
      return { tone: "warn", icon: "pencil", text: PUBLISH_STATES.taslak.label };
    if (props.full && state === "yayinda-taslak")
      return {
        tone: "warn",
        icon: "pencil",
        text: `${PUBLISH_STATES["yayinda-taslak"].label} · v${version}`,
      };
    return { tone: "ok", dot: true, text: `${PUBLISH_STATES.yayinda.label} v${version}` };
  });
</script>

<template>
  <NtBadge :tone="view.tone" :icon="view.icon" :dot="view.dot">
    <span class="nt-num">{{ view.text }}</span>
  </NtBadge>
</template>
