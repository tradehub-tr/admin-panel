<template>
  <div>
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
      <div class="flex items-center gap-3 min-w-0">
        <button class="hd-action flex-shrink-0" @click="$router.push('/helpdesk/inquiries')">
          <AppIcon name="arrow-left" :size="14" /><span>{{ t("sellerInquiryDetail.back") }}</span>
        </button>
        <div class="min-w-0">
          <h1 class="hd-page-title truncate">
            {{ inquiry.sender_name || t("sellerInquiryDetail.anonymous") }}
          </h1>
          <p class="hd-page-sub">
            <span class="hd-mono">#{{ name }}</span> ·
            {{ inquiry.sender_email || t("sellerInquiryDetail.noEmail") }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="hd-status" :class="statusCls(inquiry.status)">{{ inquiry.status }}</span>
      </div>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-brand-700 animate-spin" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Main column -->
      <div class="lg:col-span-2 space-y-3" data-tour="sid-thread">
        <!-- Original message -->
        <article class="hd-timeline tl-customer">
          <div class="hd-tl-avatar av-customer">{{ initial(inquiry.sender_name) }}</div>
          <div class="hd-tl-body">
            <header class="hd-tl-head">
              <span class="hd-tl-author">{{
                inquiry.sender_name || t("sellerInquiryDetail.anonymous")
              }}</span>
              <span class="hd-tl-badge bd-customer">{{
                t("sellerInquiryDetail.firstQuestion")
              }}</span>
              <span class="hd-tl-meta">{{ formatDT(inquiry.creation) }}</span>
            </header>
            <div class="hd-tl-content prose prose-sm max-w-none" style="white-space: pre-wrap">
              {{ inquiry.message }}
            </div>
          </div>
        </article>

        <!-- Existing reply -->
        <article v-if="inquiry.reply_message" class="hd-timeline tl-agent">
          <div class="hd-tl-avatar av-agent">{{ initial(inquiry.replied_by) }}</div>
          <div class="hd-tl-body">
            <header class="hd-tl-head">
              <span class="hd-tl-author">{{ inquiry.replied_by || "—" }}</span>
              <span class="hd-tl-badge bd-agent">{{ t("sellerInquiryDetail.reply") }}</span>
              <span class="hd-tl-meta">{{ formatDT(inquiry.replied_at) }}</span>
            </header>
            <!-- reply_message = Frappe rich text editor; backend bleach sanitize ediyor -->
            <!-- eslint-disable vue/no-v-html -->
            <div
              class="hd-tl-content prose prose-sm max-w-none"
              v-html="sanitizeHtml(inquiry.reply_message)"
            ></div>
            <!-- eslint-enable vue/no-v-html -->
          </div>
        </article>

        <!-- Reply composer (sadece henüz yanıtlanmamışsa veya re-reply) -->
        <div class="hd-composer mt-4" data-tour="sid-reply">
          <div class="hd-composer-tabs">
            <span class="hd-composer-tab active">
              <AppIcon name="reply" :size="13" />
              <span>{{
                inquiry.reply_message
                  ? t("sellerInquiryDetail.updateReply")
                  : t("sellerInquiryDetail.replyToCustomer")
              }}</span>
            </span>
          </div>
          <textarea
            v-model="replyText"
            rows="6"
            class="hd-textarea"
            :placeholder="t('sellerInquiryDetail.replyPlaceholder')"
          ></textarea>
          <div class="hd-composer-foot">
            <p class="hd-composer-hint">{{ t("sellerInquiryDetail.emailSentHint") }}</p>
            <button
              class="hd-btn-primary"
              :disabled="sending || !replyText.trim()"
              @click="sendReply"
            >
              <AppIcon name="send" :size="14" />
              <span>{{
                sending ? t("sellerInquiryDetail.sending") : t("sellerInquiryDetail.sendReply")
              }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="space-y-3">
        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">{{ t("sellerInquiryDetail.asker") }}</h3>
          <div class="hd-customer">
            <div class="hd-customer-avatar">{{ initial(inquiry.sender_name) }}</div>
            <div class="min-w-0">
              <p class="hd-customer-name truncate">
                {{ inquiry.sender_name || t("sellerInquiryDetail.anonymous") }}
              </p>
              <p class="hd-customer-sub truncate">
                {{ inquiry.sender_email || t("sellerInquiryDetail.noEmailShared") }}
              </p>
            </div>
          </div>
          <p v-if="inquiry.share_business_card" class="text-[11px] mt-2" style="color: #8a6a00">
            <AppIcon name="check" :size="11" /> {{ t("sellerInquiryDetail.sharedBusinessCard") }}
          </p>
        </div>

        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">{{ t("sellerInquiryDetail.details") }}</h3>
          <dl class="hd-dl">
            <div>
              <dt>{{ t("sellerInquiryDetail.status") }}</dt>
              <dd>{{ inquiry.status }}</dd>
            </div>
            <div>
              <dt>{{ t("sellerInquiryDetail.createdAt") }}</dt>
              <dd>{{ formatDT(inquiry.creation) }}</dd>
            </div>
            <div v-if="inquiry.replied_at">
              <dt>{{ t("sellerInquiryDetail.repliedAt") }}</dt>
              <dd>{{ formatDT(inquiry.replied_at) }}</dd>
            </div>
          </dl>
        </div>

        <div class="hd-card hd-card-pad" data-tour="sid-actions">
          <h3 class="hd-eyebrow mb-3">{{ t("sellerInquiryDetail.quickAction") }}</h3>
          <button class="hd-quick" :disabled="convertingLead" @click="convertToLead">
            <AppIcon name="user-plus" :size="14" class="text-brand-700" />
            <span>{{
              convertingLead
                ? t("sellerInquiryDetail.creatingLead")
                : t("sellerInquiryDetail.convertToLead")
            }}</span>
          </button>
          <button class="hd-quick" @click="trash">
            <AppIcon name="trash-2" :size="14" class="text-rose-500" />
            <span>{{ t("sellerInquiryDetail.moveToTrash") }}</span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useI18n } from "vue-i18n";
  import api from "@/utils/api";
  import { sanitizeHtml } from "@/utils/sanitize";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  // Sayfa-içi onboarding: mesaj dizisi → yanıt kutusu → hızlı aksiyonlar.
  usePageTour("seller-inquiry-detail", () => [
    {
      target: '[data-tour="sid-thread"]',
      title: t("tourSteps.page.sidThread_t"),
      desc: t("tourSteps.page.sidThread_d"),
    },
    {
      target: '[data-tour="sid-reply"]',
      title: t("tourSteps.page.sidReply_t"),
      desc: t("tourSteps.page.sidReply_d"),
    },
    {
      target: '[data-tour="sid-actions"]',
      title: t("tourSteps.page.sidActions_t"),
      desc: t("tourSteps.page.sidActions_d"),
    },
  ]);

  const name = computed(() => route.params.name);
  const inquiry = ref({});
  const loading = ref(true);
  const replyText = ref("");
  const sending = ref(false);
  const convertingLead = ref(false);

  function initial(s) {
    return s ? String(s).trim().charAt(0).toUpperCase() : "?";
  }
  function statusCls(s) {
    const m = { Yeni: "sc-blue", Okundu: "sc-amber", Yanıtlandı: "sc-emerald" };
    return m[s] || "sc-gray";
  }
  function formatDT(s) {
    if (!s) return "";
    try {
      return new Date(s).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return s;
    }
  }

  async function load() {
    loading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.seller.get_inquiry", {
        name: name.value,
      });
      inquiry.value = res?.message || {};
      replyText.value = inquiry.value.reply_message
        ? inquiry.value.reply_message.replace(/<[^>]+>/g, "")
        : "";
    } catch (e) {
      toast.error(e.message || t("sellerInquiryDetail.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function sendReply() {
    if (!replyText.value.trim()) return;
    sending.value = true;
    try {
      await api.callMethod("tradehub_core.api.seller.reply_inquiry", {
        name: name.value,
        message: replyText.value.trim(),
      });
      toast.success(t("sellerInquiryDetail.replySent"));
      await load();
    } catch (e) {
      toast.error(e.message || t("sellerInquiryDetail.sendFailed"));
    } finally {
      sending.value = false;
    }
  }

  async function trash() {
    if (!confirm(t("sellerInquiryDetail.trashConfirm"))) return;
    try {
      await api.callMethod("tradehub_core.api.seller.trash_inquiry", { name: name.value });
      toast.success(t("sellerInquiryDetail.trashed"));
      router.push("/helpdesk/inquiries");
    } catch (e) {
      toast.error(e.message || t("sellerInquiryDetail.actionFailed"));
    }
  }

  async function convertToLead() {
    convertingLead.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.seller_crm.inquiry_to_lead", {
        inquiry: name.value,
      });
      const payload = res?.message || {};
      if (payload.existed) {
        toast.success(t("sellerInquiryDetail.leadExists"));
      } else {
        toast.success(t("sellerInquiryDetail.leadCreated"));
      }
      // Yeni Lead'e git
      router.push(`/crm/leads/${encodeURIComponent(payload.name)}`);
    } catch (e) {
      toast.error(e.message || t("sellerInquiryDetail.leadCreateFailed"));
    } finally {
      convertingLead.value = false;
    }
  }

  onMounted(load);
</script>
