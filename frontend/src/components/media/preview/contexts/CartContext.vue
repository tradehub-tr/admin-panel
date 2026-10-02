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
  const productName = computed(
    () => props.data.productName || t("imagePlacement.context.productFallback")
  );
  const price = computed(() => props.data.price || "");
</script>

<template>
  <div class="ctx" :class="`ctx--${device}`">
    <div class="ctx-card ctx-row">
      <span class="ctx-box" :style="box">
        <ContextImage :src="src" :focal="focal" :fit="place.fit" :alt="alt" />
      </span>
      <div class="ctx-col">
        <span class="ctx-meta"
          ><bdi>{{ productName }}</bdi></span
        >
        <span class="ctx-price"
          ><bdi>{{ t("imagePlacement.context.qty", { n: 20 }) }}</bdi
          ><template v-if="price">
            · <bdi>{{ price }}</bdi></template
          ></span
        >
      </div>
    </div>
    <span aria-hidden="true" class="ctx-skel" style="height: 56px" />
  </div>
</template>
