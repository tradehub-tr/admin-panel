<template>
  <div class="auth-simulator-page">
    <div class="page-header">
      <div>
        <h1>🔍 Yetki Simülatörü</h1>
        <p class="subtitle">
          Bir kullanıcının belirli bir eylemi belirli bir kaynak üzerinde
          yapıp yapamayacağını canlı olarak test edin. Sonuç 4 katmanlı bir
          karar izi (decision trace) olarak gelir.
        </p>
      </div>
    </div>

    <form class="simulator-form" @submit.prevent="runSimulation">
      <div class="form-grid">
        <label class="field">
          <span class="label">Aktör (User) *</span>
          <input
            v-model="form.actor"
            type="email"
            placeholder="ornek@firma.com"
            required
          />
        </label>

        <label class="field">
          <span class="label">Eylem *</span>
          <select v-model="form.action" required>
            <option v-for="a in metadata.supported_actions" :key="a" :value="a">
              {{ a }}
            </option>
          </select>
        </label>

        <label class="field">
          <span class="label">Kaynak Tipi *</span>
          <select v-model="form.resource_type" required>
            <option
              v-for="dt in metadata.supported_doctypes"
              :key="dt"
              :value="dt"
            >
              {{ dt }}
            </option>
          </select>
        </label>

        <label class="field">
          <span class="label">Kaynak Adı</span>
          <input
            v-model="form.resource_name"
            type="text"
            placeholder="ORD-1 veya OA-1"
          />
        </label>
      </div>

      <details class="advanced">
        <summary>Gelişmiş Context (ABAC)</summary>
        <div class="form-grid">
          <label class="field">
            <span class="label">Amount (EUR)</span>
            <input
              v-model.number="form.context.amount"
              type="number"
              min="0"
              step="0.01"
            />
          </label>
          <label class="field">
            <span class="label">Currency</span>
            <input v-model="form.context.currency" type="text" />
          </label>
          <label class="field">
            <span class="label">Target Region</span>
            <input v-model="form.context.target_region" type="text" />
          </label>
          <label class="field">
            <span class="label">Request Hour (0-23)</span>
            <input
              v-model.number="form.context.request_hour"
              type="number"
              min="0"
              max="23"
            />
          </label>
        </div>
      </details>

      <div class="form-actions">
        <button class="btn-primary" type="submit" :disabled="loading">
          {{ loading ? "Simüle ediliyor…" : "▶ Simüle Et" }}
        </button>
        <label class="audit-toggle">
          <input v-model="form.audit" type="checkbox" />
          Audit log oluştur
        </label>
      </div>
    </form>

    <section v-if="result" class="result-box" :class="resultClass">
      <header class="result-header">
        <span class="result-icon">{{ result.decision === "ALLOW" ? "✅" : "❌" }}</span>
        <span class="result-text">{{ result.decision }}</span>
        <span v-if="result.first_deny" class="first-deny">
          İlk DENY: {{ result.first_deny.layer }} → {{ result.first_deny.check }}
        </span>
      </header>

      <h3>Karar İzi (Decision Trace)</h3>
      <ul class="trace-list">
        <li
          v-for="(step, idx) in result.trace"
          :key="idx"
          :class="['trace-item', `result-${step.result.toLowerCase()}`]"
        >
          <span class="layer">{{ step.layer }}</span>
          <span class="check">{{ step.check }}</span>
          <span class="badge">{{ step.result }}</span>
          <span class="detail">{{ step.detail }}</span>
        </li>
      </ul>

      <div class="snapshots">
        <div class="snapshot">
          <h4>Aktör Snapshot</h4>
          <pre>{{ JSON.stringify(result.actor_snapshot, null, 2) }}</pre>
        </div>
        <div class="snapshot">
          <h4>Kaynak Snapshot</h4>
          <pre>{{ JSON.stringify(result.resource_snapshot, null, 2) }}</pre>
        </div>
      </div>
    </section>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, reactive } from "vue";
  import api from "@/utils/api";

  const metadata = ref({
    supported_actions: ["read", "write", "create", "submit", "approve", "delete"],
    supported_doctypes: ["Order", "Order Approval", "RFQ", "Quote", "Admin Seller Profile"],
    rebac_relations: {},
    max_batch_size: 50,
  });

  const form = reactive({
    actor: "",
    action: "read",
    resource_type: "Order",
    resource_name: "",
    audit: false,
    context: {
      amount: null,
      currency: "EUR",
      target_region: "",
      request_hour: null,
    },
  });

  const loading = ref(false);
  const result = ref(null);
  const errorMessage = ref("");

  const resultClass = computed(() => ({
    "result-allow": result.value?.decision === "ALLOW",
    "result-deny": result.value?.decision === "DENY",
  }));

  onMounted(async () => {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.authorization_simulator.get_simulator_metadata",
      );
      if (res?.message) {
        metadata.value = res.message;
      }
    } catch (err) {
      console.warn("Simulator metadata yüklenemedi:", err);
    }
  });

  async function runSimulation() {
    errorMessage.value = "";
    result.value = null;
    loading.value = true;
    try {
      const ctx = Object.fromEntries(
        Object.entries(form.context).filter(
          ([, v]) => v !== "" && v !== null && v !== undefined,
        ),
      );
      const res = await api.callMethod(
        "tradehub_core.api.v1.authorization_simulator.simulate",
        {
          actor: form.actor,
          action: form.action,
          resource_type: form.resource_type,
          resource_name: form.resource_name || null,
          context: Object.keys(ctx).length ? JSON.stringify(ctx) : null,
          audit: form.audit,
        },
      );
      result.value = res?.message || res;
    } catch (err) {
      errorMessage.value = err.message || "Simülasyon başarısız.";
    } finally {
      loading.value = false;
    }
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .auth-simulator-page {
    padding: 1.5rem;
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .page-header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: $l-text-900;

    @include dark {
      color: $d-text-max;
    }
  }
  .subtitle {
    color: $l-text-500;
    margin-top: 0.25rem;
    line-height: 1.5;
    font-size: 0.875rem;
    max-width: 720px;

    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Form card ─────────────────────────────────────────────
  .simulator-form {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-radius: 12px;
    padding: 1.25rem 1.4rem;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.85rem 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.875rem;
  }
  .field .label {
    color: $l-text-700;
    font-weight: 500;
    font-size: 0.8rem;

    @include dark {
      color: $d-text-hi;
    }
  }
  .field input,
  .field select {
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 0.55rem 0.75rem;
    font-size: 0.875rem;
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

  // ── Advanced (ABAC context) ───────────────────────────────
  .advanced {
    margin-top: 1.1rem;
    border-top: 1px dashed $l-border;
    padding-top: 1.1rem;

    @include dark {
      border-top-color: $d-border;
    }
  }
  .advanced summary {
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 0.6rem;
    color: $l-text-700;
    user-select: none;

    &:hover {
      color: $brand;
    }

    @include dark {
      color: $d-text-hi;

      &:hover {
        color: $brand-light;
      }
    }
  }

  // ── Actions ───────────────────────────────────────────────
  .form-actions {
    margin-top: 1.1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .btn-primary {
    background: $brand;
    color: #fff;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all $t-base;

    &:hover:not(:disabled) {
      background: color-mix(in srgb, $brand 88%, #000);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba($brand, 0.25);
    }
    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }
  .audit-toggle {
    color: $l-text-600;
    font-size: 0.875rem;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;

    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Result ────────────────────────────────────────────────
  .result-box {
    background: $l-bg;
    border: 1px solid $l-border-alt;
    border-left: 4px solid transparent;
    border-radius: 12px;
    padding: 1.25rem 1.4rem;
    animation: fadeUp 0.3s ease both;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .result-allow {
    border-left-color: $c-success;
  }
  .result-deny {
    border-left-color: $c-error;
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex-wrap: wrap;
  }
  .result-icon {
    font-size: 1.3rem;
  }
  .result-text {
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.01em;

    .result-allow & {
      color: $c-success;
    }
    .result-deny & {
      color: $c-error;
    }
  }
  .first-deny {
    color: $c-error;
    font-size: 0.85rem;
    background: rgba($c-error, 0.08);
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
  }

  // ── Trace ─────────────────────────────────────────────────
  .trace-list {
    list-style: none;
    padding: 0;
    margin: 1.2rem 0 0;
  }
  .trace-item {
    display: grid;
    grid-template-columns: 140px 220px 90px 1fr;
    gap: 0.75rem;
    padding: 0.65rem 0.85rem;
    border-radius: 8px;
    align-items: center;
    font-size: 0.875rem;
    background: $l-bg-subtle;
    border: 1px solid $l-border-alt;
    margin-bottom: 0.4rem;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border-inner;
    }
  }
  .trace-item .layer {
    font-weight: 600;
    color: $l-text-700;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;

    @include dark {
      color: $d-text-hi;
    }
  }
  .trace-item .check {
    color: $l-text-600;
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;

    @include dark {
      color: $d-text-muted;
    }
  }
  .trace-item .badge {
    text-align: center;
    border-radius: 999px;
    padding: 0.2rem 0.6rem;
    font-weight: 700;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    background: $l-bg-muted;
    color: $l-text-500;

    @include dark {
      background: $d-bg-hover;
      color: $d-text-muted;
    }
  }
  .trace-item.result-allow .badge {
    background: rgba($c-success, 0.12);
    color: $c-success;
  }
  .trace-item.result-deny .badge {
    background: rgba($c-error, 0.12);
    color: $c-error;
  }
  .trace-item.result-skip .badge {
    background: $l-bg-muted;
    color: $l-text-500;

    @include dark {
      background: $d-bg-hover;
      color: $d-text-muted;
    }
  }
  .trace-item.result-unavailable .badge {
    background: rgba($c-warning, 0.12);
    color: $c-warning;
  }
  .trace-item .detail {
    color: $l-text-600;
    font-size: 0.83rem;

    @include dark {
      color: $d-text-muted;
    }
  }

  // ── Snapshots ─────────────────────────────────────────────
  .snapshots {
    margin-top: 1.4rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }
  .snapshot h4 {
    margin: 0 0 0.5rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: $l-text-700;
    text-transform: uppercase;
    letter-spacing: 0.04em;

    @include dark {
      color: $d-text-hi;
    }
  }
  .snapshot pre {
    background: $l-bg-subtle;
    border: 1px solid $l-border-alt;
    border-radius: 8px;
    padding: 0.8rem;
    font-size: 0.78rem;
    overflow: auto;
    max-height: 280px;
    color: $l-text-700;
    font-family: ui-monospace, monospace;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border-inner;
      color: $d-text-hi;
    }
  }

  .error-message {
    color: $c-error;
    margin-top: 1rem;
    padding: 0.6rem 0.9rem;
    background: rgba($c-error, 0.08);
    border: 1px solid rgba($c-error, 0.25);
    border-radius: 8px;
    font-size: 0.875rem;
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  // ── Mobile ────────────────────────────────────────────────
  @media (max-width: 720px) {
    .auth-simulator-page {
      padding: 1rem;
    }
    .trace-item {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }
    .trace-item .badge {
      width: fit-content;
    }
  }
</style>
