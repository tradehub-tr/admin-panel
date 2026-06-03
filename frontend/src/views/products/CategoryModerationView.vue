<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("categoryModeration.title") }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ t("categoryModeration.subtitle") }}
        </p>
      </div>
      <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadCategories">
        <AppIcon name="refresh-cw" :size="13" />
        {{ t("categoryModeration.refresh") }}
      </button>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">{{ t("categoryModeration.loading") }}</p>
    </div>

    <div v-else-if="categories.length === 0" class="card text-center py-12">
      <AppIcon name="check-circle" :size="32" class="text-emerald-400 mx-auto mb-3" />
      <p class="text-sm text-gray-400">{{ t("categoryModeration.empty") }}</p>
    </div>

    <div v-else class="card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryModeration.colCategoryName") }}
            </th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryModeration.colSeller") }}
            </th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryModeration.colDescription") }}
            </th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryModeration.colDate") }}
            </th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">
              {{ t("categoryModeration.colAction") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
          <tr
            v-for="cat in categories"
            :key="cat.name"
            class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <img v-if="cat.image" :src="cat.image" class="w-8 h-8 rounded object-cover" />
                <div
                  v-else
                  class="w-8 h-8 rounded bg-gray-100 dark:bg-[#2a2a35] flex items-center justify-center"
                >
                  <AppIcon name="folder" :size="14" class="text-gray-400" />
                </div>
                <span class="font-medium text-xs text-gray-800 dark:text-gray-200">{{
                  cat.category_name
                }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
              {{ cat.seller_name }}
            </td>
            <td
              class="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate"
              :title="cat.description"
            >
              {{ cat.description || "—" }}
            </td>
            <td class="px-4 py-3 text-center text-xs text-gray-500">
              {{ formatDate(cat.creation) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-center gap-2">
                <button
                  :disabled="processingId === cat.name"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
                  @click="handleAction(cat, 'approve')"
                >
                  <AppIcon
                    v-if="processingId === cat.name"
                    name="loader"
                    :size="11"
                    class="animate-spin"
                  />
                  <AppIcon v-else name="check" :size="11" />
                  {{ t("categoryModeration.approve") }}
                </button>
                <button
                  :disabled="processingId === cat.name"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
                  @click="openRejectModal(cat)"
                >
                  <AppIcon name="x" :size="11" />
                  {{ t("categoryModeration.reject") }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      v-if="total > pageSize"
      class="flex items-center justify-between mt-4 text-sm text-gray-500"
    >
      <span>{{ t("categoryModeration.totalCount", { count: total }) }}</span>
      <div class="flex items-center gap-2">
        <button
          :disabled="page <= 1"
          class="px-3 py-1 border rounded disabled:opacity-40"
          @click="prevPage"
        >
          ← {{ t("categoryModeration.prev") }}
        </button>
        <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
        <button
          :disabled="page >= Math.ceil(total / pageSize)"
          class="px-3 py-1 border rounded disabled:opacity-40"
          @click="nextPage"
        >
          {{ t("categoryModeration.next") }} →
        </button>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="rejectModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="rejectModal.show = false"></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[420px] max-w-[calc(100vw-32px)]"
      >
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
          {{ t("categoryModeration.rejectReasonTitle") }}
        </h3>
        <p class="text-xs text-gray-400 mb-3">
          <strong>{{ rejectModal.cat?.category_name }}</strong>
          {{ t("categoryModeration.rejectConfirm") }}
        </p>
        <textarea
          v-model="rejectModal.reason"
          rows="3"
          :placeholder="t('categoryModeration.rejectPlaceholder')"
          class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
        ></textarea>
        <div class="flex gap-3 justify-end mt-4">
          <button class="hdr-btn-outlined" @click="rejectModal.show = false">
            {{ t("categoryModeration.cancel") }}
          </button>
          <button :disabled="processingId !== null" class="hdr-btn-danger" @click="confirmReject">
            <AppIcon v-if="processingId" name="loader" :size="13" class="animate-spin" />
            {{ t("categoryModeration.reject") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();
  const toast = useToast();
  const categories = ref([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const pageSize = 20;
  const processingId = ref(null);
  const rejectModal = ref({ show: false, cat: null, reason: "" });

  async function loadCategories() {
    loading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.seller.get_pending_seller_categories", {
        page: page.value,
        page_size: pageSize,
      });
      categories.value = res.message?.categories || [];
      total.value = res.message?.total || 0;
    } catch (err) {
      toast.error(err.message || t("categoryModeration.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function handleAction(cat, action, rejectReason = "") {
    processingId.value = cat.name;
    try {
      await api.callMethod(
        "tradehub_core.api.seller.approve_seller_category",
        {
          category_name: cat.name,
          action,
          reject_reason: rejectReason,
        },
        true
      );
      const msgKey =
        action === "approve" ? "categoryModeration.approved" : "categoryModeration.rejected";
      toast.success(t(msgKey, { name: cat.category_name }));
      await loadCategories();
    } catch (err) {
      toast.error(err.message || t("categoryModeration.actionFailed"));
    } finally {
      processingId.value = null;
    }
  }

  function openRejectModal(cat) {
    rejectModal.value = { show: true, cat, reason: "" };
  }

  async function confirmReject() {
    const { cat, reason } = rejectModal.value;
    rejectModal.value.show = false;
    await handleAction(cat, "reject", reason);
  }

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function prevPage() {
    if (page.value > 1) {
      page.value--;
      loadCategories();
    }
  }
  function nextPage() {
    if (page.value < Math.ceil(total.value / pageSize)) {
      page.value++;
      loadCategories();
    }
  }

  onMounted(loadCategories);
</script>
