<template>
  <MediaModal
    v-model:open="open"
    :title="t('media.picker.title')"
    :close-label="t('media.picker.close')"
    width="64rem"
  >
    <div class="mpicker__toolbar">
      <label class="mpicker__search">
        <AppIcon name="search" :size="15" />
        <input
          v-model="query"
          type="search"
          :placeholder="t('media.picker.searchPlaceholder')"
          :aria-label="t('media.picker.searchPlaceholder')"
        />
      </label>

      <div class="mpicker__mode" role="group" :aria-label="t('media.picker.mode')">
        <button
          v-for="mode in modes"
          :key="String(mode.multi)"
          type="button"
          class="mpicker__mode-btn"
          :aria-pressed="multiSelect === mode.multi"
          @click="setMode(mode.multi)"
        >
          {{ mode.label }}
        </button>
      </div>

      <label class="mpicker__upload">
        <AppIcon name="upload" :size="15" />
        {{ t("media.picker.upload") }}
        <input type="file" multiple accept="image/*,video/*,.pdf" @change="onPick" />
      </label>
    </div>

    <ul v-if="visible.length" class="mpicker__grid">
      <li v-for="item in visible" :key="item.id">
        <button
          type="button"
          class="mpicker__tile"
          :class="{ 'mpicker__tile--on': isChosen(item.id) }"
          :aria-pressed="isChosen(item.id)"
          @click="toggle(item.id)"
        >
          <MediaThumb :item="item" :icon-size="22" />
          <span v-if="isChosen(item.id)" class="mpicker__order">{{ orderOf(item.id) }}</span>
          <span class="mpicker__name" :title="item.fileName">{{ item.fileName }}</span>
        </button>
      </li>
    </ul>
    <p v-else class="mpicker__empty">{{ t("media.picker.empty") }}</p>

    <!-- Seçilenler: sürükleyerek galeri sırası, ilk sıra ana görsel -->
    <section v-if="chosen.length" class="mpicker__chosen">
      <p class="mpicker__chosen-title">
        {{ t("media.picker.chosenTitle", { count: chosen.length }) }}
        <span v-if="multiSelect">{{ t("media.picker.dragHint") }}</span>
      </p>
      <draggable v-model="chosen" item-key="id" class="mpicker__strip" :animation="150">
        <template #item="{ element, index }">
          <div class="mpicker__chip" :class="{ 'mpicker__chip--primary': index === 0 }">
            <AppIcon name="grip-vertical" :size="14" class="mpicker__grip" />
            <MediaThumb :item="byId(element)" :icon-size="14" class="mpicker__chip-thumb" />
            <span class="mpicker__chip-name">{{ byId(element).fileName }}</span>
            <span v-if="index === 0" class="mpicker__primary">{{ t("media.picker.primary") }}</span>
            <button v-else type="button" class="mpicker__make-primary" @click="makePrimary(index)">
              {{ t("media.picker.makePrimary") }}
            </button>
            <button
              type="button"
              class="mpicker__chip-x"
              :aria-label="t('media.picker.remove')"
              @click="toggle(element)"
            >
              <AppIcon name="x" :size="13" />
            </button>
          </div>
        </template>
      </draggable>
    </section>

    <template #footer>
      <span class="mpicker__hint">{{ t("media.picker.hint") }}</span>
      <button type="button" class="mpicker__btn" @click="open = false">
        {{ t("media.picker.cancel") }}
      </button>
      <button
        type="button"
        class="mpicker__btn mpicker__btn--primary"
        :disabled="!chosen.length"
        @click="confirm"
      >
        {{ t("media.picker.confirm", { count: chosen.length }) }}
      </button>
    </template>
  </MediaModal>
</template>

