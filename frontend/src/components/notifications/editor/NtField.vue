<script setup>
  /**
   * Düz metin alanı (tek satır, çok satır, düz metin, SMS, HTML kodu).
   *
   * Alanın arkasındaki katman `{{degisken}}` belirteçlerini vurgular: tanınan
   * sarı, tanımsız kırmızı alt çizgili. Alan altı mesajlar tek hata sözlüğünden
   * gelir; engelleyici hata varsa `aria-invalid` yazılır.
   */
  import { computed, nextTick, onMounted, ref, watch } from "vue";

  import { tokens } from "@/utils/notificationTemplates/template";

  import NtIssue from "../NtIssue.vue";

  const props = defineProps({
    /** `FIELDS` içindeki alan tanımı */
    field: { type: Object, required: true },
    id: { type: String, required: true },
    lang: { type: String, default: "tr" },
    dir: { type: String, default: "ltr" },
    readonly: { type: Boolean, default: false },
    issues: { type: Array, default: () => [] },
    /** Bu olayın değişken adları (Set) */
    known: { type: Object, required: true },
    /** Etiket ve açıklama satırını çizme (zengin metnin kod görünümü kendi etiketini taşır). */
    bare: { type: Boolean, default: false },
    rows: { type: Number, default: 3 },
  });
  const emit = defineEmits(["focus"]);
  const model = defineModel({ type: String, default: "" });

  const ctlRef = ref(null);
  const backRef = ref(null);

  const isInput = computed(() => props.field.type === "input");
  const mono = computed(
    () => !!props.field.mono || props.field.type === "text" || props.field.type === "code"
  );
  const invalid = computed(() => props.issues.some((i) => i.severity === "blocking"));
  const length = computed(() => model.value.length);

  /** Arka katman parçaları: düz metin + belirteçler. */
  const segments = computed(() => {
    const text = model.value;
    const out = [];
    let i = 0;
    for (const t of tokens(text)) {
      if (t.index > i) out.push({ id: `p${i}`, text: text.slice(i, t.index) });
      out.push({
        id: `t${t.index}`,
        text: t.raw,
        token: true,
        bad: !!t.name && !props.known.has(t.name),
      });
      i = t.index + t.raw.length;
    }
    if (i < text.length) out.push({ id: `p${i}`, text: text.slice(i) });
    return out;
  });

  function syncScroll() {
    if (!backRef.value || !ctlRef.value) return;
    backRef.value.scrollTop = ctlRef.value.scrollTop;
    backRef.value.scrollLeft = ctlRef.value.scrollLeft;
  }

  function autosize() {
    const el = ctlRef.value;
    if (!el || isInput.value) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }

  /** İmlecin bulunduğu yere metin ekler (değişken ekleme). */
  function insertText(text) {
    const el = ctlRef.value;
    if (!el || props.readonly) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.setRangeText(text, start, end, "end");
    model.value = el.value;
    el.focus();
  }

  watch(model, () => nextTick(() => (autosize(), syncScroll())));
  onMounted(autosize);

  defineExpose({ insertText, focus: () => ctlRef.value?.focus(), element: ctlRef });
</script>

<template>
  <div class="nt-field">
    <label v-if="!bare" :id="`${id}-label`" class="form-label nt-field__label" :for="id">
      <span>
        {{ field.label }}
        <span v-if="field.required" class="nt-field__req">zorunlu</span>
      </span>
      <span
        v-if="field.max"
        class="nt-field__count nt-num"
        :class="{ 'is-over': length > field.max }"
      >
        {{ length }}/{{ field.max }}
      </span>
    </label>

    <div class="nt-hf" :class="{ 'nt-hf--mono': mono, 'nt-hf--single': isInput }" :dir="dir">
      <div ref="backRef" class="nt-hf__back nt-hf__text" aria-hidden="true">
        <template v-for="seg in segments" :key="seg.id"
          ><span v-if="seg.token" class="nt-tok" :class="{ 'nt-tok--bad': seg.bad }">{{
            seg.text
          }}</span
          ><template v-else>{{ seg.text }}</template></template
        >{{ "\n" }}
      </div>
      <input
        v-if="isInput"
        :id="id"
        ref="ctlRef"
        v-model="model"
        type="text"
        class="form-input nt-hf__ctl nt-hf__text"
        autocomplete="off"
        spellcheck="false"
        :lang="lang"
        :dir="dir"
        :readonly="readonly"
        :aria-required="field.required ? 'true' : undefined"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="`${id}-desc`"
        @scroll="syncScroll"
        @focus="emit('focus', field.id)"
      />
      <textarea
        v-else
        :id="id"
        ref="ctlRef"
        v-model="model"
        class="form-input nt-hf__ctl nt-hf__text"
        spellcheck="false"
        :rows="rows"
        :lang="lang"
        :dir="dir"
        :readonly="readonly"
        :aria-required="field.required ? 'true' : undefined"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="`${id}-desc`"
        @scroll="syncScroll"
        @focus="emit('focus', field.id)"
      />
    </div>

    <slot name="after" />

    <div :id="`${id}-desc`" class="nt-field__desc">
      <span v-if="field.hint && !bare" class="nt-hint">{{ field.hint }}</span>
      <NtIssue
        v-for="(issue, i) in issues"
        :key="`${issue.kind}-${issue.variable || ''}-${i}`"
        :issue="issue"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .nt-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .nt-field__label {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin: 0;
  }

  .nt-field__req {
    margin-inline-start: 4px;
    font-weight: 500;
    color: var(--nt-muted);
  }

  .nt-field__count {
    font-weight: 500;
    color: var(--nt-muted);

    &.is-over {
      font-weight: 700;
      color: var(--nt-warn-fg);
    }
  }

  .nt-field__desc {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &:empty {
      display: none;
    }
  }

  // Vurgulu arka plan: alan saydam, belirteç zemini arkadaki katmanda.
  .nt-hf {
    position: relative;
    border-radius: 8px;
    background: var(--nt-bg);
  }

  // İki katmanın yazı ölçüleri BİREBİR aynı olmalı, yoksa vurgu kayar.
  .nt-hf__text {
    padding: 8px 12px;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.5;
    letter-spacing: 0;
    white-space: pre-wrap;
    overflow-wrap: break-word;

    @media (max-width: 767px) {
      font-size: 16px;
    }
  }

  .nt-hf--mono .nt-hf__text {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 12px;

    @media (max-width: 767px) {
      font-size: 16px;
    }
  }

  .nt-hf--single .nt-hf__text {
    white-space: pre;
    overflow: hidden;
  }

  .nt-hf__back {
    position: absolute;
    inset: 0;
    border: 1px solid transparent;
    color: transparent;
    pointer-events: none;
    overflow: hidden;
    user-select: none;
  }

  .nt-hf__ctl {
    position: relative;
    display: block;
    width: 100%;
    background: transparent !important;
    resize: none;

    // Panelin koyu tema kuralı alan zeminini `!important` ile boyuyor; vurgu
    // katmanı görünsün diye burada da saydam kalmalı.
    @include dark {
      background-color: transparent !important;

      &:focus {
        background-color: transparent !important;
      }
    }
  }

  textarea.nt-hf__ctl {
    overflow: hidden;
  }

  .nt-tok {
    border-radius: 3px;
    background: var(--nt-brand-bg);
  }

  .nt-tok--bad {
    background: var(--nt-err-bg);
    box-shadow: inset 0 -2px 0 var(--nt-err-line);
  }
</style>
