<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">Talep Tipleri</h1>
        <p class="hd-page-sub">{{ items.length }} kayıt</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" />
        <button class="hd-action" @click="reload">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
        <button class="hd-btn-primary" @click="openCreate">
          <AppIcon name="plus" :size="14" /><span>Yeni Tip</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else-if="items.length === 0" class="hd-empty">
      <div class="hd-empty-icon"><AppIcon name="tag" :size="28" /></div>
      <h3 class="hd-empty-title">Henüz talep tipi yok</h3>
      <p class="hd-empty-sub">"Yeni Tip" ile ilk kategoriyi oluşturun.</p>
    </div>

    <!-- List (default fallback when viewMode is unknown) -->
    <div v-else-if="!['table', 'grid', 'kanban'].includes(viewMode)" class="space-y-2">
      <div v-for="t in items" :key="t.name" class="hd-row">
        <div class="flex-1">
          <p class="hd-row-title">{{ t.name }}</p>
          <p v-if="t.description" class="hd-row-meta-line">{{ t.description }}</p>
        </div>
        <button class="hd-action" @click="openEdit(t)">
          <AppIcon name="edit-2" :size="13" /><span>Düzenle</span>
        </button>
        <button class="hd-action hd-action-danger" @click="confirmDelete(t)">
          <AppIcon name="trash-2" :size="13" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/10">
            <th class="tbl-th">AD</th>
            <th class="tbl-th">AÇIKLAMA</th>
            <th class="tbl-th text-right">İŞLEM</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in items"
            :key="t.name"
            class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
            @click="openEdit(t)"
          >
            <td class="tbl-td font-semibold text-gray-800 dark:text-gray-200">{{ t.name }}</td>
            <td class="tbl-td text-gray-500 dark:text-gray-400">{{ t.description || "—" }}</td>
            <td class="tbl-td text-right" @click.stop>
              <div class="flex items-center justify-end gap-1.5">
                <button class="hd-action" @click="openEdit(t)">
                  <AppIcon name="edit-2" :size="13" />
                </button>
                <button class="hd-action hd-action-danger" @click="confirmDelete(t)">
                  <AppIcon name="trash-2" :size="13" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grid -->
    <div v-else-if="viewMode === 'grid'" class="list-grid">
      <div
        v-for="t in items"
        :key="t.name"
        class="list-grid-card cursor-pointer"
        @click="openEdit(t)"
      >
        <div class="flex items-start gap-2 mb-2">
          <div
            class="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0"
          >
            <AppIcon name="tag" :size="16" />
          </div>
          <span class="list-grid-card-title flex-1 min-w-0 break-words">{{ t.name }}</span>
        </div>
        <p v-if="t.description" class="text-xs text-gray-500 dark:text-gray-400 leading-snug">
          {{ t.description }}
        </p>
        <p v-else class="text-xs text-gray-400 italic">Açıklama yok</p>
        <div class="flex items-center gap-1.5 mt-3" @click.stop>
          <button class="hd-action flex-1" @click="openEdit(t)">
            <AppIcon name="edit-2" :size="12" /><span>Düzenle</span>
          </button>
          <button class="hd-action hd-action-danger" @click="confirmDelete(t)">
            <AppIcon name="trash-2" :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- Kanban (tek kolon — status field yok) -->
    <div v-else-if="viewMode === 'kanban'" class="list-kanban">
      <div class="kanban-col">
        <div class="kanban-col-header" style="border-color: #7c3aed">
          <span>Talep Tipleri</span>
          <span class="kanban-col-count">{{ items.length }}</span>
        </div>
        <div class="kanban-col-body">
          <div v-for="t in items" :key="t.name" class="kanban-card" @click="openEdit(t)">
            <div class="kanban-card-title truncate">{{ t.name }}</div>
            <div v-if="t.description" class="kanban-card-meta truncate">{{ t.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Create/Edit -->
    <div v-if="modalOpen" class="hd-modal-backdrop" @click.self="closeModal">
      <div class="hd-modal">
        <header class="hd-modal-header">
          <h3>{{ form.isNew ? "Yeni Talep Tipi" : "Talep Tipini Düzenle" }}</h3>
          <button class="hd-action" @click="closeModal">
            <AppIcon name="x" :size="14" />
          </button>
        </header>
        <div class="hd-modal-body space-y-3">
          <div>
            <label class="hd-label">Ad <span class="text-rose-500">*</span></label>
            <input
              v-model="form.name"
              class="hd-input"
              :disabled="!form.isNew"
              placeholder="Sipariş İptali"
            />
          </div>
          <div>
            <label class="hd-label">Açıklama</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="hd-textarea"
              placeholder="Bu kategorinin ne için kullanıldığı..."
            ></textarea>
          </div>
        </div>
        <footer class="hd-modal-footer">
          <button class="hd-action" @click="closeModal">İptal</button>
          <button class="hd-btn-primary" :disabled="saving || !form.name.trim()" @click="save">
            <AppIcon name="check" :size="14" />
            <span>{{ saving ? "Kaydediliyor..." : "Kaydet" }}</span>
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";

  const toast = useToast();

  const items = ref([]);
  const loading = ref(false);

  const modalOpen = ref(false);
  const saving = ref(false);
  const form = ref({ isNew: true, name: "", description: "", original: null });

  const { viewMode } = useListViewMode("hd-ticket-types", "list");

  async function reload() {
    loading.value = true;
    try {
      const res = await api.getList("HD Ticket Type", {
        fields: ["name", "description"],
        order_by: "name asc",
        limit_page_length: 200,
      });
      items.value = res.data || [];
    } catch (e) {
      toast.error(e.message || "Liste alınamadı");
    } finally {
      loading.value = false;
    }
  }

  function openCreate() {
    form.value = { isNew: true, name: "", description: "", original: null };
    modalOpen.value = true;
  }

  function openEdit(t) {
    form.value = {
      isNew: false,
      name: t.name,
      description: t.description || "",
      original: t.name,
    };
    modalOpen.value = true;
  }

  function closeModal() {
    if (saving.value) return;
    modalOpen.value = false;
  }

  async function save() {
    saving.value = true;
    try {
      if (form.value.isNew) {
        await api.createDoc("HD Ticket Type", {
          name: form.value.name.trim(),
          description: form.value.description.trim() || null,
        });
        toast.success("Talep tipi oluşturuldu");
      } else {
        await api.updateDoc("HD Ticket Type", form.value.original, {
          description: form.value.description.trim() || null,
        });
        toast.success("Güncellendi");
      }
      modalOpen.value = false;
      await reload();
    } catch (e) {
      toast.error(e.message || "Kaydedilemedi");
    } finally {
      saving.value = false;
    }
  }

  async function confirmDelete(t) {
    if (!confirm(`"${t.name}" talep tipi silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await api.deleteDoc("HD Ticket Type", t.name);
      toast.success("Silindi");
      await reload();
    } catch (e) {
      toast.error(e.message || "Silinemedi (bağlı talep var olabilir)");
    }
  }

  onMounted(reload);
</script>

<!-- Modal/label/danger stilleri global helpdesk.scss'te -->
