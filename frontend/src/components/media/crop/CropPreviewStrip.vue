<template>
  <section class="cpreview" :aria-label="t('cropStudio.preview.title')">
    <header class="cpreview__head">
      <h3 class="cpreview__title">{{ t("cropStudio.preview.title") }}</h3>
      <!-- Türev tablosu BOŞ (bayraklar kapalı, hiçbir Media Rendition
           üretilmedi). Bu bir hata değil, ekranın beklenen hâli — ve önizleme
           kaynak görselden İSTEMCİDE üretiliyor, sunucudan değil. -->
      <span class="cpreview__origin">{{ t("cropStudio.preview.clientSide") }}</span>
    </header>

    <p v-if="!profiles.length" class="cpreview__empty">
      {{ t("cropStudio.preview.noProfiles") }}
    </p>

    <ul v-else class="cpreview__list" role="list">
      <li v-for="p in cards" :key="p.name" class="cpreview__item">
        <div class="cpreview__frame">
          <canvas
            :ref="(el) => setRef(p.name, el)"
            class="cpreview__canvas"
            :class="{ 'cpreview__canvas--pad': !p.croppable }"
            :width="p.cell.w"
            :height="p.cell.h"
            :aria-label="t('cropStudio.preview.alt', { profile: p.name })"
          ></canvas>
          <!-- Güvenli alan: politikanın `content_rules` bandı. Kadrajın
               ORTASINDAKİ bu kesit en dar canlı kutuda kesin görünür; dışı
               ekrana göre kesilebilir. Karartma değil çerçeve — kullanıcı
               görselini görmeye devam etmeli. -->
          <span
            v-if="band && p.croppable"
            class="cpreview__band"
            :style="bandStyle"
            :title="t('cropStudio.preview.safeBand', { pct: Math.round(band.fraction * 100) })"
            aria-hidden="true"
          ></span>
        </div>
        <span class="cpreview__name">{{ p.name }}</span>
        <span class="cpreview__size">
          {{ p.width }}<template v-if="p.height">×{{ p.height }}</template>
        </span>
        <!-- Sunucu türevinin VARLIĞI kart başına söylenir. Bugün tablo boş
             (bayraklar kapalı) ve bu bir hata değil, ekranın beklenen hâli. -->
        <span class="cpreview__tag" :class="{ 'cpreview__tag--live': p.rendition }">
          {{
            p.rendition
              ? t("cropStudio.preview.serverHas", { fmt: p.rendition.format || "—" })
              : t("cropStudio.preview.serverNone")
          }}
        </span>
        <span v-if="!p.croppable" class="cpreview__tag">{{ t("cropStudio.preview.notCropped") }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * Canlı çoklu önizleme — kullanıcı kadraj çizerken slotun BÜTÜN profilleri
   * aynı anda güncellenir.
   *
   * ### Neden kaynaktan, sunucudan değil
   *
   * `Media Rendition` tablosu bugün BOŞ (bayraklar kapalı). Gerçek türev
   * yoktur; önizleme kaynak görselden istemcide üretilir. Boş durum birinci
   * sınıftır: profil listesi boşsa ekran "henüz üretilmedi" der, kırmızı hata
   * göstermez.
   *
   * ### Bütçe
   *
   * Kaynak bir kez `createImageBitmap` ile çözülüp buraya verilir
   * (`CropCanvas` çözer, prop ile gelir) — her önizleme onu kullanır, dosyayı
   * yeniden çözmez. Çizim `requestAnimationFrame`'de toplanır: bir karede
   * birden çok `pointermove` gelirse yalnız sonuncusu çizilir. Görünmeyen
   * önizleme çizilmez (`IntersectionObserver`).
   *
   * **ÖLÇÜLMEDİ:** `< 16 ms` hedefi ölçülmedi. Kare başına toplam çizim
   * süresi, DPR 1/2 farkı ve bellek tüketimi tarayıcıda ölçülmelidir; bu
   * görevde tarayıcı doğrulaması YAPILMADI.
   */
  const props = defineProps({
    /** `slotProfiles()` çıktısı — `croppable`, `targetAR` zenginleştirilmiş. */
    profiles: { type: Array, default: () => [] },
    /** `createImageBitmap` sonucu; yoksa önizleme boş kalır. */
    bitmap: { type: Object, default: null },
    /** Kadraj — KAYNAK pikseli. */
    win: { type: Object, default: null },
    sourceW: { type: Number, required: true },
    sourceH: { type: Number, required: true },
    /**
     * Sunucunun ürettiği `Media Rendition` satırları —
     * `[{ profile, format, ... }]`. Bugün **boş**: hat bayrakları kapalı ve
     * tabloda hiç satır yok. Boş gelmesi hata değildir, kart bunu söyler.
     */
    renditions: { type: Array, default: () => [] },
    /**
     * Politikanın güvenli alan bandı (`cropWarnings.safeBandFor`). `null` =
     * bu slotta tanımlı kural yok; o zaman bant ÇİZİLMEZ — uydurulmuş bir
     * eşik göstermek, olmayan bir garantiyi vaat etmek olurdu.
     */
    band: { type: Object, default: null },
  });

  /**
   * Yerel iletiler. `src/i18n/locales/*.js` bu görevde başka bir ajanın
   * dosyası; yeni anahtarlar bileşen kapsamında tanımlanır. `useI18n`in
   * yerel kapsamı eksik anahtarları köke düşürür (`fallbackRoot`), yani
   * mevcut `cropStudio.*` anahtarları aynen çalışmaya devam eder.
   */
  const { t } = useI18n({
    messages: {
      tr: {
        cropStudio: {
          preview: {
            serverNone: "sunucu türevi yok",
            serverHas: "sunucu türevi · {fmt}",
            safeBand: "Güvenli alan: dar ekranda kesin görünen orta %{pct}",
          },
        },
      },
      en: {
        cropStudio: {
          preview: {
            serverNone: "no server rendition",
            serverHas: "server rendition · {fmt}",
            safeBand: "Safe area: centre {pct}% guaranteed on narrow screens",
          },
        },
      },
      ru: {
        cropStudio: {
          preview: {
            serverNone: "серверного варианта нет",
            serverHas: "серверный вариант · {fmt}",
            safeBand: "Безопасная зона: центральные {pct}% видны на узких экранах",
          },
        },
      },
      ar: {
        cropStudio: {
          preview: {
            serverNone: "لا توجد نسخة من الخادم",
            serverHas: "نسخة الخادم · {fmt}",
            safeBand: "المنطقة الآمنة: الوسط {pct}% مضمون على الشاشات الضيقة",
          },
        },
      },
    },
  });

  /** Profil adı → sunucu türevi. Aynı profilin ilk satırı temsil eder. */
  const renditionByProfile = computed(() => {
    const m = new Map();
    for (const r of props.renditions || []) {
      const k = r?.profile || r?.profile_key;
      if (k && !m.has(k)) m.set(k, r);
    }
    return m;
  });

  const cards = computed(() =>
    props.profiles.map((p) => ({
      ...p,
      cell: cell(p),
      rendition: renditionByProfile.value.get(p.name) || null,
    }))
  );

  /**
   * Bant kutusu — yüzde ile, piksel ile değil: her kartın kendi oranı var ve
   * bant kadrajın ORANINDAN bağımsız olarak ortada kalan kesittir.
   */
  const bandStyle = computed(() => {
    if (!props.band) return null;
    const f = props.band.fraction;
    const yatay = `${((1 - f) / 2) * 100}%`;
    const dikey = props.band.axis === "both" ? `${((1 - f) / 2) * 100}%` : "0%";
    return { left: yatay, right: yatay, top: dikey, bottom: dikey };
  });

  const MAX_CELL = 132;
  const canvases = shallowRef(new Map());
  const visible = ref(new Set());
  let raf = 0;
  let io = null;

  /** Önizleme hücresinin CSS boyutu — profilin oranını korur. */
  function cell(p) {
    const ar = p.height ? p.width / p.height : props.sourceW / props.sourceH;
    return ar >= 1
      ? { w: MAX_CELL, h: Math.max(1, Math.round(MAX_CELL / ar)) }
      : { w: Math.max(1, Math.round(MAX_CELL * ar)), h: MAX_CELL };
  }

  function setRef(name, el) {
    if (!el) {
      canvases.value.delete(name);
      return;
    }
    canvases.value.set(name, el);
    el.dataset.profile = name;
    io?.observe(el);
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      drawAll();
    });
  }

  function drawAll() {
    if (!props.bitmap) return;
    for (const p of props.profiles) {
      const el = canvases.value.get(p.name);
      if (!el || !visible.value.has(p.name)) continue;
      const ctx = el.getContext("2d");
      if (!ctx) continue;
      ctx.clearRect(0, 0, el.width, el.height);

      if (!p.croppable) {
        // `pad`/`contain`: kırpma YOK, letterbox. Kullanıcı "neden kırpılmıyor"
        // sorusunu sormadan görmeli.
        const k = Math.min(el.width / props.sourceW, el.height / props.sourceH);
        const w = props.sourceW * k;
        const h = props.sourceH * k;
        ctx.fillStyle = "#f1f2f5";
        ctx.fillRect(0, 0, el.width, el.height);
        ctx.drawImage(props.bitmap, (el.width - w) / 2, (el.height - h) / 2, w, h);
        continue;
      }

      if (!props.win) continue;
      ctx.drawImage(
        props.bitmap,
        props.win.x,
        props.win.y,
        props.win.w,
        props.win.h,
        0,
        0,
        el.width,
        el.height
      );
    }
  }

  onMounted(() => {
    io = new IntersectionObserver(
      (entries) => {
        const next = new Set(visible.value);
        for (const e of entries) {
          const key = e.target.dataset.profile;
          if (e.isIntersecting) next.add(key);
          else next.delete(key);
        }
        visible.value = next;
        schedule();
      },
      { rootMargin: "64px" }
    );
    canvases.value.forEach((el) => io.observe(el));
    schedule();
  });

  onBeforeUnmount(() => {
    io?.disconnect();
    if (raf) cancelAnimationFrame(raf);
  });

  watch(() => [props.win, props.bitmap, props.profiles], schedule, { deep: true });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .cpreview__head {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .cpreview__title {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .cpreview__origin,
  .cpreview__empty {
    margin: 0;
    color: $l-text-500;
    font-size: 0.75rem;

    @include dark {
      color: $d-text-muted;
    }
  }

  .cpreview__list {
    display: flex;
    gap: 0.75rem;
    margin: 0;
    padding: 0 0 0.25rem;
    overflow-x: auto;
    list-style: none;
  }

  .cpreview__item {
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    gap: 0.15rem;
    font-size: 0.6875rem;
  }

  .cpreview__frame {
    position: relative;
    display: inline-flex;
  }

  .cpreview__canvas {
    display: block;
    border: 1px solid $l-border;
    border-radius: 0.25rem;
    background: #111;

    @include dark {
      border-color: $d-border;
    }
  }

  /* Güvenli alan bandı — karartma DEĞİL, çerçeve. Görselin üstünü örtmek
     kullanıcının kadrajı değerlendirmesini zorlaştırırdı. */
  .cpreview__band {
    position: absolute;
    border: 1px dashed rgb(255 255 255 / 75%);
    border-radius: 0.15rem;
    pointer-events: none;
    mix-blend-mode: difference;
  }

  .cpreview__tag--live {
    color: $c-success;
  }

  .cpreview__canvas--pad {
    background: #f1f2f5;
  }

  .cpreview__name {
    font-weight: 600;
  }

  .cpreview__size,
  .cpreview__tag {
    color: $l-text-500;
    font-variant-numeric: tabular-nums;

    @include dark {
      color: $d-text-muted;
    }
  }
</style>
