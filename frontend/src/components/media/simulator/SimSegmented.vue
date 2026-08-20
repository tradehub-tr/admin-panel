<script setup>
  import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

  /**
   * Segment anahtarı — kayan göstergeli iki/üç durumlu seçim (mod ve matris
   * görünümü bunun iki örneği).
   *
   * Gösterge ayrı bir katmandır ve `transform: translateX()` ile kayar:
   * arka planın bir düğmeden diğerine "atlaması" yerine tek parça süzülür
   * (yalnız transform — düzen hesabı tetiklenmez). Ölçü `offsetLeft` ile
   * fizikseldir; `translateX` de fiziksel olduğu için RTL'de de doğru yere
   * gider.
   *
   * ARIA: sekme sözleşmesi (`tablist`/`tab`). Radio DEĞİL — sayfadaki iki
   * radiogroup (cihaz + yerleşim) sayımı bozulmasın.
   */
  const props = defineProps({
    /** `[{ id, label }]` */
    options: { type: Array, required: true },
    /** Grubun erişilebilir adı. */
    label: { type: String, required: true },
    /** Küçük boy — kart içi ikincil anahtarlar. */
    small: { type: Boolean, default: false },
  });

  const model = defineModel({ type: String, default: "" });

  const root = ref(null);
  const thumbStyle = ref({});

  function place() {
    const el = root.value?.querySelector('[aria-selected="true"]');
    if (!el) return;
    thumbStyle.value = {
      width: `${el.offsetWidth}px`,
      transform: `translateX(${el.offsetLeft}px)`,
    };
  }

  watch([model, () => props.options], () => nextTick(place));
  onMounted(() => {
    place();
    window.addEventListener("resize", place);
  });
  onBeforeUnmount(() => window.removeEventListener("resize", place));
</script>

<template>
  <div
    ref="root"
    class="simseg"
    :class="{ 'simseg--small': small }"
    role="tablist"
    :aria-label="label"
  >
    <span class="simseg__thumb" :style="thumbStyle" aria-hidden="true"></span>
    <button
      v-for="o in options"
      :key="o.id"
      type="button"
      role="tab"
      :aria-selected="model === o.id"
      class="simseg__btn"
      @click="model = o.id"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .simseg {
    position: relative;
    display: inline-flex;
    padding: 3px;
    gap: 3px;
    border-radius: media.$r-md + 0.125rem;
    background: $l-bg-muted;
    border: 1px solid $l-border-alt;

    @include dark {
      background: $d-bg;
      border-color: $d-border-inner;
    }
  }

  .simseg__thumb {
    position: absolute;
    inset-block: 3px;
    inset-inline-start: 0;
    border-radius: media.$r-md;
    background: $l-bg;
    box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
    transition:
      transform 0.2s $ease-out,
      width 0.2s $ease-out;
    pointer-events: none;

    @include dark {
      background: $d-bg-elevated;
      box-shadow: 0 1px 3px rgb(0 0 0 / 45%);
    }
  }

  .simseg__btn {
    position: relative;
    z-index: 1;
    border: 0;
    background: transparent;
    padding: media.$s-1 media.$s-4;
    border-radius: media.$r-md;
    @include media.text("sm");
    font-weight: 620;
    color: $l-text-500;
    cursor: pointer;
    transition:
      color $t-fast,
      transform 130ms $ease-out;
    @include media.focus-ring;

    &:active {
      transform: scale(0.97);
    }

    @include dark {
      color: $d-text-muted;
    }

    &[aria-selected="true"] {
      color: $l-text-900;

      @include dark {
        color: $d-text-hi;
      }
    }
  }

  .simseg--small .simseg__btn {
    padding: media.$s-05 media.$s-3;
    @include media.text("xs");
  }
</style>
