import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  addRedirectFrom404,
  createRedirect,
  deleteRedirect,
  list404s,
  listRedirects,
  updateRedirect,
} from "@/api/seoRedirects";

export const useSeoRedirectsStore = defineStore("seoRedirects", () => {
  // state
  const redirects = ref([]);
  const logs404 = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(null);

  // getters
  const enabledCount = computed(() => redirects.value.filter((r) => r.enabled).length);
  const total404Hits = computed(() =>
    logs404.value.reduce((sum, r) => sum + (r.hit_count || 0), 0)
  );

  // actions
  async function fetchRedirects(enabledOnly = 0) {
    loading.value = true;
    error.value = null;
    try {
      redirects.value = (await listRedirects({ enabledOnly })) || [];
    } catch (e) {
      error.value = e.message || "Redirect listesi yüklenemedi";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetch404s(resolved = 0) {
    loading.value = true;
    error.value = null;
    try {
      logs404.value = (await list404s({ resolved })) || [];
    } catch (e) {
      error.value = e.message || "404 log'ları yüklenemedi";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function createNew(data) {
    saving.value = true;
    try {
      await createRedirect({
        doctype: "SEO Redirect",
        ...data,
      });
      await fetchRedirects();
    } finally {
      saving.value = false;
    }
  }

  async function update(name, data) {
    saving.value = true;
    try {
      await updateRedirect(name, data);
      await fetchRedirects();
    } finally {
      saving.value = false;
    }
  }

  async function remove(name) {
    saving.value = true;
    try {
      await deleteRedirect(name);
      await fetchRedirects();
    } finally {
      saving.value = false;
    }
  }

  async function quickResolve404({ logName, targetPath, statusCode = "301" }) {
    saving.value = true;
    try {
      const res = await addRedirectFrom404({ logName, targetPath, statusCode });
      await Promise.all([fetchRedirects(), fetch404s()]);
      return res;
    } finally {
      saving.value = false;
    }
  }

  return {
    // state
    redirects,
    logs404,
    loading,
    saving,
    error,
    // getters
    enabledCount,
    total404Hits,
    // actions
    fetchRedirects,
    fetch404s,
    createNew,
    update,
    remove,
    quickResolve404,
  };
});
