<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">Destek Ekipleri</h1>
        <p class="hd-page-sub">{{ teams.length }} ekip</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hd-action" @click="reload">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
        <button class="hd-btn-primary" @click="openCreate">
          <AppIcon name="users" :size="14" /><span>Yeni Ekip</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else-if="teams.length === 0" class="hd-empty">
      <div class="hd-empty-icon"><AppIcon name="users" :size="28" /></div>
      <h3 class="hd-empty-title">Henüz ekip yok</h3>
    </div>

    <div v-else class="space-y-3">
      <div v-for="t in teams" :key="t.name" class="hd-card hd-card-pad">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-semibold m-0 truncate">{{ t.team_name || t.name }}</h3>
              <span v-if="isSellerTeam(t.name)" class="hd-team-chip">
                <AppIcon name="store" :size="10" />Satıcı Ekibi
              </span>
            </div>
            <p class="hd-row-meta-line">{{ memberCount(t) }} üye</p>
          </div>
          <button class="hd-action" @click="openManage(t)">
            <AppIcon name="edit-3" :size="13" /><span>Üyeleri Düzenle</span>
          </button>
        </div>
        <div v-if="t.users?.length" class="flex flex-wrap gap-1.5">
          <span v-for="u in t.users" :key="u.user" class="hd-team-chip">
            <AppIcon name="user" :size="10" />{{ u.user }}
          </span>
        </div>
        <p v-else class="text-xs text-gray-400">Üye yok.</p>
      </div>
    </div>

    <!-- Modal: Create -->
    <div v-if="createOpen" class="hd-modal-backdrop" @click.self="createOpen = false">
      <div class="hd-modal">
        <header class="hd-modal-header">
          <h3>Yeni Destek Ekibi</h3>
          <button class="hd-action" @click="createOpen = false">
            <AppIcon name="x" :size="14" />
          </button>
        </header>
        <div class="hd-modal-body">
          <label class="hd-label">Ekip Adı <span class="text-rose-500">*</span></label>
          <input v-model="newTeamName" class="hd-input" placeholder="Platform Support" />
        </div>
        <footer class="hd-modal-footer">
          <button class="hd-action" @click="createOpen = false">İptal</button>
          <button
            class="hd-btn-primary"
            :disabled="saving || !newTeamName.trim()"
            @click="createTeam"
          >
            <span>{{ saving ? "Oluşturuluyor..." : "Oluştur" }}</span>
          </button>
        </footer>
      </div>
    </div>

    <!-- Modal: Manage members -->
    <div v-if="manageOpen" class="hd-modal-backdrop" @click.self="manageOpen = false">
      <div class="hd-modal" style="max-width: 560px">
        <header class="hd-modal-header">
          <h3>Üye Yönetimi · {{ activeTeam?.team_name || activeTeam?.name }}</h3>
          <button class="hd-action" @click="manageOpen = false">
            <AppIcon name="x" :size="14" />
          </button>
        </header>
        <div class="hd-modal-body space-y-3">
          <div class="flex items-center gap-2">
            <select v-model="addUserSelect" class="hd-input flex-1">
              <option value="">— Eklemek için ajan seç —</option>
              <option v-for="a in availableAgents" :key="a.user" :value="a.user">
                {{ a.agent_name || a.user }} ({{ a.user }})
              </option>
            </select>
            <button class="hd-btn-primary" :disabled="!addUserSelect" @click="addMember">
              <AppIcon name="plus" :size="14" /><span>Ekle</span>
            </button>
          </div>

          <div class="space-y-1.5 max-h-72 overflow-y-auto">
            <div v-if="!activeTeam?.users?.length" class="text-xs text-gray-400 text-center py-4">
              Henüz üye yok.
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
          <button class="hd-action" @click="manageOpen = false">Kapat</button>
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
  const teams = ref([]);
  const allAgents = ref([]);
  const loading = ref(false);

  const createOpen = ref(false);
  const newTeamName = ref("");
  const saving = ref(false);

  const manageOpen = ref(false);
  const activeTeam = ref(null);
  const addUserSelect = ref("");

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
      toast.error(e.message || "Ekip listesi alınamadı");
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
      toast.success("Ekip oluşturuldu");
      createOpen.value = false;
      await reload();
    } catch (e) {
      toast.error(e.message || "Oluşturulamadı");
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
      toast.success("Üye eklendi");
      await reload();
      // Manage modal'ı güncel tut
      activeTeam.value =
        teams.value.find((t) => t.name === activeTeam.value.name) || activeTeam.value;
    } catch (e) {
      toast.error(e.message || "Eklenemedi");
    }
  }

  async function removeMember(u) {
    if (!activeTeam.value) return;
    try {
      const updated = (activeTeam.value.users || []).filter((m) => m.user !== u.user);
      await api.updateDoc("HD Team", activeTeam.value.name, { users: updated });
      activeTeam.value.users = updated;
      toast.success("Üye çıkarıldı");
      await reload();
      activeTeam.value =
        teams.value.find((t) => t.name === activeTeam.value.name) || activeTeam.value;
    } catch (e) {
      toast.error(e.message || "Çıkarılamadı");
    }
  }

  onMounted(reload);
</script>

<!-- Modal/label/danger stilleri global helpdesk.scss'te -->
