<script setup>
  /**
   * Çekmece / modal katmanı (WCAG 2.1.2 · 2.4.3 · 4.1.2).
   *
   * Panelde ortak bir çekmece/modal kabuğu yok (`ConfirmDialog` yalnız metin
   * onayı çiziyor); odak tuzağı ve iade mantığı ise ortak:
   * `components/common/focusTrap.js` ve `composables/useScrollLock.js` aynen
   * kullanılıyor. Masaüstünde çekmece sağdan, modal ortada; <768px'te ikisi de
   * alttan gelen sayfa.
   */
  import { nextTick, ref, useId, watch } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { focusablesIn, restoreFocus, trapTabKey } from "@/components/common/focusTrap";
  import { useScrollLock } from "@/composables/useScrollLock";

  const props = defineProps({
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    /** drawer | modal */
    variant: { type: String, default: "modal" },
    /** md | wide | full (yalnız modal) */
    size: { type: String, default: "md" },
    /** Açılışta odaklanacak öğenin seçicisi; yoksa kapatma düğmesi. */
    initialFocus: { type: String, default: "" },
    /** Kapanışta odağın döneceği öğeyi veren fonksiyon (liste yeniden çizildiyse). */
    returnFocus: { type: Function, default: null },
    /** İşlem sürerken kapatmayı engeller. */
    busy: { type: Boolean, default: false },
  });
  const emit = defineEmits(["closed"]);
  const open = defineModel("open", { type: Boolean, default: false });

  const panelRef = ref(null);
  const titleId = useId();
  let opener = null;

  useScrollLock(open);

  function close() {
    if (props.busy) return;
    open.value = false;
  }

  function focusInside(selector) {
    const panel = panelRef.value;
    if (!panel) return;
    const target = (selector && panel.querySelector(selector)) || focusablesIn(panel)[0] || panel;
    target.focus();
  }

  watch(
    open,
    async (isOpen) => {
      if (isOpen) {
        opener = document.activeElement;
        await nextTick();
        focusInside(props.initialFocus);
        return;
      }
      // Liste yeniden çizilmiş olabilir: çağıran güncel öğeyi verir.
      await nextTick();
      restoreFocus(props.returnFocus?.() || opener);
      opener = null;
      emit("closed");
    },
    { flush: "post" }
  );

  defineExpose({ focusInside, panel: panelRef });
</script>

<template>
  <Teleport to="body">
    <Transition :name="variant === 'drawer' ? 'nt-drawer' : 'nt-modal'">
      <div
        v-if="open"
        class="nt nt-ov"
        :class="[`nt-ov--${variant}`, `nt-ov--${size}`]"
        @keydown.esc.stop="close"
        @keydown.tab="trapTabKey($event, panelRef)"
      >
        <div class="nt-ov__backdrop" @click="close" />
        <section
          ref="panelRef"
          class="nt-ov__panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
        >
          <div class="nt-ov__head">
            <div class="nt-ov__titles">
              <h2 :id="titleId" class="nt-h2">
                <slot name="title">{{ title }}</slot>
              </h2>
              <p v-if="subtitle" class="nt-sub nt-mono">{{ subtitle }}</p>
            </div>
            <button type="button" class="nt-icon-btn" aria-label="Kapat" @click="close">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <div class="nt-ov__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="nt-ov__foot">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // Katman gövdeye taşındığı için stiller scoped DEĞİL; hepsi `.nt-ov` altında.
  .nt-ov {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nt-ov__backdrop {
    position: absolute;
    inset: 0;
    background: media.$o-medium;
  }

  .nt-ov__panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: min(520px, calc(100vw - 32px));
    max-height: calc(100dvh - 48px);
    border: 1px solid var(--nt-line);
    border-radius: 14px;
    background: var(--nt-bg);
    box-shadow: var(--nt-shadow);
    outline: none;
  }

  .nt-ov--wide .nt-ov__panel {
    width: min(760px, calc(100vw - 32px));
  }

  .nt-ov--full .nt-ov__panel {
    width: min(720px, calc(100vw - 32px));
  }

  .nt-ov--drawer {
    justify-content: flex-end;

    .nt-ov__panel {
      width: min(440px, 100vw);
      height: 100dvh;
      max-height: none;
      border-width: 0 0 0 1px;
      border-radius: 0;
    }
  }

  .nt-ov__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 16px 12px;
    border-bottom: 1px solid var(--nt-line);
  }

  .nt-ov__titles {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .nt-ov__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
    padding: 16px;
    overflow-y: auto;
    // Odaklanan öğe sabit alt çubuğun altında kalmasın (WCAG 2.4.11).
    scroll-padding-block: 12px;
  }

  .nt-ov__foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--nt-line);
    background: var(--nt-bg);
    border-radius: 0 0 14px 14px;
  }

  // <768px: çekmece ve modal alttan gelen sayfa olur.
  @media (max-width: media.$m-bp-md) {
    .nt-ov {
      align-items: flex-end;
      justify-content: stretch;
    }

    .nt-ov .nt-ov__panel {
      width: 100%;
      height: auto;
      max-height: 92dvh;
      border-width: 1px 0 0;
      border-radius: 16px 16px 0 0;
      padding-bottom: env(safe-area-inset-bottom);
    }

    .nt-ov__foot {
      border-radius: 0;

      > * {
        flex: 1 1 auto;
      }
    }
  }

  // Giriş: geldiği yönden, ease-out. Çıkış girişten hızlı.
  .nt-drawer-enter-active,
  .nt-modal-enter-active {
    transition: opacity $d-modal $ease-out;

    .nt-ov__panel {
      transition:
        transform $d-modal $ease-drawer,
        opacity $d-modal $ease-out;
    }
  }

  .nt-drawer-leave-active,
  .nt-modal-leave-active {
    transition: opacity $d-fast $ease-out;

    .nt-ov__panel {
      transition: transform $d-fast $ease-out;
    }
  }

  .nt-drawer-enter-from,
  .nt-drawer-leave-to,
  .nt-modal-enter-from,
  .nt-modal-leave-to {
    opacity: 0;
  }

  .nt-drawer-enter-from .nt-ov__panel,
  .nt-drawer-leave-to .nt-ov__panel {
    transform: translateX(100%);
  }

  .nt-modal-enter-from .nt-ov__panel,
  .nt-modal-leave-to .nt-ov__panel {
    transform: translateY(8px) scale(0.98);
  }

  @media (max-width: media.$m-bp-md) {
    .nt-drawer-enter-from .nt-ov__panel,
    .nt-drawer-leave-to .nt-ov__panel,
    .nt-modal-enter-from .nt-ov__panel,
    .nt-modal-leave-to .nt-ov__panel {
      transform: translateY(100%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nt-ov .nt-ov__panel {
      transform: none !important;
    }
  }
</style>
