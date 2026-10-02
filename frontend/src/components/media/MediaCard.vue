<template>
  <article
    class="mcard"
    :class="{
      'mcard--selected': selected,
      'mcard--active': active,
      'mcard--focused': focused,
      'mcard--uniform': uniform,
    }"
  >
    <button
      type="button"
      class="mcard__open"
      data-media-grid-key-target
      :aria-label="item.title || item.fileName"
      @click="emit('open')"
    >
      <MediaThumb :item="item" region="libraryGrid" :density="density" :detail-open="detailOpen">
        <span class="mcard__scrim" />
      </MediaThumb>
    </button>

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
      <span v-if="item.owner === 'shared'" class="mcard__badge mcard__badge--shared">
        {{ t("media.shared") }}
      </span>

      <MediaStatusBadge
        v-if="
          ['blocked', 'scanFailed', 'processingFailed', 'scanning', 'processing'].includes(
            mediaPhase(item, item.kind)
          )
        "
        :phase="mediaPhase(item, item.kind)"
        class="mcard__status"
      />
    </div>

    <div class="mcard__menu">
      <button
        ref="menuBtnEl"
        type="button"
        class="mcard__menu-btn"
        aria-haspopup="menu"
        :aria-label="t('media.card.actionsAria')"
        :aria-expanded="menuOpen"
        :aria-controls="menuOpen ? menuId : undefined"
        @click.stop="menuOpen = !menuOpen"
      >
        <AppIcon name="more-vertical" :size="16" />
      </button>
      <!-- Liste body'ye Teleport edilir: kart `overflow: hidden` (köşe
           yuvarlama + hover kalkması) ve pencerelenmiş ızgara kapsayıcısı
           listeyi kırpıyordu — son ögeler (Arşivle, Sil) görünmüyordu. Konum
           düğmeden hesaplanıp position:fixed ile verilir (menuPlacement.js). -->
      <Teleport to="body">
        <ul
          v-if="menuOpen"
          :id="menuId"
          ref="menuListEl"
          class="mcard__menu-list"
          role="menu"
          :style="menuStyle"
          @click.stop
          @keydown="onMenuKeydown"
        >
          <li
            v-for="action in actions"
            :key="action.id"
            role="none"
            :class="{ 'mcard__menu-row--danger': action.danger }"
            :title="action.hint"
          >
            <button
              type="button"
              role="menuitem"
              class="mcard__menu-item"
              :class="{ 'mcard__menu-item--danger': action.danger }"
              :data-action="action.id"
              :disabled="action.disabled"
              :aria-description="action.hint"
              @click="run(action.id)"
            >
              <AppIcon :name="action.icon" :size="14" />
              {{ action.label }}
            </button>
          </li>
        </ul>
      </Teleport>
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
  import { computed, nextTick, onUnmounted, ref, useId, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import MediaStatusBadge from "./MediaStatusBadge.vue";
  import { mediaPhase } from "@/lib/media/status.js";
  import MediaThumb from "@/components/media/MediaThumb.vue";
  import { CARD_ACTIONS } from "@/components/media/mediaActions";
  import { placeMenu } from "@/components/media/menuPlacement";
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

  // Tarama rozeti ikonları — şablonda üçlü koşul zinciri yerine harita.

  /** Görselde alt metin yoksa SEO/erişilebilirlik uyarısı göster. */
  const missingAlt = computed(() => props.item.kind === "image" && !props.item.alt.trim());

  const actions = computed(() =>
    CARD_ACTIONS.filter(
      // `visibleWhen` tanımlı işlemler duruma bağlı (ör. yalnız başarısız
      // videoda "yeniden dene"); tanımsızsa işlem her medyada görünür.
      (action) => !action.visibleWhen || action.visibleWhen(props.item)
    ).map((action) => ({
      id: action.id,
      icon: action.icon(props.item),
      label: t(action.labelKey(props.item)),
      hint: action.hintKey?.(props.item) ? t(action.hintKey(props.item)) : undefined,
      danger: action.danger === true,
      disabled:
        (action.needsEdit === true && !props.editable) ||
        // Ürününde kullanılan dosyada silme kapalı — sebebi ipucunda yazıyor.
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

  // ── Teleport'lu menü: konum, dışarı tıklama, klavye ─────────────────
  const menuId = useId();
  const menuBtnEl = ref(null);
  const menuListEl = ref(null);
  const menuStyle = ref({});

  function positionMenu() {
    const btn = menuBtnEl.value;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    // Pencerelenmiş ızgara kaydırılıp düğme ekrandan çıktıysa menü viewport
    // kenarına yapışık kalmasın — kapat.
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      menuOpen.value = false;
      return;
    }
    const list = menuListEl.value;
    const { top, left, maxHeight } = placeMenu(
      rect,
      { width: list?.offsetWidth || 0, height: list?.scrollHeight || 0 },
      { width: window.innerWidth, height: window.innerHeight },
      { rtl: getComputedStyle(btn).direction === "rtl" }
    );
    menuStyle.value = { top: `${top}px`, left: `${left}px`, maxHeight: `${maxHeight}px` };
  }

  // Liste artık `.mcard__menu` altında değil (body'de) — "içeride" kontrolü
  // iki kökü de saymalı.
  function isInsideMenu(target) {
    return Boolean(
      target?.closest?.(".mcard__menu") === menuBtnEl.value?.parentElement ||
      menuListEl.value?.contains(target)
    );
  }

  function closeMenu(event) {
    if (!isInsideMenu(event.target)) menuOpen.value = false;
  }

  function onDocKeydown(event) {
    if (event.key !== "Escape") return;
    menuOpen.value = false;
    menuBtnEl.value?.focus();
  }

  function enabledItems() {
    return [...(menuListEl.value?.querySelectorAll('[role="menuitem"]:not(:disabled)') || [])];
  }

  // Menü düğmesi deseni (ARIA APG): oklar ögeler arasında gezer, Tab menüyü
  // kapatıp odağı düğmeye iade eder — Teleport yüzünden listenin DOM'daki
  // yeri body'nin sonu; iade edilmezse Tab sayfanın sonuna atlardı.
  function onMenuKeydown(event) {
    const items = enabledItems();
    const index = items.indexOf(document.activeElement);
    const moves = {
      ArrowDown: (index + 1) % items.length,
      ArrowUp: (index - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    };
    if (event.key in moves && items.length) {
      event.preventDefault();
      items[moves[event.key]].focus();
    } else if (event.key === "Tab") {
      menuOpen.value = false;
      menuBtnEl.value?.focus();
    }
  }

  function unbindMenuListeners() {
    // capture=true: başka kartın menü düğmesi `@click.stop` kullanıyor; kabarcık
    // evresinde dinlenirse o tıklama buraya hiç ulaşmaz ve iki menü aynı anda
    // açık kalırdı.
    document.removeEventListener("click", closeMenu, true);
    document.removeEventListener("keydown", onDocKeydown);
    document.removeEventListener("scroll", positionMenu, true);
    window.removeEventListener("resize", positionMenu);
  }

  watch(menuOpen, async (open) => {
    if (!open) {
      unbindMenuListeners();
      return;
    }
    // İlk kaba konum (liste ölçülmeden), sonra ölçüp yukarı açılma/sınırlama.
    positionMenu();
    await nextTick();
    // Beklerken kapatıldıysa (ör. hızlı çift tık) dinleyici bağlanmasın.
    if (!menuOpen.value) return;
    positionMenu();
    enabledItems()[0]?.focus({ preventScroll: true });
    document.addEventListener("click", closeMenu, true);
    document.addEventListener("keydown", onDocKeydown);
    // capture=true: ızgaranın kendi kaydırma kapsayıcısını da yakala.
    document.addEventListener("scroll", positionMenu, true);
    window.addEventListener("resize", positionMenu);
  });
  onUnmounted(unbindMenuListeners);
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

    // Video işleme rozetleri (TUR-296) — kart rozetleri koyu zemin üstünde,
    // renk zeminden gelir.
    &--v-processing,
    &--v-failed {
      display: inline-flex;
      align-items: center;
      gap: media.$s-05;
    }

    &--v-failed {
      background: $c-error;
    }

    // Tarama rozetleri (TUR-125) — video rozetleriyle aynı düzen.
    &--s-infected,
    &--s-failed {
      display: inline-flex;
      align-items: center;
      gap: media.$s-05;
    }

    // Zararlı bulgusu hata renginde: kullanıcının kartta gözü ilk buraya
    // takılmalı. "Taranamadı" uyarı renginde — bir şey bulunmadı, yalnız
    // bakılamadı; ikisini aynı kırmızıya boyamak gerçek bulguyu sıradanlaştırır.
    &--s-infected {
      background: $c-error;
    }

    &--s-failed {
      background: $c-warning;
      color: #1f2937;
    }

    &--s-pending {
      display: inline-flex;
      align-items: center;
      gap: media.$s-05;
      background: rgb(0 0 0 / 70%);
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

  // Body'ye Teleport edilir (scoped özniteliği korunur, bu kurallar geçerli).
  // top/left/max-height inline :style ile menuPlacement.js'ten gelir.
  // z-index AppSelect'in teleport'lu paneliyle aynı: modal/başlığın üstü.
  .mcard__menu-list {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    overflow-y: auto;
    overscroll-behavior: contain;
    // Genişlik içerikten: en uzun etiket ("Üründe kullanıldığı için
    // silinemez") kadar, ama viewport'u aşmadan.
    width: max-content;
    min-width: 10rem;
    max-width: calc(100vw - #{media.$s-4});
    margin: 0;
    padding: media.$s-1;
    list-style: none;
    // macOS bağlam menüsü gibi sade: ince kenarlık, yumuşak gölge.
    // Zemin PopMenu ile aynı çift ($l-bg / $d-bg-card): koyu temada
    // `$d-bg-elevated` ile `$d-item-hover` aynı renk, hover görünmezdi.
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: media.$r-md + media.$s-05;
    box-shadow: 0 4px 16px rgb(0 0 0 / 10%);

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      box-shadow: 0 6px 20px rgb(0 0 0 / 45%);
    }
  }

  // Tehlikeli işlem (Sil) diğerlerinden ince bir çizgiyle ayrılır.
  .mcard__menu-row--danger:not(:first-child) {
    margin-top: media.$s-1;
    padding-top: media.$s-1;
    @include media.divider(top);
  }

  // Kompakt öge (~30px): `media.button` mixin'i BİLİNÇLİ kullanılmıyor —
  // 44px dokunma hedefi ve kalın yazı menüyü iri gösteriyordu. Dokunmatikte
  // 44px hedef aşağıdaki (pointer: coarse) bloğunda geri geliyor.
  .mcard__menu-item {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    width: 100%;
    min-height: media.$s-6 - media.$s-05;
    padding: 0 (media.$s-2 + media.$s-05);
    border: 0;
    border-radius: media.$r-sm;
    background: none;
    color: $l-text-700;
    @include media.text("sm");
    font-weight: 450;
    line-height: 1.25;
    text-align: start;
    white-space: nowrap;
    cursor: pointer;
    transition: background $t-fast;
    @include media.focus-ring;

    @include dark {
      color: $d-text;
    }

    @include media.hoverable {
      &:hover:not(:disabled) {
        background: $l-bg-muted;

        @include dark {
          background: $d-item-hover;
        }
      }
    }

    // Dokunmatikte basınca tepki — ölçek yerine arka plan (liste içinde
    // scale komşuları kaydırıyor gibi görünüyor).
    &:active:not(:disabled) {
      background: $l-bg-muted;

      @include dark {
        background: $d-item-hover;
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    // Koyu temadaki `html.dark .mcard__menu-item` rengi daha özgül — kırmızı
    // orada da ezilmesin diye tekrar veriliyor.
    &--danger {
      color: $c-error;

      @include dark {
        color: $c-error;
      }
    }

    // İkon (14px) dar menüde sıkışıp küçülmesin.
    // overflow: kalkan kapak/katman viewBox dışına taşınca kesilmesin.
    :deep(svg) {
      flex-shrink: 0;
      overflow: visible;
      transition: transform $t-fast;
    }

    // Hover'da ikonun PARÇALARI oynar (lucide-animated deseni): göz kırpar,
    // indirme oku iner, çöp kapağı kalkar, katmanlar ayrışır. Kapalı şekiller
    // hafifçe dolar. Menü günde onlarca kez açılıyor — hareket 1–2 birim,
    // yalnız transform; klavyeyle gezinmede ve dokunmatikte oynamaz.
    // Azaltılmış harekette yalnız dolgu kalır. Parça sırası lucide SVG'sinin
    // çocuk sırası (lucide-vue-next); ikon değişirse seçici de değişmeli.
    @include media.hoverable {
      :deep(svg > *) {
        transform-box: fill-box;
        transform-origin: center;
        fill: currentColor;
        fill-opacity: 0;
        transition:
          transform $t-fast,
          fill-opacity $d-fast ease;
      }

      &:hover:not(:disabled) {
        // Dolan gövde parçaları (açık çizgiler dolguya girmez).
        &[data-action="preview"] :deep(svg > path),
        &[data-action="edit"] :deep(svg > path:first-child),
        &[data-action="use"] :deep(svg > path:first-child),
        &[data-action="copyLink"] :deep(svg > rect),
        &[data-action="duplicate"] :deep(svg > path:first-child),
        &[data-action="archive"] :deep(svg > rect),
        &[data-action="delete"] :deep(svg > path:nth-child(3)) {
          fill-opacity: 0.14;
        }
      }
    }

    @include media.hoverable {
      @media (prefers-reduced-motion: no-preference) {
        &:hover:not(:disabled) {
          &[data-action="preview"] :deep(svg > *) {
            animation: mcard-blink 320ms $ease-in-out;
          }

          &[data-action="edit"] :deep(svg) {
            transform: rotate(-12deg);
          }

          &[data-action="use"] :deep(svg) {
            transform: translateY(-1.5px);
          }

          // Ok (sap + uç) iner, tepsi yerinde.
          &[data-action="download"] {
            :deep(svg > path:first-child),
            :deep(svg > path:last-child) {
              transform: translateY(2px);
            }
          }

          // Öndeki kâğıt öne, arkadaki geriye: kopya ayrışır.
          &[data-action="copyLink"] {
            :deep(svg > rect) {
              transform: translate(1.5px, 1.5px);
            }

            :deep(svg > path) {
              transform: translate(-1.5px, -1.5px);
            }
          }

          // Üst katman kalkıp yığına geri oturur, orta katman peşinden
          // (tek sefer) — kopyanın yığına eklenmesi.
          &[data-action="duplicate"] {
            :deep(svg > path:first-child) {
              animation: mcard-stack 420ms $ease-in-out;
            }

            :deep(svg > path:nth-child(2)) {
              animation: mcard-stack-mid 420ms $ease-in-out 40ms both;
            }
          }

          // Kapak sol menteşeden açılıp geri kapanır (tek sefer).
          &[data-action="archive"] :deep(svg > rect) {
            transform-origin: left bottom;
            animation: mcard-lid 480ms $ease-in-out;
          }

          // Kapak (üst çizgi + sap) sol köşeden kalkar.
          &[data-action="delete"] {
            :deep(svg > path:nth-child(4)),
            :deep(svg > path:nth-child(5)) {
              transform: translateY(-1.5px) rotate(-12deg);
            }

            :deep(svg > path:nth-child(4)) {
              transform-origin: left bottom;
            }
          }

          &[data-action="retryVideo"] :deep(svg) {
            transform: rotate(90deg);
          }
        }
      }
    }

    @media (pointer: coarse) {
      @include media.tap-target;
    }
  }

  .mcard__status {
    font-size: 11px;
    max-width: 100%;
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

  @keyframes mcard-stack {
    45% {
      transform: translateY(-3.5px);
    }
    100% {
      transform: none;
    }
  }

  @keyframes mcard-stack-mid {
    45% {
      transform: translateY(-1.5px);
    }
    100% {
      transform: none;
    }
  }

  @keyframes mcard-lid {
    40% {
      transform: translateY(-2px) rotate(-16deg);
    }
    100% {
      transform: none;
    }
  }

  @keyframes mcard-blink {
    50% {
      transform: scaleY(0.15);
    }
  }
</style>
