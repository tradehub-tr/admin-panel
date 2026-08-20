<template>
  <div>
    <ul v-if="rows.length" class="divide-y divide-gray-100 dark:divide-gray-800">
      <li v-for="doc in rows" :key="doc.url" class="flex items-center gap-3 py-3">
        <div class="min-w-0 grow">
          <p class="truncate text-sm font-medium">{{ doc.label }}</p>
          <p class="text-xs text-gray-600">{{ doc.type }} · {{ doc.uploaded_at }}</p>
        </div>
        <a
          v-if="doc.safeUrl"
          :href="doc.safeUrl"
          class="hdr-btn-outlined"
          target="_blank"
          rel="noopener"
        >
          {{ t("logistics.document.open") }}
        </a>
      </li>
    </ul>
    <p v-else class="py-6 text-center text-sm text-gray-600">
      {{ t("logistics.document.empty") }}
    </p>

    <button v-if="canUpload" type="button" class="hdr-btn-outlined mt-4" @click="$emit('upload')">
      {{ t("logistics.document.upload") }}
    </button>
  </div>
</template>

<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  import { safeExternalUrl } from "@/utils/sanitize";

  /**
   * **B5 · Belgeler sekmesi** (TUR-107) — fiş, irsaliye, ek belgeler.
   *
   * `doc.url` backend'de serbest metin (`Data`) — şema doğrulaması YOK.
   * `javascript:` yazan bir kayıt, belgeyi açan yöneticinin oturumunda kod
   * çalıştırırdı; `safeExternalUrl` beyaz listeye uymayan URL'de bağlantıyı
   * hiç çizmiyor.
   */
  const props = defineProps({
    documents: { type: Array, default: () => [] },
    // `can` BİLEREK YOK — bu sekme yetki bayrağı okumuyor (bkz. canUpload).
    /**
     * Yükleme butonu AYRI bir bayrakta, `can.write`te değil.
     *
     * ÖLÜ BUTON YASAĞI: `upload` emit'ini dinleyen kimse yok ve belge yükleme
     * ucu henüz yazılmadı. `can.write` ile çizilseydi yetkili her kullanıcı
     * tıklar, hiçbir şey olmaz, hata da görmezdi. Uç geldiğinde kayıt
     * defterinde tek satır (`canUpload: true` + handler) yeter.
     */
    canUpload: { type: Boolean, default: false },
  });
  defineEmits(["upload"]);
  const { t } = useI18n();

  /**
   * Şema denetimi TEK KEZ, template'te değil burada.
   *
   * `v-if="safeExternalUrl(x)" :href="safeExternalUrl(x)"` iki ayrı çağrıydı.
   * Bugün fonksiyon saf olduğu için ikisi aynı sonucu veriyor, ama koruma bir
   * gün duruma bağlanırsa (konfigürasyondan gelen origin listesi gibi)
   * "kontrol ettiğim" ile "bağladığım" değer ayrışabilir — TOCTOU zemini.
   * Ayrıca `vue-reactivity.md` §2: template'te method çağırmak her render'da
   * yeniden koşar, liste computed ile ön-hesaplanır.
   */
  const rows = computed(() =>
    props.documents.map((doc) => ({ ...doc, safeUrl: safeExternalUrl(doc.url) }))
  );
</script>
