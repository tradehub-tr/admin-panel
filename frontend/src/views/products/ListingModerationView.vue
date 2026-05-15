<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">Ürün Moderasyonu</h1>
        <p class="text-xs text-gray-400 mt-0.5">
          Onay bekleyen listing'leri inceleyin ve onaylayın
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ViewModeToggle v-model="viewMode" />
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadListings">
          <AppIcon name="refresh-cw" :size="13" />
          Yenile
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Yükleniyor...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="listings.length === 0" class="card text-center py-12">
      <AppIcon name="check-circle" :size="32" class="text-emerald-400 mx-auto mb-3" />
      <p class="text-sm text-gray-400">Onay bekleyen ürün bulunmuyor.</p>
    </div>

    <!-- Table (default fallback when viewMode is unknown) -->
    <div
      v-else-if="!['list', 'grid', 'kanban'].includes(viewMode)"
      class="card overflow-hidden p-0"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Ürün</th>
            <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Satıcı</th>
            <th class="text-right text-xs font-semibold text-gray-500 px-4 py-3">Fiyat</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Stok</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Tarih</th>
            <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">İşlem</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
          <tr
            v-for="listing in listings"
            :key="listing.name"
            class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors"
          >
            <!-- Product -->
            <td class="px-4 py-3">
              <p class="font-medium text-gray-800 dark:text-gray-200 text-xs">
                {{ listing.title }}
              </p>
              <p class="text-[10px] text-gray-400 font-mono mt-0.5">{{ listing.listing_code }}</p>
            </td>
            <!-- Seller -->
            <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
              {{ listing.seller_name }}
            </td>
            <!-- Price -->
            <td class="px-4 py-3 text-right text-xs font-semibold text-gray-800 dark:text-gray-200">
              {{ listing.currency }}
              {{
                Number(listing.selling_price || 0).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })
              }}
            </td>
            <!-- Stock -->
            <td class="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400">
              {{ listing.stock_qty || 0 }}
            </td>
            <!-- Date -->
            <td class="px-4 py-3 text-center text-xs text-gray-500">
              {{ formatDate(listing.creation) }}
            </td>
            <!-- Actions -->
            <td class="px-4 py-3">
              <div class="flex items-center justify-center gap-2">
                <button
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors"
                  @click="openDetail(listing)"
                >
                  <AppIcon name="eye" :size="11" />
                  İncele
                </button>
                <button
                  :disabled="processingId === listing.name"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
                  @click="handleAction(listing, 'approve')"
                >
                  <AppIcon
                    v-if="processingId === listing.name"
                    name="loader"
                    :size="11"
                    class="animate-spin"
                  />
                  <AppIcon v-else name="check" :size="11" />
                  Onayla
                </button>
                <button
                  :disabled="processingId === listing.name"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
                  @click="openRejectModal(listing)"
                >
                  <AppIcon name="x" :size="11" />
                  Reddet
                </button>
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
        @click="openDetail(listing)"
      >
        <div
          class="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 flex-shrink-0 flex items-center justify-center"
        >
          <img
            v-if="listing.primary_image"
            :src="listing.primary_image"
            :alt="listing.title"
            class="w-full h-full object-cover"
          />
          <AppIcon v-else name="image" :size="14" class="text-gray-300 dark:text-gray-600" />
        </div>
        <span class="list-compact-name flex-1 min-w-0 truncate">{{ listing.title }}</span>
        <span class="badge bg-amber-500/10 text-amber-600 dark:text-amber-400">Onay Bekliyor</span>
        <span class="text-xs text-gray-400 hidden sm:inline truncate max-w-[120px]">{{
          listing.seller_name
        }}</span>
        <span class="text-xs font-semibold text-gray-700 dark:text-gray-300 hidden md:inline">
          {{ listing.currency }}
          {{
            Number(listing.selling_price || 0).toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })
          }}
        </span>
        <span class="list-compact-date">{{ formatDate(listing.creation) }}</span>
        <div class="flex items-center gap-1.5 flex-shrink-0" @click.stop>
          <button
            :disabled="processingId === listing.name"
            class="inline-row-btn bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            title="Onayla"
            @click="handleAction(listing, 'approve')"
          >
            <AppIcon name="check" :size="13" />
          </button>
          <button
            :disabled="processingId === listing.name"
            class="inline-row-btn bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
            title="Reddet"
            @click="openRejectModal(listing)"
          >
            <AppIcon name="x" :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- Grid (cards) -->
    <div v-else-if="viewMode === 'grid'" class="list-grid">
      <div
        v-for="listing in listings"
        :key="listing.name"
        class="list-grid-card cursor-pointer"
        @click="openDetail(listing)"
      >
        <div
          class="aspect-video w-full mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 flex items-center justify-center"
        >
          <img
            v-if="listing.primary_image"
            :src="listing.primary_image"
            :alt="listing.title"
            class="w-full h-full object-cover"
          />
          <AppIcon v-else name="image" :size="32" class="text-gray-300 dark:text-gray-600" />
        </div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <span class="list-grid-card-title">{{ listing.title }}</span>
          <span
            class="badge text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0"
            >Onay Bekliyor</span
          >
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
          <span class="font-medium">Satıcı:</span> {{ listing.seller_name }}
        </div>
        <div class="text-xs text-gray-700 dark:text-gray-300 mb-1 font-semibold">
          {{ listing.currency }}
          {{
            Number(listing.selling_price || 0).toLocaleString("tr-TR", {
              minimumFractionDigits: 2,
            })
          }}
          <span class="ml-2 text-gray-400 font-normal">Stok: {{ listing.stock_qty || 0 }}</span>
        </div>
        <div class="list-grid-card-meta">
          <span>{{ listing.listing_code }}</span>
          <span>{{ formatDate(listing.creation) }}</span>
        </div>
        <div class="flex items-center gap-1.5 mt-3" @click.stop>
          <button
            :disabled="processingId === listing.name"
            class="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
            @click="handleAction(listing, 'approve')"
          >
            <AppIcon name="check" :size="11" />
            Onayla
          </button>
          <button
            :disabled="processingId === listing.name"
            class="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
            @click="openRejectModal(listing)"
          >
            <AppIcon name="x" :size="11" />
            Reddet
          </button>
        </div>
      </div>
    </div>

    <!-- Kanban (by listing_type) -->
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
            @click="openDetail(listing)"
          >
            <div class="flex items-center gap-2 mb-2">
              <div
                class="w-8 h-8 rounded overflow-hidden bg-gray-100 dark:bg-white/5 flex-shrink-0 flex items-center justify-center"
              >
                <img
                  v-if="listing.primary_image"
                  :src="listing.primary_image"
                  :alt="listing.title"
                  class="w-full h-full object-cover"
                />
                <AppIcon v-else name="image" :size="12" class="text-gray-300 dark:text-gray-600" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="kanban-card-title truncate">{{ listing.title }}</div>
                <div class="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                  {{ listing.seller_name }}
                </div>
              </div>
            </div>
            <div class="kanban-card-meta justify-between">
              <span class="font-semibold text-gray-700 dark:text-gray-300">
                {{ listing.currency }}
                {{ Number(listing.selling_price || 0).toLocaleString("tr-TR") }}
              </span>
              <span>{{ formatDate(listing.creation) }}</span>
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

    <!-- Pagination -->
    <div
      v-if="total > pageSize"
      class="flex items-center justify-between mt-4 text-sm text-gray-500"
    >
      <span>Toplam {{ total }} listing</span>
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

    <!-- Detail Modal -->
    <div v-if="selectedListing" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="selectedListing = null"></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[600px] max-w-[calc(100vw-32px)] max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">Listing Detayı</h3>
          <button
            class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
            @click="selectedListing = null"
          >
            <AppIcon name="x" :size="18" />
          </button>
        </div>

        <!-- Görsel -->
        <div
          v-if="selectedListing.primary_image"
          class="mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-[#16161f] flex items-center justify-center"
          style="max-height: 220px"
        >
          <img
            :src="selectedListing.primary_image"
            class="object-contain max-h-[220px] w-full"
            :alt="selectedListing.title"
          />
        </div>
        <div
          v-else
          class="mb-4 rounded-lg bg-gray-100 dark:bg-[#16161f] flex items-center justify-center"
          style="height: 120px"
        >
          <AppIcon name="image" :size="32" class="text-gray-300" />
        </div>

        <div class="space-y-3 text-sm">
          <!-- Başlık tam genişlik -->
          <div>
            <p class="text-xs text-gray-400 mb-1">Başlık</p>
            <p class="font-semibold text-gray-800 dark:text-gray-200">
              {{ selectedListing.title }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-xs text-gray-400 mb-1">Satıcı</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">
                {{ selectedListing.seller_name }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Kategori</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">
                {{ selectedListing.display_category }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Fiyat</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">
                {{ selectedListing.currency }}
                {{
                  Number(selectedListing.selling_price || 0).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })
                }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Stok</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">
                {{ selectedListing.stock_qty || 0 }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Listing Tipi</p>
              <p class="font-medium text-gray-800 dark:text-gray-200">
                {{ selectedListing.listing_type || "—" }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-400 mb-1">Eklenme Tarihi</p>
              <p class="text-gray-600 dark:text-gray-400">
                {{ formatDate(selectedListing.creation) }}
              </p>
            </div>
            <div class="col-span-2">
              <p class="text-xs text-gray-400 mb-1">Kod</p>
              <p class="font-mono text-xs text-gray-600 dark:text-gray-400">
                {{ selectedListing.listing_code }}
              </p>
            </div>
          </div>

          <!-- Açıklama -->
          <div v-if="selectedListing.description">
            <p class="text-xs text-gray-400 mb-1">Açıklama</p>
            <div
              class="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#16161f] rounded-lg p-3 max-h-32 overflow-y-auto leading-relaxed"
              v-html="selectedListing.description"
            ></div>
          </div>
        </div>

        <div class="flex gap-3 justify-end mt-6">
          <button class="hdr-btn-outlined" @click="selectedListing = null">Kapat</button>
          <button class="hdr-btn-danger" @click="openRejectFromDetail">Reddet</button>
          <button
            class="hdr-btn-primary"
            @click="
              handleAction(selectedListing, 'approve');
              selectedListing = null;
            "
          >
            Onayla
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Reason Modal -->
    <div v-if="rejectModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="rejectModal.show = false"></div>
      <div
        class="relative bg-white dark:bg-[#1e1e2a] rounded-xl shadow-xl p-6 w-[420px] max-w-[calc(100vw-32px)]"
      >
        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Reddetme Sebebi</h3>
        <textarea
          v-model="rejectModal.reason"
          rows="3"
          placeholder="İsteğe bağlı — satıcıya bildirilecek..."
          class="w-full border border-gray-200 dark:border-[#2a2a35] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#16161f] text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
        ></textarea>
        <div class="flex gap-3 justify-end mt-4">
          <button class="hdr-btn-outlined" @click="rejectModal.show = false">İptal</button>
          <button :disabled="processingId !== null" class="hdr-btn-danger" @click="confirmReject">
            <AppIcon v-if="processingId" name="loader" :size="13" class="animate-spin" />
            Reddet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";

  const toast = useToast();

  const listings = ref([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const pageSize = 20;
  const processingId = ref(null);
  const selectedListing = ref(null);
  const rejectModal = ref({ show: false, listing: null, reason: "" });

  const { viewMode } = useListViewMode("listing-moderation");

  const KANBAN_TYPE_META = {
    B2B: { label: "B2B", color: "#7c3aed" },
    B2C: { label: "B2C", color: "#0ea5e9" },
    Wholesale: { label: "Toptan", color: "#f59e0b" },
    "": { label: "Diğer", color: "#9ca3af" },
  };

  const kanbanColumns = computed(() => {
    const groups = new Map();
    for (const l of listings.value) {
      const k = l.listing_type || "";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(l);
    }
    const out = [];
    for (const [k, items] of groups) {
      const meta = KANBAN_TYPE_META[k] || { label: k || "Diğer", color: "#9ca3af" };
      out.push({ key: k || "_other", label: meta.label, color: meta.color, items });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, "tr"));
  });

  async function loadListings() {
    loading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.listing.get_pending_listings", {
        page: page.value,
        page_size: pageSize,
      });
      listings.value = res.message?.listings || [];
      total.value = res.message?.total || 0;
    } catch (err) {
      toast.error(err.message || "Listing'ler yüklenemedi");
    } finally {
      loading.value = false;
    }
  }

  async function handleAction(listing, action, rejectReason = "") {
    processingId.value = listing.name;
    try {
      await api.callMethod(
        "tradehub_core.api.listing.approve_listing",
        {
          listing_name: listing.name,
          action,
          reject_reason: rejectReason,
        },
        true
      );
      const label = action === "approve" ? "onaylandı" : "reddedildi";
      toast.success(`"${listing.title}" ${label}.`);
      await loadListings();
    } catch (err) {
      toast.error(err.message || "İşlem başarısız");
    } finally {
      processingId.value = null;
    }
  }

  function openDetail(listing) {
    selectedListing.value = listing;
  }

  function openRejectModal(listing) {
    rejectModal.value = { show: true, listing, reason: "" };
  }

  function openRejectFromDetail() {
    const listing = selectedListing.value;
    selectedListing.value = null;
    openRejectModal(listing);
  }

  async function confirmReject() {
    const { listing, reason } = rejectModal.value;
    rejectModal.value.show = false;
    await handleAction(listing, "reject", reason);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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
