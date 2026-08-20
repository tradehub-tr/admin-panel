<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { POSTER_PROXY_REGION, POSTER_SPEC, simulatePoster } from "@/lib/media/simulator";
  import { formatBytes } from "@/utils/mediaFormat";

  /**
   * Video posteri simülasyonu.
   *
   * **Uydurma uç yok.** `media/pipeline/video/poster.py` posteri üretmeyi
   * biliyor ama onu çağıran bir API ucu kurulu DEĞİL ve `Media Rendition`
   * tablosu boş. Burada gerçek bir poster dosyası gösterilmez; yalnız "poster
   * üretilseydi hangi basamak inerdi" hesabı yapılır.
   *
   * **ÖLÇÜLMEDİ.** `placements.json` video için bir bölge ölçmemiş. Poster
   * `<video poster>` olarak ürün detay ana görsel kutusunda basılacağı için o
   * bölge VEKİL kabul edildi; gerçek video yerleşimi ölçülene kadar sonuç
   * yaklaşıktır ve ekran bunu yazar.
   */
  const props = defineProps({
    /** Simülasyona girecek cihazlar. */
    devices: { type: Array, required: true },
    /** Vurgulanacak cihazın id'si. */
    activeDeviceId: { type: String, default: "" },
  });

  const { t } = useI18n();

  const sim = computed(() => simulatePoster(props.devices));
  const insufficient = computed(() => sim.value.rows.filter((r) => !r.sufficient));

  // ── T-113 · video yüzeyleri ───────────────────────────────────────

  /**
   * Storefront'taki iki video yüzeyi — **kaynaktan okundu, ölçülmedi**.
   *
   * `placements.json` (T-110) video için bir bölge ölçmemiş; bu tablo o
   * boşluğun panel tarafındaki geçici karşılığıdır. Her alanın yanında
   * `dosya:satır` künyesi var, hiçbiri tahmin değil — ama hiçbiri de
   * tarayıcıda `getBoundingClientRect()` ile DOĞRULANMADI. Kalıcı yeri
   * `tradehub_core/media/pipeline/simulator/placements.json`'dır; bu görevde
   * o depoya yazılamadı (salt okunur).
   *
   * Okunan iki gerçek:
   *   · Satıcı kapak videosu otomatik OYNAMAZ — `autoplay` özniteliği yok,
   *     oynatma kullanıcı tıklamasına bağlı (StoreHeader.ts:308).
   *   · Ürün tanıtım videosuna `poster` özniteliği HİÇ yazılmıyor
   *     (ProductVideoSection.ts:63) — oysa `product.video` slotu
   *     `poster_192` / `poster_1024` profillerini tanımlıyor.
   */
  const VIDEO_SURFACES = Object.freeze([
    Object.freeze({
      id: "seller_shop/cover_video",
      slotKey: "company.cover_video",
      aspect: 16 / 9,
      aspectLabel: "16:9",
      source: "tradehubfront/src/components/seller/StoreHeader.ts:297-345",
      autoplay: false,
      muted: true,
      loop: false,
      playsinline: true,
      poster: true,
      preload: "metadata",
      controls: "custom",
      /** Kapağın ÜSTÜNE binen arayüz ögeleri — güvenli alan ihlali adayları. */
      zones: Object.freeze([
        Object.freeze({
          id: "controlBar",
          placement: "bottom",
          heightPx: 40,
          source: "StoreHeader.ts:327 px-3 py-2.5 (20px) + 20px ikon satırı",
        }),
        Object.freeze({
          id: "playButton",
          placement: "center",
          widthPx: 56,
          heightPx: 56,
          source: "StoreHeader.ts:320 w-14 h-14",
        }),
      ]),
    }),
    Object.freeze({
      id: "product_detail/gallery_video",
      slotKey: "product.video",
      aspect: 16 / 9,
      aspectLabel: "16:9",
      source: "tradehubfront/src/components/product/ProductVideoSection.ts:63,81",
      autoplay: false,
      muted: false,
      loop: false,
      playsinline: true,
      poster: false,
      preload: "metadata",
      controls: "native",
      zones: Object.freeze([
        Object.freeze({
          id: "nativeControls",
          placement: "bottom",
          heightPx: null,
          source: "ProductVideoSection.ts:63 `controls` — yüksekliği tarayıcıya bağlı, ÖLÇÜLMEDİ",
        }),
      ]),
    }),
  ]);

  /** Üç önizleme durumu — kaynak dokümandaki (a)/(b)/(c). */
  const PREVIEW_STATES = Object.freeze(["poster", "autoplay", "reduced"]);

  const surfaceId = ref(VIDEO_SURFACES[0].id);
  const previewState = ref(PREVIEW_STATES[0]);
  /**
   * Bit hızı — kullanıcı girer. **Varsayılan YOK.**
   *
   * `video_decision.json`'ın HLS merdiveni (360p 800 · 480p 1400 · 720p 2800 ·
   * 1080p 5000 kbps) ve 2.500 kbps geçiş tavanı panele VENDOR'LANMADI:
   * `scripts/sync-simulator.mjs` o dosyadan yalnız `poster` bloğunu türetiyor.
   * Bir varsayılan yazmak, ölçülmemiş bir sayıyı ekrana ölçülmüş gibi
   * koymak olurdu; alan boş başlar ve tahmin ancak kullanıcı girince çıkar.
   */
  const bitrateKbps = ref(0);
  /** Kaynak dokümandaki "ilk 10 saniye" penceresi. */
  const FIRST_WINDOW_S = 10;

  /**
   * Çeviri gelene kadarki varsayılan metinler — gerekçe SimResultCard'da.
   * Anahtar `i18n/locales/*.js`'e eklendiği anda kendiliğinden devre dışı.
   */
  const STATE_FALLBACK = Object.freeze({
    poster: "Poster (ilk kare)",
    autoplay: "Otomatik oynatma",
    reduced: "prefers-reduced-motion",
  });

  const STATE_NOTE_FALLBACK = Object.freeze({
    noAutoplay:
      "Bu yüzeyde otomatik oynatma YOK: kaynakta `autoplay` özniteliği yazılmıyor, video kullanıcı tıklamadan başlamaz. Önizleme bu yüzden poster durumundan farksızdır.",
    reducedNoop:
      "`prefers-reduced-motion` bu yüzeyde davranışı DEĞİŞTİRMEZ — zaten otomatik oynatma yok. Ayrı önizleme yalnız kendiliğinden oynayan bir yüzeyde anlam taşır.",
  });

  const ZONE_FALLBACK = Object.freeze({
    controlBar: "Kontrol çubuğu",
    playButton: "Oynat düğmesi",
    nativeControls: "Yerel tarayıcı kontrolleri",
  });

  const surface = computed(
    () => VIDEO_SURFACES.find((v) => v.id === surfaceId.value) || VIDEO_SURFACES[0]
  );

  const activeRow = computed(
    () => sim.value.rows.find((r) => r.device.id === props.activeDeviceId) || sim.value.rows[0]
  );

  /**
   * Aktif cihazda kapak kutusunun ölçüleri ve arayüz ögelerinin kapladığı pay.
   *
   * Genişlik VEKİL bölgeden gelir (kartın başındaki uyarı), yükseklik
   * `aspect-video` oranından türer. Örtme yüzdeleri buradan hesaplanır —
   * kutu daraldıkça sabit piksel yükseklikli kontrol çubuğu posterin daha
   * BÜYÜK bir payını yer; en dar telefonda ihlal en büyüktür.
   */
  const cover = computed(() => {
    const row = activeRow.value;
    if (!row) return null;
    const widthPx = Math.round(row.cssBoxPx);
    const heightPx = Math.round(widthPx / surface.value.aspect);
    if (!(heightPx > 0)) return null;
    const zones = surface.value.zones.map((z) => {
      if (!z.heightPx) return { ...z, pct: null };
      const area =
        z.placement === "center"
          ? Math.min(z.widthPx, widthPx) * Math.min(z.heightPx, heightPx)
          : widthPx * Math.min(z.heightPx, heightPx);
      return { ...z, pct: Math.round((area / (widthPx * heightPx)) * 1000) / 10 };
    });
    const measured = zones.filter((z) => z.pct !== null);
    return {
      widthPx,
      heightPx,
      zones,
      coveredPct: Math.round(measured.reduce((a, z) => a + z.pct, 0) * 10) / 10,
      unmeasuredZones: zones.length - measured.length,
    };
  });

  /** İlk 10 saniyede inecek tahmini bayt. Bit hızı girilmediyse `null`. */
  const firstWindowBytes = computed(() => {
    const kbps = Number(bitrateKbps.value) || 0;
    if (!(kbps > 0)) return null;
    return Math.round((kbps * 1000 * FIRST_WINDOW_S) / 8);
  });

  /** Önizleme durumunun bu yüzeyde gerçekten bir karşılığı var mı. */
  const stateNote = computed(() => {
    const v = surface.value;
    if (previewState.value === "autoplay" && !v.autoplay) return "noAutoplay";
    if (previewState.value === "reduced" && !v.autoplay) return "reducedNoop";
    return "";
  });

  const playing = computed(() => previewState.value === "autoplay" && surface.value.autoplay);
