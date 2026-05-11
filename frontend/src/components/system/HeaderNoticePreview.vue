<template>
  <div v-if="notices.length === 0" class="preview-empty">
    <em>Aktif duyuru yok — şerit storefront'ta gizli.</em>
  </div>
  <div v-else class="preview-strip-inner">
    <div class="preview-track">
      <span v-for="(n, idx) in notices" :key="`a-${n.name}-${idx}`" class="preview-item">
        <span v-if="iconVisible(n.icon)" aria-hidden="true">{{ n.icon }}</span>
        <span>{{ n.message_tr }}</span>
        <a v-if="n.link_text_tr && n.link_href" :href="n.link_href" target="_blank" rel="noopener">
          {{ n.link_text_tr }}
        </a>
      </span>
      <!-- İkinci kopya seamless loop için -->
      <span v-for="(n, idx) in notices" :key="`b-${n.name}-${idx}`" class="preview-item">
        <span v-if="iconVisible(n.icon)" aria-hidden="true">{{ n.icon }}</span>
        <span>{{ n.message_tr }}</span>
        <a v-if="n.link_text_tr && n.link_href" :href="n.link_href" target="_blank" rel="noopener">
          {{ n.link_text_tr }}
        </a>
      </span>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    notices: { type: Array, default: () => [] },
  });

  function iconVisible(icon) {
    return icon && icon !== "none";
  }
</script>

<style lang="scss" scoped>
  .preview-empty {
    padding: 12px 16px;
    background: #f3f4f6;
    border-radius: 6px;
    color: #6b7280;
    font-size: 13px;
  }
  .preview-strip-inner {
    background: #1a1a1a;
    color: #fff;
    height: 36px;
    overflow: hidden;
    border-radius: 6px;
    position: relative;
    mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
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
