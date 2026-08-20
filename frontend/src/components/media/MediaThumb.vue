<template>
  <div class="media-thumb" :class="ratioClass">
    <MediaImage
      v-if="showImage"
      class="media-thumb__fill"
      :src="item.fileUrl"
      :alt="item.fileName"
      :width="item.width || 0"
      :height="item.height || 0"
      :lqip="item.lqip || ''"
      :renditions="item.renditions || []"
      :sizes="sizes"
      @error="broken = true"
    />
    <div
      v-else-if="item.gradient"
      class="media-thumb__fill"
      :style="{
        backgroundImage: `linear-gradient(140deg, ${item.gradient[0]}, ${item.gradient[1]})`,
      }"
    />
    <div v-else class="media-thumb__doc">
      <AppIcon :name="iconForKind(item.kind)" :size="iconSize" :stroke-width="1.6" />
      <span class="media-thumb__ext">{{ item.ext }}</span>
    </div>
    <slot />
  </div>
</template>

<script setup>
  import { computed, ref, watch } from "vue";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { panelSizes } from "@/components/media/delivery/sizes.js";
  import MediaImage from "@/components/media/MediaImage.vue";
  import { canRenderThumb, iconForKind } from "@/utils/mediaFormat";

  /**
   * Önizleme — üç kademe.
   *
   *   1. Gerçek dosya, tarayıcının çizebildiği bir görsel → dosyanın kendisi
   *   2. Gradyan tanımlıysa → gradyan (yalnız eski örnek kayıtlarda kaldı)
   *   3. Diğer hepsi → tür ikonu + uzantı rozeti
   *
   * Kademe 1 eskiden yoktu: ekran gerçek dosyalarla çalışmadığı için hep
   * gradyan çiziliyordu. Artık dosya gerçek, kullanıcı da gerçeğini görmeli —
   * hangi görseli sildiğini renk lekesinden anlayamaz.
   *
   * Kademe 1'in `<img>`'i `MediaImage`'a devredildi: kaynağın gerçek piksel
   * ölçüleri (`item.width/height`) öznitelik olarak basılsın ve inene kadar
   * yer tutucu dursun. Kutunun yüksekliği zaten `padding-top` ile ayrıldığı
   * için buradaki kazanç düzen değil, yükleme sırasındaki boşluk.
   */
  const props = defineProps({
    item: { type: Object, required: true },
    ratio: { type: String, default: "square" }, // square | wide
    iconSize: { type: Number, default: 26 },
    /**
     * Bu küçük resmin hangi panel yüzeyinde durduğu — `sizes` bundan
     * TÜRETİLİR (T-121), elle yazılmaz. `@/components/media/delivery/sizes.js`
     * bölge adlarını taşır: `libraryGrid` · `rowThumb` · `cellThumb` ·
     * `kanbanThumb` · `detailPreview`.
     *
     * Boş bırakılırsa `sizes` basılmaz ve `MediaImage` hiç `srcset`
     * üretmez — yani varsayılan davranış bu prop eklenmeden ÖNCEKİYLE
     * birebir aynı. Yanlış bir `sizes` ile servis etmektense hiç
     * etmemek tercih edildi.
     */
    region: { type: String, default: "" },
    /** `libraryGrid` bölgesinde sütun sayısı — yoğunluk seçicisinden. */
    density: { type: Number, default: 3 },
    /** `libraryGrid` bölgesinde detay panelinin sütunu açık mı. */
    detailOpen: { type: Boolean, default: false },
  });

  // Dosya diskte yoksa `img` hata verir; o zaman ikon kademesine düşülür.
  const broken = ref(false);
  watch(
    () => props.item.fileUrl,
    () => (broken.value = false)
  );

  const showImage = computed(
    () => !broken.value && Boolean(props.item.fileUrl) && canRenderThumb(props.item.fileUrl)
  );

  const ratioClass = computed(() => `media-thumb--${props.ratio}`);

  /**
   * `sizes` — bölge verildiyse panelin GERÇEK CSS'inden türetilir.
   *
   * Kutunun yüksekliği zaten `padding-top` ile ayrıldığı için buradaki
   * kazanç düzen değil AĞ: `sizes` olmadan `w` tanımlayıcılı bir `srcset`
   * tarayıcıya "100vw" dedirtir ve 40px'lik satır önizlemesi için en büyük
   * basamak inerdi.
   */
  const sizes = computed(() =>
    props.region
      ? panelSizes(props.region, { density: props.density, detailOpen: props.detailOpen })
      : ""
  );
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // Oran padding ile kurulur, `aspect-ratio` ile değil: grid item olduğunda
  // (detay paneli) aspect-ratio satır yüksekliği üretmiyor ve önizleme
  // altındaki içeriğin üstüne biniyordu.
  .media-thumb {
    position: relative;
    display: block;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }

    &::before {
      content: "";
      display: block;
    }
  }

  .media-thumb--square::before {
    padding-top: 100%;
  }

  .media-thumb--wide::before {
    padding-top: 75%;
  }

  .media-thumb__fill {
    position: absolute;
    inset: 0;
    // `img` de bu sınıfı kullanıyor: kutuyu doldursun, oranı bozulmasın.
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .media-thumb__doc {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: media.$s-1;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  // Ölçek media.scss §Tipografi: masaüstünde 12px, mobilde 1rem.
  .media-thumb__ext {
    @include media.text("xs");
    font-weight: 700;
    letter-spacing: 0.08em;
  }
</style>
