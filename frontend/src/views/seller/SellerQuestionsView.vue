<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">Sorularım</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          Ürünlerinize alıcılar tarafından sorulan soruları görüntüleyin ve yanıtlayın.
        </p>
      </div>
      <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadAll">
        <AppIcon name="refresh-cw" :size="13" />
        Yenile
      </button>
    </div>

    <!-- Status Filter Pills -->
    <StatusFilterPills
      v-model="activeTab"
      :options="tabOptions"
      wrapper-class="flex items-center gap-2 flex-wrap mb-5"
      @change="
        page = 1;
        loadQuestions();
      "
    />

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Yükleniyor...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="questions.length === 0" class="card text-center py-12">
      <AppIcon name="message-circle" :size="32" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400">Bu durumda soru bulunamadı.</p>
    </div>

    <!-- Question List -->
    <div v-else class="space-y-3">
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
                Yanıtladınız
              </span>
              <span
                v-else
                class="text-[10px] uppercase tracking-wide font-semibold text-amber-600 inline-flex items-center gap-0.5"
              >
                <AppIcon name="clock" :size="11" />
                Yanıtınız Bekleniyor
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
              <span v-if="q.is_kyb_verified" class="ml-1 text-emerald-600">✓ Doğrulanmış</span>
              · {{ formatDate(q.submitted_at) }}
            </div>
          </div>
          <!-- Sağ üst — paneli temizle (soft dismiss; istoc.com'da görünmeye devam eder) -->
          <button
            type="button"
            class="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
            :disabled="dismissingId === q.name"
            title="Bu soruyu kendi panelimden kaldır (istoc.com'da kalmaya devam eder)"
            aria-label="Paneli temizle"
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
                    ? "Sizin cevabınız"
                    : a.responder_type === "admin"
                      ? "Admin"
                      : "Diğer"
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
            Cevapla
          </button>
          <div v-else>
            <textarea
              v-model="answerText"
              rows="3"
              maxlength="2000"
              placeholder="Cevabınızı yazın (en az 5 karakter)..."
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-[#1e1e2a] focus:outline-none focus:border-violet-500 resize-vertical"
            ></textarea>
            <div class="flex items-center justify-between mt-2">
              <span class="text-[10px] text-gray-400">{{ answerText.length }} / 2000</span>
              <div class="flex gap-2">
                <button
                  class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                  @click="cancelAnswer"
                >
                  İptal
                </button>
                <button
                  class="px-3 py-1 text-xs rounded-md bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-50 flex items-center gap-1"
                  :disabled="submitting || answerText.trim().length < 5"
                  @click="submitAnswer(q.name)"
                >
                  <AppIcon v-if="submitting" name="loader" :size="11" class="animate-spin" />
                  {{ submitting ? "Gönderiliyor" : "Cevabı Gönder" }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- has_my_answer=true ise altta ek mesaj göstermiyoruz; yukarıdaki
             "Yanıtladınız" rozeti zaten durumu net belirtiyor. -->
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="flex justify-center mt-6 gap-2">
      <button
        :disabled="page === 1"
        class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50"
        @click="goPage(page - 1)"
      >
        ‹ Önceki
      </button>
      <span class="px-3 py-1 text-xs text-gray-500">Sayfa {{ page }} / {{ totalPages }}</span>
      <button
        :disabled="page >= totalPages"
        class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-50"
        @click="goPage(page + 1)"
      >
        Sonraki ›
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
  import { useToast } from "@/composables/useToast";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";

  const toast = useToast();

  // Custom confirm dialog
  const confirmDialog = reactive({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Tamam",
    tone: "primary",
    onConfirm: null,
  });
  function openConfirm({ title, message, confirmLabel = "Onayla", tone = "primary", onConfirm }) {
    confirmDialog.title = title;
    confirmDialog.message = message;
    confirmDialog.confirmLabel = confirmLabel;
    confirmDialog.tone = tone;
    confirmDialog.onConfirm = onConfirm;
    confirmDialog.open = true;
  }

  const tabOptions = computed(() => [
    { value: "all", label: "Tümü", dot: "bg-violet-400" },
    {
      value: "needs_my_answer",
      label: "Bekleyenler",
      dot: "bg-amber-400",
      count: counts.value.needs_my_answer,
    },
    {
      value: "answered_by_me",
      label: "Yanıtladıklarım",
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
  const storefrontBase = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5173/";

  function storefrontUrlFor(listingId) {
    return `${storefrontBase.replace(/\/$/, "")}/pages/product-detail.html?id=${encodeURIComponent(listingId)}`;
  }

  function statusLabel(status) {
    const map = {
      Pending: "Cevap Bekliyor",
      Answered: "Cevaplanmış",
      Hidden: "Gizlenmiş",
    };
    return map[status] || status;
  }

  function statusColor(status) {
    const map = {
      Pending: "text-amber-600",
      Answered: "text-emerald-600",
      Hidden: "text-gray-400",
    };
    return map[status] || "text-gray-500";
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
      toast.error(err?.message || "Sorular yüklenemedi");
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

  function cancelAnswer() {
    answeringId.value = null;
    answerText.value = "";
  }

  async function submitAnswer(questionId) {
    const txt = answerText.value.trim();
    if (txt.length < 5) {
      toast.error("Cevap en az 5 karakter olmalı");
      return;
    }
    submitting.value = true;
    try {
      await api.callMethod("tradehub_core.api.qa.submit_question_answer", {
        question: questionId,
        answer: txt,
      });
      toast.success("Cevabınız gönderildi.");
      cancelAnswer();
      await loadAll();
    } catch (err) {
      toast.error(err?.message || "Cevap gönderilemedi");
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
      title: "Soruyu panelden kaldır?",
      message:
        "Bu soru kendi panelinizden gizlenir. " +
        "istoc.com'da alıcılar görmeye devam eder, sadece sizin paneliniz temizlenir.",
      confirmLabel: "Panelden Kaldır",
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
      toast.success("Soru panelden kaldırıldı (istoc.com'da hâlâ görünür)");
      await loadAll();
    } catch (err) {
      toast.error(err?.message || "İşlem başarısız");
    } finally {
      dismissingId.value = null;
    }
  }

  onMounted(loadAll);
</script>
