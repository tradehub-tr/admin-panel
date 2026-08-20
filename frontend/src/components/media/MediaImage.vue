<script setup>
  import { computed, onMounted, ref, useTemplateRef, watch } from "vue";

  import { useLcpImagePreload } from "@/composables/useLcpImagePreload";

  /**
   * Yer tutuculu görsel — düzen kayması (CLS) üretmeyen `<img>`.
   *
   * Sorun: bir `<img>` kaynağı inene kadar sıfır yükseklik kaplar. Liste
   * boyunca her görsel indiğinde altındaki her şey aşağı itilir; kullanıcı
   * tıklamak üzereyken satır kayar. Ölçüsü bilinen bir görselde bunun bedava
   * çözümü, tarayıcıya oranı ÖNCEDEN söylemektir.
   *
   * Üç kademe, hepsi yeri baştan ayırır:
   *
   *   1. `width` + `height` ÖZNİTELİKLERİ basılır. Tarayıcı bunlardan
   *      en-boy oranını türetir ve CSS genişliğine göre yüksekliği daha ilk
   *      düzen geçişinde ayırır (aspect-ratio: attr w / attr h — HTML
   *      standardındaki "default object size" davranışı). Bunlar CSS boyutunu
   *      EZMEZ; kutunun ölçüsünü hâlâ stil belirler.
   *   2. Ölçü bilinmiyorsa `fallbackRatio` kutuyu yine de ayırır — yanlış
   *      oran, kaymayan yanlış orandır; doğru oran, kayan düzenden iyidir.
   *   3. Kaynak inene kadar kutuda LQIP katmanı durur.
   *
   * LQIP sözleşmesi arka taraftaki `media/pipeline/delivery/picture.py`
   * `lqip_style()` ile BİREBİR aynı: `data:image/...;base64,...` ise arka plan
   * görseli, `#rrggbb` ise düz renk. Değer HENÜZ hiçbir uçtan gelmiyor
   * (üretici `media/pipeline/image/lqip.py` var, dışarıya açılmadı); prop boş
   * geçilince nötr yüzey kullanılır ve kutu yine tam boyuttadır.
   *
   * ## T-120 — teslim sözleşmesi (`<picture>`)
   *
   * `renditions` verildiğinde `<picture>` kurulur ve kaynaklar
   * **AVIF → WebP → JPEG** sırasıyla basılır. Sıra keyfi değil: tarayıcı
   * EŞLEŞEN İLK `<source>`'u alır, dolayısıyla sıra = tercih. Aynı sıra
   * arka taraftaki `media/pipeline/delivery/picture.py` içinde de yazılı.
   *
   * `srcset` `w` tanımlayıcısıyla üretilir; `w` kullanan bir `srcset`'te
   * `sizes` YOKSA tarayıcı `100vw` varsayar ve 40px'lik bir satır
   * önizlemesi için en büyük basamağı indirir. Bu yüzden `sizes` ayrı bir
   * prop ve değeri ELLE YAZILMAZ — `@/components/media/delivery/sizes.js`
   * panelin gerçek CSS'inden türetir (T-121).
   *
   * `priority` LCP adayı içindir: `fetchpriority="high"` + `loading="eager"`.
   * Varsayılan olarak KAPALI — her görseli yüksek öncelikli yapmak,
   * hiçbirini yüksek öncelikli yapmamakla aynı şeydir.
   *
   * Türev yoksa (bugünkü hâl: `Media Rendition` tablosu boş) hiçbir
   * `<source>` basılmaz ve `<img>` tek başına, orijinal dosyayla çalışır —
   * kademe düşüşü sessiz ve bozulmasız.
   */
  const props = defineProps({
    src: { type: String, default: "" },
    /** Boş dize = bezeme görseli; `alt=""` basılır, ekran okuyucu atlar. */
    alt: { type: String, default: "" },
    /** Gerçek piksel ölçüleri — biliniyorsa öznitelik olarak basılır. */
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    /** `data:image/...` ya da `#rrggbb`. Boşsa nötr yer tutucu. */
    lqip: { type: String, default: "" },
    /** Ölçü bilinmiyorken kutunun oranı (CSS `aspect-ratio` sözdizimi). */
    fallbackRatio: { type: String, default: "1 / 1" },
    loading: { type: String, default: "lazy" },
    /**
     * `useMediaRenditions()` satırları: `{width, height, format, fileUrl}`.
     * Boş dizi = türev yok; bileşen sessizce tek `<img>`'e düşer.
     */
    renditions: { type: Array, default: () => [] },
    /**
     * `sizes` özniteliği. ELLE YAZMA — `panelSizes()` üretir (T-121).
     * Boş bırakılırsa `srcset` de basılmaz: yanlış `sizes` ile servis
     * edilen bir `srcset`, hiç `srcset` olmamasından daha kötüdür.
     */
    sizes: { type: String, default: "" },
    /** LCP adayı mı — `fetchpriority="high"` + `loading="eager"`. */
    priority: { type: Boolean, default: false },
    /**
     * T-122 — `<head>`e `<link rel="preload">` de bassın mı.
     *
     * `priority` ile AYRI bir bayrak, çünkü ikisi ayrı şey söylüyor:
     * `priority` "bu görsel indirme sırasında öne geçsin", `preload` ise
     * "tarayıcı bunu `<img>`i görmeden ÖNCE keşfetsin". İkincisi bir sayfada
     * en fazla BİR görsel için doğrudur; bir ızgaranın tamamına verilirse
     * hiçbirine verilmemiş gibi olur. Bu yüzden varsayılan KAPALI ve
     * `priority` olmadan hiçbir şey yapmaz.
     *
     * Üst sınır burada bir temenni değil: `useLcpImagePreload` `<head>`de
     * zaten bir bağlantı varsa ikincisini BASMAZ. Bugün panelde bu bayrağı
     * açan bir ekran YOK — hangi ekranda LCP adayının hangi görsel olduğu
     * ÖLÇÜLMEDİ ve tahminle bir ızgara karesini işaretlemek 1. tuzağa
     * düşmek olurdu. Ölçüm (T-124) bir aday belirlediğinde tek yapılacak,
     * o `<MediaImage>`'a `priority preload` eklemektir.
     */
    preload: { type: Boolean, default: false },
  });

  /** Kaynak açılamadıysa çağıran başka bir kademeye düşebilsin. */
  const emit = defineEmits(["error"]);

  const loaded = ref(false);
  const failed = ref(false);
  const imgEl = useTemplateRef("imgEl");

  /**
   * Önbellekten gelen görsel `load` olayını Vue dinleyiciyi bağlamadan ÖNCE
   * ateşlemiş olabilir. O durumda olay hiç gelmez ve görsel sonsuza kadar
   * saydam kalırdı — `complete` bayrağı bunun tek güvenilir kontrolü.
   */
  function syncComplete() {
    const el = imgEl.value;
    if (el?.complete && el.naturalWidth > 0) loaded.value = true;
  }

  onMounted(syncComplete);

  // Kaynak değişince kademe baştan başlar; aksi hâlde yeni görsel inerken
  // önceki görselin "yüklendi" durumu yer tutucuyu erkenden kaldırırdı.
  watch(
    () => props.src,
    () => {
      loaded.value = false;
      failed.value = false;
      // Yeni kaynak da önbellekte olabilir.
      requestAnimationFrame(syncComplete);
    }
  );

  const hasIntrinsic = computed(() => props.width > 0 && props.height > 0);

  /**
   * Tercih sırası — `media/pipeline/delivery/picture.py` ile aynı.
   * Tarayıcı eşleşen İLK `<source>`'u alır; sıra değişirse teslim edilen
   * biçim de değişir.
   */
  const FORMAT_ORDER = ["AVIF", "WEBP", "JPEG"];
  const FORMAT_MIME = { AVIF: "image/avif", WEBP: "image/webp", JPEG: "image/jpeg" };

  /** `JPG`/`JPEG` aynı biçim; bilinmeyen biçim sessizce ATILIR, uydurulmaz. */
  function normalizeFormat(raw) {
    const key = String(raw || "")
      .trim()
      .toUpperCase();
    if (key === "JPG") return "JPEG";
    return FORMAT_MIME[key] ? key : "";
  }

  /** `{FORMAT: "url 320w, url 640w"}` — genişliğe göre artan. */
  const srcsetByFormat = computed(() => {
    const groups = new Map();
    for (const r of props.renditions || []) {
      const width = Number(r?.width) || 0;
      const url = r?.fileUrl || "";
      const key = normalizeFormat(r?.format);
      if (!width || !url || !key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ width, url });
    }
    const out = {};
    for (const [key, list] of groups) {
      const seen = new Set();
      const entries = [];
      for (const item of list.sort((a, b) => a.width - b.width)) {
        // Aynı genişlikte iki türev varsa ilki kalır: tarayıcı için ikisi
        // ayırt edilemez, ikisini de basmak yalnız ağ kaybı.
        if (seen.has(item.width)) continue;
        seen.add(item.width);
        entries.push(`${item.url} ${item.width}w`);
      }
      if (entries.length) out[key] = entries.join(", ");
    }
    return out;
  });

  /**
   * `sizes` boşsa hiçbir `srcset` basılmaz — gerekçe prop belgesinde.
   * Bu yüzden kaynak listesi de `sizes`'a bağlı.
   */
  const sources = computed(() => {
    if (!props.sizes) return [];
    const map = srcsetByFormat.value;
    return FORMAT_ORDER.filter((k) => map[k] && k !== "JPEG").map((k) => ({
      key: k,
      type: FORMAT_MIME[k],
      srcset: map[k],
    }));
  });

  /**
   * JPEG türevleri `<source>` değil, doğrudan `<img>`'in `srcset`'i olur:
   * `<img>` zaten son çare, ayrıca bir `<source type="image/jpeg">` basmak
   * aynı adayları iki kez ilan etmek olurdu.
   */
  const imgSrcset = computed(() => (props.sizes ? srcsetByFormat.value.JPEG || "" : ""));

  /** `srcset` yoksa `sizes` de basılmaz — tek başına anlamsız öznitelik. */
  const hasResponsive = computed(() => sources.value.length > 0 || Boolean(imgSrcset.value));

  /**
   * T-122 — preload'un hedefi.
   *
   * Değerler `<source>`/`<img>` için hesaplanan AYNI computed'lerden okunur;
   * ikinci bir `srcset` hesabı YOK — olsaydı bir gün ıraksar ve tarayıcı
   * görseli iki kez indirirdi. Tarayıcı `<picture>`da `type`ını desteklediği
   * İLK `<source>`u aldığı için hedef `sources[0]`; desteklemiyorsa preload
   * hiç atılmaz ve `<picture>` bir alt biçime düşer (çift indirme olmaz).
   */
  const preloadSource = computed(() => {
    const ilk = sources.value[0];
    if (ilk) return { src: props.src, srcset: ilk.srcset, sizes: props.sizes, type: ilk.type };
    if (imgSrcset.value) {
      return {
        src: props.src,
        srcset: imgSrcset.value,
        sizes: props.sizes,
        type: FORMAT_MIME.JPEG,
      };
    }
    // Türev yok → `<img>` tek adayla çalışır, adres birebir `props.src`.
    // `type` UYDURULMAZ: uzantıdan biçim tahmini yanlış `type` riski taşır ve
    // yanlış `type` preload'u sessizce iptal ettirir.
    return { src: props.src, srcset: "", sizes: "", type: "" };
  });

  // Üç koşul birden: açık `preload` bayrağı, LCP adaylığı (`priority`) ve
  // gerçek bir kaynak. Üst sınır burada değil `useLcpImagePreload` içinde ve
  // `<head>`e bakarak uygulanıyor — bu satır kopyalansa bile ikinci bağlantı
  // oluşmaz. `setup()` içinde SENKRON çağrılıyor: `<img>` daha DOM'a girmedi.
  if (props.preload && props.priority && props.src) useLcpImagePreload(preloadSource.value);

  const effectiveLoading = computed(() => (props.priority ? "eager" : props.loading));
  const fetchPriority = computed(() => (props.priority ? "high" : undefined));

  /** Öznitelik olarak basılacak ölçüler — yoksa `undefined` (öznitelik yok). */
  const attrWidth = computed(() => (hasIntrinsic.value ? props.width : undefined));
  const attrHeight = computed(() => (hasIntrinsic.value ? props.height : undefined));

  function onError() {
    failed.value = true;
    emit("error");
  }

  const boxStyle = computed(() => {
    const style = {
      aspectRatio: hasIntrinsic.value ? `${props.width} / ${props.height}` : props.fallbackRatio,
    };
    const value = (props.lqip || "").trim();
    if (value.startsWith("data:image/")) {
      // Tırnak ve parantez kaçışı: değer sunucudan geliyor, stil bağlamına
      // ham konursa `url(...)` kapatılıp başka bildirim enjekte edilebilir.
      style.backgroundImage = `url("${value.replace(/["\\]/g, "")}")`;
      style.backgroundSize = "cover";
      style.backgroundPosition = "center";
    } else if (/^#[0-9a-f]{3,8}$/i.test(value)) {
      style.backgroundColor = value;
    }
    return style;
  });
