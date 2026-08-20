<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import SimDeviceFrame from "@/components/media/simulator/SimDeviceFrame.vue";
  import SimFrameGrid from "@/components/media/simulator/SimFrameGrid.vue";
  import SimMatrixTable from "@/components/media/simulator/SimMatrixTable.vue";
  import SimOptionGroup from "@/components/media/simulator/SimOptionGroup.vue";
  import SimPosterCard from "@/components/media/simulator/SimPosterCard.vue";
  import SimResultCard from "@/components/media/simulator/SimResultCard.vue";
  import SimSegmented from "@/components/media/simulator/SimSegmented.vue";
  import SimVideoDecisionCard from "@/components/media/simulator/SimVideoDecisionCard.vue";
  import { useSimulatorImagery } from "@/composables/useSimulatorImagery";
  import { useSrcsetSimulator } from "@/composables/useSrcsetSimulator";
  import {
    DEVICES,
    DEVICE_MEASUREMENT,
    EXCLUDED_REGIONS,
    PAGES,
    PLACEMENT_MEASUREMENT,
  } from "@/lib/media/simulator";

  /**
   * T-111 … T-115 — Önizleme simülatörü ekranı (UI/UX yeniden düzenlemesi,
   * 2026-08-20).
   *
   * İki soru sorar ve ikisini de yanıtlar:
   *
   *   1. **"Bu cihaz, bu sayfanın bu bölgesinde hangi türevi indirir — ve o
   *      türev yeter mi?"** — seçim ve sayı (T-112…T-115).
   *   2. **"O bölge o cihazda NEREDE ve NE KADAR duruyor?"** — cihaz
   *      çerçevesi ve sayfa şablonu (T-111). Sayfa cihazın **gerçek CSS
   *      genişliğinde** kurulur, `transform: scale()` ile küçültülür, ölçek
   *      yüzdesi çerçevenin başlığında yazar.
   *
   * ## Düzen
   *
   * Ekran iki moda ayrılır — "Görsel türevi" ve "Video". İki panel de
   * `v-show` ile durur: DOM'da ikisi de vardır (SSR duman testi 65+13
   * satırı ve karar kartını tek çıktıda sayar), yalnız biri görünür.
   * Cihaz/yerleşim seçicileri kaydırmalı iki dikey liste yerine sınıfına /
   * sayfasına göre gruplanmış yatay çiplerdir (`SimOptionGroup` chips
   * düzeni; ARIA sözleşmesi aynı). 65 çerçevelik matris ile tablo aynı
   * yerin iki görünümüdür, segment anahtarıyla değişir.
   *
   * ## Dürüstlük
   *
   * Hesap bu dosyada YOK. Cihaz/yerleşim verisi `tradehub_core`'dan
   * vendor'lanır, seçim `@/lib/media/simulator`'da yapılır ve o modül
   * `srcset.py` ile her `npm test`'te 195 + 13 vektörde karşılaştırılır
   * (ölçülen sapma: 0).
   *
   *   · `Media Rendition` tablosu BOŞ olabilir — "türev henüz üretilmedi,
   *     hesaplanan hedef genişlik şu" birinci sınıf durum, arıza değil.
   *   · Cihaz ve kutu değerleri ÖLÇÜLMEDİ (emülasyon + CSS aritmetiği);
   *     ekran bunu saklamaz, başlığın hemen altındaki durum çiplerinde
   *     yazar (DEVICE_MEASUREMENT / PLACEMENT_MEASUREMENT).
   *   · Kutusu statik CSS'ten çıkarılamayan bölgeler (EXCLUDED_REGIONS)
   *     gizlenmez, gerekçesiyle listelenir.
   *   · Çerçevenin tarayıcıda kaç ms'de boyandığı **ÖLÇÜLMEDİ** — tembel
   *     montaj var ama tarayıcı ölçümü bu görevde yapılmadı.
   */
  const { t } = useI18n();
  const sim = useSrcsetSimulator();
  const {
    deviceId,
    regionKey,
    matrixAllRegions,
    device,
    deviceOptions,
    placementOptions,
    selection,
    sizes,
    srcset,
    matrix,
    summary,
    probe,
    probeState,
    probeRow,
  } = sim;

  /** Karolara basılan GERÇEK türev görselleri — seçilen basamağın kendisi. */
  const imagery = useSimulatorImagery();

  /** Ekranın iki modu. Panel `v-show` ile durur, DOM'dan düşmez. */
  const mode = ref("image");
  const modeOptions = computed(() => [
    { id: "image", label: t("mediaSimulator.mode.image", {}, "Görsel türevi") },
    { id: "video", label: t("mediaSimulator.mode.video", {}, "Video") },
  ]);

  /** Matris görünümü: çerçeve rayı mı, sayı tablosu mu. */
  const matrixView = ref("frames");
  const matrixViewOptions = computed(() => [
    { id: "frames", label: t("mediaSimulator.matrix.viewFrames", {}, "Çerçeveler") },
    { id: "table", label: t("mediaSimulator.matrix.viewTable", {}, "Tablo") },
  ]);

  /** Cihaz sınıfı anahtarlarının görünen adı. */
  const deviceGroupLabels = computed(() => ({
    phone: t("mediaSimulator.deviceClass.phone", {}, "Telefon"),
    tablet: t("mediaSimulator.deviceClass.tablet", {}, "Tablet"),
    laptop: t("mediaSimulator.deviceClass.laptop", {}, "Laptop"),
    desktop: t("mediaSimulator.deviceClass.desktop", {}, "Masaüstü"),
  }));

  /** Seçili bölgenin sayfası — çerçeve bütün sayfayı çizer, tek bölgeyi değil. */
  const page = computed(
    () => PAGES.find((p) => p.regions.some((r) => r.key === regionKey.value)) || PAGES[0]
  );

  // ── Çerçeve ölçeği ──────────────────────────────────────────────
  // Ölçek "kullanılabilir genişlik / cihazın CSS genişliği". Kullanılabilir
  // genişlik CSS'ten okunamaz (ölçek JS'te hesaplanıyor), o yüzden kabın
  // gerçek genişliği ölçülür. `ResizeObserver` yoksa varsayılan kalır —
  // çerçeve yine çizilir, yalnız ekrana tam oturmaz.
  const stageBox = ref(null);
  const measuredWidth = ref(360);
  /** Çerçeveye verilen genişlik: ölçülen kart genişliği, 400px tavanlı —
   *  geniş ekranda çerçeve büyümek yerine sonuç kartına yer bırakır. */
  const stageWidth = computed(() => Math.min(400, measuredWidth.value));
  let resizeObserver = null;

  onMounted(() => {
    if (!stageBox.value || typeof window.ResizeObserver !== "function") return;
    resizeObserver = new window.ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      if (w > 0) measuredWidth.value = w;
    });
    resizeObserver.observe(stageBox.value);
  });

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });

  // Seçilen basamak değişince gerçek satırı VE karo görsellerini yeniden
  // sor. `watch` — computed içine istek koymak yan etki olurdu (kural 5).
  watch(
    () => selection.value.chosen?.name,
    (profile) => {
      probe();
      imagery.load(profile);
    }
  );
  onMounted(() => {
    probe();
    imagery.load(selection.value.chosen?.name);
  });

  const headline = computed(() =>
    t("mediaSimulator.summary.line", {
      total: summary.value.total,
      insufficient: summary.value.sourceInsufficient,
      overshoot: summary.value.overshoot,
      zoom: summary.value.zoomInsufficient,
      mean: summary.value.meanOvershoot.toFixed(2),
    })
  );

  /** Karo görselleri hakkında tek satırlık dürüst not. */
  const imageryNote = computed(() => {
    if (imagery.fellBack.value) {
      return t(
        "mediaSimulator.frames.fallback",
        { wanted: imagery.requestedProfile.value, served: imagery.servedProfile.value },
        "{wanted} türevi henüz üretilmemiş — karolar {served} türevleriyle dolduruldu."
      );
    }
    if (imagery.images.value.length) {
      return t(
        "mediaSimulator.frames.realImages",
        { profile: imagery.servedProfile.value },
        "Karolar gerçek Media Rendition dosyalarıyla dolu ({profile}) — bu cihazın indireceği dosyanın ta kendisi."
      );
    }
    return t(
      "mediaSimulator.frames.noImages",
      {},
      "Bu profil için üretilmiş türev yok — karolar şematik. Görsel yokluğu arıza değildir."
    );
  });

  function pick(row) {
    deviceId.value = row.device.id;
    regionKey.value = row.region.key;
  }

  /** Çerçeve matrisinden seçim: cihazı değiştirir, sayfanın birincil bölgesine geçer. */
  function pickFrame({ device: d, page: p }) {
    deviceId.value = d.id;
    const primary = p.regions.find((r) => r.region === p.primaryRegion) || p.regions[0];
    if (primary) regionKey.value = primary.key;
  }
