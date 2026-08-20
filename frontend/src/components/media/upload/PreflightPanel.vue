<template>
  <div class="up-pf" :class="`up-pf--${tone}`">
    <!-- Ölçüm önce: kullanıcı "neye göre reddedildim" sorusunun cevabını
         sebepten önce görmeli. Ölçülemeyen alan boş bırakılmıyor, açıkça
         "ölçülmedi" yazıyor — boşluk "sorun yok" diye okunurdu. -->
    <dl class="up-pf__facts">
      <div v-for="f in facts" :key="f.key" class="up-pf__fact">
        <dt>{{ t(`media.preflight.fact.${f.key}`, {}, FACT_TR[f.key] || f.key) }}</dt>
        <dd :class="{ 'up-pf__fact--unknown': f.unknown }">
          {{ f.unknown ? t("media.preflight.unmeasured", {}, "ölçülemedi") : f.value }}
        </dd>
      </div>
    </dl>

    <p v-if="!findings.length" class="up-pf__ok">
      <AppIcon name="circle-check" :size="14" />
      {{ t("media.preflight.allClear", {}, "Tüm ön kontroller temiz") }}
    </p>

    <ul v-else class="up-pf__list">
      <li
        v-for="(f, i) in sorted"
        :key="`${f.reason}-${i}`"
        class="up-pf__row"
        :class="`up-pf__row--${f.severity}`"
      >
        <AppIcon :name="iconFor(f.severity)" :size="14" class="up-pf__row-icon" />
        <div class="up-pf__row-body">
          <p class="up-pf__reason">{{ reasonText(f) }}</p>
          <!-- Düzeltme yolu. T-091: "ihlal metni + düzeltme yolu gösteriliyor".
               Sebebi söyleyip ne yapılacağını söylememek, kullanıcıyı aynı
               dosyayı üç kez yüklemeye gönderirdi. -->
          <p v-if="fixText(f)" class="up-pf__fix">{{ fixText(f) }}</p>
        </div>
      </li>
    </ul>

    <p v-if="slotPolicy" class="up-pf__slot">
      {{ t("media.preflight.slotLine", { slot: slotPolicy.title }) }}
    </p>
  </div>
</template>

