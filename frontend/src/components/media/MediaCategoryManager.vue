<template>
  <MediaModal
    v-model:open="open"
    :title="t('media.categories.manageTitle')"
    :close-label="t('media.categories.close')"
    width="52rem"
  >
    <form class="mcat__form" @submit.prevent="create">
      <div class="mcat__field mcat__field--wide">
        <label for="mcat-name">{{ t("media.categories.name") }}</label>
        <input
          id="mcat-name"
          v-model="draft.categoryName"
          type="text"
          maxlength="100"
          required
          :placeholder="t('media.categories.namePlaceholder')"
          :disabled="loading"
        />
      </div>
      <div class="mcat__field">
        <label for="mcat-type">{{ t("media.categories.type") }}</label>
        <select id="mcat-type" v-model="draft.categoryType" :disabled="loading">
          <option v-for="type in TYPES" :key="type" :value="type">
            {{ t(`media.categories.types.${type}`) }}
          </option>
        </select>
      </div>
      <div class="mcat__field">
        <label for="mcat-parent">{{ t("media.categories.parent") }}</label>
        <select id="mcat-parent" v-model="draft.parentCategory" :disabled="loading">
          <option value="">{{ t("media.categories.noParent") }}</option>
          <option v-for="category in activeCategories" :key="category.name" :value="category.name">
            {{ category.categoryName }}
          </option>
        </select>
      </div>
      <div class="mcat__field">
        <label for="mcat-color">{{ t("media.categories.color") }}</label>
        <input id="mcat-color" v-model="draft.color" type="color" :disabled="loading" />
      </div>
      <div class="mcat__field mcat__field--wide">
        <label for="mcat-description">{{ t("media.categories.description") }}</label>
        <input
          id="mcat-description"
          v-model="draft.description"
          type="text"
          maxlength="500"
          :disabled="loading"
        />
      </div>
      <button class="mcat__primary" type="submit" :disabled="loading || !draft.categoryName.trim()">
        <AppIcon name="plus" :size="14" />
        {{ t("media.categories.create") }}
      </button>
    </form>

    <p class="mcat__model-note">{{ t("media.categories.modelNote") }}</p>

    <div v-if="loading && !categories.length" class="mcat__empty" role="status">
      {{ t("media.categories.loading") }}
    </div>
    <div v-else-if="!categories.length" class="mcat__empty">
      {{ t("media.categories.empty") }}
    </div>
    <ul v-else class="mcat__list" :aria-label="t('media.categories.listLabel')">
      <li v-for="category in categories" :key="category.name" class="mcat__row">
        <template v-if="editing === category.name">
          <div class="mcat__edit">
            <input v-model="editDraft.categoryName" type="text" maxlength="100" />
            <select v-model="editDraft.categoryType">
              <option v-for="type in TYPES" :key="type" :value="type">
                {{ t(`media.categories.types.${type}`) }}
              </option>
            </select>
            <select v-model="editDraft.parentCategory">
              <option value="">{{ t("media.categories.noParent") }}</option>
              <option
                v-for="parent in activeCategories.filter((row) => row.name !== category.name)"
                :key="parent.name"
                :value="parent.name"
              >
                {{ parent.categoryName }}
              </option>
            </select>
            <input
              v-model="editDraft.color"
              type="color"
              :aria-label="t('media.categories.color')"
            />
            <input
              v-model="editDraft.description"
              type="text"
              maxlength="500"
              :placeholder="t('media.categories.description')"
            />
          </div>
          <div class="mcat__actions">
            <button type="button" :disabled="loading" @click="saveEdit(category.name)">
              {{ t("media.categories.save") }}
            </button>
            <button type="button" :disabled="loading" @click="editing = ''">
              {{ t("media.categories.cancel") }}
            </button>
          </div>
        </template>
        <template v-else>
          <span class="mcat__dot" :style="{ backgroundColor: category.color || '#9ca3af' }" />
          <span class="mcat__main">
            <strong>{{ category.categoryName }}</strong>
            <small>
              {{ t(`media.categories.types.${category.categoryType}`) }} ·
              {{ t("media.categories.assignmentCount", { count: category.assignmentCount }) }}
              <template v-if="!category.isActive"> · {{ t("media.categories.inactive") }}</template>
            </small>
          </span>
          <div class="mcat__actions">
            <button type="button" :disabled="loading" @click="startEdit(category)">
              {{ t("media.categories.edit") }}
            </button>
            <button
              type="button"
              :disabled="loading"
              @click="
                emit('update', { id: category.name, patch: { isActive: !category.isActive } })
              "
            >
              {{
                category.isActive
                  ? t("media.categories.deactivate")
                  : t("media.categories.activate")
              }}
            </button>
            <button
              type="button"
              class="mcat__danger"
              :disabled="loading || category.assignmentCount > 0"
              :title="category.assignmentCount ? t('media.categories.deleteUsed') : ''"
              @click="askDelete(category.name)"
            >
              {{ t("media.categories.delete") }}
            </button>
          </div>
        </template>
      </li>
    </ul>
  </MediaModal>
