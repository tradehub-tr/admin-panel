<template>
  <div class="owner-transfer-page">
    <div class="page-header">
      <div>
        <h1>👑 Mağaza Sahibi Devri</h1>
        <p class="subtitle">
          Owner ayrılırken Co-Owner'a devir. 2 aşamalı onay: Owner + System Manager.
        </p>
      </div>
      <button class="btn-primary" type="button" @click="openNew">+ Devir Talebi</button>
    </div>

    <ul class="transfer-list">
      <li v-for="t in transfers" :key="t.name" class="card">
        <div class="card-top">
          <strong>{{ t.tenant }}</strong>
          <span class="status" :class="`s-${t.status}`">{{ t.status }}</span>
          <span v-if="t.is_force_transfer" class="badge force">force</span>
        </div>
        <div class="card-body">
          {{ t.current_owner }} → <strong>{{ t.proposed_owner }}</strong>
        </div>
        <div class="card-meta">
          {{ t.reason || "—" }}
        </div>
        <div class="card-actions">
          <button
            v-if="t.status === 'awaiting_owner_confirm'"
            class="btn-link"
            type="button"
            @click="confirm(t)"
          >
            Owner Onayla
          </button>
          <button
            v-if="t.status === 'awaiting_super_admin'"
            class="btn-link"
            type="button"
            @click="approve(t)"
          >
            Super Admin Onayla
          </button>
          <button
            v-if="['awaiting_owner_confirm', 'awaiting_super_admin'].includes(t.status)"
            class="btn-link danger"
            type="button"
            @click="reject(t)"
          >
            Reddet
          </button>
        </div>
      </li>
    </ul>

    <p v-if="!transfers.length" class="state empty">Henüz devir talebi yok.</p>

    <div v-if="creating" class="modal-overlay" @click.self="creating = null">
      <div class="modal-card">
        <h2>Yeni Devir Talebi</h2>
        <div class="form-grid">
          <label class="field">
            <span class="label">Tenant *</span>
            <input v-model="creating.tenant" required />
          </label>
          <label class="field">
            <span class="label">Proposed Owner *</span>
            <input v-model="creating.proposed_owner" type="email" required />
          </label>
          <label class="field full">
            <span class="label">Neden</span>
            <textarea v-model="creating.reason" rows="3" />
          </label>
          <label class="field-check">
            <input v-model="creating.is_force" type="checkbox" />
            <span>Force transfer (sadece System Manager)</span>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" type="button" @click="saveNew">Oluştur</button>
          <button class="btn-secondary" type="button" @click="creating = null">İptal</button>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import api from "@/utils/api";

  const transfers = ref([]);
  const errorMessage = ref("");
  const creating = ref(null);

  async function load() {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.owner_transfer.list_transfers",
      );
      transfers.value = res?.message || res || [];
    } catch (err) {
      errorMessage.value = err.message || "Yüklenemedi.";
    }
  }

  function openNew() {
    creating.value = {
      tenant: "",
      proposed_owner: "",
      reason: "",
      is_force: false,
    };
  }

  async function saveNew() {
    try {
      await api.callMethod("tradehub_core.api.v1.owner_transfer.request_transfer", {
        tenant: creating.value.tenant,
        proposed_owner: creating.value.proposed_owner,
        reason: creating.value.reason,
        is_force: creating.value.is_force ? 1 : 0,
      });
      creating.value = null;
      await load();
    } catch (err) {
      errorMessage.value = err.message || "Oluşturulamadı.";
    }
  }

  async function confirm(t) {
    if (!window.confirm(`${t.proposed_owner}'a devir onaylansın mı?`)) return;
    try {
      await api.callMethod("tradehub_core.api.v1.owner_transfer.confirm_transfer", {
        name: t.name,
      });
      await load();
    } catch (err) {
      errorMessage.value = err.message || "Onay başarısız.";
    }
  }

  async function approve(t) {
    if (!window.confirm(`Süper Admin olarak ${t.proposed_owner}'a devri tamamlıyorsunuz. Devam?`)) return;
    try {
      await api.callMethod("tradehub_core.api.v1.owner_transfer.approve_transfer", {
        name: t.name,
      });
      await load();
    } catch (err) {
      errorMessage.value = err.message || "Onay başarısız.";
    }
  }

  async function reject(t) {
    const reason = window.prompt("Reddetme nedeni:", "");
    if (!reason || !reason.trim()) return;
    try {
      await api.callMethod("tradehub_core.api.v1.owner_transfer.reject_transfer", {
        name: t.name,
        reason,
      });
      await load();
    } catch (err) {
      errorMessage.value = err.message || "Reddetme başarısız.";
    }
  }

  onMounted(load);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .owner-transfer-page {
    padding: 1.5rem;
    max-width: 1100px;
    margin: 0 auto;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    flex-wrap: wrap;
    gap: 1rem;
    h1 {
      color: $l-text-900;
      @include dark { color: $d-text-max; }
    }
  }
  .subtitle {
    color: $l-text-500;
    max-width: 700px;
    font-size: 0.875rem;
    @include dark { color: $d-text-muted; }
  }
  .transfer-list {
    list-style: none;
    padding: 0;
    margin-top: 1rem;
  }
  .card {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 10px;
    padding: 0.85rem 1.1rem;
    margin-bottom: 0.6rem;
    transition: border-color $t-base;
    &:hover { border-color: rgba($brand, 0.3); }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      &:hover { border-color: rgba($brand-light, 0.35); }
    }
  }
  .card-top {
    display: flex;
    gap: 0.7rem;
    align-items: center;
    flex-wrap: wrap;
    strong { color: $l-text-900; @include dark { color: $d-text-max; } }
  }
  .status {
    border-radius: 999px;
    padding: 0.2rem 0.65rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .s-draft, .s-awaiting_owner_confirm {
    background: rgba($c-warning, 0.12);
    color: $c-warning;
  }
  .s-awaiting_super_admin {
    background: rgba($c-info, 0.12);
    color: $c-info;
  }
  .s-completed {
    background: rgba($c-success, 0.12);
    color: $c-success;
  }
  .s-rejected,
  .s-cancelled {
    background: rgba($c-error, 0.12);
    color: $c-error;
  }
  .badge.force {
    background: $c-error;
    color: #fff;
    border-radius: 5px;
    padding: 0.15rem 0.5rem;
    font-size: 0.65rem;
    font-weight: 700;
    margin-left: auto;
    text-transform: uppercase;
  }
  .card-body {
    margin-top: 0.45rem;
    color: $l-text-700;
    @include dark { color: $d-text-hi; }
  }
  .card-meta {
    color: $l-text-500;
    font-size: 0.85rem;
    margin-top: 0.25rem;
    @include dark { color: $d-text-muted; }
  }
  .card-actions {
    margin-top: 0.55rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .btn-link {
    background: none;
    border: none;
    color: $brand;
    cursor: pointer;
    font-size: 0.875rem;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    transition: background $t-base;
    &:hover { background: rgba($brand, 0.08); }
    &.danger { color: $c-error; &:hover { background: rgba($c-error, 0.08); } }
    @include dark { color: $brand-light; }
  }
  .btn-primary {
    background: $brand;
    color: #fff;
    border: none;
    padding: 0.5rem 1.1rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: background $t-base;
    &:hover { background: color-mix(in srgb, $brand 88%, #000); }
  }
  .btn-secondary {
    background: $l-bg;
    color: $l-text-700;
    border: 1px solid $l-border;
    padding: 0.5rem 1.1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all $t-base;
    &:hover { border-color: $brand; color: $brand; }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-hi;
      &:hover { border-color: $brand-light; color: $brand-light; }
    }
  }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
  }
  .modal-card {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    padding: 1.4rem 1.6rem;
    width: min(560px, 92vw);
    box-shadow: 0 12px 48px rgba(#000, 0.2);
    h2 { margin-top: 0; color: $l-text-900; @include dark { color: $d-text-max; } }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.7rem 1rem;
  }
  .field,
  .field-check {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.875rem;
  }
  .field.full {
    grid-column: 1 / -1;
  }
  .field .label, .field-check span {
    color: $l-text-700;
    font-weight: 500;
    @include dark { color: $d-text-hi; }
  }
  .field input,
  .field textarea {
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 0.5rem 0.7rem;
    background: $l-bg;
    color: $l-text-900;
    font-size: 0.875rem;
    transition: all $t-base;
    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text-hi;
      &:focus { border-color: $brand-light; box-shadow: 0 0 0 3px rgba($brand-light, 0.2); }
    }
  }
  .field-check {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }
  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  .error-message {
    color: $c-error;
    margin-top: 0.8rem;
    padding: 0.6rem 0.85rem;
    background: rgba($c-error, 0.08);
    border-radius: 8px;
    font-size: 0.875rem;
  }
  .state {
    color: $l-text-500;
    padding: 1rem;
    text-align: center;
    @include dark { color: $d-text-muted; }
  }
</style>
