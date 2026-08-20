<script setup>
  import { computed, onBeforeUnmount, onMounted, ref } from "vue";

  import SimPageTemplate from "@/components/media/simulator/SimPageTemplate.vue";
  import { deviceFrame, frameStyle } from "@/lib/media/simulator";

  /**
   * T-111 — **cihaz çerçevesi**. Sayfayı cihazın gerçek CSS genişliğinde
   * kurar, sonra `transform: scale()` ile ekrana sığdırır.
   *
   * ## Neden `transform`, neden `zoom` değil
   *
   * Kaynak kabul ölçütü açık (`docs/ui/faz11-simulator.md` §2): çerçeveye
   * `width: 390px` verilip `transform: scale(0.6)` uygulanır. CSS `zoom` ya
   * da kapsayıcıyı 234px'e daraltmak **yanlıştır** — ikisi de düzeni yeniden
   * hesaplatır ve 390px'lik cihazın gerçek kırılımı yerine 234px'lik SAHTE
   * bir kırılım simüle edilir. `transform` düzen akışını hiç değiştirmez;
   * sahne 390px'lik dünyada kalır, yalnız boyanırken küçülür.
   *
   * Bunun bedeli: `transform` yer kaplamayı da değiştirmez, çerçeve
   * ölçeklenmemiş boyu kadar yer isterdi. Bu yüzden kabuk `renderedWidth`
   * ×`renderedHeight` ölçüsünü **elle** alır (`frameStyle().shell`).
   *
   * ## Ölçek yüzdesi görünür
   *
   * Başlıkta hem `%77` hem `scale(0.77)` yazar: kullanıcının gördüğü boyutun
   * gerçek boyut OLMADIĞI belli olmalı, ve bu ekran süper admin ekranı
   * olduğu için CSS'in kendisini göstermek okunurluğu artırır.
   *
   * ## Tembel montaj
   *
   * 65 çerçeve aynı anda kurulursa liste ağırlaşır; `IntersectionObserver`
   * görünür olmadan sahneyi kurmaz, yer tutucu **aynı ölçüde** durduğu için
   * kaydırma sıçramaz. Bu bir tasarım kararıdır: kaç ms kazandırdığı
   * **ÖLÇÜLMEDİ** — bu görevde tarayıcı ölçümü yapılmadı. `IntersectionObserver`
   * yoksa (sunucu tarafı render, eski tarayıcı) çerçeve doğrudan kurulur,
   * yani tembellik bir görünürlük şartı değil, bir iyileştirmedir.
   */
  const props = defineProps({
    /** `DEVICES` içinden bir cihaz. */
    device: { type: Object, required: true },
    /** `PAGES` içinden bir sayfa. */
    page: { type: Object, required: true },
    /** Çerçeveye ayrılan ekran genişliği (px) — ölçek bundan çıkar. */
    availableWidth: { type: Number, default: 320 },
    /** Vurgulanacak bölgenin anahtarı. */
    activeRegionKey: { type: String, default: "" },
    /** Seçili çerçeve mi — matriste bir tanesi işaretlenir. */
    selected: { type: Boolean, default: false },
    /** Görünür olana kadar sahneyi kurma. */
    lazy: { type: Boolean, default: false },
    /** Karolara basılacak gerçek türev görselleri — `SimPageTemplate`'e geçer. */
    images: { type: Array, default: () => [] },
    /** Başlık çubuğunu sakla — matris modunda üstte kendi etiketi var. */
    compact: { type: Boolean, default: false },
  });

  const emit = defineEmits(["pick"]);

  const frame = computed(() => deviceFrame(props.device, props.availableWidth));
  const style = computed(() => frameStyle(frame.value));

  const root = ref(null);
  const hasObserver =
    typeof window !== "undefined" && typeof window.IntersectionObserver === "function";
  /** `IntersectionObserver` yoksa tembellik yok — içerik ASLA gizli kalmaz. */
  const mounted = ref(!props.lazy || !hasObserver);
  let observer = null;

  onMounted(() => {
    if (mounted.value || !root.value) return;
    observer = new window.IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        mounted.value = true;
        observer?.disconnect();
        observer = null;
      },
      { rootMargin: "300px" }
    );
    observer.observe(root.value);
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });
</script>

