<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">Hazır Yanıtlar</h1>
        <p class="hd-page-sub">{{ items.length }} şablon</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" />
        <button class="hd-action" @click="reload">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
        <button class="hd-btn-primary" @click="openCreate">
          <AppIcon name="plus" :size="14" /><span>Yeni Şablon</span>
        </button>
      </div>
    </div>

    <div class="hd-card hd-card-pad-sm mb-4 flex items-center gap-2 flex-wrap">
      <input
        v-model="search"
        type="text"
        placeholder="Başlık ara..."
        class="hd-search flex-1 min-w-0"
      />
      <select v-model="categoryFilter" class="hd-select-sm">
        <option value="">Tüm Kategoriler</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else-if="filtered.length === 0" class="hd-empty">
      <div class="hd-empty-icon"><AppIcon name="message-square" :size="28" /></div>
      <h3 class="hd-empty-title">Şablon bulunamadı</h3>
      <p class="hd-empty-sub">Yeni şablon oluşturarak başlayın.</p>
    </div>

    <!-- List (default fallback when viewMode is unknown) -->
    <div v-else-if="!['table', 'grid', 'kanban'].includes(viewMode)" class="space-y-2">
      <div v-for="r in filtered" :key="r.name" class="hd-row">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <p class="hd-row-title m-0 truncate">{{ r.title }}</p>
            <span v-if="r.category" class="hd-team-chip">{{ r.category }}</span>
            <span class="hd-prio-chip" :class="scopeCls(r.scope)">{{ scopeLabel(r.scope) }}</span>
            <span v-if="!r.is_active" class="hd-status sc-gray">Pasif</span>
          </div>
          <p class="hd-row-meta-line">{{ truncate(stripHtml(r.content), 140) }}</p>
        </div>
        <button class="hd-action" @click="openEdit(r)">
          <AppIcon name="edit-2" :size="13" /><span>Düzenle</span>
        </button>
        <button class="hd-action hd-action-danger" @click="confirmDelete(r)">
          <AppIcon name="trash-2" :size="13" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/10">
            <th class="tbl-th">BAŞLIK</th>
            <th class="tbl-th">KATEGORİ</th>
            <th class="tbl-th">KAPSAM</th>
            <th class="tbl-th">DURUM</th>
            <th class="tbl-th text-right">İŞLEM</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in filtered"
            :key="r.name"
            class="tbl-row border-b border-gray-50 dark:border-white/5"
          >
            <td class="tbl-td">
              <div class="font-semibold text-gray-800 dark:text-gray-200 truncate">
                {{ r.title }}
              </div>
              <div class="text-[11px] text-gray-400 truncate max-w-[360px]">
                {{ truncate(stripHtml(r.content), 80) }}
              </div>
            </td>
            <td class="tbl-td">
              <span v-if="r.category" class="hd-team-chip">{{ r.category }}</span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="tbl-td">
              <span class="hd-prio-chip" :class="scopeCls(r.scope)">{{ scopeLabel(r.scope) }}</span>
            </td>
            <td class="tbl-td">
              <span v-if="r.is_active" class="hd-status sc-emerald">Aktif</span>
              <span v-else class="hd-status sc-gray">Pasif</span>
            </td>
            <td class="tbl-td text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button class="hd-action" @click="openEdit(r)">
                  <AppIcon name="edit-2" :size="13" />
                </button>
                <button class="hd-action hd-action-danger" @click="confirmDelete(r)">
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
        v-for="r in filtered"
        :key="r.name"
        class="list-grid-card cursor-pointer"
        @click="openEdit(r)"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <span class="list-grid-card-title">{{ r.title }}</span>
          <span class="hd-prio-chip" :class="scopeCls(r.scope)">{{ scopeLabel(r.scope) }}</span>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap mb-2">
          <span v-if="r.category" class="hd-team-chip">{{ r.category }}</span>
          <span v-if="!r.is_active" class="hd-status sc-gray">Pasif</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 leading-snug">
          {{ truncate(stripHtml(r.content), 180) }}
        </p>
        <div class="flex items-center gap-1.5 mt-3" @click.stop>
          <button class="hd-action flex-1" @click="openEdit(r)">
            <AppIcon name="edit-2" :size="12" /><span>Düzenle</span>
          </button>
          <button class="hd-action hd-action-danger" @click="confirmDelete(r)">
            <AppIcon name="trash-2" :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- Kanban (by scope) -->
    <div v-else-if="viewMode === 'kanban'" class="list-kanban">
      <div v-for="col in kanbanColumns" :key="col.key" class="kanban-col">
        <div class="kanban-col-header" :style="{ borderColor: col.color }">
          <span>{{ col.label }}</span>
          <span class="kanban-col-count">{{ col.items.length }}</span>
        </div>
        <div class="kanban-col-body">
          <div v-for="r in col.items" :key="r.name" class="kanban-card" @click="openEdit(r)">
            <div class="kanban-card-title truncate">{{ r.title }}</div>
            <div class="flex items-center gap-1 flex-wrap mt-1 mb-1">
              <span v-if="r.category" class="hd-team-chip">{{ r.category }}</span>
              <span v-if="!r.is_active" class="hd-status sc-gray">Pasif</span>
            </div>
            <div class="kanban-card-meta truncate">{{ truncate(stripHtml(r.content), 80) }}</div>
          </div>
          <div
            v-if="col.items.length === 0"
            class="text-center py-6 text-xs text-gray-400 dark:text-gray-500"
          >
            Kayıt yok
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="modalOpen" class="hd-modal-backdrop" @click.self="closeModal">
      <div class="hd-modal" style="max-width: 640px">
        <header class="hd-modal-header">
          <h3>{{ form.isNew ? "Yeni Hazır Yanıt" : "Şablonu Düzenle" }}</h3>
          <button class="hd-action" @click="closeModal"><AppIcon name="x" :size="14" /></button>
        </header>
        <div class="hd-modal-body space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="hd-label">Başlık <span class="text-rose-500">*</span></label>
              <input
                v-model="form.title"
                class="hd-input"
                :disabled="!form.isNew"
                placeholder="Sipariş Bekleniyor Yanıtı"
              />
            </div>
            <div>
              <label class="hd-label">Kategori</label>
              <select v-model="form.category" class="hd-input">
                <option value="">— Seç —</option>
                <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="hd-label">Kapsam</label>
              <select v-model="form.scope" class="hd-input">
                <option value="platform">Platform (tüm ajanlar)</option>
                <option value="team">Ekip</option>
                <option value="personal">Kişisel</option>
              </select>
            </div>
            <div v-if="form.scope === 'team'">
              <label class="hd-label">Ekip <span class="text-rose-500">*</span></label>
              <select v-model="form.created_by_team" class="hd-input">
                <option value="">— Seç —</option>
                <option v-for="t in teams" :key="t.name" :value="t.name">
                  {{ t.team_name || t.name }}
                </option>
              </select>
            </div>
          </div>
          <div>
            <label class="hd-label">İçerik <span class="text-rose-500">*</span></label>
            <textarea
              v-model="form.content"
              rows="8"
              class="hd-textarea"
              placeholder="Merhaba {{customer_name}}, talebiniz {{ticket_id}} numara ile alındı..."
            ></textarea>
            <p class="text-[11px] text-gray-400 mt-1">
              Değişkenler:
              <code v-pre>{{ ticket_id }}</code
              >, <code v-pre>{{ customer_name }}</code
              >,
              <code v-pre>{{ order_id }}</code>
            </p>
          </div>
          <label class="flex items-center gap-2 text-xs">
            <input v-model="form.is_active" type="checkbox" />
            Aktif
          </label>
        </div>
        <footer class="hd-modal-footer">
          <button class="hd-action" @click="closeModal">İptal</button>
          <button
            class="hd-btn-primary"
            :disabled="saving || !form.title.trim() || !form.content.trim()"
            @click="save"
          >
            <AppIcon name="check" :size="14" />
            <span>{{ saving ? "Kaydediliyor..." : "Kaydet" }}</span>
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
  import { useListViewMode } from "@/composables/useListViewMode";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";

  const toast = useToast();

  const items = ref([]);
  const teams = ref([]);
  const loading = ref(false);
  const search = ref("");
  const categoryFilter = ref("");

  const categories = ["Genel", "Sipariş", "Kargo", "Ödeme", "Ürün", "İade"];

  const modalOpen = ref(false);
  const saving = ref(false);
  const form = ref(emptyForm());

  const { viewMode } = useListViewMode("hd-canned", "list");

  const SCOPE_META = {
    platform: { label: "Platform", color: "#3b82f6" },
    team: { label: "Ekip", color: "#f59e0b" },
    personal: { label: "Kişisel", color: "#9ca3af" },
  };

  const kanbanColumns = computed(() => {
    const groups = { platform: [], team: [], personal: [] };
    for (const r of filtered.value) {
      const k = SCOPE_META[r.scope] ? r.scope : "personal";
      groups[k].push(r);
    }
    return ["platform", "team", "personal"].map((k) => ({
      key: k,
      label: SCOPE_META[k].label,
      color: SCOPE_META[k].color,
      items: groups[k],
    }));
  });

  function emptyForm() {
    return {
      isNew: true,
      original: null,
      title: "",
      category: "",
      scope: "platform",
      created_by_team: "",
      content: "",
      is_active: true,
    };
  }

  const filtered = computed(() => {
    const q = search.value.toLowerCase().trim();
    return items.value.filter((r) => {
      if (categoryFilter.value && r.category !== categoryFilter.value) return false;
      if (q && !(r.title || "").toLowerCase().includes(q)) return false;
      return true;
    });
  });

  function scopeLabel(s) {
    return { platform: "Platform", team: "Ekip", personal: "Kişisel" }[s] || s;
  }
  function scopeCls(s) {
    return { platform: "pc-blue", team: "pc-amber", personal: "pc-gray" }[s] || "pc-gray";
  }
  function stripHtml(html) {
    return (html || "").replace(/<[^>]+>/g, "").trim();
  }
  function truncate(s, n) {
    return s.length > n ? s.slice(0, n) + "…" : s;
  }

  async function reload() {
    loading.value = true;
    try {
      const [itemsRes, teamsRes] = await Promise.all([
        api.getList("Helpdesk Canned Response", {
          fields: ["name", "title", "category", "scope", "created_by_team", "is_active", "content"],
          order_by: "modified desc",
          limit_page_length: 500,
        }),
        api.getList("HD Team", {
          fields: ["name", "team_name"],
          limit_page_length: 200,
        }),
      ]);
      items.value = itemsRes.data || [];
      teams.value = teamsRes.data || [];
    } catch (e) {
      toast.error(e.message || "Liste alınamadı");
    } finally {
      loading.value = false;
    }
  }

  function openCreate() {
    form.value = emptyForm();
    modalOpen.value = true;
  }

  function openEdit(r) {
    form.value = {
      isNew: false,
      original: r.name,
      title: r.title,
      category: r.category || "",
      scope: r.scope || "platform",
      created_by_team: r.created_by_team || "",
      content: r.content || "",
      is_active: !!r.is_active,
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
      const payload = {
        title: form.value.title.trim(),
        category: form.value.category || null,
        scope: form.value.scope,
        created_by_team: form.value.scope === "team" ? form.value.created_by_team || null : null,
        content: form.value.content,
        is_active: form.value.is_active ? 1 : 0,
      };
      if (form.value.isNew) {
        await api.createDoc("Helpdesk Canned Response", payload);
        toast.success("Şablon oluşturuldu");
      } else {
        await api.updateDoc("Helpdesk Canned Response", form.value.original, payload);
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

  async function confirmDelete(r) {
    if (!confirm(`"${r.title}" şablonu silinsin mi?`)) return;
    try {
      await api.deleteDoc("Helpdesk Canned Response", r.name);
      toast.success("Silindi");
      await reload();
    } catch (e) {
      toast.error(e.message || "Silinemedi");
    }
  }

  onMounted(reload);
</script>

<style scoped>
  /* Bu view'da modal'ı 640px genişliğinde istiyoruz; max-width override */
  .hd-modal {
    max-width: 640px !important;
  }
</style>
