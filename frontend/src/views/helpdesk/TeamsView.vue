<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">{{ $t("teams.title") }}</h1>
        <p class="hd-page-sub">{{ $t("teams.teamCount", { count: teams.length }) }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <div data-tour="tm-view"><ViewModeToggle v-model="viewMode" /></div>
        <button class="hd-action" @click="reload">
          <AppIcon name="refresh-cw" :size="14" /><span>{{ $t("teams.refresh") }}</span>
        </button>
        <button class="hd-btn-primary" data-tour="tm-add" @click="openCreate">
          <AppIcon name="users" :size="14" /><span>{{ $t("teams.newTeam") }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="card p-3">
      <Skeleton variant="row" :count="7" />
    </div>

    <div v-else-if="teams.length === 0" class="hd-empty">
      <div class="hd-empty-icon"><AppIcon name="users" :size="28" /></div>
      <h3 class="hd-empty-title">{{ $t("teams.empty") }}</h3>
    </div>

    <!-- Grid (default fallback when viewMode is unknown) -->
    <div v-else-if="!['table', 'list', 'kanban'].includes(viewMode)" class="space-y-3">
      <div v-for="team in teams" :key="team.name" class="hd-card hd-card-pad">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-semibold m-0 truncate">{{ team.team_name || team.name }}</h3>
              <span v-if="isSellerTeam(team.name)" class="hd-team-chip">
                <AppIcon name="store" :size="10" />{{ $t("teams.sellerTeamChip") }}
              </span>
            </div>
            <p class="hd-row-meta-line">
              {{ $t("teams.memberCount", { count: memberCount(team) }) }}
            </p>
          </div>
          <button class="hd-action" @click="openManage(team)">
            <AppIcon name="edit-3" :size="13" /><span>{{ $t("teams.editMembers") }}</span>
          </button>
        </div>
        <div v-if="team.users?.length" class="flex flex-wrap gap-1.5">
          <span v-for="u in team.users" :key="u.user" class="hd-team-chip">
            <AppIcon name="user" :size="10" />{{ u.user }}
          </span>
        </div>
        <p v-else class="text-xs text-gray-400">{{ $t("teams.noMembers") }}</p>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0" data-tour="tm-table">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/10">
            <th class="tbl-th">{{ $t("teams.colTeam") }}</th>
            <th class="tbl-th">{{ $t("teams.colType") }}</th>
            <th class="tbl-th text-center">{{ $t("teams.colMembers") }}</th>
            <th class="tbl-th text-right">{{ $t("teams.colAction") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="team in teams"
            :key="team.name"
            class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
            @click="openManage(team)"
          >
            <td class="tbl-td font-semibold text-gray-800 dark:text-gray-200">
              {{ team.team_name || team.name }}
            </td>
            <td class="tbl-td">
              <span v-if="isSellerTeam(team.name)" class="hd-team-chip">
                <AppIcon name="store" :size="10" />{{ $t("teams.typeSeller") }}
              </span>
              <span v-else class="hd-team-chip">
                <AppIcon name="shield" :size="10" />{{ $t("teams.typeAdmin") }}
              </span>
            </td>
            <td class="tbl-td text-center text-gray-600 dark:text-gray-400">
              {{ memberCount(team) }}
            </td>
            <td class="tbl-td text-right" @click.stop>
              <button class="hd-action" @click="openManage(team)">
                <AppIcon name="edit-3" :size="13" /><span>{{ $t("teams.members") }}</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- List (compact) -->
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="team in teams"
        :key="team.name"
        class="list-compact-item"
        @click="openManage(team)"
      >
        <span class="list-compact-name flex-1 min-w-0 truncate">{{
          team.team_name || team.name
        }}</span>
        <span v-if="isSellerTeam(team.name)" class="hd-team-chip"
          ><AppIcon name="store" :size="10" />{{ $t("teams.typeSeller") }}</span
        >
        <span v-else class="hd-team-chip"
          ><AppIcon name="shield" :size="10" />{{ $t("teams.typeAdmin") }}</span
        >
        <span class="text-xs text-gray-400">{{
          $t("teams.memberCount", { count: memberCount(team) })
        }}</span>
        <button
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          @click.stop="openManage(team)"
        >
          <AppIcon name="edit-3" :size="13" />
        </button>
      </div>
    </div>

    <!-- Kanban (Admin / Seller) -->
    <div v-else-if="viewMode === 'kanban'" class="list-kanban">
      <div v-for="col in kanbanColumns" :key="col.key" class="kanban-col">
        <div class="kanban-col-header" :style="{ borderColor: col.color }">
          <span>{{ col.label }}</span>
          <span class="kanban-col-count">{{ col.items.length }}</span>
        </div>
        <div class="kanban-col-body">
          <div
            v-for="team in col.items"
            :key="team.name"
            class="kanban-card"
            @click="openManage(team)"
          >
            <div class="kanban-card-title truncate">{{ team.team_name || team.name }}</div>
            <div class="kanban-card-meta">
              {{ $t("teams.memberCount", { count: memberCount(team) }) }}
            </div>
          </div>
          <div
            v-if="col.items.length === 0"
            class="text-center py-6 text-xs text-gray-400 dark:text-gray-500"
          >
            {{ $t("teams.noRecords") }}
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Create -->
    <div v-if="createOpen" class="hd-modal-backdrop" @click.self="createOpen = false">
      <div class="hd-modal">
        <header class="hd-modal-header">
          <h3>{{ $t("teams.createTitle") }}</h3>
          <button class="hd-action" @click="createOpen = false">
            <AppIcon name="x" :size="14" />
          </button>
        </header>
        <div class="hd-modal-body">
          <label class="hd-label"
            >{{ $t("teams.teamNameLabel") }} <span class="text-rose-500">*</span></label
          >
          <input
            v-model="newTeamName"
            class="hd-input"
            :placeholder="$t('teams.teamNamePlaceholder')"
          />
        </div>
        <footer class="hd-modal-footer">
          <button class="hd-action" @click="createOpen = false">{{ $t("teams.cancel") }}</button>
          <button
            class="hd-btn-primary"
            :disabled="saving || !newTeamName.trim()"
            @click="createTeam"
          >
            <span>{{ saving ? $t("teams.creating") : $t("teams.create") }}</span>
          </button>
        </footer>
      </div>
    </div>

    <!-- Modal: Manage members -->
    <div v-if="manageOpen" class="hd-modal-backdrop" @click.self="manageOpen = false">
      <div class="hd-modal" style="max-width: 560px">
        <header class="hd-modal-header">
          <h3>
            {{ $t("teams.memberManagement") }} · {{ activeTeam?.team_name || activeTeam?.name }}
          </h3>
          <button class="hd-action" @click="manageOpen = false">
            <AppIcon name="x" :size="14" />
          </button>
        </header>
        <div class="hd-modal-body space-y-3">
          <div class="flex items-center gap-2">
            <select v-model="addUserSelect" class="hd-input flex-1">
              <option value="">{{ $t("teams.selectAgent") }}</option>
              <option v-for="a in availableAgents" :key="a.user" :value="a.user">
                {{ a.agent_name || a.user }} ({{ a.user }})
              </option>
            </select>
            <button class="hd-btn-primary" :disabled="!addUserSelect" @click="addMember">
              <AppIcon name="plus" :size="14" /><span>{{ $t("teams.add") }}</span>
            </button>
          </div>

          <div class="space-y-1.5 max-h-72 overflow-y-auto">
            <div v-if="!activeTeam?.users?.length" class="text-xs text-gray-400 text-center py-4">
              {{ $t("teams.noMembersYet") }}
            </div>
            <div
              v-for="u in activeTeam?.users || []"
              :key="u.user"
              class="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-white/10"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div
                  class="hd-tl-avatar av-agent"
                  style="width: 28px; height: 28px; font-size: 11px"
                >
                  {{ initial(u.user) }}
                </div>
                <span class="text-xs truncate">{{ u.user }}</span>
              </div>
              <button class="hd-action hd-action-danger" @click="removeMember(u)">
                <AppIcon name="x" :size="13" />
              </button>
            </div>
          </div>
        </div>
        <footer class="hd-modal-footer">
          <button class="hd-action" @click="manageOpen = false">{{ $t("teams.close") }}</button>
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
  import { usePageTour } from "@/composables/usePageTour";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  const { t } = useI18n();
  const toast = useToast();

  // Sayfa-içi onboarding: görünüm seçimi → ekip ekle → ekip listesi.
  usePageTour("teams", () => [
    {
      target: '[data-tour="tm-view"]',
      title: t("tourSteps.page.tmView_t"),
      desc: t("tourSteps.page.tmView_d"),
    },
    {
      target: '[data-tour="tm-add"]',
      title: t("tourSteps.page.tmAdd_t"),
      desc: t("tourSteps.page.tmAdd_d"),
    },
    {
      target: '[data-tour="tm-table"]',
      title: t("tourSteps.page.tmTable_t"),
      desc: t("tourSteps.page.tmTable_d"),
    },
  ]);
  const teams = ref([]);
  const allAgents = ref([]);
  const loading = ref(false);

  const createOpen = ref(false);
  const newTeamName = ref("");
  const saving = ref(false);

  const manageOpen = ref(false);
  const activeTeam = ref(null);
  const addUserSelect = ref("");

  const { viewMode } = useListViewMode("hd-teams", "grid");

  const kanbanColumns = computed(() => {
    const admin = [];
    const seller = [];
    for (const t of teams.value) {
      (isSellerTeam(t.name) ? seller : admin).push(t);
    }
    return [
      { key: "admin", label: t("teams.adminTeams"), color: "#d39c00", items: admin },
      { key: "seller", label: t("teams.sellerTeams"), color: "#f59e0b", items: seller },
    ];
  });

  const availableAgents = computed(() => {
    if (!activeTeam.value) return [];
    const memberSet = new Set((activeTeam.value.users || []).map((u) => u.user));
    return allAgents.value.filter((a) => a.is_active && !memberSet.has(a.user));
  });

  function initial(s) {
    return s ? String(s).trim().charAt(0).toUpperCase() : "?";
  }
  function isSellerTeam(name) {
    return String(name || "").startsWith("Seller-");
  }
  function memberCount(t) {
    return t.users?.length || 0;
  }

  async function reload() {
    loading.value = true;
    try {
      const [teamsRes, agentsRes] = await Promise.all([
        api.getList("HD Team", {
          fields: ["name", "team_name"],
          order_by: "team_name asc",
          limit_page_length: 200,
        }),
        api.getList("HD Agent", {
          fields: ["name", "agent_name", "user", "is_active"],
          limit_page_length: 500,
        }),
      ]);
      allAgents.value = agentsRes.data || [];

      // Her team için members child table'ını ayrıca çek
      const list = teamsRes.data || [];
      const detailed = await Promise.all(
        list.map(async (t) => {
          try {
            const doc = await api.getDoc("HD Team", t.name);
            return { ...t, users: doc.data?.users || [] };
          } catch {
            return { ...t, users: [] };
          }
        })
      );
      teams.value = detailed;
    } catch (e) {
      toast.error(e.message || t("teams.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  function openCreate() {
    newTeamName.value = "";
    createOpen.value = true;
  }

  async function createTeam() {
    saving.value = true;
    try {
      await api.createDoc("HD Team", { team_name: newTeamName.value.trim() });
      toast.success(t("teams.teamCreated"));
      createOpen.value = false;
      await reload();
    } catch (e) {
      toast.error(e.message || t("teams.createFailed"));
    } finally {
      saving.value = false;
    }
  }

  function openManage(t) {
    activeTeam.value = JSON.parse(JSON.stringify(t));
    addUserSelect.value = "";
    manageOpen.value = true;
  }

  async function addMember() {
    if (!addUserSelect.value || !activeTeam.value) return;
    try {
      const updated = [...(activeTeam.value.users || []), { user: addUserSelect.value }];
      await api.updateDoc("HD Team", activeTeam.value.name, { users: updated });
      activeTeam.value.users = updated;
      addUserSelect.value = "";
      toast.success(t("teams.memberAdded"));
      await reload();
      // Manage modal'ı güncel tut
      activeTeam.value =
        teams.value.find((t) => t.name === activeTeam.value.name) || activeTeam.value;
    } catch (e) {
      toast.error(e.message || t("teams.addFailed"));
    }
  }

  async function removeMember(u) {
    if (!activeTeam.value) return;
    try {
      const updated = (activeTeam.value.users || []).filter((m) => m.user !== u.user);
      await api.updateDoc("HD Team", activeTeam.value.name, { users: updated });
      activeTeam.value.users = updated;
      toast.success(t("teams.memberRemoved"));
      await reload();
      activeTeam.value =
        teams.value.find((t) => t.name === activeTeam.value.name) || activeTeam.value;
    } catch (e) {
      toast.error(e.message || t("teams.removeFailed"));
    }
  }

  onMounted(reload);
</script>

<!-- Modal/label/danger stilleri global helpdesk.scss'te -->
