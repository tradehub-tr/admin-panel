<template>
  <div class="modal-backdrop modal-anim" @click.self="$emit('close')">
    <div class="modal modal-anim__panel" role="dialog" aria-labelledby="tile-modal-title">
      <div class="modal-header">
        <h2 id="tile-modal-title">
          {{ isEdit ? t("showcase.edit.editTitle") : t("showcase.edit.newTitle") }}
        </h2>
        <button class="icon-btn" :aria-label="t('showcase.edit.close')" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>

      <form class="modal-body" @submit.prevent="onSubmit">
        <!-- Tip + Boyut -->
        <div class="row two">
          <label>
            {{ t("showcase.edit.type") }}
            <div class="chip-group">
              <button
                v-for="opt in typeOptions"
                :key="opt.value"
                type="button"
                :class="{ active: form.tile_type === opt.value }"
                @click="form.tile_type = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </label>
          <label>
            {{ t("showcase.width") }}
            <input v-model.number="form.col_span" type="number" min="1" max="6" />
          </label>
          <label>
            {{ t("showcase.height") }}
            <input v-model.number="form.row_span" type="number" min="1" max="6" />
          </label>
        </div>

        <div class="tabs">
          <button type="button" :class="{ active: lang === 'tr' }" @click="lang = 'tr'">
            Türkçe
          </button>
          <button type="button" :class="{ active: lang === 'en' }" @click="lang = 'en'">
            English
          </button>
        </div>

        <!-- KATEGORİ alanları -->
        <template v-if="form.tile_type === 'category'">
          <div v-show="lang === 'tr'" class="field-group">
            <label>
              {{ t("showcase.edit.labelTr") }}
              <input v-model="form.label_tr" type="text" maxlength="60" />
            </label>
            <label>
              {{ t("showcase.edit.hoverTr") }}
              <input
                v-model="form.hover_text_tr"
                type="text"
                maxlength="60"
                :placeholder="t('showcase.edit.hoverPlaceholderTr')"
              />
            </label>
          </div>
          <div v-show="lang === 'en'" class="field-group">
            <label>
              {{ t("showcase.edit.labelEn") }}
              <input v-model="form.label_en" type="text" maxlength="60" />
            </label>
            <label>
              {{ t("showcase.edit.hoverEn") }}
              <input
                v-model="form.hover_text_en"
                type="text"
                maxlength="60"
                :placeholder="t('showcase.edit.hoverPlaceholderEn')"
              />
            </label>
          </div>
          <label>
            {{ t("showcase.edit.image") }}
            <input
              v-model="form.image"
              type="text"
              :placeholder="t('showcase.edit.imagePlaceholder')"
            />
            <small>{{ t("showcase.edit.imageHint") }}</small>
          </label>
          <label>
            {{ t("showcase.edit.linkHref") }}
            <input
              v-model="form.link_href"
              type="text"
              :placeholder="t('showcase.edit.linkHrefPlaceholder')"
            />
          </label>
        </template>

        <!-- PROMO alanları -->
        <template v-else>
          <div v-show="lang === 'tr'" class="field-group">
            <label>
              {{ t("showcase.edit.promoBadgeTr") }}
              <input
                v-model="form.promo_badge_tr"
                type="text"
                maxlength="30"
                :placeholder="t('showcase.edit.promoBadgePlaceholderTr')"
              />
            </label>
            <label>
              {{ t("showcase.edit.promoTitleTr") }}
              <input
                v-model="form.promo_title_tr"
                type="text"
                maxlength="60"
                :placeholder="t('showcase.edit.promoTitlePlaceholderTr')"
              />
            </label>
            <label>
              {{ t("showcase.edit.ctaTr") }}
              <input v-model="form.cta_text_tr" type="text" maxlength="40" />
            </label>
          </div>
          <div v-show="lang === 'en'" class="field-group">
            <label>
              {{ t("showcase.edit.promoBadgeEn") }}
              <input v-model="form.promo_badge_en" type="text" maxlength="30" />
            </label>
            <label>
              {{ t("showcase.edit.promoTitleEn") }}
              <input v-model="form.promo_title_en" type="text" maxlength="60" />
            </label>
            <label>
              {{ t("showcase.edit.ctaEn") }}
              <input v-model="form.cta_text_en" type="text" maxlength="40" />
            </label>
          </div>
          <label>
            {{ t("showcase.edit.backgroundColor") }}
            <div class="color-row">
              <input v-model="form.background_color" type="color" class="color-input" />
              <input
                v-model="form.background_color"
                type="text"
                class="color-text"
                placeholder="#cc9900"
                pattern="^#[0-9a-fA-F]{6}$"
              />
              <button type="button" class="color-reset" @click="form.background_color = '#cc9900'">
                {{ t("showcase.edit.reset") }}
              </button>
            </div>
          </label>
          <label>
            {{ t("showcase.edit.ctaHref") }}
            <input
              v-model="form.cta_href"
              type="text"
              :placeholder="t('showcase.edit.linkHrefPlaceholder')"
            />
          </label>
        </template>

        <div class="row">
          <label class="toggle">
            <input v-model="form.is_active" type="checkbox" :true-value="1" :false-value="0" />
            <span>{{ t("showcase.edit.active") }}</span>
          </label>
        </div>

        <div class="row two">
          <label>
            {{ t("showcase.edit.startDate") }}
            <input v-model="form.start_at" type="datetime-local" />
          </label>
          <label>
            {{ t("showcase.edit.endDate") }}
            <input v-model="form.end_at" type="datetime-local" />
          </label>
        </div>

        <div class="modal-footer">
          <button type="button" class="hdr-btn-outlined" @click="$emit('close')">
            {{ t("showcase.edit.cancel") }}
          </button>
          <button type="submit" class="hdr-btn-primary" :disabled="saving">
            {{ saving ? t("showcase.edit.saving") : t("showcase.edit.save") }}
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
  const props = defineProps({ tile: { type: Object, required: true } });
  const emit = defineEmits(["save", "close"]);

  const lang = ref("tr");
  const saving = ref(false);

  const typeOptions = computed(() => [
    { value: "category", label: t("showcase.type.category") },
    { value: "promo", label: t("showcase.type.promo") },
  ]);
  const form = reactive({
    name: null,
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
    sort_order: 0,
    start_at: null,
    end_at: null,
  });

  const isEdit = computed(() => Boolean(form.name));

  watch(
    () => props.tile,
    (n) => {
      Object.assign(form, {
        name: n.name ?? null,
        tile_type: n.tile_type ?? "category",
        col_span: n.col_span ?? 1,
        row_span: n.row_span ?? 1,
        label_tr: n.label_tr ?? "",
        label_en: n.label_en ?? "",
        image: n.image ?? "",
        link_href: n.link_href ?? "",
        hover_text_tr: n.hover_text_tr ?? "",
        hover_text_en: n.hover_text_en ?? "",
        promo_badge_tr: n.promo_badge_tr ?? "",
        promo_badge_en: n.promo_badge_en ?? "",
        promo_title_tr: n.promo_title_tr ?? "",
        promo_title_en: n.promo_title_en ?? "",
        background_color: n.background_color ?? "#cc9900",
        cta_text_tr: n.cta_text_tr ?? "",
        cta_text_en: n.cta_text_en ?? "",
        cta_href: n.cta_href ?? "",
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
    padding: 16px;
  }

  .modal {
    background: $l-bg;
    border-radius: 12px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow-y: auto;
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
      border-color: $d-border;
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
    padding: 6px;
    border-radius: 4px;
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
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .tabs {
    display: flex;
    gap: 4px;
    button {
      flex: 1;
      padding: 8px;
      font-size: 13px;
      font-family: inherit;
      background: $l-bg-muted;
      border: 1px solid $l-border;
      border-radius: 6px;
      cursor: pointer;
      color: $l-text-500;
      &.active {
        background: rgba($brand, 0.08);
        border-color: $brand;
        color: $brand;
      }
      @include dark {
        background: $d-bg-hover;
        border-color: $d-border;
        color: $d-text-muted;
        &.active {
          color: $brand;
        }
      }
    }
  }

  .chip-group {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 4px;
    button {
      padding: 6px 12px;
      font-size: 12px;
      font-family: inherit;
      background: $l-bg-muted;
      border: 1px solid $l-border;
      border-radius: 6px;
      cursor: pointer;
      color: $l-text-700;
      &.active {
        background: rgba($brand, 0.08);
        border-color: $brand;
        color: $brand;
      }
      @include dark {
        background: $d-bg-hover;
        border-color: $d-border;
        color: $d-text-muted;
        &.active {
          color: $brand;
        }
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
    font-weight: 500;
    color: $l-text-700;
    @include dark {
      color: $d-text-muted;
    }
    input[type="text"],
    input[type="datetime-local"] {
      padding: 8px 10px;
      font-size: 13px;
      font-family: inherit;
      border: 1px solid $l-border;
      border-radius: 6px;
      background: $l-bg;
      color: $l-text-900;
      @include dark {
        background: $d-bg;
        border-color: $d-border;
        color: $d-text;
      }
    }
    small {
      font-size: 11px;
      color: $l-text-400;
      @include dark {
        color: $d-text-faint;
      }
    }
  }

  .row {
    display: flex;
    gap: 16px;
    &.two > label {
      flex: 1;
    }
  }

  .color-row {
    display: flex;
    gap: 8px;
    align-items: center;
    .color-input {
      width: 40px;
      height: 36px;
      padding: 2px;
      border: 1px solid $l-border;
      border-radius: 6px;
      cursor: pointer;
    }
    .color-text {
      flex: 1;
    }
    .color-reset {
      padding: 8px 12px;
      font-size: 12px;
      font-family: inherit;
      background: $l-bg-muted;
      border: 1px solid $l-border;
      border-radius: 6px;
      cursor: pointer;
      color: $l-text-500;
    }
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
    padding-top: 8px;
  }
</style>
