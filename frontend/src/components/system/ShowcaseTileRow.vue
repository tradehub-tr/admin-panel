<template>
  <div class="tile-row">
    <button class="drag-handle" type="button" :aria-label="t('showcase.row.drag')">
      <GripVertical :size="16" />
    </button>

    <span class="badge" :class="tile.tile_type">{{ typeLabel }}</span>
    <span class="size-badge">{{ spanLabel }}</span>

    <div class="content">
      <span class="title">{{ titleText }}</span>
      <span v-if="tile.link_href || tile.cta_href" class="meta">
        {{ tile.link_href || tile.cta_href }}
      </span>
    </div>

    <label
      class="toggle"
      :title="tile.is_active ? t('showcase.row.active') : t('showcase.row.inactive')"
    >
      <input type="checkbox" :checked="!!tile.is_active" @change="$emit('toggle-active')" />
      <span class="slider" />
    </label>

    <div class="actions">
      <button
        class="icon-btn"
        type="button"
        :aria-label="t('showcase.row.edit')"
        @click="$emit('edit')"
      >
        <Pencil :size="16" />
      </button>
      <button
        class="icon-btn danger"
        type="button"
        :aria-label="t('showcase.row.delete')"
        @click="$emit('delete')"
      >
        <Trash2 :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { GripVertical, Pencil, Trash2 } from "lucide-vue-next";
  import { useI18n } from "vue-i18n";

  const { t } = useI18n();
  const props = defineProps({ tile: { type: Object, required: true } });
  defineEmits(["toggle-active", "edit", "delete"]);

  const typeLabel = computed(() =>
    props.tile.tile_type === "promo" ? t("showcase.type.promo") : t("showcase.type.category")
  );
  const spanLabel = computed(() => `${props.tile.col_span || 1}×${props.tile.row_span || 1}`);
  const titleText = computed(() =>
    props.tile.tile_type === "promo"
      ? props.tile.promo_title_tr || t("showcase.row.untitled")
      : props.tile.label_tr || t("showcase.row.untitled")
  );
</script>

<style lang="scss" scoped>
  @use "@/assets/scss/variables" as *;

  .tile-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 6px;
    margin-bottom: 8px;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .drag-handle {
    background: transparent;
    border: 0;
    cursor: grab;
    padding: 4px;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
    &:active {
      cursor: grabbing;
    }
  }

  .badge,
  .size-badge {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 3px 8px;
    border-radius: 4px;
    white-space: nowrap;
  }

  .badge.category {
    background: rgba($brand, 0.12);
    color: $brand;
  }
  .badge.promo {
    background: rgba(#cc9900, 0.15);
    color: #a67c00;
  }
  .size-badge {
    background: $l-bg-muted;
    color: $l-text-500;
    @include dark {
      background: $d-bg-hover;
      color: $d-text-muted;
    }
  }

  .content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 13px;
    font-weight: 500;
    color: $l-text-900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    @include dark {
      color: $d-text;
    }
  }

  .meta {
    font-size: 11px;
    color: $l-text-500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    @include dark {
      color: $d-text-muted;
    }
  }

  .toggle {
    position: relative;
    width: 36px;
    height: 20px;
    cursor: pointer;
    input {
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    .slider {
      position: absolute;
      inset: 0;
      background: $l-text-300;
      border-radius: 12px;
      transition: background 0.15s;
      @include dark {
        background: $d-border;
      }
      &::before {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: $l-bg;
        border-radius: 50%;
        transition: transform 0.15s;
        @include dark {
          background: $d-text;
        }
      }
    }
    input:checked + .slider {
      background: $brand;
    }
    input:checked + .slider::before {
      transform: translateX(16px);
      background: #fff;
    }
  }

  .actions {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    color: $l-text-500;
    &:hover {
      background: $l-bg-muted;
      color: $l-text-900;
    }
    &.danger:hover {
      color: #dc2626;
    }
    @include dark {
      color: $d-text-muted;
      &:hover {
        background: $d-bg-hover;
        color: $d-text;
      }
      &.danger:hover {
        color: #fca5a5;
      }
    }
  }
</style>
