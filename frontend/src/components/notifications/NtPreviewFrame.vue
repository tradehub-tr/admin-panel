<script setup>
  /**
   * Kanal önizlemesi — gerçek CSS genişliğinde çizilir, alan darsa ölçeklenir.
   *
   * Çerçevenin içi alıcının göreceği iletiyi temsil eder; bu yüzden panel
   * temasından bağımsızdır (koyu temada da açık zeminli e-posta).
   * Bağlantılar tıklanmaz ve odak almaz (`href` kaldırılır).
   */
  import { computed, ref, toRef, watch } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { scaleLabel, usePreviewScale } from "@/composables/notifications/usePreviewScale";
  import { channelOf, langOf } from "@/constants/notificationTemplates";
  import { sanitizeHtml } from "@/utils/sanitize";

  import NtIssue from "./NtIssue.vue";
  import NtNote from "./NtNote.vue";

  const props = defineProps({
    /** `buildPreview()` çıktısı */
    preview: { type: Object, required: true },
    channel: { type: String, required: true },
    /** Çerçevenin gerçek genişliği (px) */
    width: { type: Number, required: true },
  });
  const emit = defineEmits(["fit"]);

  const stageRef = ref(null);
  const frameRef = ref(null);
  const { scale, height, fit } = usePreviewScale(stageRef, frameRef, toRef(props, "width"));

  const lang = computed(() => langOf(props.preview.lang) || langOf("tr"));
  const channelLabel = computed(() => channelOf(props.channel)?.label || "");
  const parts = computed(() => props.preview.parts || {});

  /**
   * E-posta gövdesi: şablon DOMPurify'dan geçti, değişken değerleri kaçışlandı
   * (`buildPreview`); burada son hâl bir kez daha temizlenir ve bağlantıların
   * `href`'i kaldırılır.
   */
  const bodyHtml = computed(() => {
    if (props.channel !== "email" || props.preview.status !== "ok") return "";
    const tpl = document.createElement("template");
    tpl.innerHTML = sanitizeHtml(parts.value.bodyHtml);
    tpl.content.querySelectorAll("a").forEach((a) => a.removeAttribute("href"));
    return tpl.innerHTML;
  });

  const missingIssue = computed(() => ({
    kind: "missing_event_data",
    severity: "info",
    channel: props.channel,
    lang: props.preview.lang,
    variable: props.preview.missingVariable,
  }));

  watch(
    [scale, () => props.width, () => props.preview.status],
    () => emit("fit", props.preview.status === "ok" ? scaleLabel(props.width, scale.value) : ""),
    { immediate: true }
  );
  watch(() => [props.preview, props.channel], fit, { flush: "post", deep: true });
</script>

