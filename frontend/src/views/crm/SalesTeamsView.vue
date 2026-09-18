<template>
  <div class="sales-teams">
    <header class="page-head">
      <div>
        <h1>Satış Ekipleri</h1>
        <p class="hint">
          Saha elemanlarını ekiplere bağlayın. Eklenen üyeye "Saha Pazarlama", lidere "Saha Ekip
          Lideri" rolü otomatik verilir. Hakedişler önce ekip liderine, sonra yönetime düşer.
        </p>
      </div>
      <button type="button" class="th-btn-primary" @click="openCreate">+ Yeni Ekip</button>
    </header>

    <section class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Ekip</th>
            <th>Lider</th>
            <th>Üyeler</th>
            <th>Durum</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.loading">
            <td colspan="5" class="cell-empty">Yükleniyor…</td>
          </tr>
          <tr v-else-if="!store.teams.length">
            <td colspan="5" class="cell-empty">Henüz ekip yok. "Yeni Ekip" ile başlayın.</td>
          </tr>
          <tr v-for="t in store.teams" v-else :key="t.name">
            <td class="cell-strong">{{ t.team_name }}</td>
            <td>
              <span class="who">{{ t.leader_name }}</span>
              <small class="mail">{{ t.leader }}</small>
            </td>
            <td>
              <div v-if="t.members.length" class="chips">
                <span v-for="m in t.members" :key="m.agent" class="chip" :title="m.agent">
                  {{ m.full_name }}
                </span>
              </div>
              <span v-else class="cell-empty">Üye yok</span>
            </td>
            <td>
              <StatusPill
                :status="t.is_active ? 'Aktif' : 'Pasif'"
                :variant="t.is_active ? 'success' : ''"
              />
            </td>
            <td class="actions">
              <button type="button" class="th-btn-outline" @click="openEdit(t)">Düzenle</button>
              <button type="button" class="th-btn-outline danger" @click="askDelete(t)">Sil</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <QuickCreateDrawer
      v-model="drawerOpen"
      :title="form.name ? 'Ekibi Düzenle' : 'Yeni Ekip'"
      submit-label="Kaydet"
      :saving="saving"
      @submit="save"
    >
      <div class="form">
        <label class="field">
          <span>Ekip adı</span>
          <input v-model="form.team_name" class="input" placeholder="Örn. İstoç Saha 1" />
        </label>

        <label class="field check">
          <input v-model="form.is_active" type="checkbox" :true-value="1" :false-value="0" />
          <span>Aktif ekip (hakediş yönlendirmesi yalnız aktif ekibe bakar)</span>
        </label>

        <div class="field">
          <span>Ekip lideri</span>
          <div v-if="form.leader" class="chips">
            <span class="chip leader" :title="form.leader">
              {{ form.leader_name }}
              <button type="button" class="chip-x" title="Kaldır" @click="clearLeader">×</button>
            </span>
          </div>
          <span v-else class="cell-empty">Aşağıdan bir kullanıcı arayıp "Lider yap" seçin.</span>
        </div>

        <div class="field">
          <span>Üyeler ({{ form.members.length }})</span>
          <div v-if="form.members.length" class="chips">
            <span v-for="m in form.members" :key="m.agent" class="chip" :title="m.agent">
              {{ m.full_name }}
              <button type="button" class="chip-x" title="Çıkar" @click="dropMember(m.agent)">
                ×
              </button>
            </span>
          </div>
          <span v-else class="cell-empty">Henüz üye eklenmedi.</span>
        </div>

        <div class="field">
          <span>Kullanıcı ara</span>
          <input
            v-model="query"
            class="input"
            placeholder="Ad ya da e-posta yazın…"
            @input="onQuery"
          />
          <ul v-if="results.length" class="results">
            <li v-for="u in results" :key="u.name">
              <div class="who-col">
                <span class="who">{{ u.full_name }}</span>
                <small class="mail">{{ u.name }}</small>
                <small v-if="u.is_leader || u.is_agent" class="mail">
                  {{
                    [u.is_leader ? "Lider rolü var" : "", u.is_agent ? "Saha rolü var" : ""]
                      .filter(Boolean)
                      .join(" · ")
                  }}
                </small>
              </div>
              <div class="row-actions">
                <button type="button" class="th-btn-outline" @click="setLeader(u)">
                  Lider yap
                </button>
                <button
                  type="button"
                  class="th-btn-primary"
                  :disabled="form.members.some((m) => m.agent === u.name)"
                  @click="pushMember(u)"
                >
                  Üye ekle
                </button>
              </div>
            </li>
          </ul>
          <span v-else-if="query && searched" class="cell-empty">Eşleşen kullanıcı yok.</span>
        </div>

        <ul v-if="errors.length" class="errors">
          <li v-for="e in errors" :key="e">{{ e }}</li>
        </ul>
      </div>
    </QuickCreateDrawer>

    <ConfirmDialog
      :open="confirmOpen"
      title="Ekibi sil"
      :message="`'${pendingDelete?.team_name || ''}' ekibi silinsin mi? Hakediş kaydı bağlıysa silinmez; o durumda pasife alın.`"
      confirm-label="Sil"
      cancel-label="Vazgeç"
      tone="danger"
      @confirm="doDelete"
      @cancel="confirmOpen = false"
      @update:open="(v) => (confirmOpen = v)"
    />
  </div>
</template>

