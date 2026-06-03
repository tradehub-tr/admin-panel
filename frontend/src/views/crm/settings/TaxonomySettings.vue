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
          <AppIcon name="plus" :size="13" /><span>{{ t("taxonomySettings.new") }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!items.length" class="crm-empty">
      <div class="icon"><AppIcon name="inbox" :size="20" /></div>
      <h3>{{ t("taxonomySettings.empty") }}</h3>
      <p>{{ t("taxonomySettings.emptyHint") }}</p>
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
            :title="t('taxonomySettings.edit')"
            @click="openEdit(item)"
          >
            <AppIcon name="pencil" :size="14" />
          </button>
          <button
            class="text-gray-400 hover:text-rose-500"
            :title="t('taxonomySettings.delete')"
            @click="remove(item)"
          >
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
            <th v-if="cfg.hasColor" class="tbl-th w-10">{{ t("taxonomySettings.colColor") }}</th>
            <th class="tbl-th">{{ t("taxonomySettings.colName") }}</th>
            <th v-if="cfg.hasPosition" class="tbl-th text-center">
              {{ t("taxonomySettings.colOrder") }}
            </th>
            <th class="tbl-th text-right">{{ t("taxonomySettings.colAction") }}</th>
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
                  :title="t('taxonomySettings.edit')"
                  @click="openEdit(item)"
                >
                  <AppIcon name="pencil" :size="14" />
                </button>
                <button
                  class="text-gray-400 hover:text-rose-500"
                  :title="t('taxonomySettings.delete')"
                  @click="remove(item)"
                >
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
          {{ t("taxonomySettings.order") }}: {{ item.position ?? "—" }}
        </div>
        <div class="flex items-center gap-1.5 mt-3" @click.stop>
          <button
            class="hdr-btn-outlined flex-1 flex items-center justify-center gap-1"
            @click="openEdit(item)"
          >
            <AppIcon name="pencil" :size="12" />{{ t("taxonomySettings.edit") }}
          </button>
          <button
            class="text-gray-400 hover:text-rose-500 px-2"
            :title="t('taxonomySettings.delete')"
            @click="remove(item)"
          >
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
              {{ t("taxonomySettings.order") }}: {{ item.position ?? "—" }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <QuickCreateDrawer
      v-model="drawerOpen"
      :title="
        editing
          ? t('taxonomySettings.edit')
          : t('taxonomySettings.newWithName', { name: cfg.singular })
      "
      :submit-label="t('taxonomySettings.save')"
      :saving="saving"
      @submit="save"
    >
      <div class="space-y-3">
        <div>
          <label class="form-label">{{ cfg.nameLabel }}</label>
          <input v-model="form.nameVal" class="form-input" :placeholder="cfg.nameLabel" />
        </div>
        <div v-if="cfg.hasColor">
          <label class="form-label">{{ t("taxonomySettings.color") }}</label>
          <div class="flex items-center gap-2">
            <input v-model="form.color" type="color" class="w-10 h-10 p-0 border rounded-lg" />
            <input v-model="form.color" class="form-input flex-1" placeholder="#8b5cf6" />
          </div>
        </div>
        <div v-if="cfg.hasPosition">
          <label class="form-label">{{ t("taxonomySettings.order") }}</label>
          <input v-model.number="form.position" type="number" class="form-input" placeholder="0" />
        </div>
      </div>
    </QuickCreateDrawer>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import QuickCreateDrawer from "@/components/crm/QuickCreateDrawer.vue";

  const props = defineProps({
    preset: { type: String, required: true },
  });

  const { t } = useI18n();
  const toast = useToast();

  const PRESETS = computed(() => ({
    "lead-status": {
      doctype: "CRM Lead Status",
      title: t("taxonomySettings.leadStatusTitle"),
      description: t("taxonomySettings.leadStatusDesc"),
      singular: t("taxonomySettings.singularStatus"),
      nameLabel: t("taxonomySettings.statusNameLabel"),
      nameField: "lead_status",
      hasColor: true,
      hasPosition: true,
    },
    "deal-status": {
      doctype: "CRM Deal Status",
      title: t("taxonomySettings.dealStatusTitle"),
      description: t("taxonomySettings.dealStatusDesc"),
      singular: t("taxonomySettings.singularStatus"),
      nameLabel: t("taxonomySettings.statusNameLabel"),
      nameField: "deal_status",
      hasColor: true,
      hasPosition: true,
    },
    "lead-source": {
      doctype: "CRM Lead Source",
      title: t("taxonomySettings.leadSourceTitle"),
      description: t("taxonomySettings.leadSourceDesc"),
      singular: t("taxonomySettings.singularSource"),
      nameLabel: t("taxonomySettings.sourceNameLabel"),
      nameField: "lead_source",
      hasColor: false,
      hasPosition: false,
    },
    industry: {
      doctype: "CRM Industry",
      title: t("taxonomySettings.industryTitle"),
      description: t("taxonomySettings.industryDesc"),
      singular: t("taxonomySettings.singularIndustry"),
      nameLabel: t("taxonomySettings.industryNameLabel"),
      nameField: "industry",
      hasColor: false,
      hasPosition: false,
    },
    territory: {
      doctype: "CRM Territory",
      title: t("taxonomySettings.territoryTitle"),
      description: t("taxonomySettings.territoryDesc"),
      singular: t("taxonomySettings.singularTerritory"),
      nameLabel: t("taxonomySettings.territoryNameLabel"),
      nameField: "territory_name",
      hasColor: false,
      hasPosition: false,
    },
    "lost-reason": {
      doctype: "CRM Lost Reason",
      title: t("taxonomySettings.lostReasonTitle"),
      description: t("taxonomySettings.lostReasonDesc"),
      singular: t("taxonomySettings.singularReason"),
      nameLabel: t("taxonomySettings.reasonNameLabel"),
      nameField: "lost_reason",
      hasColor: false,
      hasPosition: false,
    },
    communication: {
      doctype: "CRM Communication Status",
      title: t("taxonomySettings.communicationTitle"),
      description: t("taxonomySettings.communicationDesc"),
      singular: t("taxonomySettings.singularStatus"),
      nameLabel: t("taxonomySettings.statusNameLabel"),
      nameField: "status",
      hasColor: false,
      hasPosition: false,
    },
  }));

  const cfg = computed(() => PRESETS.value[props.preset] || PRESETS.value["lead-status"]);

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
      toast.error(e.message || t("taxonomySettings.loadFailed"));
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
      toast.error(t("taxonomySettings.nameRequired"));
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
        toast.success(t("taxonomySettings.updated"));
      } else {
        await api.createDoc(cfg.value.doctype, payload);
        toast.success(t("taxonomySettings.added"));
      }
      drawerOpen.value = false;
      await load();
    } catch (e) {
      toast.error(e.message || t("taxonomySettings.saveFailed"));
    } finally {
      saving.value = false;
    }
  }

  async function remove(item) {
    if (!confirm(t("taxonomySettings.deleteConfirm", { name: item.name }))) return;
    try {
      await api.deleteDoc(cfg.value.doctype, item.name);
      items.value = items.value.filter((x) => x.name !== item.name);
      toast.success(t("taxonomySettings.deleted"));
    } catch (e) {
      toast.error(e.message || t("taxonomySettings.deleteFailed"));
    }
  }

  watch(() => props.preset, load, { immediate: false });
  onMounted(load);
</script>