</script>

<template>
  <div class="msim-page">
    <div class="msim-head">
      <div>
        <h1>{{ t("mediaSimulator.title") }}</h1>
        <p class="msim-head__sub">{{ t("mediaSimulator.subtitle") }}</p>
      </div>
      <SimSegmented v-model="mode" :options="modeOptions" :label="t('mediaSimulator.title')" />
    </div>

    <!-- Ölçüm durumu başlığın hemen altında: bu sayfadaki her sayı
         türetilmiştir, hiçbiri gerçek cihazda ölçülmemiştir. Durum kodları
         (EMULE_DEGERLER_OLCULMEDI / KISMEN_DOGRULANDI…) kasten ekranda —
         gizlenmiş bir dipnot değil, veri künyesinin kendisi. -->
    <div class="msim-meas">
      <span class="msim-meas__chip">
        <span class="msim-meas__dot" aria-hidden="true"></span>
        <strong>{{ t("mediaSimulator.unmeasured.devices") }}</strong>
        <code>{{ DEVICE_MEASUREMENT.status }}</code>
      </span>
      <span class="msim-meas__chip">
        <span class="msim-meas__dot msim-meas__dot--part" aria-hidden="true"></span>
        <strong>{{ t("mediaSimulator.unmeasured.placements") }}</strong>
        <code>{{ PLACEMENT_MEASUREMENT.status }}</code>
      </span>
      <details class="msim-meas__more">
        <summary>
          {{ t("mediaSimulator.unmeasured.detail", {}, "Ayrıntı") }}
          <AppIcon name="chevron-down" :size="12" />
        </summary>
        <div class="msim-meas__body">
          <p class="msim-meas__title">{{ t("mediaSimulator.unmeasured.title") }}</p>
          <p>{{ DEVICE_MEASUREMENT.note }}</p>
          <p>{{ PLACEMENT_MEASUREMENT.note }}</p>
          <p>{{ t("mediaSimulator.unmeasured.browser") }}</p>
        </div>
      </details>
    </div>

    <!-- ═════════ GÖRSEL TÜREVİ ═════════ -->
    <div v-show="mode === 'image'" class="msim-stack">
      <section class="msim-card msim-pickers">
        <SimOptionGroup
          v-model="deviceId"
          :options="deviceOptions"
          :group-labels="deviceGroupLabels"
          :label="t('mediaSimulator.devices.title')"
          :description="t('mediaSimulator.devices.help')"
        />
        <SimOptionGroup
          v-model="regionKey"
          :options="placementOptions"
          :label="t('mediaSimulator.placements.title')"
          :description="t('mediaSimulator.placements.help')"
        />
      </section>

      <div class="msim-stage">
        <!-- T-111 — çerçeve sonuç kartının YANINDA: kullanıcı nerede
             durduğunu ve hangi türevin indiğini tek bakışta okur. -->
        <section ref="stageBox" class="msim-card msim-stage__frame">
          <SimDeviceFrame
            :device="device"
            :page="page"
            :available-width="stageWidth"
            :active-region-key="regionKey"
            :images="imagery.images.value"
            selected
          />
          <p class="msim-stage__note">{{ imageryNote }}</p>
        </section>
        <SimResultCard
          class="msim-stage__result"
          :selection="selection"
          :sizes="sizes"
          :srcset="srcset"
          :probe-state="probeState"
          :probe-row="probeRow"
        />
      </div>

      <section class="msim-card msim-matrix">
        <div class="msim-matrix__head">
          <h2>{{ t("mediaSimulator.matrix.title") }}</h2>
          <div class="msim-matrix__tools">
            <label class="msim-matrix__toggle">
              <input v-model="matrixAllRegions" type="checkbox" />
              {{ t("mediaSimulator.matrix.allRegions") }}
            </label>
            <SimSegmented
              v-model="matrixView"
              small
              :options="matrixViewOptions"
              :label="t('mediaSimulator.matrix.title')"
            />
          </div>
        </div>
        <!-- Sayım da canlı: yerleşim kapsamı değişince toplam duyurulur. -->
        <p class="msim-matrix__summary" aria-live="polite" role="status">{{ headline }}</p>
        <!-- T-111 — 5 sayfa × 13 cihaz = 65 çerçeve. İki görünüm aynı verinin
             iki yüzü: çerçeve "nerede", tablo "kaç piksel" sorusunu yanıtlar.
             `v-show` — SSR ikisini de basar, duman testi 65 çerçeveyi sayar. -->
        <SimFrameGrid
          v-show="matrixView === 'frames'"
          class="msim-frames"
          :devices="DEVICES"
          :pages="PAGES"
          :active-device-id="deviceId"
          :active-region-key="regionKey"
          :images="imagery.images.value"
          @pick="pickFrame"
        />
        <SimMatrixTable
          v-show="matrixView === 'table'"
          :rows="matrix"
          :summary="summary"
          :active-key="selection.key"
          @pick="pick"
        />
      </section>

      <section v-if="EXCLUDED_REGIONS.length" class="msim-card msim-excluded">
        <h2>{{ t("mediaSimulator.excluded.title") }}</h2>
        <p class="msim-excluded__lead">{{ t("mediaSimulator.excluded.lead") }}</p>
        <dl class="msim-excluded__list">
          <template v-for="x in EXCLUDED_REGIONS" :key="x.region">
            <dt><code>{{ x.region }}</code></dt>
            <dd>{{ x.reason }}</dd>
          </template>
        </dl>
      </section>
    </div>

    <!-- ═════════ VİDEO ═════════ -->
    <div v-show="mode === 'video'" class="msim-stack msim-video">
      <SimPosterCard :devices="DEVICES" :active-device-id="device.id" />
      <!-- T-071 — poster kartının YANINDA: poster "hangi basamak iner"
           sorusunu, bu kart "dosyaya ne yapılır ve NEDEN" sorusunu yanıtlar. -->
      <SimVideoDecisionCard />
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  @use "@/assets/scss/simulator" as sim;

  .msim-page {
    padding-bottom: media.$s-10;
  }

  .msim-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: media.$s-3 media.$s-5;
    margin-bottom: media.$s-3;

    h1 {
      margin: 0;
      font-size: 1.35rem;
      letter-spacing: -0.01em;
      @include media.heading;
      font-weight: 700;
    }
  }

  .msim-head__sub {
    margin: media.$s-05 0 0;
    @include media.text("sm");
    @include media.muted(1);
    max-width: 44rem;
  }

  // ── Ölçüm durumu ─────────────────────────────────────────────
  .msim-meas {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: media.$s-2;
    margin-bottom: media.$s-4;
  }

  .msim-meas__chip {
    display: inline-flex;
    align-items: center;
    gap: media.$s-2;
    padding: media.$s-1 media.$s-3;
    border-radius: media.$r-pill;
    border: 1px dashed $l-border;
    background: $l-bg;
    @include media.text("xs");
    @include media.muted(1);

    strong {
      font-weight: 620;
      color: $l-text-700;
    }

    code {
      @include sim.mono;
      font-size: 0.6875rem;
    }

    @include dark {
      border-color: $d-border;
      background: $d-bg-card;

      strong {
        color: $d-text;
      }
    }
  }

  .msim-meas__dot {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: $c-warning;
    flex-shrink: 0;
  }

  .msim-meas__dot--part {
    background: $c-info;
  }

  .msim-meas__more {
    summary {
      display: inline-flex;
      align-items: center;
      gap: media.$s-1;
      list-style: none;
      cursor: pointer;
      padding: media.$s-1 media.$s-2;
      border-radius: media.$r-md;
      @include media.text("xs");
      font-weight: 620;
      @include media.muted(1);
      transition: background $t-fast;
      @include media.focus-ring;

      &::-webkit-details-marker {
        display: none;
      }

      svg {
        transition: transform 150ms $ease-out;
      }
    }

    @include media.hoverable {
      summary:hover {
        background: $l-bg-muted;

        @include dark {
          background: $d-bg-elevated;
        }
      }
    }

    &[open] summary svg {
      transform: rotate(180deg);
    }
  }

  .msim-meas__body {
    position: absolute;
    z-index: 30;
    inset-inline-start: 0;
    top: calc(100% + #{media.$s-2});
    width: min(36rem, 92%);
    padding: media.$s-3 media.$s-4;
    border-radius: media.$r-lg;
    @include media.surface("raised");
    box-shadow: 0 6px 24px rgb(0 0 0 / 10%);
    @include media.text("xs");
    @include media.muted(1);

    p {
      margin: media.$s-2 0 0;
      line-height: 1.55;

      &:first-child {
        margin-top: 0;
      }
    }
  }

  .msim-meas__title {
    font-weight: 700;
    color: $l-text-900;

    @include dark {
      color: $d-text-hi;
    }
  }

  // ── Kartlar ve yığın ─────────────────────────────────────────
  .msim-stack > * + * {
    margin-top: media.$s-4;
  }

  .msim-card {
    @include media.surface("soft");
    padding: media.$s-4;
    border-radius: media.$r-lg;
  }

  .msim-pickers {
    display: flex;
    flex-direction: column;
    gap: media.$s-4;
  }

  // ── Sahne ────────────────────────────────────────────────────
  .msim-stage {
    display: grid;
    grid-template-columns: minmax(17rem, 27rem) minmax(0, 1fr);
    gap: media.$s-4;
    align-items: start;

    @media (max-width: media.$m-bp-rail) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .msim-stage__frame {
    min-width: 0;
  }

  .msim-stage__note {
    margin: media.$s-3 0 0;
    @include media.text("xs");
    @include media.muted(1);
    line-height: 1.5;
  }

  .msim-stage__result {
    min-width: 0;
  }

  // ── Matris ───────────────────────────────────────────────────
  .msim-matrix__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-2 media.$s-4;

    h2 {
      margin: 0;
      @include sim.section-title;
    }
  }

  .msim-matrix__tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: media.$s-2 media.$s-4;
  }

  .msim-matrix__toggle {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    @include media.text("sm");
    cursor: pointer;

    input {
      accent-color: $brand;
    }
  }

  .msim-matrix__summary {
    margin: media.$s-2 0 media.$s-3;
    @include media.text("sm");
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  // ── Ölçülemeyen bölgeler ─────────────────────────────────────
  .msim-excluded h2 {
    margin: 0 0 media.$s-1;
    @include sim.section-title;
  }

  .msim-excluded__lead {
    margin: 0 0 media.$s-2;
    @include media.text("xs");
    @include media.muted(1);
  }

  .msim-excluded__list {
    margin: 0;

    dt {
      @include media.text("sm");
      font-weight: 620;
      margin-top: media.$s-2;

      code {
        @include sim.mono;
        font-size: 0.8125rem;
      }
    }

    dd {
      margin: media.$s-05 0 0;
      @include media.text("xs");
      @include media.muted(1);
      line-height: 1.5;
    }
  }

  // ── Video modu ───────────────────────────────────────────────
  .msim-video {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: media.$s-4;
    align-items: start;

    > * + * {
      margin-top: 0;
    }

    @media (max-width: media.$m-bp-detail) {
      grid-template-columns: minmax(0, 1fr);

      > * + * {
        margin-top: media.$s-4;
      }
    }
  }
</style>