</template>

<script setup>
  import { computed, reactive, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import MediaModal from "@/components/media/MediaModal.vue";

  const TYPES = [
    "content_type",
    "usage_purpose",
    "tenant",
    "product",
    "campaign",
    "workflow",
    "custom",
  ];

  const props = defineProps({
    categories: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  });
  const emit = defineEmits(["create", "update", "delete"]);
  const open = defineModel("open", { type: Boolean, default: false });
  const { t } = useI18n();

  const blank = () => ({
    categoryName: "",
    categoryType: "custom",
    parentCategory: "",
    description: "",
    color: "#64748b",
  });
  const draft = reactive(blank());
  const editing = ref("");
  const editDraft = reactive(blank());
  const activeCategories = computed(() => props.categories.filter((row) => row.isActive));

  function create() {
    const categoryName = draft.categoryName.trim();
    if (!categoryName || props.loading) return;
    emit("create", { ...draft, categoryName });
    Object.assign(draft, blank());
  }

  function startEdit(category) {
    editing.value = category.name;
    Object.assign(editDraft, {
      categoryName: category.categoryName,
      categoryType: category.categoryType,
      parentCategory: category.parentCategory,
      description: category.description,
      color: category.color || "#64748b",
    });
  }

  function saveEdit(id) {
    const categoryName = editDraft.categoryName.trim();
    if (!categoryName || props.loading) return;
    emit("update", { id, patch: { ...editDraft, categoryName } });
    editing.value = "";
  }

  function askDelete(id) {
    if (window.confirm(t("media.categories.deleteConfirm"))) emit("delete", id);
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .mcat__form {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: media.$s-3;
    padding-bottom: media.$s-4;
    border-bottom: 1px solid $l-border;

    @include dark {
      border-color: $d-border;
    }

    @media (max-width: media.$m-bp-md) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .mcat__field {
    display: grid;
    gap: media.$s-1;

    label {
      @include media.text("xs");
      color: $l-text-600;
    }

    input,
    select {
      min-width: 0;
      min-height: 2.5rem;
      padding: media.$s-2;
      border: 1px solid $l-border;
      border-radius: media.$r-md;
      background: $l-bg;
      color: $l-text-900;

      @include dark {
        background: $d-bg;
        border-color: $d-border;
        color: $d-text;
      }
    }

    input[type="color"] {
      width: 100%;
      padding: 0.2rem;
    }
  }

  .mcat__field--wide {
    grid-column: span 2;
  }

  .mcat__primary {
    @include media.button("primary");
    align-self: end;
    justify-content: center;
  }

  .mcat__model-note,
  .mcat__empty {
    margin: media.$s-4 0;
    color: $l-text-500;
    @include media.text("sm");

    @include dark {
      color: $d-text-muted;
    }
  }

  .mcat__list {
    display: grid;
    gap: media.$s-2;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .mcat__row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    min-height: 3.5rem;
    padding: media.$s-3;
    border: 1px solid $l-border;
    border-radius: media.$r-md;

    @include dark {
      border-color: $d-border;
    }

    @media (max-width: media.$m-bp-md) {
      align-items: flex-start;
      flex-wrap: wrap;
    }
  }

  .mcat__dot {
    width: 0.8rem;
    height: 0.8rem;
    flex: 0 0 auto;
    border-radius: 50%;
  }

  .mcat__main {
    display: grid;
    flex: 1;
    min-width: 8rem;

    small {
      color: $l-text-500;

      @include dark {
        color: $d-text-muted;
      }
    }
  }

  .mcat__actions {
    display: flex;
    gap: media.$s-1;
    margin-inline-start: auto;

    button {
      @include media.button;
      min-height: 2.25rem;
      padding: media.$s-1 media.$s-2;
    }
  }

  .mcat__danger {
    color: #dc2626;
  }

  .mcat__edit {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 3rem 2fr;
    gap: media.$s-2;
    flex: 1;

    input,
    select {
      min-width: 0;
      min-height: 2.5rem;
      padding: media.$s-2;
      border: 1px solid $l-border;
      border-radius: media.$r-md;
      background: $l-bg;
      color: $l-text-900;

      @include dark {
        background: $d-bg;
        border-color: $d-border;
        color: $d-text;
      }
    }

    input[type="color"] {
      padding: 0.2rem;
    }

    @media (max-width: media.$m-bp-md) {
      grid-template-columns: 1fr;
      flex-basis: 100%;
    }
  }
</style>
