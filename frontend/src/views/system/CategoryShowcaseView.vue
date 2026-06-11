<template>
  <div class="showcase-page">
    <div class="page-header">
      <div>
        <h1>{{ t("showcase.title") }}</h1>
        <p class="subtitle">{{ t("showcase.subtitle") }}</p>
      </div>
      <button
        class="hdr-btn-primary"
        type="button"
        data-tour="csh-add"
        @click="openCreate"
      >
        <Plus :size="16" /> {{ t("showcase.newTile") }}
      </button>
    </div>

    <section class="settings-section">
      <div class="settings-header">
        <h2>{{ t("showcase.settings") }}</h2>
        <div v-if="isSettingsDirty" class="settings-actions">
          <span class="dirty-hint">{{ t("showcase.unsaved") }}</span>
          <button type="button" class="hdr-btn-ghost" @click="resetSettings">
            {{ t("showcase.cancel") }}
          </button>
          <button
            type="button"
            class="hdr-btn-primary"
            :disabled="savingSettings"
            @click="onSaveSettings"
          >
            {{ savingSettings ? t("showcase.saving") : t("showcase.save") }}
          </button>
        </div>
      </div>
      <div class="settings-fields">
        <label class="toggle">
          <input
            type="checkbox"
            :checked="!!draftSettings.is_enabled"
            @change="setDraftSettings({ is_enabled: draftSettings.is_enabled ? 0 : 1 })"
          />
          <span>{{ t("showcase.enabled") }}</span>
        </label>
        <label>
          {{ t("showcase.titleTr") }}
          <input
            type="text"
            :value="draftSettings.section_title_tr"
            @input="setDraftSettings({ section_title_tr: $event.target.value })"
          />
        </label>
        <label>
          {{ t("showcase.titleEn") }}
          <input
            type="text"
            :value="draftSettings.section_title_en"
            @input="setDraftSettings({ section_title_en: $event.target.value })"
          />
        </label>
        <label>
          {{ t("showcase.columns") }}
          <select
            :value="draftSettings.columns"
            @change="setDraftSettings({ columns: Number($event.target.value) })"
          >
            <option :value="3">3</option>
            <option :value="4">4</option>
            <option :value="5">5</option>
            <option :value="6">6</option>
          </select>
        </label>
      </div>
    </section>

    <section class="presets-section">
      <h2>{{ t("showcase.presets") }}</h2>
      <LayoutPresetPicker @apply="applyPreset" />
    </section>

    <section class="preview-section" data-tour="csh-preview">
      <h2>{{ t("showcase.livePreview") }}</h2>
      <CategoryShowcasePreview
        :tiles="activeOrdered"
        :columns="draftSettings.columns"
        @resize="onResize"
        @reorder="onPreviewReorder"
      />
    </section>

    <section class="list-section" data-tour="csh-list">
      <h2>{{ t("showcase.allTiles") }}</h2>
      <p v-if="loading" class="state">{{ t("showcase.loading") }}</p>
      <p v-else-if="error" class="state error">{{ error }}</p>
      <p v-else-if="!tiles.length" class="state">{{ t("showcase.empty") }}</p>

      <draggable
        v-else
        v-model="tiles"
        item-key="name"
        handle=".drag-handle"
        :animation="150"
        @end="onReorder"
      >
        <template #item="{ element: tile }">
          <ShowcaseTileRow
            :tile="tile"
            @toggle-active="toggleActiveLocal(tile)"
            @edit="openEdit(tile)"
            @delete="confirmDelete(tile)"
          />
        </template>
      </draggable>
    </section>

    <ShowcaseTileEditModal v-if="editing" :tile="editing" @save="onSave" @close="editing = null" />
  </div>
</template>