</script>

<template>
  <span class="mimg" :class="{ 'mimg--loaded': loaded }" :style="boxStyle">
    <picture v-if="src && !failed" class="mimg__pic">
      <source v-for="s in sources" :key="s.key" :type="s.type" :srcset="s.srcset" :sizes="sizes" />
      <img
        ref="imgEl"
        class="mimg__el"
        :src="src"
        :srcset="imgSrcset || undefined"
        :sizes="hasResponsive ? sizes : undefined"
        :alt="alt"
        :width="attrWidth"
        :height="attrHeight"
        :loading="effectiveLoading"
        :fetchpriority="fetchPriority"
        decoding="async"
        @load="loaded = true"
        @error="onError"
      />
    </picture>
    <span v-else class="mimg__fallback"><slot /></span>
  </span>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .mimg {
    position: relative;
    display: block;
    overflow: hidden;
    // Genişlik BİLEREK verilmiyor: blok eleman zaten kabını doldurur ve
    // sabit ölçülü kullanımlarda (44px satır küçük resmi) çağıranın kuralıyla
    // aynı özgüllükte çakışıp sıraya bağlı kazanan üretirdi.
    background-color: $l-bg-muted;

    @include dark {
      background-color: $d-bg-elevated;
    }
  }

  // Yer tutucu bulanıklığı yalnız gerçek LQIP verisi varken anlamlı; düz
  // yüzeyde görünmez ama zararsız olduğu için ayrı sınıf tutulmadı.
  // `<picture>` kendi kutusunu üretmemeli: `display: contents` ile `<img>`'in
  // içeren bloğu yine `.mimg` olur, böylece `width/height: 100%` sarmalayıcı
  // eklenmeden önceki değere çözülür. `inline` bırakılsaydı `width: 100%`
  // shrink-to-fit bir kutuya çözülür ve küçük resimler küçülürdü.
  .mimg__pic {
    display: contents;
  }

  .mimg__el {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    // İnerken yer tutucu görünür; indiğinde üstüne oturur. Geçiş opaklıkta:
    // ölçü değişmediği için düzen etkilenmez.
    opacity: 0;
    transition: opacity $t-base;
  }

  .mimg--loaded .mimg__el {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .mimg__el {
      transition: none;
    }
  }

  .mimg__fallback {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
</style>
