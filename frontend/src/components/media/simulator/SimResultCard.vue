<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { formatBytes } from "@/utils/mediaFormat";
  import {
    WARN_NO_PROFILE,
    WARN_OVERSHOOT,
    WARN_SOURCE_INSUFFICIENT,
    WARN_ZOOM_INSUFFICIENT,
  } from "@/lib/media/simulator";
  import {
    PROBE_DENIED,
    PROBE_EMPTY,
    PROBE_FAILED,
    PROBE_FOUND,
    PROBE_LOADING,
  } from "@/composables/useSrcsetSimulator";

  /**
   * "Bu cihaz, bu bölgede hangi türevi indirir" sorusunun cevabı.
   *
   * Sonuç `aria-live="polite"` bir bölgeye yazılır: cihaz ya da yerleşim
   * değiştiğinde ekran okuyucu kullanıcısı seçimin ne olduğunu ayrıca
   * gezinmeden duyar. Duyuru METNİ ayrı bir düğümde toplandı — tabloyu canlı
   * bölge yapmak her hücreyi tek tek okuturdu.
   */
  const props = defineProps({
    /** `simulate()` çıktısı. */
    selection: { type: Object, required: true },
    /** Üretilen `sizes` dizgesi. */
    sizes: { type: String, default: "" },
    /** Üretilen `srcset` dizgesi. */
    srcset: { type: String, default: "" },
    /** `useSrcsetSimulator().probeState` değeri. */
    probeState: { type: String, default: "idle" },
    /** Bulunduysa gerçek `Media Rendition` satırı. */
    probeRow: { type: Object, default: null },
  });

  const { t } = useI18n();

  const region = computed(() => props.selection.region);
  const device = computed(() => props.selection.device);
  const chosen = computed(() => props.selection.chosen);

  /** Ekran okuyucuya tek cümlede sonuç. */
  const announcement = computed(() => {
    const s = props.selection;
    if (!s.chosen) {
      return t("mediaSimulator.live.noProfile", {
        device: device.value.label,
        region: region.value.title,
      });
    }
    return t("mediaSimulator.live.result", {
      device: device.value.label,
      region: region.value.title,
      box: Math.round(s.cssBoxPx),
      required: s.requiredPx,
      profile: s.chosen.name,
      width: s.chosen.width,
    });
  });

  const WARN_ICON = {
    [WARN_SOURCE_INSUFFICIENT]: "circle-alert",
    [WARN_OVERSHOOT]: "trending-up",
    [WARN_ZOOM_INSUFFICIENT]: "search",
    [WARN_NO_PROFILE]: "ban",
  };

  const warnings = computed(() =>
    props.selection.warnings.map((code) => ({
      code,
      icon: WARN_ICON[code] || "circle-alert",
      text: t(`mediaSimulator.warn.${code}`, {
        chosen: chosen.value?.width ?? 0,
        required: props.selection.requiredPx,
        zoom: props.selection.zoomRequiredPx,
        multiplier: props.selection.demandMultiplier,
        cap: chosen.value?.maxOvershoot ?? 0,
        deficit: props.selection.deficitPx,
      }),
    }))
  );

  /**
   * Gerçek türev satırının durumu.
   *
   * `Media Rendition` tablosu BUGÜN BOŞ — boru hattı bayrakları kapalı.
   * "Bulunamadı" bir arıza değil, ekranın beklenen hâli: hesaplanan hedef
   * genişlik gösterilir, kırmızı uyarı basılmaz.
   */
  const probe = computed(() => {
    const map = {
      [PROBE_LOADING]: { icon: "loader", tone: "muted", key: "loading" },
      [PROBE_FOUND]: { icon: "check", tone: "ok", key: "found" },
      [PROBE_EMPTY]: { icon: "clock", tone: "muted", key: "notGenerated" },
      [PROBE_DENIED]: { icon: "lock", tone: "muted", key: "denied" },
      [PROBE_FAILED]: { icon: "circle-alert", tone: "warn", key: "failed" },
    };
    const hit = map[props.probeState];
    if (!hit) return null;
    return {
      ...hit,
      text: t(`mediaSimulator.probe.${hit.key}`, {
        profile: chosen.value?.name || "—",
        width: chosen.value?.width ?? 0,
      }),
    };
  });

  // ── T-112 · yeterlilik hükmü ──────────────────────────────────────

  /**
   * Tek cümlelik karar: bu kombinasyonda seçilen basamak **yetiyor mu**.
   *
   * Uyarı listesi zaten aşağıda duruyor ama liste okunmak ister; kullanıcının
   * sorduğu soru tek: "yeter mi". Hüküm listeden TÜRETİLİR, ikinci bir kural
   * yazılmaz — `sufficient` / `zoomSufficient` alanları `select.js`'ten gelir
   * ve parite testinde `srcset.py` ile karşılaştırılır.
   */
  const verdict = computed(() => {
    const s = props.selection;
    if (!s.chosen) return { tone: "bad", icon: "ban", key: "none" };
    if (!s.sufficient) return { tone: "bad", icon: "circle-alert", key: "short" };
    if (s.demandMultiplier > 1 && !s.zoomSufficient) {
      return { tone: "warn", icon: "search", key: "zoomShort" };
    }
    return { tone: "ok", icon: "check", key: "ok" };
  });

  /**
   * Çeviri gelene kadarki varsayılan metinler.
   *
   * `i18n/locales/*.js` bu görevde başka bir elin lanesinde; anahtar henüz
   * yokken `t()` anahtar YOLUNU basar ve ekranda "mediaSimulator.result…"
   * görünür. `vue-i18n`'in üçüncü argümanı (varsayılan mesaj) bunu önler ve
   * anahtar eklendiği anda kendiliğinden devre dışı kalır.
   */
  const VERDICT_FALLBACK = Object.freeze({
    ok: "Seçilen basamak yetiyor: {chosen} piksel iniyor, {required} piksel gerekiyor.",
    short:
      "Kaynak yetersiz — büyütme yapılmaz. {chosen} piksel var, {required} piksel gerekiyor ({deficit} piksel eksik). Yakınlaştırmayı azaltın ya da daha yüksek çözünürlüklü bir görsel yükleyin.",
    zoomShort:
      "Kutuya yetiyor ama {multiplier}× yakınlaştırmada yetmiyor: {zoom} piksel gerekir, {chosen} piksel iniyor.",
    none: "Bu slotta profil tanımlı değil — indirilecek bir basamak yok.",
  });

  const verdictText = computed(() =>
    t(
      `mediaSimulator.result.verdict.${verdict.value.key}`,
      {
        chosen: chosen.value?.width ?? 0,
        required: props.selection.requiredPx,
        deficit: props.selection.deficitPx,
        zoom: props.selection.zoomRequiredPx,
        multiplier: props.selection.demandMultiplier,
      },
      VERDICT_FALLBACK[verdict.value.key]
    )
  );

  /**
   * Kutu, cihazın CSS viewport'undan GENİŞ mi.
   *
   * Ölçüldü (veriden, tarayıcıda değil): `product_detail/lightbox_main`
   * `vh_pct` kuralıyla hesaplanıyor — kutu viewport YÜKSEKLİĞİNE bağlı, o
   * yüzden dar ekranlı uzun telefonlarda viewport GENİŞLİĞİNİ aşabiliyor
   * (iPhone 14: kutu 608 px, viewport 390 px). Çerçeve motoru bunu kırpıp
   * rozetliyor; burada da yazılmalı, çünkü "gereken piksel" TAM kutudan
   * hesaplanır: ekranda hiç görünmeyecek bir genişlik için basamak seçiliyor
   * olabilir.
   *
   * ⚠️ Bu yalnız bir SAPMA İŞARETİDİR, düzeltme değil. Gerçek storefront
   * kutusunun taşıp taşmadığı tarayıcıda ÖLÇÜLMEDİ (T-115 drift testi).
   */
  const overflow = computed(() => {
    const box = props.selection.cssBoxPx;
    const vw = device.value.cssWidth;
    if (!(box > vw)) return null;
    return {
      boxPx: Math.round(box),
      viewportPx: vw,
      overflowPx: Math.round(box - vw),
      ratio: (box / vw).toFixed(2),
    };
  });

  /** LCP adayı mı — bölge verisindeki `lcp_candidate` bayrağından. */
  const isLcp = computed(() => !!region.value.lcpCandidate);

  /**
   * İndirilecek bayt — YALNIZ gerçek `Media Rendition.bytes` değerinden.
   *
   * Kaynak doküman "gerçek rendition boyutlarından" diyor. Tablo bugün boş;
   * o yüzden burada bayt TAHMİN EDİLMEZ. Bir tahmin (genişlik² × sabit)
   * üretmek, ölçülmemiş bir sayıyı ölçülmüş gibi göstermek olurdu — ekran
   * bunun yerine "türev üretilmedi, bayt bilinmiyor" der.
   */
  const bytesText = computed(() => {
    const b = Number(props.probeRow?.bytes || 0);
    return b > 0 ? formatBytes(b) : null;
  });
