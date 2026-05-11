<template>
  <div class="notice-row">
    <button class="drag-handle" type="button" aria-label="Sürükle">
      <GripVertical :size="16" />
    </button>

    <div class="content">
      <div class="message">
        <span v-if="iconVisible(notice.icon)" class="icon">{{ notice.icon }}</span>
        <span class="text">{{ notice.message_tr }}</span>
      </div>
      <div class="meta">
        <span v-if="notice.link_text_tr && notice.link_href" class="link">
          🔗 {{ notice.link_text_tr }} → {{ notice.link_href }}
        </span>
        <span v-if="notice.start_at || notice.end_at" class="dates">
          🗓 {{ formatDate(notice.start_at) || "Hemen" }} → {{ formatDate(notice.end_at) || "Süresiz" }}
        </span>
      </div>
    </div>

    <label class="toggle" :title="notice.is_active ? 'Aktif (tıkla pasifleştir)' : 'Pasif (tıkla aktifleştir)'">
      <input
        type="checkbox"
        :checked="!!notice.is_active"
        @change="$emit('toggle-active')"
      />
      <span class="slider" />
    </label>

    <div class="actions">
      <button class="icon-btn" type="button" aria-label="Düzenle" @click="$emit('edit')">
        <Pencil :size="16" />
      </button>
      <button class="icon-btn danger" type="button" aria-label="Sil" @click="$emit('delete')">
        <Trash2 :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { GripVertical, Pencil, Trash2 } from "lucide-vue-next";

defineProps({
  notice: { type: Object, required: true },
});
defineEmits(["toggle-active", "edit", "delete"]);

function iconVisible(icon) {
  return icon && icon !== "none";
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}
</script>

<style lang="scss" scoped>
.notice-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 6px;
  margin-bottom: 8px;
}
.drag-handle {
  background: transparent; border: 0; cursor: grab; padding: 4px;
  color: #9ca3af;
  &:active { cursor: grabbing; }
}
.content { flex: 1; min-width: 0; }
.message {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 500; color: #111;
}
.icon { font-size: 16px; }
.text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta {
  display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px;
  font-size: 11px; color: #6b7280;
}
.toggle {
  position: relative; width: 36px; height: 20px; cursor: pointer;
  input { opacity: 0; width: 100%; height: 100%; cursor: pointer; }
  .slider {
    position: absolute; inset: 0; background: #d1d5db; border-radius: 12px;
    transition: background 0.15s;
    &::before {
      content: ""; position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px; background: #fff; border-radius: 50%;
      transition: transform 0.15s;
    }
  }
  input:checked + .slider { background: #ffb800; }
  input:checked + .slider::before { transform: translateX(16px); }
}
.actions { display: flex; gap: 4px; }
.icon-btn {
  background: transparent; border: 0; cursor: pointer; padding: 6px;
  border-radius: 4px; color: #6b7280;
  &:hover { background: #f3f4f6; color: #111; }
  &.danger:hover { color: #dc2626; }
}
</style>
