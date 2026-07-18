<template>
  <div class="modal-backdrop modal-anim" @click.self="$emit('close')">
    <div class="modal modal-anim__panel" role="dialog" aria-labelledby="notice-modal-title">
      <div class="modal-header">
        <h2 id="notice-modal-title">
          {{ isEdit ? t("noticeEdit.editTitle") : t("noticeEdit.newTitle") }}
        </h2>
        <button class="icon-btn" :aria-label="t('noticeEdit.close')" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <form class="modal-body" @submit.prevent="onSubmit">
        <div class="tabs">
          <button type="button" :class="{ active: lang === 'tr' }" @click="lang = 'tr'">
            Türkçe
          </button>
          <button type="button" :class="{ active: lang === 'en' }" @click="lang = 'en'">
            English
          </button>
        </div>

        <div v-show="lang === 'tr'" class="field-group">
          <label>
            {{ t("noticeEdit.messageTr") }} <span class="required">*</span>
            <textarea v-model="form.message_tr" rows="2" required maxlength="200"></textarea>
            <small>{{ form.message_tr?.length || 0 }} / 200</small>
          </label>
          <label>
            {{ t("noticeEdit.linkTextTr") }}
            <input v-model="form.link_text_tr" type="text" maxlength="60" />
          </label>
        </div>

        <div v-show="lang === 'en'" class="field-group">
          <label>
            {{ t("noticeEdit.messageEn") }}
            <textarea v-model="form.message_en" rows="2" maxlength="200"></textarea>
            <small
              >{{ form.message_en?.length || 0 }} / 200 — {{ t("noticeEdit.fallbackHint") }}</small
            >
          </label>
          <label>
            {{ t("noticeEdit.linkTextEn") }}
            <input v-model="form.link_text_en" type="text" maxlength="60" />
          </label>
        </div>

        <label>
          {{ t("noticeEdit.linkHref") }}
          <input
            v-model="form.link_href"
            type="text"
            :placeholder="t('noticeEdit.linkHrefPlaceholder')"
          />
        </label>

        <label>
          {{ t("noticeEdit.backgroundColor") }}
          <div class="color-row">
            <input v-model="form.background_color" type="color" class="color-input" />
            <input
              v-model="form.background_color"
              type="text"
              class="color-text"
              placeholder="#1a1a1a"
              pattern="^#[0-9a-fA-F]{6}$"
            />
            <button type="button" class="color-reset" @click="form.background_color = '#1a1a1a'">
              {{ t("noticeEdit.reset") }}
            </button>
          </div>
          <small>{{ t("noticeEdit.backgroundColorHint") }}</small>
        </label>

        <div class="row">
          <label class="toggle">
            <input v-model="form.is_active" type="checkbox" :true-value="1" :false-value="0" />
            <span>{{ t("noticeEdit.active") }}</span>
          </label>
        </div>

        <div class="row two">
          <label>
            {{ t("noticeEdit.startDate") }}
            <input v-model="form.start_at" type="datetime-local" />
            <small>{{ t("noticeEdit.startDateHint") }}</small>
          </label>
          <label>
            {{ t("noticeEdit.endDate") }}
            <input v-model="form.end_at" type="datetime-local" />
            <small>{{ t("noticeEdit.endDateHint") }}</small>
          </label>
        </div>

        <div class="modal-footer">
          <button type="button" class="hdr-btn-outlined" @click="$emit('close')">
            {{ t("noticeEdit.cancel") }}
          </button>
          <button type="submit" class="hdr-btn-primary" :disabled="saving">
            {{ saving ? t("noticeEdit.saving") : t("noticeEdit.save") }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, computed, watch } from "vue";
  import { X } from "lucide-vue-next";
  import { useI18n } from "vue-i18n";

  const { t } = useI18n();

  const props = defineProps({
    notice: { type: Object, required: true },
  });
  const emit = defineEmits(["save", "close"]);

  const lang = ref("tr");
  const saving = ref(false);

  const form = reactive({
    name: null,
    message_tr: "",
    message_en: "",
    link_text_tr: "",
    link_text_en: "",
    link_href: "",
    icon: "none",
    background_color: "#1a1a1a",
    is_active: 1,
    sort_order: 0,
    start_at: null,
    end_at: null,
  });

  const isEdit = computed(() => Boolean(form.name));

  watch(
    () => props.notice,
    (n) => {
      Object.assign(form, {
        name: n.name ?? null,
        message_tr: n.message_tr ?? "",
        message_en: n.message_en ?? "",
        link_text_tr: n.link_text_tr ?? "",
        link_text_en: n.link_text_en ?? "",
        link_href: n.link_href ?? "",
        icon: n.icon ?? "none",
        background_color: n.background_color ?? "#1a1a1a",
        is_active: n.is_active ?? 1,
        sort_order: n.sort_order ?? 0,
        start_at: n.start_at ?? null,
        end_at: n.end_at ?? null,
      });
    },
    { immediate: true }
  );

  async function onSubmit() {
    if (saving.value) return;
    saving.value = true;
    try {
      await Promise.resolve(emit("save", { ...form }));
    } finally {
      saving.value = false;
    }
  }
