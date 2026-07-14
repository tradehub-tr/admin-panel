<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">{{ t("sellerInquiriesList.title") }}</h1>
        <p class="hd-page-sub">{{ t("sellerInquiriesList.recordCount", { n: total }) }}</p>
      </div>
      <div class="flex items-center gap-2" data-tour="si-search">
        <ViewModeToggle v-model="viewMode" />
        <button class="hd-action" @click="reload">
          <AppIcon name="refresh-cw" :size="14" /><span>{{
            t("sellerInquiriesList.refresh")
          }}</span>
        </button>
      </div>
    </div>

    <div
      class="flex items-center flex-wrap mb-4 border-b border-gray-200 dark:border-white/10"
      data-tour="si-filter"
    >
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="hd-tab"
        :class="{ active: activeTab === tab.value }"
        @click="
          activeTab = tab.value;
          reload();
        "
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="tab.dot"></span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-brand-700 animate-spin" />
    </div>

    <div v-else-if="items.length === 0" class="hd-empty">
      <div class="hd-empty-icon"><AppIcon name="message-circle" :size="28" /></div>
      <h3 class="hd-empty-title">{{ t("sellerInquiriesList.emptyTab") }}</h3>
    </div>

    <!-- Kanban Görünümü -->
    <KanbanBoard
      v-else-if="viewMode === 'kanban'"
      :items="items"
      :columns="kanbanColumns"
      status-field="status"
      :draggable="false"
      @item-click="openDetail"
    >
      <template #card="{ item }">
        <div class="flex items-center gap-2 mb-1.5">
          <div class="hd-tl-avatar av-customer shrink-0">{{ initial(item.sender_name) }}</div>
          <span class="text-xs font-semibold truncate">{{
            item.sender_name || t("sellerInquiriesList.anonymous")
          }}</span>
          <span v-if="!item.is_read" class="hd-prio-chip pc-blue ml-auto shrink-0">{{
            t("sellerInquiriesList.new")
          }}</span>
        </div>
        <p class="text-[11px] text-gray-500 truncate">{{ item.message_preview }}</p>
        <p class="text-[10px] text-gray-400 mt-1.5">{{ formatDate(item.creation) }}</p>
      </template>
    </KanbanBoard>

    <!-- Grid (kart) Görünümü -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    >
      <div
        v-for="i in items"
        :key="i.name"
        class="card p-4 cursor-pointer hover:border-brand-300 dark:hover:border-brand-500/40 transition-colors"
        :class="{ 'hd-unread': !i.is_read }"
        @click="openDetail(i)"
      >
        <div class="flex items-center gap-2.5 mb-3">
          <div class="hd-tl-avatar av-customer shrink-0">{{ initial(i.sender_name) }}</div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold truncate">
              {{ i.sender_name || t("sellerInquiriesList.anonymous") }}
            </p>
            <p v-if="i.sender_email" class="text-[11px] text-gray-500 truncate">
              {{ i.sender_email }}
            </p>
          </div>
          <span class="hd-status shrink-0" :class="statusCls(i.status)">{{ i.status }}</span>
        </div>
        <p class="text-xs text-gray-600 dark:text-gray-300 truncate mb-2">
          {{ i.message_preview }}
        </p>
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-gray-400">
            <AppIcon name="clock" :size="11" />{{ formatDate(i.creation) }}
          </span>
          <span v-if="!i.is_read" class="hd-prio-chip pc-blue ml-auto">{{
            t("sellerInquiriesList.new")
          }}</span>
        </div>
      </div>
    </div>

    <!-- Tablo Görünümü -->
    <div v-else-if="viewMode === 'table'" class="card p-0 overflow-hidden" data-tour="si-table">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-white/10">
              <th class="tbl-th">{{ t("contactsList.colContact") }}</th>
              <th class="tbl-th">{{ t("rfqDetail.message") }}</th>
              <th class="tbl-th">{{ t("dealsList.colStatus") }}</th>
              <th class="tbl-th">{{ t("dealsList.colUpdated") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="i in items"
              :key="i.name"
              class="tbl-row border-b border-gray-50 dark:border-white/5 cursor-pointer"
              :class="{ 'hd-unread': !i.is_read }"
              @click="openDetail(i)"
            >
              <td class="tbl-td">
                <div class="flex items-center gap-2">
                  <div class="hd-tl-avatar av-customer shrink-0">{{ initial(i.sender_name) }}</div>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold truncate">
                      {{ i.sender_name || t("sellerInquiriesList.anonymous") }}
                    </p>
                    <p v-if="i.sender_email" class="text-[10px] text-gray-400 truncate">
                      {{ i.sender_email }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="tbl-td">
                <span class="text-xs text-gray-600 dark:text-gray-300 truncate block max-w-[280px]">
                  {{ i.message_preview }}
                </span>
              </td>
              <td class="tbl-td">
                <span class="hd-status" :class="statusCls(i.status)">{{ i.status }}</span>
              </td>
              <td class="tbl-td">
                <span class="text-[11px] text-gray-500">{{ formatDate(i.creation) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Kompakt Liste Görünümü -->
    <div v-else class="space-y-2.5">
      <div
        v-for="i in items"
        :key="i.name"
        class="hd-row group"
        :class="{ 'hd-unread': !i.is_read }"
        @click="openDetail(i)"
      >
        <div class="hd-tl-avatar av-customer shrink-0">
          {{ initial(i.sender_name) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span class="hd-row-title m-0 truncate">{{
              i.sender_name || t("sellerInquiriesList.anonymous")
            }}</span>
            <span class="hd-status" :class="statusCls(i.status)">{{ i.status }}</span>
            <span v-if="!i.is_read" class="hd-prio-chip pc-blue">{{
              t("sellerInquiriesList.new")
            }}</span>
            <span v-if="i.share_business_card" class="hd-team-chip">
              <AppIcon name="id-card" :size="10" />{{ t("sellerInquiriesList.card") }}
            </span>
          </div>
          <p class="hd-row-meta-line truncate">{{ i.message_preview }}</p>
          <div class="flex items-center gap-3 mt-1.5">
            <span v-if="i.sender_email" class="hd-row-meta">
              <AppIcon name="mail" :size="11" />{{ i.sender_email }}
            </span>
            <span class="hd-row-meta">
              <AppIcon name="clock" :size="11" />{{ formatDate(i.creation) }}
            </span>
          </div>
        </div>
        <AppIcon
          name="chevron-right"
          :size="16"
          class="self-center text-gray-300 group-hover:text-brand-700 transition-colors"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRouter } from "vue-router";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import { useListViewMode } from "@/composables/useListViewMode";
  import AppIcon from "@/components/common/AppIcon.vue";
  import ViewModeToggle from "@/components/common/ViewModeToggle.vue";
  import KanbanBoard from "@/components/common/KanbanBoard.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const { viewMode } = useListViewMode("seller-inquiries", "table");

  // Sayfa-içi onboarding: liste/tablo → durum sekmeleri → görünüm/yenile kontrolleri.
  usePageTour("seller-inquiries", () => [
    {
      target: '[data-tour="si-table"]',
      title: t("tourSteps.page.siTable_t"),
      desc: t("tourSteps.page.siTable_d"),
    },
    {
      target: '[data-tour="si-filter"]',
      title: t("tourSteps.page.siFilter_t"),
      desc: t("tourSteps.page.siFilter_d"),
    },
    {
      target: '[data-tour="si-search"]',
      title: t("tourSteps.page.siSearch_t"),
      desc: t("tourSteps.page.siSearch_d"),
    },
  ]);
  const items = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const activeTab = ref("all");

  const tabs = [
    { value: "all", label: t("sellerInquiriesList.tabAll"), dot: "bg-gray-300" },
    { value: "Yeni", label: t("sellerInquiriesList.tabNew"), dot: "bg-blue-400" },
    { value: "Okundu", label: t("sellerInquiriesList.tabRead"), dot: "bg-amber-400" },
    { value: "Yanıtlandı", label: t("sellerInquiriesList.tabAnswered"), dot: "bg-emerald-400" },
  ];

  const kanbanColumns = computed(() => [
    { value: "Yeni", label: t("sellerInquiriesList.tabNew"), color: "#3b82f6" },
    { value: "Okundu", label: t("sellerInquiriesList.tabRead"), color: "#f59e0b" },
    { value: "Yanıtlandı", label: t("sellerInquiriesList.tabAnswered"), color: "#10b981" },
  ]);

  function initial(s) {
    return s ? String(s).trim().charAt(0).toUpperCase() : "?";
  }
  function statusCls(s) {
    const m = { Yeni: "sc-blue", Okundu: "sc-amber", Yanıtlandı: "sc-emerald" };
    return m[s] || "sc-gray";
  }
  function formatDate(s) {
    if (!s) return "";
    try {
      const d = new Date(s);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 3600) return t("sellerInquiriesList.minutesAgo", { n: Math.floor(diff / 60) });
      if (diff < 86400) return t("sellerInquiriesList.hoursAgo", { n: Math.floor(diff / 3600) });
      return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return s;
    }
  }

  function openDetail(i) {
    router.push(`/helpdesk/inquiries/${encodeURIComponent(i.name)}`);
  }

  async function reload() {
    loading.value = true;
    try {
      const res = await api.callMethod("tradehub_core.api.seller.list_my_inquiries", {
        status: activeTab.value,
        page: 1,
        page_size: 50,
      });
      const payload = res?.message || {};
      items.value = payload.data || [];
      total.value = payload.total || 0;
    } catch (e) {
      toast.error(e.message || t("sellerInquiriesList.loadFailed"));
    } finally {
      loading.value = false;
    }
  }

  onMounted(reload);
</script>

<!-- hd-unread + hd-row-meta-line stilleri global helpdesk.scss'te -->
