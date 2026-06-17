<template>
  <div class="max-w-6xl mx-auto py-6 px-4 text-gray-900 dark:text-gray-100">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <AppIcon name="shield-check" :size="24" class="text-violet-600 dark:text-violet-400" />
          {{ t("certVerification.title") }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ t("certVerification.subtitle") }}
        </p>
      </div>
      <div class="flex items-center gap-2" data-tour="cv-controls">
        <ViewModeToggle v-model="viewMode" />
        <button
          class="text-xs border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-1 text-gray-700 dark:text-gray-300"
          @click="loadPending"
        >
          <AppIcon name="refresh-cw" :size="12" />
          {{ t("certVerification.refresh") }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
      {{ t("certVerification.loading") }}
    </div>

    <div
      v-else-if="!pending.length"
      class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-8 text-center"
    >
      <AppIcon
        name="check-circle"
        :size="32"
        class="text-emerald-600 dark:text-emerald-400 inline-block mb-2"
      />
      <p class="text-emerald-800 dark:text-emerald-300 font-semibold">
        {{ t("certVerification.emptyTitle") }}
      </p>
      <p class="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
        {{ t("certVerification.emptyText") }}
      </p>
    </div>

    <!-- Table modu -->
    <div
      v-else-if="viewMode === 'table'"
      class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
      data-tour="cv-table"
    >
      <table class="w-full text-sm">
        <thead
          class="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400"
        >
          <tr>
            <th class="text-left p-3">{{ t("certVerification.colStore") }}</th>
            <th class="text-left p-3">{{ t("certVerification.colCertificate") }}</th>
            <th class="text-left p-3">{{ t("certVerification.colDates") }}</th>
            <th class="text-left p-3">{{ t("certVerification.colDocument") }}</th>
            <th class="text-left p-3">{{ t("certVerification.colUploaded") }}</th>
            <th class="text-right p-3">{{ t("certVerification.colAction") }}</th>
          </tr>
        </thead>
        <tbody class="text-xs">
          <tr
            v-for="r in pending"
            :key="r.row_name"
            class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40"
          >
            <td class="p-3 font-medium">
              {{ r.seller_name || r.seller_profile }}
              <div class="text-gray-400 text-[10px]">{{ r.seller_profile }}</div>
            </td>
            <td class="p-3">
              <strong>{{ r.certification_type }}</strong>
              <div class="text-[10px] text-gray-500">
                {{
                  r.category === "Management"
                    ? t("certVerification.categoryManagement")
                    : r.category === "Product"
                      ? t("certVerification.categoryProduct")
                      : ""
                }}
              </div>
            </td>
            <td class="p-3">
              <div v-if="r.issued_date">
                {{ t("certVerification.issuedLabel") }} {{ r.issued_date }}
              </div>
              <div v-if="r.expiry_date">
                {{ t("certVerification.expiryLabel") }} {{ r.expiry_date }}
              </div>
              <div v-if="!r.issued_date && !r.expiry_date" class="text-gray-400">—</div>
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
                {{ t("certVerification.noDocument") }}
              </span>
            </td>
            <td class="p-3 text-gray-500">
              {{ formatRelative(r.creation) }}
            </td>
            <td class="p-3 text-right space-x-1 whitespace-nowrap">
              <button
                class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1"
                @click="verifyCert(r)"
              >
                <AppIcon name="check" :size="11" />
                {{ t("certVerification.verify") }}
              </button>
              <button
                class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1"
                @click="openRejectModal(r)"
              >
                <AppIcon name="x" :size="11" />
                {{ t("certVerification.reject") }}
              </button>
              <a
                v-if="r.document"
                :href="r.document"
                target="_blank"
                class="border border-gray-300 text-gray-700 px-2 py-1 rounded text-[11px] hover:bg-gray-100 inline-flex items-center gap-1"
              >
                <AppIcon name="file-text" :size="11" />
                {{ t("certVerification.view") }}
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grid (kart) modu -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    >
      <div
        v-for="r in pending"
        :key="r.row_name"
        class="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-4 flex flex-col gap-2"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm font-semibold truncate">
              {{ r.seller_name || r.seller_profile }}
            </p>
            <p class="text-[10px] text-gray-400 truncate">{{ r.seller_profile }}</p>
          </div>
          <span
            class="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
            :class="statusBadgeClass(r.verification_status)"
          >
            {{ statusLabel(r.verification_status) }}
          </span>
        </div>
        <div>
          <p class="text-sm font-medium">{{ r.certification_type }}</p>
          <p v-if="r.category" class="text-[10px] text-gray-500">
            {{
              r.category === "Management"
                ? t("certVerification.categoryManagement")
                : r.category === "Product"
                  ? t("certVerification.categoryProduct")
                  : ""
            }}
          </p>
        </div>
        <p class="text-[10px] text-gray-500">{{ formatRelative(r.creation) }}</p>
        <div class="flex items-center gap-1 flex-wrap pt-1">
          <button
            class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1"
            @click="verifyCert(r)"
          >
            <AppIcon name="check" :size="11" />
            {{ t("certVerification.verify") }}
          </button>
          <button
            class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1"
            @click="openRejectModal(r)"
          >
            <AppIcon name="x" :size="11" />
            {{ t("certVerification.reject") }}
          </button>
          <a
            v-if="r.document"
            :href="r.document"
            target="_blank"
            class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-[11px] hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center gap-1"
          >
            <AppIcon name="file-text" :size="11" />
            {{ t("certVerification.view") }}
          </a>
        </div>
      </div>
    </div>

    <!-- List (kompakt) modu -->
    <div
      v-else-if="viewMode === 'list'"
      class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
    >
      <div
        v-for="r in pending"
        :key="r.row_name"
        class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900/40"
      >
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold truncate">
            {{ r.seller_name || r.seller_profile }}
            <span class="font-normal text-gray-500">· {{ r.certification_type }}</span>
          </p>
          <p class="text-[10px] text-gray-400">{{ formatRelative(r.creation) }}</p>
        </div>
        <span
          class="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-none"
          :class="statusBadgeClass(r.verification_status)"
        >
          {{ statusLabel(r.verification_status) }}
        </span>
        <div class="flex items-center gap-1 flex-none">
          <button
            class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1"
            @click="verifyCert(r)"
          >
            <AppIcon name="check" :size="11" />
            {{ t("certVerification.verify") }}
          </button>
          <button
            class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[11px] font-medium inline-flex items-center gap-1"
            @click="openRejectModal(r)"
          >
            <AppIcon name="x" :size="11" />
            {{ t("certVerification.reject") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Kanban modu — doğrulama durumuna göre kolonlar (salt-okunur) -->
    <KanbanBoard
      v-else-if="viewMode === 'kanban'"
      :items="kanbanItems"
      :columns="kanbanColumns"
      status-field="verification_status"
      :draggable="false"
      @item-click="openRejectModal"
    >
      <template #card="{ item }">
        <p class="text-xs font-semibold truncate">
          {{ item.seller_name || item.seller_profile }}
        </p>
        <p class="text-[11px] text-gray-600 dark:text-gray-300 truncate">
          {{ item.certification_type }}
        </p>
        <p class="text-[10px] text-gray-400 mt-1">{{ formatRelative(item.creation) }}</p>
      </template>
    </KanbanBoard>

    <!-- ─── Custom Confirm Dialog ─── -->
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

    <!-- ─── Modal: Reject (sebep zorunlu) ─── -->
    <div
      v-if="showRejectModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="showRejectModal = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
          {{ t("certVerification.rejectTitle") }}
        </h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {{ t("certVerification.rejectIntroPre") }}
          <strong>{{ rejectContext?.certification_type }}</strong>
          {{ t("certVerification.rejectIntroMid") }}
          <strong>{{ rejectContext?.seller_name }}</strong>
        </p>
        <form class="space-y-3" @submit.prevent="submitReject">
          <div>
            <label class="form-label">{{ t("certVerification.rejectReasonLabel") }}</label>
            <textarea
              v-model="rejectReason"
              rows="4"
              required
              :placeholder="t('certVerification.rejectReasonPlaceholder')"
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
            <span>{{ t("certVerification.rejectNotifyHint") }}</span>
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
              {{ t("certVerification.cancel") }}
            </button>
            <button
              type="submit"
              :disabled="modalSubmitting || !rejectReason.trim()"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {{ modalSubmitting ? t("certVerification.rejecting") : t("certVerification.reject") }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import KanbanBoard from "@/components/common/KanbanBoard.vue";
  import { useListViewMode } from "@/composables/useListViewMode";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const { viewMode } = useListViewMode("cert-verification", "table");

  // Sayfa-içi onboarding: liste/tablo → onay-red aksiyonları → yenile.
  usePageTour("cert-verification", () => [
    {
      target: '[data-tour="cv-table"]',
      title: t("tourSteps.page.cvTable_t"),
      desc: t("tourSteps.page.cvTable_d"),
    },
    {
      target: '[data-tour="cv-controls"]',
      title: t("tourSteps.page.cvControls_t"),
      desc: t("tourSteps.page.cvControls_d"),
    },
  ]);

  const loading = ref(true);
  const pending = ref([]);

  // verification_status: Pending / Verified / Rejected (DocType gerçek değerleri)
  const kanbanColumns = [
    { value: "Pending", label: t("certVerification.title"), color: "#f59e0b" },
    { value: "Verified", label: t("certVerification.verify"), color: "#10b981" },
    { value: "Rejected", label: t("certVerification.reject"), color: "#ef4444" },
  ];

  // KanbanBoard kartı `item.name` ile :key'lenir; satır kimliği row_name → name alias.
  const kanbanItems = computed(() => pending.value.map((r) => ({ ...r, name: r.row_name })));

  function statusLabel(s) {
    if (s === "Verified") return t("certVerification.verify");
    if (s === "Rejected") return t("certVerification.reject");
    return t("certVerification.title");
  }

  function statusBadgeClass(s) {
    if (s === "Verified")
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    if (s === "Rejected") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }

  const showRejectModal = ref(false);
  const rejectContext = ref(null);
  const rejectReason = ref("");
  const modalError = ref("");
  const modalSubmitting = ref(false);

  const confirmOpen = ref(false);
  const confirmConfig = ref({
    title: "",
    message: "",
    confirmLabel: t("certVerification.ok"),
    cancelLabel: t("certVerification.cancel"),
    tone: "primary",
  });
  let confirmResolver = null;

  function askConfirm(config) {
    return new Promise((resolve) => {
      confirmConfig.value = {
        confirmLabel: t("certVerification.ok"),
        cancelLabel: t("certVerification.cancel"),
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

  function docFilename(url) {
    if (!url) return "";
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1] || url);
  }

  function parseFrappeDate(dt) {
    // Frappe datetime: "YYYY-MM-DD HH:MM:SS[.ffffff]" → ISO uyumlu hale getir
    if (!dt) return null;
    let s = String(dt).split(".")[0].replace(" ", "T");
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatRelative(dt) {
    const d = parseFrappeDate(dt);
    if (!d) return "";
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    let rel;
    if (diffMin < 1) rel = t("certVerification.justNow");
    else if (diffMin < 60) rel = t("certVerification.minutesAgo", { n: diffMin });
    else {
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) rel = t("certVerification.hoursAgo", { n: diffHr });
      else {
        const diffDay = Math.floor(diffHr / 24);
        rel = t("certVerification.daysAgo", { n: diffDay });
      }
    }
    // Mutlak tarih + göreceli birlikte göster — net olsun
    const abs = d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${abs} (${rel})`;
  }

  async function loadPending() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.seller_certifications.list_pending_seller_certs"
      );
      pending.value = res?.message?.data || res?.data || [];
    } catch (e) {
      console.error("Pending sertifikalar yüklenemedi:", e);
      pending.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function verifyCert(r) {
    const ok = await askConfirm({
      title: t("certVerification.verifyConfirmTitle"),
      message: t("certVerification.verifyConfirmMessage", { type: r.certification_type }),
      confirmLabel: t("certVerification.verify"),
      cancelLabel: t("certVerification.dismiss"),
      tone: "primary",
    });
    if (!ok) return;
    try {
      await api.callMethod("tradehub_core.api.seller_certifications.verify_seller_cert", {
        row_name: r.row_name,
      });
      await loadPending();
    } catch (e) {
      alert(e.message || t("certVerification.verifyError"));
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
      modalError.value = t("certVerification.reasonRequired");
      return;
    }
    modalSubmitting.value = true;
    try {
      await api.callMethod("tradehub_core.api.seller_certifications.reject_seller_cert", {
        row_name: rejectContext.value.row_name,
        reason: rejectReason.value.trim(),
      });
      showRejectModal.value = false;
      await loadPending();
    } catch (e) {
      modalError.value = e.message || t("certVerification.genericError");
    } finally {
      modalSubmitting.value = false;
    }
  }

  onMounted(loadPending);
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
