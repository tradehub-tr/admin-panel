<script setup>
  /**
   * Sayaçlar — olay listesinden türer (`catalog.js` → `stats`). Basınca liste
   * süzülür; etkin sayaç `aria-pressed` ile duyurulur.
   */
  import { computed } from "vue";

  const props = defineProps({
    stats: { type: Object, required: true },
    filters: { type: Object, required: true },
    /** Dar alanda yalnız dört sayaç gösterilir. */
    compact: { type: Boolean, default: false },
  });
  const emit = defineEmits(["toggle"]);

  const nf = new Intl.NumberFormat("tr-TR");

  const items = computed(() => {
    const s = props.stats;
    const f = props.filters;
    const none = !Object.values(f).some((v) => String(v || "").trim());
    const all = [
      { id: "total", label: "Olay", value: s.total, foot: "tüm modüller", on: none, core: true },
      {
        id: "email",
        label: "E-posta giden",
        value: s.email,
        foot: "istisna, maliyetli",
        on: f.channel === "email",
      },
      {
        id: "push",
        label: "Push giden",
        value: s.push,
        foot: "cihaz izni gerekir",
        on: f.channel === "push",
      },
      {
        id: "sms",
        label: "SMS giden",
        value: s.sms,
        foot: "yalnız işlem SMS'i",
        on: f.channel === "sms",
      },
      {
        id: "published",
        label: "Yayında",
        value: s.published,
        tone: "ok",
        foot: `${s.pendingDraft} tanesinde yeni taslak`,
        on: f.publish === "yayinda",
        core: true,
      },
      {
        id: "draft",
        label: "Taslak",
        value: s.draft,
        tone: "warn",
        foot: "henüz yayınlanmadı",
        on: f.publish === "taslak",
        core: true,
      },
      {
        id: "missing",
        label: "Eksik çeviri",
        value: s.missingLang,
        tone: "err",
        foot: "en az bir dil hazır değil",
        on: f.translation === "var",
        core: true,
      },
    ];
    return (props.compact ? all.filter((i) => i.core) : all).map((i) => ({
      ...i,
      text: nf.format(i.value),
    }));
  });
</script>

<template>
  <div
    class="nt-stats"
    :class="{ 'nt-stats--compact': compact }"
    role="group"
    aria-label="Sayaçlar"
  >
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="nt-stat"
      :class="item.tone ? `nt-stat--${item.tone}` : ''"
      :aria-pressed="item.on"
      @click="emit('toggle', item.id, item.on)"
    >
      <strong class="nt-stat__value nt-num">{{ item.text }}</strong>
      <span class="nt-stat__label">{{ item.label }}</span>
      <span v-if="!compact" class="nt-stat__foot">{{ item.foot }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .nt-stats {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    border: 1px solid var(--nt-line);
    border-radius: 12px;
    background: var(--nt-bg);
    overflow: hidden;
  }

  .nt-stats--compact {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .nt-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    min-width: 0;
    min-height: 44px;
    padding: 10px 12px;
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--nt-fg-2);
    font: inherit;
    text-align: start;
    cursor: pointer;

    & + & {
      border-inline-start: 1px solid var(--nt-line);
    }

    &:hover {
      background: var(--nt-bg-soft);
    }

    &[aria-pressed="true"] {
      border-bottom-color: $brand;
      background: var(--nt-brand-bg);
      color: var(--nt-fg);
    }

    &:focus-visible {
      outline-offset: -2px;
    }
  }

  .nt-stat__value {
    font-size: 18px;
    line-height: 1.2;
    color: var(--nt-fg);
  }

  .nt-stat--ok .nt-stat__value {
    color: var(--nt-ok-fg);
  }

  .nt-stat--warn .nt-stat__value {
    color: var(--nt-warn-fg);
  }

  .nt-stat--err .nt-stat__value {
    color: var(--nt-err-fg);
  }

  .nt-stat__label {
    max-width: 100%;
    font-size: 12px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .nt-stat__foot {
    max-width: 100%;
    font-size: 12px;
    color: var(--nt-muted);
    overflow-wrap: anywhere;
  }

  // Etkin sayaçta zemin koyulaşır; alt satır ikincil metin tonuna çıkar (4.5:1).
  .nt-stat[aria-pressed="true"] .nt-stat__foot {
    color: var(--nt-fg-2);
  }

  .nt-stats--compact .nt-stat {
    padding: 8px 8px 6px;
  }
</style>
