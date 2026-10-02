<script setup>
  /**
   * Küçük, erişilebilir bilgi ipucu — teknik bir kısaltmanın (örn. SSIM)
   * yanına konan düğme. Hover, klavye odağı VE dokunmatik tek dokunuşla açılır.
   *
   * Neden `position: fixed` — `absolute` değil:
   * Bu düğme dar bir yan panelin (~420px masaüstü, 390px mobil) içinde,
   * `overflow-y: auto` olan bir kaydırma alanının içinde kullanılıyor. CSS
   * kuralına göre bir eksende `visible` olmayan overflow verildiğinde diğer
   * eksen de örtük biçimde `auto` sayılır — yani o panel YATAYDA da kırpar/
   * kaydırır. Balon `absolute` olsaydı geniş olduğunda panelin kendisine
   * yeni bir yatay kaydırma çubuğu eklerdi (tam düzeltmeye çalıştığımız
   * hata). `fixed` konumlama viewport'a göre hesaplanıp o zincirden çıkar —
   * `MediaCard`'ın "⋯" menüsündeki aynı sorunun çözümüyle aynı gerekçe
   * (`menuPlacement.js`), burada ayrı bir bağımlılık kurmamak için konum
   * hesabı yerinde ve daha basit tutuldu.
   *
   * ÖNEMLİ — `fixed` yalnız LAYOUT/KIRPMA zincirinden kaçar, CSS
   * inheritance'tan KAÇMAZ: balon DOM'da hâlâ tablo başlığının (`<th>`)
   * İÇİNDE duruyor. İlk sürümde bu unutulmuştu — Türevler tablosunun
   * `thead th` kuralı (BÜYÜK HARF, harf aralığı, kalın, `nowrap`) balona
   * miras kaldı: metin tek satıra sıkışıp panelin sağından taştı (ekran
   * görüntüsüyle bildirildi). Aşağıdaki `.infotip__bubble` bu yüzden HER
   * tipografik özelliği açıkça SIFIRLAR — üst bağlamdan hiçbir şey miras
   * bırakmaz.
   *
   * Balon HER ZAMAN DOM'da durur (`v-show` deseni, `display` ile gizli) —
   * SSR çıktısında metin her zaman bulunabilir olsun (ekran okuyucu +
   * testler); yalnız görünürlüğü ve konumu `visible` durumuna göre değişir.
   */
  import { computed, onBeforeUnmount, onMounted, ref, useId } from "vue";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { placeInfoTip } from "./infoTipPlacement.js";

  // Şablon `text`/`title`/`label`'ı doğrudan kullanıyor — derleyici
  // `defineProps` makrosundan bildiklerini render bağlamına otomatik
  // bağlıyor, ayrıca `props` değişkenine gerek yok.
  defineProps({
    /** Açıklama gövdesi — zaten çevrilmiş (i18n). `\n` satır sonu sayılır
     *  (`white-space: pre-line`) — kısa madde listesi bu şekilde biçimlenir. */
    text: { type: String, required: true },
    /** Balonun kalın başlık satırı — zaten çevrilmiş (i18n). Boşsa çizilmez. */
    title: { type: String, default: "" },
    /** Düğmenin erişilebilir adı — zaten çevrilmiş (i18n). */
    label: { type: String, required: true },
  });

  const uid = `infotip-${useId()}`;
  const hovering = ref(false);
  const focused = ref(false);
  const clicked = ref(false);
  const visible = computed(() => hovering.value || focused.value || clicked.value);

  const style = ref({});
  const root = ref(null);
  const btn = ref(null);
  const bubble = ref(null);

  function place() {
    if (typeof window === "undefined" || !btn.value) return;
    const trigger = btn.value.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const bubbleHeight = bubble.value?.offsetHeight || 0;
    const pos = placeInfoTip(trigger, viewport, bubbleHeight);
    style.value = { top: `${pos.top}px`, left: `${pos.left}px`, width: `${pos.width}px` };
  }

  function show(source) {
    if (source === "hover") hovering.value = true;
    if (source === "focus") focused.value = true;
    requestFrame(place);
  }
  function hide(source) {
    if (source === "hover") hovering.value = false;
    if (source === "focus") focused.value = false;
  }
  function toggleClick() {
    clicked.value = !clicked.value;
    if (clicked.value) requestFrame(place);
  }
  function close() {
    hovering.value = false;
    focused.value = false;
    clicked.value = false;
  }
  function requestFrame(fn) {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(fn);
    else fn();
  }

  function onKeydown(event) {
    if (event.key === "Escape") close();
  }
  function onDocPointer(event) {
    if (visible.value && root.value && !root.value.contains(event.target)) close();
  }

  onMounted(() => {
    document.addEventListener("pointerdown", onDocPointer);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
  });
  onBeforeUnmount(() => {
    document.removeEventListener("pointerdown", onDocPointer);
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
  });
