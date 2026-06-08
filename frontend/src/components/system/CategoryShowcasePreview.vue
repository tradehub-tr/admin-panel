<template>
  <div v-if="!tiles.length" class="preview-empty">
    <em>{{ t("showcase.preview.empty") }}</em>
  </div>
  <draggable
    v-else
    v-model="localTiles"
    item-key="name"
    tag="div"
    class="preview-grid"
    :class="{ 'is-resizing': !!drag }"
    :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
    :animation="150"
    :force-fallback="true"
    :fallback-on-body="true"
    ghost-class="tile-ghost"
    chosen-class="tile-chosen"
    filter=".resize-handle,.span-inputs"
    :prevent-on-filter="false"
    @end="onDragEnd"
  >
    <template #item="{ element: tile }">
      <div class="preview-tile" :style="tileStyle(tile)">
        <template v-if="tile.tile_type === 'promo'">
          <span v-if="tile.promo_badge_tr" class="badge">{{ tile.promo_badge_tr }}</span>
          <span v-if="tile.promo_title_tr" class="promo-title">{{ tile.promo_title_tr }}</span>
          <span v-if="tile.cta_text_tr" class="cta">{{ tile.cta_text_tr }} →</span>
        </template>
        <template v-else>
          <span v-if="tile.label_tr" class="badge light">{{ tile.label_tr }}</span>
        </template>

        <div class="span-inputs" @pointerdown.stop>
          <label :title="t('showcase.width')">
            {{ t("showcase.widthShort") }}
            <input
              type="number"
              min="1"
              :max="columns"
              :value="displayCol(tile)"
              @change="setSpan(tile, Number($event.target.value), displayRow(tile))"
            />
          </label>
          <label :title="t('showcase.height')">
            {{ t("showcase.heightShort") }}
            <input
              type="number"
              min="1"
              :max="MAX_ROW"
              :value="displayRow(tile)"
              @change="setSpan(tile, displayCol(tile), Number($event.target.value))"
            />
          </label>
        </div>

        <span v-if="drag && drag.name === tile.name" class="drag-readout">{{ dimText(tile) }}</span>
        <span v-else class="size-chip">{{ dimText(tile) }}</span>

        <span
          class="resize-handle"
          :title="t('showcase.preview.resize')"
          @pointerdown="startResize($event, tile)"
        ></span>
      </div>
    </template>
  </draggable>
</template>