</script>

<template>
  <section class="simres" :aria-label="t('mediaSimulator.result.title')">
    <!-- Canlı bölge: seçim değişince ekran okuyucuya tek cümle duyurulur.
         Görsel kullanıcı aynı bilgiyi hüküm şeridi + karolardan okuduğu için
         cümle görsel olarak gizlidir — iki kez basmak gürültüydü. -->
    <p class="simres__live" aria-live="polite" role="status">{{ announcement }}</p>

    <header class="simres__head">
      <div class="simres__headText">
        <h3 class="simres__title">{{ region.title }}</h3>
        <p class="simres__sub">
          {{ device.label }} · {{ device.cssWidth }}×{{ device.cssHeight }} · DPR {{ device.dpr }}
        </p>
      </div>
      <!-- T-112 — LCP adayı işaretlenir; lazy-load edilmemesi gerektiği
           hemen altında yazar, ayrı bir sayfaya gömülmez. -->
      <span v-if="isLcp" class="simres__lcp">
        <AppIcon name="zap" :size="12" />
        {{ t("mediaSimulator.result.lcpBadge", {}, "LCP adayı") }}
      </span>
    </header>

    <!-- T-112 — yeterlilik hükmü: uyarı listesinden ÖNCE, tek cümlede. -->
    <p class="simres__verdict" :class="`simres__verdict--${verdict.tone}`">
      <AppIcon :name="verdict.icon" :size="15" />
      <span>{{ verdictText }}</span>
    </p>

    <p v-if="isLcp" class="simres__lcpNote">
      <AppIcon name="info" :size="14" />
      <span>{{
        t(
          "mediaSimulator.result.lcpNote",
          {},
          "LCP adayı: bu görsel lazy-load EDİLMEMELİ — loading=\"eager\" ve fetchpriority=\"high\" ile inmeli."
        )
      }}</span>
    </p>

    <!-- Kutu viewport'tan genişse: seçilen basamak ekranda hiç görünmeyecek
         bir genişlik için indiriliyor olabilir. -->
    <p v-if="overflow" class="simres__overflow">
      <AppIcon name="triangle-alert" :size="14" />
      <span>{{
        t(
          "mediaSimulator.result.overflowText",
          overflow,
          "Kutu {boxPx} px, cihazın viewport'u {viewportPx} px — {overflowPx} px taşıyor ({ratio}×). Gereken piksel TAM kutudan hesaplanır; ekranda hiç görünmeyecek bir genişlik için basamak seçiliyor olabilir."
        )
      }}</span>
    </p>

    <dl class="simres__grid">
      <div class="simres__cell">
        <dt>{{ t("mediaSimulator.result.box") }}</dt>
        <dd>{{ Math.round(selection.cssBoxPx * 100) / 100 }} px</dd>
      </div>
      <div class="simres__cell">
        <dt>{{ t("mediaSimulator.result.required") }}</dt>
        <dd>{{ selection.requiredPx }} px</dd>
      </div>
      <div class="simres__cell simres__cell--strong">
        <dt>{{ t("mediaSimulator.result.chosen") }}</dt>
        <dd>
          {{ chosen ? `${chosen.name} · ${chosen.width} px` : t("mediaSimulator.result.none") }}
        </dd>
      </div>
      <div class="simres__cell">
        <dt>{{ t("mediaSimulator.result.overshoot") }}</dt>
        <dd>
          {{ selection.overshoot ? `${selection.overshoot.toFixed(2)}×` : "—" }}
        </dd>
      </div>
      <div v-if="selection.demandMultiplier > 1" class="simres__cell">
        <dt>{{ t("mediaSimulator.result.zoomRequired") }}</dt>
        <dd>{{ selection.zoomRequiredPx }} px ({{ selection.demandMultiplier }}×)</dd>
      </div>
      <div v-if="selection.deficitPx" class="simres__cell">
        <dt>{{ t("mediaSimulator.result.deficit") }}</dt>
        <dd>{{ selection.deficitPx }} px</dd>
      </div>
      <!-- İndirilecek bayt: yalnız gerçek türev satırından. Tahmin YOK. -->
      <div class="simres__cell">
        <dt>{{ t("mediaSimulator.result.bytes", {}, "İndirilecek bayt") }}</dt>
        <dd>
          {{
            bytesText ||
            t("mediaSimulator.result.bytesUnknown", {}, "Bilinmiyor — türev henüz üretilmedi")
          }}
        </dd>
      </div>
    </dl>
    <p class="simres__attrNote">
      {{
        t(
          "mediaSimulator.result.bytesNote",
          {},
          "Bayt TAHMİN EDİLMEZ: yalnız gerçek Media Rendition satırının `bytes` alanından okunur. Tablo boşken sayı yerine sebebi yazar."
        )
      }}
    </p>

    <ul v-if="warnings.length" class="simres__warns">
      <li v-for="w in warnings" :key="w.code" class="simres__warn">
        <AppIcon :name="w.icon" :size="14" />
        <span>{{ w.text }}</span>
      </li>
    </ul>
    <p v-else class="simres__clean">
      <AppIcon name="check" :size="14" />
      {{ t("mediaSimulator.result.clean") }}
    </p>

    <p v-if="probe" class="simres__probe" :class="`simres__probe--${probe.tone}`">
      <AppIcon :name="probe.icon" :size="14" />
      <span>
        {{ probe.text }}
        <span v-if="probeRow" class="simres__probeRow">
          {{ probeRow.width }} × {{ probeRow.height }} · {{ (probeRow.format || "").toUpperCase() }}
        </span>
      </span>
    </p>

    <details class="simres__fold">
      <summary>
        <AppIcon name="chevron-right" :size="12" />
        {{ t("mediaSimulator.result.sizesTitle") }} · {{ t("mediaSimulator.result.srcsetTitle") }}
      </summary>
      <div class="simres__foldBody">
        <p class="simres__attrTitle">{{ t("mediaSimulator.result.sizesTitle") }}</p>
        <code class="simres__code">{{ sizes }}</code>
        <p class="simres__attrTitle">{{ t("mediaSimulator.result.srcsetTitle") }}</p>
        <code class="simres__code">{{ srcset }}</code>
        <p class="simres__attrNote">{{ t("mediaSimulator.result.attrNote") }}</p>
      </div>
    </details>

    <details class="simres__fold simres__prov">
      <summary>
        <AppIcon name="chevron-right" :size="12" />
        {{ t("mediaSimulator.result.provenance") }}
      </summary>
      <dl class="simres__provList">
        <dt>{{ t("mediaSimulator.result.renderPoint") }}</dt>
        <dd>{{ region.renderPoint || "—" }}</dd>
        <dt>{{ t("mediaSimulator.result.derivedFrom") }}</dt>
        <dd>{{ region.derivedFrom || "—" }}</dd>
        <template v-if="region.anomaly">
          <dt>{{ t("mediaSimulator.result.anomaly") }}</dt>
          <dd>{{ region.anomaly }}</dd>
        </template>
        <template v-if="region.multiplierReason">
          <dt>{{ t("mediaSimulator.result.multiplierReason") }}</dt>
          <dd>{{ region.multiplierReason }}</dd>
        </template>
        <template v-if="region.codeCommentConflict">
          <dt>{{ t("mediaSimulator.result.conflict") }}</dt>
          <dd>{{ region.codeCommentConflict }}</dd>
        </template>
        <template v-if="region.reportDelta">
          <dt>{{ t("mediaSimulator.result.reportDelta") }}</dt>
          <dd>{{ region.reportDelta }}</dd>
        </template>
        <dt>{{ t("mediaSimulator.result.deviceWhy") }}</dt>
        <dd>{{ device.why || "—" }}</dd>
      </dl>
    </details>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  @use "@/assets/scss/simulator" as sim;

  .simres {
    @include media.surface("soft");
    padding: media.$s-4;
    border-radius: media.$r-lg;
  }

  // Ekran okuyucu duyurusu — görsel kopyası hüküm şeridi.
  .simres__live {
    @include media.sr-only;
  }

  .simres__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: media.$s-2;
    margin-bottom: media.$s-3;
  }

  .simres__headText {
    min-width: 0;
  }

  .simres__title {
    margin: 0;
    @include media.text("body");
    font-weight: 700;
    letter-spacing: -0.005em;
    @include media.heading;
  }

  .simres__sub {
    margin: media.$s-05 0 0;
    @include media.text("xs");
    @include media.muted(1);
    @include media.numeric;
  }

  .simres__lcp {
    @include media.chip("success");
    flex-shrink: 0;
  }

  // ── Hüküm şeridi ─────────────────────────────────────────────
  .simres__verdict {
    display: flex;
    align-items: flex-start;
    gap: media.$s-2;
    margin: 0 0 media.$s-3;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-md;
    @include media.text("sm");
    font-weight: 620;
    line-height: 1.45;

    svg {
      flex-shrink: 0;
      margin-top: 0.125rem;
    }
  }

  .simres__verdict--ok {
    color: $c-success;
    background: rgb(16 185 129 / 10%);
  }

  .simres__verdict--warn {
    color: $c-warning;
    background: rgb(245 158 11 / 12%);
  }

  .simres__verdict--bad {
    color: $c-error;
    background: rgb(239 68 68 / 10%);
  }

  .simres__lcpNote,
  .simres__overflow {
    @include sim.note("info");
    @include media.text("xs");
    margin-bottom: media.$s-3;
  }

  .simres__overflow {
    @include sim.note("warn");
    @include media.text("xs");
  }

  // ── KPI karoları ─────────────────────────────────────────────
  .simres__grid {
    @include sim.kpi-grid;
    margin-bottom: media.$s-2;
  }

  .simres__cell {
    @include sim.kpi;
  }

  // Seçilen basamak: tek vurgu — marka rengi seçim demektir.
  .simres__cell--strong {
    border: 1px solid $brand;
    background: rgba($brand, 0.1);

    dd {
      @include sim.mono;
      font-size: 0.9375rem;
    }
  }

  .simres__warns {
    list-style: none;
    margin: 0 0 media.$s-2;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
  }

  .simres__warn {
    @include sim.note("warn");
  }

  .simres__clean {
    @include sim.note("ok");
    margin-bottom: media.$s-2;
  }

  .simres__probe {
    @include sim.note("info");
    margin-bottom: media.$s-2;
  }

  .simres__probe--ok {
    @include sim.note("ok");
    margin-bottom: media.$s-2;
  }

  .simres__probe--warn {
    @include sim.note("warn");
    margin-bottom: media.$s-2;
  }

  .simres__probeRow {
    display: block;
    margin-top: media.$s-05;
    @include media.text("xs");
    @include media.muted(1);
    @include media.numeric;
  }

  .simres__attrTitle {
    margin: media.$s-2 0 media.$s-1;
    @include sim.section-title;
    letter-spacing: 0.04em;
  }

  .simres__code {
    @include sim.code-block;
  }

  .simres__attrNote {
    margin: media.$s-1 0 media.$s-3;
    @include media.text("xs");
    @include media.muted(2);
    line-height: 1.5;
  }

  .simres__fold {
    @include sim.disclosure;

    summary svg {
      color: $l-text-500;
      transition: transform 150ms $ease-out;

      @include dark {
        color: $d-text-muted;
      }
    }

    &[open] > summary svg {
      transform: rotate(90deg);
    }
  }

  .simres__foldBody {
    padding-bottom: media.$s-2;

    .simres__attrNote {
      margin-bottom: 0;
    }
  }

  .simres__provList {
    margin: 0 0 media.$s-2;
    @include media.text("xs");

    dt {
      @include media.muted(1);
      font-weight: 700;
      margin-top: media.$s-2;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 0.6875rem;
    }

    dd {
      margin: media.$s-05 0 0;
      @include media.muted(2);
      line-height: 1.5;
    }
  }
</style>