<script setup>
  /**
   * Ön kontrol paneli — ölçüm + ihlal + düzeltme yolu.
   *
   * **Metin kodda değil çeviride.** Her bulgu bir `reason` kodu taşıyor
   * (`megapixel_bomb`, `ratio_not_allowed` …) ve karşılığı
   * `media.preflight.reason.<kod>` anahtarından geliyor. Sunucunun döndürdüğü
   * kodlar (`upload_too_large` gibi) `media.upload.err.<kod>` altında ZATEN
   * vardı; ikinci bir sözlük açmak aynı reddi iki farklı cümleyle anlatmak
   * olurdu.
   *
   * **Çevirisi olmayan kod sessizce kaybolmuyor**: `te()` ile bakılıyor ve
   * bulunamazsa kodun kendisi basılıyor. Boş satır göstermek, ekranı
   * "sorun yok" gibi okutur.
   */
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { SEVERITY } from "@/lib/media/upload/preflight.js";
  import { formatBytes } from "@/utils/mediaFormat";

  const props = defineProps({
    findings: { type: Array, default: () => [] },
    measure: { type: Object, default: null },
    slotPolicy: { type: Object, default: null },
  });

  const { t, te } = useI18n();

  // ── Sözlükte olmayan anahtarların TR varsayılanları ────────────────
  //
  // Locale dosyaları bu görevin kapsamı dışında (eksik anahtarlar raporda
  // listelendi); proje kalıbı `t(k, params, "TR")` — çeviri eklendiğinde
  // varsayılan kendiliğinden devre dışı kalır. Panelin ilkesi korunuyor:
  // karşılığı olmayan kod SESSİZCE kaybolmaz, en kötü kodun kendisi basılır.

  /** Ölçüm satırı başlıkları. */
  const FACT_TR = {
    size: "Boyut",
    dimensions: "Çözünürlük",
    megapixels: "Megapiksel",
    alpha: "Şeffaflık",
    dpi: "DPI",
    format: "Biçim",
    duration: "Süre",
    codec: "Codec",
  };

  /** İhlal metinleri — ölçülen değer + beklenen değer (T-091). */
  const REASON_TR = {
    mime_not_allowed: "Dosya türü ({mime}) bu slotta kabul edilmiyor. İzinli: {allowed}",
    ext_not_allowed: "{ext} uzantısı bu slotta kabul edilmiyor.",
    ext_content_mismatch: "Uzantı ({ext}) ile içerik imzası ({sniffed}) uyuşmuyor.",
    too_large: "Dosya {sizeMb} MB — bu slotun sınırı {limitMb} MB.",
    empty: "Dosya boş.",
    dangerous_content: "Dosya çalıştırılabilir / tehlikeli içerik taşıyor.",
    megapixel_bomb: "{measured} MP — izin verilen en çok {limit} MP.",
    animated_not_allowed: "Hareketli görsel bu slotta kabul edilmiyor.",
    short_edge_too_small: "Çözünürlük yetersiz: kısa kenar {measured}, gereken en az {limit}.",
    area_too_small: "Görsel alanı {measured} piksel — en az {limit} gerekli.",
    ratio_not_allowed: "En-boy oranı ({measured}) izinli değil. İzinli: {allowed}",
    count_exceeded: "{count} dosya — bu slot en fazla {limit} kabul ediyor.",
    alpha_lost: "Şeffaflık (alfa kanalı) çıktıda korunmayabilir.",
    under_spec: "Ölçü önerilen aralığın dışında (ölçülen: {measured}).",
    duration_out_of_range: "Süre {measured} sn — izinli aralık {min}–{max} sn.",
    bitrate_exceeded: "Bit hızı ~{measured} kbps — tavan {limit} kbps.",
    decode_failed: "Dosya çözümlenemedi — son kararı sunucu verecek.",
    probe_unavailable: "Ölçüm yapılamadı — son kararı sunucu verecek.",
    policy_not_found: "{slotKey} için slot politikası bulunamadı — genel kurallar geçerli.",
  };

  /** Düzeltme yolları — sebep söylenip ne yapılacağı söylenmezse kullanıcı
   *  aynı dosyayı üç kez dener (T-091 kabul ölçütü). */
  const FIX_TR = {
    short_edge_too_small:
      "Daha yüksek çözünürlüklü bir kopya yükleyin ({limit} ve üzeri) — küçük görsel büyütülmez.",
    too_large: "Dosyayı sıkıştırın ya da daha küçük bir sürümünü seçin.",
    ratio_not_allowed: "Görseli izinli orana kırpın (Kırpma Stüdyosu).",
    ext_not_allowed: "Dosyayı izinli bir biçime dönüştürün.",
    megapixel_bomb: "Görseli yeniden örnekleyip küçültün.",
    duration_out_of_range: "Videoyu izinli süre aralığına kısaltın.",
  };

  const AGIRLIK = { [SEVERITY.BLOCK]: 0, [SEVERITY.WARN]: 1, [SEVERITY.INFO]: 2 };

  const sorted = computed(() =>
    [...props.findings].sort((a, b) => (AGIRLIK[a.severity] ?? 3) - (AGIRLIK[b.severity] ?? 3))
  );

  const tone = computed(() => {
    if (props.findings.some((f) => f.severity === SEVERITY.BLOCK)) return "block";
    if (props.findings.some((f) => f.severity === SEVERITY.WARN)) return "warn";
    return "ok";
  });

  /** Ölçülen değerler — ölçülemeyen alan da satır olarak DURUYOR. */
  const facts = computed(() => {
    const m = props.measure;
    if (!m) return [];
    const video = props.slotPolicy?.kind === "video";
    const liste = [
      { key: "size", value: formatBytes(m.size), unknown: !m.size },
      {
        key: "dimensions",
        value: m.width && m.height ? `${m.width} × ${m.height}` : "",
        unknown: !(m.width && m.height),
      },
    ];
    if (video) {
      liste.push({
        key: "duration",
        value: m.durationS ? t("media.preflight.seconds", { n: Math.round(m.durationS) }) : "",
        unknown: m.durationS == null,
      });
      liste.push({ key: "codec", value: m.videoCodec || "", unknown: !m.videoCodec });
    } else {
      liste.push({
        key: "megapixels",
        value: m.megapixels ? m.megapixels.toFixed(1) : "",
        unknown: !m.megapixels,
      });
      liste.push({
        key: "alpha",
        value: m.hasAlpha
          ? t("media.preflight.yes", {}, "var")
          : t("media.preflight.no", {}, "yok"),
        unknown: m.hasAlpha == null,
      });
      // DPI ölçülüyor ama bir EŞİĞE bağlı değil: slot politikasında girdi
      // DPI'ı için kural yok, yalnız çıktı için `master.dpi_out` var.
      liste.push({ key: "dpi", value: m.dpi ? String(m.dpi) : "", unknown: !m.dpi });
    }
    liste.push({ key: "format", value: m.sniffed || m.ext || "", unknown: !(m.sniffed || m.ext) });
    return liste;
  });

  function iconFor(severity) {
    if (severity === SEVERITY.BLOCK) return "circle-x";
    if (severity === SEVERITY.WARN) return "triangle-alert";
    return "info";
  }

  function reasonText(f) {
    // Sunucudan gelen kodlar zaten çevrilmişti; onları yeniden yazmıyoruz.
    const sunucu = `media.upload.err.${f.reason}`;
    if (f.server && te(sunucu)) return t(sunucu, f.params || {});
    const anahtar = `media.preflight.reason.${f.reason}`;
    if (te(anahtar)) return t(anahtar, f.params || {});
    // Sözlükte yok: TR varsayılanı; o da yoksa kodun kendisi (sessiz kayıp yok).
    return REASON_TR[f.reason] ? t(anahtar, f.params || {}, REASON_TR[f.reason]) : f.reason;
  }

  function fixText(f) {
    const anahtar = `media.preflight.fix.${f.reason}`;
    if (te(anahtar)) return t(anahtar, f.params || {});
    return FIX_TR[f.reason] ? t(anahtar, f.params || {}, FIX_TR[f.reason]) : "";
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .up-pf {
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
    padding: media.$s-3;
    border-radius: media.$r-md;
    background: $l-bg-muted;
  }

  .up-pf--block {
    background: rgb(239 68 68 / 8%);
  }

  .up-pf--warn {
    background: rgb(245 158 11 / 10%);
  }

  .up-pf__facts {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-1 media.$s-3;
    margin: 0;
  }

  .up-pf__fact {
    display: flex;
    align-items: baseline;
    gap: media.$s-05;

    dt {
      @include media.text("xs");
      @include media.muted;
    }

    dd {
      margin: 0;
      @include media.text("xs");
      @include media.numeric;
    }
  }

  .up-pf__fact--unknown {
    font-style: italic;
    @include media.muted(2);
  }

  .up-pf__ok,
  .up-pf__slot {
    display: flex;
    align-items: center;
    gap: media.$s-1;
    margin: 0;
    @include media.text("xs");
    @include media.muted;
  }

  .up-pf__list {
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .up-pf__row {
    display: flex;
    gap: media.$s-2;
    align-items: flex-start;
  }

  .up-pf__row--block .up-pf__row-icon {
    color: $c-error;
  }

  .up-pf__row--warn .up-pf__row-icon {
    color: $c-warning;
  }

  .up-pf__row-icon {
    flex: none;
    margin-top: 2px;
  }

  .up-pf__reason {
    margin: 0;
    @include media.text("sm");
  }

  .up-pf__fix {
    margin: 0;
    @include media.text("xs");
    @include media.muted;
  }
</style>
