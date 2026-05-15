<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">Ürünlerim</h1>
        <p class="text-xs text-gray-400 mt-0.5">Ürünlerinizin durumunu takip edin ve yönetin</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" />
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadListings">
          <AppIcon name="refresh-cw" :size="13" />
          Yenile
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="goToNewListing">
          <AppIcon name="plus" :size="13" />
          Yeni Ekle
        </button>
      </div>
    </div>

    <!-- Status Filter Pills -->
    <StatusFilterPills
      v-model="activeStatus"
      :options="statusFilters"
      @change="
        page = 1;
        loadListings();
      "
    />

    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Yükleniyor...</p>
    </div>

    <div v-else-if="listings.length === 0" class="card text-center py-12">
      <AppIcon name="package" :size="32" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400">
        {{ activeStatus === "all" ? "Henüz ürün eklenmemiş." : "Bu durumda ürün bulunamadı." }}
      </p>
    </div>

    <div
      v-else-if="!['list', 'grid', 'kanban'].includes(viewMode)"
      class="card overflow-hidden p-0"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Ürün</th>
            <th class="text-right text-xs font-semibold text-gray-500 px-4 py-3">Fiyat</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Stok</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Doluluk</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Durum</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">İşlem</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
          <tr
            v-for="listing in listings"
            :key="listing.name"
            class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors cursor-pointer"
            @click.self="goToListing(listing.name)"
          >
            <td class="px-4 py-3 cursor-pointer" @click="goToListing(listing.name)">
              <p
                class="font-medium text-gray-800 dark:text-gray-200 text-xs hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                {{ listing.title }}
              </p>
              <p class="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                {{ listing.listing_code }}
                <router-link
                  v-if="(certCounts[listing.name] || 0) > 0"
                  :to="'/my-certifications#product'"
                  class="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                  :title="'Sertifikalarım sayfasında düzenle'"
                  @click.stop
                >
                  <AppIcon name="award" :size="10" />
                  {{ certCounts[listing.name] }}
                </router-link>
              </p>
            </td>
            <td class="px-4 py-3 text-right text-xs font-semibold text-gray-800 dark:text-gray-200">
              {{ listing.currency }}
              {{
                Number(listing.selling_price || 0).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })
              }}
            </td>
            <td class="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400">
              {{ listing.available_qty || 0 }} / {{ listing.stock_qty || 0 }}
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center gap-1.5 justify-center">
                <div class="w-14 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="
                      listing.completeness_score >= 80
                        ? 'bg-green-500'
                        : listing.completeness_score >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    "
                    :style="{ width: (listing.completeness_score || 0) + '%' }"
                  ></div>
                </div>
                <span
                  class="text-[10px] font-mono"
                  :class="
                    listing.completeness_score >= 80
                      ? 'text-green-600 dark:text-green-400'
                      : listing.completeness_score >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-500 dark:text-red-400'
                  "
                >
                  %{{ listing.completeness_score || 0 }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <span
                class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                :class="statusClass(listing.status)"
              >
                {{ statusLabel(listing.status) }}
              </span>
              <!-- KYB onaylanmadan satıcının Active listing'i sitede görünür ama
                   sipariş alınamaz; bunu göstermek için ek rozet. -->
              <div
                v-if="listing.status === 'Active' && !auth.isVerifiedSeller"
                class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                title="KYB onayınız tamamlanınca sipariş alımı başlar"
              >
                <AppIcon name="lock" :size="11" />
                Sipariş bekliyor
              </div>
            </td>
            <td class="px-4 py-3 text-center">
              <!-- Onaylanmamış: değişiklik yapılamaz -->
              <div v-if="!isApproved(listing.status)">
                <span class="text-xs text-gray-400 italic">
                  {{ listing.status === "Pending" ? "Onay bekleniyor" : "Reddedildi" }}
                </span>
                <p
                  v-if="listing.status === 'Rejected' && listing.rejection_reason"
                  class="text-[10px] text-red-400 mt-1 max-w-[180px] mx-auto leading-snug"
                >
                  {{ listing.rejection_reason }}
                </p>
              </div>
              <!-- Onaylanmış: durum değiştirme -->
              <div v-else class="flex items-center justify-center gap-1">
                <select
                  :value="listing.status"
                  :disabled="changingId === listing.name"
                  class="text-xs border border-gray-200 dark:border-[#2a2a35] rounded-lg px-2 py-1 bg-white dark:bg-[#16161f] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:opacity-60"
                  @change="changeStatus(listing, $event.target.value)"
                >
                  <option value="Active">Aktif</option>
                  <option value="Paused">Duraklatıldı</option>
                  <option value="Out of Stock">Stok Yok</option>
                </select>
                <AppIcon
                  v-if="changingId === listing.name"
                  name="loader"
                  :size="13"
                  class="animate-spin text-violet-500"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- List (compact) -->
    <div v-else-if="viewMode === 'list'" class="card p-0 overflow-hidden">
      <div
        v-for="listing in listings"
        :key="listing.name"
        class="list-compact-item"
        @click="goToListing(listing.name)"
      >
        <span class="list-compact-name flex-1 min-w-0 truncate">{{ listing.title }}</span>
        <span
          class="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0"
          :class="statusClass(listing.status)"
          >{{ statusLabel(listing.status) }}</span
        >
        <span class="text-xs text-gray-400 font-mono hidden sm:inline truncate max-w-[120px]">{{
          listing.listing_code
        }}</span>
        <span class="text-xs text-gray-600 dark:text-gray-400 hidden md:inline">
          {{ listing.available_qty || 0 }} / {{ listing.stock_qty || 0 }}
        </span>
        <span class="text-xs font-semibold text-gray-700 dark:text-gray-300 hidden md:inline">
          {{ listing.currency }}
          {{
            Number(listing.selling_price || 0).toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })
          }}
        </span>
        <div
          class="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden hidden sm:block"
        >
          <div
            class="h-full rounded-full"
            :class="
              listing.completeness_score >= 80
                ? 'bg-green-500'
                : listing.completeness_score >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            "
            :style="{ width: (listing.completeness_score || 0) + '%' }"
          ></div>
        </div>
        <button
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          @click.stop
        >
          <AppIcon name="more-vertical" :size="14" />
        </button>
      </div>
    </div>

    <!-- Grid (cards) -->
    <div v-else-if="viewMode === 'grid'" class="list-grid">
      <div
        v-for="listing in listings"
        :key="listing.name"
        class="list-grid-card cursor-pointer"
        @click="goToListing(listing.name)"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <span class="list-grid-card-title">{{ listing.title }}</span>
          <span
            class="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0"
            :class="statusClass(listing.status)"
            >{{ statusLabel(listing.status) }}</span
          >
        </div>
        <div class="text-[10px] text-gray-400 font-mono mb-2">{{ listing.listing_code }}</div>
        <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {{ listing.currency }}
          {{
            Number(listing.selling_price || 0).toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })
          }}
        </div>
        <div class="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
          Stok: {{ listing.available_qty || 0 }} / {{ listing.stock_qty || 0 }}
        </div>
        <div class="flex items-center gap-1.5 mb-2">
          <div class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="
                listing.completeness_score >= 80
                  ? 'bg-green-500'
                  : listing.completeness_score >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              "
              :style="{ width: (listing.completeness_score || 0) + '%' }"
            ></div>
          </div>
          <span
            class="text-[10px] font-mono"
            :class="
              listing.completeness_score >= 80
                ? 'text-green-600 dark:text-green-400'
                : listing.completeness_score >= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-500 dark:text-red-400'
            "
          >
            %{{ listing.completeness_score || 0 }}
          </span>
        </div>
        <p
          v-if="listing.status === 'Rejected' && listing.rejection_reason"
          class="text-[10px] text-red-400 leading-snug mt-2"
        >
          {{ listing.rejection_reason }}
        </p>
      </div>
    </div>

    <!-- Kanban (by status) -->
    <div v-else-if="viewMode === 'kanban'" class="list-kanban">
      <div v-for="col in kanbanColumns" :key="col.key" class="kanban-col">
        <div class="kanban-col-header" :style="{ borderColor: col.color }">
          <span>{{ col.label }}</span>
          <span class="kanban-col-count">{{ col.items.length }}</span>
        </div>
        <div class="kanban-col-body">
          <div
            v-for="listing in col.items"
            :key="listing.name"
            class="kanban-card"
            @click="goToListing(listing.name)"
          >
            <div class="kanban-card-title truncate">{{ listing.title }}</div>
            <div class="text-[10px] text-gray-400 dark:text-gray-500 font-mono mb-1 truncate">
              {{ listing.listing_code }}
            </div>
            <div class="kanban-card-meta justify-between">
              <span class="font-semibold text-gray-700 dark:text-gray-300">
                {{ listing.currency }}
                {{ Number(listing.selling_price || 0).toLocaleString("tr-TR") }}
              </span>
              <span>%{{ listing.completeness_score || 0 }}</span>
            </div>
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

    <div
      v-if="total > pageSize"
      class="flex items-center justify-between mt-4 text-sm text-gray-500"
    >
      <span>Toplam {{ total }} ürün</span>
      <div class="flex items-center gap-2">
        <button
          :disabled="page <= 1"
          class="px-3 py-1 border rounded disabled:opacity-40"
          @click="prevPage"
        >
          ← Önceki
        </button>
        <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
        <button
          :disabled="page >= Math.ceil(total / pageSize)"
          class="px-3 py-1 border rounded disabled:opacity-40"
          @click="nextPage"
        >
          Sonraki →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import StatusFilterPills from "@/components/common/StatusFilterPills.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import { useAuthStore } from "@/stores/auth";

  const auth = useAuthStore();

  const router = useRouter();
  const toast = useToast();
  const listings = ref([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const pageSize = 20;
  const activeStatus = ref("all");
  const statusFilters = [
    { value: "all", label: "Tümü", dot: "bg-violet-400" },
    { value: "Active", label: "Aktif", dot: "bg-emerald-400" },
    { value: "Out of Stock", label: "Stokta Yok", dot: "bg-amber-400" },
    { value: "Pending", label: "Onay Bekliyor", dot: "bg-blue-400" },
    { value: "Paused", label: "Duraklatılmış", dot: "bg-gray-400" },
    { value: "Draft", label: "Taslak", dot: "bg-slate-400" },
    { value: "Rejected", label: "Reddedildi", dot: "bg-red-400" },
  ];
  const changingId = ref(null);
  const certCounts = ref({});

  const { viewMode } = useListViewMode("seller-listings");

  const KANBAN_STATUS_META = {
    Draft: { label: "Taslak", color: "#94a3b8" },
    Pending: { label: "Onay Bekliyor", color: "#3b82f6" },
    Active: { label: "Aktif", color: "#10b981" },
    Paused: { label: "Duraklatıldı", color: "#f59e0b" },
    "Out of Stock": { label: "Stok Yok", color: "#ef4444" },
    Archived: { label: "Arşivlendi", color: "#6b7280" },
    Rejected: { label: "Reddedildi", color: "#dc2626" },
  };

  const KANBAN_STATUS_ORDER = [
    "Pending",
    "Active",
    "Paused",
    "Out of Stock",
    "Draft",
    "Rejected",
    "Archived",
  ];

  const kanbanColumns = computed(() => {
    const groups = new Map();
    for (const l of listings.value) {
      const k = l.status || "Draft";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(l);
    }
    return KANBAN_STATUS_ORDER.filter((s) => groups.has(s)).map((s) => ({
      key: s,
      label: KANBAN_STATUS_META[s]?.label || s,
      color: KANBAN_STATUS_META[s]?.color || "#9ca3af",
      items: groups.get(s),
    }));
  });

  const APPROVED_STATUSES = new Set(["Active", "Paused", "Out of Stock"]);

  function isApproved(status) {
    return APPROVED_STATUSES.has(status);
  }

  function statusLabel(status) {
    const map = {
      Pending: "Onay Bekliyor",
      Draft: "Taslak",
      Active: "Aktif",
      Paused: "Duraklatıldı",
      "Out of Stock": "Stok Yok",
      Archived: "Arşivlendi",
      Rejected: "Reddedildi",
    };
    return map[status] || status;
  }

  function statusClass(status) {
    const map = {
      Pending: "bg-amber-50 text-amber-700 border border-amber-200",
      Draft: "bg-gray-100 text-gray-600 border border-gray-200",
      Active: "bg-green-50 text-green-700 border border-green-200",
      Paused: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      "Out of Stock": "bg-red-50 text-red-600 border border-red-200",
      Archived: "bg-gray-100 text-gray-500 border border-gray-200",
      Rejected: "bg-red-50 text-red-700 border border-red-200",
    };
    return map[status] || "bg-gray-100 text-gray-500";
  }

  async function loadListings() {
    loading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.listing.get_seller_listings", {
        page: page.value,
        page_size: pageSize,
        status: activeStatus.value,
      });
      listings.value = res.message?.listings || [];
      total.value = res.message?.total || 0;
      await loadCertCounts();
    } catch (err) {
      toast.error(err.message || "Ürünler yüklenemedi");
    } finally {
      loading.value = false;
    }
  }

  async function loadCertCounts() {
    try {
      const names = listings.value.map((l) => l.name);
      if (!names.length) {
        certCounts.value = {};
        return;
      }
      // Sertifikalarım matrisini sayfa bazlı çek — her ürünün cert sayısı için
      const res = await api.callMethodGET(
        "tradehub_core.api.seller_certifications.get_listing_cert_matrix",
        { page: 1, page_size: 500 }
      );
      const items = res?.message?.listings || [];
      const counts = {};
      for (const it of items) {
        counts[it.name] = (it.certs || []).length;
      }
      certCounts.value = counts;
    } catch {
      certCounts.value = {};
    }
  }

  async function changeStatus(listing, newStatus) {
    if (newStatus === listing.status) return;
    changingId.value = listing.name;
    try {
      await api.callMethod(
        "tradehub_core.api.listing.update_listing_status",
        {
          listing_name: listing.name,
          status: newStatus,
        },
        true
      );
      listing.status = newStatus;
      toast.success("Durum güncellendi.");
    } catch (err) {
      toast.error(err.message || "Durum güncellenemedi");
    } finally {
      changingId.value = null;
    }
  }

  function goToNewListing() {
    router.push({ path: "/app/Listing/new", query: { returnTo: "/seller-listings" } });
  }

  function goToListing(name) {
    router.push({
      path: `/app/Listing/${encodeURIComponent(name)}`,
      query: { returnTo: "/seller-listings" },
    });
  }

  function prevPage() {
    if (page.value > 1) {
      page.value--;
      loadListings();
    }
  }
  function nextPage() {
    if (page.value < Math.ceil(total.value / pageSize)) {
      page.value++;
      loadListings();
    }
  }

  onMounted(loadListings);
</script>
