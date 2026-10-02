<script setup>
  // Aktarım satırı — onaylı yüzen tepsi satırının (C · Yüzen tepsi) aynısı:
  // küçük resim + faz katmanı · ad + "<etiket> · bilgi" · ince çubuk · eylemler.
  // Ayrıntı (Güvenlik kontrolü / Hazırlama) satırın kendi açılır düğmesinin
  // arkasında, varsayılan kapalı. Sınıflar ve stil `upload-row.scss` +
  // `MediaPhaseThumb` ile tepsiyle ORTAK — iki yüzey birbirinden kayamaz.
  import { computed, ref, useId } from "vue";
  import { useI18n } from "vue-i18n";
  import MediaPhaseThumb from "./MediaPhaseThumb.vue";
  import { formatBytes } from "@/utils/mediaFormat";
  import { byteReduction } from "@/lib/media/status.js";
  import { hasShimmer, rowTone } from "@/lib/media/uploadTray.js";
  const props = defineProps({
    name: { type: String, required: true },
    kind: { type: String, default: "document" },
    bytes: { type: Number, default: 0 },
    originalBytes: { type: Number, default: 0 },
    phase: { type: String, default: "uploaded" },
    progress: { type: Number, default: null },
    error: { type: String, default: "" },
    facts: { type: Object, default: null },
    /** Yerel önizleme (yükleyici kuyruğu `previewUrl`). */
    previewUrl: { type: String, default: "" },
    /** Kütüphane kaydı (`fileUrl`, `renditions`…) — gerçek küçük resim için. */
    media: { type: Object, default: null },
  });
  const { t } = useI18n();
  const open = ref(false);
  const id = `media-transfer-${useId()}`;
  const reduction = computed(() => byteReduction(props.originalBytes, props.bytes));
  const critical = computed(() =>
    ["blocked", "scanFailed", "processingFailed", "review"].includes(props.phase)
  );
  const percent = computed(() =>
    props.progress === null ? null : Math.max(0, Math.min(100, Math.round(props.progress)))
  );
  const tone = computed(() => rowTone(props.phase));
  const shimmer = computed(() => props.phase !== "uploading" && hasShimmer(props.phase, null));
  const reason = computed(
    () => props.error || (critical.value ? t(`mediaFlow.hint.${props.phase}`) : "")
  );
  const sizeText = computed(() => {
    if (reduction.value !== null && props.kind !== "document")
      return `${formatBytes(props.originalBytes)} → ${formatBytes(props.bytes)} · ${t("mediaFlow.saved", { percent: reduction.value })}`;
    return props.bytes > 0 ? formatBytes(props.bytes) : "";
  });
  // İkinci satır tepsiyle aynı kural: sebep varsa sebep, yoksa boyut.
  const metaText = computed(() => reason.value || sizeText.value);
  // Hazırlama satırı sunucunun kanıtını söyler: "Yüklendi" bir hazırlama sonucu değildir.
  const preparationText = computed(() => {
    if (props.phase === "ready") return t("mediaFlow.phase.ready");
    if (["processing", "preparing"].includes(props.phase)) return t("mediaFlow.phase.processing");
    if (props.phase === "processingFailed") return t("mediaFlow.phase.processingFailed");
    return t("mediaFlow.unknown");
  });
  const securityText = computed(() =>
    props.facts?.scan_status
      ? t(`media.scanStatus.${props.facts.scan_status}`)
      : t("mediaFlow.unknown")
  );
