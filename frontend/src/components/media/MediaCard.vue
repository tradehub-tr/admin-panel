<template>
  <article
    class="mcard"
    :class="{
      'mcard--selected': selected,
      'mcard--active': active,
      'mcard--focused': focused,
      'mcard--uniform': uniform,
    }"
    :aria-selected="selected"
  >
    <button
      type="button"
      class="mcard__open"
      :aria-label="item.title || item.fileName"
      @click="emit('open')"
    >
      <MediaThumb :item="item" region="libraryGrid" :density="density" :detail-open="detailOpen">
        <span class="mcard__scrim" />
      </MediaThumb>
    </button>

    <!-- Hover/odak ile çıkan hızlı işlemler: kısayol bilmeyen kullanıcı için
         görünür yol (menüyü açmadan tek tıkla önizle/düzenle). -->
    <div class="mcard__quick">
      <button
        v-for="quick in QUICK_ACTIONS"
        :key="quick.id"
        type="button"
        class="mcard__quick-btn"
        :title="t(quick.labelKey)"
        :aria-label="t(quick.labelKey)"
        :disabled="quick.needsEdit && !editable"
        @click.stop="emit('action', quick.id)"
      >
        <AppIcon :name="quick.icon" :size="15" />
      </button>
    </div>

    <!-- role=checkbox: shift+tık aralık seçimi için ham click olayı gerekli -->
    <button
      type="button"
      class="mcard__check"
      role="checkbox"
      :aria-checked="selected"
      :aria-label="t('media.card.selectAria', { name: item.title || item.fileName })"
      @click.stop="onCheck"
    >
      <span class="mcard__box"><AppIcon name="check" :size="12" :stroke-width="3.5" /></span>
    </button>

    <div class="mcard__badges">
      <button
        type="button"
        class="mcard__star"
        :class="{ 'mcard__star--on': item.favorite }"
        :aria-pressed="item.favorite"
        :aria-label="t(item.favorite ? 'media.actions.unfavorite' : 'media.actions.favorite')"
        :title="t(item.favorite ? 'media.actions.unfavorite' : 'media.actions.favorite')"
        @click.stop="emit('action', 'favorite')"
      >
        <AppIcon name="star" :size="14" />
      </button>
      <!-- Uzantı önce: dar kartta sarma olursa "Ortak" alt satıra insin. -->
      <span class="mcard__badge">{{ item.ext }}</span>
      <!-- Video transcode durumu: yalnız işleniyor/başarısız gösterilir —
           "ready" rozeti bilinçli yok, oynatılabilir video zaten kendi kanıtı. -->
      <span v-if="item.videoStatus === 'processing'" class="mcard__badge mcard__badge--processing">
        {{ t("media.video.processing") }}
      </span>
      <span v-else-if="item.videoStatus === 'failed'" class="mcard__badge mcard__badge--failed">
        {{ t("media.video.failed") }}
      </span>
      <span v-if="item.owner === 'shared'" class="mcard__badge mcard__badge--shared">
        {{ t("media.shared") }}
      </span>
    </div>

    <div class="mcard__menu">
      <button
        type="button"
        class="mcard__menu-btn"
        :aria-label="t('media.card.actionsAria')"
        :aria-expanded="menuOpen"
        @click.stop="menuOpen = !menuOpen"
      >
        <AppIcon name="more-vertical" :size="16" />
      </button>
      <ul v-if="menuOpen" class="mcard__menu-list" role="menu" @click.stop>
        <li v-for="action in actions" :key="action.id" role="none">
          <button
            type="button"
            role="menuitem"
            class="mcard__menu-item"
            :class="{ 'mcard__menu-item--danger': action.danger }"
            :disabled="action.disabled"
            @click="run(action.id)"
          >
            <AppIcon :name="action.icon" :size="14" />
            {{ action.label }}
          </button>
        </li>
      </ul>
    </div>

    <div class="mcard__meta">
      <p class="mcard__name" :title="item.fileName">{{ item.fileName }}</p>
      <p class="mcard__sub">{{ formatBytes(item.bytes) }} · {{ formatDimensions(item) }}</p>
      <p class="mcard__sub">{{ formatDate(item.uploadedAt, locale) }}</p>
      <span v-if="missingAlt" class="mcard__alt-warn" :title="t('media.card.missingAltHint')">
        <AppIcon name="circle-alert" :size="12" />
        {{ t("media.card.missingAlt") }}
      </span>
      <!-- Pencerelenmiş ızgarada uyarı satırının YERİ her kartta ayrılır.
           Uyarı bazı kartlarda var bazılarında yok; olduğu kart ~28px daha
           uzun oluyordu. Pencerelemenin matematiği satır yüksekliğinin sabit
           olmasına dayanıyor — değişkense basılmayan satırların yerine konan
           boşluk gerçeğinden sapar ve kaydırma çubuğu her pencerede zıplar.
           `visibility: hidden` düğümü erişilebilirlik ağacından da düşürür. -->
      <span v-else-if="uniform" class="mcard__alt-warn mcard__alt-warn--ghost" aria-hidden="true">
        <AppIcon name="circle-alert" :size="12" />
        {{ t("media.card.missingAlt") }}
      </span>
      <span
        class="mcard__usage"
        :class="`mcard__usage--${item.liveUsage || 0 ? 'used' : 'unused'}`"
      >
        {{
          item.liveUsage || 0
            ? t("media.usedInCount", { count: item.liveUsage || 0 })
            : t("media.unused")
        }}
      </span>
    </div>
  </article>
