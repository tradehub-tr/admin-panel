<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">{{ t("ticketTypes.title") }}</h1>
        <p class="hd-page-sub">{{ t("ticketTypes.count", { n: items.length }) }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" />
        <button class="hd-action" @click="reload">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("ticketTypes.refresh") }}</span>
        </button>
        <button class="hd-btn-primary" data-tour="tt-add" @click="openCreate">
          <AppIcon name="plus" :size="14" /><span>{{ t("ticketTypes.newType") }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else-if="items.length === 0" class="hd-empty">
      <div class="hd-empty-icon"><AppIcon name="tag" :size="28" /></div>
      <h3 class="hd-empty-title">{{ t("ticketTypes.emptyTitle") }}</h3>
      <p class="hd-empty-sub">{{ t("ticketTypes.emptySub") }}</p>
    </div>

    <!-- List (default fallback when viewMode is unknown) -->
    <div v-else-if="!['table', 'grid', 'kanban'].includes(viewMode)" class="space-y-2">
      <div v-for="tt in items" :key="tt.name" class="hd-row">
        <div class="flex-1">
          <p class="hd-row-title">{{ tt.name }}</p>
          <p v-if="tt.description" class="hd-row-meta-line">{{ tt.description }}</p>
        </div>
        <button class="hd-action" @click="openEdit(tt)">
          <AppIcon name="edit-2" :size="13" /><span>{{ t("ticketTypes.edit") }}</span>
        </button>
        <button class="hd-action hd-action-danger" @click="confirmDelete(tt)">
          <AppIcon name="trash-2" :size="13" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0" data-tour="tt-table">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/10">
            <th class="tbl-th">{{ t("ticketTypes.colName") }}</th>
            <th class="tbl-th">{{ t("ticketTypes.colDescription") }}</th>
            <th class="tbl-th text-right">{{ t("ticketTypes.colAction") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tt in items"
            :key="tt.name"
            class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
            @click="openEdit(tt)"
          >
            <td class="tbl-td font-semibold text-gray-800 dark:text-gray-200">{{ tt.name }}</td>
            <td class="tbl-td text-gray-500 dark:text-gray-400">{{ tt.description || "—" }}</td>
            <td class="tbl-td text-right" @click.stop>
              <div class="flex items-center justify-end gap-1.5">
                <button class="hd-action" @click="openEdit(tt)">
                  <AppIcon name="edit-2" :size="13" />
                </button>
                <button class="hd-action hd-action-danger" @click="confirmDelete(tt)">
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
        v-for="tt in items"
        :key="tt.name"
        class="list-grid-card cursor-pointer"
        @click="openEdit(tt)"
      >
        <div class="flex items-start gap-2 mb-2">
          <div
            class="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0"
          >
            <AppIcon name="tag" :size="16" />
          </div>
          <span class="list-grid-card-title flex-1 min-w-0 break-words">{{ tt.name }}</span>
        </div>
        <p v-if="tt.description" class="text-xs text-gray-500 dark:text-gray-400 leading-snug">
          {{ tt.description }}
        </p>
        <p v-else class="text-xs text-gray-400 italic">{{ t("ticketTypes.noDescription") }}</p>
        <div class="flex items-center gap-1.5 mt-3" @click.stop>
          <button class="hd-action flex-1" @click="openEdit(tt)">
            <AppIcon name="edit-2" :size="12" /><span>{{ t("ticketTypes.edit") }}</span>
          </button>
          <button class="hd-action hd-action-danger" @click="confirmDelete(tt)">
            <AppIcon name="trash-2" :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- Kanban (tek kolon — status field yok) -->
    <div v-else-if="viewMode === 'kanban'" class="list-kanban">
      <div class="kanban-col">
        <div class="kanban-col-header" style="border-color: #7c3aed">
          <span>{{ t("ticketTypes.title") }}</span>
          <span class="kanban-col-count">{{ items.length }}</span>
        </div>
        <div class="kanban-col-body">
          <div v-for="tt in items" :key="tt.name" class="kanban-card" @click="openEdit(tt)">
            <div class="kanban-card-title truncate">{{ tt.name }}</div>
            <div v-if="tt.description" class="kanban-card-meta truncate">{{ tt.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Create/Edit -->
    <div v-if="modalOpen" class="hd-modal-backdrop" @click.self="closeModal">
      <div class="hd-modal">
        <header class="hd-modal-header">
          <h3>
            {{ form.isNew ? t("ticketTypes.modalNewTitle") : t("ticketTypes.modalEditTitle") }}
          </h3>
          <button class="hd-action" @click="closeModal">
            <AppIcon name="x" :size="14" />
          </button>
        </header>
        <div class="hd-modal-body space-y-3">
          <div>
            <label class="hd-label"
              >{{ t("ticketTypes.fieldName") }} <span class="text-rose-500">*</span></label
            >
            <input
              v-model="form.name"
              class="hd-input"
              :disabled="!form.isNew"
              :placeholder="t('ticketTypes.namePlaceholder')"
            />
          </div>
          <div>
            <label class="hd-label">{{ t("ticketTypes.fieldDescription") }}</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="hd-textarea"
              :placeholder="t('ticketTypes.descriptionPlaceholder')"
            ></textarea>
          </div>
        </div>
        <footer class="hd-modal-footer">
          <button class="hd-action" @click="closeModal">{{ t("ticketTypes.cancel") }}</button>
          <button class="hd-btn-primary" :disabled="saving || !form.name.trim()" @click="save">
            <AppIcon name="check" :size="14" />
            <span>{{ saving ? t("ticketTypes.saving") : t("ticketTypes.save") }}</span>
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { usePageTour } from "@/composables/usePageTour";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";

  const { t } = useI18n();
  const toast = useToast();

  // Sayfa-içi onboarding: tip listesi → yeni tip ekleme.
  usePageTour("ticket-types", () => [
    {
      target: '[data-tour="tt-table"]',
      title: t("tourSteps.page.ttTable_t"),
      desc: t("tourSteps.page.ttTable_d"),
    },
    {
      target: '[data-tour="tt-add"]',
      title: t("tourSteps.page.ttAdd_t"),
      desc: t("tourSteps.page.ttAdd_d"),
    },
  ]);

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
      toast.error(e.message || t("ticketTypes.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  function openCreate() {
    form.value = { isNew: true, name: "", description: "", original: null };
    modalOpen.value = true;
  }

  function openEdit(tt) {
    form.value = {
      isNew: false,
      name: tt.name,
      description: tt.description || "",
      original: tt.name,
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
        toast.success(t("ticketTypes.created"));
      } else {
        await api.updateDoc("HD Ticket Type", form.value.original, {
          description: form.value.description.trim() || null,
        });
        toast.success(t("ticketTypes.updated"));
      }
      modalOpen.value = false;
      await reload();
    } catch (e) {
      toast.error(e.message || t("ticketTypes.saveFailed"));
    } finally {
      saving.value = false;
    }
  }

  async function confirmDelete(tt) {
    if (!confirm(t("ticketTypes.deleteConfirm", { name: tt.name }))) return;
    try {
      await api.deleteDoc("HD Ticket Type", tt.name);
      toast.success(t("ticketTypes.deleted"));
      await reload();
    } catch (e) {
      toast.error(e.message || t("ticketTypes.deleteFailed"));
    }
  }

  onMounted(reload);
</script>

<!-- Modal/label/danger stilleri global helpdesk.scss'te -->
