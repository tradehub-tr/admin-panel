<template>
  <div class="max-w-4xl mx-auto py-6 px-4 text-gray-900 dark:text-gray-100">
    <!-- Header -->
    <div class="flex items-start justify-between mb-6 gap-3">
      <div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
        >
          <AppIcon name="shield-check" :size="24" class="text-emerald-600 dark:text-emerald-400" />
          {{ t("myVerification.pageTitle") }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
          {{ t("myVerification.description") }}
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-[0.97] transition-colors"
          @click="openRequest"
        >
          <AppIcon name="clipboard-check" :size="15" />
          {{ t("myVerification.requestAudit") }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white transition-colors"
          @click="openDocument"
        >
          <AppIcon name="plus" :size="15" />
          {{ t("myVerification.haveDocument") }}
        </button>
      </div>
    </div>

    <!-- Info banner -->
    <div
      class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3 mb-5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2"
    >
      <AppIcon name="info" :size="14" class="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
      <span>{{ t("myVerification.infoText") }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
      {{ t("myVerification.loading") }}
    </div>

    <!-- Empty state -->
    <div
      v-else-if="verifications.length === 0"
      class="text-center py-14 text-gray-400 dark:text-gray-500 text-sm"
    >
      <AppIcon name="shield" :size="36" class="mx-auto mb-3 opacity-30" />
      <p>{{ t("myVerification.emptyText") }}</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
            >
              {{ t("myVerification.colSource") }}
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
            >
              {{ t("myVerification.colStatus") }}
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
            >
              {{ t("myVerification.colInspectionDate") }}
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
            >
              {{ t("myVerification.colExpiryDate") }}
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
            >
              {{ t("myVerification.colDocument") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
          <tr
            v-for="v in verifications"
            :key="v.name"
            class="bg-white dark:bg-gray-800/30 hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors"
          >
            <td class="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
              {{ v.source_name || v.source }}
            </td>
            <td class="px-4 py-3">
              <span
                :class="['inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', statusBadge(v.status).cls]"
              >
                <AppIcon :name="statusBadge(v.status).icon" :size="11" />
                {{ statusLabel(v.status) }}
              </span>
              <div v-if="v.status === 'Scheduled' && v.scheduled_date" class="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                {{ t("myVerification.scheduledDateLabel") }}: {{ v.scheduled_date }}
              </div>
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
              {{ v.inspection_date || "—" }}
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
              {{ v.expiry_date || "—" }}
            </td>
            <td class="px-4 py-3">
              <a
                v-if="v.document"
                :href="v.document"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline text-xs"
              >
                <AppIcon name="file-text" :size="13" />
                {{ docFilename(v.document) }}
              </a>
              <button
                v-else-if="['Requested', 'Scheduled'].includes(v.status)"
                type="button"
                class="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-0.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                @click="openAttach(v)"
              >
                <AppIcon name="upload-cloud" :size="12" />
                {{ t("myVerification.uploadForRecord") }}
              </button>
              <span v-else class="text-gray-400 dark:text-gray-600 text-xs">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          @click.self="closeModal"
        >
          <div
            class="bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-md"
          >
            <!-- Modal header -->
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10"
            >
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                {{ mode === "request" ? t("myVerification.requestTitle") : t("myVerification.newApplication") }}
              </h3>
              <button
                type="button"
                class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                :aria-label="t('myVerification.cancel')"
                @click="closeModal"
              >
                <AppIcon name="x" :size="18" />
              </button>
            </div>

            <!-- Modal body -->
            <form class="space-y-4 px-5 py-4" @submit.prevent="submit">
              <!-- Verification Source -->
              <div>
                <label class="form-label">
                  {{ t("myVerification.source") }}
                  <span class="text-red-500 ml-0.5">*</span>
                </label>
                <LinkInput
                  v-model="form.source"
                  doctype="Verification Source"
                  :filters="[['is_active', '=', 1]]"
                  :placeholder="t('myVerification.sourcePlaceholder')"
                />
              </div>

              <!-- Request note (yalnız talep modu) -->
              <div v-if="mode === 'request'">
                <label class="form-label">{{ t("myVerification.requestNote") }}</label>
                <textarea
                  v-model="form.request_note"
                  rows="3"
                  class="form-input"
                  :placeholder="t('myVerification.requestNotePlaceholder')"
                ></textarea>
              </div>

              <!-- Document upload -->
              <div v-if="mode !== 'request'">
                <label class="form-label">
                  {{ t("myVerification.document") }}
                  <span class="text-red-500 ml-0.5">*</span>
                </label>
                <!-- Dropzone (shown when no doc yet or upload in progress) -->
                <div
                  v-if="!form.document || docUpload.status.value !== 'idle'"
                  class="relative"
                >
                  <input
                    id="verif-doc-upload"
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    class="hidden"
                    @change="uploadDocument"
                  />
                  <label
                    for="verif-doc-upload"
                    class="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 rounded-lg p-3 cursor-pointer flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                    :class="uploading ? 'opacity-60 pointer-events-none' : ''"
                  >
                    <AppIcon
                      :name="uploading ? 'loader' : 'upload-cloud'"
                      :size="16"
                      :class="uploading ? 'animate-spin' : ''"
                    />
                    {{
                      uploading
                        ? t("myVerification.uploading")
                        : t("myVerification.uploadDocument")
                    }}
                  </label>
                  <!-- Progress bar overlay -->
                  <div
                    v-if="docUpload.status.value === 'uploading'"
                    class="absolute bottom-2 left-[15%] right-[15%] h-2 bg-black/75 border border-black/80 rounded-full overflow-hidden z-10 pointer-events-none"
                  >
                    <div
                      class="h-full bg-white rounded-full transition-all duration-300"
                      :style="{ width: Math.max(4, docUpload.progress.value) + '%' }"
                    ></div>
                  </div>
                  <Transition name="fade">
                    <div
                      v-if="docUpload.status.value === 'success'"
                      class="absolute top-1/2 right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500/90 z-20 flex items-center justify-center text-white text-xs font-bold pointer-events-none"
                    >
                      ✓
                    </div>
                  </Transition>
                </div>

                <!-- Uploaded doc preview -->
                <div
                  v-else
                  class="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded"
                >
                  <AppIcon
                    name="file-text"
                    :size="16"
                    class="text-emerald-700 dark:text-emerald-400"
                  />
                  <a
                    :href="form.document"
                    target="_blank"
                    class="text-sm text-emerald-700 dark:text-emerald-400 hover:underline truncate flex-1"
                  >
                    {{ docFilename(form.document) }}
                  </a>
                  <button
                    type="button"
                    class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    :title="t('myVerification.removeDocument')"
                    @click="form.document = ''"
                  >
                    <AppIcon name="x" :size="14" />
                  </button>
                </div>

                <p
                  v-if="uploadError"
                  class="text-xs text-red-600 dark:text-red-400 mt-1"
                >
                  {{ uploadError }}
                </p>
              </div>

              <!-- Dates -->
              <div v-if="mode !== 'request'" class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">{{ t("myVerification.inspectionDate") }}</label>
                  <input
                    v-model="form.inspection_date"
                    type="date"
                    class="form-input"
                  />
                </div>
                <div>
                  <label class="form-label">{{ t("myVerification.expiryDate") }}</label>
                  <input
                    v-model="form.expiry_date"
                    type="date"
                    class="form-input"
                  />
                </div>
              </div>

              <!-- Modal-level error -->
              <div
                v-if="modalError"
                class="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 rounded whitespace-pre-line"
              >
                {{ modalError }}
              </div>

              <!-- Actions -->
              <div class="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  @click="closeModal"
                >
                  {{ t("myVerification.cancel") }}
                </button>
                <button
                  type="submit"
                  :disabled="submitting || uploading || !form.source || (mode !== 'request' && !form.document)"
                  class="px-4 py-2 rounded text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-colors"
                >
                  {{ submitting ? t("myVerification.submitting") : (mode === "request" ? t("myVerification.submitRequest") : t("myVerification.submit")) }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import LinkInput from "@/components/common/LinkInput.vue";
  import { useImageUploadProgress } from "@/composables/useImageUploadProgress";
  import { useToast } from "@/composables/useToast";

  const { t } = useI18n();
  const toast = useToast();
  const docUpload = useImageUploadProgress();

  // ── State ─────────────────────────────────────────────────────────────
  const loading = ref(true);
  const verifications = ref([]);

  const showModal = ref(false);
  const mode = ref("document");
  const attachTarget = ref(null);
  const submitting = ref(false);
  const uploading = ref(false);
  const uploadError = ref("");
  const modalError = ref("");

  const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];
  // 10 MB limit — MyCertificationsView ile aynı
  const MAX_DOC_SIZE = 10 * 1024 * 1024;

  const defaultForm = () => ({
    source: "",
    document: "",
    inspection_date: "",
    expiry_date: "",
    request_note: "",
  });
  const form = ref(defaultForm());

  // ── Helpers ───────────────────────────────────────────────────────────
  function statusLabel(status) {
    const map = {
      Requested: "statusRequested",
      Scheduled: "statusScheduled",
      Pending: "statusPending",
      Verified: "statusVerified",
      Rejected: "statusRejected",
    };
    return t("myVerification." + (map[status] || "statusPending"));
  }

  function statusBadge(status) {
    if (status === "Verified") return { cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: "check-circle" };
    if (status === "Rejected") return { cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: "x-circle" };
    if (status === "Requested") return { cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: "clipboard-check" };
    if (status === "Scheduled") return { cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", icon: "calendar" };
    return { cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: "clock" };
  }

  function docFilename(url) {
    if (!url) return "";
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1] || url);
  }

  // ── Data loading ──────────────────────────────────────────────────────
  async function loadAll() {
    loading.value = true;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.api.seller_verifications.get_my_verifications"
      );
      verifications.value = res?.message || res || [];
    } catch (e) {
      console.error("Doğrulama başvuruları yüklenemedi:", e);
    } finally {
      loading.value = false;
    }
  }

  // ── Modal ─────────────────────────────────────────────────────────────
  function resetForm() {
    form.value = defaultForm();
    uploadError.value = "";
    modalError.value = "";
  }

  function openDocument() {
    resetForm();
    mode.value = "document";
    attachTarget.value = null;
    showModal.value = true;
  }

  function openRequest() {
    resetForm();
    mode.value = "request";
    attachTarget.value = null;
    showModal.value = true;
  }

  function openAttach(record) {
    resetForm();
    mode.value = "attach";
    attachTarget.value = record.name;
    form.value.source = record.source;
    showModal.value = true;
  }

  function closeModal() {
    showModal.value = false;
  }

  // ── Document upload ───────────────────────────────────────────────────
  async function uploadDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadError.value = "";

    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      uploadError.value = t("myVerification.errInvalidFileType");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_DOC_SIZE) {
      uploadError.value = t("myVerification.errFileTooLarge");
      event.target.value = "";
      return;
    }

    uploading.value = true;
    docUpload.start();
    try {
      const url = await api.uploadCertDocument(file);
      form.value.document = url;
      await docUpload.finish();
    } catch (e) {
      docUpload.fail();
      uploadError.value = e.message || t("myVerification.errUploadFailed");
    } finally {
      uploading.value = false;
      event.target.value = "";
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function submit() {
    if (!form.value.source) return;
    if (mode.value !== "request" && !form.value.document) return;
    modalError.value = "";
    submitting.value = true;
    try {
      if (mode.value === "request") {
        await api.callMethod(
          "tradehub_core.api.seller_verifications.request_my_verification",
          { source: form.value.source, request_note: form.value.request_note || null }
        );
        toast.success(t("myVerification.requestSuccess"));
      } else if (mode.value === "attach") {
        await api.callMethod(
          "tradehub_core.api.seller_verifications.attach_verification_document",
          {
            name: attachTarget.value,
            document: form.value.document,
            inspection_date: form.value.inspection_date || null,
            expiry_date: form.value.expiry_date || null,
          }
        );
        toast.success(t("myVerification.attachSuccess"));
      } else {
        await api.callMethod(
          "tradehub_core.api.seller_verifications.create_my_verification",
          {
            source: form.value.source,
            document: form.value.document,
            inspection_date: form.value.inspection_date || null,
            expiry_date: form.value.expiry_date || null,
          }
        );
        toast.success(t("myVerification.successMessage"));
      }
      closeModal();
      await loadAll();
    } catch (e) {
      modalError.value = e.message || t("myVerification.errGeneric");
    } finally {
      submitting.value = false;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────
  onMounted(loadAll);
</script>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.15s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
