<template>
  <div class="max-w-2xl mx-auto py-6 px-4">
    <h1 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
        <AppIcon name="award" :size="20" class="text-emerald-600" />
      </div>
      Yeni Sertifika Öner
    </h1>

    <!-- Success message -->
    <div v-if="success" class="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
      <div
        class="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center"
      >
        <svg
          class="w-7 h-7 text-green-600"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <p class="text-green-800 font-semibold text-lg mb-1">Öneri Gönderildi</p>
      <p class="text-green-700 text-sm mb-4">{{ successMessage }}</p>
      <div class="flex justify-center gap-3">
        <button
          class="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          @click="resetForm"
        >
          Başka bir sertifika öner
        </button>
        <router-link
          to="/app/Certification Type"
          class="px-5 py-2 border border-green-300 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors"
        >
          Sertifika Listesi
        </router-link>
      </div>
    </div>

    <!-- Form -->
    <form v-else class="space-y-5" @submit.prevent="submitSuggestion">
      <!-- Certification Name -->
      <div>
        <label for="cert-name" class="form-label">
          Sertifika Adı <span class="text-red-500">*</span>
        </label>
        <input
          id="cert-name"
          v-model="form.certification_name"
          type="text"
          class="form-input"
          placeholder="Örn: OEKO-TEX, GOTS, ISO 50001"
          required
        />
      </div>

      <!-- Category -->
      <div>
        <label for="cert-category" class="form-label">
          Kategori <span class="text-red-500">*</span>
        </label>
        <select id="cert-category" v-model="form.category" class="form-input" required>
          <option value="" disabled>Seçiniz</option>
          <option value="Management">Yönetim Sertifikası</option>
          <option value="Product">Ürün Sertifikası</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          Yönetim: Şirket kalite sistemi (ISO 9001, BSCI vb.) — Ürün: Ürün güvenliği (CE, ROHS vb.)
        </p>
      </div>

      <!-- Description -->
      <div>
        <label for="cert-desc" class="form-label">Açıklama</label>
        <textarea
          id="cert-desc"
          v-model="form.description"
          class="form-input"
          rows="3"
          placeholder="Bu sertifika hakkında kısa açıklama (opsiyonel)"
        ></textarea>
      </div>

      <!-- Error message -->
      <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <!-- Submit -->
      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="submitting"
          class="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ submitting ? "Gönderiliyor..." : "Öner" }}
        </button>
        <router-link
          to="/app/Certification Type"
          class="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Mevcut Sertifikaları Gör
        </router-link>
      </div>

      <p class="text-xs text-gray-400 mt-2">
        Öneriniz admin onayından sonra tüm satıcıların kullanımına açılacaktır.
      </p>
    </form>
  </div>

  <!-- Önerilerim — 4 mod görünümü -->
  <div v-if="allSuggestions.length > 0" class="max-w-6xl mx-auto px-4 pb-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Önerilerim</h2>
      <ViewModeToggle v-model="viewMode" />
    </div>

    <!-- List (default fallback when viewMode is unknown) -->
    <div v-if="!['table', 'grid', 'kanban'].includes(viewMode)" class="card p-0 overflow-hidden">
      <div v-for="s in allSuggestions" :key="s.name" class="list-compact-item">
        <span class="list-compact-name flex-1 min-w-0 truncate">{{ s.certification_name }}</span>
        <span class="badge text-[10px]" :class="suggestionBadgeClass(s._status)">
          {{ statusLabel(s._status) }}
        </span>
        <span class="text-xs text-gray-400 hidden sm:inline">
          {{ s.category === "Management" ? "Yönetim" : "Ürün" }}
        </span>
        <span
          v-if="s._status === 'Rejected' && s.rejection_reason"
          class="text-[11px] text-red-500 dark:text-red-400 truncate max-w-[260px] hidden md:inline"
          :title="s.rejection_reason"
        >
          {{ s.rejection_reason }}
        </span>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="viewMode === 'table'" class="card overflow-hidden p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-white/10">
            <th class="tbl-th">SERTİFİKA</th>
            <th class="tbl-th">KATEGORİ</th>
            <th class="tbl-th">DURUM</th>
            <th class="tbl-th">NOT</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="s in allSuggestions"
            :key="s.name"
            class="tbl-row border-b border-gray-50 dark:border-white/5"
          >
            <td class="tbl-td font-semibold text-gray-800 dark:text-gray-200">
              {{ s.certification_name }}
            </td>
            <td class="tbl-td text-gray-600 dark:text-gray-400">
              {{ s.category === "Management" ? "Yönetim" : "Ürün" }}
            </td>
            <td class="tbl-td">
              <span class="badge text-[10px]" :class="suggestionBadgeClass(s._status)">
                {{ statusLabel(s._status) }}
              </span>
            </td>
            <td class="tbl-td text-xs text-gray-500 dark:text-gray-400">
              {{ s.rejection_reason || "—" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grid -->
    <div v-else-if="viewMode === 'grid'" class="list-grid">
      <div v-for="s in allSuggestions" :key="s.name" class="list-grid-card">
        <div class="flex items-start justify-between gap-2 mb-2">
          <span class="list-grid-card-title">{{ s.certification_name }}</span>
          <span class="badge text-[10px]" :class="suggestionBadgeClass(s._status)">
            {{ statusLabel(s._status) }}
          </span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span class="font-medium">Kategori:</span>
          {{ s.category === "Management" ? "Yönetim" : "Ürün" }}
        </div>
        <p
          v-if="s._status === 'Rejected' && s.rejection_reason"
          class="text-[11px] text-red-500 dark:text-red-400 leading-snug mt-2"
        >
          Sebep: {{ s.rejection_reason }}
        </p>
      </div>
    </div>

    <!-- Kanban -->
    <div v-else-if="viewMode === 'kanban'" class="list-kanban">
      <div v-for="col in kanbanColumns" :key="col.key" class="kanban-col">
        <div class="kanban-col-header" :style="{ borderColor: col.color }">
          <span>{{ col.label }}</span>
          <span class="kanban-col-count">{{ col.items.length }}</span>
        </div>
        <div class="kanban-col-body">
          <div v-for="s in col.items" :key="s.name" class="kanban-card">
            <div class="kanban-card-title truncate">{{ s.certification_name }}</div>
            <div class="kanban-card-meta">
              {{ s.category === "Management" ? "Yönetim" : "Ürün" }}
            </div>
            <p
              v-if="s.rejection_reason"
              class="text-[10px] text-red-500 dark:text-red-400 leading-snug mt-1"
            >
              {{ s.rejection_reason }}
            </p>
          </div>
          <div
            v-if="col.items.length === 0"
            class="text-center py-6 text-xs text-gray-400 dark:text-gray-500"
          >
            Kayıt yok
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import api from "@/utils/api";
  import { useAuthStore } from "@/stores/auth";
  import { useListViewMode } from "@/composables/useListViewMode";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";

  const auth = useAuthStore();

  const form = ref({
    certification_name: "",
    category: "",
    description: "",
  });
  const submitting = ref(false);
  const success = ref(false);
  const successMessage = ref("");
  const error = ref("");
  const pendingSuggestions = ref([]);
  const rejectedSuggestions = ref([]);
  const approvedSuggestions = ref([]);

  const { viewMode } = useListViewMode("cert-suggestions", "list");

  const allSuggestions = computed(() => [
    ...pendingSuggestions.value.map((s) => ({ ...s, _status: "Pending" })),
    ...approvedSuggestions.value.map((s) => ({ ...s, _status: "Approved" })),
    ...rejectedSuggestions.value.map((s) => ({ ...s, _status: "Rejected" })),
  ]);

  const kanbanColumns = computed(() => [
    {
      key: "Pending",
      label: "Onay Bekliyor",
      color: "#f59e0b",
      items: allSuggestions.value.filter((s) => s._status === "Pending"),
    },
    {
      key: "Approved",
      label: "Onaylandı",
      color: "#10b981",
      items: allSuggestions.value.filter((s) => s._status === "Approved"),
    },
    {
      key: "Rejected",
      label: "Reddedildi",
      color: "#ef4444",
      items: allSuggestions.value.filter((s) => s._status === "Rejected"),
    },
  ]);

  function statusLabel(s) {
    return { Pending: "Onay Bekliyor", Approved: "Onaylandı", Rejected: "Reddedildi" }[s] || s;
  }

  function suggestionBadgeClass(s) {
    return (
      {
        Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        Approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        Rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
      }[s] || "bg-gray-500/10 text-gray-500"
    );
  }

  async function loadMySuggestions() {
    try {
      // Ensure user data is available (may not be loaded when onMounted fires)
      if (!auth.user?.email) {
        await auth.fetchUser();
      }
      const userEmail = auth.user?.email;
      if (!userEmail) return;

      const pendingRes = await api.getList("Certification Type", {
        filters: { suggested_by: userEmail, status: "Pending" },
        fields: ["name", "certification_name", "category"],
        limit_page_length: 50,
      });
      pendingSuggestions.value = pendingRes.data || pendingRes || [];

      const rejectedRes = await api.getList("Certification Type", {
        filters: { suggested_by: userEmail, status: "Rejected" },
        fields: ["name", "certification_name", "category", "rejection_reason"],
        limit_page_length: 50,
      });
      rejectedSuggestions.value = rejectedRes.data || rejectedRes || [];

      const approvedRes = await api.getList("Certification Type", {
        filters: { suggested_by: userEmail, status: "Approved" },
        fields: ["name", "certification_name", "category"],
        limit_page_length: 50,
      });
      approvedSuggestions.value = approvedRes.data || approvedRes || [];
    } catch {
      // Silent fail — permission or network issue
    }
  }

  async function submitSuggestion() {
    error.value = "";
    submitting.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.certification.suggest_certification", {
        certification_name: form.value.certification_name,
        category: form.value.category,
        description: form.value.description,
      });
      success.value = true;
      const msg = res?.message;
      successMessage.value =
        typeof msg === "object" && msg?.message
          ? msg.message
          : typeof msg === "string"
            ? msg
            : "Sertifika öneriniz admin onayına gönderildi.";
      await loadMySuggestions();
    } catch (err) {
      error.value = err.message || "Bir hata oluştu.";
    } finally {
      submitting.value = false;
    }
  }

  function resetForm() {
    form.value = { certification_name: "", category: "", description: "" };
    success.value = false;
    error.value = "";
  }

  onMounted(loadMySuggestions);
</script>
