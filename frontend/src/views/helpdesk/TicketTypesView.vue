<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">Talep Tipleri</h1>
        <p class="hd-page-sub">{{ items.length }} kayıt</p>
      </div>
      <div class="flex items-center gap-2">
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

    <div v-else class="space-y-2">
      <div v-for="t in items" :key="t.name" class="hd-row">
        <div class="flex-1">
          <p class="hd-row-title">{{ t.name }}</p>
          <p class="hd-row-meta-line" v-if="t.description">{{ t.description }}</p>
        </div>
        <button class="hd-action" @click="openEdit(t)">
          <AppIcon name="edit-2" :size="13" /><span>Düzenle</span>
        </button>
        <button class="hd-action hd-action-danger" @click="confirmDelete(t)">
          <AppIcon name="trash-2" :size="13" />
        </button>
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
  import AppIcon from "@/components/common/AppIcon.vue";

  const toast = useToast();

  const items = ref([]);
  const loading = ref(false);

  const modalOpen = ref(false);
  const saving = ref(false);
  const form = ref({ isNew: true, name: "", description: "", original: null });

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

