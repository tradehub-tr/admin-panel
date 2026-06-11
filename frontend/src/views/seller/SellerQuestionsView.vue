<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("sellerQuestions.title") }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ t("sellerQuestions.subtitle") }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <ViewModeToggle v-model="viewMode" />
        <button
          class="hdr-btn-outlined flex items-center gap-1.5"
          data-tour="sq-refresh"
          @click="loadAll"
        >
          <AppIcon name="refresh-cw" :size="13" />
          {{ t("sellerQuestions.refresh") }}
        </button>
      </div>
    </div>

    <!-- Status Filter Pills -->
    <StatusFilterPills
      v-model="activeTab"
      :options="tabOptions"
      data-tour="sq-filters"
      wrapper-class="flex items-center gap-2 flex-wrap mb-5"
      @change="
        page = 1;
        loadQuestions();
      "
    />

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">{{ t("sellerQuestions.loading") }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="questions.length === 0" class="card text-center py-12">
      <AppIcon name="message-circle" :size="32" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400">{{ t("sellerQuestions.empty") }}</p>
    </div>

    <!-- Grid (kart) görünümü — inline yanıt formu burada -->
    <div v-else-if="viewMode === 'grid'" class="space-y-3">
      <div v-for="q in questions" :key="q.name" class="card p-4">
        <!-- Question header -->
        <div class="flex items-start gap-3 mb-2">
          <span
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold shrink-0"
            >S</span
          >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                v-if="q.has_my_answer"
                class="text-[10px] uppercase tracking-wide font-semibold text-emerald-600 inline-flex items-center gap-0.5"
              >
                <AppIcon name="check-circle-2" :size="11" />
                {{ t("sellerQuestions.answered") }}
              </span>
              <span
                v-else
                class="text-[10px] uppercase tracking-wide font-semibold text-amber-600 inline-flex items-center gap-0.5"
              >
                <AppIcon name="clock" :size="11" />
                {{ t("sellerQuestions.awaitingAnswer") }}
              </span>
              <span class="text-[11px] text-gray-400">·</span>
              <a
                :href="storefrontUrlFor(q.listing)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[12px] text-violet-600 hover:underline truncate"
                >{{ q.listing_title || q.listing }}</a
              >
            </div>
            <div class="text-sm text-gray-900 dark:text-gray-100 font-medium mt-1">
              {{ q.question }}
            </div>
            <div class="text-[11px] text-gray-400 mt-1">
              <span>{{ q.asker_display_name }}</span>
              <span v-if="q.is_kyb_verified" class="ml-1 text-emerald-600"
                >✓ {{ t("sellerQuestions.verified") }}</span
              >
              · {{ formatDate(q.submitted_at) }}
            </div>
          </div>
          <!-- Sağ üst — paneli temizle (soft dismiss; istoc.com'da görünmeye devam eder) -->
          <button
            type="button"
            class="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
            :disabled="dismissingId === q.name"
            :title="t('sellerQuestions.dismissTitle')"
            :aria-label="t('sellerQuestions.dismissAria')"
            @click="confirmDismissQuestion(q.name)"
          >
            <AppIcon name="trash-2" :size="14" />
          </button>
        </div>

        <!-- Existing answers -->
        <div v-if="q.answers && q.answers.length > 0" class="pl-10 mt-2 space-y-1.5">
          <div v-for="a in q.answers" :key="a.name" class="flex items-start gap-2 text-sm">
            <span
              class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0"
              :class="
                a.is_seller_answer ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              "
              >C</span
            >
            <div class="flex-1">
              <div class="text-gray-800 dark:text-gray-200">{{ a.answer }}</div>
              <div class="text-[10px] text-gray-400 mt-0.5">
                {{
                  a.is_seller_answer
                    ? t("sellerQuestions.yourAnswer")
                    : a.responder_type === "admin"
                      ? t("sellerQuestions.adminAnswer")
                      : t("sellerQuestions.otherAnswer")
                }}
                · {{ formatDate(a.submitted_at) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Inline answer form — sadece bu satıcı henüz cevap atmamışsa göster -->
        <div v-if="!q.has_my_answer" class="pl-10 mt-3">
          <button
            v-if="answeringId !== q.name"
            class="text-[12px] font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1"
            @click="startAnswer(q.name)"
          >
            <AppIcon name="edit-3" :size="12" />
            {{ t("sellerQuestions.reply") }}
          </button>
          <div v-else>
            <textarea
              v-model="answerText"
              rows="3"
              maxlength="2000"
              :placeholder="t('sellerQuestions.answerPlaceholder')"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-[#1e1e2a] focus:outline-none focus:border-violet-500 resize-vertical"
            ></textarea>
            <div class="flex items-center justify-between mt-2">
              <span class="text-[10px] text-gray-400">{{ answerText.length }} / 2000</span>
              <div class="flex gap-2">
                <button
                  class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                  @click="cancelAnswer"
                >
                  {{ t("sellerQuestions.cancel") }}
                </button>
                <button
                  class="px-3 py-1 text-xs rounded-md bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-50 flex items-center gap-1"
                  :disabled="submitting || answerText.trim().length < 5"
                  @click="submitAnswer(q.name)"
                >
                  <AppIcon v-if="submitting" name="loader" :size="11" class="animate-spin" />
                  {{
                    submitting ? t("sellerQuestions.submitting") : t("sellerQuestions.submitAnswer")
                  }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- has_my_answer=true ise altta ek mesaj göstermiyoruz; yukarıdaki
             "Yanıtladınız" rozeti zaten durumu net belirtiyor. -->
      </div>
    </div>

    <!-- Kanban görünümü — yanıt durumuna göre (türetilmiş _answerState) -->
    <div v-else-if="viewMode === 'kanban'">
      <KanbanBoard
        :items="decoratedQuestions"
        :columns="kanbanColumns"
        status-field="_answerState"
        :draggable="false"
        @item-click="replyFromOtherMode"
      >
        <template #card="{ item }">
          <a
            :href="storefrontUrlFor(item.listing)"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[11px] text-violet-600 hover:underline truncate block"
            @click.stop
            >{{ item.listing_title || item.listing }}</a
          >
          <div class="text-[13px] font-medium text-gray-900 dark:text-gray-100 mt-1 line-clamp-3">
            {{ item.question }}
          </div>
          <div class="text-[10px] text-gray-400 mt-1.5">
            {{ item.asker_display_name }} · {{ formatDate(item.submitted_at) }}
          </div>
        </template>
      </KanbanBoard>
    </div>

    <!-- Kompakt liste görünümü -->
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="q in questions"
        :key="q.name"
        class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-white/5"
      >
        <span
          class="w-2 h-2 rounded-full flex-none"
          :style="{ background: q.has_my_answer ? '#10b981' : '#f59e0b' }"
        ></span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
            {{ q.question }}
          </p>
          <p class="text-[10px] text-gray-400 truncate">
            {{ q.listing_title || q.listing }} · {{ q.asker_display_name }} ·
            {{ formatDate(q.submitted_at) }}
          </p>
        </div>
        <span
          v-if="q.has_my_answer"
          class="text-[10px] font-semibold text-emerald-600 flex-none inline-flex items-center gap-0.5"
        >
          <AppIcon name="check-circle-2" :size="11" />
          {{ t("sellerQuestions.answered") }}
        </span>
        <button
          v-else
          type="button"
          class="text-[11px] font-medium text-violet-600 hover:text-violet-700 flex-none inline-flex items-center gap-1"
          @click="replyFromOtherMode(q)"
        >
          <AppIcon name="edit-3" :size="12" />
          {{ t("sellerQuestions.reply") }}
        </button>
      </div>
    </div>

    <!-- Tablo görünümü (varsayılan) -->
    <div v-else class="card p-0 overflow-hidden" data-tour="sq-table">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th">{{ t("sellerQuestions.title") }}</th>
              <th class="tbl-th">{{ t("sellerListings.colProduct") }}</th>
              <th class="tbl-th">{{ t("sellerOrders.colBuyer") }}</th>
              <th class="tbl-th">{{ t("sellerListings.colStatus") }}</th>
              <th class="tbl-th">{{ t("sellerOrders.colDate") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="q in questions"
              :key="q.name"
              class="tbl-row border-b border-gray-50 dark:border-white/5"
            >
              <td class="tbl-td">
                <p class="text-xs font-medium text-gray-900 dark:text-gray-100 max-w-[320px]">
                  {{ q.question }}
                </p>
              </td>
              <td class="tbl-td">
                <a
                  :href="storefrontUrlFor(q.listing)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[12px] text-violet-600 hover:underline truncate block max-w-[180px]"
                  >{{ q.listing_title || q.listing }}</a
                >
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-600 dark:text-gray-300">{{
                  q.asker_display_name
                }}</span>
                <span v-if="q.is_kyb_verified" class="ml-1 text-[11px] text-emerald-600"
                  >✓ {{ t("sellerQuestions.verified") }}</span
                >
              </td>
              <td class="tbl-td">
                <span
                  v-if="q.has_my_answer"
                  class="text-[10px] uppercase tracking-wide font-semibold text-emerald-600 inline-flex items-center gap-0.5"
                >
                  <AppIcon name="check-circle-2" :size="11" />
                  {{ t("sellerQuestions.answered") }}
                </span>
                <button
                  v-else
                  type="button"
                  class="text-[11px] font-medium text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
                  @click="replyFromOtherMode(q)"
                >
                  <AppIcon name="edit-3" :size="12" />
                  {{ t("sellerQuestions.reply") }}
                </button>
              </td>
              <td class="tbl-td">
                <span class="text-[11px] text-gray-500">{{ formatDate(q.submitted_at) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="flex justify-center mt-6 gap-2">
      <button
        :disabled="page === 1"
        class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50"
        @click="goPage(page - 1)"
      >
        ‹ {{ t("sellerQuestions.previous") }}
      </button>
      <span class="px-3 py-1 text-xs text-gray-500">{{
        t("sellerQuestions.pageOf", { page, total: totalPages })
      }}</span>
      <button
        :disabled="page >= totalPages"
        class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50"
        @click="goPage(page + 1)"
      >
        {{ t("sellerQuestions.next") }} ›
      </button>
    </div>

    <!-- Onay dialog (native confirm() yerine, marka uyumlu) -->
    <ConfirmDialog
      v-model:open="confirmDialog.open"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-label="confirmDialog.confirmLabel"
      :tone="confirmDialog.tone"
      @confirm="confirmDialog.onConfirm?.()"
    />
  </div>
</template>

<script setup>
  import { ref, reactive, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import KanbanBoard from "@/components/common/KanbanBoard.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { viewMode } = useListViewMode("seller-questions", "table");

  const { t } = useI18n();
  const toast = useToast();

  // Sayfa-içi onboarding: durum filtresi → soru tablosu → yanıtla/yenile.
  usePageTour("seller-questions", () => [
    { target: '[data-tour="sq-filters"]', title: t("tourSteps.page.sqFilters_t"), desc: t("tourSteps.page.sqFilters_d") },
    { target: '[data-tour="sq-table"]', title: t("tourSteps.page.sqTable_t"), desc: t("tourSteps.page.sqTable_d") },
    { target: '[data-tour="sq-refresh"]', title: t("tourSteps.page.sqRefresh_t"), desc: t("tourSteps.page.sqRefresh_d") },
  ]);

  // Custom confirm dialog
  const confirmDialog = reactive({
    open: false,
    title: "",
    message: "",
    confirmLabel: t("sellerQuestions.ok"),
    tone: "primary",
    onConfirm: null,
  });
  function openConfirm({
    title,
    message,
    confirmLabel = t("sellerQuestions.confirm"),
    tone = "primary",
    onConfirm,
  }) {
    confirmDialog.title = title;
    confirmDialog.message = message;
    confirmDialog.confirmLabel = confirmLabel;
    confirmDialog.tone = tone;
    confirmDialog.onConfirm = onConfirm;
    confirmDialog.open = true;
  }

  const tabOptions = computed(() => [
    { value: "all", label: t("sellerQuestions.tabAll"), dot: "bg-violet-400" },
    {
      value: "needs_my_answer",
      label: t("sellerQuestions.tabPending"),
      dot: "bg-amber-400",
      count: counts.value.needs_my_answer,
    },
    {
      value: "answered_by_me",
      label: t("sellerQuestions.tabAnswered"),
      dot: "bg-emerald-400",
      count: counts.value.answered_by_me,
    },
  ]);

  const activeTab = ref("all");
  const questions = ref([]);
  const loading = ref(false);
  const counts = ref({
    pending: 0,
    answered: 0,
    hidden: 0,
    total: 0,
    needs_my_answer: 0,
    answered_by_me: 0,
  });
  const total = ref(0);
  const page = ref(1);
  const pageSize = 20;
  const answeringId = ref(null);
  const dismissingId = ref(null);
  const answerText = ref("");
  const submitting = ref(false);

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

  // Yanıt durumu tek bir backend alanı değil; `has_my_answer`'dan türetilir.
  // Veriyi mutasyona uğratmamak için sarmalı kopya — kanban statusField buna bağlanır.
  const decoratedQuestions = computed(() =>
    questions.value.map((q) => ({
      ...q,
      _answerState: q.has_my_answer ? "answered" : "pending",
    }))
  );

  const kanbanColumns = computed(() => [
    { value: "pending", label: t("sellerQuestions.awaitingAnswer"), color: "#f59e0b" },
    { value: "answered", label: t("sellerQuestions.answered"), color: "#10b981" },
  ]);

  const storefrontBase = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5173/";

  function storefrontUrlFor(listingId) {
    return `${storefrontBase.replace(/\/$/, "")}/pages/product-detail.html?id=${encodeURIComponent(listingId)}`;
  }

  function formatDate(s) {
    if (!s) return "";
    try {
      const d = new Date(s);
      return d.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(s).slice(0, 16);
    }
  }

  async function loadCounts() {
    try {
      const res = await api.callMethodGET("tradehub_core.api.qa.get_seller_question_counts");
      counts.value = res?.message || counts.value;
    } catch (err) {
      console.warn("Question counts load failed:", err);
    }
  }

  async function loadQuestions() {
    loading.value = true;
    try {
      const args = { page: page.value, page_size: pageSize };
      // Yeni filter mantığı — "satıcı cevap verdi mi?" üzerinden
      if (activeTab.value && activeTab.value !== "all") {
        args.filter = activeTab.value;
      }
      const res = await api.callMethodGET("tradehub_core.api.qa.get_seller_questions", args);
      questions.value = res?.message?.questions || [];
      total.value = res?.message?.total || 0;
    } catch (err) {
      toast.error(err?.message || t("sellerQuestions.loadFailed"));
      questions.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  async function loadAll() {
    page.value = 1;
    await Promise.all([loadCounts(), loadQuestions()]);
  }

  function startAnswer(questionId) {
    answeringId.value = questionId;
    answerText.value = "";
  }

  // Tablo/liste/kanban'dan yanıt akışı: inline form yalnızca grid kartında var,
  // o yüzden grid moduna geç ve ilgili soruda formu aç.
  function replyFromOtherMode(q) {
    if (q.has_my_answer) return;
    viewMode.value = "grid";
    startAnswer(q.name);
  }

  function cancelAnswer() {
    answeringId.value = null;
    answerText.value = "";
  }

  async function submitAnswer(questionId) {
    const txt = answerText.value.trim();
    if (txt.length < 5) {
      toast.error(t("sellerQuestions.answerTooShort"));
      return;
    }
    submitting.value = true;
    try {
      await api.callMethod("tradehub_core.api.qa.submit_question_answer", {
        question: questionId,
        answer: txt,
      });
      toast.success(t("sellerQuestions.answerSent"));
      cancelAnswer();
      await loadAll();
    } catch (err) {
      toast.error(err?.message || t("sellerQuestions.answerFailed"));
    } finally {
      submitting.value = false;
    }
  }

  function goPage(p) {
    if (p < 1 || p > totalPages.value) return;
    page.value = p;
    loadQuestions();
  }

  function confirmDismissQuestion(questionName) {
    openConfirm({
      title: t("sellerQuestions.dismissConfirmTitle"),
      message: t("sellerQuestions.dismissConfirmMessage"),
      confirmLabel: t("sellerQuestions.dismissConfirmLabel"),
      tone: "warning",
      onConfirm: () => doDismissQuestion(questionName),
    });
  }

  async function doDismissQuestion(questionName) {
    dismissingId.value = questionName;
    try {
      await api.callMethod("tradehub_core.api.qa.dismiss_question_from_seller_panel", {
        name: questionName,
      });
      toast.success(t("sellerQuestions.dismissed"));
      await loadAll();
    } catch (err) {
      toast.error(err?.message || t("sellerQuestions.actionFailed"));
    } finally {
      dismissingId.value = null;
    }
  }

  onMounted(loadAll);
</script>
