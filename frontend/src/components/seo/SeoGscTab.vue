<script setup>
  // 13.5 Search Console bağlayıcısı — property, OAuth bağlantısı, senkron, sitemap, kota.
  import { ref, onMounted } from "vue";
  import { useI18n } from "vue-i18n";
  import { useToast } from "@/composables/useToast";
  import { gscStatus, gscAuthUrl, gscSyncNow, gscSubmitSitemap } from "@/api/seoHelper662";

  const { t } = useI18n();
  const toast = useToast();
  const st = ref(null);
  const busy = ref(false);
  const authUrl = ref("");
  const errMsg = (e) => e?.message || String(e);

  async function load() {
    try {
      st.value = await gscStatus();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function connect() {
    try {
      const r = await gscAuthUrl();
      authUrl.value = r.url;
      window.open(r.url, "_blank", "noopener");
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function sync(inspect) {
    busy.value = true;
    try {
      const r = await gscSyncNow(14, inspect ? 1 : 0);
      toast.success(
        t("seoHelper662.gscSynced", {
          rows: r.analytics.rows,
          missing: r.analytics.missing_days.length,
        })
      );
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      busy.value = false;
    }
  }
  async function submit() {
    try {
      const r = await gscSubmitSitemap();
      toast.success(t("seoHelper662.sitemapSubmitted", { path: r.submitted }));
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  const fmt = (v) => (v ? new Date(v).toLocaleString() : "—");
  onMounted(load);
</script>

<template>
  <div class="space-y-4" data-testid="gsc-tab">
    <div v-if="st" class="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="gsc-status">
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper662.connection") }}</div>
        <div
          class="text-sm font-semibold"
          :class="st.configured ? 'text-green-700' : 'text-amber-700'"
        >
          {{ st.configured ? t("seoHelper662.connected") : t("seoHelper662.notConnected") }}
        </div>
        <div class="text-[11px] text-gray-500">
          {{ st.property || t("seoHelper662.noProperty") }}
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper662.lastSync") }}</div>
        <div class="text-sm text-gray-900">{{ fmt(st.last_sync_at) }}</div>
        <div class="text-[11px] text-gray-500">
          {{ t("seoHelper662.dataLag", { n: st.lag_days }) }}
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">
          {{ t("seoHelper662.quotaInspection") }}
        </div>
        <div class="text-sm text-gray-900">
          {{ st.quota.inspection.used }} / {{ st.quota.inspection.limit ?? "—" }}
        </div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-3">
        <div class="text-[11px] uppercase text-gray-400">{{ t("seoHelper662.quotaQuery") }}</div>
        <div class="text-sm text-gray-900">
          {{ st.quota.query.used }} / {{ st.quota.query.limit ?? "—" }}
        </div>
      </div>
    </div>
    <div class="bg-white rounded-lg border border-gray-200 p-4 text-xs text-gray-600 space-y-2">
      <p>{{ t("seoHelper662.gscHelp") }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="hdr-btn-primary"
          :disabled="!st?.has_client"
          data-testid="gsc-connect"
          @click="connect"
        >
          {{ t("seoHelper662.connectGoogle") }}
        </button>
        <button
          type="button"
          class="hdr-btn-outlined"
          :disabled="busy || !st?.configured"
          data-testid="gsc-sync"
          @click="sync(false)"
        >
          {{ t("seoHelper662.syncAnalytics") }}
        </button>
        <button
          type="button"
          class="hdr-btn-outlined"
          :disabled="busy || !st?.configured"
          @click="sync(true)"
        >
          {{ t("seoHelper662.syncWithInspection") }}
        </button>
        <button type="button" class="hdr-btn-outlined" :disabled="!st?.configured" @click="submit">
          {{ t("seoHelper662.submitSitemap") }}
        </button>
        <a href="/app/seo-helper-settings" target="_blank" class="hdr-btn-outlined">{{
          t("seoHelper662.openSettings")
        }}</a>
      </div>
      <div v-if="authUrl" class="text-[11px] break-all text-gray-400">{{ authUrl }}</div>
    </div>
  </div>
</template>
