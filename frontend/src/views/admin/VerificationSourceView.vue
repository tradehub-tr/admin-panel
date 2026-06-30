<template>
  <div class="max-w-5xl mx-auto py-6 px-4 text-gray-900 dark:text-gray-100">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <AppIcon name="badge-check" :size="24" class="text-violet-600 dark:text-violet-400" />
          {{ t("verificationSource.title") }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ t("verificationSource.subtitle") }}
        </p>
      </div>
      <button
        class="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-sm inline-flex items-center gap-1.5"
        @click="openAddModal"
      >
        <AppIcon name="plus" :size="14" />
        {{ t("verificationSource.add") }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
      {{ t("verificationSource.loading") }}
    </div>

    <!-- Empty -->
    <div
      v-else-if="!sources.length"
      class="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center"
    >
      <AppIcon name="badge-check" :size="32" class="text-gray-300 dark:text-gray-600 inline-block mb-2" />
      <p class="text-gray-600 dark:text-gray-400 font-semibold">{{ t("verificationSource.empty") }}</p>
    </div>

    <!-- Table -->
    <div
      v-else
      class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
    >
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th class="text-left p-3">{{ t("verificationSource.colIcon") }}</th>
            <th class="text-left p-3">{{ t("verificationSource.colName") }}</th>
            <th class="text-left p-3">{{ t("verificationSource.colDescription") }}</th>
            <th class="text-left p-3">{{ t("verificationSource.colActive") }}</th>
            <th class="text-right p-3">{{ t("verificationSource.colAction") }}</th>
          </tr>
        </thead>
        <tbody class="text-xs">
          <tr
            v-for="src in sources"
            :key="src.name"
            class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40"
          >
            <td class="p-3">
              <img
                v-if="src.icon"
                :src="src.icon"
                class="w-8 h-8 object-contain rounded"
                :alt="src.source_name"
              />
              <span
                v-else
                class="inline-flex w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded items-center justify-center"
              >
                <AppIcon name="image" :size="16" class="text-gray-300" />
              </span>
            </td>
            <td class="p-3 font-medium">{{ src.source_name }}</td>
            <td class="p-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
              {{ src.description || "—" }}
            </td>
            <td class="p-3">
              <span
                class="text-[10px] font-medium px-2 py-0.5 rounded-full"
                :class="
                  src.is_active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                "
              >
                {{ src.is_active ? t("verificationSource.active") : t("verificationSource.inactive") }}
              </span>
            </td>
            <td class="p-3 text-right space-x-1 whitespace-nowrap">
              <button
                class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-[11px] hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center gap-1"
                @click="openEditModal(src)"
              >
                <AppIcon name="pencil" :size="11" />
                {{ t("verificationSource.edit") }}
              </button>
              <button
                class="border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 px-2 py-1 rounded text-[11px] hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center gap-1"
                @click="confirmDelete(src)"
              >
                <AppIcon name="trash-2" :size="11" />
                {{ t("verificationSource.delete") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ConfirmDialog -->
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

    <!-- Add / Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="closeModal"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-5 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">
          {{ form.isEdit ? t("verificationSource.editTitle") : t("verificationSource.addTitle") }}
        </h3>

        <form class="space-y-4" @submit.prevent="saveSource">
          <!-- source_name -->
          <div>
            <label class="form-label">
              {{ t("verificationSource.fieldName") }}
              <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.source_name"
              type="text"
              required
              :placeholder="t('verificationSource.fieldNamePlaceholder')"
              class="form-input"
            />
          </div>

          <!-- description -->
          <div>
            <label class="form-label">{{ t("verificationSource.fieldDescription") }}</label>
            <textarea
              v-model="form.description"
              rows="3"
              :placeholder="t('verificationSource.fieldDescriptionPlaceholder')"
              class="form-input"
            ></textarea>
          </div>

          <!-- is_active -->
          <div class="flex items-center justify-between">
            <label class="form-label" style="margin-bottom: 0">
              {{ t("verificationSource.fieldActive") }}
            </label>
            <BaseSwitch v-model="form.is_active" />
          </div>

          <!-- icon upload -->
          <div>
            <label class="form-label">{{ t("verificationSource.fieldIcon") }}</label>
            <div class="flex items-center gap-3">
              <div
                class="relative w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:border-violet-400 transition-colors"
                :class="form.icon ? 'border-violet-300' : 'border-gray-200 dark:border-[#2a2a35]'"
                @click="iconInput.click()"
              >
                <img v-if="form.icon" :src="form.icon" class="w-full h-full object-contain" />
                <AppIcon v-else name="image-plus" :size="20" class="text-gray-300" />

                <!-- Progress bar -->
                <div
                  v-if="iconUpload.status.value === 'uploading'"
                  class="absolute top-1/2 left-[15%] right-[15%] -translate-y-1/2 h-2 bg-black/75 border border-black/80 rounded-full overflow-hidden z-10 pointer-events-none"
                >
                  <div
                    class="h-full bg-white rounded-full transition-all duration-300"
                    :style="{ width: Math.max(4, iconUpload.progress.value) + '%' }"
                  ></div>
                </div>
                <Transition name="fade">
                  <div
                    v-if="iconUpload.status.value === 'success'"
                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-500/90 z-20 flex items-center justify-center text-white text-[10px] font-bold pointer-events-none"
                  >
                    ✓
                  </div>
                </Transition>
              </div>

              <div class="flex-1">
                <button
                  type="button"
                  class="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1.5 rounded text-xs inline-flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700"
                  @click="iconInput.click()"
                >
                  <AppIcon v-if="form.iconUploading" name="loader" :size="12" class="animate-spin" />
                  <AppIcon v-else name="upload" :size="12" />
                  {{ form.icon ? t("verificationSource.changeIcon") : t("verificationSource.uploadIcon") }}
                </button>
                <button
                  v-if="form.icon"
                  type="button"
                  class="ml-2 text-xs text-red-400 hover:text-red-600"
                  @click="form.icon = ''"
                >
                  {{ t("verificationSource.removeIcon") }}
                </button>
                <p class="text-[11px] text-gray-400 mt-1">{{ t("verificationSource.iconHint") }}</p>
              </div>
            </div>
            <input
              ref="iconInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleIconUpload"
            />
          </div>

          <!-- Error -->
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
              @click="closeModal"
            >
              {{ t("verificationSource.cancel") }}
            </button>
            <button
              type="submit"
              :disabled="form.saving || !form.source_name.trim()"
              class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {{ form.saving ? t("verificationSource.saving") : t("verificationSource.save") }}
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
  import BaseSwitch from "@/components/common/BaseSwitch.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import { useToast } from "@/composables/useToast";
  import { useImageUploadProgress } from "@/composables/useImageUploadProgress";

  const { t } = useI18n();
  const toast = useToast();
  const iconUpload = useImageUploadProgress();

  const loading = ref(true);
  const sources = ref([]);

  // ─── Confirm Dialog ───────────────────────────────────────────────────────────
  const confirmOpen = ref(false);
  const confirmConfig = ref({
    title: "",
    message: "",
    confirmLabel: "",
    cancelLabel: "",
    tone: "danger",
  });
  let confirmResolver = null;

  function askConfirm(config) {
    return new Promise((resolve) => {
      confirmConfig.value = {
        confirmLabel: t("verificationSource.ok"),
        cancelLabel: t("verificationSource.cancel"),
        tone: "danger",
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

  // ─── Modal state ──────────────────────────────────────────────────────────────
  const showModal = ref(false);
  const modalError = ref("");
  const iconInput = ref(null);

  const defaultForm = () => ({
    isEdit: false,
    name: "",
    source_name: "",
    description: "",
    is_active: true,
    icon: "",
    iconUploading: false,
    saving: false,
  });

  const form = ref(defaultForm());

  // ─── CRUD ─────────────────────────────────────────────────────────────────────
  async function loadSources() {
    loading.value = true;
    try {
      const res = await api.getList("Verification Source", {
        fields: ["name", "source_name", "icon", "description", "is_active"],
        limit_page_length: 100,
        order_by: "source_name asc",
      });
      sources.value = res.data || [];
    } catch (e) {
      toast.error(e.message || t("verificationSource.loadError"));
    } finally {
      loading.value = false;
    }
  }

  function openAddModal() {
    form.value = defaultForm();
    modalError.value = "";
    showModal.value = true;
  }

  function openEditModal(src) {
    form.value = {
      isEdit: true,
      name: src.name,
      source_name: src.source_name || "",
      description: src.description || "",
      is_active: !!src.is_active,
      icon: src.icon || "",
      iconUploading: false,
      saving: false,
    };
    modalError.value = "";
    showModal.value = true;
  }

  function closeModal() {
    showModal.value = false;
  }

  async function handleIconUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    form.value.iconUploading = true;
    iconUpload.start();
    try {
      const url = await api.uploadFile(file, "Home");
      form.value.icon = url;
      await iconUpload.finish();
      toast.success(t("verificationSource.iconUploaded"));
    } catch (err) {
      iconUpload.fail();
      toast.error(t("verificationSource.iconUploadFailed", { error: err.message || "" }));
    } finally {
      form.value.iconUploading = false;
      e.target.value = "";
    }
  }

  async function saveSource() {
    modalError.value = "";
    const payload = {
      source_name: form.value.source_name.trim(),
      description: form.value.description.trim(),
      is_active: form.value.is_active ? 1 : 0,
      icon: form.value.icon || null,
    };
    form.value.saving = true;
    try {
      if (form.value.isEdit) {
        await api.updateDoc("Verification Source", form.value.name, payload);
        toast.success(t("verificationSource.updated"));
      } else {
        await api.createDoc("Verification Source", payload);
        toast.success(t("verificationSource.created"));
      }
      showModal.value = false;
      await loadSources();
    } catch (e) {
      modalError.value = e.message || t("verificationSource.saveError");
    } finally {
      form.value.saving = false;
    }
  }

  async function confirmDelete(src) {
    const ok = await askConfirm({
      title: t("verificationSource.deleteTitle"),
      message: t("verificationSource.deleteMessage", { name: src.source_name }),
      confirmLabel: t("verificationSource.delete"),
      cancelLabel: t("verificationSource.cancel"),
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteDoc("Verification Source", src.name);
      toast.success(t("verificationSource.deleted"));
      await loadSources();
    } catch (e) {
      toast.error(e.message || t("verificationSource.deleteError"));
    }
  }

  onMounted(loadSources);
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
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
