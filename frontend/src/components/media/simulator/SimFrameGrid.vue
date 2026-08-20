<script setup>
  import { useI18n } from "vue-i18n";

  import SimDeviceFrame from "@/components/media/simulator/SimDeviceFrame.vue";

  /**
   * Çerçeve matrisi — sayfa başına bir şerit, şeritte cihaz başına bir
   * çerçeve. 5 sayfa × 13 cihaz = **65 çerçeve**; kaynak kabul ölçütünün
   * "13×5 kombinasyonun tamamı hatasız render olur" maddesi bu bileşende
   * karşılanır ve `__tests__/frameRender.test.js` 65'ini de sunucuda
   * koşturup sayar.
   *
   * **Düzen (UI/UX yeniden düzenlemesi).** Şerit artık sarmalanmıyor: 13
   * çerçeve yatay kaydırılan tek bir rayda durur, böylece bir sayfanın
   * cihazdan cihaza nasıl daraldığı tek bakışta, yan yana okunur. Sarmalı
   * düzende 3-4 çerçeve alt alta iniyor, karşılaştırma gözle kuruluyordu.
   *
   * **Süre iddiası YOK.** Kaynak plan matris modunda "< 1,5 sn ilk boyama"
   * hedefi koyuyor ve tembel montajı öneriyor. Tembel montaj burada var
   * (`SimDeviceFrame`'in `lazy` desteği), ama bu görevde tarayıcıda ölçüm
   * YAPILMADI: hedefin tutup tutmadığı **ÖLÇÜLMEDİ**.
   */
  defineProps({
    /** `DEVICES` — her biri bir sütun. */
    devices: { type: Array, required: true },
    /** `PAGES` — her biri bir şerit. */
    pages: { type: Array, required: true },
    /** Tek çerçeveye ayrılan ekran genişliği (px). */
    frameWidth: { type: Number, default: 200 },
    /** Vurgulanacak cihaz. */
    activeDeviceId: { type: String, default: "" },
    /** Vurgulanacak bölge — sayfası eşleşen çerçevede işaretlenir. */
    activeRegionKey: { type: String, default: "" },
    /** Görünene kadar çerçeveyi kurma. */
    lazy: { type: Boolean, default: true },
    /** Karolara basılacak gerçek türev görselleri. */
    images: { type: Array, default: () => [] },
  });

  const emit = defineEmits(["pick"]);
  const { t } = useI18n();
</script>

<template>
  <div class="simgrid">
    <section v-for="page in pages" :key="page.page" class="simgrid__band">
      <h3 class="simgrid__title">
        <span>{{ page.title }}</span>
        <span class="simgrid__count">
          {{ t("mediaSimulator.frames.regions", { n: page.regions.length }) }}
        </span>
        <span
          v-if="page.layoutSwitchVw"
          class="simgrid__switch"
          :title="t('mediaSimulator.frames.switchHint')"
        >
          ≥{{ page.layoutSwitchVw }}px
        </span>
      </h3>
      <div class="simgrid__row">
        <SimDeviceFrame
          v-for="device in devices"
          :key="`${page.page}/${device.id}`"
          :device="device"
          :page="page"
          :available-width="frameWidth"
          :active-region-key="activeRegionKey"
          :selected="device.id === activeDeviceId"
          :lazy="lazy"
          :images="images"
          compact
          @pick="emit('pick', { device, page })"
        />
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  @use "@/assets/scss/simulator" as sim;

  .simgrid {
    display: flex;
    flex-direction: column;
    gap: media.$s-4;
  }

  .simgrid__title {
    display: flex;
    align-items: baseline;
    gap: media.$s-2;
    margin: 0 0 media.$s-2;
    @include media.text("sm");
    font-weight: 640;
    @include media.heading;
  }

  .simgrid__count {
    @include media.text("xs");
    font-weight: 500;
    @include media.muted(1);
  }

  .simgrid__switch {
    @include media.chip("neutral");
    @include media.numeric;
  }

  // Yatay ray: çerçeveler yan yana, kaydırma yatay, her çerçeve bir durak.
  .simgrid__row {
    display: flex;
    align-items: flex-start;
    gap: media.$s-3;
    overflow-x: auto;
    padding: media.$s-1 media.$s-1 media.$s-3;
    scroll-snap-type: x proximity;
    scrollbar-width: thin;

    > * {
      scroll-snap-align: start;
      flex-shrink: 0;
    }
  }
</style>
