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
  const others = computed(() => (props.device === "mobile" ? 2 : 3));
</script>

<template>
  <div class="ctx" :class="`ctx--${device}`">
    <strong class="ctx-name"
      ><bdi>{{ storeName }}</bdi></strong
    >
    <div class="ctx-row" style="flex-wrap: wrap">
      <span class="ctx-box" :style="box">
        <ContextImage :src="src" :focal="focal" :fit="place.fit" :alt="alt" />
      </span>
      <span v-for="n in others" :key="n" aria-hidden="true" class="ctx-skel" :style="box" />
    </div>
  </div>
</template>
