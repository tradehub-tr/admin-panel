<script setup>
  import { onMounted, ref } from "vue";
  import { storeToRefs } from "pinia";
  import { useSeoRedirectsStore } from "@/stores/seoRedirects";
  import { useToast } from "@/composables/useToast";

  const store = useSeoRedirectsStore();
  const { logs404, loading, saving, total404Hits } = storeToRefs(store);
  const toast = useToast();

  const showResolved = ref(false);
  const quickResolveTarget = ref({}); // logName → targetPath input

  onMounted(() => store.fetch404s(0));

  async function refreshList() {
    await store.fetch404s(showResolved.value ? 1 : 0);
  }

  async function onQuickResolve(log) {
    const target = quickResolveTarget.value[log.name];
    if (!target || !target.startsWith("/")) {
      toast.error('Target path "/" ile başlamalı');
      return;
    }
    try {
      await store.quickResolve404({ logName: log.name, targetPath: target });
      quickResolveTarget.value[log.name] = "";
      toast.success(`"${log.path}" → "${target}" redirect oluşturuldu`);
    } catch (e) {
      toast.error(e.message || "Redirect oluşturulamadı");
    }
  }
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900">
          404 Logları ({{ total404Hits }} toplam hit)
        </h1>
        <p class="text-xs text-gray-400">En sık 404 alan path'leri redirect ekleyerek çöz</p>
      </div>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-1 text-xs text-gray-600">
          <input v-model="showResolved" type="checkbox" class="w-3 h-3" @change="refreshList" />
          Çözülmüşleri göster
        </label>
        <router-link to="/seo/redirects" class="hdr-btn-outlined"> Redirects'e Git </router-link>
      </div>
    </div>

    <div v-if="loading && logs404.length === 0" class="text-center py-8 text-gray-500">
      Yükleniyor...
    </div>

    <div
      v-if="logs404.length > 0"
      class="bg-white border border-gray-200 rounded-lg overflow-hidden"
    >
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr class="text-left">
            <th class="px-4 py-2 font-medium text-gray-700">Path</th>
            <th class="px-4 py-2 font-medium text-gray-700">Hits</th>
            <th class="px-4 py-2 font-medium text-gray-700">Son Görülme</th>
            <th class="px-4 py-2 font-medium text-gray-700">Referer</th>
            <th class="px-4 py-2 font-medium text-gray-700 w-1/3">Redirect Ekle</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in logs404"
            :key="log.name"
            class="border-b border-gray-100 hover:bg-gray-50"
          >
            <td class="px-4 py-2 font-mono text-xs text-gray-700 truncate max-w-xs">
              {{ log.path }}
            </td>
            <td class="px-4 py-2 text-xs text-gray-600">
              <span class="font-bold">{{ log.hit_count }}</span>
            </td>
            <td class="px-4 py-2 text-xs text-gray-600">
              {{ log.last_hit_at }}
            </td>
            <td class="px-4 py-2 text-xs text-gray-500 truncate max-w-xs">
              {{ log.last_referer || "—" }}
            </td>
            <td class="px-4 py-2">
              <div v-if="!log.resolved" class="flex gap-1">
                <input
                  v-model="quickResolveTarget[log.name]"
                  type="text"
                  class="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                  placeholder="/yeni-target"
                />
                <button
                  type="button"
                  class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  :disabled="saving || !quickResolveTarget[log.name]"
                  @click="onQuickResolve(log)"
                >
                  + Redirect
                </button>
              </div>
              <span v-else class="text-xs text-green-600">✓ Çözüldü</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="text-center py-12 text-gray-500">
      Henüz 404 log kaydı yok. 🎉
    </div>
  </div>
</template>
