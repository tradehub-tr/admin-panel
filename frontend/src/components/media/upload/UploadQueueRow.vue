<template>
  <li class="up-row" :class="`up-row--${item.status}`">
    <div class="up-row__main">
      <AppIcon :name="statusIcon" :size="18" class="up-row__icon" />

      <div class="up-row__body">
        <p class="up-row__name" :title="item.name">{{ item.name }}</p>

        <div
          v-if="showBar"
          class="up-row__bar"
          role="progressbar"
          :aria-valuenow="Math.round(item.percent)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="
            t('media.uploader.progressAria', { name: item.name }, '{name} yükleme ilerlemesi')
          "
        >
          <span class="up-row__fill" :style="{ width: `${item.percent}%` }" />
        </div>

        <p class="up-row__meta">
          <span>{{ formatBytes(item.size) }}</span>
          <span v-if="item.compressedFrom" class="up-row__badge">
            {{ t("media.uploader.compressed", { from: formatBytes(item.compressedFrom) }) }}
          </span>
          <!-- Devam edilen yükleme AÇIKÇA söyleniyor: kullanıcı %60'tan
               başlayan bir çubuğu hata sanmasın. -->
          <span v-if="item.resumed" class="up-row__badge up-row__badge--info">
            {{ t("media.uploader.resumed") }}
          </span>
          <span v-else-if="item.resumable && isPending" class="up-row__badge up-row__badge--info">
            {{ t("media.uploader.resumable") }}
          </span>
          <span v-if="etaText" class="up-row__eta">{{ etaText }}</span>
          <span class="up-row__status">{{ t(`media.uploader.status.${item.status}`) }}</span>
        </p>

        <!-- T-042: kopya uyarısı — ENGEL değil. Satır kullanıcı kararını
             bekliyor; "yine de yükle" düğmesi eylemler sütununda. -->
        <p v-if="item.duplicate" class="up-row__dup">
          {{
            t(
              "media.uploader.duplicateLine",
              { name: item.duplicate.file_name || item.duplicate.file_url },
              "Bu dosya kütüphanenizde: {name}"
            )
          }}
        </p>

        <p v-if="item.error" class="up-row__error">{{ errorText }}</p>
      </div>

      <span v-if="showBar" class="up-row__pct">{{ Math.round(item.percent) }}%</span>

      <div class="up-row__actions">
        <button
          v-if="hasReport"
          type="button"
          class="up-row__btn"
          :aria-expanded="open ? 'true' : 'false'"
          @click="open = !open"
        >
          <AppIcon :name="open ? 'chevron-up' : 'chevron-down'" :size="14" />
          {{ t("media.uploader.details", { n: item.findings.length }) }}
        </button>
        <button v-if="canRetry" type="button" class="up-row__btn" @click="emit('retry', item.id)">
          <AppIcon name="refresh-cw" :size="14" />
          {{ t("media.uploader.retry") }}
        </button>
        <button
          v-if="isDuplicate"
          type="button"
          class="up-row__btn"
          @click="emit('proceed', item.id)"
        >
          <AppIcon name="upload-cloud" :size="14" />
          {{ t("media.uploader.uploadAnyway", {}, "Yine de yükle") }}
        </button>
        <button v-if="isBusy" type="button" class="up-row__btn" @click="emit('abort', item.id)">
          <AppIcon name="x" :size="14" />
          {{ t("media.uploader.cancel") }}
        </button>
        <button
          type="button"
          class="up-row__btn"
          :aria-label="t('media.uploader.removeAria', { name: item.name }, '{name} kaldır')"
          @click="emit('remove', item.id)"
        >
          <AppIcon name="trash-2" :size="14" />
        </button>
      </div>
    </div>

    <PreflightPanel
      v-if="open"
      class="up-row__pf"
      :findings="item.findings"
      :measure="item.measure"
      :slot-policy="slotPolicy"
    />
  </li>
</template>

