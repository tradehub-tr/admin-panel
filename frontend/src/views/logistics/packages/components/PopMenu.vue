<template>
  <div ref="rootEl" class="relative">
    <button
      type="button"
      class="th-btn-outline text-xs"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="label"
      @click.stop="open = !open"
    >
      <span aria-hidden="true">⋯</span>
    </button>
    <div v-if="open" class="pop" role="menu" @click="open = false">
      <slot />
    </div>
  </div>
</template>

<script setup>
  import { onBeforeUnmount, ref, watch } from "vue";

  /**
   * Az kullanılan kart eylemlerini toplayan küçük menü.
   *
   * ORTAK BİLEŞEN DEĞİL, bilinçli: `components/common/` iki geliştiricinin
   * ortak yüzeyi (LOGISTICS-TASK-SPLIT §3) ve buraya bir dosya eklemek her
   * PR'da çakışma üretiyor. İhtiyaç ikinci bir alana yayılırsa taşınır.
   *
   * `Teleport` KULLANILMIYOR: menü kartın içinde kalıyor, kart kaydırılınca
   * onunla gidiyor. Teleport edilse gövdeye çıkar ve kaydırmada yerinde
   * kalırdı.
   */
  defineProps({
    /** Ekran okuyucu için düğmenin adı — "⋯" tek başına anlam taşımıyor. */
    label: { type: String, required: true },
  });

  const open = ref(false);
  const rootEl = ref(null);

  function onDocClick(event) {
    if (!rootEl.value?.contains(event.target)) open.value = false;
  }

  function onEscape(event) {
    if (event.key === "Escape") open.value = false;
  }

  // Dinleyiciler yalnız menü AÇIKKEN bağlı: 40 kolilik sevkiyatta 40 kartın
  // her biri sürekli belge dinlerse her tıklama 40 kez işlenir.
  watch(open, (isOpen) => {
    if (isOpen) {
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onEscape);
    } else {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEscape);
    }
  });

  onBeforeUnmount(() => {
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onEscape);
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  /* Renkler TAILWIND SINIFIYLA DEĞİL token'la veriliyor.
     `bg-white dark:bg-slate-800` yazınca kutu doğru boyanıyordu ama slot'tan
     gelen kalemlerin hover'ı `rgb(241 245 249)` kalıyordu: koyu temada açık
     zemin + açık metin = 1.03:1 kontrast, okunmuyordu (ölçüldü). Token
     kullanınca iki tema da tek yerden geliyor. */
  /* ZEMİN İLE HOVER FARKLI TOKENLARDAN OLMALI — ilk sürümde panel
     `$d-bg-elevated`, hover `$d-item-hover` idi ve ikisi de #21201d:
     üzerine gelince HİÇBİR ŞEY değişmiyordu, hangi satırda olduğun
     belli olmuyordu. (variables.scss'te bg-elevated / bg-hover /
     item-hover üçü de aynı değer.) */
  .pop {
    position: absolute;
    inset-inline-end: 0;
    top: calc(100% + 4px);
    z-index: 20;
    min-width: 150px;
    padding: 4px 0;
    overflow: hidden;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
    }
  }

  /* Kalemler slot'tan geliyor — ebeveynin scope'unda derlendikleri için
     `:slotted()` şart, düz seçici tutmaz. */
  :slotted(button) {
    position: relative;
    display: block;
    width: 100%;
    padding: 7px 12px;
    font-size: 12px;
    text-align: start;
    color: $l-text-700;
    background: transparent;
    border: 0;
    cursor: pointer;
    transition: background $d-fast $ease-out, color $d-fast $ease-out;

    @include dark {
      color: $d-text;
    }
  }

  /* Fare VE klavye aynı vurguyu alıyor: menüde ok tuşlarıyla gezen
     kullanıcı nerede olduğunu göremiyordu. */
  :slotted(button:hover),
  :slotted(button:focus-visible) {
    background: $l-bg-muted;
    color: $l-text-900;
    outline: none;

    @include dark {
      background: $d-item-hover;
      color: $d-text-max;
    }
  }

  /* Renk tek işaret olmasın: sol kenarda marka şeridi. Yüksek kontrast
     kipinde ve renk körlüğünde de "buradasın" okunuyor. */
  :slotted(button:hover)::before,
  :slotted(button:focus-visible)::before {
    content: "";
    position: absolute;
    inset-inline-start: 0;
    top: 4px;
    bottom: 4px;
    width: 2px;
    border-radius: 0 2px 2px 0;
    background: $brand;
  }

</style>
