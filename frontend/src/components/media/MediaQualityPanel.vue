<script setup>
  import { computed, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useMediaRenditions } from "@/composables/useMediaRenditions";
  import { formatBytes } from "@/utils/mediaFormat";

  /**
   * Detay çekmecesinin KALİTE sekmesi — kaynak ile normalize sonuç yan yana.
   *
   * Faz 9 kabul kriteri kaynak künyesini (ölçü, MP, DPI, format, renk uzayı,
   * alfa) normalize sonuçla karşılaştırmayı istiyor. Bugün ARKA TARAFTAN
   * gelenler yalnız ölçü, bayt ve biçim: DPI, renk uzayı ve alfa hiçbir uçta
   * yok. Bu satırlar tablodan ÇIKARILMADI, "—" ile duruyor ve altına neden
   * yazıldı — eksik ölçümü gizlemek, ölçüm yapılmış izlenimi verir.
   *
   * SSIM `Media Rendition.ssim` alanından geliyor ve ölçülmemişse 0 dönüyor;
   * ekran onu "0,000" diye DEĞİL "—" diye gösterir. "0,000 benzerlik" yazmak,
   * ölçüm eksikliğini kalite felaketi gibi gösterirdi.
   *
   * `Media Quality Report` DocType'ı KURULU DEĞİL (kurulu medya doctype'ları:
   * asset, rendition, profile, crop intent/override, processing job, engine ve
   * storage settings). Bu yüzden "uygulanan işleme kararları" listesi
   * gösterilemiyor; bölüm var olmayan veriyi doldurmaz, yokluğunu yazar.
   */
  const props = defineProps({
    /** Liste satırı: `{ bytes, width, height, ext, kind }`. */
    item: { type: Object, required: true },
    /** `File` docname — türev zinciri bunu ister, dosya adresini değil. */
    fileName: { type: String, default: "" },
    /** Bölüm başlığının id'si — çağıran `aria-labelledby` kurabilsin. */
    headingId: { type: String, default: "" },
  });

  const { t } = useI18n();
  const { rows, loading, emptyReason, error, denied, load } = useMediaRenditions();

  watch(
    () => props.fileName,
    (name) => load(name),
    { immediate: true }
  );

  const DASH = "—";

  const sourceBytes = computed(() => Number(props.item?.bytes) || 0);
  const sourceWidth = computed(() => Number(props.item?.width) || 0);
  const sourceHeight = computed(() => Number(props.item?.height) || 0);

  /**
   * Normalize sonucun temsilcisi: EN BÜYÜK türev.
   *
   * Türevler bir merdiven (w96…w1920); kaynakla karşılaştırılabilecek tek
   * basamak en büyüğü. Toplam bayt ile karşılaştırmak yanıltıcı olurdu —
   * merdivenin tamamı tek bir görselin yerine geçmiyor.
   */
  const largest = computed(() =>
    rows.value.reduce((en, r) => (!en || r.width > en.width ? r : en), null)
  );

  function megapixels(w, h) {
    if (!w || !h) return DASH;
    return `${((w * h) / 1e6).toFixed(2).replace(".", ",")} MP`;
  }

  function dims(w, h) {
    return w && h ? `${w} × ${h}` : DASH;
  }

  /** Kaynak ↔ sonuç karşılaştırma satırları. Ölçülmeyen alan "—" kalır. */
  const facts = computed(() => {
    const l = largest.value;
    return [
      {
        key: "dimensions",
        source: dims(sourceWidth.value, sourceHeight.value),
        result: l ? dims(l.width, l.height) : DASH,
      },
      {
        key: "megapixels",
        source: megapixels(sourceWidth.value, sourceHeight.value),
        result: l ? megapixels(l.width, l.height) : DASH,
      },
      {
        key: "bytes",
        source: sourceBytes.value ? formatBytes(sourceBytes.value) : DASH,
        result: l && l.bytes ? formatBytes(l.bytes) : DASH,
      },
      {
        key: "format",
        source: props.item?.ext || DASH,
        result: l ? l.format || DASH : DASH,
      },
      // Aşağıdaki üçünün arka tarafta karşılığı YOK. Satır duruyor ki
      // "ölçülmedi" ile "sorunsuz" karıştırılmasın.
      { key: "dpi", source: DASH, result: DASH },
      { key: "colorSpace", source: DASH, result: DASH },
      { key: "alpha", source: DASH, result: DASH },
    ];
  });

  /**
   * Tasarruf oranı — YALNIZ iki gerçek sayı varken hesaplanır.
   *
   * Kaynak baytı ya da türev baytı bilinmiyorsa oran hesaplanmaz; "%0 tasarruf"
   * yazmak, ölçülmemiş bir şeyi ölçülmüş gibi göstermek olurdu.
   */
  const savings = computed(() => {
    const l = largest.value;
    if (!sourceBytes.value || !l || !l.bytes) return null;
    const oran = 1 - l.bytes / sourceBytes.value;
    return {
      percent: Math.round(oran * 100),
      from: formatBytes(sourceBytes.value),
      to: formatBytes(l.bytes),
    };
  });

  /** SSIM ölçülmüş türevler — 0 "ölçülmedi" demek, "kötü" değil. */
  const measured = computed(() => rows.value.filter((r) => r.ssim > 0));

  const worstSsim = computed(() =>
    measured.value.length ? Math.min(...measured.value.map((r) => r.ssim)) : null
  );

  /** Türev tarafının boş/arıza durumu — kalite ölçümü de onunla birlikte yok. */
  const notice = computed(() => {
    if (loading.value) return { icon: "loader", text: t("media.quality.loading") };
    if (denied.value) return { icon: "lock", text: t("media.quality.denied") };
    if (error.value) return { icon: "circle-alert", text: t("media.quality.failed") };
    if (!rows.value.length) {
      return {
        icon: "clock",
        text:
          emptyReason.value === "noAsset"
            ? t("media.quality.notInPipeline")
            : t("media.quality.notMeasured"),
      };
    }
    return null;
  });