<script setup>
  /**
   * Kuyruktaki tek satır.
   *
   * **Engellenen satır SİLİNMİYOR.** Politikaya takılan dosya listede kalıyor,
   * sebebi ve düzeltme yolu bir tık uzakta. Sessizce atmak, kullanıcının aynı
   * dosyayı tekrar tekrar bırakmasına yol açardı.
   *
   * **Ayrıntı paneli varsayılan olarak KAPALI, engellilerde AÇIK.** On dosyalık
   * bir kuyrukta on panel açık olsaydı ekran okunmazdı; ama yüklenemeyecek bir
   * dosyanın sebebini görmek için tıklamak gerekmemeli.
   */
  import { computed, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import PreflightPanel from "./PreflightPanel.vue";
  import { ITEM_STATUS } from "@/composables/useMediaUpload.js";
  import { formatBytes } from "@/utils/mediaFormat";

  const props = defineProps({
    item: { type: Object, required: true },
    slotPolicy: { type: Object, default: null },
  });
  const emit = defineEmits(["retry", "abort", "remove", "proceed"]);

  const { t, te } = useI18n();

  const open = ref(props.item.status === ITEM_STATUS.BLOCKED);

  // Engellenen satırın sebebi TIKLAMASIZ görünmeli (yukarıdaki başlık ilkesi).
  // Mount anındaki değer yetmiyor: satır kuyruğa QUEUED girer, engel ölçüm
  // BİTİNCE gelir — canlı panelde panel hep kapalı kalıyordu (W5'te ölçüldü).
  watch(
    () => props.item.status,
    (s) => {
      if (s === ITEM_STATUS.BLOCKED) open.value = true;
    }
  );

  const hasReport = computed(() => props.item.findings.length > 0 || Boolean(props.item.measure));

  const isBusy = computed(
    () => props.item.status === ITEM_STATUS.UPLOADING || props.item.status === ITEM_STATUS.PREPARING
  );

  const isPending = computed(
    () => props.item.status === ITEM_STATUS.READY || props.item.status === ITEM_STATUS.QUEUED
  );

  // T-042: satır kopya kararında bekliyor — "yine de yükle" görünür.
  const isDuplicate = computed(() => props.item.status === ITEM_STATUS.DUPLICATE);

  const showBar = computed(() => isBusy.value || props.item.status === ITEM_STATUS.DONE);

  // Sunucunun reddettiği bir dosyayı yeniden denemek aynı cevabı getirir;
  // düğme yalnız gerçekten denenebilir hatalarda çıkıyor.
  const canRetry = computed(
    () =>
      (props.item.status === ITEM_STATUS.FAILED && props.item.retryable !== false) ||
      props.item.status === ITEM_STATUS.ABORTED
  );

  const statusIcon = computed(() => {
    switch (props.item.status) {
      case ITEM_STATUS.DONE:
        return "circle-check";
      case ITEM_STATUS.BLOCKED:
        return "circle-x";
      case ITEM_STATUS.FAILED:
        return "triangle-alert";
      case ITEM_STATUS.CHECKING:
        return "search";
      case ITEM_STATUS.DUPLICATE:
        return "copy";
      default:
        return "upload-cloud";
    }
  });

  const etaText = computed(() => {
    const s = props.item.etaSeconds;
    if (!isBusy.value || s == null) return "";
    if (s < 60) return t("media.uploader.etaSeconds", { n: s });
    return t("media.uploader.etaMinutes", { n: Math.ceil(s / 60) });
  });

  const errorText = computed(() => {
    const kod = props.item.errorCode;
    const anahtar = kod ? `media.upload.err.${kod}` : "";
    if (anahtar && te(anahtar)) return t(anahtar);
    return props.item.error || t("media.uploader.errorGeneric");
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;

  .up-row {
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
    padding: media.$s-3;
    @include media.divider;
  }

  .up-row__main {
    display: flex;
    align-items: flex-start;
    gap: media.$s-3;
  }

  .up-row__icon {
    flex: none;
    margin-top: 2px;
  }

  .up-row--blocked .up-row__icon,
  .up-row--failed .up-row__icon {
    color: $c-error;
  }

  .up-row--done .up-row__icon {
    color: $c-success;
  }

  .up-row__body {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
  }

  .up-row__name {
    margin: 0;
    @include media.text("body");
    @include media.truncate;
  }

  .up-row__bar {
    height: 4px;
    border-radius: media.$r-pill;
    background: $l-bg-subtle;
    overflow: hidden;
  }

  .up-row__fill {
    display: block;
    height: 100%;
    background: $brand;
    transition: width 0.2s ease;
  }

  .up-row__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: media.$s-2;
    margin: 0;
    @include media.text("xs");
    @include media.muted;
  }

  .up-row__badge {
    @include media.chip("neutral");
  }

  .up-row__badge--info {
    @include media.chip("info");
  }

  .up-row__eta,
  .up-row__status {
    @include media.numeric;
  }

  .up-row__error {
    margin: 0;
    color: $c-error;
    @include media.text("xs");
  }

  .up-row__dup {
    margin: 0;
    color: $c-warning;
    @include media.text("xs");
  }

  .up-row--duplicate .up-row__icon {
    color: $c-warning;
  }

  .up-row__pct {
    flex: none;
    @include media.text("xs");
    @include media.numeric;
  }

  .up-row__actions {
    flex: none;
    display: flex;
    align-items: center;
    gap: media.$s-1;
  }

  .up-row__btn {
    display: inline-flex;
    align-items: center;
    gap: media.$s-05;
    @include media.button("ghost");
    @include media.text("xs");
  }

  .up-row__pf {
    margin-left: calc(18px + #{media.$s-3});
  }
</style>
