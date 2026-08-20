<script setup>
  import { computed, nextTick, ref, useTemplateRef, watch } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useVirtualGrid } from "@/composables/useVirtualGrid";
  import { isGridNavKey, nextGridIndex } from "@/utils/gridNavigation";

  /**
   * Sanal klasör ızgarası — gezginlerin klasör seviyesi.
   *
   * Kalem başına gösterilecek her şeyi (ad, ikon, sayaç metni) çağıran ekran
   * hazırlar: kapsam adları ve "n dosya" çevirisi ekranın kendi i18n
   * alanından gelir, ızgara sözlük bilmez. Erişilebilirlik etiketleri de
   * aynı sebeple prop.
   *
   * İki şey burada, ızgaranın kendisinde çözülür:
   *
   * 1. **Pencereleme.** Klasör seviyesi SAYFALANMIYOR — `browse.py`
   *    `seller_listings()` bir kategorideki bütün ürün klasörlerini tek
   *    yanıtta verir. Eşiği aşan listelerde yalnız görünen satırlar basılır
   *    (`useVirtualGrid`), görünmeyenlerin yeri boşlukla korunur.
   * 2. **Roving tabindex.** Izgara tek Tab durağıdır, kalemler arası geçiş ok
   *    tuşlarıyla olur (WAI-ARIA grid deseni). 300 kartın 300 Tab durağı
   *    olması sayfayı klavyeyle kullanılamaz yapardı.
   */
  const props = defineProps({
    /** `[{ id, label, icon, countText }]` */
    items: { type: Array, required: true },
    emptyText: { type: String, default: "" },
    /** Izgaranın erişilebilir adı — ekran okuyucu listeyi bununla duyurur. */
    ariaLabel: { type: String, default: "" },
    /** Bu sayının üstünde pencereleme devreye girer. */
    virtualThreshold: { type: Number, default: 60 },
  });

  const emit = defineEmits(["select"]);

  const gridEl = useTemplateRef("gridEl");

  /**
   * Pencereleme yalnız uzun listelerde: kısa listede sabit kart yüksekliği
   * gereksiz bir kısıt (uzun klasör adı iki satıra sığmayabilir), uzun
   * listede ise matematiğin şartı.
   */
  const windowed = computed(() => props.items.length > props.virtualThreshold);

  const vg = useVirtualGrid(gridEl, {
    total: () => props.items.length,
    enabled: () => windowed.value,
  });

  const visible = computed(() =>
    vg.active.value ? props.items.slice(vg.start.value, vg.end.value) : props.items
  );
  const offset = computed(() => (vg.active.value ? vg.start.value : 0));

  const padStyle = computed(() =>
    vg.active.value
      ? { paddingTop: `${vg.padTop.value}px`, paddingBottom: `${vg.padBottom.value}px` }
      : null
  );

  // ── Klavye imleci ────────────────────────────────────────────────
  /** Tek Tab durağının hangi kalemde olduğu. */
  const cursor = ref(0);

  // Klasör değişince imleç başa döner; aksi hâlde yeni seviyede var olmayan
  // bir indekse odaklanmaya çalışırdı.
  watch(
    () => props.items,
    () => (cursor.value = 0)
  );

  async function focusAt(index) {
    cursor.value = index;
    // Hedef pencere dışındaysa önce basılmasını sağla — yoksa odak DOM'dan
    // düşer ve tarayıcı odağı `body`'ye atar.
    vg.pin(index);
    await nextTick();
    gridEl.value?.querySelector(`[data-cell="${index}"]`)?.focus();
  }

  function onKeydown(event) {
    if (!isGridNavKey(event.key)) return;
    const next = nextGridIndex(event.key, cursor.value, props.items.length, vg.columns.value);
    if (next < 0) return;
    event.preventDefault();
    focusAt(next);
  }

  /** Fare ya da Tab ile gelen odak imleci de taşısın. */
  function onFocusin(event) {
    const index = Number(event.target?.dataset?.cell);
    if (Number.isInteger(index)) cursor.value = index;
  }
</script>

<template>
  <div class="mfgrid__wrap">
    <ul
      ref="gridEl"
      class="mfgrid"
      :class="{ 'mfgrid--windowed': windowed }"
      role="list"
      :style="padStyle"
      :aria-label="ariaLabel || undefined"
      @keydown="onKeydown"
      @focusin="onFocusin"
    >
      <li
        v-for="(item, i) in visible"
        :key="item.id"
        class="mfgrid__cell"
        :aria-setsize="items.length"
        :aria-posinset="offset + i + 1"
      >
        <button
          type="button"
          class="card mfgrid__folder"
          :data-cell="offset + i"
          :tabindex="offset + i === cursor ? 0 : -1"
          @click="emit('select', item)"
        >
          <span class="mfgrid__icon"><AppIcon :name="item.icon || 'folder'" :size="22" /></span>
          <span class="mfgrid__name">{{ item.label }}</span>
          <span class="mfgrid__count">{{ item.countText }}</span>
        </button>
      </li>
    </ul>
    <p v-if="!items.length" class="card mfgrid__empty">{{ emptyText }}</p>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  // Pencerelemenin şartı sabit satır yüksekliği: değişken yükseklikte
  // görünmeyen satırların yerine konan boşluk gerçeğinden sapar ve kaydırma
  // çubuğu her pencerede zıplar. Değer tek yerde — matematik onu DOM'dan
  // ölçüyor, burada değiştirmek yeterli.
  $folder-row: 108px;

  .mfgrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: media.$s-3;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .mfgrid__cell {
    display: flex;
    min-width: 0;
  }

  .mfgrid__folder {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    gap: media.$s-1;
    padding: media.$s-4;
    text-align: left;
    cursor: pointer;
    @include media.hoverable;
    @include media.press;
    @include media.focus-ring;
  }

  .mfgrid--windowed .mfgrid__folder {
    height: $folder-row;
  }

  .mfgrid__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    color: $brand;
    background: rgba(217, 165, 20, 0.1);
    flex-shrink: 0;
  }

  .mfgrid__name {
    font-weight: 600;
    @include media.text("sm");
    word-break: break-word;
  }

  // Pencerelemede ad kartı uzatamaz — iki satırda kesilir, tamamı `title`
  // yerine kartın kendi metninde kalır (ekran okuyucu tam metni okur).
  .mfgrid--windowed .mfgrid__name {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .mfgrid__count {
    @include media.text("xs");
    @include media.muted(1);
    margin-top: auto;
  }

  .mfgrid__empty {
    padding: media.$s-6 media.$s-3;
    text-align: center;
    @include media.text("sm");
    @include media.muted(1);
  }
</style>