</script>

<template>
  <section class="simpost">
    <header class="simpost__head">
      <h3 class="simpost__title">{{ t("mediaSimulator.poster.title") }}</h3>
      <p class="simpost__lead">{{ t("mediaSimulator.poster.noEndpoint") }}</p>
    </header>

    <p class="simpost__note simpost__note--unmeasured">
      <AppIcon name="triangle-alert" :size="14" />
      <span>{{ t("mediaSimulator.poster.proxy", { region: POSTER_PROXY_REGION }) }}</span>
    </p>

    <dl class="simpost__spec">
      <div class="simpost__kpi">
        <dt>{{ t("mediaSimulator.poster.width") }}</dt>
        <dd>{{ POSTER_SPEC.width ? `${POSTER_SPEC.width} px` : "—" }}</dd>
      </div>
      <div class="simpost__kpi">
        <dt>{{ t("mediaSimulator.poster.format") }}</dt>
        <dd>{{ (POSTER_SPEC.format || "—").toUpperCase() }}</dd>
      </div>
      <div class="simpost__kpi">
        <dt>{{ t("mediaSimulator.poster.maxBytes") }}</dt>
        <dd>{{ POSTER_SPEC.maxBytes ? formatBytes(POSTER_SPEC.maxBytes) : "—" }}</dd>
      </div>
      <div class="simpost__kpi">
        <dt>{{ t("mediaSimulator.poster.window") }}</dt>
        <dd>{{ POSTER_SPEC.windowStartS }}s … {{ POSTER_SPEC.windowEndExpr || "—" }}</dd>
      </div>
      <div class="simpost__kpi">
        <dt>{{ t("mediaSimulator.poster.gate") }}</dt>
        <dd>
          %{{ POSTER_SPEC.brightnessGate?.min_luma_pct ?? "—" }} … %{{
            POSTER_SPEC.brightnessGate?.max_luma_pct ?? "—"
          }}
        </dd>
      </div>
    </dl>

    <!-- ── T-113 · video yüzeyi ────────────────────────────────── -->

    <h4 class="simpost__sub">
      {{ t("mediaSimulator.poster.surfaceTitle", {}, "Video yüzeyi") }}
    </h4>
    <div
      class="simpost__switch"
      role="group"
      :aria-label="t('mediaSimulator.poster.surfaceTitle', {}, 'Video yüzeyi')"
    >
      <button
        v-for="v in VIDEO_SURFACES"
        :key="v.id"
        type="button"
        class="simpost__switchBtn"
        :class="{ 'is-on': v.id === surfaceId }"
        :aria-pressed="v.id === surfaceId ? 'true' : 'false'"
        @click="surfaceId = v.id"
      >
        {{ t(`mediaSimulator.poster.surface.${v.slotKey.replace(".", "_")}`, {}, v.slotKey) }}
      </button>
    </div>

    <div
      class="simpost__switch"
      role="group"
      :aria-label="t('mediaSimulator.poster.stateTitle', {}, 'Önizleme durumu')"
    >
      <button
        v-for="st in PREVIEW_STATES"
        :key="st"
        type="button"
        class="simpost__switchBtn"
        :class="{ 'is-on': st === previewState }"
        :aria-pressed="st === previewState ? 'true' : 'false'"
        @click="previewState = st"
      >
        {{ t(`mediaSimulator.poster.state.${st}`, {}, STATE_FALLBACK[st]) }}
      </button>
    </div>

    <!-- Çizim yalnız yerleşimi anlatır; her sayı aşağıda metin olarak da var,
         bu yüzden ekran okuyucudan gizlendi. -->
    <div v-if="cover" class="simpost__stage" aria-hidden="true">
      <div class="simpost__cover" :class="{ 'is-playing': playing }">
        <span class="simpost__coverTag">{{ playing ? "▶" : "poster" }}</span>
        <div
          v-for="z in cover.zones"
          :key="z.id"
          class="simpost__zone"
          :class="`simpost__zone--${z.placement}`"
          :style="
            z.placement === 'center'
              ? { width: `${(z.widthPx / cover.widthPx) * 100}%`, aspectRatio: '1 / 1' }
              : { height: z.heightPx ? `${(z.heightPx / cover.heightPx) * 100}%` : '18%' }
          "
        >
          <AppIcon v-if="z.placement === 'center'" name="play" :size="14" />
        </div>
      </div>
    </div>

    <p class="simpost__note">
      <AppIcon name="info" :size="14" />
      <span>
        {{
          t(
            "mediaSimulator.poster.stageNote",
            {
            device: activeRow ? activeRow.device.label : "—",
            width: cover ? cover.widthPx : 0,
            height: cover ? cover.heightPx : 0,
            aspect: surface.aspectLabel,
          },
            "{device} · kapak kutusu {width}×{height} px ({aspect}). Genişlik VEKİL bölgeden gelir, yükseklik oranından türer."
          )
        }}
      </span>
    </p>
    <!-- Künye çeviriye girmez: dosya:satır referansı dört dilde de aynıdır ve
         çeviri eksikse KAYBOLMAMALI. -->
    <p class="simpost__prov"><code>{{ surface.source }}</code></p>

    <p v-if="stateNote" class="simpost__note simpost__note--unmeasured">
      <AppIcon name="triangle-alert" :size="14" />
      <span>{{ t(`mediaSimulator.poster.${stateNote}`, {}, STATE_NOTE_FALLBACK[stateNote]) }}</span>
    </p>

    <dl class="simpost__attrs">
      <div v-for="key in ['autoplay', 'muted', 'loop', 'playsinline', 'poster']" :key="key">
        <dt>{{ t(`mediaSimulator.poster.attr.${key}`, {}, key) }}</dt>
        <dd :class="{ 'simpost__attrOff': !surface[key] }">
          {{
            surface[key]
              ? t("mediaSimulator.poster.yes", {}, "var")
              : t("mediaSimulator.poster.no", {}, "YOK")
          }}
        </dd>
      </div>
      <div>
        <dt>{{ t("mediaSimulator.poster.attr.preload", {}, "preload") }}</dt>
        <dd>{{ surface.preload }}</dd>
      </div>
      <div>
        <dt>{{ t("mediaSimulator.poster.attr.controls", {}, "controls") }}</dt>
        <dd>
          {{
            t(
              `mediaSimulator.poster.controls.${surface.controls}`,
              {},
              surface.controls === "native" ? "yerel (tarayıcı çizer)" : "özel (uygulama çizer)"
            )
          }}
        </dd>
      </div>
    </dl>

    <!-- Güvenli alan: kapağın üstüne binen ögelerin kapladığı pay. -->
    <h4 class="simpost__sub">
      {{ t("mediaSimulator.poster.safeTitle", {}, "Güvenli alan — kapağa binen arayüz") }}
    </h4>
    <ul v-if="cover" class="simpost__zones">
      <li v-for="z in cover.zones" :key="z.id" class="simpost__zoneRow">
        <span class="simpost__zoneName">{{
          t(`mediaSimulator.poster.zone.${z.id}`, {}, ZONE_FALLBACK[z.id] || z.id)
        }}</span>
        <span v-if="z.pct !== null" class="simpost__zonePct">%{{ z.pct }}</span>
        <span v-else class="simpost__bad">{{
          t("mediaSimulator.poster.zoneUnmeasured", {}, "ÖLÇÜLMEDİ")
        }}</span>
        <span class="simpost__zoneSrc">{{ z.source }}</span>
      </li>
    </ul>
    <p v-if="cover" class="simpost__note" :class="{ 'simpost__note--unmeasured': cover.coveredPct > 0 }">
      <AppIcon name="triangle-alert" :size="14" />
      <span>
        {{
          t(
            "mediaSimulator.poster.safeVerdict",
            { pct: cover.coveredPct, unmeasured: cover.unmeasuredZones },
            "Kapak alanının %{pct} kadarı arayüz ögesiyle örtülü, {unmeasured} ögenin yüksekliği ÖLÇÜLMEDİ. Örtülen yerde önemli içerik olup olmadığı ancak kırpma niyetinin güvenli alanıyla birlikte söylenebilir; bu kart onu bilmiyor."
          )
        }}
      </span>
    </p>

    <!-- Mobil veri: ilk 10 saniye. -->
    <h4 class="simpost__sub">
      {{ t("mediaSimulator.poster.dataTitle", {}, "Mobil veri — ilk 10 saniye") }}
    </h4>
    <label class="simpost__field">
      <span>{{ t("mediaSimulator.poster.bitrate", {}, "Bit hızı (kbps)") }}</span>
      <input
        v-model.number="bitrateKbps"
        type="number"
        min="0"
        step="100"
        inputmode="numeric"
        class="simpost__input"
      />
    </label>
    <p class="simpost__note">
      <AppIcon name="download" :size="14" />
      <span>
        {{
          firstWindowBytes
            ? t(
                "mediaSimulator.poster.firstWindow",
                { s: FIRST_WINDOW_S, bytes: formatBytes(firstWindowBytes) },
                "İlk {s} saniyede tahmini {bytes} iner (bit hızı × süre ÷ 8)."
              )
            : t(
                "mediaSimulator.poster.firstWindowEmpty",
                { s: FIRST_WINDOW_S },
                "Bit hızı girilmedi — ilk {s} saniyenin baytı hesaplanmadı. Varsayılan YAZILMADI: panele vendor'lanmış bir bit hızı verisi yok."
              )
        }}
      </span>
    </p>
    <p class="simpost__note simpost__note--unmeasured">
      <AppIcon name="triangle-alert" :size="14" />
      <span>{{
        t(
          "mediaSimulator.poster.noBudget",
          {},
          "Karşılaştırılacak mobil veri tavanı panel verisinde YOK: sync-simulator.mjs video_decision.json'dan yalnız poster bloğunu türetiyor; HLS merdiveni (360p 800 · 480p 1400 · 720p 2800 · 1080p 5000 kbps) ve 2.500 kbps geçiş tavanı vendor'lanmadı."
        )
      }}</span>
    </p>

    <p v-if="!sim.region" class="simpost__note">
      {{ t("mediaSimulator.poster.noRegion") }}
    </p>

    <table v-else class="simpost__table">
      <caption class="simpost__caption">
        {{
          t("mediaSimulator.poster.caption", {
            n: sim.rows.length,
            ladder: sim.ladder.map((r) => r.width).join(" / "),
            insufficient: insufficient.length,
          })
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t("mediaSimulator.matrix.col.combo") }}</th>
          <th scope="col" class="simpost__num">{{ t("mediaSimulator.matrix.col.required") }}</th>
          <th scope="col">{{ t("mediaSimulator.matrix.col.chosen") }}</th>
          <th scope="col">{{ t("mediaSimulator.poster.verdict") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in sim.rows"
          :key="row.key"
          :class="{ 'simpost__row--on': row.device.id === activeDeviceId }"
          :aria-current="row.device.id === activeDeviceId ? 'true' : undefined"
        >
          <th scope="row">{{ row.device.label }}</th>
          <td class="simpost__num">{{ row.requiredPx }} px</td>
          <td>
            <code v-if="row.chosen" class="simpost__profile">{{ row.chosen.name }}</code>
            {{ row.chosen ? ` · ${row.chosen.width} px` : "—" }}
          </td>
          <td>
            <span v-if="row.sufficient" class="simpost__ok">
              {{ t("mediaSimulator.poster.enough") }}
            </span>
            <span v-else class="simpost__bad">
              {{ t("mediaSimulator.poster.short", { px: row.deficitPx }) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  @use "@/assets/scss/simulator" as sim;

  .simpost {
    @include media.surface("soft");
    padding: media.$s-4;
    border-radius: media.$r-lg;
  }

  .simpost__head {
    margin-bottom: media.$s-3;
  }

  .simpost__title {
    margin: 0;
    @include media.text("body");
    font-weight: 700;
    letter-spacing: -0.005em;
    @include media.heading;
  }

  .simpost__lead {
    margin: media.$s-05 0 0;
    @include media.text("xs");
    @include media.muted(1);
    line-height: 1.5;
  }

  .simpost__note {
    @include sim.note("info");
    @include media.text("xs");
    margin-bottom: media.$s-2;
  }

  // Ölçülmedi/varsayım: kesikli çerçeve — renkle değil, dokuyla.
  .simpost__note--unmeasured {
    @include sim.note("unmeasured");
    @include media.text("xs");
    margin-bottom: media.$s-2;
  }

  .simpost__spec {
    @include sim.kpi-grid(7.5rem);
    margin: media.$s-3 0;
  }

  .simpost__kpi {
    @include sim.kpi;

    dd {
      font-size: 0.9375rem;
    }
  }

  .simpost__sub {
    margin: media.$s-4 0 media.$s-2;
    @include sim.section-title;
  }

  .simpost__switch {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-1;
    margin-bottom: media.$s-2;
  }

  .simpost__switchBtn {
    @include sim.chip-button;
    @include media.text("xs");
  }

  .simpost__stage {
    max-width: 22rem;
    margin: media.$s-3 0;
  }

  .simpost__cover {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: media.$r-md;
    overflow: hidden;
    background: linear-gradient(140deg, #262a31, #3d434c);

    &.is-playing {
      background: linear-gradient(140deg, #1d2026, #2c3138);
    }
  }

  .simpost__coverTag {
    position: absolute;
    inset-block-start: media.$s-1;
    inset-inline-start: media.$s-2;
    color: rgb(255 255 255 / 80%);
    @include media.text("xs");
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .simpost__zone {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffd54d;
    background: rgb(245 158 11 / 28%);
    outline: 1.5px dashed rgb(245 158 11 / 85%);
  }

  .simpost__zone--bottom {
    inset-inline: 0;
    inset-block-end: 0;
  }

  .simpost__zone--center {
    inset-block-start: 50%;
    inset-inline-start: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
  }

  .simpost__prov {
    margin: 0 0 media.$s-3;
    @include media.text("xs");
    @include media.muted(2);
    word-break: break-word;

    code {
      @include sim.mono;
    }
  }

  .simpost__attrs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
    gap: media.$s-2;
    margin: 0 0 media.$s-2;

    dt {
      @include media.text("xs");
      @include media.muted(2);
      @include sim.mono;
    }

    dd {
      margin: media.$s-05 0 0;
      @include media.text("sm");
      font-weight: 600;
    }
  }

  .simpost__attrOff {
    color: $c-error;
  }

  .simpost__zones {
    list-style: none;
    margin: 0 0 media.$s-2;
    padding: 0;
  }

  .simpost__zoneRow {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: media.$s-2;
    padding: media.$s-1 0;
    @include media.text("xs");
    @include media.divider(bottom);

    &:last-child {
      border-bottom: 0;
    }
  }

  .simpost__zoneName {
    font-weight: 640;
  }

  .simpost__zonePct {
    @include media.numeric;
    @include media.chip("warning");
  }

  .simpost__zoneSrc {
    @include media.muted(2);
    flex: 1 1 12rem;
    min-width: 0;
  }

  .simpost__field {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin-bottom: media.$s-2;
    @include media.text("sm");
  }

  .simpost__input {
    @include media.field-input;
    max-width: 8rem;
    @include media.numeric;
  }

  .simpost__table {
    @include sim.data-table;
    margin-top: media.$s-3;
  }

  .simpost__caption {
    @include media.text("xs");
    @include media.muted(1);
    text-align: start;
    padding-bottom: media.$s-1;
  }

  .simpost__row--on {
    background: rgba($brand, 0.12);

    @include dark {
      background: rgba($brand, 0.14);
    }
  }

  .simpost__profile {
    @include sim.mono;
    @include media.text("xs");
    padding: 0.1rem 0.4rem;
    border-radius: media.$r-sm;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .simpost__num {
    text-align: end;
    @include media.numeric;
  }

  .simpost__ok {
    @include media.chip("success");
  }

  .simpost__bad {
    @include media.chip("warning");
  }
</style>
