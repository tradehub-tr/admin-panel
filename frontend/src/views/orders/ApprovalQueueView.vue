<template>
  <div class="approval-queue-page">
    <div class="page-header">
      <div>
        <h1>{{ t("approvalQueue.title") }}</h1>
        <p class="subtitle">{{ t("approvalQueue.subtitle") }}</p>
      </div>
      <button class="btn-primary" type="button" @click="reload">
        <RefreshCw :size="16" />
        {{ t("approvalQueue.refresh") }}
      </button>
    </div>

    <p v-if="loading && !approvals.length" class="state">{{ t("approvalQueue.loading") }}</p>
    <p v-else-if="!approvals.length" class="state empty">{{ t("approvalQueue.empty") }}</p>

    <ul v-else class="approval-list">
      <li v-for="a in approvals" :key="a.name" class="approval-card">
        <div class="card-top">
          <div class="card-main">
            <span class="order-id">{{ a.order }}</span>
            <span class="amount">{{ formatAmount(a.amount, a.currency) }}</span>
          </div>
          <div class="card-meta">
            <span class="level-badge" :class="`l${a.current_level}`">
              L{{ a.current_level }} / {{ a.max_level }}
            </span>
            <span class="muted">{{ formatTime(a.started_at) }}</span>
          </div>
        </div>
        <div class="card-detail">
          <span class="label">{{ t("approvalQueue.requisitioner") }}</span>
          <span>{{ a.requisitioner }}</span>
          &nbsp;·&nbsp;
          <span class="label">{{ t("approvalQueue.org") }}</span>
          <span>{{ a.organization || "—" }}</span>
          &nbsp;·&nbsp;
          <span class="label">{{ t("approvalQueue.deadline") }}</span>
          <span>{{ formatTime(a.expires_at) }}</span>
        </div>
        <div class="card-actions">
          <button type="button" class="btn-success" @click="askApprove(a)">
            {{ t("approvalQueue.approve") }}
          </button>
          <button type="button" class="btn-danger" @click="askReject(a)">
            {{ t("approvalQueue.reject") }}
          </button>
          <button type="button" class="btn-ghost" @click="viewDetail(a)">
            {{ t("approvalQueue.detail") }}
          </button>
        </div>
      </li>
    </ul>

    <!-- Detay modal -->
    <div v-if="selectedDetail" class="modal-backdrop" @click.self="selectedDetail = null">
      <div class="modal">
        <h3>{{ t("approvalQueue.detailTitle", { order: selectedDetail.order }) }}</h3>

        <div class="detail-row">
          <b>{{ t("approvalQueue.statusLabel") }}</b> {{ selectedDetail.status }}
        </div>
        <div class="detail-row">
          <b>{{ t("approvalQueue.amountLabel") }}</b>
          {{ formatAmount(selectedDetail.amount, selectedDetail.currency) }}
        </div>
        <div class="detail-row">
          <b>{{ t("approvalQueue.requisitioner") }}</b> {{ selectedDetail.requisitioner }}
        </div>
        <div class="detail-row">
          <b>{{ t("approvalQueue.l1Approvers") }}</b>
          {{ (selectedDetail.rule_approvers?.l1 || []).join(", ") || "—" }}
        </div>
        <div class="detail-row">
          <b>{{ t("approvalQueue.l2Approvers") }}</b>
          {{ (selectedDetail.rule_approvers?.l2 || []).join(", ") || "—" }}
        </div>

        <h4>{{ t("approvalQueue.approvalHistory") }}</h4>
        <ul v-if="selectedDetail.approval_log?.length" class="log-list">
          <li v-for="(log, idx) in selectedDetail.approval_log" :key="idx" class="log-row">
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span :class="['log-action', log.action]">{{ log.action }}</span>
            <span class="log-user">{{ log.approver }}</span>
            <span class="muted">L{{ log.level }}</span>
            <span v-if="log.comment" class="log-comment">— {{ log.comment }}</span>
          </li>
        </ul>
        <p v-else class="muted">{{ t("approvalQueue.noActionsYet") }}</p>

        <div v-if="selectedDetail.rejection_reason" class="reject-box">
          <b>{{ t("approvalQueue.rejectionReason") }}</b> {{ selectedDetail.rejection_reason }}
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="selectedDetail = null">
            {{ t("approvalQueue.close") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { RefreshCw } from "lucide-vue-next";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";

  const { t } = useI18n();

  const approvals = ref([]);
  const loading = ref(false);
  const selectedDetail = ref(null);

  async function reload() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.order_approval.list_pending_approvals"
      );
      approvals.value = res?.message || res || [];
    } catch (err) {
      window.alert(err.message || t("approvalQueue.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function askApprove(approval) {
    const comment = window.prompt(t("approvalQueue.approvePrompt", { order: approval.order }), "");
    if (comment === null) return;
    try {
      await api.callMethod("tradehub_core.api.v1.order_approval.approve", {
        name: approval.name,
        comment,
      });
      await reload();
    } catch (err) {
      window.alert(err.message || t("approvalQueue.approveFailed"));
    }
  }

  async function askReject(approval) {
    const reason = window.prompt(t("approvalQueue.rejectPrompt", { order: approval.order }));
    if (!reason || !reason.trim()) {
      if (reason !== null) window.alert(t("approvalQueue.rejectReasonRequired"));
      return;
    }
    try {
      await api.callMethod("tradehub_core.api.v1.order_approval.reject", {
        name: approval.name,
        reason,
      });
      await reload();
    } catch (err) {
      window.alert(err.message || t("approvalQueue.rejectFailed"));
    }
  }

  async function viewDetail(approval) {
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.v1.order_approval.get_approval_detail",
        { name: approval.name }
      );
      selectedDetail.value = res?.message || res;
    } catch (err) {
      window.alert(err.message || t("approvalQueue.detailLoadFailed"));
    }
  }

  function formatAmount(amount, currency) {
    if (amount == null) return "—";
    const value = Number(amount).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${value} ${currency || ""}`.trim();
  }

  function formatTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  onMounted(reload);
</script>

<style scoped>
  .approval-queue-page {
    padding: 1.5rem;
    max-width: 1100px;
    margin: 0 auto;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }
  h1 {
    font-size: 1.5rem;
    color: #1f2937;
    margin: 0;
  }
  .subtitle {
    color: #6b7280;
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
  }

  .state {
    text-align: center;
    color: #9ca3af;
    padding: 3rem;
    font-size: 0.9rem;
  }
  .state.empty {
    color: #10b981;
    font-size: 1.1rem;
  }
  .muted {
    color: #9ca3af;
    font-size: 0.8125rem;
  }

  .approval-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .approval-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem 1.25rem;
  }
  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }
  .order-id {
    font-weight: 600;
    color: #1f2937;
    margin-right: 0.75rem;
  }
  .amount {
    font-size: 1.125rem;
    font-weight: 600;
    color: #5b21b6;
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .level-badge {
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .level-badge.l1 {
    background: #dbeafe;
    color: #1e40af;
  }
  .level-badge.l2 {
    background: #fee2e2;
    color: #991b1b;
  }
  .card-detail {
    color: #6b7280;
    font-size: 0.8125rem;
    margin-bottom: 0.75rem;
  }
  .label {
    color: #4b5563;
    font-weight: 500;
  }
  .card-actions {
    display: flex;
    gap: 0.5rem;
  }
  .btn-primary,
  .btn-success,
  .btn-danger,
  .btn-secondary,
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.8125rem;
    cursor: pointer;
    border: none;
    font-weight: 500;
  }
  .btn-primary {
    background: #7c3aed;
    color: #fff;
  }
  .btn-success {
    background: #10b981;
    color: #fff;
  }
  .btn-success:hover {
    background: #059669;
  }
  .btn-danger {
    background: #ef4444;
    color: #fff;
  }
  .btn-danger:hover {
    background: #dc2626;
  }
  .btn-secondary {
    background: #fff;
    color: #6b7280;
    border: 1px solid #d1d5db;
  }
  .btn-ghost {
    background: transparent;
    color: #6366f1;
    border: 1px solid #c7d2fe;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal {
    background: #fff;
    border-radius: 8px;
    padding: 1.5rem;
    width: 90%;
    max-width: 640px;
    max-height: 80vh;
    overflow-y: auto;
  }
  .modal h3 {
    margin: 0 0 1rem;
    color: #1f2937;
  }
  .modal h4 {
    margin: 1rem 0 0.5rem;
    color: #374151;
    font-size: 0.9rem;
  }
  .detail-row {
    color: #1f2937;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  .log-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .log-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: #f9fafb;
    border-radius: 4px;
    margin-bottom: 0.375rem;
    font-size: 0.8125rem;
  }
  .log-time {
    color: #6b7280;
    font-family: ui-monospace, monospace;
  }
  .log-action {
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.6875rem;
  }
  .log-action.approved {
    background: #d1fae5;
    color: #065f46;
  }
  .log-action.rejected,
  .log-action.timeout_rejected {
    background: #fee2e2;
    color: #991b1b;
  }
  .log-action.escalated {
    background: #fef3c7;
    color: #92400e;
  }
  .log-user {
    color: #1f2937;
    font-weight: 500;
  }
  .log-comment {
    color: #4b5563;
    font-style: italic;
  }
  .reject-box {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-top: 1rem;
    font-size: 0.875rem;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }
</style>
