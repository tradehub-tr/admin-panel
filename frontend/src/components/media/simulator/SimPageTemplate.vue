<script setup>
  import { computed } from "vue";

  import { LAYOUT_GRID, LAYOUT_SLIDER, pageTemplate } from "@/lib/media/simulator";

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

  /**
   * Karo bir ÜRÜN KARTI olarak mı çizilecek (öneri 01, 2026-09-01)?
   *
   * Grid ve slider bölgeleri storefront'ta ürün kartıdır: görsel + başlık +
   * fiyat + kalp + buton çifti. Kart iskeleti DEKORDUR — veriden ölçülen tek
   * şey karonun (görsel kutusunun) genişliğidir; iskelet sabit oranlı
   * çizilir ve sahne notunda dekor olduğu yazar. Sabit/akışkan bölgeler
   * (PDP ana görseli, lightbox, sepet küçük resmi) kart değildir, çıplak
   * karo kalır.
   */
  const isCard = (block) => block.kind === LAYOUT_GRID || block.kind === LAYOUT_SLIDER;
</script>

<template>
  <div class="simpage" :style="{ width: `${template.viewportPx}px` }">
    <!-- Site iskeleti (logo + arama + hesap) — dekor, ölçülmüş değil;
         minyatürün "bizim site" gibi okunması için (öneri 01). -->
    <div class="simpage__chrome" aria-hidden="true">
      <i class="simpage__chrome-logo"></i>
      <i class="simpage__chrome-search"></i>
      <i class="simpage__chrome-dot"></i>
    </div>
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
        <!-- Üç ayrı gri çip tek sessiz spec satırına indi — aynı sayılar,
             daha az mürekkep. LCP ve taşma rozet kalır: onlar sinyal. -->
        <p class="simpage__meta">
          <span class="simpage__name">{{ block.title }}</span>
          <span class="simpage__spec">
            ≥{{ block.bandMinVw }}px<template v-if="block.cols"> · {{ block.cols }}×</template
            ><template v-else-if="block.perView"> · {{ block.perView }}×</template>
            · {{ Math.round(block.boxPx) }}px
          </span>
          <span v-if="block.lcpCandidate" class="simpage__lcp">LCP</span>
          <span v-if="block.overflows" class="simpage__over">
            {{ Math.round(block.boxPx) }} &gt; {{ Math.round(block.container.contentPx) }}px
          </span>
        </p>

        <div class="simpage__lanes">
          <!-- Rezerve şerit: filtre kolonu ya da kart iç boşluğu. -->
          <!-- Etiket yalnız sığıyorsa: 16px'lik şeritte "16px" yazısı taşıp
               çerçevenin kenarında kırık bir çip gibi görünüyordu. -->
          <div
            v-if="block.reservePx"
            class="simpage__reserve"
            :style="{ width: `${block.reservePx}px` }"
            :title="`${block.reservePx}px`"
          >
            <template v-if="block.reservePx >= 44">{{ block.reservePx }}px</template>
          </div>

          <div
            class="simpage__track"
            :class="{ 'simpage__track--scroll': isSlider(block) }"
            :style="{ width: `${Math.max(0, block.trackPx)}px`, gap: `${block.gapPx}px` }"
          >
            <!-- Kart metası YALNIZ inline etiketlerle (`span`/`i`) kurulur:
                 çerçeve testleri bant sonunu ardışık `</div>` dizisinden
                 buluyor, meta içinde div kapanışı sayımı bozardı. -->
            <div
              v-for="i in block.count"
              :key="i"
              class="simpage__cell"
              :class="{ 'simpage__pcard': isCard(block) }"
            >
              <div class="simpage__tile" :style="tileStyle(block)">
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
                <span v-if="isCard(block)" class="simpage__cheart" aria-hidden="true">♡</span>
              </div>
              <span v-if="isCard(block)" class="simpage__cmeta" aria-hidden="true">
                <i class="simpage__cline"></i>
                <i class="simpage__cline simpage__cline--short"></i>
                <i class="simpage__cprice"></i>
                <span class="simpage__cbtns"><i></i><i></i></span>
              </span>
            </div>
          </div>

          <!-- Kapsayıcının rezerve ettiği sağ ray (PDP). -->
          <div
            v-if="block.container.subtractPx"
            class="simpage__rail"
            :style="{ width: `${block.container.subtractPx}px` }"
            :title="`${block.container.subtractPx}px`"
          >
            <template v-if="block.container.subtractPx >= 44">
              {{ block.container.subtractPx }}px
            </template>
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
    // Zemin BEYAZ — gerçek storefront sayfası gibi; gri zemin minyatürü
    // "bozuk ekran" gibi gösteriyordu (2026-08-31 geri bildirimi).
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 0;
    box-sizing: border-box;
    background: $l-bg;

    @include dark {
      background: $d-bg;
    }
  }

  // Site iskeleti — dekor; ölçülen hiçbir değer taşımaz.
  .simpage__chrome {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px 10px;
    border-block-end: 1px solid $l-border;

    i {
      display: block;
      background: $l-bg-muted;
      border-radius: 4px;
    }

    @include dark {
      border-block-end-color: $d-border;

      i {
        background: $d-bg-elevated;
      }
    }
  }

  .simpage__chrome-logo {
    width: 42px;
    height: 11px;
  }

  .simpage__chrome-search {
    flex: 1;
    height: 15px;
    border-radius: 8px !important;
  }

  .simpage__chrome-dot {
    width: 15px;
    height: 15px;
    border-radius: 50% !important;
  }

  .simpage__band {
    position: relative;
    padding: 6px 0;
    border-block-start: 1px dashed $l-border;

    @include dark {
      border-block-start-color: $d-border;
    }
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

  .simpage__spec {
    font-variant-numeric: tabular-nums;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
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
  .simpage__cell {
    flex: 0 0 auto;
    min-width: 0;
  }

  .simpage__tile {
    flex: 0 0 auto;
    position: relative;
    overflow: hidden;
    border-radius: 4px;
    background: $l-bg-muted;
    border: 1px solid $l-border;
    box-sizing: border-box;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }

    > img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: $l-bg;
    }
  }

  // ── Ürün kartı iskeleti (öneri 01) — DEKOR ───────────────────────
  // Ölçülen tek şey karonun (görsel kutusunun) genişliği; başlık/fiyat/
  // buton iskeleti storefront kart anatomisini tanıtmak için sabit oranlı
  // çizilir. Buton turuncusu storefront paletidir, panel markası değil.
  .simpage__pcard {
    border: 1px solid $l-border;
    border-radius: 6px;
    background: $l-bg;
    overflow: hidden;

    .simpage__tile {
      border: 0;
      border-radius: 0;
    }

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
    }
  }

  .simpage__cheart {
    position: absolute;
    top: 6px;
    inset-inline-end: 6px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: $l-bg;
    box-shadow: 0 1px 3px rgb(0 0 0 / 15%);
    color: $l-text-500;
    font-size: 9px;
    line-height: 1;
    pointer-events: none;
  }

  .simpage__cmeta {
    display: block;
    padding: 6px 8px 8px;
  }

  .simpage__cline {
    display: block;
    height: 5px;
    border-radius: 2px;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .simpage__cline--short {
    width: 60%;
    margin-top: 3px;
  }

  .simpage__cprice {
    display: block;
    width: 34%;
    height: 7px;
    margin-top: 6px;
    border-radius: 2px;
    background: $l-text-700;

    @include dark {
      background: $d-text-muted;
    }
  }

  .simpage__cbtns {
    display: flex;
    gap: 4px;
    margin-top: 6px;

    i {
      display: block;
      flex: 1;
      height: 10px;
      border-radius: 5px;
      box-sizing: border-box;
    }

    i:first-child {
      background: #f0954f;
    }

    i:last-child {
      border: 1px solid #f0954f;
    }
  }

  .simpage__band--lcp .simpage__tile {
    border-color: rgba($c-success, 0.7);
  }

  // Karo artık `.simpage__cell` sarmalayıcısında: `:first-child` hücreye
  // sorulur, yoksa her karo bandın ilki sanılırdı.
  .simpage__band--lcp .simpage__cell:first-child .simpage__tile {
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
      $l-bg-muted,
      $l-bg-muted 4px,
      transparent 4px,
      transparent 8px
    );
    border: 1px dashed $l-border-alt;
    font-variant-numeric: tabular-nums;
    overflow: hidden;

    @include dark {
      color: $d-text-muted;
      border-color: $d-border-inner;
      background: repeating-linear-gradient(
        45deg,
        $d-bg-elevated,
        $d-bg-elevated 4px,
        transparent 4px,
        transparent 8px
      );
    }
  }
</style>
