<template>
  <div>
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
      <div class="flex items-center gap-3 min-w-0">
        <button class="hd-action flex-shrink-0" @click="$router.push('/helpdesk/inquiries')">
          <AppIcon name="arrow-left" :size="14" /><span>Geri</span>
        </button>
        <div class="min-w-0">
          <h1 class="hd-page-title truncate">{{ inquiry.sender_name || "Anonim" }}</h1>
          <p class="hd-page-sub">
            <span class="hd-mono">#{{ name }}</span> ·
            {{ inquiry.sender_email || "e-posta yok" }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="hd-status" :class="statusCls(inquiry.status)">{{ inquiry.status }}</span>
      </div>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Main column -->
      <div class="lg:col-span-2 space-y-3">
        <!-- Original message -->
        <article class="hd-timeline tl-customer">
          <div class="hd-tl-avatar av-customer">{{ initial(inquiry.sender_name) }}</div>
          <div class="hd-tl-body">
            <header class="hd-tl-head">
              <span class="hd-tl-author">{{ inquiry.sender_name || "Anonim" }}</span>
              <span class="hd-tl-badge bd-customer">İlk Soru</span>
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
              <span class="hd-tl-badge bd-agent">Yanıt</span>
              <span class="hd-tl-meta">{{ formatDT(inquiry.replied_at) }}</span>
            </header>
            <div
              class="hd-tl-content prose prose-sm max-w-none"
              v-html="inquiry.reply_message"
            ></div>
          </div>
        </article>

        <!-- Reply composer (sadece henüz yanıtlanmamışsa veya re-reply) -->
        <div class="hd-composer mt-4">
          <div class="hd-composer-tabs">
            <span class="hd-composer-tab active">
              <AppIcon name="reply" :size="13" />
              <span>{{ inquiry.reply_message ? "Yanıtı güncelle" : "Müşteriye Yanıt" }}</span>
            </span>
          </div>
          <textarea
            v-model="replyText"
            rows="6"
            class="hd-textarea"
            placeholder="Müşteriye yanıtınızı yazın..."
          ></textarea>
          <div class="hd-composer-foot">
            <p class="hd-composer-hint">E-posta müşteriye gönderilir.</p>
            <button
              class="hd-btn-primary"
              :disabled="sending || !replyText.trim()"
              @click="sendReply"
            >
              <AppIcon name="send" :size="14" />
              <span>{{ sending ? "Gönderiliyor..." : "Yanıtı Gönder" }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="space-y-3">
        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">Soruyu Soran</h3>
          <div class="hd-customer">
            <div class="hd-customer-avatar">{{ initial(inquiry.sender_name) }}</div>
            <div class="min-w-0">
              <p class="hd-customer-name truncate">{{ inquiry.sender_name || "Anonim" }}</p>
              <p class="hd-customer-sub truncate">
                {{ inquiry.sender_email || "E-posta paylaşmamış" }}
              </p>
            </div>
          </div>
          <p v-if="inquiry.share_business_card" class="text-[11px] mt-2" style="color: #7c3aed">
            <AppIcon name="check" :size="11" /> İletişim kartını paylaştı
          </p>
        </div>

        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">Detaylar</h3>
          <dl class="hd-dl">
            <div>
              <dt>Durum</dt>
              <dd>{{ inquiry.status }}</dd>
            </div>
            <div>
              <dt>Oluşturulma</dt>
              <dd>{{ formatDT(inquiry.creation) }}</dd>
            </div>
            <div v-if="inquiry.replied_at">
              <dt>Yanıtlandığı Tarih</dt>
              <dd>{{ formatDT(inquiry.replied_at) }}</dd>
            </div>
          </dl>
        </div>

        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">Hızlı İşlem</h3>
          <button class="hd-quick" :disabled="convertingLead" @click="convertToLead">
            <AppIcon name="user-plus" :size="14" class="text-violet-500" />
            <span>{{ convertingLead ? "Lead Oluşturuluyor..." : "CRM Lead'e Dönüştür" }}</span>
          </button>
          <button class="hd-quick" @click="trash">
            <AppIcon name="trash-2" :size="14" class="text-rose-500" />
            <span>Çöpe Taşı</span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

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
      toast.error(e.message || "Soru yüklenemedi");
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
      toast.success("Yanıt gönderildi");
      await load();
    } catch (e) {
      toast.error(e.message || "Gönderilemedi");
    } finally {
      sending.value = false;
    }
  }

  async function trash() {
    if (!confirm("Bu soru çöpe taşınsın mı?")) return;
    try {
      await api.callMethod("tradehub_core.api.seller.trash_inquiry", { name: name.value });
      toast.success("Çöpe taşındı");
      router.push("/helpdesk/inquiries");
    } catch (e) {
      toast.error(e.message || "İşlem başarısız");
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
        toast.success("Bu müşteri zaten lead olarak kayıtlı — açılıyor.");
      } else {
        toast.success("CRM Lead oluşturuldu.");
      }
      // Yeni Lead'e git
      router.push(`/crm/leads/${encodeURIComponent(payload.name)}`);
    } catch (e) {
      toast.error(e.message || "Lead oluşturulamadı.");
    } finally {
      convertingLead.value = false;
    }
  }

  onMounted(load);
</script>
