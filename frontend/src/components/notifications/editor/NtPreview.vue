<script setup>
  /**
   * Önizleme paneli. Önizleme dili düzenlenen dile BAĞLIDIR; bağımsız
   * seçilirse uyarı bandı ve "Düzenlenen dile bağla" çıkar.
   */
  import { computed, ref } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import BaseSegmented from "@/components/common/BaseSegmented.vue";
  import { LANGS, langOf } from "@/constants/notificationTemplates";
  import { buildPreview, previewWidth } from "@/utils/notificationTemplates/preview";
  import { sanitizeHtml } from "@/utils/sanitize";

  import NtIssue from "../NtIssue.vue";
  import NtNote from "../NtNote.vue";
  import NtPreviewFrame from "../NtPreviewFrame.vue";

  const props = defineProps({
    event: { type: Object, required: true },
    tree: { type: Object, required: true },
    channel: { type: Object, required: true },
    /** Düzenlenen dil */
    lang: { type: String, required: true },
    variables: { type: Array, required: true },
    required: { type: Array, default: () => [] },
    /** Tüm sorunlar (tanımsız değişken notu için süzülür) */
    issues: { type: Array, default: () => [] },
  });
  const emit = defineEmits(["fullscreen"]);

  const sample = ref("normal");
  const previewLang = ref("auto");
  const device = ref("mobile");
  const sizeLabel = ref("");

  const DEVICES = [
    { value: "mobile", label: "Mobil 360" },
    { value: "desktop", label: "Masaüstü 600" },
  ];

  const wanted = computed(() => (previewLang.value === "auto" ? props.lang : previewLang.value));
  const editedShort = computed(() => langOf(props.lang)?.short);
  const detached = computed(() => previewLang.value !== "auto" && previewLang.value !== props.lang);
  const width = computed(() => previewWidth(props.channel.id, device.value));

  const preview = computed(() =>
    buildPreview({
      event: props.event,
      tree: props.tree,
      channel: props.channel.id,
      lang: wanted.value,
      variables: props.variables,
      required: props.required,
      sample: sample.value,
      sanitize: sanitizeHtml,
    })
  );

  const notes = computed(() => {
    const out = [];
    if (preview.value.fell) {
      const state = props.event.langs?.[wanted.value];
      out.push({
        kind: "missing_translation",
        severity: "warning",
        channel: null,
        lang: wanted.value,
        state: state === "hazir" ? "eksik" : state,
      });
    }
    if (preview.value.status === "ok")
      out.push(
        ...props.issues.filter(
          (i) =>
            i.kind === "unknown_variable" &&
            i.channel === props.channel.id &&
            i.lang === preview.value.lang
        )
      );
    return out;
  });

  function open() {
    emit("fullscreen", { lang: wanted.value, sample: sample.value, device: device.value });
  }
</script>

<template>
  <section class="nt-preview nt-surface" aria-labelledby="nt-preview-title">
    <div class="nt-preview__head">
      <div>
        <h2 id="nt-preview-title" class="nt-h2">Önizleme</h2>
        <p class="nt-hint">{{ channel.label }} · {{ langOf(preview.lang)?.short }}</p>
      </div>
      <button type="button" class="hdr-btn-outlined nt-btn--sm" data-fullscreen-btn @click="open">
        <AppIcon name="maximize-2" :size="14" />Tam ekran
      </button>
    </div>

    <div class="nt-preview__ctl">
      <div>
        <label class="form-label" for="nt-pv-sample">Örnek veri</label>
        <select id="nt-pv-sample" v-model="sample" class="form-input">
          <option value="normal">Örnek veri</option>
          <option value="long">Uzun değerler</option>
          <option value="missing">Eksik değer (zorunlu değişken boş)</option>
        </select>
      </div>
      <div>
        <label class="form-label" for="nt-pv-lang">Önizleme dili</label>
        <select id="nt-pv-lang" v-model="previewLang" class="form-input">
          <option value="auto">Düzenlenen ({{ editedShort }})</option>
          <option v-for="l in LANGS" :key="l.id" :value="l.id">
            {{ l.label }} ({{ l.short }})
          </option>
        </select>
      </div>
    </div>

    <div class="nt-preview__size">
      <BaseSegmented
        v-if="channel.id === 'email'"
        v-model="device"
        class="nt-preview__device"
        :options="DEVICES"
      />
      <span v-if="sizeLabel" class="nt-preview__label nt-num" data-preview-size>{{
        sizeLabel
      }}</span>
    </div>

    <NtNote v-if="detached" tone="warn">
      <strong>
        Önizleme {{ langOf(previewLang)?.short }}, düzenlediğiniz dil {{ editedShort }}.
      </strong>
      Yazdıklarınız bu önizlemede görünmez.
      <template #action>
        <button type="button" class="hdr-btn-outlined nt-btn--sm" @click="previewLang = 'auto'">
          Düzenlenen dile bağla
        </button>
      </template>
    </NtNote>

    <NtPreviewFrame
      :preview="preview"
      :channel="channel.id"
      :width="width"
      @fit="sizeLabel = $event"
    />

    <div class="nt-preview__notes">
      <NtIssue v-for="(issue, i) in notes" :key="`${issue.kind}-${i}`" :issue="issue" />
      <p v-if="!notes.length && preview.status === 'ok'" class="nt-hint nt-preview__info">
        <AppIcon name="eye" :size="14" />Örnek veriyle doldurulmuş önizleme; gerçek gönderim değil.
      </p>
    </div>
  </section>
</template>

<style scoped lang="scss">
  .nt-preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 14px;
  }

  .nt-preview__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .nt-preview__ctl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    select {
      width: 100%;
    }
  }

  .nt-preview__size {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .nt-preview__device {
    width: auto;
    min-width: 220px;
  }

  .nt-preview__label {
    margin-inline-start: auto;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--nt-bg-muted);
    font-size: 12px;
  }

  .nt-preview__notes {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .nt-preview__info {
    display: flex;
    align-items: center;
    gap: 6px;
  }
</style>
