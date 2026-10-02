<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import { boxStyle, placesFor } from "@/lib/media/preview/places.js";
  import messages from "@/lib/media/preview/messages.js";
  import ContextImage from "./ContextImage.vue";
  import { CONTEXT_PROPS } from "./contextProps.js";

  const props = defineProps(CONTEXT_PROPS);
  const { t } = useI18n({ messages });
  const alt = computed(() => t("imagePlacement.alt", { place: t(props.place.labelKey) }));
  const productName = computed(
    () => props.data.productName || t("imagePlacement.context.productFallback")
  );
  const price = computed(() => props.data.price || "");
  const main = computed(
    () =>
      placesFor("product.image", props.device).find((p) => p.key === "product_main") || props.place
  );
  const thumb = computed(
    () =>
      placesFor("product.image", props.device).find((p) => p.key === "product_thumb") || props.place
  );
  const mainBox = computed(() => boxStyle(main.value, props.scale));
  const thumbBox = computed(() => boxStyle(thumb.value, props.scale));
</script>

<template>
  <div class="ctx" :class="`ctx--${device}`">
    <div class="ctx-row" style="align-items: flex-start; flex-wrap: wrap">
      <div class="ctx-col">
        <span class="ctx-box" :style="mainBox">
          <ContextImage
            :src="src"
            :focal="focal"
            :fit="main.fit"
            :alt="place.key === 'product_main' ? alt : ''"
          />
        </span>
        <div class="ctx-row">
          <span class="ctx-box" :style="thumbBox">
            <ContextImage
              :src="src"
              :focal="focal"
              :fit="thumb.fit"
              :alt="place.key === 'product_thumb' ? alt : ''"
            />
          </span>
          <span v-for="n in 3" :key="n" aria-hidden="true" class="ctx-skel" :style="thumbBox" />
        </div>
      </div>
      <div class="ctx-col" style="flex: 1; min-width: 140px">
        <strong class="ctx-name"
          ><bdi>{{ productName }}</bdi></strong
        >
        <span v-if="price" class="ctx-price"
          ><bdi>{{ price }}</bdi></span
        >
        <span aria-hidden="true" class="ctx-line" /><span
          aria-hidden="true"
          class="ctx-line"
          style="width: 70%"
        />
      </div>
    </div>
  </div>
</template>
