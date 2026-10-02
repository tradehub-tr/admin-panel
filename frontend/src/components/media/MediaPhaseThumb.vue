<script setup>
  // Yükleme/aktarım satırının küçük resmi + faz katmanı (onaylı "Animasyonlar"
  // artboard'u). Tepsi (`MediaUploadQueue`) ve `MediaTransferRow` AYNI bileşeni
  // çizer: katman kuralı (`overlayFor`) ve hareketi tek yerde.
  //
  // Görsel kademesi: kütüphane kaydı (`media`) → `MediaThumb` (satır bölgesi:
  // 40 px türev seçilir) · yerel önizleme (`previewUrl`) · tür ikonu.
  // Bezemedir: durum metni satırın etiketinde, burada `aria-hidden`.
  import { computed } from "vue";
  import AppIcon from "@/components/common/AppIcon.vue";
  import MediaThumb from "@/components/media/MediaThumb.vue";
  import { overlayFor } from "@/lib/media/uploadTray.js";
  import { iconForKind } from "@/utils/mediaFormat";

  const props = defineProps({
    phase: { type: String, required: true },
    progress: { type: Number, default: null },
    kind: { type: String, default: "" },
    previewUrl: { type: String, default: "" },
    /** Kütüphane kaydı (`fileUrl`, `renditions`, …) — varsa gerçek küçük resim. */
    media: { type: Object, default: null },
  });
  const overlay = computed(() => overlayFor(props.phase, props.progress));
  // Halka: r=15.9 → çevre ≈ 100 (pathLength ile birebir yüzde).
  const ringOffset = computed(() => 100 - (props.progress ?? 0));
</script>
<template>
  <span class="utray-row__thumb" aria-hidden="true">
    <MediaThumb
      v-if="media?.fileUrl"
      :item="media"
      region="rowThumb"
      :icon-size="16"
      class="utray-row__media"
    />
    <img
      v-else-if="previewUrl"
      :src="previewUrl"
      alt=""
      class="utray-row__img"
      loading="lazy"
      decoding="async"
    />
    <span v-else class="utray-row__kind"><AppIcon :name="iconForKind(kind)" :size="16" /></span>
    <span class="utray-ov" :data-overlay="overlay">
      <svg v-if="overlay === 'ring'" width="26" height="26" viewBox="0 0 36 36" focusable="false">
        <circle class="utray-ov__track" cx="18" cy="18" r="15.9" />
        <circle
          class="utray-ov__fill"
          cx="18"
          cy="18"
          r="15.9"
          pathLength="100"
          stroke-dasharray="100"
          :stroke-dashoffset="ringOffset"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span v-else-if="overlay === 'spin'" class="utray-ov__spin" />
      <template v-else-if="overlay === 'shield'">
        <span class="utray-ov__pulse" />
        <svg width="18" height="18" viewBox="0 0 24 24" focusable="false">
          <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" />
        </svg>
      </template>
      <template v-else-if="overlay === 'stack'">
        <span class="utray-ov__sq" /><span class="utray-ov__sq" /><span class="utray-ov__sq" />
      </template>
      <svg
        v-else-if="overlay === 'queued'"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        focusable="false"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
      <span v-else class="utray-ov__badge">
        <svg width="12" height="12" viewBox="0 0 24 24" focusable="false">
          <path v-if="overlay === 'check'" d="M5 12.5l4.5 4.5L19 7.5" />
          <template v-else-if="overlay === 'lock'">
            <rect x="6" y="11" width="12" height="9" rx="1.5" />
            <path d="M9 11V8a3 3 0 0 1 6 0v3" />
          </template>
          <path v-else-if="overlay === 'warn'" d="M12 6v7M12 17h.01" />
          <path v-else-if="overlay === 'cancel'" d="M6 12h12" />
          <path v-else d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    </span>
  </span>
