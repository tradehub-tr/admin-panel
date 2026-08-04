<template>
  <div class="mrail__inner">
    <div class="mrail__mobile-head">
      <h2 class="mrail__heading">{{ t("media.filters.title") }}</h2>
      <button
        type="button"
        class="mrail__close"
        :aria-label="t('media.filters.close')"
        @click="emit('close')"
      >
        <AppIcon name="x" :size="18" />
      </button>
    </div>

    <!-- Depolama kullanımı -->
    <section class="mrail__storage" :aria-label="t('media.storage.title')">
      <p class="mrail__storage-top">
        <span>{{ t("media.storage.title") }}</span>
        <span class="mrail__storage-pct">%{{ storagePercent }}</span>
      </p>
      <div
        class="mrail__storage-bar"
        role="progressbar"
        :aria-valuenow="storagePercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span
          class="mrail__storage-fill"
          :class="storageTone"
          :style="{ width: `${storagePercent}%` }"
        />
      </div>
      <p class="mrail__storage-sub">
        {{ t("media.storage.used", { used: usedLabel, quota: quotaLabel }) }}
      </p>
    </section>

    <!-- Hızlı görünümler: tek tıkla açılıp kapanan kısayollar -->
    <nav class="mrail__quick" :aria-label="t('media.filters.quick')">
      <button
        v-for="q in quickViews"
        :key="q.id"
        type="button"
        class="mrail__item"
        :class="{ 'mrail__item--on': q.active }"
        :aria-pressed="q.active"
        @click="q.toggle()"
      >
        <AppIcon :name="q.icon" :size="16" />
        <span>{{ q.label }}</span>
        <span class="mrail__count">{{ q.count }}</span>
      </button>
    </nav>

    <!-- Katlanabilir filtre grupları — 9 grup açık durursa ray metrelerce uzuyor -->
    <section v-for="group in groups" :key="group.id" class="mrail__group">
      <h3 class="mrail__group-head">
        <button
          type="button"
          class="mrail__toggle"
          :aria-expanded="isOpen(group.id)"
          :aria-controls="`mrail-${group.id}`"
          @click="toggle(group.id)"
        >
          <AppIcon
            name="chevron-down"
            :size="14"
            class="mrail__chevron"
            :class="{ 'mrail__chevron--open': isOpen(group.id) }"
          />
          <span class="mrail__group-label">{{ group.label }}</span>
          <!-- Kapalıyken seçili değer başlıkta görünür -->
          <span v-if="!isOpen(group.id) && activeLabel(group)" class="mrail__group-active">
            {{ activeLabel(group) }}
          </span>
        </button>
      </h3>

      <div v-show="isOpen(group.id)" :id="`mrail-${group.id}`" class="mrail__options">
        <button
          v-for="opt in group.options"
          :key="opt.id"
          type="button"
          class="mrail__item"
          :class="{ 'mrail__item--on': group.value === opt.id }"
          :aria-pressed="group.value === opt.id"
          @click="group.set(opt.id)"
        >
          <AppIcon :name="opt.icon" :size="16" />
          <span>{{ opt.label }}</span>
          <span v-if="opt.count !== undefined" class="mrail__count">{{ opt.count }}</span>
        </button>
      </div>
    </section>

    <!-- Etiketler -->
    <section v-if="tags.length" class="mrail__group">
      <h3 class="mrail__group-head">
        <button
          type="button"
          class="mrail__toggle"
          :aria-expanded="isOpen('tags')"
          aria-controls="mrail-tags"
          @click="toggle('tags')"
        >
          <AppIcon
            name="chevron-down"
            :size="14"
            class="mrail__chevron"
            :class="{ 'mrail__chevron--open': isOpen('tags') }"
          />
          <span class="mrail__group-label">{{ t("media.filters.tags") }}</span>
          <span v-if="!isOpen('tags') && activeTags.length" class="mrail__group-active">
            {{ activeTags.length }}
          </span>
        </button>
      </h3>
      <div v-show="isOpen('tags')" id="mrail-tags" class="mrail__tags">
        <button
          v-for="{ tag, count } in tags"
          :key="tag"
          type="button"
          class="mrail__tag"
          :class="{ 'mrail__tag--on': activeTags.includes(tag) }"
          :aria-pressed="activeTags.includes(tag)"
          @click="emit('toggle-tag', tag)"
        >
          {{ tag }}
          <span class="mrail__count">{{ count }}</span>
        </button>
      </div>
    </section>

    <label class="mrail__switch">
      <input
        :checked="archived"
        type="checkbox"
        @change="emit('update:archived', $event.target.checked)"
      />
      <span>{{ t("media.filters.archived") }}</span>
      <span class="mrail__count">{{ archivedCount }}</span>
    </label>

    <div class="mrail__foot">
      <button type="button" class="mrail__ghost" @click="setAll(false)">
        {{ t("media.filters.collapseAll") }}
      </button>
      <button v-if="hasActiveFilter" type="button" class="mrail__reset" @click="emit('reset')">
        <AppIcon name="rotate-ccw" :size="14" />
        {{ t("media.filters.reset") }}
      </button>
    </div>
  </div>
