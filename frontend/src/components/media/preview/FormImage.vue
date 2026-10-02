<script setup>
  import { computed, nextTick, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import MediaImage from "@/components/media/MediaImage.vue";

  /**
   * Form küçük resmi: `MediaImage`in hata/yükleme olaylarını kullanır, üstüne
   * erişilebilir hata durumu ve SINIRLI yeniden deneme ekler.
   *
   * - Yeniden deneme AYNI adresi ister (rastgele cache-bust yok): `MediaImage`
   *   `key` ile yeniden kurulur, tarayıcı isteği tekrar yapar. SW önbelleği
   *   yalnız 0/200 yanıtı tuttuğu için 404 yanıtı tekrar denemede tazelenir.
   * - En çok `maxRetries` deneme; sonrası açıklayıcı mesaj. `src` değişince
   *   sayaç ve hata sıfırlanır. Form verisi dokunulmaz; sunucu izinleri aynen.
   * - Düğme deneme boyunca DOM'da kalır (odak düşmez); başarıda odak
   *   kapsayıcıya taşınır. Fallback metni tıklamayı yutmaz, yalnız düğme
   *   üstteki hover katmanının üzerinde tıklanabilir kalır.
   */
  const props = defineProps({
    src: { type: String, default: "" },
    alt: { type: String, default: "" },
    maxRetries: { type: Number, default: 3 },
  });
  const { t } = useI18n();
  const root = ref(null);
  const retryBtn = ref(null);
  const failed = ref(false);
  const retrying = ref(false);
  const attempt = ref(0);
  const exhausted = computed(() => attempt.value >= props.maxRetries);
  const message = computed(() => {
    if (retrying.value) return t("mediaFlow.imageRetrying");
    return exhausted.value ? t("mediaFlow.imageRetryExhausted") : t("mediaFlow.imageFailed");
  });
  watch(
    () => props.src,
    () => {
      failed.value = false;
      retrying.value = false;
      attempt.value = 0;
    }
  );
  function retry() {
    if (retrying.value || exhausted.value) return;
    attempt.value += 1;
    retrying.value = true;
  }
  async function onError() {
    const hadFocus = retryBtn.value && document.activeElement === retryBtn.value;
    retrying.value = false;
    failed.value = true;
    await nextTick();
    // Son deneme de başarısızsa düğme kalkar; odak kapsayıcıda kalsın (BODY'ye düşmesin)
    if (hadFocus && exhausted.value) root.value?.focus();
  }
  async function onLoad() {
    const hadFocus = retryBtn.value && document.activeElement === retryBtn.value;
    retrying.value = false;
    failed.value = false;
    await nextTick();
    if (hadFocus) root.value?.focus();
  }
</script>

<template>
  <span ref="root" class="fimg" tabindex="-1">
    <MediaImage
      :key="`${src}#${attempt}`"
      :src="src"
      :alt="alt"
      class="fimg__img"
      @error="onError"
      @load="onLoad"
    />
    <span v-if="failed || retrying" class="fimg__fallback" role="status" aria-live="polite">
      <AppIcon name="image" :size="20" />
      <span class="fimg__text">{{ message }}</span>
      <button
        v-if="!exhausted || retrying"
        ref="retryBtn"
        type="button"
        class="fimg__retry"
        :aria-disabled="retrying ? 'true' : undefined"
        @click="retry"
      >
        {{ t("mediaFlow.imageRetry") }}
      </button>
    </span>
  </span>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  .fimg {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    outline: none;
  }
  .fimg__img {
    width: 100%;
    height: 100%;
  }
  // Metin katmanı tıklamayı yutmaz (üst hover katmanındaki sil/taşı çalışır); yalnız düğme üstte
  // Üste hizalı: galeri hover katmanının ortadaki taşı/sil düğmeleri ve alttaki alt-metin girişi serbest kalır
  .fimg__fallback {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 6px;
    padding: 10px 8px 8px;
    text-align: center;
    color: $l-text-500;
    background: $l-bg-subtle;
    pointer-events: none;
    @include dark {
      color: $d-text-muted;
      background: $d-bg-elevated;
    }
  }
  .fimg__text {
    font-size: 11px;
    line-height: 14px;
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  .fimg__retry {
    position: relative;
    z-index: 20;
    pointer-events: auto;
    height: 28px;
    padding: 0 10px;
    border: 1px solid $l-border;
    border-radius: 6px;
    background: $l-bg;
    color: $l-text-700;
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    &::after {
      content: "";
      position: absolute;
      inset: -8px 0;
    }
    &:hover {
      background: $l-bg-muted;
    }
    &[aria-disabled="true"] {
      cursor: progress;
      opacity: 0.7;
    }
    &:focus-visible {
      outline: 2px solid $brand;
      outline-offset: 2px;
    }
    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
      color: $d-text;
    }
  }
</style>
