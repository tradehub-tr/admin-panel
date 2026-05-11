<template>
  <div v-if="notices.length === 0" class="preview-empty">
    <em>Aktif duyuru yok — şerit storefront'ta gizli.</em>
  </div>
  <div
    v-else-if="effectiveMode === 'single'"
    class="preview-strip-inner"
    :style="{ background: notices[0]?.background_color || '#1a1a1a' }"
  >
    <div class="preview-single">
      <span class="preview-item">
        <span>{{ messageOf(notices[0]) }}</span>
        <a
          v-if="notices[0].link_text_tr && notices[0].link_href"
          :href="notices[0].link_href"
          target="_blank"
          rel="noopener"
        >
          {{ notices[0].link_text_tr }}
        </a>
      </span>
    </div>
  </div>
  <div
    v-else-if="effectiveMode === 'slide'"
    class="preview-strip-inner"
    :style="{ background: '#1a1a1a' }"
  >
    <div class="preview-slide-stack">
      <div
        v-for="(n, idx) in notices"
        :key="n.name"
        class="preview-slide-item"
        :class="{ active: idx === slideIdx }"
        :style="{ background: n.background_color || '#1a1a1a' }"
      >
        <span class="preview-item">
          <span>{{ n.message_tr }}</span>
          <a v-if="n.link_text_tr && n.link_href" :href="n.link_href" target="_blank" rel="noopener">
            {{ n.link_text_tr }}
          </a>
        </span>
      </div>
    </div>
  </div>
  <div
    v-else
    class="preview-strip-inner"
    :style="{ background: notices[0]?.background_color || '#1a1a1a' }"
  >
    <div class="preview-track">
      <span v-for="(n, idx) in notices" :key="`a-${n.name}-${idx}`" class="preview-item">
        <span>{{ n.message_tr }}</span>
        <a v-if="n.link_text_tr && n.link_href" :href="n.link_href" target="_blank" rel="noopener">
          {{ n.link_text_tr }}
        </a>
      </span>
      <span v-for="(n, idx) in notices" :key="`b-${n.name}-${idx}`" class="preview-item">
        <span>{{ n.message_tr }}</span>
        <a v-if="n.link_text_tr && n.link_href" :href="n.link_href" target="_blank" rel="noopener">
          {{ n.link_text_tr }}
        </a>
      </span>
    </div>
  </div>
</template>

<script setup>
  import { computed, ref, onMounted, onUnmounted, watch } from "vue";

  const props = defineProps({
    notices: { type: Array, default: () => [] },
    displayMode: { type: String, default: "marquee" },
  });

  // Admin'in seçtiği modu doğrudan kullan — auto-downgrade yok
  const effectiveMode = computed(() => props.displayMode);

  function messageOf(n) {
    return n?.message_tr ?? "";
  }

  // Slide rotation
  const slideIdx = ref(0);
  let slideTimer = null;

  function startSlide() {
    stopSlide();
    if (effectiveMode.value !== "slide" || props.notices.length <= 1) return;
    slideTimer = window.setInterval(() => {
      slideIdx.value = (slideIdx.value + 1) % props.notices.length;
    }, 5000);
  }

  function stopSlide() {
    if (slideTimer !== null) {
      window.clearInterval(slideTimer);
      slideTimer = null;
    }
  }

  watch(
    () => [effectiveMode.value, props.notices.length],
    () => {
      slideIdx.value = 0;
      startSlide();
    },
  );

  onMounted(startSlide);
  onUnmounted(stopSlide);
</script>

<style lang="scss" scoped>
@use "@/assets/scss/variables" as *;

.preview-empty {
  padding: 14px 18px;
  background: $l-bg;
  border: 1px solid $l-border-alt;
  border-radius: 12px;
  color: $l-text-500;
  font-size: 13px;
  font-style: italic;
  @include dark {
    background-color: $d-bg-card;
    border-color: $d-border;
    box-shadow: 0 1px 4px rgba(#000, 0.3);
    color: $d-text-muted;
  }
}

.preview-strip-inner {
  color: #fff;
  height: 36px;
  overflow: hidden;
  border-radius: 6px;
  position: relative;
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
}

.preview-single {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
}

.preview-slide-stack {
  position: relative;
  height: 100%;
}

.preview-slide-item {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  opacity: 0;
  transform: translateY(100%);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.preview-slide-item.active {
  opacity: 1;
  transform: translateY(0);
}

.preview-track {
  display: inline-flex;
  align-items: center;
  height: 100%;
  gap: 48px;
  white-space: nowrap;
  animation: preview-scroll 22s linear infinite;
}

.preview-track:hover {
  animation-play-state: paused;
}

.preview-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;

  a {
    color: #ffb800;
    text-decoration: underline;
    margin-left: 8px;

    &:hover {
      color: #fff;
    }
  }
}

@keyframes preview-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
</style>
