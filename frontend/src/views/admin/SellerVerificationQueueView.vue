<template>
  <div class="max-w-6xl mx-auto py-6 px-4 text-gray-900 dark:text-gray-100">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <AppIcon name="shield-alert" :size="24" class="text-violet-600 dark:text-violet-400" />
          {{ t("sellerVerification.title") }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ t("sellerVerification.subtitle") }}
        </p>
      </div>
      <button
        class="text-xs border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1 text-gray-700 dark:text-gray-300"
        @click="loadQueue"
      >
        <AppIcon name="refresh-cw" :size="12" />
        {{ t("sellerVerification.refresh") }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
      {{ t("sellerVerification.loading") }}
    </div>

    <!-- Empty -->
    <div
      v-else-if="!queue.length"
      class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-8 text-center"
    >
      <AppIcon
        name="check-circle"
        :size="32"
        class="text-emerald-600 dark:text-emerald-400 inline-block mb-2"
      />
      <p class="text-emerald-800 dark:text-emerald-300 font-semibold">
        {{ t("sellerVerification.emptyTitle") }}
      </p>
      <p class="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
        {{ t("sellerVerification.emptyText") }}
      </p>
    </div>

    <!-- Table -->
    <div
      v-else
      class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
    >
      <table class="w-full text-sm">
        <thead
          class="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400"
        >
          <tr>
            <th class="text-left p-3">{{ t("sellerVerification.colSeller") }}</th>
            <th class="text-left p-3">{{ t("sellerVerification.colSource") }}</th>
            <th class="text-left p-3">{{ t("sellerVerification.colDates") }}</th>
            <th class="text-left p-3">{{ t("sellerVerification.colDocument") }}</th>
            <th class="text-left p-3">{{ t("sellerVerification.colStatus") }}</th>
            <th class="text-right p-3">{{ t("sellerVerification.colAction") }}</th>
          </tr>
        </thead>
        <tbody class="text-xs">
          <tr
            v-for="r in queue"
            :key="r.name"
            class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40"
          >
            <td class="p-3 font-medium">{{ r.seller_name || r.seller }}</td>
            <td class="p-3">{{ r.source_name || r.source }}</td>
            <td class="p-3">
              <div v-if="r.inspection_date">
                {{ t("sellerVerification.inspectionLabel") }} {{ r.inspection_date }}
              </div>
              <div v-if="r.expiry_date">
                {{ t("sellerVerification.expiryLabel") }} {{ r.expiry_date }}
              </div>
              <div v-if="!r.inspection_date && !r.expiry_date" class="text-gray-400">—</div>
            </td>
            <td class="p-3">
              <a
                v-if="r.document"
                :href="r.document"
                target="_blank"
                class="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <AppIcon name="file-text" :size="12" /> {{ docFilename(r.document) }}
              </a>
              <span v-else class="text-orange-700 inline-flex items-center gap-1">
                <AppIcon name="alert-triangle" :size="12" />
                {{ t("sellerVerification.noDocument") }}
              </span>
            </td>
            <td class="p-3">
              <span
                class="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                :class="statusBadgeClass(r.status)"
              >
                {{ statusLabel(r.status) }}
              </span>
            </td>
            <td class="p-3 text-right space-x-1 whitespace-nowrap">
              <button
                class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1"
                @click="approveVerification(r)"
              >
                <AppIcon name="check" :size="11" />
                {{ t("sellerVerification.approve") }}
              </button>
              <button
                class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1"
                @click="openRejectModal(r)"
              >
                <AppIcon name="x" :size="11" />
                {{ t("sellerVerification.reject") }}
              </button>
              <a
                v-if="r.document"
                :href="r.document"
                target="_blank"
                class="border border-gray-300 text-gray-700 px-2 py-1 rounded text-[11px] hover:bg-gray-100 inline-flex items-center gap-1"
              >
                <AppIcon name="file-text" :size="11" />
                {{ t("sellerVerification.view") }}
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ─── Confirm Dialog ─── -->
    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="confirmConfig.title"
      :message="confirmConfig.message"
      :confirm-label="confirmConfig.confirmLabel"
      :cancel-label="confirmConfig.cancelLabel"
      :tone="confirmConfig.tone"
      @confirm="onConfirmYes"
      @cancel="onConfirmNo"
    />

    <!-- ─── Reject Modal ─── -->
    <div
      v-if="showRejectModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showRejectModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
          {{ t("sellerVerification.rejectTitle") }}
        </h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {{ t("sellerVerification.rejectIntroPre") }}
          <strong>{{ rejectContext?.seller_name || rejectContext?.seller }}</strong>
          {{ t("sellerVerification.rejectIntroMid") }}
          <strong>{{ rejectContext?.source_name || rejectContext?.source }}</strong>
        </p>
        <form class="space-y-3" @submit.prevent="submitReject">
          <div>
            <label class="form-label">{{ t("sellerVerification.rejectReasonLabel") }}</label>
            <textarea
              v-model="rejectReason"
              rows="4"
              required
              :placeholder="t('sellerVerification.rejectReasonPlaceholder')"
              class="form-input"
            ></textarea>
          </div>
          <div
            class="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-2 text-xs text-yellow-900 dark:text-yellow-300 flex items-start gap-2"
          >
            <AppIcon
              name="info"
              :size="14"
              class="text-yellow-700 dark:text-yellow-400 mt-0.5 shrink-0"
            />
            <span>{{ t("sellerVerification.rejectNotifyHint") }}</span>
          </div>
          <div
            v-if="modalError"
            class="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded"
          >
            {{ modalError }}
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              @click="showRejectModal = false"
            >
              {{ t("sellerVerification.cancel") }}
            </button>
            <button
              type="submit"
              :disabled="modalSubmitting || !rejectReason.trim()"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {{
                modalSubmitting
                  ? t("sellerVerification.rejecting")
                  : t("sellerVerification.reject")
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";

  const { t } = useI18n();

  const loading = ref(true);
  const queue = ref([]);

  // ─── Confirm Dialog ───────────────────────────────────────────────────────────
  const confirmOpen = ref(false);
  const confirmConfig = ref({
    title: "",
    message: "",
    confirmLabel: "",
    cancelLabel: "",
    tone: "primary",
  });
  let confirmResolver = null;

  function askConfirm(config) {
    return new Promise((resolve) => {
      confirmConfig.value = {
        confirmLabel: t("sellerVerification.ok"),
        cancelLabel: t("sellerVerification.cancel"),
        tone: "primary",
        ...config,
      };
      confirmOpen.value = true;
      confirmResolver = resolve;
    });
  }
  function onConfirmYes() {
    if (confirmResolver) confirmResolver(true);
    confirmResolver = null;
  }
  function onConfirmNo() {
    if (confirmResolver) confirmResolver(false);
    confirmResolver = null;
  }

  // ─── Reject Modal ─────────────────────────────────────────────────────────────
  const showRejectModal = ref(false);
  const rejectContext = ref(null);
  const rejectReason = ref("");
  const modalError = ref("");
  const modalSubmitting = ref(false);

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function statusLabel(s) {
    if (s === "Verified") return t("sellerVerification.statusVerified");
    if (s === "Rejected") return t("sellerVerification.statusRejected");
    return t("sellerVerification.statusPending");
  }

  function statusBadgeClass(s) {
    if (s === "Verified")
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    if (s === "Rejected")
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }

  function docFilename(url) {
    if (!url) return "";
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1] || url);
  }

  // ─── Data loading ─────────────────────────────────────────────────────────────
  async function loadQueue() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.seller.list_pending_seller_verifications"
      );
      queue.value = res?.message?.data || res?.data || [];
    } catch (e) {
      console.error("Satıcı doğrulama kuyruğu yüklenemedi:", e);
      queue.value = [];
    } finally {
      loading.value = false;
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────
  async function approveVerification(r) {
    const ok = await askConfirm({
      title: t("sellerVerification.approveConfirmTitle"),
      message: t("sellerVerification.approveConfirmMessage", {
        seller: r.seller_name || r.seller,
        source: r.source_name || r.source,
      }),
      confirmLabel: t("sellerVerification.approve"),
      cancelLabel: t("sellerVerification.cancel"),
      tone: "primary",
    });
    if (!ok) return;
    try {
      await api.callMethod("tradehub_core.api.seller.approve_seller_verification", {
        name: r.name,
      });
      await loadQueue();
    } catch (e) {
      alert(e.message || t("sellerVerification.approveError"));
    }
  }

  function openRejectModal(r) {
    rejectContext.value = r;
    rejectReason.value = "";
    modalError.value = "";
    showRejectModal.value = true;
  }

  async function submitReject() {
    modalError.value = "";
    if (!rejectReason.value.trim()) {
      modalError.value = t("sellerVerification.reasonRequired");
      return;
    }
    modalSubmitting.value = true;
    try {
      await api.callMethod("tradehub_core.api.seller.reject_seller_verification", {
        name: rejectContext.value.name,
        reason: rejectReason.value.trim(),
      });
      showRejectModal.value = false;
      await loadQueue();
    } catch (e) {
      modalError.value = e.message || t("sellerVerification.genericError");
    } finally {
      modalSubmitting.value = false;
    }
  }

  onMounted(loadQueue);
</script>

<style scoped>
  .form-label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: #4b5563;
    margin-bottom: 4px;
  }
  .form-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    color: #111827;
    outline: none;
  }
  .form-input:focus {
    border-color: #7c3aed;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
  }
  :global(.dark) .form-input {
    background: #1f2937;
    border-color: #374151;
    color: #f3f4f6;
  }
</style>
