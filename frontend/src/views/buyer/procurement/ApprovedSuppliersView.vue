<template>
  <div class="approved-suppliers-page">
    <div class="page-header">
      <div>
        <h1><AppIcon name="handshake" :size="22" /> {{ t("approvedSuppliers.title") }}</h1>
        <p class="subtitle">
          {{ t("approvedSuppliers.subtitle") }}
        </p>
      </div>
      <div class="header-actions">
        <ViewModeToggle v-model="viewMode" :modes="['table', 'grid', 'list']" />
        <button class="btn-primary" type="button" @click="openNew">
          {{ t("approvedSuppliers.newList") }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="state">{{ t("approvedSuppliers.loading") }}</p>
    <p v-else-if="!lists.length" class="state empty">{{ t("approvedSuppliers.empty") }}</p>

    <div v-for="lst in lists" :key="lst.name" class="list-card">
      <div class="list-header">
        <div>
          <strong>{{ lst.list_name }}</strong>
          <span v-if="lst.is_default" class="badge default">{{
            t("approvedSuppliers.badgeDefault")
          }}</span>
          <span v-if="!lst.is_active" class="badge inactive">{{
            t("approvedSuppliers.badgeInactive")
          }}</span>
        </div>
        <div class="list-actions">
          <button class="btn-link" type="button" @click="openEdit(lst)">
            {{ t("approvedSuppliers.edit") }}
          </button>
          <button class="btn-link danger" type="button" @click="askDelete(lst)">
            {{ t("approvedSuppliers.delete") }}
          </button>
        </div>
      </div>
      <!-- Table view -->
      <table v-if="viewMode === 'table'" class="suppliers-table">
        <thead>
          <tr>
            <th>{{ t("approvedSuppliers.colSupplier") }}</th>
            <th>{{ t("approvedSuppliers.colMin") }}</th>
            <th>{{ t("approvedSuppliers.colMax") }}</th>
            <th>{{ t("approvedSuppliers.colCategories") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, idx) in lst.suppliers" :key="idx">
            <td>{{ s.supplier }}</td>
            <td>{{ s.min_order_amount || "—" }}</td>
            <td>{{ s.max_order_amount || t("approvedSuppliers.noLimit") }}</td>
            <td>{{ s.allowed_categories || t("approvedSuppliers.all") }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Grid (card) view -->
      <div v-else-if="viewMode === 'grid'" class="suppliers-grid">
        <div v-for="(s, idx) in lst.suppliers" :key="idx" class="supplier-card">
          <div class="card-top">
            <strong class="supplier-name">{{ s.supplier }}</strong>
            <span class="badge" :class="s.is_active ? 'default' : 'inactive'">
              {{
                s.is_active ? t("approvedSuppliers.active") : t("approvedSuppliers.badgeInactive")
              }}
            </span>
          </div>
          <p class="supplier-meta">{{ s.allowed_categories || t("approvedSuppliers.all") }}</p>
          <p class="supplier-meta">
            {{ t("approvedSuppliers.colMin") }}: {{ s.min_order_amount || "—" }} ·
            {{ t("approvedSuppliers.colMax") }}:
            {{ s.max_order_amount || t("approvedSuppliers.noLimit") }}
          </p>
        </div>
      </div>

      <!-- Compact list view -->
      <div v-else class="suppliers-list">
        <div v-for="(s, idx) in lst.suppliers" :key="idx" class="supplier-row">
          <strong class="supplier-name">{{ s.supplier }}</strong>
          <span class="supplier-meta">{{
            s.allowed_categories || t("approvedSuppliers.all")
          }}</span>
          <span class="supplier-meta">
            {{ s.min_order_amount || "—" }} /
            {{ s.max_order_amount || t("approvedSuppliers.noLimit") }}
          </span>
          <span class="badge" :class="s.is_active ? 'default' : 'inactive'">
            {{ s.is_active ? t("approvedSuppliers.active") : t("approvedSuppliers.badgeInactive") }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <div class="modal-card">
        <h2>{{ editing.name ? t("approvedSuppliers.edit") : t("approvedSuppliers.newList2") }}</h2>

        <div class="form-grid">
          <label class="field">
            <span class="label">{{ t("approvedSuppliers.name") }}</span>
            <input v-model="editing.list_name" />
          </label>
          <label class="field-check">
            <input v-model="editing.is_default" type="checkbox" />
            <span>{{ t("approvedSuppliers.defaultList") }}</span>
          </label>
          <label class="field-check">
            <input v-model="editing.is_active" type="checkbox" />
            <span>{{ t("approvedSuppliers.active") }}</span>
          </label>
        </div>

        <h3>{{ t("approvedSuppliers.suppliers") }}</h3>
        <table class="edit-suppliers">
          <thead>
            <tr>
              <th>{{ t("approvedSuppliers.colSupplier") }}</th>
              <th>{{ t("approvedSuppliers.colMin") }}</th>
              <th>{{ t("approvedSuppliers.colMax") }}</th>
              <th>{{ t("approvedSuppliers.colCategories") }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, idx) in editing.suppliers" :key="idx">
              <td>
                <input
                  v-model="s.supplier"
                  :placeholder="t('approvedSuppliers.supplierPlaceholder')"
                />
              </td>
              <td><input v-model.number="s.min_order_amount" type="number" /></td>
              <td><input v-model.number="s.max_order_amount" type="number" /></td>
              <td>
                <input
                  v-model="s.allowed_categories"
                  :placeholder="t('approvedSuppliers.categoriesPlaceholder')"
                />
              </td>
              <td>
                <button
                  class="btn-link danger"
                  type="button"
                  @click="editing.suppliers.splice(idx, 1)"
                >
                  {{ t("approvedSuppliers.delete") }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <button class="btn-secondary" type="button" @click="addSupplier">
          {{ t("approvedSuppliers.addRow") }}
        </button>

        <div class="modal-actions">
          <button class="btn-primary" type="button" @click="saveList">
            {{ t("approvedSuppliers.save") }}
          </button>
          <button class="btn-secondary" type="button" @click="editing = null">
            {{ t("approvedSuppliers.cancel") }}
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
  import { useListViewMode } from "@/composables/useListViewMode";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();
  const { viewMode } = useListViewMode("approved-suppliers", "table");

  const lists = ref([]);
  const loading = ref(false);
  const errorMessage = ref("");
  const editing = ref(null);

  async function load() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.procurement.get_approved_suppliers"
      );
      lists.value = res?.message || res || [];
    } catch (err) {
      errorMessage.value = err.message || t("approvedSuppliers.loadFailed");
    } finally {
      loading.value = false;
    }
  }

  function openNew() {
    editing.value = {
      name: null,
      list_name: "",
      is_default: false,
      is_active: true,
      suppliers: [],
    };
  }

  function openEdit(lst) {
    editing.value = {
      ...lst,
      is_default: !!lst.is_default,
      is_active: !!lst.is_active,
      suppliers: (lst.suppliers || []).map((s) => ({ ...s })),
    };
  }

  function addSupplier() {
    editing.value.suppliers.push({
      supplier: "",
      min_order_amount: 0,
      max_order_amount: 0,
      allowed_categories: "",
      is_active: 1,
    });
  }

  async function saveList() {
    try {
      await api.callMethod("tradehub_core.api.v1.procurement.upsert_supplier_list", {
        name: editing.value.name,
        list_name: editing.value.list_name,
        is_default: editing.value.is_default ? 1 : 0,
        is_active: editing.value.is_active ? 1 : 0,
        suppliers: JSON.stringify(editing.value.suppliers),
      });
      editing.value = null;
      await load();
    } catch (err) {
      errorMessage.value = err.message || t("approvedSuppliers.saveFailed");
    }
  }

  async function askDelete(lst) {
    if (!window.confirm(t("approvedSuppliers.deleteConfirm", { name: lst.list_name }))) return;
    try {
      await api.callMethod("tradehub_core.api.v1.procurement.delete_supplier_list", {
        name: lst.name,
      });
      await load();
    } catch (err) {
      errorMessage.value = err.message || t("approvedSuppliers.deleteFailed");
    }
  }

  onMounted(load);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .approved-suppliers-page {
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
      @include dark {
        color: $d-text-max;
      }
    }
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .subtitle {
    color: $l-text-500;
    max-width: 700px;
    font-size: 0.875rem;
    @include dark {
      color: $d-text-muted;
    }
  }
  .suppliers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.7rem;
    margin-top: 0.6rem;
  }
  .supplier-card {
    border: 1px solid $l-border-alt;
    border-radius: 10px;
    padding: 0.7rem 0.85rem;
    background: $l-bg-subtle;
    transition: border-color $t-base;
    &:hover {
      border-color: rgba($brand, 0.3);
    }
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      &:hover {
        border-color: rgba($brand-light, 0.35);
      }
    }
  }
  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }
  .suppliers-list {
    margin-top: 0.6rem;
    border: 1px solid $l-border-alt;
    border-radius: 10px;
    overflow: hidden;
    @include dark {
      border-color: $d-border;
    }
  }
  .supplier-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.8rem;
    border-bottom: 1px solid $l-border-alt;
    font-size: 0.85rem;
    &:last-child {
      border-bottom: none;
    }
    .supplier-name {
      flex: 1;
      min-width: 0;
    }
    @include dark {
      border-bottom-color: $d-border-inner;
    }
  }
  .supplier-name {
    color: $l-text-900;
    font-size: 0.9rem;
    @include dark {
      color: $d-text-max;
    }
  }
  .supplier-meta {
    color: $l-text-500;
    font-size: 0.8rem;
    margin: 0.15rem 0 0;
    @include dark {
      color: $d-text-muted;
    }
  }
  .list-card {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    padding: 1rem 1.2rem;
    margin-top: 0.9rem;
    transition: border-color $t-base;
    &:hover {
      border-color: rgba($brand, 0.3);
    }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      &:hover {
        border-color: rgba($brand-light, 0.35);
      }
    }
  }
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
    strong {
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
  }
  .badge.default {
    background: rgba($c-success, 0.12);
    color: $c-success;
    border-radius: 999px;
    padding: 0.2rem 0.7rem;
    margin-left: 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge.inactive {
    background: $l-bg-muted;
    color: $l-text-500;
    border-radius: 999px;
    padding: 0.2rem 0.7rem;
    margin-left: 0.5rem;
    font-size: 0.7rem;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }
  .suppliers-table,
  .edit-suppliers {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }
  .suppliers-table th,
  .edit-suppliers th {
    background: $l-bg-subtle;
    color: $l-text-700;
    font-weight: 600;
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.55rem 0.65rem;
    text-align: left;
    border-bottom: 1px solid $l-border;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
      border-bottom-color: $d-border;
    }
  }
  .suppliers-table td,
  .edit-suppliers td {
    padding: 0.5rem 0.65rem;
    border-bottom: 1px solid $l-border-alt;
    color: $l-text-700;
    @include dark {
      border-bottom-color: $d-border-inner;
      color: $d-text-hi;
    }
  }
  .edit-suppliers input {
    width: 100%;
    border: 1px solid $l-border;
    border-radius: 6px;
    padding: 0.35rem 0.5rem;
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
    width: min(840px, 95vw);
    max-height: 92vh;
    overflow: auto;
    box-shadow: 0 12px 48px rgba(#000, 0.2);
    h2 {
      margin-top: 0;
      color: $l-text-900;
      @include dark {
        color: $d-text-max;
      }
    }
    h3 {
      color: $l-text-700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      @include dark {
        color: $d-text-hi;
      }
    }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.7rem 1rem;
    margin-bottom: 0.8rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.875rem;
    .label {
      color: $l-text-700;
      font-weight: 500;
      @include dark {
        color: $d-text-hi;
      }
    }
    input {
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
  }
  .field-check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: $l-text-700;
    font-size: 0.875rem;
    @include dark {
      color: $d-text-hi;
    }
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
    @include dark {
      color: $d-text-muted;
    }
  }

  @media (max-width: 720px) {
    .suppliers-table,
    .edit-suppliers {
      font-size: 0.74rem;
    }
  }
</style>
