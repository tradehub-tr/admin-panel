<template>
  <section class="up" :aria-label="t('media.uploader.title', {}, 'Medya Yükle')">
    <header v-if="showHeader" class="up__head">
      <!-- Sözlükte olmayan anahtarlar `t(k, {}, "TR")` varsayılanıyla —
           locale dosyaları bu görevin dışı; eksikler raporda listelendi. -->
      <h2 class="up__title">{{ t("media.uploader.title", {}, "Medya Yükle") }}</h2>

      <!-- Slot seçimi ekranın işi değil, çağıranın işi; ama seçilmişse hangi
           kuralların uygulandığı görünmeli. Kullanıcı "neden reddedildim"
           sorusunu sormadan önce hangi kapıdan geçtiğini bilmeli. -->
      <p v-if="activeSlot" class="up__slot">
        {{ t("media.uploader.slotLine", { slot: activeSlot.title }) }}
      </p>
      <p v-else class="up__slot">{{ t("media.uploader.noSlot") }}</p>
    </header>

    <UploadDropzone
      :multiple="multiple"
      :accept="acceptAttr"
      :disabled="disabled"
      :hint="dropHint"
      :listen-paste="listenPaste"
      @files="onFiles"
    />

    <div v-if="items.length" class="up__queue">
      <div class="up__bar-row">
        <div
          class="up__bar"
          role="progressbar"
          :aria-valuenow="overallPercent"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="t('media.uploader.overallAria', {}, 'Toplam yükleme ilerlemesi')"
        >
          <span class="up__fill" :style="{ width: `${overallPercent}%` }" />
        </div>
        <span class="up__summary">
          {{
            t(
              "media.uploader.summary",
              {
                done: stats.done,
                blocked: stats.blocked,
                failed: stats.failed,
                total: stats.total,
              },
              "{done} yüklendi · {blocked} engellendi · {failed} hata · {total} dosya"
            )
          }}
        </span>
      </div>

      <!-- Ölçümün nerede koştuğu gizlenmiyor: işçi kurulamadıysa arayüz
           büyük dosyalarda takılabilir ve kullanıcı bunun sebebini
           bilebilmeli. -->
      <p v-if="workerActive === false" class="up__note">
        {{ t("media.uploader.workerFallback") }}
      </p>

      <ul class="up__list">
        <UploadQueueRow
          v-for="item in items"
          :key="item.id"
          :item="item"
          :slot-policy="activeSlot"
          @retry="retry"
          @abort="abort"
          @remove="remove"
          @proceed="proceed"
        />
      </ul>

      <footer class="up__foot">
        <button type="button" class="up__btn" @click="clearFinished">
          {{ t("media.uploader.clearFinished", {}, "Bitenleri temizle") }}
        </button>
        <button v-if="stats.uploading" type="button" class="up__btn" @click="abortAll">
          {{ t("media.uploader.cancelAll") }}
        </button>
      </footer>
    </div>
  </section>
</template>

