<script setup>
  import { computed, useId } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useRovingRadio } from "@/composables/useRovingRadio";

  /**
   * Sayfa haritası (öneri 02) — 15 bölge, düğme duvarı yerine sayfanın
   * minyatürü: solda 5 sayfa sekmesi, sağda seçili sayfanın bölgeleri
   * şematik kutular olarak. "Hangi bölge neredeydi?" sorusu haritadan okunur.
   *
   * Tek doğruluk kaynağı `model` (bölge anahtarı): aktif sayfa modelden
   * türetilir; sekmeye tıklamak o sayfanın BİRİNCİL bölgesini seçer (boş sekme
   * durumu yok). Ok tuşları aktif sayfanın bölgelerinde dolaşır
   * (`useRovingRadio`), sayfalar arası geçiş sekmelerdedir.
   */
  const props = defineProps({
    /** `PAGES` — { page, title, primaryRegion, regions[{ key, title, lcpCandidate, region }] }. */
    pages: { type: Array, required: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
  });

  const model = defineModel({ type: String, default: "" });

  const uid = useId();
  const labelId = `${uid}-label`;
  const descId = `${uid}-desc`;

  const activePage = computed(
    () => props.pages.find((p) => p.regions.some((r) => r.key === model.value)) || props.pages[0]
  );

  function pickPage(p) {
    if (p.page === activePage.value.page) return;
    const primary = p.regions.find((r) => r.region === p.primaryRegion) || p.regions[0];
    if (primary) model.value = primary.key;
  }

  const { buttons, activeIndex, onKeydown } = useRovingRadio(
    () => activePage.value.regions.map((r) => r.key),
    model
  );
</script>

<template>
  <div class="pmap">
    <div class="pmap__head">
      <p :id="labelId" class="pmap__label">{{ label }}</p>
      <p v-if="description" :id="descId" class="pmap__sr">{{ description }}</p>
    </div>
    <div class="pmap__body">
      <div class="pmap__tabs" role="group" :aria-labelledby="labelId">
        <button
          v-for="p in pages"
          :key="p.page"
          type="button"
          class="pmap__tab"
          :class="{ 'pmap__tab--on': p.page === activePage.page }"
          :aria-pressed="p.page === activePage.page"
          @click="pickPage(p)"
        >
          {{ p.title }}
          <span class="pmap__tab-n">{{ p.regions.length }}</span>
        </button>
      </div>

      <div class="pmap__sheet">
        <!-- Sayfa hissi: başlık çubuğu şeması — tıklanmaz, dekor. -->
        <span class="pmap__bar" aria-hidden="true"></span>
        <div
          class="pmap__regions"
          role="radiogroup"
          :aria-labelledby="labelId"
          :aria-describedby="description ? descId : undefined"
          @keydown="onKeydown"
        >
          <button
            v-for="(r, i) in activePage.regions"
            ref="buttons"
            :key="r.key"
            type="button"
            class="pmap__region"
            :class="{
              'pmap__region--on': model === r.key,
              'pmap__region--primary': r.region === activePage.primaryRegion,
            }"
            role="radio"
            :aria-checked="model === r.key"
            :tabindex="i === activeIndex ? 0 : -1"
            @click="model = r.key"
          >
            <span class="pmap__region-name">{{ r.title }}</span>
            <span v-if="r.lcpCandidate" class="pmap__lcp">
              <AppIcon name="zap" :size="10" />
              LCP
            </span>
            <span class="pmap__sr">{{ activePage.title }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  @use "@/assets/scss/simulator" as sim;

  .pmap {
    min-width: 0;
  }

  .pmap__head {
    margin-bottom: media.$s-2;
  }

  .pmap__label {
    margin: 0;
    @include sim.section-title;
  }

  .pmap__body {
    display: flex;
    gap: media.$s-3;
    align-items: stretch;

    @media (max-width: 640px) {
      flex-direction: column;
    }
  }

  .pmap__tabs {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    min-width: 9.5rem;
  }

  .pmap__tab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-2;
    padding: media.$s-1 media.$s-3;
    border: 0;
    border-radius: media.$r-md;
    background: none;
    cursor: pointer;
    text-align: start;
    @include media.text("sm");
    font-weight: 600;
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

  .pmap__tab--on {
    background: rgba($brand, 0.16);
    color: $l-text-900;
    font-weight: 700;

    @include dark {
      color: $d-text-hi;
    }
  }

  .pmap__tab-n {
    @include media.text("xs");
    @include media.numeric;
    @include media.muted(2);
  }

  .pmap__sheet {
    flex: 1;
    min-width: 0;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    padding: media.$s-3;

    @include dark {
      border-color: $d-border;
    }
  }

  .pmap__bar {
    display: block;
    width: 38%;
    height: 0.5rem;
    border-radius: 3px;
    background: $l-bg-muted;
    margin-bottom: media.$s-2;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .pmap__regions {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-2;
  }

  .pmap__region {
    // `sr-only` span'inin içerme bloğu — rafla aynı X-scroll tuzağına karşı.
    position: relative;
    flex: 1 1 9rem;
    min-height: 3.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: media.$s-2;
    padding: media.$s-2 media.$s-3;
    border: 1px dashed $l-border-alt;
    border-radius: media.$r-md;
    background: none;
    cursor: pointer;
    color: $l-text-500;
    @include media.text("xs");
    font-weight: 600;
    text-align: center;
    @include media.focus-ring;

    @include media.hoverable {
      &:hover {
        border-color: $l-text-400;
        color: $l-text-700;
      }
    }

    @include dark {
      border-color: $d-border-inner;
      color: $d-text-muted;
    }
  }

  // Sayfanın birincil bölgesi haritada da büyük durur.
  .pmap__region--primary {
    flex-grow: 1.8;
    min-height: 3.75rem;
  }

  .pmap__region--on {
    border-style: solid;
    border-color: $brand;
    border-width: 2px;
    background: rgba($brand, 0.14);
    color: $l-text-900;
    font-weight: 700;

    @include dark {
      color: $d-text-hi;
    }
  }

  .pmap__lcp {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 0 media.$s-1;
    border-radius: 999px;
    background: rgba($brand, 0.2);
    color: $c-warning-text;
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.04em;

    @include dark {
      color: $brand-light;
    }
  }

  .pmap__sr {
    @include media.sr-only;
  }
</style>
