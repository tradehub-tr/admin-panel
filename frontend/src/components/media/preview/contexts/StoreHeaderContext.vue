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
  const isLogo = computed(() => props.place.key === "shop_logo");
  const tiles = computed(() => (props.device === "mobile" ? 2 : 4));
</script>

<template>
  <!-- Vitrin bandı storefront'ta TAM GENİŞLİK (section-registry.ts:108): kenar boşluğu yok,
       telefonda 390 × 180 px birebir — e2e ekran görüntüsü karşılaştırması buna dayanır. -->
  <div class="ctx ctx--flush" :class="`ctx--${device}`">
    <span
      v-if="isLogo"
      aria-hidden="true"
      class="ctx-skel ctx-band"
      :style="{ aspectRatio: device === 'mobile' ? '390 / 180' : '3 / 1' }"
    />
    <span v-else class="ctx-box ctx-band" :style="{ aspectRatio: String(place.ratio) }">
      <ContextImage :src="src" :focal="focal" :fit="place.fit" :alt="alt" />
    </span>
    <div class="ctx-pad">
      <div class="ctx-row">
        <span v-if="isLogo" class="ctx-box" :style="box">
          <ContextImage :src="src" :focal="focal" :fit="place.fit" :alt="alt" />
        </span>
        <span v-else aria-hidden="true" class="ctx-skel" style="width: 44px; height: 44px" />
        <strong class="ctx-name"
          ><bdi>{{ storeName }}</bdi></strong
        >
      </div>
      <div class="ctx-grid" :class="`ctx-grid--${tiles}`">
        <span v-for="n in tiles" :key="n" aria-hidden="true" class="ctx-skel ctx-tile" />
      </div>
    </div>
  </div>
</template>
