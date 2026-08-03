<template>
  <div class="media-thumb" :class="ratioClass">
    <div
      v-if="item.gradient"
      class="media-thumb__fill"
      :style="{
        backgroundImage: `linear-gradient(140deg, ${item.gradient[0]}, ${item.gradient[1]})`,
      }"
    />
    <div v-else class="media-thumb__doc">
      <AppIcon :name="iconForKind(item.kind)" :size="iconSize" :stroke-width="1.6" />
      <span class="media-thumb__ext">{{ item.ext }}</span>
    </div>
    <slot />
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { iconForKind } from "@/utils/mediaFormat";

  /**
   * Mock önizleme. Gerçek dosya yok: görseller CSS gradyanıyla, belge/video
   * dosyaları tür ikonu + uzantı rozetiyle çizilir.
   */
  const props = defineProps({
    item: { type: Object, required: true },
    ratio: { type: String, default: "square" }, // square | wide
    iconSize: { type: Number, default: 26 },
  });

  const ratioClass = computed(() => `media-thumb--${props.ratio}`);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // Oran padding ile kurulur, `aspect-ratio` ile değil: grid item olduğunda
  // (detay paneli) aspect-ratio satır yüksekliği üretmiyor ve önizleme
  // altındaki içeriğin üstüne biniyordu.
  .media-thumb {
    position: relative;
    display: block;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }

    &::before {
      content: "";
      display: block;
    }
  }

  .media-thumb--square::before {
    padding-top: 100%;
  }

  .media-thumb--wide::before {
    padding-top: 75%;
  }

  .media-thumb__fill {
    position: absolute;
    inset: 0;
  }

  .media-thumb__doc {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: media.$s-1;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  // Ölçek media.scss §Tipografi: masaüstünde 12px, mobilde 1rem.
  .media-thumb__ext {
    @include media.text("xs");
    font-weight: 700;
    letter-spacing: 0.08em;
  }
</style>