</script>

<template>
  <section class="mqual" :aria-busy="loading">
    <h3 :id="headingId || undefined" class="mqual__title">
      <AppIcon name="gauge" :size="14" />
      {{ t("media.quality.title") }}
    </h3>

    <!-- Kaynak ↔ normalize sonuç. Sonuç sütunu türev yokken tamamen "—":
         boş sütun, "hiç işlenmedi" bilgisinin kendisidir. -->
    <table class="mqual__table">
      <caption class="mqual__caption">
        {{
          t("media.quality.caption")
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t("media.quality.col.attribute") }}</th>
          <th scope="col">{{ t("media.quality.col.source") }}</th>
          <th scope="col">{{ t("media.quality.col.result") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in facts" :key="f.key">
          <th scope="row">{{ t(`media.quality.attr.${f.key}`) }}</th>
          <td class="mqual__num">{{ f.source }}</td>
          <td class="mqual__num">{{ f.result }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="savings" class="mqual__savings" data-test="quality-savings">
      <AppIcon name="sparkles" :size="14" />
      {{ t("media.quality.savings", savings) }}
    </p>

    <p v-if="notice" class="mqual__notice" data-test="quality-notice">
      <AppIcon :name="notice.icon" :size="14" />
      {{ notice.text }}
    </p>

    <p v-else class="mqual__ssim" data-test="quality-ssim">
      <AppIcon name="info" :size="14" />
      <!-- Ölçülmemiş SSIM 0 gelir; "0,000" yazmak ölçüm eksikliğini kalite
           sorunu gibi gösterirdi — ölçülmediyse ölçülmedi yazar. -->
      {{
        worstSsim === null
          ? t("media.quality.ssimNone")
          : t("media.quality.ssimWorst", {
              value: worstSsim.toFixed(3),
              n: measured.length,
              total: rows.length,
            })
      }}
    </p>

    <!--
      SINIR NOTU. İki ayrı eksik var ve ikisi de gizlenmiyor:
        1. DPI / renk uzayı / alfa hiçbir uçtan gelmiyor.
        2. `Media Quality Report` DocType'ı kurulu değil — "uygulanan işleme
           kararları" listesi bu yüzden gösterilemiyor.
    -->
    <p class="mqual__scope" data-test="quality-scope">
      <AppIcon name="info" :size="13" />
      {{ t("media.quality.scopeNote") }}
    </p>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mqual {
    display: grid;
    gap: media.$s-3;
  }

  .mqual__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    @include media.text("sm");
    font-weight: 700;
    @include media.heading;
  }

  .mqual__table {
    width: 100%;
    border-collapse: collapse;
    @include media.text("sm");
  }

  .mqual__caption {
    @include media.text("xs");
    @include media.muted(1);
    text-align: start;
    padding-bottom: media.$s-1;
  }

  .mqual__table th,
  .mqual__table td {
    padding: media.$s-1 media.$s-2;
    text-align: start;
    @include media.divider(bottom);
  }

  .mqual__table thead th {
    @include media.text("xs");
    @include media.muted(1);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 700;
  }

  .mqual__table tbody th {
    font-weight: 600;
    color: $l-text-700;

    @include dark {
      color: $d-text;
    }
  }

  .mqual__num {
    text-align: end;
    @include media.numeric;
  }

  .mqual__savings,
  .mqual__notice,
  .mqual__ssim {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    padding: media.$s-3;
    border-radius: media.$r-md;
    @include media.text("sm");
    // Tek başına ekranda kalabilen bilgi: rengi `muted` DEĞİL.
    color: $l-text-900;
    background: $l-bg-muted;

    @include dark {
      color: $d-text;
      background: $d-bg-elevated;
    }
  }

  .mqual__scope {
    display: flex;
    align-items: flex-start;
    gap: media.$s-1;
    margin: 0;
    padding-top: media.$s-2;
    @include media.text("xs");
    @include media.muted(1);
    @include media.divider(top);
  }
</style>
