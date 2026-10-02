<script setup>
  import { useI18n } from "vue-i18n";

  import { objectPosition } from "@/lib/media/crop/geometry.js";
  import { formatPercent } from "@/lib/media/preview/places.js";
  import messages from "@/lib/media/preview/messages.js";

  /**
   * Yer listesi (masaüstü sol sütun) ya da yatay çipler (telefon). Rozet = yazı + simge (1.4.1).
   * Rozet metni `<bdi>` içinde: Arapça `Intl` yüzdeleri yön işaretleri (U+061C) taşır,
   * çevredeki "16:9 · 1200 × 400" gibi LTR metne sızmasınlar.
   */
  defineProps({
    items: { type: Array, required: true },
    currentIndex: { type: Number, default: 0 },
    src: { type: String, required: true },
    focal: { type: Object, required: true },
    variant: { type: String, default: "list" },
  });
  const emit = defineEmits(["select"]);
  const { t, locale } = useI18n({ messages });

  const size = (p) => (p.cssW && p.cssH ? `${p.cssW} × ${p.cssH}` : "");
  const chip = (v) =>
    v.full
      ? t("imagePlacement.chip.full")
      : t("imagePlacement.chip.partial", { pct: formatPercent(v.fraction, locale.value) });
  const imgStyle = (p, focal) => ({
    objectFit: p.fit,
    objectPosition: p.fit === "cover" ? objectPosition(focal) : "50% 50%",
  });
</script>

<template>
  <ul v-if="variant === 'list'" class="pl" role="list">
    <li v-for="(it, i) in items" :key="it.id">
      <button
        type="button"
        class="pl__row"
        :class="{ 'pl__row--on': i === currentIndex }"
        :aria-current="i === currentIndex ? 'true' : undefined"
        @click="emit('select', i)"
      >
        <span class="pl__thumb" :style="{ aspectRatio: String(it.place.ratio) }">
          <img class="pl__img ctx-img" :src="src" alt="" :style="imgStyle(it.place, focal)" />
        </span>
        <span class="pl__text">
          <span class="pl__label">{{ it.label }}</span>
          <span class="pl__meta">
            {{ it.place.ratioLabel
            }}<template v-if="size(it.place)"> · {{ size(it.place) }}</template>
          </span>
          <span
            v-if="!it.visibility.unknown"
            class="pl__chip"
            :class="it.visibility.full ? 'pl__chip--full' : 'pl__chip--cut'"
          >
            <svg
              v-if="it.visibility.full"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <svg
              v-else
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" />
            </svg>
            <bdi>{{ chip(it.visibility) }}</bdi>
          </span>
        </span>
      </button>
    </li>
  </ul>
  <ul v-else class="pl pl--chips" role="list">
    <li v-for="(it, i) in items" :key="it.id">
      <button
        type="button"
        class="pl__chipbtn"
        :class="{ 'pl__row--on': i === currentIndex }"
        :aria-current="i === currentIndex ? 'true' : undefined"
        @click="emit('select', i)"
      >
        <span class="pl__label">{{ it.label }}</span>
        <span
          v-if="!it.visibility.unknown"
          class="pl__chip"
          :class="it.visibility.full ? 'pl__chip--full' : 'pl__chip--cut'"
          ><bdi>{{ chip(it.visibility) }}</bdi></span
        >
      </button>
    </li>
  </ul>
</template>

<style scoped>
  .pl {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pl--chips {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .pl__row,
  .pl__chipbtn {
    width: 100%;
    min-height: 44px;
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px;
    border-radius: 12px;
    border: 2px solid transparent;
    background: transparent;
    font: inherit;
    color: #1d1c19;
    text-align: start;
    cursor: pointer;
    transition: opacity 160ms ease;
  }
  .pl__chipbtn {
    width: auto;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    white-space: nowrap;
    border-color: #e6e3dc;
  }
  .pl__row--on {
    background: #ffffff;
    border-color: #1a1a1a;
  }
  .pl__thumb {
    width: 64px;
    max-height: 64px;
    flex-shrink: 0;
    border-radius: 6px;
    overflow: hidden;
    background: #e6e3dc;
  }
  .pl__img {
    width: 100%;
    height: 100%;
    display: block;
  }
  .pl__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .pl__label {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
  }
  .pl__meta {
    font-size: 13px;
    color: #3a3833;
  }
  .pl__chip {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 2px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    unicode-bidi: isolate;
  }
  .pl__chip--full {
    background: #e7f6ef;
    color: #035c43;
  }
  .pl__chip--cut {
    background: #fff7ed;
    color: #7c2d12;
  }
  .pl__row:focus-visible,
  .pl__chipbtn:focus-visible {
    outline: 3px solid #1a1a1a;
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .pl__row,
    .pl__chipbtn {
      transition: none;
    }
  }
</style>