<script setup>
  import { ref, watch, onBeforeUnmount } from "vue";
  import { useI18n } from "vue-i18n";
  import draggable from "vuedraggable";

  const { t } = useI18n();
  const props = defineProps({
    tiles: { type: Array, default: () => [] },
    columns: { type: Number, default: 4 },
  });
  const emit = defineEmits(["resize", "reorder"]);

  // .preview-grid gap + grid-auto-rows ile aynı tutulmalı (snap hesabı için).
  const GAP = 8;
  const ROW = 90;
  // Storefront grid ölçüleri (CategoryShowcase.ts: gap-4 + lg:auto-rows-[210px]) — okuma için.
  const STOREFRONT_ROW = 210;
  const STOREFRONT_GAP = 16;
  const MAX_ROW = 6;

  // vuedraggable kendi modelini mutate eder; prop'u doğrudan bağlama, lokal kopya tut.
  const localTiles = ref([...props.tiles]);
  watch(
    () => props.tiles,
    (v) => {
      localTiles.value = [...v];
    }
  );

  const drag = ref(null);

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, Math.round(n) || lo));
  }

  // Sürüklenen kutuda canlı span'i, diğerlerinde kayıtlı span'i göster.
  function displayCol(tile) {
    return drag.value && drag.value.name === tile.name ? drag.value.col : tile.col_span || 1;
  }
  function displayRow(tile) {
    return drag.value && drag.value.name === tile.name ? drag.value.row : tile.row_span || 1;
  }

  function dimText(tile) {
    const col = displayCol(tile);
    const row = displayRow(tile);
    const h = row * STOREFRONT_ROW + (row - 1) * STOREFRONT_GAP;
    return `${col}×${row} · ↕${h}px`;
  }

  function tileStyle(tile) {
    const base = {
      gridColumn: `span ${displayCol(tile)}`,
      gridRow: `span ${displayRow(tile)}`,
    };
    if (tile.tile_type === "promo") {
      return { ...base, background: tile.background_color || "#cc9900", color: "#fff" };
    }
    if (tile.image) {
      return {
        ...base,
        backgroundImage: `url('${tile.image}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return { ...base, background: "#e5e7eb" };
  }

  // Input veya sürükle sonucu yeni span'i (clamp'lenmiş) parent'a bildir.
  function setSpan(tile, col, row) {
    const c = clamp(col, 1, props.columns);
    const r = clamp(row, 1, MAX_ROW);
    if (c !== (tile.col_span || 1) || r !== (tile.row_span || 1)) {
      emit("resize", { name: tile.name, col_span: c, row_span: r });
    }
  }

  function startResize(e, tile) {
    e.preventDefault();
    const gridEl = e.target.closest(".preview-grid");
    const gridW = gridEl?.getBoundingClientRect().width ?? 0;
    const cellW = (gridW - GAP * (props.columns - 1)) / props.columns;
    drag.value = {
      name: tile.name,
      baseCol: tile.col_span || 1,
      baseRow: tile.row_span || 1,
      col: tile.col_span || 1,
      row: tile.row_span || 1,
      startX: e.clientX,
      startY: e.clientY,
      cellW: cellW > 0 ? cellW : 120,
      cellH: ROW + GAP,
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onMove(e) {
    const d = drag.value;
    if (!d) return;
    d.col = clamp(d.baseCol + (e.clientX - d.startX) / d.cellW, 1, props.columns);
    d.row = clamp(d.baseRow + (e.clientY - d.startY) / d.cellH, 1, MAX_ROW);
  }

  function onUp() {
    const d = drag.value;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    drag.value = null;
    if (!d) return;
    setSpan({ name: d.name, col_span: d.baseCol, row_span: d.baseRow }, d.col, d.row);
  }

  // Sürükle-bırak ile sıralama değişti → yeni sıra (isim listesi) parent'a.
  function onDragEnd() {
    emit(
      "reorder",
      localTiles.value.map((tile) => tile.name)
    );
  }

  onBeforeUnmount(() => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  });
</script>

<style lang="scss" scoped>
  @use "@/assets/scss/variables" as *;

  .preview-empty {
    padding: 24px;
    text-align: center;
    font-size: 13px;
    color: $l-text-400;
    border: 1px dashed $l-border;
    border-radius: 12px;
    @include dark {
      color: $d-text-faint;
      border-color: $d-border;
    }
  }

  .preview-grid {
    display: grid;
    grid-auto-rows: 90px;
    grid-auto-flow: row dense;
    gap: 8px;

    &.is-resizing {
      user-select: none;
      cursor: nwse-resize;
    }
  }

  .preview-tile {
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    padding: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 0;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .tile-ghost {
    opacity: 0.4;
    outline: 2px dashed $brand;
  }

  .tile-chosen {
    opacity: 0.9;
  }

  .span-inputs {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 3;
    display: flex;
    gap: 4px;
    cursor: default;

    label {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 9px;
      font-weight: 700;
      color: #fff;
      background: rgba(#000, 0.55);
      border-radius: 4px;
      padding: 1px 3px;
    }

    input {
      width: 26px;
      padding: 1px 2px;
      font-size: 10px;
      font-family: inherit;
      text-align: center;
      border: 1px solid rgba(#fff, 0.4);
      border-radius: 3px;
      background: rgba(#fff, 0.95);
      color: #1f2937;
    }
  }

  .resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 18px;
    height: 18px;
    z-index: 3;
    cursor: nwse-resize;
    touch-action: none;
    background: linear-gradient(
      135deg,
      transparent 45%,
      rgba(#000, 0.45) 45%,
      rgba(#000, 0.45) 100%
    );
    border-bottom-right-radius: 6px;

    &::after {
      content: "";
      position: absolute;
      right: 3px;
      bottom: 3px;
      width: 7px;
      height: 7px;
      border-right: 2px solid rgba(#fff, 0.9);
      border-bottom: 2px solid rgba(#fff, 0.9);
    }
  }

  .size-chip {
    position: absolute;
    left: 6px;
    bottom: 6px;
    z-index: 2;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(#000, 0.55);
    color: #fff;
    pointer-events: none;
  }

  .drag-readout {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 4;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(#000, 0.8);
    color: #fff;
    white-space: nowrap;
    pointer-events: none;
  }

  .badge {
    align-self: flex-start;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 6px;
    border-radius: 3px;
    background: rgba(#fff, 0.9);
    color: #333;
    &.light {
      background: rgba(#fff, 0.9);
    }
  }

  .promo-title {
    font-size: 16px;
    font-weight: 800;
    line-height: 1.1;
  }

  .cta {
    font-size: 10px;
    font-weight: 500;
    opacity: 0.9;
  }
</style>
