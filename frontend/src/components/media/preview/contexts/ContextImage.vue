<script setup>
  import { computed } from "vue";

  import { objectPosition } from "@/lib/media/crop/geometry.js";

  const props = defineProps({
    src: { type: String, required: true },
    focal: { type: Object, required: true },
    fit: { type: String, default: "cover" },
    alt: { type: String, default: "" },
  });
  /* `contain` kesmez; `object-position` orada anlamsız olduğu için ortada tutulur. */
  const style = computed(() => ({
    objectFit: props.fit,
    objectPosition: props.fit === "cover" ? objectPosition(props.focal) : "50% 50%",
  }));
</script>

<template>
  <img class="ctx-img" :src="src" :alt="alt" :style="style" decoding="async" />
</template>
