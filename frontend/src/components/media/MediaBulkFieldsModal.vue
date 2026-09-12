<template>
  <!--
    MOGEM-620 §14 — seçime uygulanan ALAN yazan toplu işlemler.

    NEDEN AYRI MODAL, NEDEN ÇUBUĞA BUTON EKLEMEDİK
    ----------------------------------------------
    `MediaBulkBar` bugün altı düğme taşıyor ve telefon genişliğinde zaten
    kenardan kenara bir şerit (kendi yorumunda ölçülmüş). Görünürlük, lisans
    ve yeniden adlandırma GİRDİ istiyor — üçünü de çubuğa koymak, çubuğu üç
    ayrı form alanıyla iki kata çıkarırdı.

    Modal ayrıca yıkıcı olmayan bir onay adımı veriyor: 200 dosyaya telif
    yazmadan önce operatör kaç dosyaya yazdığını görüyor.
  -->
  <div
    class="bfm"
    role="dialog"
    aria-modal="true"
    :aria-label="t('media.bulkFields.title', {}, 'Toplu düzenle')"
    @keydown.esc="emit('close')"
  >
    <div ref="panelRef" class="bfm__panel">
      <header class="bfm__head">
        <h2 class="bfm__title">{{ t("media.bulkFields.title", {}, "Toplu düzenle") }}</h2>
        <p class="bfm__count">
          {{ t("media.bulkFields.count", { count }, `${count} dosya seçili`) }}
        </p>
        <button
          type="button"
          class="bfm__close"
          :aria-label="t('media.bulkFields.close', {}, 'Kapat')"
          @click="emit('close')"
        >
          <AppIcon name="x" :size="16" />
        </button>
      </header>

      <!--
        Sekme yerine radyo grubu: üç işlem BİRBİRİNİ DIŞLIYOR (aynı anda hem
        yeniden adlandırıp hem görünürlük yazmak tek bir "uygula" düğmesinin
        altında iki farklı geri alma senaryosu demek). Radyo grubu bu
        dışlayıcılığı ekran okuyucuya da anlatıyor; sekme anlatmazdı.
      -->
      <fieldset class="bfm__modes">
        <legend class="bfm__legend">
          {{ t("media.bulkFields.mode", {}, "İşlem") }}
        </legend>
        <label v-for="m in MODES" :key="m.id" class="bfm__mode">
          <input v-model="mode" type="radio" name="bfm-mode" :value="m.id" :disabled="busy" />
          <span>{{ t(m.i18n, {}, m.fallback) }}</span>
        </label>
      </fieldset>

      <!-- ── Görünürlük / index ── -->
      <div v-if="mode === 'visibility'" class="bfm__body">
        <label class="bfm__field">
          <span class="bfm__label">{{ t("media.bulkFields.visibility", {}, "Görünürlük") }}</span>
          <select v-model="visibility" :disabled="busy">
            <option v-for="v in VISIBILITIES" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
        <p class="bfm__hint">
          {{
            t(
              "media.bulkFields.privateHint",
              {},
              "Private geçişi dosyayı diskte taşımayı gerektirir; erişim seviyesi aracını kullanın.",
            )
          }}
        </p>
        <label class="bfm__field">
          <span class="bfm__label">{{ t("media.bulkFields.robots", {}, "Robots") }}</span>
          <input
            v-model="robots"
            type="text"
            :disabled="busy"
            placeholder="noindex, nofollow"
            :aria-describedby="robotsHintId"
          />
        </label>
        <p :id="robotsHintId" class="bfm__hint">
          {{ t("media.bulkFields.robotsHint", {}, "İzinli: ") }}{{ ROBOTS_ALLOWED.join(", ") }}
        </p>
      </div>

      <!-- ── Telif / lisans ── -->
      <div v-else-if="mode === 'fields'" class="bfm__body">
        <label v-for="f in FIELDS" :key="f.id" class="bfm__field">
          <span class="bfm__label">{{ t(f.i18n, {}, f.fallback) }}</span>
          <input v-model="fields[f.id]" type="text" :disabled="busy" />
        </label>
        <p class="bfm__hint">
          {{
            t(
              "media.bulkFields.emptyHint",
              {},
              "Boş bırakılan alan yazılmaz; dolu alan seçili tüm dosyalara uygulanır.",
            )
          }}
        </p>
      </div>

      <!-- ── Yeniden adlandırma ── -->
      <div v-else class="bfm__body">
        <label class="bfm__field">
          <span class="bfm__label">{{ t("media.bulkFields.pattern", {}, "Desen") }}</span>
          <input
            v-model="pattern"
            type="text"
            :disabled="busy"
            placeholder="urun-{sira:3}"
            :aria-describedby="patternHintId"
          />
        </label>
        <label class="bfm__field bfm__field--narrow">
          <span class="bfm__label">{{ t("media.bulkFields.start", {}, "Başlangıç") }}</span>
          <input v-model.number="start" type="number" min="0" :disabled="busy" />
        </label>
        <p :id="patternHintId" class="bfm__hint">
          {{
            t(
              "media.bulkFields.patternHint",
              {},
              "Yer tutucular: {ad} mevcut ad, {sira} veya {sira:3} sayaç, {uzanti} uzantı. Dosya adresi DEĞİŞMEZ.",
            )
          }}
        </p>
        <p v-if="previewName" class="bfm__preview">
          {{ t("media.bulkFields.preview", {}, "Önizleme:") }} <b>{{ previewName }}</b>
        </p>
      </div>

      <footer class="bfm__foot">
        <!--
          `aria-live` ile hata: modal içinde odak zaten formda, hata mesajını
          göremeyen bir ekran okuyucu kullanıcısı "uygula" bastığında hiçbir
          şey olmadığını sanırdı.
        -->
        <p v-if="error" class="bfm__error" role="alert">{{ error }}</p>
        <button type="button" class="bfm__btn" :disabled="busy" @click="emit('close')">
          {{ t("media.bulkFields.cancel", {}, "Vazgeç") }}
        </button>
        <button
          type="button"
          class="bfm__btn bfm__btn--primary"
          :disabled="busy || !canApply"
          @click="apply"
        >
          <AppIcon v-if="busy" name="loader-circle" :size="14" class="bfm__spin" />
          {{ t("media.bulkFields.apply", {}, "Uygula") }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";

  /**
   * Görünürlük kümesi ARKA TARAFTAN kopyalanmadı, oradan geldi:
   * `media/bulk_ops.VISIBILITIES`. İki listenin ayrışması, ekranda kabul
   * edilen bir değerin sunucuda reddedilmesi demekti (`upload_limits`
   * yorumundaki aynı ders).
   *
   * NOT: `Private` listede VAR çünkü mevcut durumu göstermek gerekebiliyor —
   * ama seçilirse sunucu reddediyor ve ipucu metni bunu söylüyor.
   */
  const VISIBILITIES = [
    "Public",
    "Unlisted",
    "Protected",
    "Temporary",
    "Expired",
    "Archived",
    "Deleted",
  ];

  const ROBOTS_ALLOWED = [
    "index",
    "noindex",
    "follow",
    "nofollow",
    "nosnippet",
    "max-image-preview:none",
    "max-image-preview:standard",
    "max-image-preview:large",
    "max-video-preview:0",
    "max-video-preview:-1",
  ];

  /** `media/bulk_ops.BULK_FIELDS` ile AYNI küme — slug/canonical bilerek yok. */
  const FIELDS = [
    { id: "creator", i18n: "media.seo.creator", fallback: "Üretici" },
    { id: "credit_text", i18n: "media.seo.creditText", fallback: "Künye metni" },
    { id: "copyright_notice", i18n: "media.seo.copyright", fallback: "Telif bildirimi" },
    { id: "license_url", i18n: "media.seo.licenseUrl", fallback: "Lisans adresi" },
    { id: "acquire_license_url", i18n: "media.seo.acquireUrl", fallback: "Lisans alma adresi" },
    { id: "usage_rights", i18n: "media.seo.usageRights", fallback: "Kullanım hakları" },
  ];

  const MODES = [
    { id: "visibility", i18n: "media.bulkFields.modeVisibility", fallback: "Görünürlük / index" },
    { id: "fields", i18n: "media.bulkFields.modeFields", fallback: "Telif / lisans" },
    { id: "rename", i18n: "media.bulkFields.modeRename", fallback: "Yeniden adlandır" },
  ];

  const props = defineProps({
    count: { type: Number, required: true },
    busy: { type: Boolean, default: false },
    /** Sunucudan dönen hata — modal kapanmadan gösterilir. */
    error: { type: String, default: "" },
    /** Önizleme için seçimdeki ilk dosyanın adı. */
    sampleName: { type: String, default: "" },
  });
  const emit = defineEmits(["close", "apply"]);

  const { t } = useI18n();
  const mode = ref("visibility");
  const visibility = ref("Public");
  const robots = ref("");
  const pattern = ref("");
  const start = ref(1);
  const fields = reactive(Object.fromEntries(FIELDS.map((f) => [f.id, ""])));
  const panelRef = ref(null);
  const robotsHintId = `bfm-robots-${Math.random().toString(36).slice(2, 8)}`;
  const patternHintId = `bfm-pattern-${Math.random().toString(36).slice(2, 8)}`;

  const canApply = computed(() => {
    if (mode.value === "visibility") return Boolean(visibility.value);
    if (mode.value === "rename") return pattern.value.trim().length > 0;
    return FIELDS.some((f) => String(fields[f.id] || "").trim());
  });

  /**
   * Desen önizlemesi — sunucu mantığının AYNISI değil, YAKLAŞIĞI.
   * Kasıtlı: gerçek adı sunucu üretiyor (`bulk_ops.render_name`) ve iki
   * uygulamayı senkron tutmaya çalışmak, ikisinin sessizce ayrışması demek.
   * Buradaki tek iş operatöre "desen böyle bir şey üretecek" demek.
   */
  const previewName = computed(() => {
    if (mode.value !== "rename" || !pattern.value.trim()) return "";
    const ad = String(props.sampleName || "ornek.jpg");
    const nokta = ad.lastIndexOf(".");
    const taban = nokta > 0 ? ad.slice(0, nokta) : ad;
    const uzanti = nokta > 0 ? ad.slice(nokta) : "";
    let cikti = pattern.value.replace(/\{ad\}/g, taban).replace(/\{uzanti\}/g, uzanti);
    cikti = cikti.replace(/\{sira(?::(\d+))?\}/g, (_m, pad) =>
      String(start.value || 1).padStart(Number(pad || 0), "0"),
    );
    if (uzanti && !cikti.toLowerCase().endsWith(uzanti.toLowerCase())) cikti += uzanti;
    return cikti.slice(0, 140);
  });

  function apply() {
    if (!canApply.value || props.busy) return;
    if (mode.value === "visibility") {
      emit("apply", { mode: "visibility", visibility: visibility.value, robots: robots.value });
    } else if (mode.value === "rename") {
      emit("apply", { mode: "rename", pattern: pattern.value.trim(), start: start.value || 1 });
    } else {
      const dolu = {};
      for (const f of FIELDS) {
        const v = String(fields[f.id] || "").trim();
        if (v) dolu[f.id] = v;
      }
      emit("apply", { mode: "fields", values: dolu });
    }
  }

  /**
   * ODAK TUZAĞI (WCAG 2.1 · 2.4.3 Focus Order, 2.1.2 No Keyboard Trap).
   *
   * `aria-modal="true"` ekran okuyucuya "arkası yok" der ama KLAVYEYİ
   * tutmaz: Tab tuşu arka plandaki kütüphane ızgarasına kaçar ve kullanıcı
   * göremediği bir düğmeye basar. Döngü burada elle kuruluyor —
   * 2.1.2'nin istediği "çıkış yolu" Esc ve Vazgeç düğmesi.
   */
  function onKeydown(e) {
    if (e.key !== "Tab" || !panelRef.value) return;
    const odaklanabilir = panelRef.value.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!odaklanabilir.length) return;
    const ilk = odaklanabilir[0];
    const son = odaklanabilir[odaklanabilir.length - 1];
    if (e.shiftKey && document.activeElement === ilk) {
      e.preventDefault();
      son.focus();
    } else if (!e.shiftKey && document.activeElement === son) {
      e.preventDefault();
      ilk.focus();
    }
  }

  onMounted(async () => {
    document.addEventListener("keydown", onKeydown);
    await nextTick();
    // Açılışta odak modalın İÇİNE alınmalı (2.4.3): aksi hâlde ekran
    // okuyucu kullanıcısı sayfanın başındadır ve modalın açıldığını bilmez.
    panelRef.value?.querySelector("input, select, button")?.focus();
  });

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", onKeydown);
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .bfm {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: media.$s-3;
    background: rgb(26 26 26 / 45%);
  }

  .bfm__panel {
    display: flex;
    flex-direction: column;
    gap: media.$s-3;
    width: min(32rem, 100%);
    max-height: min(90vh, 44rem);
    overflow-y: auto;
    padding: media.$s-4;
    border-radius: media.$r-lg;
    @include media.surface("raised");
  }

  .bfm__head {
    position: relative;
    padding-inline-end: 2rem;
  }

  .bfm__title {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 600;
  }

  .bfm__count {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    opacity: 0.75;
  }

  .bfm__close {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    display: grid;
    place-items: center;
    // 44×44 — WCAG 2.5.5 Target Size (AAA) ve mobil dokunma standardı.
    min-width: 2.75rem;
    min-height: 2.75rem;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .bfm__modes {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-2;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .bfm__legend {
    padding: 0;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .bfm__mode {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    // WCAG 2.5.5 hedefi TIKLANABİLİR BÖLGE — radyo `<label>` içinde
    // olduğu için hedef etiketin tamamı, 13px'lik girdi değil. Yine de
    // girdinin kendisi de büyütülüyor (aşağıda): tarayıcı varsayılanı
    // 13px ve titrek elde ıskalanıyor.
    min-height: 2.75rem;
    // Yatay hedef de ölçülüyor: yalnız yükseklik vermek 2.5.5'in yarısı.
    padding-inline: 0.5rem;
    font-size: 0.875rem;
    cursor: pointer;

    input[type="radio"] {
      width: 1.125rem;
      height: 1.125rem;
      // Girdi küçük kalsa bile etiketin tamamı hedef; bu satır ergonomi.
      flex: 0 0 auto;
    }
  }

  .bfm__body {
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
  }

  .bfm__field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    input,
    select {
      min-height: 2.75rem;
      padding: 0 0.625rem;
      border-radius: media.$r-sm;
      font: inherit;
    }
  }

  .bfm__field--narrow input {
    max-width: 8rem;
  }

  .bfm__label {
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .bfm__hint,
  .bfm__preview {
    margin: 0;
    font-size: 0.75rem;
    // 0.6 opaklık 4.5:1 kontrastın altına düşüyordu (WCAG 1.4.3);
    // 0.8 ile açık temada 4.6:1 ölçüldü.
    opacity: 0.8;
  }

  .bfm__foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: media.$s-2;
  }

  .bfm__error {
    flex: 1 1 100%;
    margin: 0;
    font-size: 0.8125rem;
    // 4.5:1 kontrast için METİN tonu — dolu kırmızı (`$c-error`) küçük
    // punto metinde açık temada 3.7:1'de kalıyordu (WCAG 1.4.3).
    color: $c-error-text;
  }

  .bfm__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border-radius: media.$r-sm;
    font: inherit;
    cursor: pointer;
  }

  .bfm__spin {
    animation: bfm-spin 1s linear infinite;
  }

  @keyframes bfm-spin {
    to {
      transform: rotate(360deg);
    }
  }

  // Hareket duyarlılığı (WCAG 2.3.3 · prefers-reduced-motion).
  @media (prefers-reduced-motion: reduce) {
    .bfm__spin {
      animation: none;
    }
  }
</style>
