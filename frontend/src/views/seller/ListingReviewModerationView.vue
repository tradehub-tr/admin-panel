<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ isAdmin ? "Yorum Moderasyonu" : "Yorumlarım" }}
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">
          {{
            isAdmin
              ? "Bekleyen yorumları onaylayın, reddedin veya gizleyin."
              : "Ürünlerinize yapılan yorumları görüntüleyin."
          }}
        </p>
      </div>
      <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadAll">
        <AppIcon name="refresh-cw" :size="13" />
        Yenile
      </button>
    </div>

    <!-- Status Tabs -->
    <div class="flex gap-2 mb-5 flex-wrap">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="px-4 py-1.5 text-xs font-medium rounded-full border transition-colors"
        :class="
          activeTab === tab.id
            ? 'bg-violet-600 text-white border-violet-600'
            : 'bg-white text-gray-600 border-gray-300 dark:bg-[#1e1e2a] dark:text-gray-400 dark:border-[#2a2a35] hover:border-violet-400'
        "
        @click="
          activeTab = tab.id;
          page = 1;
          loadReviews();
        "
      >
        {{ tab.label }}
        <span
          v-if="counts[tab.countKey] > 0"
          class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
          :class="
            tab.id === 'Pending'
              ? 'bg-amber-500 text-white'
              : activeTab === tab.id
                ? 'bg-white/25 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-[#2a2a35] dark:text-gray-200'
          "
          >{{ counts[tab.countKey] }}</span
        >
      </button>
    </div>

    <!-- Search & Filter Bar — mobile-first -->
    <div class="card p-3 mb-4">
      <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
        <!-- Search -->
        <div class="relative flex-1 min-w-0">
          <AppIcon
            name="search"
            :size="14"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            v-model="searchText"
            type="text"
            placeholder="Başlık veya yorum içinde ara…"
            class="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 dark:bg-[#1e1e2a] dark:border-[#2a2a35] dark:text-gray-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            @input="onSearchInput"
          />
          <button
            v-if="searchText"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Temizle"
            @click="
              searchText = '';
              onFilterChange();
            "
          >
            <AppIcon name="x" :size="13" />
          </button>
        </div>
        <!-- Reviewer e-posta filter -->
        <input
          v-model="reviewerEmail"
          type="text"
          placeholder="Kullanıcı e-posta…"
          class="sm:w-56 px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 dark:bg-[#1e1e2a] dark:border-[#2a2a35] dark:text-gray-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          @input="onSearchInput"
        />
        <!-- Min rating dropdown -->
        <select
          v-model="minRating"
          class="sm:w-36 px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white text-gray-900 dark:bg-[#1e1e2a] dark:border-[#2a2a35] dark:text-gray-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          @change="onFilterChange"
        >
          <option value="">Tüm puanlar</option>
          <option value="5">★ 5</option>
          <option value="4">★ 4+</option>
          <option value="3">★ 3+</option>
          <option value="2">★ 2+</option>
          <option value="1">★ 1+</option>
        </select>
        <!-- Reset -->
        <button
          v-if="searchText || reviewerEmail || minRating"
          type="button"
          class="hdr-btn-outlined text-xs flex items-center gap-1 justify-center"
          @click="clearFilters"
        >
          <AppIcon name="x" :size="12" />
          Sıfırla
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Yükleniyor...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="reviews.length === 0" class="card text-center py-12">
      <AppIcon name="star" :size="32" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400">Bu durumda yorum bulunamadı.</p>
    </div>

    <!-- Review List -->
    <div v-else class="space-y-3">
      <div v-for="r in reviews" :key="r.name" class="card p-4">
        <!-- Header -->
        <div class="flex items-start gap-3 mb-2">
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            :style="{ background: avatarColor(r.reviewer_display_name || r.reviewer_user) }"
          >
            {{ (r.reviewer_display_name || r.reviewer_user || "?").charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ r.reviewer_display_name || r.reviewer_user }}
              </span>
              <span
                v-if="r.is_verified_purchase"
                class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium"
              >
                ✓ Doğrulanmış Alışveriş
              </span>
              <span
                v-if="r.is_kyb_verified"
                class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium"
              >
                KYB ✓
              </span>
              <button
                v-if="r.abuse_report_count > 0"
                type="button"
                class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium hover:bg-red-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                :title="
                  expandedAbuseId === r.name ? 'Şikayetleri gizle' : 'Şikayet detaylarını göster'
                "
                @click="toggleAbuseDetails(r.name)"
              >
                🚩 {{ r.abuse_report_count }} şikayet
                <span class="text-[8px]" v-text="expandedAbuseId === r.name ? '▼' : '▶'"></span>
              </button>
            </div>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="text-amber-400 text-xs"
                >{{ "★".repeat(r.rating)
                }}<span class="text-gray-300">{{ "★".repeat(5 - r.rating) }}</span></span
              >
              <span class="text-[11px] text-gray-400">·</span>
              <a
                :href="storefrontUrlFor(r.listing)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[11px] text-violet-600 hover:underline truncate"
                >{{ r.listing_title || r.listing }}</a
              >
              <span class="text-[11px] text-gray-400">· {{ formatDate(r.submitted_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Title + Body -->
        <div
          v-if="r.title"
          class="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2 mb-1"
        >
          {{ r.title }}
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {{ r.body }}
        </div>

        <!-- Images -->
        <div v-if="r.images && r.images.length > 0" class="flex gap-2 mt-3 flex-wrap">
          <a
            v-for="(img, idx) in r.images"
            :key="idx"
            :href="storefrontImageUrl(img.image)"
            target="_blank"
            rel="noopener noreferrer"
            class="block w-16 h-16 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 hover:border-violet-500 transition-colors"
          >
            <img :src="storefrontImageUrl(img.image)" class="w-full h-full object-cover" alt="" />
          </a>
        </div>

        <!-- Abuse reports detayı (rozet tıklanınca açılır) -->
        <div
          v-if="expandedAbuseId === r.name && r.abuse_reports && r.abuse_reports.length > 0"
          class="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg p-3"
        >
          <div
            class="text-[11px] font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1"
          >
            <AppIcon name="flag" :size="11" />
            Şikayet Detayları ({{ r.abuse_reports.length }})
          </div>
          <div class="space-y-2">
            <div
              v-for="ab in r.abuse_reports"
              :key="ab.name"
              class="bg-white dark:bg-[#1e1e2a] border border-red-100 dark:border-red-800/40 rounded p-2 text-[12px]"
              :class="ab.resolved ? 'opacity-60' : ''"
            >
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ ab.reporter }}</span>
                <span
                  class="px-1.5 py-0.5 rounded bg-red-200 text-red-800 text-[10px] font-semibold"
                >
                  {{ abuseReasonLabel(ab.reason) }}
                </span>
                <span class="text-[10px] text-gray-400 ml-auto">
                  {{ formatDate(ab.created_at) }}
                </span>
                <span
                  v-if="ab.resolved"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium"
                  >✓ Geçersiz Sayıldı</span
                >
              </div>
              <div v-if="ab.note" class="text-gray-700 dark:text-gray-300 italic">
                "{{ ab.note }}"
              </div>
              <div v-else class="text-[11px] text-gray-400 italic">(Açıklama yok)</div>
              <!-- Geçersiz Say butonu (sadece resolved=false için) -->
              <div v-if="!ab.resolved && isAdmin" class="mt-2 flex justify-end">
                <button
                  type="button"
                  class="text-[11px] px-2 py-0.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-1"
                  :disabled="dismissingAbuseId === ab.name"
                  @click="confirmDismissAbuse(ab.name, r.name)"
                >
                  <AppIcon name="check" :size="10" />
                  Geçersiz Say
                </button>
              </div>
            </div>
          </div>
          <div class="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
            ℹ️ {{ ABUSE_AUTO_HIDE_THRESHOLD }}+ farklı kullanıcı şikayetinde yorum otomatik
            gizlenir.
          </div>
        </div>

        <!-- Rejected reason -->
        <div v-if="r.rejected_reason" class="mt-2 text-[11px] text-red-600 italic">
          <strong>Red Nedeni:</strong> {{ r.rejected_reason }}
        </div>

        <!-- Actions (admin only) -->
        <div
          v-if="isAdmin"
          class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
        >
          <button
            v-if="r.status === 'Pending'"
            class="px-3 py-1 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1"
            :disabled="working === r.name"
            @click="doAction(r.name, 'approve')"
          >
            <AppIcon name="check" :size="11" />
            Onayla
          </button>
          <button
            v-if="r.status === 'Pending' || r.status === 'Approved'"
            class="px-3 py-1 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-1"
            :disabled="working === r.name"
            @click="startReject(r.name)"
          >
            <AppIcon name="x" :size="11" />
            Reddet
          </button>
          <button
            v-if="r.status === 'Approved'"
            class="px-3 py-1 text-xs rounded-md bg-gray-600 hover:bg-gray-700 text-white font-medium flex items-center gap-1"
            :disabled="working === r.name"
            @click="doAction(r.name, 'hide')"
          >
            <AppIcon name="eye-off" :size="11" />
            Gizle
          </button>
          <button
            v-if="r.status === 'Hidden' || r.status === 'Rejected'"
            class="px-3 py-1 text-xs rounded-md bg-violet-600 hover:bg-violet-700 text-white font-medium flex items-center gap-1"
            :disabled="working === r.name"
            @click="doAction(r.name, r.status === 'Hidden' ? 'unhide' : 'approve')"
          >
            <AppIcon name="check" :size="11" />
            {{ r.status === "Hidden" ? "Tekrar Yayınla" : "Yeniden Onayla" }}
          </button>
          <button
            class="ml-auto px-2 py-1 text-[11px] rounded-md text-gray-500 hover:text-red-600 flex items-center gap-1"
            :disabled="working === r.name"
            title="Cascade sil"
            @click="confirmDelete(r.name)"
          >
            <AppIcon name="trash-2" :size="11" />
            Sil
          </button>
        </div>

        <!-- Inline reject reason form -->
        <div v-if="rejectingId === r.name" class="mt-3">
          <textarea
            v-model="rejectReason"
            rows="2"
            maxlength="500"
            placeholder="Red nedenini açıklayın (zorunlu)..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-[#1e1e2a] focus:outline-none focus:border-red-500"
          ></textarea>
          <div class="flex gap-2 mt-2">
            <button
              class="px-3 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              @click="cancelReject"
            >
              İptal
            </button>
            <button
              class="px-3 py-1 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
              :disabled="working === r.name || rejectReason.trim().length < 5"
              @click="doReject(r.name)"
            >
              Reddet
            </button>
          </div>
        </div>
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

    <!-- Onay dialog (sil + geçersiz say için tek instance) -->
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
  import { useAuthStore } from "@/stores/auth";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";

  const toast = useToast();
  const auth = useAuthStore();
  const isAdmin = computed(() => auth.isAdmin);

  const tabs = [
    { id: "Pending", label: "Bekleyen", countKey: "pending" },
    { id: "Approved", label: "Onaylı", countKey: "approved" },
    { id: "Rejected", label: "Reddedilen", countKey: "rejected" },
    { id: "Hidden", label: "Gizli", countKey: "hidden" },
    { id: "all", label: "Tümü", countKey: "total" },
  ];

  const activeTab = ref("Pending");
  const reviews = ref([]);
  const loading = ref(false);
  const counts = ref({ pending: 0, approved: 0, rejected: 0, hidden: 0, total: 0 });
  const total = ref(0);
  const page = ref(1);
  const pageSize = 20;
  // Search & filter — server-side
  const searchText = ref("");
  const reviewerEmail = ref("");
  const minRating = ref("");
  let searchDebounce = null;
  const working = ref(null);
  const rejectingId = ref(null);
  const expandedAbuseId = ref(null);
  const dismissingAbuseId = ref(null);

  // Custom confirm dialog (native confirm() yerine, marka uyumlu)
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
  const ABUSE_AUTO_HIDE_THRESHOLD = 3;

  const ABUSE_REASON_LABELS = {
    Spam: "Spam / Reklam",
    "Hate Speech": "Hakaret / Nefret",
    Fake: "Sahte / Yanıltıcı",
    "Off-topic": "Alakasız",
    "Personal Info": "Kişisel Bilgi",
    Other: "Diğer",
  };
  function abuseReasonLabel(reason) {
    return ABUSE_REASON_LABELS[reason] || reason;
  }
  function toggleAbuseDetails(reviewName) {
    expandedAbuseId.value = expandedAbuseId.value === reviewName ? null : reviewName;
  }

  function confirmDismissAbuse(abuseName, reviewName) {
    openConfirm({
      title: "Şikayeti geçersiz say?",
      message:
        "Şikayet kaydı silinmez, sadece 'çözüldü' olarak işaretlenir. " +
        "Yorumun açık şikayet sayısı azalır.",
      confirmLabel: "Geçersiz Say",
      tone: "warning",
      onConfirm: () => doDismissAbuse(abuseName, reviewName),
    });
  }

  async function doDismissAbuse(abuseName, reviewName) {
    dismissingAbuseId.value = abuseName;
    try {
      await api.callMethod("tradehub_core.api.review.admin_dismiss_abuse_report", {
        name: abuseName,
      });
      toast.success("Şikayet geçersiz sayıldı");
      await loadAll();
      expandedAbuseId.value = reviewName;
    } catch (err) {
      toast.error(err?.message || "İşlem başarısız");
    } finally {
      dismissingAbuseId.value = null;
    }
  }
  const rejectReason = ref("");

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
  const storefrontBase = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5173/";
  const apiBase = import.meta.env.VITE_API_BASE || "";

  function storefrontUrlFor(listingId) {
    return `${storefrontBase.replace(/\/$/, "")}/pages/product-detail.html?id=${encodeURIComponent(listingId)}`;
  }

  function storefrontImageUrl(p) {
    if (!p) return "";
    if (p.startsWith("http")) return p;
    return `${apiBase || ""}${p}`;
  }

  const palette = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
  ];
  function avatarColor(name) {
    if (!name) return palette[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
    return palette[Math.abs(hash) % palette.length];
  }

  function statusLabel(s) {
    const map = {
      Pending: "Bekliyor",
      Approved: "Onaylı",
      Rejected: "Reddedildi",
      Hidden: "Gizli",
    };
    return map[s] || s;
  }
  function statusBadgeClass(s) {
    const map = {
      Pending: "bg-amber-100 text-amber-700",
      Approved: "bg-emerald-100 text-emerald-700",
      Rejected: "bg-red-100 text-red-700",
      Hidden: "bg-gray-200 text-gray-700",
    };
    return map[s] || "bg-gray-200 text-gray-700";
  }

  function formatDate(s) {
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
      return String(s).slice(0, 16);
    }
  }

  async function loadCounts() {
    try {
      const res = await api.callMethodGET("tradehub_core.api.review.get_admin_review_counts");
      counts.value = res?.message || counts.value;
    } catch (err) {
      console.warn("review counts load failed:", err);
    }
  }

  async function loadReviews() {
    loading.value = true;
    try {
      const args = { page: page.value, page_size: pageSize };
      if (activeTab.value && activeTab.value !== "all") args.status = activeTab.value;
      if (searchText.value.trim()) args.search = searchText.value.trim();
      if (reviewerEmail.value.trim()) args.reviewer = reviewerEmail.value.trim();
      if (minRating.value) args.min_rating = minRating.value;
      const res = await api.callMethodGET("tradehub_core.api.review.get_admin_review_list", args);
      reviews.value = res?.message?.reviews || [];
      total.value = res?.message?.total || 0;
    } catch (err) {
      toast.error(err?.message || "Yorumlar yüklenemedi");
      reviews.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function onSearchInput() {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      page.value = 1;
      loadReviews();
    }, 350);
  }

  function onFilterChange() {
    page.value = 1;
    loadReviews();
  }

  function clearFilters() {
    searchText.value = "";
    reviewerEmail.value = "";
    minRating.value = "";
    page.value = 1;
    loadReviews();
  }

  async function loadAll() {
    await Promise.all([loadCounts(), loadReviews()]);
  }

  async function doAction(name, action) {
    working.value = name;
    try {
      await api.callMethod("tradehub_core.api.review.admin_moderate_review", {
        name,
        action,
      });
      toast.success(`İşlem başarılı: ${action}`);
      await loadAll();
    } catch (err) {
      toast.error(err?.message || "İşlem başarısız");
    } finally {
      working.value = null;
    }
  }

  function startReject(name) {
    rejectingId.value = name;
    rejectReason.value = "";
  }
  function cancelReject() {
    rejectingId.value = null;
    rejectReason.value = "";
  }

  async function doReject(name) {
    const reason = rejectReason.value.trim();
    if (reason.length < 5) {
      toast.error("Red nedeni en az 5 karakter olmalı");
      return;
    }
    working.value = name;
    try {
      await api.callMethod("tradehub_core.api.review.admin_moderate_review", {
        name,
        action: "reject",
        reason,
      });
      toast.success("Yorum reddedildi");
      cancelReject();
      await loadAll();
    } catch (err) {
      toast.error(err?.message || "İşlem başarısız");
    } finally {
      working.value = null;
    }
  }

  function confirmDelete(name) {
    openConfirm({
      title: "Yorumu kalıcı sil?",
      message:
        `#${name} numaralı yorum ve bağlı tüm kayıtlar (faydalı oylar, ` +
        `şikayet raporları, risk skoru) kalıcı olarak silinecek. ` +
        `Bu işlem geri alınamaz.`,
      confirmLabel: "Kalıcı Sil",
      tone: "danger",
      onConfirm: () => doDelete(name),
    });
  }

  async function doDelete(name) {
    working.value = name;
    try {
      await api.callMethod("tradehub_core.api.review.admin_delete_listing_review", { name });
      toast.success("Yorum silindi");
      await loadAll();
    } catch (err) {
      toast.error(err?.message || "Silme başarısız");
    } finally {
      working.value = null;
    }
  }

  function goPage(p) {
    if (p < 1 || p > totalPages.value) return;
    page.value = p;
    loadReviews();
  }

  onMounted(loadAll);
</script>