</script>

<template>
  <span ref="root" class="infotip">
    <button
      ref="btn"
      type="button"
      class="infotip__btn"
      :aria-label="label"
      :aria-describedby="uid"
      :aria-expanded="visible"
      @mouseenter="show('hover')"
      @mouseleave="hide('hover')"
      @focus="show('focus')"
      @blur="hide('focus')"
      @click="toggleClick"
      @keydown="onKeydown"
    >
      <AppIcon name="info" :size="13" />
    </button>
    <span
      :id="uid"
      ref="bubble"
      role="tooltip"
      class="infotip__bubble"
      :class="{ 'infotip__bubble--on': visible }"
      :style="style"
    >
      <strong v-if="title" class="infotip__bubble-title">{{ title }}</strong>
      <span class="infotip__bubble-body">{{ text }}</span>
    </span>
  </span>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .infotip {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    vertical-align: middle;
  }

  // Dokunma hedefi ≥24px — sütun başlığı gibi dar bağlamlarda 44px
  // (`media.tap-target`) sığmıyor, ama 24px WCAG 2.5.8 (AA, Enhanced)
  // asgarisiyle uyumlu ve görsel olarak başlık metniyle aynı hizada kalıyor.
  .infotip__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: $l-text-500;
    cursor: pointer;
    @include media.focus-ring;

    @include dark {
      color: $d-text-muted;
    }
  }

  // Balon HER ZAMAN DOM'da (SSR/testte metin bulunabilir olsun); görünürlük
  // yalnız bu sınıfla değişir — panelin `overflow-y:auto`'sundan kaçmak için
  // `fixed`, kırpılmasın diye gerçek konum JS'te hesaplanır (bkz. `place()`).
  //
  // TİPOGRAFİ SIFIRLAMASI ZORUNLU (bkz. script yorumu): balon DOM'da bir
  // tablo başlığının içinde durabiliyor — `fixed` yalnız kırpılmayı önler,
  // `text-transform`/`letter-spacing`/`font-weight`/`white-space` gibi miras
  // alınan özellikleri SIFIRLAMAZ. Her biri burada açıkça verilir.
  .infotip__bubble {
    position: fixed;
    z-index: 80;
    display: none;
    box-sizing: border-box;
    max-width: 17.5rem; // 280px — script'teki MAX_WIDTH ile aynı üst sınır
    padding: media.$s-3; // 12px
    border-radius: media.$r-lg;
    border: 1px solid $l-border;
    background: $l-bg;
    box-shadow: 0 8px 24px rgb(0 0 0 / 20%);

    // ── Sıfırlama: üst bağlamdan HİÇBİR şey miras kalmaz ──────────────
    text-transform: none;
    letter-spacing: normal;
    font-weight: 400;
    font-style: normal;
    text-align: start;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: normal;
    font-size: 0.8125rem; // ~13px
    line-height: 1.5;
    color: $l-text-900;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-hi;
    }
  }

  .infotip__bubble--on {
    display: block;
  }

  .infotip__bubble-title {
    display: block;
    margin: 0 0 media.$s-1;
    font-weight: 700;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: inherit;
  }

  .infotip__bubble-body {
    display: block;
    // `\n` madde listesini satır sonu sayar (bkz. prop yorumu); uzun satırlar
    // yine normal sözcük sınırlarında sarar — `pre` DEĞİL `pre-line`.
    white-space: pre-line;
    color: inherit;
  }
</style>
