<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

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
  const cols = computed(() => (props.device === "mobile" ? 2 : 4));
</script>

<template>
  <div class="ctx" :class="`ctx--${device}`">
    <div class="ctx-grid" :class="`ctx-grid--${cols}`">
      <div class="ctx-card">
        <span class="ctx-box" :style="{ aspectRatio: String(place.ratio) }">
          <ContextImage :src="src" :focal="focal" :fit="place.fit" :alt="alt" />
        </span>
        <span class="ctx-meta"
          ><bdi>{{ productName }}</bdi></span
        >
        <span v-if="price" class="ctx-price"
          ><bdi>{{ price }}</bdi></span
        >
      </div>
      <div v-for="n in cols - 1" :key="n" aria-hidden="true" class="ctx-card">
        <span aria-hidden="true" class="ctx-skel ctx-tile" />
        <span aria-hidden="true" class="ctx-line" />
      </div>
    </div>
  </div>
</template>