<template>
  <div ref="stageRef" class="nt-pv-stage">
    <NtNote v-if="preview.status === 'empty'">
      <strong>Bu kanal için içerik yok.</strong><br />
      {{ channelLabel }} kanalında bu sürümde kayıtlı içerik bulunmuyor.
    </NtNote>
    <NtNote v-else-if="preview.status === 'missing-data'">
      <NtIssue :issue="missingIssue" />
    </NtNote>
    <div
      v-else
      class="nt-pv-scale"
      :style="{ width: `${Math.floor(width * scale)}px`, height: `${height}px` }"
    >
      <div
        ref="frameRef"
        class="nt-pv-frame"
        :style="{ width: `${width}px`, transform: scale < 1 ? `scale(${scale})` : 'none' }"
        :lang="lang.id"
        :dir="lang.dir"
        role="group"
        :aria-label="`${channelLabel} önizlemesi, ${lang.short}`"
      >
        <!-- v-html notu: aşağıdaki `*Html` alanları `utils/notificationTemplates/preview.js`
             → `expand()` çıktısıdır. Düz metin alanlarında şablon da değişken değerleri de
             kaçışlanır; e-posta gövdesi DOMPurify ile temizlenir (`bodyHtml`). Kaynak,
             yetkili yöneticinin yazdığı şablondur; yine de ham HTML hiçbir yerde basılmaz. -->
        <div v-if="channel === 'email'" class="nt-mail">
          <div class="nt-mail__meta">
            <span class="nt-mail__from">iStoc &lt;bildirim@istoc.example&gt;</span>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <strong v-if="parts.subjectHtml" v-html="parts.subjectHtml" />
            <em v-else class="nt-pv-empty">Konu boş</em>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="parts.preheaderHtml" />
          </div>
          <div class="nt-mail__brand">iStoc <i aria-hidden="true" /></div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="bodyHtml" class="nt-mail__body" v-html="bodyHtml" />
          <div v-else class="nt-mail__body"><em class="nt-pv-empty">Gövde boş</em></div>
          <div class="nt-mail__footer">{{ parts.footer }} · iStoc</div>
        </div>

        <div v-else-if="channel === 'inapp'" class="nt-inapp">
          <div class="nt-inapp__bar"><AppIcon name="bell" :size="18" /></div>
          <div class="nt-inapp__card">
            <div class="nt-inapp__head">{{ parts.heading }}</div>
            <div class="nt-inapp__item">
              <span class="nt-inapp__icon"><AppIcon name="bell" :size="16" /></span>
              <div class="nt-inapp__text">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <strong v-if="parts.titleHtml" v-html="parts.titleHtml" />
                <em v-else class="nt-pv-empty">Başlık boş</em>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <p v-if="parts.messageHtml" v-html="parts.messageHtml" />
                <p v-else><em class="nt-pv-empty">Mesaj boş</em></p>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span v-if="parts.actionHtml" class="nt-inapp__link" v-html="parts.actionHtml" />
                <span class="nt-inapp__time">{{ parts.time }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="channel === 'push'" class="nt-push">
          <div class="nt-push__clock">14:32</div>
          <div class="nt-push__card">
            <span class="nt-push__app" aria-hidden="true">iS</span>
            <div class="nt-push__text">
              <div class="nt-push__top">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <strong v-if="parts.titleHtml" v-html="parts.titleHtml" />
                <em v-else class="nt-pv-empty">Başlık boş</em>
                <span class="nt-push__time">{{ parts.time }}</span>
              </div>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <p v-if="parts.bodyHtml" v-html="parts.bodyHtml" />
              <p v-else><em class="nt-pv-empty">Gövde boş</em></p>
            </div>
          </div>
        </div>

        <div v-else class="nt-sms">
          <div class="nt-sms__head">
            <span class="nt-sms__avatar" aria-hidden="true">iS</span>ISTOC
          </div>
          <div class="nt-sms__meta">{{ parts.meta }}</div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="parts.textHtml" class="nt-sms__bubble" v-html="parts.textHtml" />
          <div v-else class="nt-sms__bubble"><em class="nt-pv-empty">SMS metni boş</em></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
  @use "@/assets/scss/variables" as *;

  // Çerçevenin içi alıcının gördüğü iletidir: panel temasından BAĞIMSIZ, açık
  // palet sabit. `v-html` ile gelen düğümlere erişebilmek için scoped değil;
  // tüm kurallar `.nt-pv-*` / çerçeve altında.
  .nt-pv-stage {
    display: flex;
    justify-content: center;
    padding: 16px;
    border-radius: 10px;
    background: var(--nt-bg-muted);
    overflow: hidden;
  }

  .nt-pv-scale {
    position: relative;
    flex-shrink: 0;
  }

  .nt-pv-frame {
    position: absolute;
    top: 0;
    inset-inline-start: 0;
    transform-origin: top left;
    color: $l-text-900;
    font-size: 14px;
    line-height: 1.5;
    text-align: start;
    overflow-wrap: anywhere;

    &[dir="rtl"] {
      transform-origin: top right;
    }

    .nt-bad {
      border-bottom: 2px solid $c-error-strong;
      background: rgba($c-error, 0.12);
    }

    // Panelin koyu tema kuralları tablo hücrelerini boyuyor; çerçevenin içi açık kalır.
  }

  // Panelin koyu tema kuralları (`html.dark td` vb.) tablo hücrelerini boyuyor;
  // çerçevenin içi açık kalmalı — aynı özgüllükte ve sonra gelen kural.
  .nt-pv-frame table,
  .nt-pv-frame tr,
  .nt-pv-frame td,
  .nt-pv-frame th,
  html.dark .nt-pv-frame table,
  html.dark .nt-pv-frame tr,
  html.dark .nt-pv-frame td,
  html.dark .nt-pv-frame th {
    background-color: transparent !important;
    color: $l-text-900 !important;
    border-color: $l-border !important;
  }

  .nt-pv-empty {
    color: $l-text-500;
  }

  .nt-mail {
    border: 1px solid $l-border;
    border-radius: 10px;
    background: $l-bg;
    overflow: hidden;
  }

  .nt-mail__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 16px;
    border-bottom: 1px solid $l-border;
    background: $l-bg-soft;
    font-size: 12px;
    color: $l-text-600;

    strong {
      font-size: 13px;
      color: $l-text-900;
    }
  }

  .nt-mail__brand {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 18px 20px 0;
    font-size: 15px;
    font-weight: 700;

    i {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      background: $brand;
    }
  }

  .nt-mail__body {
    padding: 8px 20px 16px;

    h1 {
      margin: 12px 0 8px;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.3;
    }

    h2 {
      margin: 14px 0 6px;
      font-size: 15px;
      font-weight: 700;
    }

    p {
      margin: 0 0 12px;
    }

    ul,
    ol {
      margin: 0 0 12px;
      padding-inline-start: 20px;
      list-style: disc;
    }

    a {
      color: $c-info-text;
      text-decoration: underline;
    }

    table {
      width: 100%;
      margin: 0 0 14px;
      border-collapse: collapse;
    }

    td {
      padding: 8px 0;
      border-bottom: 1px solid $l-border;
    }

    td:last-child {
      text-align: end;
    }

    a.cta {
      display: inline-block;
      padding: 10px 16px;
      border-radius: 8px;
      background: $brand;
      color: $brand-ink;
      font-weight: 700;
      text-decoration: none;
    }
  }

  .nt-mail__footer {
    padding: 14px 20px;
    border-top: 1px solid $l-border;
    font-size: 12px;
    color: $l-text-500;
  }

  .nt-inapp {
    border: 1px solid $l-border;
    border-radius: 12px;
    background: $l-bg-soft;
    overflow: hidden;
  }

  .nt-inapp__bar {
    display: flex;
    justify-content: flex-end;
    padding: 10px 14px;
    border-bottom: 1px solid $l-border;
    background: $l-bg;
    color: $l-text-700;
  }

  .nt-inapp__card {
    margin: 12px;
    border: 1px solid $l-border;
    border-radius: 10px;
    background: $l-bg;
  }

  .nt-inapp__head {
    padding: 10px 14px;
    border-bottom: 1px solid $l-border;
    font-weight: 700;
  }

  .nt-inapp__item {
    display: flex;
    gap: 10px;
    padding: 12px 14px;
  }

  .nt-inapp__icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba($brand, 0.22);
    color: $brand-ink;
  }

  .nt-inapp__text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;

    p {
      margin: 0;
      color: $l-text-700;
    }
  }

  .nt-inapp__link {
    color: $c-info-text;
    font-weight: 700;
  }

  .nt-inapp__time {
    font-size: 12px;
    color: $l-text-500;
  }

  .nt-push,
  .nt-sms {
    padding: 20px 14px 28px;
    border-radius: 18px;
    background: $l-text-700;
  }

  .nt-push__clock {
    margin-bottom: 14px;
    font-size: 28px;
    font-weight: 600;
    text-align: center;
    color: $l-bg;
  }

  .nt-push__card {
    display: flex;
    gap: 10px;
    padding: 12px;
    border-radius: 14px;
    background: $l-bg;
  }

  .nt-push__app,
  .nt-sms__avatar {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: $brand;
    color: $brand-ink;
    font-size: 13px;
    font-weight: 700;
  }

  .nt-push__text {
    flex: 1;
    min-width: 0;

    p {
      margin: 2px 0 0;
      color: $l-text-700;
    }
  }

  .nt-push__top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .nt-push__time {
    flex-shrink: 0;
    font-size: 12px;
    color: $l-text-500;
  }

  .nt-sms {
    background: $l-bg;
    border: 1px solid $l-border;
  }

  .nt-sms__head {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 700;
    color: $l-text-700;
  }

  .nt-sms__meta {
    margin: 10px 0 8px;
    font-size: 12px;
    text-align: center;
    color: $l-text-500;
  }

  .nt-sms__bubble {
    max-width: 85%;
    padding: 10px 12px;
    border-radius: 16px;
    border-end-start-radius: 4px;
    background: $l-bg-muted;
    white-space: pre-wrap;
  }
</style>
