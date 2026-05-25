<template>
  <div class="cost-center-page">
    <div class="page-header">
      <div>
        <h1>💰 Cost Center Yönetimi</h1>
        <p class="subtitle">
          Departman/proje bazlı bütçe izleme. Her order'a bir cost center atanır, aylık bütçe
          aşılırsa onay reddedilir.
        </p>
      </div>
      <button class="btn-primary" type="button" @click="openNew">+ Yeni</button>
    </div>

    <p v-if="loading" class="state">Yükleniyor…</p>
    <p v-else-if="!nodes.length" class="state empty">Henüz cost center tanımlanmamış.</p>

    <ul v-else class="cc-tree">
      <li v-for="node in flatTree" :key="node.name" :style="indent(node.depth)">
        <div class="cc-card" :class="{ inactive: !node.is_active }">
          <div class="cc-main">
            <strong>{{ node.cost_center_code }}</strong>
            <span class="cc-name">{{ node.cost_center_name }}</span>
            <span v-if="node.is_group" class="badge group">grup</span>
          </div>
          <div class="cc-budget">
            <span v-if="node.monthly_budget"
              >{{ formatMoney(node.monthly_budget, node.currency) }}/ay</span
            >
            <span v-else class="muted">limit yok</span>
          </div>
          <div class="cc-actions">
            <button class="btn-link" type="button" @click="openEdit(node)">Düzenle</button>
            <button class="btn-link" type="button" @click="askSpend(node)">Aylık Harcama</button>
            <button class="btn-link danger" type="button" @click="askDelete(node)">Sil</button>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <div class="modal-card">
        <h2>{{ editing.name ? "Düzenle" : "Yeni Cost Center" }}</h2>

        <div class="form-grid">
          <label class="field">
            <span class="label">Kod *</span>
            <input v-model="editing.cost_center_code" :disabled="!!editing.name" />
          </label>
          <label class="field">
            <span class="label">İsim *</span>
            <input v-model="editing.cost_center_name" />
          </label>
          <label class="field">
            <span class="label">Parent</span>
            <select v-model="editing.parent_cost_center">
              <option :value="null">—</option>
              <option v-for="n in nodes" :key="n.name" :value="n.name">
                {{ n.cost_center_code }} — {{ n.cost_center_name }}
              </option>
            </select>
          </label>
          <label class="field">
            <span class="label">Aylık Bütçe</span>
            <input v-model.number="editing.monthly_budget" type="number" min="0" />
          </label>
          <label class="field">
            <span class="label">Currency</span>
            <input v-model="editing.currency" />
          </label>
          <label class="field-check">
            <input v-model="editing.is_group" type="checkbox" />
            <span>Tree group (sadece taşıyıcı)</span>
          </label>
          <label class="field-check">
            <input v-model="editing.is_active" type="checkbox" />
            <span>Aktif</span>
          </label>
        </div>

        <div class="modal-actions">
          <button class="btn-primary" type="button" @click="saveCC">Kaydet</button>
          <button class="btn-secondary" type="button" @click="editing = null">İptal</button>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from "vue";
  import api from "@/utils/api";

  const nodes = ref([]);
  const loading = ref(false);
  const errorMessage = ref("");
  const editing = ref(null);

  const flatTree = computed(() => {
    // Pre-sorted by lft from backend; depth derived from parent chain.
    const byName = Object.fromEntries(nodes.value.map((n) => [n.name, n]));
    function depth(name) {
      let d = 0;
      let curr = byName[name];
      while (curr && curr.parent_cost_center) {
        d++;
        curr = byName[curr.parent_cost_center];
      }
      return d;
    }
    return nodes.value.map((n) => ({ ...n, depth: depth(n.name) }));
  });

  function indent(d) {
    return { paddingLeft: `${d * 1.4}rem` };
  }

  function formatMoney(amount, currency) {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  async function load() {
    loading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.api.v1.procurement.get_cost_center_tree");
      nodes.value = res?.message || res || [];
    } catch (err) {
      errorMessage.value = err.message || "Yüklenemedi.";
    } finally {
      loading.value = false;
    }
  }

  function openNew() {
    editing.value = {
      name: null,
      cost_center_code: "",
      cost_center_name: "",
      parent_cost_center: null,
      monthly_budget: 0,
      currency: "EUR",
      budget_period: "monthly",
      is_group: false,
      is_active: true,
    };
  }

  function openEdit(node) {
    editing.value = { ...node, is_group: !!node.is_group, is_active: true };
  }

  async function saveCC() {
    try {
      await api.callMethod("tradehub_core.api.v1.procurement.upsert_cost_center", {
        cost_center_code: editing.value.cost_center_code,
        cost_center_name: editing.value.cost_center_name,
        parent_cost_center: editing.value.parent_cost_center,
        monthly_budget: editing.value.monthly_budget || 0,
        currency: editing.value.currency || "EUR",
        budget_period: editing.value.budget_period || "monthly",
        is_group: editing.value.is_group ? 1 : 0,
        is_active: editing.value.is_active ? 1 : 0,
      });
      editing.value = null;
      await load();
    } catch (err) {
      errorMessage.value = err.message || "Kaydedilemedi.";
    }
  }

  async function askDelete(node) {
    if (!window.confirm(`${node.cost_center_code} silinsin mi?`)) return;
    try {
      await api.callMethod("tradehub_core.api.v1.procurement.delete_cost_center", {
        name: node.name,
      });
      await load();
    } catch (err) {
      errorMessage.value = err.message || "Silinemedi.";
    }
  }

  async function askSpend(node) {
    try {
      const res = await api.callMethod(
        "tradehub_core.api.v1.procurement.check_budget_availability",
        { cost_center: node.name, amount: 0 }
      );
      const d = res?.message || res;
      window.alert(
        `Bu ay: ${formatMoney(d.current_spend, node.currency)} / ${formatMoney(d.budget, node.currency)}\nKalan: ${formatMoney(d.remaining, node.currency)}`
      );
    } catch (err) {
      errorMessage.value = err.message || "Sorgulanamadı.";
    }
  }

  onMounted(load);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .cost-center-page {
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
    h1 {
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }
  .subtitle {
    color: $l-text-500;
    max-width: 700px;
    font-size: 0.875rem;
    @include dark {
      color: $d-text-muted;
    }
  }
  .cc-tree {
    list-style: none;
    padding: 0;
    margin-top: 1rem;
  }
  .cc-card {
    display: grid;
    grid-template-columns: 1.4fr 1fr auto;
    align-items: center;
    gap: 0.75rem;
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 10px;
    padding: 0.65rem 1rem;
    margin-bottom: 0.5rem;
    transition: border-color $t-base;
    &:hover {
      border-color: rgba($brand, 0.3);
    }
    &.inactive {
      opacity: 0.55;
    }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      &:hover {
        border-color: rgba($brand-light, 0.35);
      }
    }
  }
  .cc-main strong {
    color: $l-text-900;
    font-family: ui-monospace, monospace;
    @include dark {
      color: $d-text-max;
    }
  }
  .cc-name {
    margin-left: 0.5rem;
    color: $l-text-700;
    @include dark {
      color: $d-text-hi;
    }
  }
  .badge.group {
    margin-left: 0.5rem;
    background: $l-bg-muted;
    border: 1px solid $l-border-alt;
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    font-size: 0.7rem;
    color: $l-text-500;
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border-inner;
      color: $d-text-muted;
    }
  }
  .cc-budget {
    color: $l-text-600;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
    @include dark {
      color: $d-text-hi;
    }
  }
  .cc-budget .muted {
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }
  .cc-actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
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
    &:hover {
      background: color-mix(in srgb, $brand 88%, #000);
    }
  }
  .btn-secondary {
    background: $l-bg;
    color: $l-text-700;
    border: 1px solid $l-border;
    padding: 0.5rem 1.1rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all $t-base;
    &:hover {
      border-color: $brand;
      color: $brand;
    }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-hi;
      &:hover {
        border-color: $brand-light;
        color: $brand-light;
      }
    }
  }
  .btn-link {
    background: none;
    border: none;
    color: $brand;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0.3rem 0.55rem;
    border-radius: 6px;
    transition: background $t-base;
    &:hover {
      background: rgba($brand, 0.08);
    }
    &.danger {
      color: $c-error;
      &:hover {
        background: rgba($c-error, 0.08);
      }
    }
    @include dark {
      color: $brand-light;
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
    padding: 1.5rem;
    width: min(640px, 92vw);
    max-height: 90vh;
    overflow: auto;
    box-shadow: 0 12px 48px rgba(#000, 0.2);
    h2 {
      margin-top: 0;
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
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
  .field-check {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }
  .field .label,
  .field-check span {
    color: $l-text-700;
    font-weight: 500;
    @include dark {
      color: $d-text-hi;
    }
  }
  .field input,
  .field select {
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 0.5rem 0.7rem;
    background: $l-bg;
    color: $l-text-900;
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
      &:focus {
        border-color: $brand-light;
        box-shadow: 0 0 0 3px rgba($brand-light, 0.2);
      }
    }
  }
  .modal-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    justify-content: flex-end;
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
    @include dark {
      color: $d-text-muted;
    }
  }

  @media (max-width: 720px) {
    .cc-card {
      grid-template-columns: 1fr;
    }
  }
</style>
