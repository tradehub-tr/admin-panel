<template>
  <div class="header-notices-page">
    <div class="page-header">
      <div>
        <h1>{{ t("headerNotices.title") }}</h1>
        <p class="subtitle">{{ t("headerNotices.subtitle") }}</p>
      </div>
      <button class="hdr-btn-primary" type="button" data-tour="hnt-add" @click="openCreate">
        <Plus :size="16" /> {{ t("headerNotices.newNotice") }}
      </button>
    </div>

    <section class="mode-section" data-tour="hnt-mode">
      <div class="mode-header">
        <h2>{{ t("headerNotices.displayMode") }}</h2>
        <div v-if="isModeDirty" class="mode-actions">
          <span class="dirty-hint">{{ t("headerNotices.unsavedChanges") }}</span>
          <button type="button" class="hdr-btn-ghost" @click="resetMode">
            {{ t("headerNotices.cancel") }}
          </button>
          <button
            type="button"
            class="hdr-btn-primary"
            :disabled="savingDisplayMode"
            @click="onSaveMode"
          >
            {{ savingDisplayMode ? t("headerNotices.saving") : t("headerNotices.save") }}
          </button>
        </div>
      </div>
      <BaseSegmented
        :model-value="draftDisplayMode"
        :options="modeOptions"
        @update:model-value="setDraftDisplayMode"
      />
    </section>

    <section class="preview-section">
      <h2>{{ t("headerNotices.livePreview") }}</h2>
      <HeaderNoticePreview :notices="activeOrdered" :display-mode="draftDisplayMode" />
    </section>

    <section class="list-section" data-tour="hnt-list">
      <h2>{{ t("headerNotices.allNotices") }}</h2>
      <p v-if="loading" class="state">{{ t("headerNotices.loading") }}</p>
      <p v-else-if="error" class="state error">{{ error }}</p>
      <p v-else-if="!notices.length" class="state">{{ t("headerNotices.empty") }}</p>

      <draggable
        v-else
        v-model="notices"
        item-key="name"
        handle=".drag-handle"
        :animation="150"
        @end="onReorder"
      >
        <template #item="{ element: notice }">
          <NoticeRow
            :notice="notice"
            @toggle-active="toggleActiveLocal(notice)"
            @edit="openEdit(notice)"
            @delete="confirmDelete(notice)"
          />
        </template>
      </draggable>
    </section>

    <NoticeEditModal v-if="editing" :notice="editing" @save="onSave" @close="editing = null" />
  </div>
</template>

<script setup>
  import { computed, ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import draggable from "vuedraggable";
  import { Plus } from "lucide-vue-next";
  import { useHeaderNotices } from "@/composables/useHeaderNotices";
  import { useToast } from "@/composables/useToast";
  import { usePageTour } from "@/composables/usePageTour";
  import BaseSegmented from "@/components/common/BaseSegmented.vue";
  import HeaderNoticePreview from "@/components/system/HeaderNoticePreview.vue";
  import NoticeRow from "@/components/system/NoticeRow.vue";
  import NoticeEditModal from "@/components/system/NoticeEditModal.vue";

  const {
    notices,
    displayMode,
    draftDisplayMode,
    savingDisplayMode,
    loading,
    error,
    fetchAll,
    save,
    remove,
    reorder,
    toggleActive,
    setDraftDisplayMode,
    saveDisplayMode,
  } = useHeaderNotices();

  const toast = useToast();
  const { t } = useI18n();
  const editing = ref(null);

  // Sayfa-içi onboarding: yeni duyuru → görünüm modu/önizleme → duyuru listesi.
  usePageTour("header-notices", () => [
    {
      target: '[data-tour="hnt-add"]',
      title: t("tourSteps.page.hntAdd_t"),
      desc: t("tourSteps.page.hntAdd_d"),
    },
    {
      target: '[data-tour="hnt-mode"]',
      title: t("tourSteps.page.hntMode_t"),
      desc: t("tourSteps.page.hntMode_d"),
    },
    {
      target: '[data-tour="hnt-list"]',
      title: t("tourSteps.page.hntList_t"),
      desc: t("tourSteps.page.hntList_d"),
    },
  ]);

  const isModeDirty = computed(() => draftDisplayMode.value !== displayMode.value);

  const modeOptions = computed(() => [
    {
      value: "single",
      label: t("headerNotices.modeSingleLabel"),
      desc: t("headerNotices.modeSingleDesc"),
    },
    {
      value: "slide",
      label: t("headerNotices.modeSlideLabel"),
      desc: t("headerNotices.modeSlideDesc"),
    },
    {
      value: "marquee",
      label: t("headerNotices.modeMarqueeLabel"),
      desc: t("headerNotices.modeMarqueeDesc"),
    },
  ]);

  const activeOrdered = computed(() =>
    [...notices.value]
      .filter((n) => n.is_active)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  );

  function openCreate() {
    const maxOrder = notices.value.reduce((m, n) => Math.max(m, n.sort_order ?? 0), -1);
    editing.value = {
      message_tr: "",
      message_en: "",
      link_text_tr: "",
      link_text_en: "",
      link_href: "",
      icon: "none",
      background_color: "#1a1a1a",
      is_active: 1,
      sort_order: maxOrder + 1,
      start_at: null,
      end_at: null,
    };
  }

  function openEdit(n) {
    editing.value = { ...n };
  }

  async function onSave(payload) {
    await save(payload);
    editing.value = null;
  }

  function resetMode() {
    setDraftDisplayMode(displayMode.value);
  }

  async function onSaveMode() {
    try {
      await saveDisplayMode();
      toast.success(t("headerNotices.modeSaved"));
    } catch (e) {
      toast.error(e.message || t("headerNotices.modeSaveFailed"));
    }
  }

  async function onReorder() {
    const items = notices.value.map((n, i) => ({ name: n.name, sort_order: i }));
    await reorder(items);
    notices.value = notices.value.map((n, i) => ({ ...n, sort_order: i }));
  }

  async function toggleActiveLocal(notice) {
    await toggleActive(notice);
  }

  async function confirmDelete(n) {
    const preview = (n.message_tr || "").slice(0, 40);
    if (confirm(t("headerNotices.deleteConfirm", { preview }))) {
      await remove(n.name);
    }
  }

  onMounted(fetchAll);
</script>

<style lang="scss" scoped>
  @use "@/assets/scss/variables" as *;

  .header-notices-page {
    padding: 24px;
    max-width: 960px;
    margin: 0 auto;
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

  .mode-section {
    margin-bottom: 24px;
  }

  .mode-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;

    h2 {
      margin: 0;
    }
  }

  .mode-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dirty-hint {
    font-size: 11px;
    color: $c-warning;
    font-weight: 500;
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
    transition:
      background $t-base,
      border-color $t-base,
      color $t-base;

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

  .preview-section {
    margin-bottom: 24px;
  }

  .preview-section h2,
  .list-section h2,
  .mode-section h2 {
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
      box-shadow: 0 1px 4px rgba(#000, 0.3);
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
