<template>
  <div class="delegation-page">
    <div class="page-header">
      <div>
        <h1>🔁 {{ t("delegationManager.title") }}</h1>
        <p class="subtitle">
          {{ t("delegationManager.subtitle") }}
        </p>
      </div>
      <button class="btn-primary" type="button" data-tour="dlg-create" @click="openNew">
        {{ t("delegationManager.newDelegation") }}
      </button>
    </div>

    <div class="grid-2" data-tour="dlg-list">
      <section>
        <h3>{{ t("delegationManager.delegatedByMe") }}</h3>
        <p v-if="!data.delegated_by_me?.length" class="state empty">
          {{ t("delegationManager.none") }}
        </p>
        <ul v-else class="delegation-list">
          <li v-for="d in data.delegated_by_me" :key="d.name" class="card">
            <div class="card-top">
              <strong>{{ d.delegate }}</strong>
              <span class="role">{{ d.role }}</span>
              <span class="status" :class="`s-${d.status}`">{{ d.status }}</span>
            </div>
            <div class="card-meta">{{ formatDate(d.starts_at) }} → {{ formatDate(d.ends_at) }}</div>
            <div class="card-actions">
              <button
                v-if="d.status === 'pending'"
                class="btn-link"
                type="button"
                @click="activate(d)"
              >
                {{ t("delegationManager.activate") }}
              </button>
              <button
                v-if="['pending', 'active'].includes(d.status)"
                class="btn-link danger"
                type="button"
                @click="revoke(d)"
              >
                {{ t("delegationManager.revoke") }}
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section>
        <h3>{{ t("delegationManager.delegatedToMe") }}</h3>
        <p v-if="!data.delegated_to_me?.length" class="state empty">
          {{ t("delegationManager.none") }}
        </p>
        <ul v-else class="delegation-list">
          <li v-for="d in data.delegated_to_me" :key="d.name" class="card">
            <div class="card-top">
              <span
                >{{ t("delegationManager.from") }} <strong>{{ d.delegator }}</strong></span
              >
              <span class="role">{{ d.role }}</span>
              <span class="status" :class="`s-${d.status}`">{{ d.status }}</span>
            </div>
            <div class="card-meta">{{ formatDate(d.starts_at) }} → {{ formatDate(d.ends_at) }}</div>
          </li>
        </ul>
      </section>
    </div>

    <div v-if="creating" class="modal-overlay" @click.self="creating = null">
      <div class="modal-card" data-tour="dlg-form">
        <h2>{{ t("delegationManager.newModalTitle") }}</h2>
        <div class="form-grid">
          <label class="field">
            <span class="label">{{ t("delegationManager.delegate") }}</span>
            <input v-model="creating.delegate" type="email" required />
          </label>
          <label class="field">
            <span class="label">{{ t("delegationManager.role") }}</span>
            <input
              v-model="creating.role"
              type="text"
              :placeholder="t('delegationManager.rolePlaceholder')"
              required
            />
          </label>
          <label class="field">
            <span class="label">{{ t("delegationManager.startsAt") }}</span>
            <input v-model="creating.starts_at" type="datetime-local" required />
          </label>
          <label class="field">
            <span class="label">{{ t("delegationManager.endsAt") }}</span>
            <input v-model="creating.ends_at" type="datetime-local" required />
          </label>
          <label class="field full">
            <span class="label">{{ t("delegationManager.reason") }}</span>
            <input v-model="creating.reason" type="text" />
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" type="button" @click="saveNew">
            {{ t("delegationManager.create") }}
          </button>
          <button class="btn-secondary" type="button" @click="creating = null">
            {{ t("delegationManager.cancel") }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: liste → yeni yetki devri → form.
  usePageTour("delegation", () => [
    {
      target: '[data-tour="dlg-list"]',
      title: t("tourSteps.page.dlgList_t"),
      desc: t("tourSteps.page.dlgList_d"),
    },
    {
      target: '[data-tour="dlg-create"]',
      title: t("tourSteps.page.dlgCreate_t"),
      desc: t("tourSteps.page.dlgCreate_d"),
    },
    {
      target: '[data-tour="dlg-form"]',
      title: t("tourSteps.page.dlgForm_t"),
      desc: t("tourSteps.page.dlgForm_d"),
    },
  ]);

  const data = ref({ delegated_by_me: [], delegated_to_me: [] });
  const errorMessage = ref("");
  const creating = ref(null);

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleString("tr-TR");
  }

  async function load() {
    try {
      const res = await api.callMethodGET("tradehub_core.api.v1.delegation.list_my_delegations");
      data.value = res?.message || res || { delegated_by_me: [], delegated_to_me: [] };
    } catch (err) {
      errorMessage.value = err.message || t("delegationManager.loadFailed");
    }
  }

  function openNew() {
    creating.value = {
      delegate: "",
      role: "",
      starts_at: "",
      ends_at: "",
      reason: "",
    };
  }

  async function saveNew() {
    try {
      await api.callMethod("tradehub_core.api.v1.delegation.create_delegation", {
        delegate: creating.value.delegate,
        role: creating.value.role,
        starts_at: creating.value.starts_at,
        ends_at: creating.value.ends_at,
        reason: creating.value.reason || "",
      });
      creating.value = null;
      await load();
    } catch (err) {
      errorMessage.value = err.message || t("delegationManager.createFailed");
    }
  }

  async function activate(d) {
    if (
      !window.confirm(
        t("delegationManager.activateConfirm", { delegate: d.delegate, role: d.role })
      )
    )
      return;
    try {
      await api.callMethod("tradehub_core.api.v1.delegation.activate_delegation", {
        name: d.name,
      });
      await load();
    } catch (err) {
      errorMessage.value = err.message || t("delegationManager.activateFailed");
    }
  }

  async function revoke(d) {
    const reason = window.prompt(
      t("delegationManager.revokePrompt", { delegate: d.delegate, role: d.role }),
      ""
    );
    if (reason === null) return;
    try {
      await api.callMethod("tradehub_core.api.v1.delegation.revoke_delegation", {
        name: d.name,
        reason,
      });
      await load();
    } catch (err) {
      errorMessage.value = err.message || t("delegationManager.revokeFailed");
    }
  }

  onMounted(load);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .delegation-page {
    padding: 1.5rem;
    max-width: 1100px;
    margin: 0 auto;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .page-header h1 {
    margin: 0;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .subtitle {
    color: $l-text-600;
    max-width: 700px;
    @include dark {
      color: $d-text-muted;
    }
  }
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 1.2rem;
    margin-top: 1.2rem;
  }
  h3 {
    margin: 0 0 0.5rem;
    color: $l-text-700;
    font-size: 1.05rem;
    @include dark {
      color: $d-text-hi;
    }
  }
  .delegation-list {
    list-style: none;
    padding: 0;
  }
  .card {
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 0.55rem 0.85rem;
    margin-bottom: 0.45rem;
    transition:
      border-color $t-base,
      background $t-base;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .card-top {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    flex-wrap: wrap;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .role {
    background: $l-border-alt;
    color: $l-text-700;
    border-radius: 4px;
    padding: 0.15rem 0.5rem;
    font-size: 0.78rem;
    @include dark {
      background: $d-border-inner;
      color: $d-text-hi;
    }
  }
  .status {
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    font-size: 0.72rem;
    margin-left: auto;
  }
  .s-pending {
    background: rgba($c-warning, 0.15);
    color: $c-warning;
  }
  .s-active {
    background: rgba($c-success, 0.15);
    color: $c-success;
  }
  .s-expired {
    background: $l-bg-subtle;
    color: $l-text-500;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }
  .s-revoked {
    background: rgba($c-error, 0.12);
    color: $c-error;
  }
  .card-meta {
    color: $l-text-500;
    font-size: 0.85rem;
    margin-top: 0.25rem;
    @include dark {
      color: $d-text-muted;
    }
  }
  .card-actions {
    margin-top: 0.3rem;
    display: flex;
    gap: 0.4rem;
  }
  .btn-link {
    background: none;
    border: none;
    color: $brand;
    cursor: pointer;
    transition: color $t-base;
    &:hover {
      color: $brand-light;
    }
  }
  .btn-link.danger {
    color: $c-error;
  }
  .btn-primary {
    background: $brand;
    color: $l-bg;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background $t-base;
    &:hover {
      background: $brand-light;
    }
  }
  .btn-secondary {
    background: $l-border-alt;
    color: $l-text-700;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background $t-base;
    @include dark {
      background: $d-border-inner;
      color: $d-text-hi;
    }
    &:hover {
      background: $l-border;
      @include dark {
        background: $d-border;
      }
    }
  }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-card {
    background: $l-bg;
    border-radius: 10px;
    padding: 1.4rem;
    width: min(560px, 92vw);
    color: $l-text-900;
    @include dark {
      background: $d-bg-card;
      color: $d-text-max;
    }
  }
  .modal-card h2 {
    margin: 0 0 0.8rem;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.6rem 1rem;
    margin-bottom: 0.8rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.9rem;
  }
  .field .label {
    color: $l-text-600;
    @include dark {
      color: $d-text-muted;
    }
  }
  .field.full {
    grid-column: 1 / -1;
  }
  .field input {
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 0.4rem 0.6rem;
    background: $l-bg-subtle;
    color: $l-text-900;
    transition:
      border-color $t-base,
      box-shadow $t-base,
      background $t-base;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-max;
    }
    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }
  }
  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .error-message {
    color: $c-error;
    margin-top: 0.8rem;
  }
  .state {
    color: $l-text-500;
    padding: 0.5rem;
    @include dark {
      color: $d-text-muted;
    }
  }

  @media (max-width: 720px) {
    .page-header {
      flex-direction: column;
    }
    .grid-2 {
      grid-template-columns: 1fr;
    }
  }
</style>
