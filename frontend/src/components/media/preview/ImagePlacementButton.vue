<script setup>
  import { computed, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import { cutPlaceCount } from "@/lib/media/preview/places.js";
  import messages from "@/lib/media/preview/messages.js";

  /**
   * "Nerelerde görünecek?" — her görselin altında kalıcı giriş (pano 3).
   * Rozet: kenarı kesilen FARKLI yer sayısı; ölçü bilinmiyorsa rozet çıkmaz.
   */
  const props = defineProps({
    fileUrl: { type: String, default: "" },
    slotKey: { type: String, required: true },
    /** `{width, height}` biliniyorsa verin; yoksa `seller_media.get_dimensions` sorulur. */
    dims: { type: Object, default: null },
    compact: { type: Boolean, default: false },
    /** Test/özel kullanım için ölçü okuyucu; varsayılan `previewApi.getImageDimensions`. */
    loadDims: { type: Function, default: null },
  });
  const emit = defineEmits(["open"]);
  const { t } = useI18n({ messages });

  const btn = ref(null);
  const fetched = ref(null);
  const size = computed(() => props.dims || fetched.value);
  const cutCount = computed(() => {
    const s = size.value;
    return s && s.width > 0 && s.height > 0 ? cutPlaceCount(props.slotKey, s.width / s.height) : 0;
  });

  let seq = 0;
  async function refresh() {
    const mine = ++seq;
    fetched.value = null;
    if (props.dims || !props.fileUrl) return;
    try {
      const loader =
        props.loadDims || (await import("@/lib/media/preview/previewApi.js")).getImageDimensions;
      const d = await loader(props.fileUrl);
      if (mine !== seq) return; // eski adresin geç yanıtı yenisini ezmesin
      if (d?.width > 0 && d?.height > 0) fetched.value = { width: d.width, height: d.height };
    } catch {
      // Ölçü okunamadı: rozet gösterilmez, düğme çalışmaya devam eder.
    }
  }
  onMounted(refresh);
  watch(() => props.fileUrl, refresh);

  function onClick() {
    emit("open", { fileUrl: props.fileUrl, slotKey: props.slotKey, trigger: btn.value });
  }
  defineExpose({ focus: () => btn.value?.focus() });
</script>

<template>
  <div class="ipb" :class="{ 'ipb--compact': compact }" :data-placement-url="fileUrl">
    <button ref="btn" type="button" class="ipb__btn" :disabled="!fileUrl" @click="onClick">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      {{ t("imagePlacement.button") }}
    </button>
    <span v-if="cutCount > 0" class="ipb__badge">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" />
      </svg>
      {{ t("imagePlacement.badge", { n: cutCount }, cutCount) }}
    </span>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  .ipb {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  // İkincil eylem: içerik genişliğinde, 30 px görünür yüzey, 44 px dokunma alanı (::after)
  .ipb__btn {
    position: relative;
    box-sizing: border-box;
    height: 30px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid $l-border;
    border-radius: 8px;
    background: $l-bg;
    color: $l-text-700;
    font: inherit;
    font-size: 12.5px;
    line-height: 16px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: background $t-fast;
    svg {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
    }
    // 30 px görünür yüzey + üst/alt 7 px = 44 px dokunma alanı (border kutusu 30 px olduğu için -7 yeter; -8 ile 46)
    &::after {
      content: "";
      position: absolute;
      inset: -7px 0;
      min-height: 44px;
    }
    &:hover:not(:disabled) {
      background: $l-bg-muted;
      color: $l-text-900;
    }
    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
      color: $d-text;
      &:hover:not(:disabled) {
        background: $d-bg-hover;
      }
    }
  }
  .ipb--compact .ipb__btn {
    max-width: 100%;
    padding: 0 8px;
  }
  .ipb__btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .ipb__btn:focus-visible {
    outline: 2px solid $brand;
    outline-offset: 2px;
  }
  .ipb__badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba($c-warning, 0.14);
    color: $c-warning-text;
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    @include dark {
      color: $c-warning;
    }
  }
</style>