</script>

<style lang="scss" scoped>
  @use "@/assets/scss/variables" as *;

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    @include dark {
      background: rgba(0, 0, 0, 0.7);
    }
  }

  .modal {
    background: $l-bg;
    border-radius: 8px;
    width: min(640px, 92vw);
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    @include dark {
      background: $d-bg-card;
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-bottom-color: $d-border;
    }
    h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      color: $l-text-900;
      @include dark {
        color: $d-text;
      }
    }
  }

  .icon-btn {
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 4px;
    color: $l-text-500;
    &:hover {
      color: $l-text-900;
    }
    @include dark {
      color: $d-text-muted;
      &:hover {
        color: $d-text;
      }
    }
  }

  .modal-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid $l-border;
    @include dark {
      border-bottom-color: $d-border;
    }
  }

  .tabs button {
    background: transparent;
    border: 0;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    color: $l-text-500;
    border-bottom: 2px solid transparent;
    &.active {
      color: $l-text-900;
      border-bottom-color: $brand;
      font-weight: 500;
    }
    @include dark {
      color: $d-text-muted;
      &.active {
        color: $d-text;
      }
    }
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }

  label input,
  label textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid $l-border;
    border-radius: 4px;
    padding: 8px 10px;
    font-size: 13px;
    font-family: inherit;
    background: $l-bg;
    color: $l-text-900;
    &:focus {
      outline: none;
      border-color: $brand;
    }
    @include dark {
      background-color: $d-bg-elevated !important;
      border-color: rgba(255, 255, 255, 0.12) !important;
      color: $d-text !important;
      &:focus {
        border-color: $brand !important;
        background-color: $d-bg-card !important;
      }
    }
  }

  label small {
    color: $l-text-500;
    font-size: 11px;
    @include dark {
      color: $d-text-faint;
    }
  }

  .required {
    color: #dc2626;
  }

  .row {
    display: flex;
    gap: 12px;
  }

  .row.two label {
    flex: 1;
  }

  .toggle {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid $l-border;
    @include dark {
      border-top-color: $d-border;
    }
  }

  .modal-footer .hdr-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .color-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-input {
    width: 44px;
    height: 32px;
    padding: 2px;
    border: 1px solid $l-border;
    border-radius: 4px;
    cursor: pointer;
    @include dark {
      background-color: $d-bg-elevated !important;
      border-color: rgba(255, 255, 255, 0.12) !important;
    }
  }

  .color-text {
    flex: 1;
    font-family: monospace;
  }

  .color-reset {
    padding: 6px 12px;
    background: transparent;
    border: 1px solid $l-border;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: $l-text-700;
    font-family: inherit;

    &:hover {
      background: $l-bg-muted;
    }

    @include dark {
      border-color: $d-border;
      color: $d-text-muted;

      &:hover {
        background-color: $d-bg-hover;
        color: $d-text;
      }
    }
  }
</style>
