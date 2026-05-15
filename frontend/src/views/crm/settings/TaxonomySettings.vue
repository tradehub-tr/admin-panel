<template>
  <div class="card p-5">
    <div class="flex items-start justify-between mb-5 gap-3 flex-wrap">
      <div>
        <h2 class="text-[14px] font-bold text-gray-900 dark:text-gray-100 mb-1">{{ cfg.title }}</h2>
        <p class="text-xs text-gray-400">{{ cfg.description }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" />
        <button class="hdr-btn-primary" @click="openCreate">
          <AppIcon name="plus" :size="13" /><span>Yeni</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!items.length" class="crm-empty">
      <div class="icon"><AppIcon name="inbox" :size="20" /></div>
      <h3>Kayıt yok</h3>
      <p>Yukarıdaki "Yeni" butonu ile ekleyebilirsiniz.</p>
    </div>
    <!-- List (default fallback when viewMode is unknown; sürükle handle'lı) -->
    <div
      v-else-if="!['table', 'grid', 'kanban'].includes(viewMode)"
      class="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden"
    >
      <div v-for="item in items" :key="item.name" class="crm-taxo-row">
        <span class="crm-taxo-handle">
          <AppIcon name="grip-vertical" :size="14" />
        </span>
        <div class="flex items-center gap-2 min-w-0">
          <span
            v-if="item.color"
            class="crm-taxo-color"
            :style="{ '--taxo-color': item.color }"
          ></span>
          <span class="text-[13px] font-semibold text-gray-800 dark:text-gray-100 truncate">{{
            item.name
          }}</span>
          <span class="text-[10px] text-gray-400 font-mono">({{ item.name }})</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            class="text-gray-400 hover:text-violet-500"
            title="Düzenle"
            @click="openEdit(item)"
          >
            <AppIcon name="pencil" :size="14" />
          </button>
          <button class="text-gray-400 hover:text-rose-500" title="Sil" @click="remove(item)">
            <AppIcon name="trash-2" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/10">
            <th v-if="cfg.hasColor" class="tbl-th w-10">RENK</th>
            <th class="tbl-th">AD</th>
            <th v-if="cfg.hasPosition" class="tbl-th text-center">SIRA</th>
            <th class="tbl-th text-right">İŞLEM</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.name"
            class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
            @click="openEdit(item)"
          >
            <td v-if="cfg.hasColor" class="tbl-td">
              <span
                v-if="item.color"
                class="crm-taxo-color"
                :style="{ '--taxo-color': item.color }"
              ></span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="tbl-td font-semibold text-gray-800 dark:text-gray-200">{{ item.name }}</td>
            <td v-if="cfg.hasPosition" class="tbl-td text-center text-gray-500">
              {{ item.position ?? "—" }}
            </td>
            <td class="tbl-td text-right" @click.stop>
              <div class="flex items-center justify-end gap-1.5">
                <button
                  class="text-gray-400 hover:text-violet-500"
                  title="Düzenle"
                  @click="openEdit(item)"
                >
                  <AppIcon name="pencil" :size="14" />
                </button>
                <button class="text-gray-400 hover:text-rose-500" title="Sil" @click="remove(item)">
                  <AppIcon name="trash-2" :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grid (cards) -->
    <div v-else-if="viewMode === 'grid'" class="list-grid">
      <div
        v-for="item in items"
        :key="item.name"
        class="list-grid-card cursor-pointer"
        @click="openEdit(item)"
      >
        <div class="flex items-center gap-2 mb-2">
          <span
            v-if="item.color"
            class="crm-taxo-color flex-shrink-0"
            :style="{ '--taxo-color': item.color, width: '14px', height: '14px' }"
          ></span>
          <span class="list-grid-card-title flex-1 min-w-0 truncate">{{ item.name }}</span>
        </div>
        <div v-if="cfg.hasPosition" class="text-[11px] text-gray-400">
          Sıra: {{ item.position ?? "—" }}
        </div>
        <div class="flex items-center gap-1.5 mt-3" @click.stop>
          <button
            class="hdr-btn-outlined flex-1 flex items-center justify-center gap-1"
            @click="openEdit(item)"
          >
            <AppIcon name="pencil" :size="12" />Düzenle
          </button>
          <button class="text-gray-400 hover:text-rose-500 px-2" title="Sil" @click="remove(item)">
            <AppIcon name="trash-2" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Kanban (tek kolon — taxonomy'de status yok) -->
    <div v-else-if="viewMode === 'kanban'" class="list-kanban">
      <div class="kanban-col">
        <div class="kanban-col-header" style="border-color: #7c3aed">
          <span>{{ cfg.title }}</span>
          <span class="kanban-col-count">{{ items.length }}</span>
        </div>
        <div class="kanban-col-body">
          <div v-for="item in items" :key="item.name" class="kanban-card" @click="openEdit(item)">
            <div class="flex items-center gap-2">
              <span
                v-if="item.color"
                class="crm-taxo-color flex-shrink-0"
                :style="{ '--taxo-color': item.color, width: '12px', height: '12px' }"
              ></span>
              <div class="kanban-card-title truncate">{{ item.name }}</div>
            </div>
            <div v-if="cfg.hasPosition" class="kanban-card-meta">
              Sıra: {{ item.position ?? "—" }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <QuickCreateDrawer
      v-model="drawerOpen"
      :title="editing ? 'Düzenle' : 'Yeni ' + cfg.singular"
      submit-label="Kaydet"
      :saving="saving"
      @submit="save"
    >
      <div class="space-y-3">
        <div>
          <label class="form-label">{{ cfg.nameLabel }}</label>
          <input v-model="form.nameVal" class="form-input" :placeholder="cfg.nameLabel" />
        </div>
        <div v-if="cfg.hasColor">
          <label class="form-label">Renk</label>
          <div class="flex items-center gap-2">
            <input v-model="form.color" type="color" class="w-10 h-10 p-0 border rounded-lg" />
            <input v-model="form.color" class="form-input flex-1" placeholder="#8b5cf6" />
          </div>
        </div>
        <div v-if="cfg.hasPosition">
          <label class="form-label">Sıra</label>
          <input v-model.number="form.position" type="number" class="form-input" placeholder="0" />
        </div>
      </div>
    </QuickCreateDrawer>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import QuickCreateDrawer from "@/components/crm/QuickCreateDrawer.vue";

  const props = defineProps({
    preset: { type: String, required: true },
  });

  const toast = useToast();

  const PRESETS = {
    "lead-status": {
      doctype: "CRM Lead Status",
      title: "Lead Durumları",
      description: "Lead yaşam döngüsü durumları (Yeni, Takip, Nitelikli vb.)",
      singular: "Durum",
      nameLabel: "Durum Adı",
      nameField: "lead_status",
      hasColor: true,
      hasPosition: true,
    },
    "deal-status": {
      doctype: "CRM Deal Status",
      title: "Deal Durumları",
      description: "Anlaşma aşamaları (Nitelendirme, Teklif, Müzakere, Kazanıldı vb.)",
      singular: "Durum",
      nameLabel: "Durum Adı",
      nameField: "deal_status",
      hasColor: true,
      hasPosition: true,
    },
    "lead-source": {
      doctype: "CRM Lead Source",
      title: "Lead Kaynakları",
      description: "Website, Referans, Reklam, Sosyal Medya vb.",
      singular: "Kaynak",
      nameLabel: "Kaynak Adı",
      nameField: "lead_source",
      hasColor: false,
      hasPosition: false,
    },
    industry: {
      doctype: "CRM Industry",
      title: "Sektörler",
      description: "Kurum sektörleri",
      singular: "Sektör",
      nameLabel: "Sektör Adı",
      nameField: "industry",
      hasColor: false,
      hasPosition: false,
    },
    territory: {
      doctype: "CRM Territory",
      title: "Bölgeler",
      description: "Coğrafi veya pazar bölgeleri",
      singular: "Bölge",
      nameLabel: "Bölge Adı",
      nameField: "territory_name",
      hasColor: false,
      hasPosition: false,
    },
    "lost-reason": {
      doctype: "CRM Lost Reason",
      title: "Kayıp Nedenleri",
      description: "Anlaşma neden kaybedildi (Fiyat, Zamanlama, Rakip vb.)",
      singular: "Neden",
      nameLabel: "Neden",
      nameField: "lost_reason",
      hasColor: false,
      hasPosition: false,
    },
    communication: {
      doctype: "CRM Communication Status",
      title: "İletişim Durumları",
      description: "İletişim takip durumları",
      singular: "Durum",
      nameLabel: "Durum Adı",
      nameField: "status",
      hasColor: false,
      hasPosition: false,
    },
  };

  const cfg = computed(() => PRESETS[props.preset] || PRESETS["lead-status"]);

  const items = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const drawerOpen = ref(false);
  const editing = ref(null);
  const form = ref({ nameVal: "", color: "#8b5cf6", position: 0 });

  const { viewMode } = useListViewMode(`crm-taxonomy:${props.preset}`, "list");

  async function load() {
    loading.value = true;
    try {
      const fields = ["name"];
      if (cfg.value.hasColor) fields.push("color");
      if (cfg.value.hasPosition) fields.push("position");
      const res = await api.getList(cfg.value.doctype, {
        fields,
        order_by: cfg.value.hasPosition ? "position asc" : "name asc",
        limit_page_length: 200,
      });
      items.value = res.data || [];
    } catch (e) {
      toast.error(e.message || "Yüklenemedi");
    } finally {
      loading.value = false;
    }
  }

  function openCreate() {
    editing.value = null;
    form.value = { nameVal: "", color: "#8b5cf6", position: items.value.length };
    drawerOpen.value = true;
  }

  function openEdit(item) {
    editing.value = item;
    form.value = {
      nameVal: item.name,
      color: item.color || "#8b5cf6",
      position: item.position || 0,
    };
    drawerOpen.value = true;
  }

  async function save() {
    if (!form.value.nameVal.trim()) {
      toast.error("İsim alanı zorunlu");
      return;
    }
    saving.value = true;
    try {
      const payload = {};
      payload[cfg.value.nameField] = form.value.nameVal;
      payload.name = form.value.nameVal;
      if (cfg.value.hasColor) payload.color = form.value.color;
      if (cfg.value.hasPosition) payload.position = form.value.position;
      if (editing.value) {
        await api.updateDoc(cfg.value.doctype, editing.value.name, payload);
        toast.success("Güncellendi");
      } else {
        await api.createDoc(cfg.value.doctype, payload);
        toast.success("Eklendi");
      }
      drawerOpen.value = false;
      await load();
    } catch (e) {
      toast.error(e.message || "Kaydetme başarısız");
    } finally {
      saving.value = false;
    }
  }

  async function remove(item) {
    if (!confirm(`"${item.name}" silinsin mi?`)) return;
    try {
      await api.deleteDoc(cfg.value.doctype, item.name);
      items.value = items.value.filter((x) => x.name !== item.name);
      toast.success("Silindi");
    } catch (e) {
      toast.error(e.message || "Silinemedi");
    }
  }

  watch(() => props.preset, load, { immediate: false });
  onMounted(load);
</script>
