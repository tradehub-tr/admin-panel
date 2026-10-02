<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import { boxStyle } from "@/lib/media/preview/places.js";
  import messages from "@/lib/media/preview/messages.js";
  import ContextImage from "./ContextImage.vue";
  import { CONTEXT_PROPS } from "./contextProps.js";

  const props = defineProps(CONTEXT_PROPS);
  const { t } = useI18n({ messages });
  const alt = computed(() => t("imagePlacement.alt", { place: t(props.place.labelKey) }));
  const box = computed(() => boxStyle(props.place, props.scale));
  const storeName = computed(
    () => props.data.storeName || t("imagePlacement.context.storeFallback")
  );
</script>

<template>
  <div class="ctx" :class="`ctx--${device}`">
    <strong class="ctx-name"
      ><bdi>{{ storeName }}</bdi></strong
    >
    <span class="ctx-box" :style="box">
      <ContextImage :src="src" :focal="focal" :fit="place.fit" :alt="alt" />
    </span>
    <div class="ctx-dots" aria-hidden="true">
      <span class="ctx-dot ctx-dot--on" /><span class="ctx-dot" /><span class="ctx-dot" />
    </div>
  </div>
</template>
