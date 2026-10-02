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
  /* Kart 8px dolgu + 1px kenarlık taşır: görsel gerçek ölçekli genişlikte çıksın diye 18px eklenir. */
  const cardStyle = computed(() => ({
    width: box.value.width === "100%" ? "100%" : `calc(${box.value.width} + 18px)`,
    maxWidth: "100%",
    flexShrink: 0,
  }));
  const productName = computed(
    () => props.data.productName || t("imagePlacement.context.productFallback")
  );
</script>

<template>
  <div class="ctx" :class="`ctx--${device}`">
    <span aria-hidden="true" class="ctx-line" style="width: 40%" />
    <div class="ctx-strip">
      <div class="ctx-card" :style="cardStyle">
        <span class="ctx-box" :style="{ aspectRatio: box.aspectRatio }">
          <ContextImage :src="src" :focal="focal" :fit="place.fit" :alt="alt" />
        </span>
        <span class="ctx-meta"
          ><bdi>{{ productName }}</bdi></span
        >
      </div>
      <div v-for="n in 2" :key="n" aria-hidden="true" class="ctx-card" :style="cardStyle">
        <span aria-hidden="true" class="ctx-skel ctx-tile" />
        <span aria-hidden="true" class="ctx-line" />
      </div>
    </div>
  </div>
</template>
