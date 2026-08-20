<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";

  import { PLAYBACK, decidePlayback, loadHlsEngine, startHlsPlayback } from "./delivery/hlsPlayback";

  /**
   * Teslim bileşeni — video (T-120).
   *
   * `MediaImage`'ın video karşılığı. Aynı üç soruyu yanıtlar: kutu ÖNCEDEN
   * ayrılıyor mu, hangi kaynak indiriliyor, kim ne zaman oynatıyor.
   *
   * ## 1. Düzen kayması
   *
   * `poster` TEK BAŞINA yer ayırmaz — poster inene kadar `<video>` yine
   * varsayılan 300×150 kutusundadır ve poster gelince satır kayar. Yeri
   * ayıran şey `width`/`height` ÖZNİTELİKLERİ ve onlardan türeyen
   * `aspect-ratio`'dur; `MediaImage` ile birebir aynı kademe. Ölçü
   * bilinmiyorsa `fallbackRatio` yine de kutuyu ayırır.
   *
   * ## 2. HLS tembel yüklenir
   *
   * `preload="none"` ve `<source>` etiketleri DOM'a görünürlüğe kadar hiç
   * basılmaz. Bir `.m3u8` manifesti kendi başına küçüktür ama tarayıcı onu
   * çözer çözmez ilk segmentleri çekmeye başlar; ekranın altındaki 20 video
   * için bu sessizce megabaytlar demektir. `IntersectionObserver` yoksa
   * (ya da SSR sonrası hidrasyonda) kaynaklar hemen bağlanır — tembellik bir
   * iyileştirmedir, çalışmanın ön koşulu değil.
   *
   * **hls.js VAR — ama yalnız gerektiğinde.** Karar üç kademeli
   * (`delivery/hlsPlayback.js`): yerli HLS çözen tarayıcıda (Safari/iOS:
   * `canPlayType`) `<source>` etiketi yeter, hls.js hiç İNDİRİLMEZ; yerli
   * destek yoksa hls.js dinamik `import()` ile gelir (ana pakete girmez —
   * `collector.js`'in `web-vitals` deseniyle aynı) ve MSE üzerinden çalar;
   * motor yüklenemez ya da ölümcül hata verirse progresif `src`'ye düşülür.
   * Yani HLS hâlâ bir iyileştirme kademesidir, tek yol değil — motor yolu
   * da tıkanırsa ekran boş kalmaz, progresif kaynak oynar.
   *
   * ## 3. Otomatik oynatma ve `prefers-reduced-motion`
   *
   * Sessiz-döngü otomatik oynatma (`background` modu) yalnız üç koşul
   * birden sağlanınca kurulur: `muted`, `loop`, `playsinline`. Tarayıcılar
   * zaten sessiz olmayan otomatik oynatmayı engelliyor; burada bunu
   * ÖNCEDEN garanti etmek, "neden oynamıyor" hatasını hiç doğurmamak
   * demek.
   *
   * `prefers-reduced-motion: reduce` otomatik oynatmayı **iptal eder** ve
   * kontrolleri açar. Bu CSS ile yapılamaz — `autoplay` bir özniteliktir,
   * `@media` onu kapatamaz; bu yüzden `matchMedia` ile ölçülüyor ve
   * kullanıcı ayarı oturum içinde değişirse dinleyici video'yu durduruyor.
   * Hareketi azaltmak isteyen kullanıcıya kendi başlatabileceği bir kontrol
   * bırakmak, videoyu tamamen gizlemekten iyidir.
   *
   * ## ÖLÇÜLMEYEN
   *
   * Gerçek oynatma, kare hızı, HLS segment zamanlaması ve CLS SKORU
   * ölçülmedi — bunlar için canlı tarayıcı gerekir, bu görevde tarayıcı
   * doğrulaması yapılmadı. Ölçülen: sunucu çıktısındaki öznitelik
   * sözleşmesi ve otomatik oynatma kararının mantığı.
   */
  const props = defineProps({
    /** Progresif kaynak (mp4/webm). HLS çözülemezse tek yol budur. */
    src: { type: String, default: "" },
    /** `src`'nin MIME türü — verilirse tarayıcı indirmeden eleyebilir. */
    type: { type: String, default: "" },
    /** `.m3u8` manifesti. YALNIZ yerli HLS desteği varsa kullanılır. */
    hlsSrc: { type: String, default: "" },
    /** Kapak görseli. Yer AYIRMAZ — onu `width`/`height` yapar. */
    poster: { type: String, default: "" },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    fallbackRatio: { type: String, default: "16 / 9" },
    /** `data:image/...` ya da `#rrggbb` — poster inene kadarki yüzey. */
    lqip: { type: String, default: "" },
    /**
     * Erişilebilir ad. Boş bırakılırsa `aria-label` BASILMAZ; kontrolsüz ve
     * adsız bir video ekran okuyucuda "video" diye geçer. Metin çağırandan
     * gelir — bu bileşen `i18n` sözlüğüne dokunmaz.
     */
    label: { type: String, default: "" },
    /** Sessiz-döngü arka plan videosu mu. `reduce` ayarında iptal edilir. */
    background: { type: Boolean, default: false },
    /** Oynatma kontrolleri. `background` modunda varsayılan olarak kapalı. */
    controls: { type: Boolean, default: true },
    /** Altyazı dosyası (WebVTT). Sesli içerikte WCAG 1.2.2 için gerekli. */
    captionsSrc: { type: String, default: "" },
    captionsLang: { type: String, default: "" },
    captionsLabel: { type: String, default: "" },
    /**
     * Görünürlüğü beklemeden kaynakları bağla. LCP adayı videolar için;
     * varsayılan KAPALI, çünkü her videoyu öncelikli yapmak hiçbirini
     * öncelikli yapmamakla aynı şey.
     */
    priority: { type: Boolean, default: false },
  });

  const emit = defineEmits(["error"]);

  const videoEl = useTemplateRef("videoEl");
  /** Kaynaklar DOM'a basıldı mı — tembel yüklemenin tek anahtarı. */
  const attached = ref(false);
  /** Yerli HLS desteği; istemcide ölçülür, SSR'da bilinmez. */
  const nativeHls = ref(false);
  /** Kullanıcının hareket tercihi. SSR'da `false` varsayılır. */
  const reduceMotion = ref(false);
  const failed = ref(false);

  let observer = null;
  let motionQuery = null;
  let onMotionChange = null;
  /** Aktif hls.js motoru. Reaktif DEĞİL — 3. parti instance (kural §2.8). */
  let hls = null;
  /** Yarış bileti: dinamik import beklerken kaynak/ömür değişirse iptal. */
  let hlsTicket = 0;

  /**
   * Sessiz-döngü otomatik oynatma yalnız `background` istendiğinde VE
   * kullanıcı hareket azaltma istemediğinde. İkisi ayrı: `background`
   * çağıranın niyeti, `reduceMotion` kullanıcının kararı — kullanıcı kazanır.
   */
  const autoplays = computed(() => props.background && !reduceMotion.value);

  /**
   * `background` modunda kontroller gizlidir — ama `reduce` ayarında geri
   * gelir: otomatik oynatma iptal edildiğinde kullanıcıya videoyu kendi
   * başlatacak bir yol bırakmazsak içerik erişilemez hâle gelir.
   */
  const showControls = computed(() => {
    if (!props.background) return props.controls;
    return reduceMotion.value;
  });

  const hasIntrinsic = computed(() => props.width > 0 && props.height > 0);
  const attrWidth = computed(() => (hasIntrinsic.value ? props.width : undefined));
  const attrHeight = computed(() => (hasIntrinsic.value ? props.height : undefined));

  /**
   * Basılacak kaynaklar. HLS önce gelir ama YALNIZ yerli destek varsa:
   * desteklemeyen tarayıcıda `<source type="application/vnd.apple.mpegurl">`
   * atlanır ve progresif kaynağa düşülür — ama boş bir `<video>` bırakmamak
   * için o kaynağı hiç basmamak daha güvenli.
   */
  const sources = computed(() => {
    if (!attached.value) return [];
    const out = [];
    if (props.hlsSrc && nativeHls.value) {
      out.push({ key: "hls", src: props.hlsSrc, type: "application/vnd.apple.mpegurl" });
    }
    if (props.src) out.push({ key: "progressive", src: props.src, type: props.type || undefined });
    return out;
  });

  const boxStyle = computed(() => {
    const style = {
      aspectRatio: hasIntrinsic.value ? `${props.width} / ${props.height}` : props.fallbackRatio,
    };
    // Kaçış kuralı `MediaImage` ile birebir aynı: değer sunucudan geliyor,
    // ham konursa `url(...)` kapatılıp başka bildirim enjekte edilebilir.
    const value = (props.lqip || "").trim();
    if (value.startsWith("data:image/")) {
      style.backgroundImage = `url("${value.replace(/["\\]/g, "")}")`;
      style.backgroundSize = "cover";
      style.backgroundPosition = "center";
    } else if (/^#[0-9a-f]{3,8}$/i.test(value)) {
      style.backgroundColor = value;
    }
    return style;
  });

  function attach() {
    attached.value = true;
    observer?.disconnect();
    observer = null;
    // hls.js de tembel: motor bile görünürlükten önce indirilmez.
    engageHls();
  }

  /**
   * Yerli HLS yoksa hls.js'i dinamik import'la bağla. Görünürlükten önce
   * ÇAĞRILMAZ (tek çağıran `attach`) — kaynak-bağlama tembelliği hls.js'in
   * kendi indirilmesini de kapsar. Motor gelmezse sessizce progresif
   * `<source>` kalır; bu yüzden bu fonksiyon asla fırlatmaz.
   */
  async function engageHls() {
    const mode = decidePlayback({
      hlsSrc: props.hlsSrc,
      src: props.src,
      nativeHls: nativeHls.value,
    });
    if (mode !== PLAYBACK.HLS_JS || hls) return;
    const ticket = ++hlsTicket;
    const Hls = await loadHlsEngine();
    // Import beklenirken bileşen söküldü / kaynak değişti ise bağlanma.
    if (!Hls || ticket !== hlsTicket || !attached.value || !videoEl.value) return;
    hls = startHlsPlayback(Hls, videoEl.value, props.hlsSrc, { onFatal: onHlsFatal });
  }

  function teardownHls() {
    hlsTicket += 1;
    hls?.destroy?.();
    hls = null;
  }

  /**
   * hls.js ölümcül hatayla kapandı (motor kendini `destroy` etti). Progresif
   * kaynak varsa ona düşülür: MSE'nin blob `src`'i elementten silinir ve
   * `load()` tarayıcıyı `<source>` adaylarına geri gönderir. Progresif yol
   * da yoksa davranış sözleşmesi aynı: `error` yay, çağıran karar versin.
   */
  function onHlsFatal() {
    hls = null;
    const el = videoEl.value;
    if (props.src && el) {
      el.removeAttribute("src");
      el.load?.();
      return;
    }
    onError();
  }

  onMounted(() => {
    const el = videoEl.value;
    // `muted` ÖZNİTELİĞİ tek başına yetmez: bazı tarayıcılar oynatma
    // kararını DOM ÖZELLİĞİNE bakarak veriyor ve öznitelikten kurulan
    // sessizlik otomatik oynatmayı kurtarmıyor. İkisi birden kuruluyor.
    if (el && props.background) el.muted = true;
    if (el?.canPlayType) {
      // Boş dize = desteklemiyor; "maybe"/"probably" = destekliyor.
      nativeHls.value = Boolean(el.canPlayType("application/vnd.apple.mpegurl"));
    }

    if (typeof window !== "undefined" && window.matchMedia) {
      motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      reduceMotion.value = motionQuery.matches;
      onMotionChange = (e) => {
        reduceMotion.value = e.matches;
        // Ayar oturum İÇİNDE değişebilir; o an oynayan videoyu durdurmak
        // `autoplay` özniteliğini kaldırmakla olmaz, elle durdurmak gerekir.
        if (e.matches) el?.pause?.();
      };
      motionQuery.addEventListener?.("change", onMotionChange);
    }

    if (props.priority || typeof IntersectionObserver === "undefined") {
      attach();
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) attach();
      },
      // Ekrana girmeden biraz önce bağlanır: kullanıcı kaydırmayı bitirdiğinde
      // poster yerine oynatılabilir bir video bulsun.
      { rootMargin: "200px" }
    );
    if (el) observer.observe(el);
    else attach();
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    teardownHls();
    if (motionQuery && onMotionChange) motionQuery.removeEventListener?.("change", onMotionChange);
  });

  // Kaynak değişince tembellik baştan başlar; aksi hâlde yeni kaynak eski
  // `attached` bayrağını miras alır ve görünmeyen video yine indirilirdi.
  // Eski hls.js motoru da sökülür — yeni manifest yeni bağla(n)ma demek.
  watch(
    () => [props.src, props.hlsSrc],
    () => {
      failed.value = false;
      teardownHls();
      videoEl.value?.removeAttribute?.("src");
      if (attached.value) engageHls();
    }
  );

  function onError() {
    failed.value = true;
    emit("error");
  }
</script>

<template>
  <span class="mvid" :style="boxStyle">
    <video
      v-if="!failed"
      ref="videoEl"
      class="mvid__el"
      :poster="poster || undefined"
      :width="attrWidth"
      :height="attrHeight"
      :aria-label="label || undefined"
      :controls="showControls || undefined"
      :autoplay="autoplays || undefined"
      :loop="background || undefined"
      :muted="background || undefined"
      playsinline
      preload="none"
      @error="onError"
    >
      <source v-for="s in sources" :key="s.key" :src="s.src" :type="s.type" />
      <track
        v-if="captionsSrc"
        kind="captions"
        :src="captionsSrc"
        :srclang="captionsLang || undefined"
        :label="captionsLabel || undefined"
        default
      />
      <slot name="fallback" />
    </video>
    <span v-else class="mvid__fallback"><slot /></span>
  </span>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .mvid {
    position: relative;
    display: block;
    overflow: hidden;
    // Genişlik BİLEREK verilmiyor — gerekçe `MediaImage.mimg` ile aynı.
    background-color: $l-bg-muted;

    @include dark {
      background-color: $d-bg-elevated;
    }
  }

  .mvid__el {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .mvid__fallback {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
</style>
