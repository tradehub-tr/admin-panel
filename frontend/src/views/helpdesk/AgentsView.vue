<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">Destek Ajanları</h1>
        <p class="hd-page-sub">{{ agents.length }} ajan</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hd-action" @click="reload">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
        <button class="hd-btn-primary" @click="openCreate">
          <AppIcon name="user-plus" :size="14" /><span>Yeni Ajan</span>
        </button>
      </div>
    </div>

    <div class="hd-card hd-card-pad-sm mb-4">
      <input
        v-model="search"
        type="text"
        placeholder="Ad veya e-posta ile ara..."
        class="hd-search"
      />
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else-if="filtered.length === 0" class="hd-empty">
      <div class="hd-empty-icon"><AppIcon name="user-x" :size="28" /></div>
      <h3 class="hd-empty-title">Ajan bulunamadı</h3>
    </div>

    <div v-else class="space-y-2">
      <div v-for="a in filtered" :key="a.name" class="hd-row">
        <div class="hd-tl-avatar av-agent shrink-0">
          {{ initial(a.agent_name || a.user) }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="hd-row-title truncate">{{ a.agent_name || a.user }}</p>
          <p class="hd-row-meta-line truncate">{{ a.user }}</p>
        </div>
        <span v-if="a.is_active" class="hd-status sc-emerald">
          <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-emerald-400"></span>Aktif
        </span>
        <span v-else class="hd-status sc-gray">
          <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-400"></span>Pasif
        </span>
        <button class="hd-action" @click="toggleActive(a)">
          <AppIcon :name="a.is_active ? 'user-x' : 'user-check'" :size="13" />
          <span>{{ a.is_active ? "Pasifleştir" : "Etkinleştir" }}</span>
        </button>
      </div>
    </div>

    <!-- Modal: Create -->
    <div v-if="modalOpen" class="hd-modal-backdrop" @click.self="closeModal">
      <div class="hd-modal">
        <header class="hd-modal-header">
          <h3>Yeni Destek Ajanı</h3>
          <button class="hd-action" @click="closeModal"><AppIcon name="x" :size="14" /></button>
        </header>
        <div class="hd-modal-body space-y-3">
          <div>
            <label class="hd-label">Kullanıcı (e-posta) <span class="text-rose-500">*</span></label>
            <input v-model="form.user" class="hd-input" placeholder="ali@firma.com" />
            <p class="text-[11px] text-gray-400 mt-1">Sistemde mevcut bir kullanıcı olmalı.</p>
          </div>
          <div>
            <label class="hd-label">Görünen Ad</label>
            <input v-model="form.agent_name" class="hd-input" placeholder="Ali Yılmaz" />
          </div>
        </div>
        <footer class="hd-modal-footer">
          <button class="hd-action" @click="closeModal">İptal</button>
          <button class="hd-btn-primary" :disabled="saving || !form.user.trim()" @click="save">
            <AppIcon name="check" :size="14" />
            <span>{{ saving ? "Ekleniyor..." : "Ekle" }}</span>
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  const toast = useToast();
  const agents = ref([]);
  const loading = ref(false);
  const search = ref("");

  const modalOpen = ref(false);
  const saving = ref(false);
  const form = ref({ user: "", agent_name: "" });

  const filtered = computed(() => {
    const q = search.value.toLowerCase().trim();
    if (!q) return agents.value;
    return agents.value.filter(
      (a) =>
        (a.agent_name || "").toLowerCase().includes(q) || (a.user || "").toLowerCase().includes(q)
    );
  });

  function initial(s) {
    return s ? String(s).trim().charAt(0).toUpperCase() : "?";
  }

  async function reload() {
    loading.value = true;
    try {
      const res = await api.getList("HD Agent", {
        fields: ["name", "agent_name", "user", "is_active"],
        order_by: "agent_name asc",
        limit_page_length: 500,
      });
      agents.value = res.data || [];
    } catch (e) {
      toast.error(e.message || "Ajan listesi alınamadı");
    } finally {
      loading.value = false;
    }
  }

  function openCreate() {
    form.value = { user: "", agent_name: "" };
    modalOpen.value = true;
  }
  function closeModal() {
    if (saving.value) return;
    modalOpen.value = false;
  }

  async function save() {
    saving.value = true;
    try {
      await api.createDoc("HD Agent", {
        user: form.value.user.trim(),
        agent_name: form.value.agent_name.trim() || form.value.user.trim(),
        is_active: 1,
      });
      toast.success("Ajan eklendi");
      modalOpen.value = false;
      await reload();
    } catch (e) {
      toast.error(e.message || "Ajan eklenemedi");
    } finally {
      saving.value = false;
    }
  }

  async function toggleActive(a) {
    try {
      await api.updateDoc("HD Agent", a.name, { is_active: a.is_active ? 0 : 1 });
      toast.success(a.is_active ? "Pasifleştirildi" : "Etkinleştirildi");
      await reload();
    } catch (e) {
      toast.error(e.message || "İşlem başarısız");
    }
  }

  onMounted(reload);
</script>

<!-- Modal/label stilleri global helpdesk.scss'te -->