</template>

<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { formatBytes } from "@/utils/mediaFormat";

  /**
   * Filtre rayı — akordiyon.
   *
   * 9 filtre grubu aynı anda açık durunca ray ekranın kat kat altına iniyordu.
   * Gruplar katlanır; açık/kapalı durum `localStorage`'da saklanır ve kapalı
   * grubun seçili değeri başlıkta görünür, böylece katlamak bilgi kaybettirmez.
   */
  const props = defineProps({
    groups: { type: Array, required: true },
    tags: { type: Array, default: () => [] },
    activeTags: { type: Array, default: () => [] },
    quickViews: { type: Array, default: () => [] },
    archived: { type: Boolean, default: false },
    archivedCount: { type: Number, default: 0 },
    hasActiveFilter: { type: Boolean, default: false },
    usedBytes: { type: Number, default: 0 },
    quotaBytes: { type: Number, required: true },
  });
  const emit = defineEmits(["toggle-tag", "update:archived", "reset", "close"]);

  const { t } = useI18n();

  const STORAGE_KEY = "media-rail-open";
  const DEFAULT_OPEN = ["kind"];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_OPEN;
    } catch {
      return DEFAULT_OPEN;
    }
  }

  const openIds = ref(load());

  watch(openIds, (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true });

  function isOpen(id) {
    return openIds.value.includes(id);
  }

  function toggle(id) {
    openIds.value = isOpen(id) ? openIds.value.filter((x) => x !== id) : [...openIds.value, id];
  }

  function setAll(open) {
    openIds.value = open ? [...props.groups.map((g) => g.id), "tags"] : [];
  }

  /** Kapalı başlıkta gösterilecek seçili değer ("Tümü" ise gösterme). */
  function activeLabel(group) {
    if (group.value === "all") return "";
    return group.options.find((o) => o.id === group.value)?.label || "";
  }

  const storagePercent = computed(() =>
    Math.min(100, Math.round((props.usedBytes / props.quotaBytes) * 100))
  );
  const storageTone = computed(() => {
    if (storagePercent.value >= 90) return "mrail__storage-fill--danger";
    if (storagePercent.value >= 70) return "mrail__storage-fill--warn";
    return "";
  });
  const usedLabel = computed(() => formatBytes(props.usedBytes));
  const quotaLabel = computed(() => formatBytes(props.quotaBytes));
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mrail__inner {
    display: grid;
    gap: media.$s-2;
    padding: media.$s-3;
    @include media.surface;
  }

  .mrail__mobile-head {
    display: none;
  }

  // ── Depolama ─────────────────────────────────────────────────────
  .mrail__storage {
    display: grid;
    gap: media.$s-2;
    padding-bottom: media.$s-3;
    @include media.divider;
  }

  .mrail__storage-top {
    display: flex;
    justify-content: space-between;
    margin: 0;
    @include media.text("sm");
    @include media.field-label;
  }

  .mrail__storage-pct {
    @include media.numeric;
  }

  .mrail__storage-bar {
    height: 0.375rem;
    border-radius: media.$r-pill;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mrail__storage-fill {
    display: block;
    height: 100%;
    background: $brand;
    transition: width $t-base;

    &--warn {
      background: $c-warning;
    }

    &--danger {
      background: $c-error;
    }
  }

  .mrail__storage-sub {
    margin: 0;
    @include media.text("xs");
    @include media.muted(2);
    @include media.numeric;
  }

  // ── Gruplar ──────────────────────────────────────────────────────
  .mrail__quick {
    display: grid;
    gap: media.$s-05;
    padding-bottom: media.$s-2;
    @include media.divider;
  }

  .mrail__group {
    display: grid;
    gap: media.$s-05;
  }

  .mrail__group-head {
    margin: 0;
  }

  .mrail__toggle {
    width: 100%;
    padding: 0 media.$s-2;
    text-align: start;
    @include media.button("ghost");
    @include media.focus-ring;

    min-height: 2.25rem;

    // Tam genişlik satırda ölçek büyük duruyor — tepki arka planla verilir.
    &:active {
      transform: none;
      background: $l-bg-muted;

      @include dark {
        background: $d-item-hover;
      }
    }
  }

  .mrail__chevron {
    flex-shrink: 0;
    transition: transform $t-fast;

    &--open {
      transform: rotate(180deg);
    }
  }

  .mrail__group-label {
    flex: 1;
    @include media.text;
    font-weight: 620;
  }

  .mrail__group-active {
    max-width: 7rem;
    @include media.chip("brand");
    @include media.truncate;

    @include media.text("xs");
  }

  .mrail__options {
    display: grid;
    gap: media.$s-05;
    padding-bottom: media.$s-2;
  }

  .mrail__item {
    width: 100%;
    justify-content: flex-start;
    padding: 0 media.$s-2;
    text-align: start;
    color: $l-text-700;
    @include media.button("ghost");
    @include media.focus-ring;

    min-height: 2.5rem;

    @include dark {
      color: $d-text;
    }

    // Hover dokunmatikte yapışıp seçenek "seçili" gibi görünüyordu; tap tepkisi
    // ölçek yerine arka planla veriliyor (liste içinde scale komşuları oynatır).
    @include media.hoverable {
      &:hover {
        background: $l-bg-muted;

        @include dark {
          background: $d-item-hover;
        }
      }
    }

    &:active {
      background: $l-bg-muted;
      transform: none;

      @include dark {
        background: $d-item-hover;
      }
    }

    span:first-of-type {
      flex: 1;
    }

    &--on {
      background: $brand;
      color: $brand-ink;
      font-weight: 600;

      @include dark {
        background: $brand;
        color: $brand-ink;
      }

      &:active {
        background: $brand-light;
      }

      @include media.hoverable {
        &:hover {
          background: $brand-light;

          @include dark {
            background: $brand-light;
          }
        }
      }
    }
  }

  .mrail__count {
    opacity: 0.7;
    @include media.numeric;
  }

  .mrail__tags {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-1;
    padding-bottom: media.$s-2;
  }

  .mrail__tag {
    border: 1px solid transparent;
    cursor: pointer;
    @include media.chip;
    @include media.focus-ring;
    @include media.press(0.94);

    @include media.hoverable {
      &:hover {
        border-color: $l-border;

        @include dark {
          border-color: $d-border;
        }
      }
    }

    &--on {
      @include media.chip("brand");
    }
  }

  .mrail__switch {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    padding: 0 media.$s-2;
    @include media.text;
    cursor: pointer;
    color: $l-text-700;
    @include media.tap-target;

    @include dark {
      color: $d-text;
    }

    span:first-of-type {
      flex: 1;
    }
  }

  .mrail__foot {
    display: grid;
    gap: media.$s-2;
    padding-top: media.$s-2;
    @include media.divider(top);
  }

  .mrail__ghost {
    justify-content: center;
    @include media.button("ghost");
    @include media.focus-ring;
  }

  .mrail__reset {
    justify-content: center;
    @include media.button;
    @include media.focus-ring;
  }

  .mrail__close {
    @include media.icon-button;
  }

  // Ray ≤1023px'te drawer'a dönüyor (bkz. media.scss §Kırılma noktaları) —
  // başlık ve kapat butonu da o noktada görünmeli, 767px'te değil.
  @media (max-width: media.$m-bp-rail) {
    .mrail__inner {
      min-height: 100%;
      border: 0;
      border-radius: 0;
      // Drawer ekranın altına dayanıyor: son grup tab bar'ın altında kalmasın.
      padding-bottom: calc(#{media.$s-4} + env(safe-area-inset-bottom));
    }

    .mrail__mobile-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .mrail__heading {
      margin: 0;
      font-size: 1.125rem;
      @include media.heading;
    }
  }
</style>
