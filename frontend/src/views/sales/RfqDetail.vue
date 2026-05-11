<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div class="flex items-center gap-3">
        <button
          class="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 dark:bg-[#2a2a35] dark:text-gray-300 dark:hover:bg-[#35354a] transition-colors flex-shrink-0"
          @click="goBack"
        >
          <AppIcon name="arrow-left" :size="14" />
        </button>
        <span
          class="text-[11px] font-mono font-semibold text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10 px-2.5 py-1 rounded-md"
          >{{ docName }}</span
        >
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">
          {{ doc.product_name || "RFQ Detay" }}
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <span class="rfq-status-badge" :class="getRfqStatusCls(doc.status)">
          <span class="rfq-dot"></span>{{ getRfqStatusLabel(doc.status) }}
        </span>
        <!-- Admin-only Actions -->
        <template v-if="isAdmin">
          <button
            v-if="doc.status === 'Pending'"
            :disabled="actionLoading"
            class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            @click="changeStatus('Approved')"
          >
            <i class="fas fa-check mr-1"></i>Onayla
          </button>
          <button
            v-if="doc.status === 'Pending'"
            :disabled="actionLoading"
            class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            @click="changeStatus('Rejected')"
          >
            <i class="fas fa-times mr-1"></i>Reddet
          </button>
          <button
            v-if="doc.status === 'Approved'"
            :disabled="actionLoading"
            class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50 transition-colors"
            @click="changeStatus('Closed')"
          >
            <i class="fas fa-lock mr-1"></i>Kapat
          </button>
        </template>
      </div>
    </div>

    <div v-if="loading" class="card text-center py-12">
      <i class="fas fa-spinner fa-spin text-2xl text-violet-500"></i>
    </div>

    <template v-else>
      <!-- Stepper -->
      <div class="card mb-5 !py-5 !px-8">
        <div class="stepper-container">
          <div v-for="(step, i) in workflowSteps" :key="step.value" class="stepper-step">
            <div
              v-if="i > 0"
              class="stepper-line"
              :class="i <= currentStepIndex ? 'bg-violet-500' : 'bg-gray-700'"
            ></div>
            <div class="stepper-circle" :class="getStepClass(i)">
              <i v-if="i < currentStepIndex" class="fas fa-check text-[10px]"></i>
              <span v-else class="text-[11px]">{{ i + 1 }}</span>
            </div>
            <span
              class="stepper-label"
              :class="currentStepIndex >= i ? 'text-violet-400 font-semibold' : 'text-gray-500'"
              >{{ step.label }}</span
            >
          </div>
        </div>
      </div>

      <!-- Quick Cards — only real data -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-blue-600">
            {{ doc.quantity || 0 }}
            <span class="text-sm font-normal text-gray-400">{{ doc.unit || "" }}</span>
          </p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            Miktar
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-violet-600">{{ doc.quote_count || 0 }}</p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            Teklif
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-amber-600">
            {{ doc.category_display || doc.category || "-" }}
          </p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            Kategori
          </p>
        </div>
        <div class="card !p-4 text-center">
          <p class="text-2xl font-black text-gray-600">{{ formatDate(doc.creation) }}</p>
          <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
            Oluşturulma
          </p>
        </div>
      </div>

      <!-- RFQ Details — single section, no tabs -->
      <div class="card mb-5">
        <h3 class="section-title">
          <i class="fas fa-info-circle text-violet-500 mr-2"></i>Temel Bilgiler
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div>
            <label class="form-label">RFQ Kodu</label
            ><input :value="doc.name" class="form-input" readonly />
          </div>
          <div>
            <label class="form-label">Ürün Adı</label
            ><input :value="doc.product_name || '-'" class="form-input" readonly />
          </div>
          <div>
            <label class="form-label">Alıcı</label
            ><input :value="doc.buyer || '-'" class="form-input" readonly />
          </div>
          <div>
            <label class="form-label">Kategori</label
            ><input
              :value="doc.category_display || doc.category || '-'"
              class="form-input"
              readonly
            />
          </div>
          <div>
            <label class="form-label">Miktar</label
            ><input
              :value="(doc.quantity || 0) + ' ' + (doc.unit || '')"
              class="form-input"
              readonly
            />
          </div>
          <div>
            <label class="form-label">Durum</label>
            <div class="mt-1">
              <span class="rfq-status-badge" :class="getRfqStatusCls(doc.status)"
                ><span class="rfq-dot"></span>{{ getRfqStatusLabel(doc.status) }}</span
              >
            </div>
          </div>
        </div>
      </div>
      <div class="card mb-5">
        <h3 class="section-title"><i class="fas fa-align-left text-gray-500 mr-2"></i>Açıklama</h3>
        <div class="mt-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg min-h-[60px]">
          <p class="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {{ doc.description || "Açıklama eklenmemiş." }}
          </p>
        </div>
      </div>
      <div v-if="doc.additional_details" class="card mb-5">
        <h3 class="section-title">
          <i class="fas fa-plus-circle text-amber-500 mr-2"></i>Ek Detaylar
        </h3>
        <div class="mt-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
          <p class="text-xs text-gray-600 dark:text-gray-300">{{ doc.additional_details }}</p>
        </div>
      </div>

      <!-- Yüklenen Belgeler — Frappe File, is_private=1, RFQ.has_permission gated -->
      <div v-if="attachments.length > 0" class="card mb-5">
        <h3 class="section-title flex items-center gap-2">
          <i class="fas fa-paperclip text-amber-500 mr-2"></i>
          Yüklenen Belgeler
          <span
            class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-semibold"
            >{{ attachments.length }} dosya</span
          >
          <span
            class="ml-auto text-[11px] text-gray-500 dark:text-gray-400 font-normal inline-flex items-center gap-1"
          >
            <i class="fas fa-lock"></i>
            Özel — sadece eşleşen tedarikçiler ve admin
          </span>
        </h3>
        <div class="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div
            v-for="(att, i) in attachments"
            :key="att.name + i"
            class="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden flex flex-col"
          >
            <div
              :class="[
                'h-28',
                getFileKind(att.file_name) !== 'other'
                  ? 'cursor-pointer hover:opacity-90 transition-opacity'
                  : '',
              ]"
              @click="openAttachmentModal(att)"
            >
              <img
                v-if="getFileKind(att.file_name) === 'image'"
                :src="att.file_url"
                :alt="att.file_name"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div
                v-else
                class="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-white/5"
              >
                <div
                  :class="[
                    'w-10 h-10 rounded-md text-white text-[10px] font-bold flex items-center justify-center',
                    getFileBadge(att.file_name).cls,
                  ]"
                >
                  {{ getFileBadge(att.file_name).label }}
                </div>
                <span class="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                  {{ getFileKind(att.file_name) === "pdf" ? "Önizle" : "Önizleme yok" }}
                </span>
              </div>
            </div>
            <div class="p-2 flex flex-col gap-1">
              <div
                class="text-[11px] font-semibold text-gray-800 dark:text-white truncate"
                :title="att.file_name"
              >
                {{ att.file_name }}
              </div>
              <div class="text-[10px] text-gray-400">{{ formatFileSize(att.file_size) }}</div>
              <a
                :href="att.file_url"
                :download="att.file_name"
                class="mt-1 w-full px-2 py-1 text-[11px] font-semibold rounded bg-emerald-500 hover:bg-emerald-600 text-white text-center transition-colors"
              >
                <i class="fas fa-download mr-1"></i>İndir
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Attachment preview modal -->
      <div
        v-if="modalOpen && modalAttachment"
        class="fixed inset-0 z-[1000] flex flex-col bg-black/85"
        @keydown.escape="closeAttachmentModal"
      >
        <div class="absolute inset-0" aria-hidden="true" @click="closeAttachmentModal"></div>
        <div
          class="relative bg-gray-900 text-white px-5 py-3 flex items-center justify-between gap-3"
        >
          <h3 class="text-sm font-semibold truncate">{{ modalAttachment.file_name }}</h3>
          <div class="flex items-center gap-2 shrink-0">
            <a
              :href="modalAttachment.file_url"
              :download="modalAttachment.file_name"
              class="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-500 hover:bg-emerald-600 transition-colors"
              ><i class="fas fa-download mr-1"></i>İndir</a
            >
            <button
              type="button"
              class="ml-1 w-8 h-8 inline-flex items-center justify-center text-lg hover:bg-white/10 rounded transition-colors"
              aria-label="Kapat"
              @click="closeAttachmentModal"
            >
              ×
            </button>
          </div>
        </div>
        <div class="relative flex-1 overflow-auto bg-black flex items-center justify-center p-4">
          <img
            v-if="getFileKind(modalAttachment.file_name) === 'image'"
            :src="modalAttachment.file_url"
            :alt="modalAttachment.file_name"
            class="max-w-full max-h-full object-contain"
          />
          <iframe
            v-else-if="getFileKind(modalAttachment.file_name) === 'pdf'"
            :src="modalAttachment.file_url"
            :title="modalAttachment.file_name"
            class="w-full h-full bg-white"
          ></iframe>
        </div>
      </div>

      <!-- Seller: Submit Quote (only for Approved RFQs) -->
      <div v-if="isSeller && doc.status === 'Approved' && !hasSubmittedQuote" class="card mt-5">
        <h3 class="section-title">
          <i class="fas fa-paper-plane text-amber-500 mr-2"></i>Teklif Gönder
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div class="lg:col-span-2">
            <label class="form-label">Ürün Seç (opsiyonel)</label>
            <select v-model="quoteForm.listing_id" class="form-input">
              <option value="">Ürün seçilmedi</option>
              <option v-for="l in myListings" :key="l.name" :value="l.name">
                {{ l.title || l.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="form-label">Birim Fiyat *</label>
            <input
              v-model.number="quoteForm.price_per_unit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="form-input"
            />
          </div>
          <div>
            <label class="form-label">Toplam Fiyat</label>
            <input
              v-model.number="quoteForm.total_price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="form-input"
            />
          </div>
          <div>
            <label class="form-label">Para Birimi</label>
            <select v-model="quoteForm.currency" class="form-input">
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label class="form-label">Teslimat Süresi (gün)</label>
            <input
              v-model.number="quoteForm.lead_time_days"
              type="number"
              min="0"
              placeholder="0"
              class="form-input"
            />
          </div>
          <div class="lg:col-span-2">
            <label class="form-label">Mesaj</label>
            <textarea
              v-model="quoteForm.message"
              rows="3"
              placeholder="Teklifinizle ilgili ek bilgi..."
              class="form-input !h-auto"
            ></textarea>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button
            :disabled="quoteLoading"
            class="px-6 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
            @click="submitQuote"
          >
            <i class="fas fa-paper-plane mr-1"></i>{{ quoteLoading ? "..." : "Teklifi Gönder" }}
          </button>
        </div>
      </div>

      <!-- Already submitted — show existing quote details -->
      <div v-if="isSeller && hasSubmittedQuote && existingQuote" class="card mt-5">
        <h3 class="section-title">
          <i class="fas fa-check-circle text-emerald-500 mr-2"></i>Gönderdiğiniz Teklif
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div>
            <label class="form-label">Birim Fiyat</label
            ><input
              :value="existingQuote.currency + ' ' + existingQuote.price_per_unit"
              class="form-input"
              readonly
            />
          </div>
          <div>
            <label class="form-label">Toplam Fiyat</label
            ><input
              :value="
                existingQuote.total_price
                  ? existingQuote.currency + ' ' + existingQuote.total_price
                  : '-'
              "
              class="form-input"
              readonly
            />
          </div>
          <div>
            <label class="form-label">Teslimat Süresi</label
            ><input
              :value="existingQuote.lead_time_days ? existingQuote.lead_time_days + ' gün' : '-'"
              class="form-input"
              readonly
            />
          </div>
          <div>
            <label class="form-label">Durum</label>
            <div class="mt-1">
              <span
                class="rfq-status-badge"
                :class="{
                  'rfq-draft': existingQuote.status === 'Submitted',
                  'rfq-accepted': existingQuote.status === 'Accepted',
                  'rfq-cancelled': existingQuote.status === 'Rejected',
                }"
                ><span class="rfq-dot"></span
                >{{
                  { Submitted: "Gönderildi", Accepted: "Kabul Edildi", Rejected: "Reddedildi" }[
                    existingQuote.status
                  ] || existingQuote.status
                }}</span
              >
            </div>
          </div>
          <div v-if="existingQuote.message" class="lg:col-span-2">
            <label class="form-label">Mesaj</label>
            <div class="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
              <p class="text-xs text-gray-600 dark:text-gray-300">{{ existingQuote.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useAuthStore } from "@/stores/auth";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";

  const auth = useAuthStore();
  const isSeller = computed(() => auth.isSeller);
  const isAdmin = computed(() => auth.isAdmin);

  const route = useRoute();
  const router = useRouter();
  const loading = ref(false);
  const actionLoading = ref(false);
  const doc = ref({});
  const docName = computed(() => decodeURIComponent(route.params.name || ""));

  // RFQ attachments (loaded separately — File doctype, gated by RFQ.has_permission)
  const attachments = ref([]);
  const modalOpen = ref(false);
  const modalAttachment = ref(null);

  function getFileKind(fileName) {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return "other";
  }

  function getFileBadge(fileName) {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
      return { label: ext.toUpperCase(), cls: "bg-indigo-500" };
    if (ext === "pdf") return { label: "PDF", cls: "bg-red-500" };
    if (["xls", "xlsx"].includes(ext)) return { label: "XLS", cls: "bg-green-600" };
    if (["doc", "docx"].includes(ext)) return { label: "DOC", cls: "bg-blue-600" };
    return { label: "FILE", cls: "bg-gray-500" };
  }

  function formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function openAttachmentModal(att) {
    if (getFileKind(att.file_name) === "other") return;
    modalAttachment.value = att;
    modalOpen.value = true;
    document.body.style.overflow = "hidden";
  }

  function closeAttachmentModal() {
    modalOpen.value = false;
    modalAttachment.value = null;
    document.body.style.overflow = "";
  }

  async function loadAttachments() {
    try {
      const res = await api.callMethod("tradehub_core.api.rfq.get_rfq_attachments", {
        rfq_id: docName.value,
      });
      attachments.value = res?.message || res?.data?.message || [];
    } catch {
      attachments.value = [];
    }
  }

  const workflowSteps = [
    { value: "Pending", label: "Beklemede" },
    { value: "Approved", label: "Onaylandı" },
    { value: "Completed", label: "Tamamlandı" },
  ];

  const currentStepIndex = computed(() => {
    const idx = workflowSteps.findIndex((s) => s.value === doc.value.status);
    return idx >= 0 ? idx : -1;
  });

  function getStepClass(i) {
    if (i === currentStepIndex.value)
      return "bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-200";
    if (i < currentStepIndex.value) return "bg-violet-100 border-violet-400 text-violet-600";
    return "bg-white border-gray-200 text-gray-400";
  }

  function goBack() {
    router.push("/rfq-list");
  }

  async function loadDoc() {
    loading.value = true;
    try {
      const res = await api.getDoc("RFQ", docName.value);
      doc.value = res.data || {};
      if (doc.value.category) {
        try {
          const catRes = await api.getDoc("Product Category", doc.value.category);
          doc.value.category_display = catRes.data?.category_name || doc.value.category;
        } catch {
          doc.value.category_display = doc.value.category;
        }
      }
    } catch {
      doc.value = { name: docName.value };
    } finally {
      loading.value = false;
    }
    checkExistingQuote();
    loadMyListings();
    loadAttachments();
  }

  function getRfqStatusCls(s) {
    return (
      {
        Pending: "rfq-draft",
        Approved: "rfq-published",
        Closed: "rfq-closed",
        Rejected: "rfq-cancelled",
        Completed: "rfq-accepted",
      }[s] || "rfq-draft"
    );
  }
  function getRfqStatusLabel(s) {
    return (
      {
        Pending: "Beklemede",
        Approved: "Onaylandı",
        Closed: "Kapatıldı",
        Rejected: "Reddedildi",
        Completed: "Tamamlandı",
      }[s] ||
      s ||
      "-"
    );
  }

  async function changeStatus(newStatus) {
    if (
      !confirm(
        `Bu RFQ'yu "${getRfqStatusLabel(newStatus)}" olarak değiştirmek istediğinize emin misiniz?`
      )
    )
      return;
    actionLoading.value = true;
    try {
      await api.updateDoc("RFQ", docName.value, { status: newStatus });
      await loadDoc();
    } catch (e) {
      alert(e?.message || "Status değiştirilemedi");
    } finally {
      actionLoading.value = false;
    }
  }

  // ── Seller Quote ──
  const quoteForm = ref({
    price_per_unit: null,
    total_price: null,
    currency: "TRY",
    lead_time_days: null,
    message: "",
    listing_id: "",
  });
  const myListings = ref([]);
  const quoteLoading = ref(false);
  const hasSubmittedQuote = ref(false);
  const existingQuote = ref(null);

  async function loadMyListings() {
    if (!isSeller.value) return;
    try {
      const d = await api.callMethod("tradehub_core.api.rfq.get_my_listings");
      myListings.value = d.message || [];
    } catch {
      myListings.value = [];
    }
  }

  async function checkExistingQuote() {
    if (!isSeller.value) return;
    try {
      const res = await api.getList("RFQ Quote", {
        filters: [
          ["rfq", "=", docName.value],
          ["seller", "=", auth.user?.email],
        ],
        fields: [
          "name",
          "price_per_unit",
          "total_price",
          "currency",
          "lead_time_days",
          "message",
          "status",
          "creation",
        ],
        limit_page_length: 1,
      });
      if (res.data?.length) {
        hasSubmittedQuote.value = true;
        existingQuote.value = res.data[0];
      } else {
        hasSubmittedQuote.value = false;
        existingQuote.value = null;
      }
    } catch {
      // Fallback: try via custom API
      try {
        const res = await api.callMethod("tradehub_core.api.rfq.get_my_quotes", {
          limit_page_length: 100,
        });
        const quotes = res.message?.data || [];
        const found = quotes.find((q) => q.rfq === docName.value);
        if (found) {
          hasSubmittedQuote.value = true;
          existingQuote.value = found;
        }
      } catch {
        /* ignore */
      }
    }
  }

  async function submitQuote() {
    if (!quoteForm.value.price_per_unit || quoteForm.value.price_per_unit <= 0) {
      alert("Birim fiyat zorunludur");
      return;
    }
    quoteLoading.value = true;
    try {
      await api.callMethod("tradehub_core.api.rfq.submit_quote", {
        rfq_id: docName.value,
        price_per_unit: quoteForm.value.price_per_unit,
        total_price: quoteForm.value.total_price || 0,
        currency: quoteForm.value.currency,
        lead_time_days: quoteForm.value.lead_time_days || 0,
        message: quoteForm.value.message || "",
        listing_id: quoteForm.value.listing_id || null,
      });
      alert("Teklifiniz başarıyla gönderildi!");
      hasSubmittedQuote.value = true;
      await loadDoc();
    } catch (e) {
      alert(e?.message || "Teklif gönderilemedi");
    } finally {
      quoteLoading.value = false;
    }
  }

  function formatDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("tr-TR");
  }

  watch(() => route.params.name, loadDoc);
  onMounted(loadDoc);
</script>

<style scoped>
  .stepper-container {
    display: flex;
    align-items: flex-start;
  }
  .stepper-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    position: relative;
  }
  .stepper-circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    border: 2px solid;
    transition: all 0.2s;
    position: relative;
    z-index: 2;
    flex-shrink: 0;
  }
  .stepper-line {
    position: absolute;
    top: 15px;
    height: 2px;
    z-index: 1;
    right: calc(50% + 18px);
    left: calc(-50% + 18px);
  }
  .stepper-label {
    font-size: 10px;
    margin-top: 6px;
    text-align: center;
    white-space: nowrap;
  }
  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #1f2937;
    display: flex;
    align-items: center;
  }

  .rfq-status-badge {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 6px;
    white-space: nowrap;
  }
  .rfq-status-badge .rfq-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-right: 6px;
    flex-shrink: 0;
  }
  .rfq-draft {
    background: var(--th-kpi-draft-bg);
    color: var(--th-kpi-draft-fg);
  }
  .rfq-draft .rfq-dot {
    background: var(--th-kpi-draft-dot);
  }
  .rfq-published {
    background: var(--th-kpi-active-bg);
    color: var(--th-kpi-active-fg);
  }
  .rfq-published .rfq-dot {
    background: var(--th-kpi-active-dot);
  }
  .rfq-accepted {
    background: var(--th-kpi-ontrack-bg);
    color: var(--th-kpi-ontrack-fg);
  }
  .rfq-accepted .rfq-dot {
    background: var(--th-kpi-ontrack-dot);
  }
  .rfq-closed {
    background: var(--th-kpi-expired-bg);
    color: var(--th-kpi-expired-fg);
  }
  .rfq-closed .rfq-dot {
    background: var(--th-kpi-expired-dot);
  }
  .rfq-cancelled {
    background: var(--th-kpi-critical-bg);
    color: var(--th-kpi-critical-fg);
  }
  .rfq-cancelled .rfq-dot {
    background: var(--th-kpi-critical-dot);
  }
</style>
