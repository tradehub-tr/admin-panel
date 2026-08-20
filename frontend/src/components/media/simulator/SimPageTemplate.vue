<script setup>
  import { computed } from "vue";

  import { LAYOUT_SLIDER, pageTemplate } from "@/lib/media/simulator";

  /**
   * Sayfa şablonu — bir sayfanın **gerçek CSS genişliğinde** çizilmiş
   * ızgara şeması.
   *
   * ## Ne taklit edilir, ne edilmez
   *
   * `placements.json` **yatay** ızgara kuralını taşır: kapsayıcı, kenar
   * boşluğu, sütun sayısı, sütun arası, rezerve edilmiş sütun. Şablon bunları
   * birebir çizer — 768px'te 3 sütun görürsünüz çünkü veride 3 yazıyor,
   * bileşende değil.
   *
   * **Dikey konum taklit EDİLMEZ.** Veride bölgelerin sayfadaki y konumu,
   * yüksekliği ya da araya giren başlıklar YOK; sahte bir site başlığı ya da
   * "hero 480px yüksekliğinde" gibi bir varsayım çizmek, ölçülmemiş bir şeyi
   * ölçülmüş gibi göstermek olurdu. Bölgeler `placements.json`'daki sırayla,
   * eşit aralıkla, kendi şeritlerinde durur.
   *
   * ## Rezerve sütun nerede duruyor
   *
   * İki farklı rezerve var ve veride ikisi de yalnız bir **px sayısı**:
   *
   *   · `grid.subtract_px` — listelemede 240–256px'lik filtre kolonu
   *     (`ProductListingGrid` öncesi `hidden lg:block`, yani BAŞTA), mağaza
   *     vitrininde ise kartın kendi iç boşluğu (`p-4 xl:p-6`, iki yana
   *     bölünür). Veri ikisini AYIRMIYOR; şablon hepsini başta tek şerit
   *     olarak çizer ve px değerini üstüne yazar.
   *   · Kapsayıcının `subtract` adımı — PDP'nin sağ rayı (394px + 16px gap),
   *     `derived_from` açıkça "sağ ray" diyor; sonda çizilir.
   */
  const props = defineProps({
    /** `PAGES` içinden bir sayfa. */
    page: { type: Object, required: true },
    /** `DEVICES` içinden bir cihaz — kutu genişlikleri buna göre çözülür. */
    device: { type: Object, required: true },
    /** Vurgulanacak bölgenin anahtarı (`sayfa/bolge`). */
    activeRegionKey: { type: String, default: "" },
    /**
     * Karolara basılacak GERÇEK türev görselleri — `[{ url, width, height }]`.
     * Boşsa karo şematik kutu olarak çizilir; görsel yokluğu arıza değildir.
     */
    images: { type: Array, default: () => [] },
  });

  const template = computed(() => pageTemplate(props.page, props.device, props.activeRegionKey));

  /**
   * Karo için görsel: bant + sıra indeksinden deterministik seçilir, böylece
   * aynı sayfa farklı cihazlarda AYNI ürünleri gösterir ve göz cihazlar arası
   * karşılaştırma yaparken ürün değil yalnız boyut değişir.
   */
  function imageFor(bandIndex, tileIndex) {
    const n = props.images.length;
    if (!n) return null;
    return props.images[(bandIndex * 7 + (tileIndex - 1)) % n];
  }

  /** Kenar boşluğu + padding'in yarısı: içerik şeridinin başlangıcı. */
  function rowStyle(block) {
    const c = block.container;
    return {
      marginInlineStart: `${c.marginPx + c.paddingPx / 2}px`,
      width: `${Math.max(0, c.outerPx - c.paddingPx)}px`,
    };
  }

  function tileStyle(block) {
    return { width: `${block.tile.widthPx}px`, height: `${block.tile.heightPx}px` };
  }

  /** Kaydırıcıda karolar şeridi TAŞAR — devamı olduğunu gösteren tek yol. */
  const isSlider = (block) => block.kind === LAYOUT_SLIDER;
</script>

