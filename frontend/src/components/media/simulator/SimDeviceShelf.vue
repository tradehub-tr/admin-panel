<script setup>
  import { computed, useId } from "vue";

  import { useRovingRadio } from "@/composables/useRovingRadio";

  /**
   * Cihaz rafı (öneri 02) — 13 referans cihaz, düğme duvarı yerine tek sıra
   * minik siluet: genişlik sırası da bilgidir (telefon dar, masaüstü geniş).
   * Siluet ölçüsü CSS viewport'undan türetilir (`16 + w/32`) — oran korunur,
   * uçlar taşmaz. Laptop siluetine taban çubuğu çizilir.
   *
   * ARIA sözleşmesi `useRovingRadio`'da: grup tek Tab durağı, ok tuşları /
   * Home / End ile gezilir, yatay oklar RTL'de ters döner.
   */
  const props = defineProps({
    /** `DEVICES` — { id, label, deviceClass, cssWidth, cssHeight, dpr }. */
    devices: { type: Array, required: true },
    /** Grubun görünür başlığı. */
    label: { type: String, required: true },
    /** Ekran okuyucuya giden tek satırlık açıklama. */
    description: { type: String, default: "" },
    /** Sınıf anahtarlarının görünen adı — `{ phone: "Telefon" }` gibi. */
    groupLabels: { type: Object, default: () => ({}) },
  });

  const model = defineModel({ type: String, default: "" });

  const uid = useId();
  const labelId = `${uid}-label`;
  const descId = `${uid}-desc`;

  const rows = computed(() =>
    props.devices.map((d, i) => ({
      ...d,
      index: i,
      newGroup: i > 0 && d.deviceClass !== props.devices[i - 1].deviceClass,
      silW: Math.round(16 + d.cssWidth / 32),
      silH: Math.round(12 + d.cssHeight / 32),
    }))
  );

  const groupLabel = (g) => props.groupLabels[g] || g;

  const { buttons, activeIndex, onKeydown } = useRovingRadio(
    () => props.devices.map((d) => d.id),
    model
  );
</script>

<template>
  <div class="shelf">
    <div class="shelf__head">
      <p :id="labelId" class="shelf__label">{{ label }}</p>
      <p v-if="description" :id="descId" class="shelf__sr">{{ description }}</p>
    </div>
    <div
      class="shelf__row"
      role="radiogroup"
      :aria-labelledby="labelId"
      :aria-describedby="description ? descId : undefined"
      @keydown="onKeydown"
    >
      <template v-for="d in rows" :key="d.id">
        <span v-if="d.newGroup" class="shelf__sep" aria-hidden="true"></span>
        <button
          ref="buttons"
          type="button"
          class="shelf__item"
          :class="{ 'shelf__item--on': model === d.id }"
          role="radio"
          :aria-checked="model === d.id"
          :tabindex="d.index === activeIndex ? 0 : -1"
          :title="`${d.cssWidth}×${d.cssHeight} · DPR ${d.dpr}`"
          @click="model = d.id"
        >
          <span
            class="shelf__sil"
            :class="`shelf__sil--${d.deviceClass || 'phone'}`"
            :style="{ width: `${d.silW}px`, height: `${d.silH}px` }"
            aria-hidden="true"
          ></span>
          <span class="shelf__name">{{ d.label }}</span>
          <span class="shelf__w">{{ d.cssWidth }}</span>
          <!-- Grup başlığı görsel değil; ekran okuyucu sınıfı seçeneğin
               içinde duysun. -->
          <span v-if="d.deviceClass" class="shelf__sr">{{ groupLabel(d.deviceClass) }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  @use "@/assets/scss/simulator" as sim;

  .shelf {
    min-width: 0;
  }

  .shelf__head {
    margin-bottom: media.$s-2;
  }

  .shelf__label {
    margin: 0;
    @include sim.section-title;
  }

  .shelf__row {
    display: flex;
    align-items: flex-end;
    gap: media.$s-1;
    overflow-x: auto;
    padding-bottom: media.$s-1;
  }

  .shelf__sep {
    flex: none;
    width: 1px;
    align-self: stretch;
    margin: media.$s-2 media.$s-2 media.$s-4;
    background: $l-border;

    @include dark {
      background: $d-border;
    }
  }

  .shelf__item {
    // `sr-only` span'i mutlak konumlu: içerme bloğu bu düğme olmalı, yoksa
    // köke göre konumlanıp sayfaya X scroll açıyor (ölçüldü 2026-09-01:
    // html.scrollWidth 1581/1280 — üç 1px'lik hayalet).
    position: relative;
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: media.$s-2 media.$s-2 media.$s-1;
    border: 0;
    border-radius: media.$r-md;
    background: none;
    cursor: pointer;
    color: $l-text-500;
    @include media.focus-ring;

    @include media.hoverable {
      &:hover {
        background: $l-bg-muted;

        @include dark {
          background: $d-bg-elevated;
        }
      }
    }

    @include dark {
      color: $d-text-muted;
    }
  }

  .shelf__sil {
    border: 1.5px solid currentcolor;
    border-radius: 4px;
    opacity: 0.75;
  }

  // Laptop: taban çubuğu — siluet sınıfını biçimden tanıtır.
  .shelf__sil--laptop {
    position: relative;
    border-radius: 3px 3px 2px 2px;

    &::after {
      content: "";
      position: absolute;
      inset-inline: 18%;
      bottom: -4px;
      height: 3px;
      border-radius: 2px;
      background: currentcolor;
    }
  }

  .shelf__sil--desktop {
    border-radius: 2px;
  }

  .shelf__name {
    max-width: 6.5rem;
    font-size: 0.625rem;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .shelf__w {
    font-size: 0.5625rem;
    @include media.numeric;
    @include media.muted(2);
  }

  .shelf__item--on {
    color: $l-text-900;
    background: rgba($brand, 0.14);

    .shelf__sil {
      border-color: $brand;
      border-width: 2.5px;
      background: rgba($brand, 0.18);
      opacity: 1;
    }

    .shelf__name {
      font-weight: 700;
    }

    @include dark {
      color: $d-text-hi;
    }
  }

  .shelf__sr {
    @include media.sr-only;
  }
</style>