<script setup>
  /**
   * Medya yükleyici — bırakma alanı + ön kontrol paneli + devam eden kuyruk.
   *
   * T-081 (oturum + devam) ve T-091 (Uppy + tus yükleyici, ön kontrol paneli)
   * bu bileşende buluşuyor.
   *
   * **Uppy ve tus KURULMADI — gerekçesi.** Sunucuda tus yok
   * (`docs/api/openapi-http.yaml`, 87 uç); `tradehub_core/media/chunked.py`
   * kendi parçalı protokolünü tanımlıyor. `tus-js-client` konuşacağı bir uç
   * olmadan ölü bağımlılık olurdu. Uppy ise kendi kuyruk/durum modelini
   * getiriyor; bu ekranda kuyruk zaten `useMediaUpload` içinde ve gerçek
   * uçlara bağlı — iki kuyruk modeli arasında köprü kurmak, tek bir kuyruk
   * yazmaktan hem büyük hem kırılgan olurdu. Bırakma/klasör/yapıştırma,
   * ilerleme, devam ve yeniden deneme burada ayrıca yazıldı.
   *
   * **Rota ve menü bağı YOK.** Bileşen kullanıma hazır bırakılıyor; bir
   * görünüme yerleştirmek ve menüye bağlamak çağıranın işi.
   *
   * Kullanım:
   *
   *     <MediaUploader slot-key="product.image" @uploaded="onUploaded" />
   */
  import { computed, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import UploadDropzone from "./UploadDropzone.vue";
  import UploadQueueRow from "./UploadQueueRow.vue";
  import { ITEM_STATUS, useMediaUpload } from "@/composables/useMediaUpload.js";
  import { getSlotPolicy } from "@/lib/media/upload/preflight.js";

  const props = defineProps({
    /** `product.image`, `seller.logo` … Boş bırakılırsa yalnız sunucunun genel politikası uygulanır. */
    slotKey: { type: String, default: "" },
    multiple: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    showHeader: { type: Boolean, default: true },
    listenPaste: { type: Boolean, default: true },
    /** Kuyruğa girer girmez başlasın mı. */
    autoStart: { type: Boolean, default: true },
    /** Cihazda küçültme denensin mi (başarısızsa sunucuya devrediliyor). */
    compress: { type: Boolean, default: true },
  });

  const emit = defineEmits(["uploaded", "blocked", "queue-empty"]);
  const { t } = useI18n();

  const activeSlot = computed(() => getSlotPolicy(props.slotKey));

  // Composable REF'ler döndürüyor; ref destructure etmek reaktiviteyi
  // kırmaz (kırılan `reactive()` nesnesini parçalamaktır) ve şablonda
  // otomatik açılım sağlar.
  const {
    items,
    stats,
    overallPercent,
    workerActive,
    add,
    retry,
    proceed,
    abort,
    remove,
    abortAll,
    clearFinished,
  } = useMediaUpload({
    slotKey: () => props.slotKey,
    autoStart: props.autoStart,
    compress: props.compress,
  });

  /**
   * `accept` niteliği — dosya seçicisini daraltmak için.
   *
   * Bu bir GÜVENLİK kapısı DEĞİL: kullanıcı seçicide "tüm dosyalar"a geçip
   * ne isterse seçebilir. Sadece doğru dosyayı bulmayı kolaylaştırıyor;
   * gerçek kapı ön kontrol ve sunucu politikası.
   */
  const acceptAttr = computed(() => activeSlot.value?.accept.extensions.join(",") || "");

  const dropHint = computed(() => {
    const s = activeSlot.value;
    if (!s) return "";
    return t("media.uploader.slotHint", {
      formats: s.accept.extensions.join(" · "),
      limit: Math.round((s.accept.maxBytes || 0) / 1048576),
    });
  });

  function onFiles(files) {
    add(files);
  }

  // Biten ve engellenen satırlar çağırana bildiriliyor. Kuyruğun kendisini
  // dışarı vermek yerine olay yaymak, çağıranın kuyruğun iç durumuna
  // bağlanmasını engelliyor — kuyruk değişse de sözleşme sabit kalır.
  const bildirilen = new Set();
  watch(
    items,
    (liste) => {
      for (const it of liste) {
        if (bildirilen.has(it.id)) continue;
        if (it.status === ITEM_STATUS.DONE && it.result) {
          bildirilen.add(it.id);
          emit("uploaded", it.result);
        } else if (it.status === ITEM_STATUS.BLOCKED) {
          bildirilen.add(it.id);
          emit("blocked", { name: it.name, findings: it.findings });
        }
      }
      if (!liste.length) emit("queue-empty");
    },
    { deep: true }
  );

  defineExpose({ items, stats, add, abortAll, clearFinished });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .up {
    display: flex;
    flex-direction: column;
    gap: media.$s-3;
  }

  .up__head {
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
  }

  .up__title {
    margin: 0;
    @include media.text("body");
    @include media.heading;
  }

  .up__slot,
  .up__note {
    margin: 0;
    @include media.text("xs");
    @include media.muted;
  }

  .up__queue {
    overflow: hidden;
    @include media.surface;
  }

  .up__bar-row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-3;
    @include media.divider;
  }

  .up__bar {
    flex: 1 1 auto;
    height: 6px;
    border-radius: media.$r-pill;
    background: $l-bg-subtle;
    overflow: hidden;
  }

  .up__fill {
    display: block;
    height: 100%;
    background: $brand;
    transition: width 0.2s ease;
  }

  .up__summary {
    flex: none;
    @include media.text("xs");
    @include media.numeric;
    @include media.muted;
  }

  .up__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .up__foot {
    display: flex;
    justify-content: flex-end;
    gap: media.$s-2;
    padding: media.$s-3;
  }

  .up__btn {
    @include media.button("ghost");
    @include media.text("xs");
  }
</style>
