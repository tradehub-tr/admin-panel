<template>
  <section v-if="uploads.length" class="upload-queue" :aria-label="t('media.upload.queueTitle')">
    <header class="upload-queue__head">
      <h2 class="upload-queue__title">
        {{ t("media.upload.queueTitle") }}
        <span class="upload-queue__count">{{ summary }}</span>
      </h2>
      <button type="button" class="upload-queue__clear" @click="emit('clear')">
        {{ t("media.upload.clearFinished") }}
      </button>
    </header>

    <ul class="upload-queue__list">
      <li v-for="up in uploads" :key="up.id" class="upload-row" :class="`upload-row--${up.status}`">
        <!-- Ön izleme: görselse küçük resim, değilse tür simgesi. On dosya
             birden atıldığında hangisinin ne olduğu addan değil resminden
             anlaşılsın. -->
        <img
          v-if="up.previewUrl"
          :src="up.previewUrl"
          class="upload-row__preview"
          alt=""
          @error="onPreviewError(up)"
        />
        <AppIcon v-else :name="iconForKind(up.kind)" :size="18" class="upload-row__icon" />

        <div class="upload-row__body">
          <p class="upload-row__name" :title="up.name">{{ up.name }}</p>

          <p v-if="up.status === 'error'" class="upload-row__error">
            {{ errorText(up) }}
          </p>
          <p v-else-if="up.status === 'retrying'" class="upload-row__retry">
            <AppIcon name="refresh-cw" :size="12" />
            {{ t("media.upload.retrying", { n: up.attempt, sec: countdown(up) }) }}
          </p>
          <p v-else-if="up.status === 'done'" class="upload-row__ok">
            {{ t("media.upload.done") }}
          </p>
          <div
            v-else
            class="upload-row__bar"
            role="progressbar"
            :aria-valuenow="up.progress"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span class="upload-row__fill" :style="{ width: `${up.progress}%` }" />
          </div>
        </div>

        <span v-if="up.status === 'uploading'" class="upload-row__pct">{{ up.progress }}%</span>
        <span class="upload-row__size">{{ formatBytes(up.bytes) }}</span>

        <div class="upload-row__actions">
          <button
            v-if="up.status === 'error'"
            type="button"
            class="upload-row__btn"
            @click="emit('retry', up.id)"
          >
            <AppIcon name="refresh-cw" :size="14" />
            {{ t("media.upload.retry") }}
          </button>
          <button
            v-if="up.status === 'uploading' || up.status === 'retrying'"
            type="button"
            class="upload-row__btn"
            @click="emit('cancel', up.id)"
          >
            <AppIcon name="x" :size="14" />
            {{ t("media.upload.cancel") }}
          </button>
          <AppIcon
            v-if="up.status === 'done'"
            name="circle-check"
            :size="18"
            class="upload-row__tick"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
  import { computed, onUnmounted, ref } from "vue";
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { formatBytes, iconForKind } from "@/utils/mediaFormat";

  const props = defineProps({
    uploads: { type: Array, required: true },
  });
  const emit = defineEmits(["retry", "cancel", "clear"]);

  const { t, te } = useI18n();

  const summary = computed(() => {
    const done = props.uploads.filter((u) => u.status === "done").length;
    const failed = props.uploads.filter((u) => u.status === "error").length;
    return t("media.upload.summary", { done, failed, total: props.uploads.length });
  });

  /**
   * Hata metni — sunucunun KODUNA göre (TUR-123).
   *
   * Eskiden her hata için tek bir metin yazılıyordu ("boyut sınırı"), sebebi ne
   * olursa olsun. Kullanıcı yanlış türde bir dosya seçtiğinde de "çok büyük"
   * yazısını görüyor ve neyi düzelteceğini bilemiyordu.
   *
   * Çevirisi olmayan bir kod gelirse sunucunun kendi mesajına düşülüyor —
   * sunucu yeni bir kod eklediğinde ekran boş kalmasın.
   */
  function errorText(up) {
    const anahtar = up.errorCode ? `media.upload.err.${up.errorCode}` : "";
    if (anahtar && te(anahtar)) return t(anahtar, up.errorParams || {});
    return up.error || t("media.upload.errorGeneric");
  }

  // Geri sayım için saniyede bir tetikleyici. Kalan süreyi `Date.now()` ile
  // hesaplamak tek başına yetmiyor: hesaplanan değer reaktif bir kaynağa
  // bağlı olmadığı için ekran kendiliğinden yenilenmezdi.
  const tick = ref(0);
  const sayac = setInterval(() => (tick.value = Date.now()), 1000);
  onUnmounted(() => clearInterval(sayac));

  function countdown(up) {
    void tick.value;
    return Math.max(0, Math.ceil(((up.retryAt || 0) - Date.now()) / 1000));
  }

  /**
   * Ön izleme çizilemedi — tür simgesine düş.
   *
   * Uzantısı görsel olup içeriği bozuk dosyalarda oluyor. Kırık resim
   * simgesi göstermektense dosya türünü göstermek daha bilgilendirici;
   * zaten o dosya birazdan "içerik türüyle uyuşmuyor" ile reddedilecek.
   */
  function onPreviewError(up) {
    up.previewUrl = "";
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .upload-queue {
    margin-bottom: media.$s-4;
    overflow: hidden;
    @include media.surface;
  }

  .upload-queue__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-3;
    padding: media.$s-3 media.$s-4;
    @include media.divider;
  }

  .upload-queue__title {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    @include media.text;
    @include media.heading;
  }

  .upload-queue__count {
    font-weight: 500;
    @include media.muted;
    @include media.numeric;
  }

  .upload-queue__clear {
    @include media.button("ghost");
    @include media.focus-ring;

    padding-inline: media.$s-1;
  }

  .upload-queue__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .upload-row {
    display: flex;
    align-items: center;
    gap: media.$s-3;
    padding: media.$s-3 media.$s-4;
    @include media.divider;

    &:last-child {
      border-bottom: 0;
    }

    // Dar ekranda ad + boyut + "Yeniden dene"/"İptal" tek satıra sığmıyor:
    // butonlar alt satıra, sağa yaslı geçsin.
    @media (max-width: media.$m-bp-sm) {
      flex-wrap: wrap;

      .upload-row__actions {
        flex: 1 1 100%;
        justify-content: flex-end;
      }
    }
  }

  .upload-row__icon {
    flex-shrink: 0;
    @include media.muted;
  }

  // Simgenin kapladığı yerle aynı hizada kalsın: satır yüksekliği dosya
  // görselli mi değil mi diye zıplamamalı.
  .upload-row__preview {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    border-radius: media.$r-sm;
    object-fit: cover;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-hover;
    }
  }

  .upload-row__body {
    flex: 1;
    min-width: 0;
  }

  .upload-row__name {
    margin: 0 0 media.$s-1;
    @include media.text("sm");
    @include media.heading;
    @include media.truncate;
  }

  .upload-row__bar {
    height: 0.375rem;
    border-radius: media.$r-pill;
    overflow: hidden;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .upload-row__fill {
    display: block;
    height: 100%;
    background: $brand;
    transition: width $t-base;
  }

  .upload-row__error {
    margin: 0;
    @include media.text;
    color: $c-error;
  }

  .upload-row__ok {
    margin: 0;
    @include media.text;
    color: $c-success;
  }

  .upload-row__retry {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin: 0;
    @include media.text;
    color: $c-warning;
  }

  .upload-row__size {
    flex-shrink: 0;
    @include media.text;
    @include media.muted;
    @include media.numeric;
  }

  // Yüzde çubuğun yanında ayrı duruyor: çubuk uzunluğu 5 ile 15 arasını göz
  // kararı ayırt ettirmiyor, sayı ayırt ettiriyor.
  .upload-row__pct {
    flex-shrink: 0;
    min-width: 2.6rem;
    text-align: right;
    @include media.text;
    @include media.numeric;
    color: $brand;
  }

  .upload-row__actions {
    display: flex;
    align-items: center;
    gap: media.$s-2;
    flex-shrink: 0;
  }

  .upload-row__btn {
    @include media.button;
    @include media.focus-ring;

    padding: 0 media.$s-3;
  }

  .upload-row__tick {
    color: $c-success;
  }
</style>
