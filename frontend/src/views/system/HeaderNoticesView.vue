<template>
  <div class="header-notices-page">
    <header class="page-header">
      <div>
        <h1>Header Duyuruları</h1>
        <p class="subtitle">Storefront header'ında kayan duyuru şeridini buradan yönet.</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openCreate">
        <Plus :size="16" /> Yeni Duyuru
      </button>
    </header>

    <section class="preview-section">
      <h2>Canlı Önizleme</h2>
      <HeaderNoticePreview :notices="activeOrdered" />
    </section>

    <section class="list-section">
      <h2>Tüm Duyurular</h2>
      <p v-if="loading" class="state">Yükleniyor...</p>
      <p v-else-if="error" class="state error">{{ error }}</p>
      <p v-else-if="!notices.length" class="state">Henüz duyuru yok. "Yeni Duyuru" ile başlayın.</p>

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

    <NoticeEditModal
      v-if="editing"
      :notice="editing"
      @save="onSave"
      @close="editing = null"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import draggable from "vuedraggable";
import { Plus } from "lucide-vue-next";
import { useHeaderNotices } from "@/composables/useHeaderNotices";
import HeaderNoticePreview from "@/components/system/HeaderNoticePreview.vue";
import NoticeRow from "@/components/system/NoticeRow.vue";
import NoticeEditModal from "@/components/system/NoticeEditModal.vue";

const { notices, loading, error, fetchAll, save, remove, reorder, toggleActive } =
  useHeaderNotices();

const editing = ref(null);

const activeOrdered = computed(() =>
  [...notices.value]
    .filter((n) => n.is_active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
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
  if (confirm(`"${preview}..." silinsin mi?`)) {
    await remove(n.name);
  }
}

onMounted(fetchAll);
</script>

<style lang="scss" scoped>
.header-notices-page { padding: 24px; max-width: 960px; }
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 24px;
  h1 { font-size: 22px; font-weight: 600; margin: 0; color: #111; }
  .subtitle { font-size: 13px; color: #6b7280; margin: 4px 0 0; }
}
.preview-section { margin-bottom: 24px; }
.preview-section h2,
.list-section h2 {
  font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;
  color: #6b7280; font-weight: 600; margin: 0 0 8px;
}
.state {
  padding: 24px; background: #f9fafb; border-radius: 6px;
  color: #6b7280; text-align: center; font-size: 13px;
  &.error { color: #dc2626; background: #fee2e2; }
}
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 4px; border: 1px solid transparent;
  cursor: pointer; font-size: 13px; font-weight: 500;
}
.btn-primary { background: #ffb800; color: #111; }
</style>
