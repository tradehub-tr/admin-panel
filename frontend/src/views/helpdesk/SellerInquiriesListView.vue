<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 class="hd-page-title">Mağaza Soruları</h1>
        <p class="hd-page-sub">{{ total }} kayıt</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hd-action" @click="reload">
          <AppIcon name="refresh-cw" :size="14" /><span>Yenile</span>
        </button>
      </div>
    </div>

    <div class="flex items-center flex-wrap mb-4 border-b border-gray-200 dark:border-white/10">
      <button
        v-for="t in tabs"
        :key="t.value"
        class="hd-tab"
        :class="{ active: activeTab === t.value }"
        @click="activeTab = t.value; reload()"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="t.dot"></span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else-if="items.length === 0" class="hd-empty">
      <div class="hd-empty-icon"><AppIcon name="message-circle" :size="28" /></div>
      <h3 class="hd-empty-title">Bu sekmede soru yok</h3>
    </div>

    <div v-else class="space-y-2.5">
      <div
        v-for="i in items"
        :key="i.name"
        class="hd-row group"
        :class="{ 'hd-unread': !i.is_read }"
        @click="$router.push(`/helpdesk/inquiries/${encodeURIComponent(i.name)}`)"
      >
        <div class="hd-tl-avatar av-customer shrink-0">
          {{ initial(i.sender_name) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span class="hd-row-title m-0 truncate">{{ i.sender_name || "Anonim" }}</span>
            <span class="hd-status" :class="statusCls(i.status)">{{ i.status }}</span>
            <span v-if="!i.is_read" class="hd-prio-chip pc-blue">Yeni</span>
            <span v-if="i.share_business_card" class="hd-team-chip">
              <AppIcon name="id-card" :size="10" />Kart
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
          class="self-center text-gray-300 group-hover:text-violet-500 transition-colors"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from "vue";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";

  const toast = useToast();
  const items = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const activeTab = ref("all");

  const tabs = [
    { value: "all", label: "Tümü", dot: "bg-gray-300" },
    { value: "Yeni", label: "Yeni", dot: "bg-blue-400" },
    { value: "Okundu", label: "Okundu", dot: "bg-amber-400" },
    { value: "Yanıtlandı", label: "Yanıtlandı", dot: "bg-emerald-400" },
  ];

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
      if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
      return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return s;
    }
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
      toast.error(e.message || "Liste alınamadı");
    } finally {
      loading.value = false;
    }
  }

  onMounted(reload);
</script>

<!-- hd-unread + hd-row-meta-line stilleri global helpdesk.scss'te -->