<template>
  <div class="simpage" :style="{ width: `${template.viewportPx}px` }">
    <div
      v-for="(block, bi) in template.blocks"
      :key="block.regionKey"
      class="simpage__band"
      :class="{
        'simpage__band--on': block.active,
        'simpage__band--lcp': block.lcpCandidate,
      }"
      :data-region="block.regionKey"
      :data-kind="block.kind"
      :data-band="block.bandMinVw"
      :data-box="Math.round(block.boxPx)"
    >
      <div class="simpage__row" :style="rowStyle(block)">
        <p class="simpage__meta">
          <span class="simpage__name">{{ block.title }}</span>
          <span class="simpage__band-tag">≥{{ block.bandMinVw }}px</span>
          <span v-if="block.cols" class="simpage__band-tag">{{ block.cols }}×</span>
          <span v-else-if="block.perView" class="simpage__band-tag">{{ block.perView }}×</span>
          <span class="simpage__px">{{ Math.round(block.boxPx) }}px</span>
          <span v-if="block.lcpCandidate" class="simpage__lcp">LCP</span>
          <span v-if="block.overflows" class="simpage__over">
            {{ Math.round(block.boxPx) }} &gt; {{ Math.round(block.container.contentPx) }}px
          </span>
        </p>

        <div class="simpage__lanes">
          <!-- Rezerve şerit: filtre kolonu ya da kart iç boşluğu. -->
          <div
            v-if="block.reservePx"
            class="simpage__reserve"
            :style="{ width: `${block.reservePx}px` }"
          >
            {{ block.reservePx }}px
          </div>

          <div
            class="simpage__track"
            :class="{ 'simpage__track--scroll': isSlider(block) }"
            :style="{ width: `${Math.max(0, block.trackPx)}px`, gap: `${block.gapPx}px` }"
          >
            <div
              v-for="i in block.count"
              :key="i"
              class="simpage__tile"
              :style="tileStyle(block)"
            >
              <!-- Gerçek türev dosyası: karo ölçüsü kutunun ölçüsüdür, görsel
                   `object-fit: cover` ile doldurur — storefront'un yaptığı gibi. -->
              <img
                v-if="imageFor(bi, i)"
                :src="imageFor(bi, i).url"
                :width="imageFor(bi, i).width"
                :height="imageFor(bi, i).height"
                alt=""
                loading="lazy"
                decoding="async"
                draggable="false"
              />
            </div>
          </div>

          <!-- Kapsayıcının rezerve ettiği sağ ray (PDP). -->
          <div
            v-if="block.container.subtractPx"
            class="simpage__rail"
            :style="{ width: `${block.container.subtractPx}px` }"
          >
            {{ block.container.subtractPx }}px
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .simpage {
    // Sahne cihazın GERÇEK CSS genişliğinde kurulur; küçültme işi
    // SimDeviceFrame'in `transform: scale()`'ıdır. Burada hiçbir şey
    // daraltılmaz, yoksa simüle edilen kırılım sahte olur.
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 0;
    box-sizing: border-box;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg;
    }
  }

  .simpage__band {
    position: relative;
    padding: 6px 0;
    border-block-start: 1px dashed rgba(148, 163, 184, 0.45);
  }

  // Seçili bölge: sol kenarda marka rengi bir şerit + hafif zemin. Marka
  // rengi bu sayfada YALNIZ seçim anlamına gelir.
  .simpage__band--on {
    background: rgba($brand, 0.1);
    border-block-start-color: rgba($brand, 0.8);
    box-shadow: inset 4px 0 0 $brand;
  }

  .simpage__row {
    box-sizing: border-box;
  }

  .simpage__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin: 0 0 4px;
    font-size: 11px;
    line-height: 1.3;
    color: $l-text-600;

    @include dark {
      color: $d-text-muted;
    }
  }

  .simpage__name {
    font-weight: 700;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .simpage__band-tag,
  .simpage__px {
    font-variant-numeric: tabular-nums;
    padding: 0 4px;
    border-radius: 3px;
    background: rgba(148, 163, 184, 0.22);
  }

  .simpage__lcp {
    padding: 0 4px;
    border-radius: 3px;
    font-weight: 700;
    background: rgba($c-success, 0.22);
  }

  .simpage__over {
    padding: 0 4px;
    border-radius: 3px;
    font-weight: 700;
    background: rgba($c-error, 0.24);
    font-variant-numeric: tabular-nums;
  }

  .simpage__lanes {
    display: flex;
    align-items: flex-start;
    gap: 0;
  }

  .simpage__track {
    display: flex;
    flex-shrink: 0;
    align-items: flex-start;
  }

  .simpage__track--scroll {
    overflow: hidden;
  }

  // Karo: görsel yoksa nötr şematik kutu (marka rengi değil — marka rengi
  // seçime ayrıldı). Görsel varsa kutuyu tam doldurur; storefront'un
  // `object-fit: cover` davranışıyla aynı, böylece kırpma da görünür.
  .simpage__tile {
    flex: 0 0 auto;
    position: relative;
    overflow: hidden;
    border-radius: 4px;
    background: linear-gradient(135deg, rgba(148, 163, 184, 0.28), rgba(148, 163, 184, 0.12));
    border: 1px solid rgba(148, 163, 184, 0.55);
    box-sizing: border-box;

    > img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: $l-bg;
    }
  }

  .simpage__band--lcp .simpage__tile {
    border-color: rgba($c-success, 0.7);
  }

  .simpage__band--lcp .simpage__tile:first-child {
    box-shadow: 0 0 0 2px rgba($c-success, 0.55);
  }

  .simpage__reserve,
  .simpage__rail {
    flex: 0 0 auto;
    box-sizing: border-box;
    min-height: 28px;
    border-radius: 4px;
    font-size: 10px;
    line-height: 26px;
    text-align: center;
    color: $l-text-600;
    background: repeating-linear-gradient(
      45deg,
      rgba(148, 163, 184, 0.28),
      rgba(148, 163, 184, 0.28) 4px,
      transparent 4px,
      transparent 8px
    );
    border: 1px dashed rgba(148, 163, 184, 0.6);
    font-variant-numeric: tabular-nums;

    @include dark {
      color: $d-text-muted;
    }
  }
</style>