</script>
<template>
  <li class="media-transfer utray-row" :data-phase="phase" :data-tone="tone">
    <span class="media-transfer__announce" role="status" aria-live="polite" aria-atomic="true">{{
      t(`mediaFlow.phase.${phase}`)
    }}</span>
    <MediaPhaseThumb
      :phase="phase"
      :progress="percent"
      :kind="kind"
      :preview-url="previewUrl"
      :media="media"
    />
    <div class="utray-row__body">
      <button
        type="button"
        class="utray-row__info media-transfer__toggle"
        :aria-expanded="open"
        :aria-controls="`${id}-detail`"
        :title="name"
        @click="open = !open"
      >
        <span :id="`${id}-name`" class="utray-row__name">{{ name }}</span>
        <span class="utray-row__meta"
          ><strong class="utray-row__label">{{ t(`mediaFlow.phase.${phase}`) }}</strong
          ><template v-if="metaText"> · {{ metaText }}</template
          ><span v-if="phase === 'uploading' && percent !== null" aria-hidden="true">
            · {{ t("mediaFlow.tray.percent", { percent }) }}</span
          ></span
        >
      </button>
      <div
        v-if="phase === 'uploading'"
        class="utray-row__bar"
        :class="{ 'utray-row__bar--indeterminate': percent === null }"
        role="progressbar"
        :aria-labelledby="`${id}-name`"
        :aria-valuenow="percent ?? undefined"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span :style="percent === null ? undefined : { transform: `scaleX(${percent / 100})` }" />
      </div>
      <span
        v-else-if="shimmer"
        class="utray-row__bar utray-row__bar--indeterminate"
        aria-hidden="true"
        ><span
      /></span>
      <div v-if="$slots.notes" class="media-transfer__notes"><slot name="notes" /></div>
      <div v-show="open" :id="`${id}-detail`" class="utray-row__details media-transfer__details">
        <p v-if="reason" class="utray-row__reason">{{ reason }}</p>
        <p v-if="['uploaded', 'unverified'].includes(phase)" class="media-transfer__note">
          {{ t(`mediaFlow.hint.${phase}`) }}
        </p>
        <dl v-if="facts || sizeText" class="utray-row__facts media-transfer__facts">
          <template v-if="sizeText">
            <dt>{{ t("mediaFlow.bytes") }}</dt>
            <dd>{{ sizeText }}</dd>
          </template>
          <template v-if="facts">
            <dt>{{ t("mediaFlow.security") }}</dt>
            <dd>{{ securityText }}</dd>
            <template v-if="kind === 'image' || kind === 'video'">
              <dt>{{ t("mediaFlow.preparation") }}</dt>
              <dd>{{ preparationText }}</dd>
            </template>
          </template>
        </dl>
        <slot name="details" />
      </div>
    </div>
    <div v-if="$slots.actions" class="utray-row__actions media-transfer__actions">
      <slot name="actions" />
    </div>
    <!-- Sebep görünür satırda (kısaltılmış) ve ayrıntıda tam; canlı bölge ayrı ki
         kapalı ayrıntıdan da duyurulsun. -->
    <p v-if="error || critical" class="media-transfer__reason" :role="error ? 'alert' : 'status'">
      {{ reason }}
    </p>
  </li>
</template>
<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  @use "@/assets/scss/upload-row" as row;

  @include row.row;

  .media-transfer {
    position: relative;
    min-width: 0;
    list-style: none;
    container-type: inline-size;
  }
  .media-transfer__announce,
  .media-transfer__reason {
    @include media.sr-only;
    margin: 0;
  }
  .media-transfer__notes {
    font-size: 13px;
    line-height: 18px;
    overflow-wrap: anywhere;
    :deep(p) {
      margin: 0 0 6px;
    }
  }
  .media-transfer__note {
    color: $l-text-700;
    @include dark {
      color: $d-text;
    }
  }
  .media-transfer__actions {
    flex-wrap: wrap;
    justify-content: flex-end;
    &:empty {
      display: none;
    }
  }
  // Çağıranın slot düğmeleri (`media-transfer__action`) tepsi düğmesinin aynısı.
  .media-transfer :deep(.media-transfer__action) {
    @include row.act;
  }
  // Dar kapta (çekmece, telefon) eylemler adın altına iner; satır metni kısalmaz.
  @container (max-width: 400px) {
    .media-transfer__actions {
      grid-column: 2 / -1;
      justify-content: flex-start;
    }
  }
</style>
