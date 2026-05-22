<template>
  <div class="anomaly-dashboard">
    <div class="page-header">
      <div>
        <h1>🚨 Anomali Dashboard</h1>
        <p class="subtitle">
          OpenClaw kuralları tarafından tespit edilen şüpheli yetki olayları.
          Sistem her saat scan eder, manuel trigger da yapabilirsiniz.
        </p>
      </div>
      <button class="btn-primary" type="button" :disabled="triggering" @click="triggerNow">
        {{ triggering ? "Tarama…" : "▶ Şimdi Tara" }}
      </button>
    </div>

    <div class="toolbar">
      <label class="field">
        <span class="label">Status</span>
        <select v-model="filterStatus" @change="load">
          <option value="open">Açık</option>
          <option value="acknowledged">Onaylanmış</option>
          <option value="resolved">Çözüldü</option>
          <option value="false_positive">False Positive</option>
          <option value="">Tümü</option>
        </select>
      </label>
      <label class="field">
        <span class="label">Severity</span>
        <select v-model="filterSeverity" @change="load">
          <option value="">Tümü</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>
      </label>
      <button class="btn-secondary" type="button" @click="load">Yenile</button>
    </div>

    <p v-if="loading" class="state">Yükleniyor…</p>
    <p v-else-if="!alerts.length" class="state empty">
      🎉 Açık anomali yok.
    </p>

    <ul v-else class="alert-list">
      <li v-for="a in alerts" :key="a.name" class="alert-card" :class="`sev-${a.severity}`">
        <div class="card-top">
          <span class="sev-badge">{{ a.severity }}</span>
          <strong>{{ a.rule }}</strong>
          <span class="muted">{{ formatDate(a.triggered_at) }}</span>
        </div>
        <div class="card-body">
          <span><strong>{{ a.event_count }}</strong> olay</span>
          ·
          <span>Actor: <code>{{ a.actor || "(çoklu)" }}</code></span>
          ·
          <span>Tenant: {{ a.tenant || "—" }}</span>
        </div>
        <div v-if="a.action_taken" class="card-meta">
          Aksiyon: <span class="action-tag">{{ a.action_taken }}</span>
        </div>
        <div class="card-actions">
          <span class="status-badge">{{ a.status }}</span>
          <button v-if="a.status === 'open'" class="btn-link" type="button" @click="ack(a)">
            ✓ Onayla
          </button>
          <button v-if="a.status !== 'resolved'" class="btn-link" type="button" @click="resolve(a, false)">
            Çözüldü
          </button>
          <button v-if="a.status !== 'false_positive'" class="btn-link" type="button" @click="resolve(a, true)">
            False Positive
          </button>
          <button class="btn-link" type="button" @click="viewDetail(a)">Detay</button>
        </div>
      </li>
    </ul>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import api from "@/utils/api";

  const alerts = ref([]);
  const loading = ref(false);
  const triggering = ref(false);
  const errorMessage = ref("");
  const filterStatus = ref("open");
  const filterSeverity = ref("");

  function formatDate(d) {
    if (!d) return "";
    return new Date(d).toLocaleString("tr-TR");
  }

  async function load() {
    loading.value = true;
    errorMessage.value = "";
    try {
      const params = { status: filterStatus.value, severity: filterSeverity.value };
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.anomaly.list_alerts",
        params,
      );
      alerts.value = res?.message || res || [];
    } catch (err) {
      errorMessage.value = err.message || "Yüklenemedi.";
    } finally {
      loading.value = false;
    }
  }

  async function ack(a) {
    const note = window.prompt(`'${a.name}' alert'ini onaylıyorsunuz. Not (opsiyonel):`, "");
    if (note === null) return;
    try {
      await api.callMethod("tradehub_core.api.v1.anomaly.acknowledge_alert", {
        name: a.name,
        notes: note,
      });
      await load();
    } catch (err) {
      errorMessage.value = err.message || "Onaylama başarısız.";
    }
  }

  async function resolve(a, falsePositive) {
    const label = falsePositive ? "False positive" : "Çözüldü";
    const note = window.prompt(`'${a.name}' alert'ini ${label} olarak işaretle. Not:`, "");
    if (note === null) return;
    try {
      await api.callMethod("tradehub_core.api.v1.anomaly.resolve_alert", {
        name: a.name,
        notes: note,
        false_positive: falsePositive ? 1 : 0,
      });
      await load();
    } catch (err) {
      errorMessage.value = err.message || "İşaretleme başarısız.";
    }
  }

  async function viewDetail(a) {
    try {
      const res = await api.callMethod(
        "tradehub_core.api.v1.anomaly.get_alert_detail",
        { name: a.name },
      );
      const detail = res?.message || res;
      const evidenceCount = (detail.evidence || []).length;
      window.alert(
        `Alert ${detail.name}\nRule: ${detail.rule}\nSeverity: ${detail.severity}\n` +
          `Event count: ${detail.event_count}\nEvidence: ${evidenceCount} ADL kayıt`,
      );
    } catch (err) {
      errorMessage.value = err.message || "Detay alınamadı.";
    }
  }

  async function triggerNow() {
    triggering.value = true;
    try {
      const res = await api.callMethod(
        "tradehub_core.api.v1.anomaly.trigger_detection_now",
        {},
      );
      const s = res?.message || res;
      window.alert(
        `Tarama tamamlandı. Değerlendirilen: ${s.evaluated}, Tetiklenen: ${s.fired}, ` +
          `Cooldown skip: ${s.skipped_cooldown}`,
      );
      await load();
    } catch (err) {
      errorMessage.value = err.message || "Tarama başarısız.";
    } finally {
      triggering.value = false;
    }
  }

  onMounted(load);
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .anomaly-dashboard {
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
  .toolbar {
    margin-top: 1rem;
    display: flex;
    gap: 0.75rem;
    align-items: end;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.9rem;
  }
  .field .label {
    color: $l-text-600;
    font-weight: 500;
    @include dark {
      color: $d-text-muted;
    }
  }
  .field select {
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
    background: $l-bg-subtle;
    color: $l-text-900;
    transition: border-color $t-base, box-shadow $t-base, background $t-base;
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
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
  .btn-link {
    background: none;
    border: none;
    color: $brand;
    cursor: pointer;
    padding: 0 0.4rem;
    transition: color $t-base;
    &:hover {
      color: $brand-light;
    }
  }

  .alert-list {
    list-style: none;
    padding: 0;
    margin-top: 1rem;
  }
  .alert-card {
    background: $l-bg;
    border: 1px solid $l-border;
    border-left-width: 5px;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin-bottom: 0.65rem;
    transition: border-color $t-base, background $t-base;
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }
  .alert-card.sev-CRITICAL {
    border-left-color: $c-error;
  }
  .alert-card.sev-HIGH {
    border-left-color: $c-error;
  }
  .alert-card.sev-MEDIUM {
    border-left-color: $c-warning;
  }
  .alert-card.sev-LOW {
    border-left-color: $c-info;
  }
  .card-top {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .sev-badge {
    border-radius: 999px;
    padding: 0.15rem 0.7rem;
    font-size: 0.75rem;
    font-weight: 700;
    background: $l-border-alt;
    color: $l-text-700;
    @include dark {
      background: $d-border-inner;
      color: $d-text-hi;
    }
  }
  .sev-CRITICAL .sev-badge {
    background: rgba($c-error, 0.15);
    color: $c-error;
  }
  .sev-HIGH .sev-badge {
    background: rgba($c-error, 0.12);
    color: $c-error;
  }
  .sev-MEDIUM .sev-badge {
    background: rgba($c-warning, 0.15);
    color: $c-warning;
  }
  .sev-LOW .sev-badge {
    background: rgba($c-info, 0.15);
    color: $c-info;
  }
  .muted {
    color: $l-text-500;
    font-size: 0.85rem;
    margin-left: auto;
    @include dark {
      color: $d-text-muted;
    }
  }
  .card-body {
    margin-top: 0.4rem;
    color: $l-text-700;
    font-size: 0.9rem;
    @include dark {
      color: $d-text-hi;
    }
  }
  .card-body code {
    font-family: ui-monospace, monospace;
    background: $l-bg-subtle;
    border-radius: 3px;
    padding: 0 0.3rem;
    color: $l-text-700;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
    }
  }
  .card-meta {
    margin-top: 0.3rem;
    color: $l-text-500;
    font-size: 0.85rem;
    @include dark {
      color: $d-text-muted;
    }
  }
  .action-tag {
    background: $l-border-alt;
    border-radius: 4px;
    padding: 0.1rem 0.4rem;
    font-family: ui-monospace, monospace;
    font-size: 0.78rem;
    color: $l-text-700;
    @include dark {
      background: $d-border-inner;
      color: $d-text-hi;
    }
  }
  .card-actions {
    margin-top: 0.55rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .status-badge {
    background: $l-bg-subtle;
    color: $l-text-700;
    border-radius: 4px;
    padding: 0.15rem 0.6rem;
    font-size: 0.78rem;
    @include dark {
      background: $d-bg-elevated;
      color: $d-text-hi;
    }
  }
  .error-message {
    color: $c-error;
    margin-top: 0.8rem;
  }
  .state {
    padding: 1rem;
    color: $l-text-500;
    @include dark {
      color: $d-text-muted;
    }
  }

  @media (max-width: 720px) {
    .card-top {
      flex-direction: column;
      align-items: flex-start;
    }
    .muted {
      margin-left: 0;
    }
    .page-header {
      flex-direction: column;
    }
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
