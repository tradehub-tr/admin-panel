<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">{{ t("cannedResponses.title") }}</h1>
        <p class="hd-page-sub">{{ t("cannedResponses.templateCount", { n: items.length }) }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" />
        <button class="hd-action" @click="reload">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ t("cannedResponses.refresh") }}</span>
        </button>
        <button class="hd-btn-primary" data-tour="cr-new" @click="openCreate">
          <AppIcon name="plus" :size="14" /><span>{{ t("cannedResponses.newTemplate") }}</span>
        </button>
      </div>
    </div>

    <div class="hd-card hd-card-pad-sm mb-4 flex items-center gap-2 flex-wrap" data-tour="cr-search">
      <input
        v-model="search"
        type="text"
        :placeholder="t('cannedResponses.searchPlaceholder')"
        class="hd-search flex-1 min-w-0"
      />
      <select v-model="categoryFilter" class="hd-select-sm">
        <option value="">{{ t("cannedResponses.allCategories") }}</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else-if="filtered.length === 0" class="hd-empty">
      <div class="hd-empty-icon"><AppIcon name="message-square" :size="28" /></div>
      <h3 class="hd-empty-title">{{ t("cannedResponses.emptyTitle") }}</h3>
      <p class="hd-empty-sub">{{ t("cannedResponses.emptySub") }}</p>
    </div>

    <!-- List (default fallback when viewMode is unknown) -->
    <div v-else-if="!['table', 'grid', 'kanban'].includes(viewMode)" class="space-y-2">
      <div v-for="r in filtered" :key="r.name" class="hd-row">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <p class="hd-row-title m-0 truncate">{{ r.title }}</p>
            <span v-if="r.category" class="hd-team-chip">{{ r.category }}</span>
            <span class="hd-prio-chip" :class="scopeCls(r.scope)">{{ scopeLabel(r.scope) }}</span>
            <span v-if="!r.is_active" class="hd-status sc-gray">{{
              t("cannedResponses.inactive")
            }}</span>
          </div>
          <p class="hd-row-meta-line">{{ truncate(stripHtml(r.content), 140) }}</p>
        </div>
        <button class="hd-action" @click="openEdit(r)">
          <AppIcon name="edit-2" :size="13" /><span>{{ t("cannedResponses.edit") }}</span>
        </button>
        <button class="hd-action hd-action-danger" @click="confirmDelete(r)">
          <AppIcon name="trash-2" :size="13" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0" data-tour="cr-table">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/10">
            <th class="tbl-th">{{ t("cannedResponses.colTitle") }}</th>
            <th class="tbl-th">{{ t("cannedResponses.colCategory") }}</th>
            <th class="tbl-th">{{ t("cannedResponses.colScope") }}</th>
            <th class="tbl-th">{{ t("cannedResponses.colStatus") }}</th>
            <th class="tbl-th text-right">{{ t("cannedResponses.colAction") }}</th>
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
              <span v-if="r.is_active" class="hd-status sc-emerald">{{
                t("cannedResponses.active")
              }}</span>
              <span v-else class="hd-status sc-gray">{{ t("cannedResponses.inactive") }}</span>
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
          <span v-if="!r.is_active" class="hd-status sc-gray">{{
            t("cannedResponses.inactive")
          }}</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 leading-snug">
          {{ truncate(stripHtml(r.content), 180) }}
        </p>
        <div class="flex items-center gap-1.5 mt-3" @click.stop>
          <button class="hd-action flex-1" @click="openEdit(r)">
            <AppIcon name="edit-2" :size="12" /><span>{{ t("cannedResponses.edit") }}</span>
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
              <span v-if="!r.is_active" class="hd-status sc-gray">{{
                t("cannedResponses.inactive")
              }}</span>
            </div>
            <div class="kanban-card-meta truncate">{{ truncate(stripHtml(r.content), 80) }}</div>
          </div>
          <div
            v-if="col.items.length === 0"
            class="text-center py-6 text-xs text-gray-400 dark:text-gray-500"
          >
            {{ t("cannedResponses.noRecords") }}
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="modalOpen" class="hd-modal-backdrop" @click.self="closeModal">
      <div class="hd-modal" style="max-width: 640px">
        <header class="hd-modal-header">
          <h3>
            {{
              form.isNew ? t("cannedResponses.modalNewTitle") : t("cannedResponses.modalEditTitle")
            }}
          </h3>
          <button class="hd-action" @click="closeModal"><AppIcon name="x" :size="14" /></button>
        </header>
        <div class="hd-modal-body space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="hd-label"
                >{{ t("cannedResponses.fieldTitle") }} <span class="text-rose-500">*</span></label
              >
              <input
                v-model="form.title"
                class="hd-input"
                :disabled="!form.isNew"
                :placeholder="t('cannedResponses.titlePlaceholder')"
              />
            </div>
            <div>
              <label class="hd-label">{{ t("cannedResponses.fieldCategory") }}</label>
              <select v-model="form.category" class="hd-input">
                <option value="">{{ t("cannedResponses.selectOption") }}</option>
                <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="hd-label">{{ t("cannedResponses.fieldScope") }}</label>
              <select v-model="form.scope" class="hd-input">
                <option value="platform">{{ t("cannedResponses.scopePlatformAll") }}</option>
                <option value="team">{{ t("cannedResponses.scopeTeam") }}</option>
                <option value="personal">{{ t("cannedResponses.scopePersonal") }}</option>
              </select>
            </div>
            <div v-if="form.scope === 'team'">
              <label class="hd-label"
                >{{ t("cannedResponses.fieldTeam") }} <span class="text-rose-500">*</span></label
              >
              <select v-model="form.created_by_team" class="hd-input">
                <option value="">{{ t("cannedResponses.selectOption") }}</option>
                <option v-for="team in teams" :key="team.name" :value="team.name">
                  {{ team.team_name || team.name }}
                </option>
              </select>
            </div>
          </div>
          <div>
            <label class="hd-label"
              >{{ t("cannedResponses.fieldContent") }} <span class="text-rose-500">*</span></label
            >
            <textarea
              v-model="form.content"
              rows="8"
              class="hd-textarea"
              :placeholder="t('cannedResponses.contentPlaceholder')"
            ></textarea>
            <p class="text-[11px] text-gray-400 mt-1">
              {{ t("cannedResponses.variablesHint") }}
              <code v-pre>{{ ticket_id }}</code
              >, <code v-pre>{{ customer_name }}</code
              >,
              <code v-pre>{{ order_id }}</code>
            </p>
          </div>
          <label class="flex items-center gap-2 text-xs">
            <input v-model="form.is_active" type="checkbox" />
            {{ t("cannedResponses.active") }}
          </label>
        </div>
        <footer class="hd-modal-footer">
          <button class="hd-action" @click="closeModal">{{ t("cannedResponses.cancel") }}</button>
          <button
            class="hd-btn-primary"
            :disabled="saving || !form.title.trim() || !form.content.trim()"
            @click="save"
          >
            <AppIcon name="check" :size="14" />
            <span>{{ saving ? t("cannedResponses.saving") : t("cannedResponses.save") }}</span>
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const toast = useToast();
  const { t } = useI18n();

  // Sayfa-içi onboarding: yeni şablon → arama/filtre → şablon listesi.
  usePageTour("canned-responses", () => [
    { target: '[data-tour="cr-new"]', title: t("tourSteps.page.crNew_t"), desc: t("tourSteps.page.crNew_d") },
    { target: '[data-tour="cr-search"]', title: t("tourSteps.page.crSearch_t"), desc: t("tourSteps.page.crSearch_d") },
    { target: '[data-tour="cr-table"]', title: t("tourSteps.page.crTable_t"), desc: t("tourSteps.page.crTable_d") },
  ]);

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
    platform: { color: "#3b82f6" },
    team: { color: "#f59e0b" },
    personal: { color: "#9ca3af" },
  };

  const kanbanColumns = computed(() => {
    const groups = { platform: [], team: [], personal: [] };
    for (const r of filtered.value) {
      const k = SCOPE_META[r.scope] ? r.scope : "personal";
      groups[k].push(r);
    }
    return ["platform", "team", "personal"].map((k) => ({
      key: k,
      label: scopeLabel(k),
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
    return (
      {
        platform: t("cannedResponses.scopePlatform"),
        team: t("cannedResponses.scopeTeam"),
        personal: t("cannedResponses.scopePersonal"),
      }[s] || s
    );
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
      toast.error(e.message || t("cannedResponses.loadFailed"));
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
        toast.success(t("cannedResponses.created"));
      } else {
        await api.updateDoc("Helpdesk Canned Response", form.value.original, payload);
        toast.success(t("cannedResponses.updated"));
      }
      modalOpen.value = false;
      await reload();
    } catch (e) {
      toast.error(e.message || t("cannedResponses.saveFailed"));
    } finally {
      saving.value = false;
    }
  }

  async function confirmDelete(r) {
    if (!confirm(t("cannedResponses.deleteConfirm", { title: r.title }))) return;
    try {
      await api.deleteDoc("Helpdesk Canned Response", r.name);
      toast.success(t("cannedResponses.deleted"));
      await reload();
    } catch (e) {
      toast.error(e.message || t("cannedResponses.deleteFailed"));
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
