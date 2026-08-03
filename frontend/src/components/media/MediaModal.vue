<template>
  <!-- Masaüstünde pop, telefonda alttan sheet — geldiği yönden gider
       (ANIMATION_AUDIT §7 Standart 1/4). Backdrop panelle eş zamanlı solar. -->
  <Transition name="mmodal">
    <div
      v-if="open"
      ref="root"
      class="mmodal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @keydown.esc.stop.prevent="close"
      @keydown.tab="onTab"
    >
      <div class="mmodal__backdrop" @click="close" />

      <div class="mmodal__panel" :style="{ '--mmodal-width': width }">
        <header class="mmodal__head">
          <h2 :id="titleId" class="mmodal__title">{{ title }}</h2>
          <slot name="head" />
          <button type="button" class="mmodal__close" :aria-label="closeLabel" @click="close">
            <AppIcon name="x" :size="18" />
          </button>
        </header>

        <div class="mmodal__body" :class="{ 'mmodal__body--flush': flush }">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="mmodal__foot">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script setup>
  import { nextTick, ref, useId, watch } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useScrollLock } from "@/composables/useScrollLock";

  /**
   * Modal kabuğu — backdrop, başlık, ESC, odak tuzağı ve odak iadesi tek yerde.
   * Seçici ve önizleme modalları bunu kullanır; her modal kendi kopyasını
   * taşımaz (tekrarlı yapı önlemi).
   */
  defineProps({
    title: { type: String, required: true },
    closeLabel: { type: String, default: "Kapat" },
    width: { type: String, default: "48rem" },
    /** İçerik kenar boşluksuz aksın (tam genişlik önizleme vb.). */
    flush: { type: Boolean, default: false },
  });
  const emit = defineEmits(["close"]);
  const open = defineModel("open", { type: Boolean, default: false });

  const titleId = `mmodal-${useId()}`;
  const root = ref(null);
  let lastFocused = null;

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables() {
    if (!root.value) return [];
    return [...root.value.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
  }

  /** Tab döngüsünü modal içinde tutar. */
  function onTab(event) {
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !root.value.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function close() {
    open.value = false;
    emit("close");
  }

  useScrollLock(open);

  watch(open, async (isOpen) => {
    if (isOpen) {
      lastFocused = document.activeElement;
      await nextTick();
      (focusables()[0] || root.value)?.focus();
      return;
    }
    lastFocused?.focus?.();
    lastFocused = null;
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mmodal {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: grid;
    place-items: center;
    padding: media.$s-4;

    // Mobilde ortalanmış kutu yerine tam ekran: 16px tipografiyle içerik
    // 92vh'lik kutuya sığmıyor, kenar payı da yatay alanı yiyordu.
    @media (max-width: media.$m-bp-md) {
      padding: 0;
    }
  }

  .mmodal__backdrop {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 58%);
  }

  // ── Giriş / çıkış ────────────────────────────────────────────────
  .mmodal-enter-active,
  .mmodal-leave-active {
    transition: opacity $d-fast ease-out;
  }

  .mmodal-enter-from,
  .mmodal-leave-to {
    opacity: 0;
  }

  .mmodal-enter-active .mmodal__panel {
    transition: transform $d-modal $ease-out;
  }

  .mmodal-leave-active .mmodal__panel {
    transition: transform $d-pop $ease-out;
  }

  .mmodal-enter-from .mmodal__panel,
  .mmodal-leave-to .mmodal__panel {
    transform: scale(0.96);
  }

  // Telefonda tam ekran: alttan gelir, alta gider (giriş güçlü, çıkış hızlı).
  @media (max-width: media.$m-bp-md) {
    .mmodal-enter-active .mmodal__panel {
      transition: transform $d-sheet $ease-drawer;
    }

    .mmodal-leave-active .mmodal__panel {
      transition: transform $d-modal $ease-drawer;
    }

    .mmodal-enter-from .mmodal__panel,
    .mmodal-leave-to .mmodal__panel {
      transform: translateY(100%);
    }
  }

  .mmodal__panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: min(var(--mmodal-width), 100%);
    max-height: min(46rem, 92vh);
    border-radius: media.$r-lg;
    overflow: hidden;
    @include media.surface("raised");

    @media (max-width: media.$m-bp-md) {
      width: 100%;
      height: 100dvh;
      max-height: none;
      border: 0;
      border-radius: 0;
    }
  }

  .mmodal__head {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-3 media.$s-4;
    @include media.divider;
  }

  .mmodal__title {
    flex: 1;
    margin: 0;
    font-size: 1.0625rem;
    @include media.heading;
    @include media.truncate;
  }

  .mmodal__close {
    @include media.icon-button;
    @include media.focus-ring;
  }

  .mmodal__body {
    flex: 1;
    overflow-y: auto;
    padding: media.$s-4;
  }

  .mmodal__body--flush {
    padding: 0;
  }

  .mmodal__foot {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: media.$s-2;
    padding: media.$s-4;
    @include media.divider(top);

    // Tam ekran modda alt kenar home indicator'a dayanıyor.
    @media (max-width: media.$m-bp-md) {
      padding-bottom: calc(#{media.$s-4} + env(safe-area-inset-bottom));
    }
  }
</style>