</template>
<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/upload-row" as row;

  .utray-row__thumb {
    position: relative;
    width: var(--utray-thumb, 40px);
    height: var(--utray-thumb, 40px);
    margin-top: 2px;
    display: flex;
    flex-shrink: 0;
  }
  .utray-row__img,
  .utray-row__kind,
  .utray-row__media {
    width: 100%;
    height: 100%;
    border-radius: 10px;
    object-fit: cover;
    background: $l-bg-muted;
  }
  .utray-row__media {
    overflow: hidden;
    @include dark {
      background: $d-bg-elevated;
    }
  }
  // 40 px karede uzantı rozeti yer kaplamasın; tür ikonu yeter.
  .utray-row__media :deep(.media-thumb__ext) {
    display: none;
  }
  .utray-row__kind {
    display: grid;
    place-items: center;
    color: $l-text-700;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }
  }

  // ── Faz katmanları ───────────────────────────────────────────
  .utray-ov {
    position: absolute;
    inset: 0;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    svg {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }
  .utray-ov[data-overlay="ring"],
  .utray-ov[data-overlay="spin"],
  .utray-ov[data-overlay="stack"],
  .utray-ov[data-overlay="queued"] {
    background: rgb(24 24 27 / 45%);
  }
  .utray-ov[data-overlay="shield"] {
    background: rgb(30 58 138 / 55%);
  }
  .utray-ov[data-overlay="stack"] {
    align-items: flex-end;
    gap: 3px;
    padding-bottom: 8px;
  }
  .utray-ov__track,
  .utray-ov__fill {
    stroke-width: 3.5;
  }
  .utray-ov__track {
    stroke: rgb(255 255 255 / 35%);
  }
  .utray-ov__spin {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 3px solid rgb(255 255 255 / 35%);
    border-top-color: #fff;
    animation: utray-spin 1.1s linear infinite;
  }
  .utray-ov__pulse {
    position: absolute;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #fff;
    animation: utray-pulse 1.6s $ease-out infinite;
  }
  .utray-ov__sq {
    width: 6px;
    height: 6px;
    border-radius: 2px;
    background: #fff;
    animation: utray-stack 1.2s $ease-in-out infinite;
    &:nth-child(2) {
      animation-delay: 0.15s;
    }
    &:nth-child(3) {
      animation-delay: 0.3s;
    }
  }
  // Rozetli katmanlar köşeye oturur (mantıksal: RTL'de sol alt).
  .utray-ov[data-overlay="check"],
  .utray-ov[data-overlay="error"],
  .utray-ov[data-overlay="lock"],
  .utray-ov[data-overlay="warn"],
  .utray-ov[data-overlay="cancel"] {
    inset: auto;
    inset-block-end: -6px;
    inset-inline-end: -6px;
    width: 22px;
    height: 22px;
  }
  .utray-ov__badge {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid $l-bg;
    display: grid;
    place-items: center;
    svg {
      stroke-width: 3;
    }
    @include dark {
      border-color: $d-bg-card;
    }
  }
  [data-overlay="check"] .utray-ov__badge {
    background: #065f46;
    animation: utray-pop 0.32s $ease-out both;
  }
  [data-overlay="error"] .utray-ov__badge,
  [data-overlay="lock"] .utray-ov__badge {
    background: row.$err;
  }
  [data-overlay="lock"] .utray-ov__badge svg {
    stroke-width: 2.4;
  }
  [data-overlay="warn"] .utray-ov__badge {
    background: $c-warning-text;
  }
  [data-overlay="cancel"] .utray-ov__badge {
    background: $l-text-600;
  }

  // ── Hareket: yalnız transform + opacity ──────────────────────
  @keyframes utray-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes utray-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.55;
    }
    50% {
      transform: scale(1.18);
      opacity: 0;
    }
  }
  @keyframes utray-stack {
    0%,
    100% {
      transform: translateY(0);
      opacity: 0.45;
    }
    50% {
      transform: translateY(-3px);
      opacity: 1;
    }
  }
  @keyframes utray-pop {
    0% {
      transform: scale(0.6);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  // Azaltılmış hareket: döngüler durur, rozet doğrudan görünür.
  @media (prefers-reduced-motion: reduce) {
    .utray-ov__spin,
    .utray-ov__pulse,
    .utray-ov__sq,
    [data-overlay="check"] .utray-ov__badge {
      animation: none;
    }
  }
</style>