</template>

<script setup>
  import { computed, onUnmounted, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import MediaThumb from "@/components/media/MediaThumb.vue";
  import { CARD_ACTIONS, QUICK_ACTIONS } from "@/components/media/mediaActions";
  import { formatBytes, formatDate, formatDimensions } from "@/utils/mediaFormat";

  const props = defineProps({
    item: { type: Object, required: true },
    selected: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    /** Klavye imleci bu kartta mı (roving focus). */
    focused: { type: Boolean, default: false },
    editable: { type: Boolean, default: true },
    /**
     * Izgara sütun sayısı ve detay sütununun açıklığı — `MediaThumb`'a
     * geçer, `sizes` oradan hesaplanır. Kart bunları kendi başına bilemez:
     * ikisi de görünümün düzen durumudur, kaydın değil.
     */
    density: { type: Number, default: 3 },
    detailOpen: { type: Boolean, default: false },
    /**
     * Kart pencerelenmiş bir ızgarada mı — yüksekliği İÇERİKTEN BAĞIMSIZ
     * olmak zorunda. Sanal kaydırma, basılmayan satırların yerine sabit
     * yükseklikten hesaplanmış bir boşluk koyar; kartlar farklı boyda olursa
     * o boşluk yanlış olur. Açıkken alt metin uyarısının yeri her kartta
     * ayrılır ve meta bloğu satır satır dizilir.
     */
    uniform: { type: Boolean, default: false },
  });
  const emit = defineEmits(["open", "toggle", "action"]);

  const { t, locale } = useI18n();
  const menuOpen = ref(false);

  /** Görselde alt metin yoksa SEO/erişilebilirlik uyarısı göster. */
  const missingAlt = computed(() => props.item.kind === "image" && !props.item.alt.trim());

  const actions = computed(() =>
    CARD_ACTIONS.map((action) => ({
      id: action.id,
      icon: action.icon(props.item),
      label: t(action.labelKey(props.item)),
      danger: action.danger === true,
      disabled:
        (action.needsEdit === true && !props.editable) ||
        // Ürününde kullanılan dosyada silme kapalı — sebebi etikette yazıyor.
        (action.blockedWhenUsed === true && (props.item.liveUsage || 0) > 0),
    }))
  );

  function onCheck(event) {
    emit("toggle", { range: event.shiftKey });
  }

  function run(id) {
    menuOpen.value = false;
    emit("action", id);
  }

  function closeMenu(event) {
    if (!event.target.closest?.(".mcard__menu")) menuOpen.value = false;
  }

  watch(menuOpen, (open) => {
    if (open) document.addEventListener("click", closeMenu);
    else document.removeEventListener("click", closeMenu);
  });
  onUnmounted(() => document.removeEventListener("click", closeMenu));
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // Kalkma efekti yalnız gerçek imleçte: dokunmatikte tap sonrası kart kalkık
  // takılıyordu (ANIMATION_AUDIT §7.3 sticky hover).
  .mcard {
    position: relative;
    overflow: hidden;
    transition:
      border-color $t-base,
      box-shadow $t-base,
      transform $d-press $ease-out;
    @include media.surface("raised");

    @include media.hoverable {
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgb(26 26 26 / 8%);
      }
    }
  }

  .mcard--selected,
  .mcard--active {
    border-color: $brand;
    box-shadow: 0 0 0 3px $brand-glow;
  }

  .mcard--focused {
    outline: 2px solid $c-info;
    outline-offset: 1px;
  }

  // Kartın tek dokunma hedefi bu; basınca geri bildirimi o veriyor.
  .mcard__open {
    display: block;
    width: 100%;
    border: 0;
    padding: 0;
    background: none;
    cursor: pointer;
    @include media.focus-ring;
    @include media.press(0.985);
  }

  .mcard__scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgb(0 0 0 / 22%) 0%, transparent 38%);
    opacity: 0;
    transition: opacity $t-base;
  }

  .mcard--selected .mcard__scrim {
    opacity: 1;
  }

  @include media.hoverable {
    .mcard:hover .mcard__scrim {
      opacity: 1;
    }
  }

  // Dokunma alanı 44×44 (medya.md §Responsive), görsel kutu 22px.
  .mcard__check {
    position: absolute;
    top: 0;
    inset-inline-start: 0;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border: 0;
    background: none;
    cursor: pointer;
    z-index: 2;
    @include media.focus-ring;
  }

  .mcard__box {
    display: grid;
    place-items: center;
    width: 1.375rem;
    height: 1.375rem;
    border: 1.5px solid rgb(255 255 255 / 85%);
    border-radius: media.$r-sm;
    background: rgb(0 0 0 / 28%);
    backdrop-filter: blur(4px);
    color: transparent;
    transition:
      background $t-fast,
      border-color $t-fast,
      color $t-fast,
      transform $d-press $ease-out;
  }

  // Seçim kutusunun dokunma tepkisi — 44×44 hedefin içindeki 22px kutu küçülür.
  .mcard__check:active .mcard__box {
    transform: scale(0.88);
  }

  .mcard--selected .mcard__box {
    background: $brand;
    border-color: $brand;
    color: $brand-ink;
  }

  .mcard__quick {
    position: absolute;
    top: 3rem;
    inset-inline-end: 0.5rem;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    opacity: 0;
    transform: translateY(-0.25rem);
    transition:
      opacity $t-fast,
      transform $t-fast;
  }

  .mcard:hover .mcard__quick,
  .mcard:focus-within .mcard__quick {
    opacity: 1;
    transform: none;
  }

  .mcard__quick-btn {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: media.$r-sm;
    background: rgb(0 0 0 / 55%);
    color: #fff;
    cursor: pointer;
    backdrop-filter: blur(4px);
    @include media.focus-ring;
    @include media.press(0.92);

    @include media.hoverable {
      &:hover:not(:disabled) {
        background: $brand;
        color: $brand-ink;
      }
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  // Dokunmatikte hover yok — hızlı işlemler hep görünür.
  @media (hover: none) {
    .mcard__quick {
      opacity: 1;
      transform: none;
    }
  }

  .mcard__star {
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border: 0;
    border-radius: media.$r-sm;
    background: rgb(0 0 0 / 55%);
    color: rgb(255 255 255 / 75%);
    cursor: pointer;
    backdrop-filter: blur(4px);
    @include media.focus-ring;
    @include media.press(0.9);

    @include media.hoverable {
      &:hover {
        color: $brand;
      }
    }

    &--on {
      background: $brand;
      color: $brand-ink;
    }
  }

  .mcard__alt-warn {
    display: inline-flex;
    align-items: center;
    gap: media.$s-1;
    margin-top: media.$s-2;
    margin-inline-end: media.$s-1;
    @include media.chip("warning");
  }

  // Dar kartta rozetler kırpılmasın: menü butonuna yer bırakıp alt satıra sar.
  .mcard__badges {
    position: absolute;
    top: media.$s-1;
    inset-inline-end: 2.375rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: media.$s-1;
    max-width: calc(100% - 3rem);
    z-index: 3;
  }

  // Ölçek media.scss §Tipografi: masaüstünde 12px, mobilde 1rem.
  .mcard__badge {
    padding: media.$s-05 media.$s-2;
    border-radius: media.$r-sm;
    background: rgb(0 0 0 / 55%);
    color: #fff;
    @include media.text("xs");
    font-weight: 700;
    letter-spacing: 0.04em;
    backdrop-filter: blur(4px);

    &--shared {
      background: $c-info;
    }

    &--processing {
      background: $c-warning;
    }

    &--failed {
      background: $c-error;
    }
  }

  .mcard__menu {
    position: absolute;
    top: 0.25rem;
    inset-inline-end: 0.25rem;
    z-index: 3;
  }

  .mcard__menu-btn {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: media.$r-sm;
    background: rgb(0 0 0 / 45%);
    color: #fff;
    cursor: pointer;
    backdrop-filter: blur(4px);
    @include media.focus-ring;
    @include media.press(0.92);
  }

  .mcard__menu-list {
    position: absolute;
    top: 2.25rem;
    inset-inline-end: 0;
    min-width: 11rem;
    margin: 0;
    padding: media.$s-1;
    list-style: none;
    box-shadow: 0 10px 30px rgb(26 26 26 / 14%);
    @include media.surface("raised");
  }

  .mcard__menu-item {
    width: 100%;
    border-radius: media.$r-sm;
    text-align: start;
    @include media.button("ghost");
    @include media.focus-ring;

    padding: 0 media.$s-2;

    @include media.hoverable {
      &:hover:not(:disabled) {
        background: $l-bg-muted;

        @include dark {
          background: $d-item-hover;
        }
      }
    }

    // Dokunmatikte menü ögesi basınca tepki vermeli — ölçek yerine arka plan,
    // liste içinde scale komşuları kaydırıyor gibi görünüyor.
    &:active:not(:disabled) {
      background: $l-bg-muted;
      transform: none;

      @include dark {
        background: $d-item-hover;
      }
    }

    &--danger {
      color: $c-error;
    }
  }

  .mcard__meta {
    padding: media.$s-3;
    @include media.divider(top);
  }

  // Kartın birincil metni — "1rem" kuralının asıl hedefi burası (mobilde 16px).
  .mcard__name {
    margin: 0 0 media.$s-05;
    @include media.text;
    font-weight: 550;
    @include media.heading;
    @include media.truncate;
  }

  // Mobilde 16px tipografiyle "1,2 MB · 1920×1080" dar karta sığmıyor, iki
  // satıra kırılıp kartın yüksekliğini zıplatıyordu — tek satırda kes.
  .mcard__sub {
    margin: 0;
    @include media.text("sm");
    @include media.muted;
    @include media.numeric;
    @include media.truncate;
  }

  // ── Pencerelenmiş ızgara: yükseklik içerikten bağımsız ──────────────
  //
  // Meta bloğu normalde satır içi akar: uyarı çipi ile kullanım çipi kimi
  // kartta yan yana sığar, kimi kartta ("5 üründe kullanılıyor") alt satıra
  // iner — kart bir satır uzar. Pencerelemede her çip KENDİ satırında durur,
  // böylece her kart aynı sayıda satır: ad + iki alt bilgi + uyarı + kullanım.
  // Sabit px yok; yükseklik yine tipografiden geliyor, sadece SAYISI sabit.
  .mcard--uniform .mcard__meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  // Metinler tam genişlikte kalmalı, yoksa `truncate` kesecek bir sınır
  // bulamaz ve uzun dosya adı kartı taşırır.
  .mcard--uniform .mcard__name,
  .mcard--uniform .mcard__sub {
    align-self: stretch;
  }

  .mcard__alt-warn--ghost {
    visibility: hidden;
  }

  .mcard__usage {
    margin-top: media.$s-2;

    &--used {
      @include media.chip("success");
    }

    &--unused {
      @include media.chip("warning");
    }
  }
</style>
