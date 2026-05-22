<script setup>
  import { ref, computed, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import AppIcon from "@/components/common/AppIcon.vue";
  import api from "@/utils/api";
  import { useToast } from "@/composables/useToast";

  const router = useRouter();
  const toast = useToast();

  const jobs = ref([]);
  const loading = ref(false);
  const statusFilter = ref("all"); // all | completed | partial | failed
  const dateRange = ref("30"); // 30 | 90 (gün)

  // DocType field adlarını (status / *_count / data_file ...) UI'ın okuduğu
  // polling-cache stilindeki kısa adlara aliasla.
  function _aliasJob(j) {
    if (!j) return j;
    j.state = String(j.status || "").toLowerCase();
    j.total = j.total_rows ?? 0;
    j.inserted = j.inserted_count ?? 0;
    j.updated = j.updated_count ?? 0;
    j.skipped = j.skipped_count ?? 0;
    j.duration = j.duration_seconds ?? null;
    j.start_time = j.started_at ?? j.creation;
    j.end_time = j.completed_at ?? j.modified;
    j.file_name = j.data_file;
    return j;
  }

  async function loadHistory() {
    loading.value = true;
    try {
      const res = await api.callMethodGET("tradehub_core.bulk_import.api.get_my_history", {
        limit: 50,
      });
      const raw = Array.isArray(res.message) ? res.message : [];
      jobs.value = raw.map(_aliasJob);
    } catch (e) {
      toast.error(e.message || "Geçmiş yüklenemedi");
      jobs.value = [];
    } finally {
      loading.value = false;
    }
  }

  onMounted(loadHistory);

  const filteredJobs = computed(() => {
    const now = Date.now();
    const days = Number(dateRange.value) || 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return jobs.value.filter((job) => {
      // Durum filtresi
      if (statusFilter.value !== "all") {
        const state = String(job.state || job.status || "").toLowerCase();
        if (statusFilter.value === "completed" && !["completed", "done"].includes(state))
          return false;
        if (statusFilter.value === "partial" && state !== "partial") return false;
        if (statusFilter.value === "failed" && !["failed", "error"].includes(state)) return false;
      }
      // Tarih filtresi (creation veya start_time)
      const ts = new Date(job.creation || job.start_time || job.modified || 0).getTime();
      if (ts && ts < cutoff) return false;
      return true;
    });
  });

  const isEmpty = computed(() => !loading.value && filteredJobs.value.length === 0);

  function stateLabel(state) {
    const s = String(state || "").toLowerCase();
    if (["completed", "done"].includes(s)) return "Tamamlandı";
    if (s === "partial") return "Kısmen";
    if (["failed", "error"].includes(s)) return "Başarısız";
    if (["queued"].includes(s)) return "Sırada";
    if (["running", "in_progress"].includes(s)) return "Çalışıyor";
    return state || "—";
  }

  function stateClass(state) {
    const s = String(state || "").toLowerCase();
    if (["completed", "done"].includes(s)) return "bg-emerald-100 text-emerald-700";
    if (s === "partial") return "bg-amber-100 text-amber-700";
    if (["failed", "error"].includes(s)) return "bg-red-100 text-red-700";
    if (["running", "in_progress"].includes(s)) return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  }

  function formatDate(value) {
    if (!value) return "—";
    try {
      const d = new Date(value);
      return d.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  }

  function formatDuration(seconds) {
    const s = Number(seconds);
    if (!s || isNaN(s)) return "—";
    if (s < 60) return `${Math.round(s)} sn`;
    const m = Math.floor(s / 60);
    const r = Math.round(s % 60);
    return r ? `${m} dk ${r} sn` : `${m} dk`;
  }

  function jobDuration(job) {
    if (job.duration) return formatDuration(job.duration);
    const start = new Date(job.start_time || job.creation || 0).getTime();
    const end = new Date(job.end_time || job.modified || 0).getTime();
    if (start && end && end > start) return formatDuration((end - start) / 1000);
    return "—";
  }

  function goToDetail(jobName) {
    router.push({ name: "bulk-import-detail", params: { name: jobName } }).catch(() => {});
  }

  function goToNew() {
    router.push({ name: "bulk-import-new" }).catch(() => {});
  }
</script>

<template>
  <div class="bulk-import-history">
    <!-- Üst başlık + yeni butonu -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          Toplu Yükleme Geçmişi
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">90 günden eski kayıtlar otomatik silinir</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="hdr-btn-outlined flex items-center gap-1.5" @click="loadHistory">
          <AppIcon name="refresh-cw" :size="13" />
          Yenile
        </button>
        <button class="hdr-btn-primary flex items-center gap-1.5" @click="goToNew">
          <AppIcon name="plus" :size="13" />
          Yeni Yükleme
        </button>
      </div>
    </div>

    <!-- Filtreler -->
    <div class="card !p-4 mb-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-500">Durum:</label>
          <select v-model="statusFilter" class="field-input text-xs py-1.5">
            <option value="all">Tüm durumlar</option>
            <option value="completed">Tamamlandı</option>
            <option value="partial">Kısmen</option>
            <option value="failed">Başarısız</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-500">Tarih:</label>
          <select v-model="dateRange" class="field-input text-xs py-1.5">
            <option value="30">Son 30 gün</option>
            <option value="90">Son 90 gün</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card text-center py-12">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin mx-auto" />
      <p class="text-sm text-gray-400 mt-3">Geçmiş yükleniyor...</p>
    </div>

    <!-- Boş durum -->
    <div v-else-if="isEmpty" class="card text-center py-12">
      <AppIcon name="upload-cloud" :size="36" class="text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-500 mb-1">
        {{ statusFilter !== "all" ? "Bu filtreye uyan yükleme yok" : "Henüz yükleme yapmadın" }}
      </p>
      <p class="text-xs text-gray-400 mb-4">
        Toplu ürün yüklemesi yaparak yüzlerce ürünü hızla ekle
      </p>
      <button class="hdr-btn-primary flex items-center gap-1.5 mx-auto" @click="goToNew">
        <AppIcon name="plus" :size="13" />
        İlk Yüklemeni Yap
      </button>
    </div>

    <!-- Tablo -->
    <div v-else class="card !p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-[#2a2a35] bg-gray-50 dark:bg-[#1a1a25]">
              <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Job ID</th>
              <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Tarih</th>
              <th class="text-left text-xs font-semibold text-gray-500 px-4 py-3">Dosya</th>
              <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Durum</th>
              <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3">Sonuç</th>
              <th class="text-right text-xs font-semibold text-gray-500 px-4 py-3">Süre</th>
              <th class="text-center text-xs font-semibold text-gray-500 px-4 py-3 w-24">Detay</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-[#2a2a35]">
            <tr
              v-for="job in filteredJobs"
              :key="job.name"
              class="hover:bg-gray-50 dark:hover:bg-[#1e1e2a] transition-colors cursor-pointer"
              @click="goToDetail(job.name)"
            >
              <td class="px-4 py-3">
                <code class="font-mono text-xs text-violet-600">{{ job.name }}</code>
              </td>
              <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                {{ formatDate(job.creation || job.start_time) }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                {{ job.file_name || job.input_file_name || "—" }}
              </td>
              <td class="px-4 py-3 text-center">
                <span class="badge" :class="stateClass(job.state || job.status)">
                  {{ stateLabel(job.state || job.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-center text-xs">
                <span class="text-emerald-600 font-medium"> {{ job.inserted || 0 }} ✓ </span>
                <span class="mx-1 text-gray-400">/</span>
                <span class="text-red-500 font-medium"> {{ job.error_count || 0 }} ✕ </span>
                <span class="mx-1 text-gray-400">/</span>
                <span class="text-amber-600 font-medium"> {{ job.skipped || 0 }} ⊘ </span>
              </td>
              <td class="px-4 py-3 text-right text-xs text-gray-500 font-mono">
                {{ jobDuration(job) }}
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  class="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 mx-auto"
                  @click.stop="goToDetail(job.name)"
                >
                  Detay
                  <AppIcon name="arrow-right" :size="12" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .bulk-import-history {
    max-width: 1100px;
    margin: 0 auto;
  }

  .field-input {
    padding: 0.4rem 0.6rem;
    border: 1px solid $l-border;
    border-radius: 0.4rem;
    background: $l-bg;
    color: $l-text-700;
    transition:
      border-color $t-base,
      box-shadow $t-base;

    &:focus {
      outline: none;
      border-color: $brand;
      box-shadow: 0 0 0 3px rgba($brand, 0.15);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text;
    }
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.55rem;
    font-size: 0.65rem;
    font-weight: 600;
    border-radius: 9999px;
  }
</style>