<script setup>
  import { computed, ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import draggable from "vuedraggable";
  import { Plus } from "lucide-vue-next";
  import { useCategoryShowcase } from "@/composables/useCategoryShowcase";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";
  import CategoryShowcasePreview from "@/components/system/CategoryShowcasePreview.vue";
  import LayoutPresetPicker from "@/components/system/LayoutPresetPicker.vue";
  import ShowcaseTileRow from "@/components/system/ShowcaseTileRow.vue";
  import ShowcaseTileEditModal from "@/components/system/ShowcaseTileEditModal.vue";

  const {
    tiles,
    settings,
    draftSettings,
    savingSettings,
    loading,
    error,
    fetchAll,
    save,
    remove,
    reorder,
    toggleActive,
    updateSpan,
    setDraftSettings,
    saveSettings,
  } = useCategoryShowcase();

  const toast = useToast();
  const { t } = useI18n();
  const editing = ref(null);

  // Sayfa-içi onboarding: yeni kutu ekle → canlı önizleme → tüm kutular listesi.
  usePageTour("category-showcase", () => [
    { target: '[data-tour="csh-add"]', title: t("tourSteps.page.cshAdd_t"), desc: t("tourSteps.page.cshAdd_d") },
    { target: '[data-tour="csh-preview"]', title: t("tourSteps.page.cshPreview_t"), desc: t("tourSteps.page.cshPreview_d") },
    { target: '[data-tour="csh-list"]', title: t("tourSteps.page.cshList_t"), desc: t("tourSteps.page.cshList_d") },
  ]);

  const isSettingsDirty = computed(
    () =>
      draftSettings.value.is_enabled !== settings.value.is_enabled ||
      draftSettings.value.section_title_tr !== settings.value.section_title_tr ||
      draftSettings.value.section_title_en !== settings.value.section_title_en ||
      draftSettings.value.columns !== settings.value.columns
  );

  const activeOrdered = computed(() =>
    [...tiles.value]
      .filter((tile) => tile.is_active)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  );

  function openCreate() {
    const maxOrder = tiles.value.reduce((m, tile) => Math.max(m, tile.sort_order ?? 0), -1);
    editing.value = {
      tile_type: "category",
      col_span: 1,
      row_span: 1,
      label_tr: "",
      label_en: "",
      image: "",
      link_href: "",
      hover_text_tr: "",
      hover_text_en: "",
      promo_badge_tr: "",
      promo_badge_en: "",
      promo_title_tr: "",
      promo_title_en: "",
      background_color: "#cc9900",
      cta_text_tr: "",
      cta_text_en: "",
      cta_href: "",
      is_active: 1,
      sort_order: maxOrder + 1,
      start_at: null,
      end_at: null,
    };
  }

  function openEdit(tile) {
    editing.value = { ...tile };
  }

  async function onSave(payload) {
    await save(payload);
    editing.value = null;
  }

  function resetSettings() {
    setDraftSettings({ ...settings.value });
  }

  async function onSaveSettings() {
    try {
      await saveSettings();
      toast.success(t("showcase.settingsSaved"));
    } catch (e) {
      toast.error(e.message || t("showcase.settingsSaveFailed"));
    }
  }

  async function onReorder() {
    const items = tiles.value.map((tile, i) => ({ name: tile.name, sort_order: i }));
    try {
      await reorder(items);
      tiles.value = tiles.value.map((tile, i) => ({ ...tile, sort_order: i }));
    } catch (e) {
      toast.error(e.message || t("showcase.reorderFailed"));
      await fetchAll();
    }
  }

  async function onResize({ name, col_span, row_span }) {
    try {
      await updateSpan(name, col_span, row_span);
    } catch (e) {
      toast.error(e.message || t("showcase.resizeFailed"));
    }
  }

  // Hazır düzen şablonu: sütun sayısını ayarla + slot boyutlarını aktif kutulara sırayla uygula.
  async function applyPreset({ columns, slots }) {
    try {
      if (draftSettings.value.columns !== columns) {
        setDraftSettings({ columns });
        await saveSettings();
      }
      const active = activeOrdered.value;
      const count = Math.min(active.length, slots.length);
      for (let i = 0; i < count; i++) {
        await updateSpan(active[i].name, slots[i][0], slots[i][1]);
      }
      toast.success(t("showcase.presetApplied"));
    } catch (e) {
      toast.error(e.message || t("showcase.presetFailed"));
    }
  }

  // Önizlemede sürükle-bırak ile sıralama: aktif kutular yeni sıraya, pasifler sona.
  async function onPreviewReorder(orderedNames) {
    const byName = new Map(tiles.value.map((tile) => [tile.name, tile]));
    const reorderedActive = orderedNames.map((n) => byName.get(n)).filter(Boolean);
    const inactive = tiles.value.filter((tile) => !tile.is_active);
    const merged = [...reorderedActive, ...inactive];
    const items = merged.map((tile, i) => ({ name: tile.name, sort_order: i }));
    try {
      await reorder(items);
      tiles.value = merged.map((tile, i) => ({ ...tile, sort_order: i }));
    } catch (e) {
      toast.error(e.message || t("showcase.reorderFailed"));
      await fetchAll();
    }
  }

  async function toggleActiveLocal(tile) {
    await toggleActive(tile);
  }

  async function confirmDelete(tile) {
    const preview = (tile.label_tr || tile.promo_title_tr || "").slice(0, 40);
    if (confirm(t("showcase.deleteConfirm", { preview }))) {
      await remove(tile.name);
    }
  }

  onMounted(fetchAll);
</script>

<style lang="scss" scoped>
  @use "@/assets/scss/variables" as *;

  .showcase-page {
    padding: 24px;
    max-width: 960px;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 24px;

    h1 {
      font-size: 22px;
      font-weight: 600;
      margin: 0;
      color: $l-text-900;
      @include dark {
        color: $d-text;
      }
    }

    .subtitle {
      font-size: 13px;
      color: $l-text-500;
      margin: 4px 0 0;
      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .settings-section,
  .presets-section,
  .preview-section {
    margin-bottom: 24px;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    h2 {
      margin: 0;
    }
  }

  .settings-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dirty-hint {
    font-size: 11px;
    color: $c-warning;
    font-weight: 500;
  }

  .settings-fields {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    align-items: flex-end;

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 13px;
      color: $l-text-700;
      @include dark {
        color: $d-text-muted;
      }
      input[type="text"],
      select {
        padding: 8px 10px;
        font-size: 13px;
        font-family: inherit;
        border: 1px solid $l-border;
        border-radius: 6px;
        background: $l-bg;
        color: $l-text-900;
        min-width: 220px;
        @include dark {
          background: $d-bg;
          border-color: $d-border;
          color: $d-text;
        }
      }
    }

    .toggle {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
  }

  .hdr-btn-ghost {
    appearance: none;
    display: inline-flex;
    align-items: center;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    color: $l-text-700;
    background: transparent;
    border: 1px solid $l-border-alt;
    border-radius: 8px;
    cursor: pointer;
    &:hover {
      border-color: $l-text-500;
      color: $l-text-900;
    }
    @include dark {
      color: $d-text-muted;
      border-color: $d-border;
      &:hover {
        color: $d-text;
        border-color: $d-border-inner;
        background: $d-bg-hover;
      }
    }
  }

  .hdr-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }

  .preview-section h2,
  .list-section h2,
  .presets-section h2,
  .settings-section h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $l-text-500;
    font-weight: 600;
    margin: 0 0 8px;
    @include dark {
      color: $d-text-muted;
    }
  }

  .state {
    padding: 24px;
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    color: $l-text-500;
    text-align: center;
    font-size: 13px;
    @include dark {
      background-color: $d-bg-card;
      border-color: $d-border;
      color: $d-text-muted;
    }
    &.error {
      color: #dc2626;
      background: #fee2e2;
      @include dark {
        color: #fca5a5;
        background: rgba(239, 68, 68, 0.15);
      }
    }
  }
</style>
