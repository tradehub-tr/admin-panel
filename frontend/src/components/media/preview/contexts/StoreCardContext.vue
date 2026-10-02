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
    <div class="ctx-card ctx-row" style="align-items: stretch">
      <div class="ctx-col" style="flex: 1">
        <strong class="ctx-name"
          ><bdi>{{ storeName }}</bdi></strong
        >
        <span aria-hidden="true" class="ctx-line" style="width: 60%" />
        <div class="ctx-grid ctx-grid--3">
          <span v-for="n in 3" :key="n" aria-hidden="true" class="ctx-skel ctx-tile" />
        </div>
      </div>
      <span class="ctx-box" :style="box">
        <ContextImage :src="src" :focal="focal" :fit="place.fit" :alt="alt" />
      </span>
    </div>
  </div>
</template>
