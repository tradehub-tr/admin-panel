<script setup>
  // Yükleme tepsisinin kabuktaki (AppLayout) sahibi. İki kaynağı tek listede
  // gösterir: medya store'unun `uploads` kuyruğu (sürükle-bırak, toplu çubuk)
  // ve "Medya Yükle" modalının ortak kuyruğu (`useSharedMediaUpload`). İkisi de
  // sayfa/modal ömründen bağımsız; tepsi kabukta durduğu için kullanıcı başka
  // sayfaya geçse de ilerlemeyi görür. Satır biçimi ve eylem yönlendirmesi
  // `uploadTray.js`'te (tek uyarlayıcı).
  import { computed, onBeforeUnmount, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { useMediaStore } from "@/stores/media";
  import { useSharedMediaUpload } from "@/composables/useMediaUpload.js";
  import {
    UPLOADER_ACTIVE,
    isUploaderRow,
    mergeTrayUploads,
    uploaderItemId,
  } from "@/lib/media/uploadTray.js";
  import MediaUploadQueue from "./MediaUploadQueue.vue";

  const store = useMediaStore();
  const { uploads } = storeToRefs(store);
  const uploader = useSharedMediaUpload();

  const rows = computed(() => mergeTrayUploads(uploads.value, uploader.items.value));

  function onRetry(id) {
    if (isUploaderRow(id)) uploader.retry(uploaderItemId(id));
    else store.retryUpload(id);
  }
  function onCancel(id) {
    // Store'un iptali satırı kaldırıyor; yükleyicide de aynı sonuç: `remove`
    // süren aktarımı önce keser (parçalı oturum sunucuda da temizlenir).
    if (isUploaderRow(id)) uploader.remove(uploaderItemId(id));
    else store.cancelUpload(id);
  }
  function onClear() {
    store.clearFinishedUploads();
    // Süren ve karar bekleyen (kopya uyarısı) satırlar kalır; gerisi temizlenir.
    for (const it of uploader.items.value.slice()) {
      if (!UPLOADER_ACTIVE.includes(it.status) && it.status !== "duplicate") uploader.remove(it.id);
    }
  }

  // Modal kapandıktan sonra biten yüklemeler de kütüphane listesini tazelesin.
  // Modal açıkken `uploaded` olayı aynı işi görüyor; `claimDone` ikisinden
  // yalnız birinin tazelemesini sağlar. Çok dosyada tek tazeleme (400 ms).
  let refreshTimer = null;
  watch(
    () => uploader.items.value.filter((i) => i.status === "done" && i.result).map((i) => i.id),
    (ids) => {
      if (!ids.filter((id) => uploader.claimDone(id)).length) return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => store.loadReal({ trashed: store.showArchived }), 400);
    }
  );
  onBeforeUnmount(() => clearTimeout(refreshTimer));
</script>
<template>
  <MediaUploadQueue
    floating
    ambient
    :uploads="rows"
    @retry="onRetry"
    @cancel="onCancel"
    @clear="onClear"
  />
</template>