<template>
  <figure
    ref="root"
    class="simfrm"
    :class="{ 'simfrm--on': selected, 'simfrm--compact': compact }"
    :data-device="device.id"
  >
    <figcaption class="simfrm__bar">
      <button type="button" class="simfrm__pick" @click="emit('pick', device)">
        <span class="simfrm__name">{{ device.label }}</span>
        <span class="simfrm__spec">{{ frame.cssWidth }}×{{ frame.cssHeight }} · DPR {{ frame.dpr }}</span>
      </button>
      <!-- Ölçek görünür: görülen boyut gerçek boyut DEĞİL. -->
      <span class="simfrm__scale" :data-scale="frame.scale" :title="`transform: scale(${frame.scale.toFixed(2)})`">
        %{{ frame.scalePct }}<span class="simfrm__scaleCss"> · scale({{ frame.scale.toFixed(2) }})</span>
      </span>
    </figcaption>

    <!-- Kabuk ölçeklenmiş ölçüyü taşır; sahne GERÇEK CSS ölçüsünde durur. -->
    <div class="simfrm__shell" :style="style.shell">
      <div v-if="mounted" class="simfrm__stage" :style="style.stage">
        <SimPageTemplate
          :page="page"
          :device="device"
          :active-region-key="activeRegionKey"
          :images="images"
        />
      </div>
      <div v-else class="simfrm__placeholder" aria-hidden="true"></div>
    </div>
  </figure>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .simfrm {
    margin: 0;
    display: inline-flex;
    flex-direction: column;
    gap: media.$s-2;
    min-width: 0;
  }

  .simfrm__bar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-2;
    min-width: 0;
  }

  .simfrm__pick {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: start;
    cursor: pointer;
    border-radius: media.$r-sm;
    @include media.focus-ring;
  }

  .simfrm__name {
    @include media.text("sm");
    font-weight: 640;
    @include media.heading;
    @include media.truncate;
    max-width: 100%;
  }

  .simfrm__spec {
    @include media.text("xs");
    @include media.muted(1);
    @include media.numeric;
  }

  .simfrm__scale {
    flex-shrink: 0;
    @include media.chip("neutral");
    @include media.numeric;
  }

  .simfrm__scaleCss {
    @include media.muted(1);
    font-weight: 500;
  }

  // Matris modunda çerçeve küçüktür: ad tek satır, CSS karşılığı gizli
  // (title'da duruyor), ölçek çipi küçük.
  .simfrm--compact {
    .simfrm__scaleCss {
      display: none;
    }

    .simfrm__name {
      @include media.text("xs");
    }

    .simfrm__spec {
      font-size: 0.6875rem;
    }
  }

  .simfrm__shell {
    // `transform: scale()` düzen akışını değiştirmediği için kabuğun ölçüsü
    // elle veriliyor; `overflow: hidden` sahnenin taşan kısmını kırpar —
    // gerçek cihazda da ekranın altı görünmez.
    position: relative;
    overflow: hidden;
    border-radius: media.$r-md;
    border: 1px solid $l-border;
    background: $l-bg;
    box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
    transition: border-color $t-fast, box-shadow $t-fast;

    @include dark {
      border-color: $d-border;
      background: $d-bg;
    }
  }

  .simfrm--on .simfrm__shell {
    border-color: $brand;
    box-shadow: 0 0 0 2px $brand-glow, 0 1px 2px rgb(0 0 0 / 4%);
  }

  .simfrm__stage {
    // FİZİKSEL konum bilerek: `transform-origin: top left` de fizikseldir,
    // ikisini karıştırmak (mantıksal `inset-inline-start` + fiziksel origin)
    // Arapça arayüzde sahneyi çerçevenin dışına kaydırırdı.
    position: absolute;
    top: 0;
    left: 0;
  }

  .simfrm__placeholder {
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      45deg,
      $l-bg-muted,
      $l-bg-muted 6px,
      transparent 6px,
      transparent 12px
    );

    @include dark {
      background: repeating-linear-gradient(
        45deg,
        $d-bg-elevated,
        $d-bg-elevated 6px,
        transparent 6px,
        transparent 12px
      );
    }
  }
</style>