<script setup>
  import { onMounted, ref } from "vue";
  import { useSalesTeamsStore } from "@/stores/salesTeams";
  import { useToast } from "@/composables/useToast";
  import QuickCreateDrawer from "@/components/crm/QuickCreateDrawer.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import StatusPill from "@/components/crm/StatusPill.vue";
  import {
    addMember,
    emptyTeamForm,
    formFromTeam,
    removeMember,
    toPayload,
    validateTeamForm,
  } from "./salesTeamForm";

  const store = useSalesTeamsStore();
  const toast = useToast();

  const drawerOpen = ref(false);
  const saving = ref(false);
  const form = ref(emptyTeamForm());
  const errors = ref([]);

  const query = ref("");
  const results = ref([]);
  const searched = ref(false);
  let timer = null;

  function resetSearch() {
    query.value = "";
    results.value = [];
    searched.value = false;
  }

  function openCreate() {
    form.value = emptyTeamForm();
    errors.value = [];
    resetSearch();
    drawerOpen.value = true;
  }

  function openEdit(t) {
    form.value = formFromTeam(t);
    errors.value = [];
    resetSearch();
    drawerOpen.value = true;
  }

  function onQuery() {
    clearTimeout(timer);
    const q = query.value.trim();
    if (!q) {
      results.value = [];
      searched.value = false;
      return;
    }
    timer = setTimeout(async () => {
      try {
        results.value = await store.searchUsers(q);
        searched.value = true;
      } catch (e) {
        toast.error(e.message || "Arama başarısız.");
      }
    }, 250);
  }

  function setLeader(u) {
    form.value.leader = u.name;
    form.value.leader_name = u.full_name || u.name;
  }
  function clearLeader() {
    form.value.leader = "";
    form.value.leader_name = "";
  }
  function pushMember(u) {
    form.value.members = addMember(form.value.members, u);
  }
  function dropMember(agent) {
    form.value.members = removeMember(form.value.members, agent);
  }

  async function save() {
    errors.value = validateTeamForm(form.value);
    if (errors.value.length) return;
    saving.value = true;
    try {
      await store.saveTeam(toPayload(form.value));
      toast.success(form.value.name ? "Ekip güncellendi." : "Ekip oluşturuldu.");
      drawerOpen.value = false;
      await store.fetchTeams();
    } catch (e) {
      toast.error(e.message || "Kaydedilemedi.");
    } finally {
      saving.value = false;
    }
  }

  const confirmOpen = ref(false);
  const pendingDelete = ref(null);
  function askDelete(t) {
    pendingDelete.value = t;
    confirmOpen.value = true;
  }
  async function doDelete() {
    confirmOpen.value = false;
    if (!pendingDelete.value) return;
    try {
      await store.deleteTeam(pendingDelete.value.name);
      toast.success("Ekip silindi.");
      await store.fetchTeams();
    } catch (e) {
      toast.error(e.message || "Silinemedi.");
    } finally {
      pendingDelete.value = null;
    }
  }

  onMounted(() => store.fetchTeams());
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .sales-teams {
    padding: 1.5rem;
  }
  .page-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }
  .page-head h1 {
    font-size: 1.4rem;
    font-weight: 600;
  }
  .hint {
    color: $l-text-500;
    font-size: 0.875rem;
    max-width: 640px;
    margin-top: 0.25rem;
    @include dark {
      color: $d-text-muted;
    }
  }
  .table-wrap {
    overflow-x: auto;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }
  .data-table th,
  .data-table td {
    text-align: left;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid $l-border;
    font-size: 0.9rem;
    vertical-align: top;
    @include dark {
      border-color: $d-border;
    }
  }
  .cell-strong {
    font-weight: 600;
  }
  .cell-empty {
    color: $l-text-500;
    font-size: 0.85rem;
    @include dark {
      color: $d-text-muted;
    }
  }
  .who {
    display: block;
  }
  .mail {
    display: block;
    color: $l-text-500;
    font-size: 0.75rem;
    @include dark {
      color: $d-text-muted;
    }
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-size: 0.8rem;
    background: rgba(0, 0, 0, 0.06);
    @include dark {
      background: rgba(255, 255, 255, 0.1);
    }
    &.leader {
      background: rgba(245, 158, 11, 0.18);
    }
  }
  .chip-x {
    border: 0;
    background: transparent;
    cursor: pointer;
    line-height: 1;
    padding: 0 0.1rem;
    opacity: 0.7;
    &:hover {
      opacity: 1;
    }
  }
  .actions {
    display: flex;
    gap: 0.4rem;
  }
  .danger {
    color: $c-error;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    > span:first-child {
      font-size: 0.85rem;
      font-weight: 600;
    }
    &.check {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      > span {
        font-weight: 400;
        font-size: 0.85rem;
      }
    }
  }
  .input {
    padding: 0.5rem 0.75rem;
    border: 1px solid $l-border;
    border-radius: 0.5rem;
    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
      color: $d-text;
    }
  }
  .results {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid $l-border;
    border-radius: 0.5rem;
    max-height: 280px;
    overflow: auto;
    @include dark {
      border-color: $d-border;
    }
    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid $l-border;
      @include dark {
        border-color: $d-border;
      }
      &:last-child {
        border-bottom: 0;
      }
    }
  }
  .who-col {
    min-width: 0;
  }
  .row-actions {
    display: flex;
    gap: 0.35rem;
    flex-shrink: 0;
  }
  .errors {
    margin: 0;
    padding-left: 1.1rem;
    color: $c-error;
    font-size: 0.85rem;
  }

  @media (max-width: 767px) {
    .sales-teams {
      padding: 1rem 0.25rem;
      margin: 0 -0.75rem;
    }
    .results li {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