<script setup>
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import draggable from "vuedraggable";

  import AppIcon from "@/components/common/AppIcon.vue";
  import MediaModal from "@/components/media/MediaModal.vue";
  import MediaThumb from "@/components/media/MediaThumb.vue";
  import { matchesQuery } from "@/utils/mediaFormat";

  const props = defineProps({
    items: { type: Array, required: true },
    multiple: { type: Boolean, default: true },
  });
  const emit = defineEmits(["confirm", "upload"]);
  const open = defineModel("open", { type: Boolean, default: false });

  const { t } = useI18n();

  const query = ref("");
  /** Seçim sırası galeri sırasıdır; ilk eleman ana görsel. */
  const chosen = ref([]);
  const multiSelect = ref(props.multiple);

  const modes = computed(() => [
    { multi: false, label: t("media.picker.single") },
    { multi: true, label: t("media.picker.multi") },
  ]);

  const visible = computed(() =>
    props.items.filter((m) => !m.archived && matchesQuery(m, query.value))
  );

  function byId(id) {
    return props.items.find((m) => m.id === id);
  }

  function isChosen(id) {
    return chosen.value.includes(id);
  }

  function orderOf(id) {
    return chosen.value.indexOf(id) + 1;
  }

  function toggle(id) {
    if (isChosen(id)) {
      chosen.value = chosen.value.filter((x) => x !== id);
      return;
    }
    chosen.value = multiSelect.value ? [...chosen.value, id] : [id];
  }

  function setMode(multi) {
    multiSelect.value = multi;
    // Tekliye dönüşte fazlalıkları at, ilk seçim kalsın.
    if (!multi && chosen.value.length > 1) chosen.value = [chosen.value[0]];
  }

  function makePrimary(index) {
    const next = [...chosen.value];
    const [moved] = next.splice(index, 1);
    chosen.value = [moved, ...next];
  }

  function onPick(event) {
    const files = Array.from(event.target.files || []);
    if (files.length) emit("upload", files);
    event.target.value = "";
  }

  function confirm() {
    emit("confirm", { ids: [...chosen.value], primary: chosen.value[0] || null });
    open.value = false;
  }

  watch(open, (isOpen) => {
    if (!isOpen) return;
    chosen.value = [];
    query.value = "";
    multiSelect.value = props.multiple;
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mpicker__toolbar {
    display: flex;
    gap: media.$s-2;
    flex-wrap: wrap;
    margin-bottom: media.$s-4;
  }

  .mpicker__search {
    flex: 1 1 12rem;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: media.$s-2;
    @include media.field-input;
    @include media.muted;

    width: auto;
    padding-inline-start: media.$s-3;
    border-radius: media.$r-md;

    input {
      flex: 1;
      min-width: 0;
      border: 0;
      background: none;
      font: inherit;
      @include media.text;
      outline: 0;
      color: inherit;
      @include media.heading;
    }
  }

  .mpicker__mode {
    display: flex;
    gap: media.$s-05;
    padding: media.$s-1;
    border-radius: media.$r-md;
    background: rgb(0 0 0 / 5%);
  }

  .mpicker__mode-btn {
    @include media.button("ghost");
    @include media.focus-ring;

    padding: 0 media.$s-3;
    min-height: 2.375rem;

    &[aria-pressed="true"] {
      background: $l-bg;
      @include media.heading;

      @include dark {
        background: $d-bg-elevated;
      }
    }
  }

  .mpicker__upload {
    @include media.button("primary");
    @include media.focus-ring;

    input {
      display: none;
    }
  }

  .mpicker__grid {
    display: grid;
    // min() olmadan 8rem'lik iz dar ekranda taşırıyor.
    grid-template-columns: repeat(auto-fill, minmax(min(8rem, 100%), 1fr));
    gap: media.$s-3;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .mpicker__tile {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    border: 2px solid transparent;
    border-radius: media.$r-md;
    overflow: hidden;
    background: $l-bg-soft;
    cursor: pointer;
    text-align: start;
    @include media.focus-ring;
    @include media.press(0.97);

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .mpicker__tile--on {
    border-color: $brand;
    box-shadow: 0 0 0 3px $brand-glow;
  }

  .mpicker__order {
    position: absolute;
    top: 0.375rem;
    inset-inline-start: 0.375rem;
    min-width: 1.375rem;
    height: 1.375rem;
    justify-content: center;
    @include media.chip("brand");
  }

  .mpicker__name {
    display: block;
    padding: media.$s-2 media.$s-2;
    @include media.text("sm");
    @include media.truncate;
    @include media.muted;
  }

  .mpicker__empty {
    margin: media.$s-6 0;
    text-align: center;
    @include media.text("sm");
    @include media.muted(2);
  }

  .mpicker__chosen {
    margin-top: media.$s-4;
    padding-top: media.$s-3;
    @include media.divider(top);
  }

  .mpicker__chosen-title {
    display: flex;
    gap: media.$s-2;
    margin: 0 0 media.$s-2;
    @include media.text;
    @include media.heading;

    span {
      font-weight: 400;
      @include media.muted(2);
    }
  }

  .mpicker__strip {
    display: flex;
    gap: media.$s-2;
    overflow-x: auto;
    padding-bottom: media.$s-1;
  }

  .mpicker__chip {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-shrink: 0;
    padding: media.$s-1 media.$s-2 media.$s-1 media.$s-1;
    border: 1px solid $l-border;
    border-radius: media.$r-md;
    cursor: grab;
    @include media.surface("soft");

    &--primary {
      border-color: $brand;
    }
  }

  .mpicker__grip {
    @include media.muted(2);
  }

  .mpicker__chip-thumb {
    flex-shrink: 0;
    align-self: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: media.$r-sm;
  }

  .mpicker__chip-name {
    max-width: 8rem;
    @include media.text("xs");
    @include media.truncate;
    @include media.muted;
  }

  .mpicker__primary {
    @include media.chip("brand");
  }

  .mpicker__make-primary {
    @include media.button("ghost");

    min-height: auto;
    padding: 0;
    @include media.text("xs");
    text-decoration: underline;
  }

  .mpicker__chip-x {
    @include media.button("ghost");

    min-height: auto;
    padding: 0;
  }

  .mpicker__hint {
    flex: 1;
    @include media.text("sm");
    @include media.muted(2);
  }

  .mpicker__btn {
    @include media.button;
    @include media.focus-ring;

    &--primary {
      @include media.button("primary");
    }
  }
</style>
