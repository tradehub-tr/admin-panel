<script setup>
  /** Sürüm zaman çizelgesi. Durum rozeti ikon + metin taşır. */
  import AppIcon from "@/components/common/AppIcon.vue";

  import NtBadge from "../NtBadge.vue";

  defineProps({
    /** [{ version, status, date, by, note, sends, prev }] */
    versions: { type: Array, required: true },
    selected: { type: Number, default: null },
    eventKey: { type: String, required: true },
    canRestore: { type: Boolean, default: false },
    restoreReason: { type: String, default: "" },
  });
  const emit = defineEmits(["compare", "restore"]);
</script>

<template>
  <ol class="nt-tl" aria-label="Sürümler">
    <li
      v-for="v in versions"
      :key="v.version"
      class="nt-tl__item"
      :class="[`is-${v.status}`, { 'is-selected': selected === v.version }]"
    >
      <span class="nt-tl__dot" aria-hidden="true">
        <AppIcon v-if="v.status === 'live'" name="check" :size="10" />
      </span>
      <div class="nt-tl__card nt-surface">
        <div class="nt-tl__head">
          <h3 class="nt-h3 nt-num">v{{ v.version }}</h3>
          <NtBadge v-if="v.status === 'live'" tone="ok" dot>Yayında</NtBadge>
          <NtBadge v-else-if="v.status === 'draft'" tone="warn" icon="pencil"
            >Taslak · şu an</NtBadge
          >
          <NtBadge v-else icon="history">Eski</NtBadge>
        </div>
        <p class="nt-hint nt-tl__meta">
          <span class="nt-num">{{ v.date }}</span>
          <span>{{ v.by }}</span>
          <span class="nt-num">{{ v.sends }}</span>
        </p>
        <p class="nt-tl__note">{{ v.note }}</p>
        <div class="nt-tl__actions">
          <button
            type="button"
            class="hdr-btn-outlined nt-btn--sm"
            :aria-pressed="selected === v.version"
            :disabled="v.prev === null"
            @click="emit('compare', v.version)"
          >
            <AppIcon name="git-compare" :size="14" />
            {{ v.prev === null ? "İlk sürüm" : `v${v.prev} ile karşılaştır` }}
          </button>
          <button
            v-if="v.status === 'old'"
            type="button"
            class="hdr-btn-outlined nt-btn--sm"
            :data-restore="v.version"
            :disabled="!canRestore"
            :aria-describedby="canRestore ? undefined : 'nt-restore-why'"
            @click="emit('restore', v.version)"
          >
            <AppIcon name="rotate-ccw" :size="14" />Bu sürüme dön
          </button>
          <router-link
            v-if="v.status === 'draft'"
            class="hdr-btn-outlined nt-btn--sm"
            :to="{ name: 'NotificationTemplateEditor', params: { key: eventKey } }"
          >
            <AppIcon name="pencil" :size="14" />Düzenlemeye git
          </router-link>
        </div>
      </div>
    </li>
    <li v-if="!canRestore" class="nt-tl__why">
      <p id="nt-restore-why" class="nt-hint">
        <AppIcon name="lock" :size="13" class="inline" /> {{ restoreReason }}
      </p>
    </li>
    <li v-if="$slots.after" class="nt-tl__why"><slot name="after" /></li>
  </ol>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .nt-tl {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
    padding: 0 0 0 26px;
    list-style: none;

    &::before {
      content: "";
      position: absolute;
      top: 12px;
      bottom: 12px;
      left: 8px;
      width: 2px;
      background: var(--nt-line);
    }
  }

  .nt-tl__item {
    position: relative;
  }

  .nt-tl__dot {
    position: absolute;
    top: 14px;
    left: -26px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 2px solid var(--nt-field-line);
    border-radius: 50%;
    background: var(--nt-bg);
    color: var(--nt-bg);
  }

  .is-live .nt-tl__dot {
    border-color: var(--nt-ok-fg);
    background: var(--nt-ok-fg);
  }

  .is-draft .nt-tl__dot {
    border-style: dashed;
  }

  .nt-tl__card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
  }

  .is-draft .nt-tl__card {
    border-style: dashed;
  }

  .is-selected .nt-tl__card {
    border-color: var(--nt-brand-line);
    box-shadow: inset 3px 0 0 $brand;
  }

  .nt-tl__head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nt-tl__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
  }

  .nt-tl__note {
    margin: 0;
  }

  .nt-tl__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .nt-tl__why {
    padding-top: 2px;
  }
</style>
