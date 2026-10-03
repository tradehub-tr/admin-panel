<script setup>
  /**
   * Aktif kanal × dil için alanlar. Değişken ekleme, en son odaklanan alana
   * (yoksa kanalın ana alanına) yapılır.
   */
  import { computed, ref } from "vue";
  import { storeToRefs } from "pinia";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useToast } from "@/composables/useToast";
  import { FIELDS, PRIMARY_FIELD } from "@/constants/notificationTemplates";
  import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
  import { simplifyTurkish } from "@/utils/notificationTemplates/sms";
  import {
    htmlToText,
    insertionTokens,
    plainFill,
    sampleScope,
  } from "@/utils/notificationTemplates/template";

  import NtField from "./NtField.vue";
  import NtRichText from "./NtRichText.vue";
  import NtSmsMeter from "./NtSmsMeter.vue";

  const props = defineProps({
    channel: { type: Object, required: true },
    lang: { type: Object, required: true },
    fields: { type: Object, default: null },
    issues: { type: Array, default: () => [] },
    variables: { type: Array, required: true },
    required: { type: Array, default: () => [] },
    known: { type: Object, required: true },
    /** Değişkenler sütunda değilse çekmeceyi açan düğme çizilir. */
    showVariablesButton: { type: Boolean, default: false },
  });
  const emit = defineEmits(["open-variables"]);
  const htmlMode = defineModel("htmlMode", { type: String, default: "rich" });

  const store = useNotificationTemplatesStore();
  const { canEdit } = storeToRefs(store);
  const toast = useToast();

  const controls = ref({});
  const lastField = ref(null);

  const defs = computed(() => FIELDS[props.channel.id] || []);
  const fid = (id) => `nt-fld-${props.channel.id}-${props.lang.id}-${id}`;
  const issuesOf = (id) => props.issues.filter((i) => i.field === id);
  const smsFilled = computed(() =>
    props.channel.id === "sms"
      ? plainFill(props.fields?.text, sampleScope(props.variables), props.known)
      : ""
  );

  function set(id, value) {
    store.setField(props.channel.id, props.lang.id, id, value);
  }

  function setControl(id, el) {
    if (el) controls.value[id] = el;
    else delete controls.value[id];
  }

  /** @returns {boolean} eklendi mi */
  function insertVariable(name) {
    const def = props.variables.find((v) => v.name === name);
    if (!def || !canEdit.value || !props.fields) return false;
    const target =
      controls.value[lastField.value] || controls.value[PRIMARY_FIELD[props.channel.id]];
    if (!target) return false;
    if (target.insertVariable) return target.insertVariable(name);
    const tokenList = insertionTokens(def);
    target.insertText(tokenList.map((t) => t.raw).join(tokenList.length > 1 ? "\n\n" : ""));
    return true;
  }

  function generateText() {
    set("text", htmlToText(props.fields.html));
    toast.success("Düz metin gövdeden üretildi");
  }

  function simplifySms() {
    set("text", simplifyTurkish(props.fields.text));
    toast.success("GSM-7 dışı Türkçe karakterler sadeleştirildi.");
    controls.value.text?.focus();
  }

  defineExpose({ insertVariable });
</script>

<template>
  <div class="nt-panel">
    <div class="nt-panel__top">
      <span class="nt-hint">
        {{
          lang.source
            ? "Kaynak dil: hazır olmayan dillerde gönderim bu içeriğe düşer."
            : `${channel.label} · ${lang.label}`
        }}
      </span>
      <button
        v-if="showVariablesButton"
        type="button"
        class="hdr-btn-outlined nt-btn--sm"
        aria-haspopup="dialog"
        data-variables-btn
        @click="emit('open-variables')"
      >
        <AppIcon name="braces" :size="14" />
        Değişkenler <span class="nt-num">{{ variables.length }}</span>
      </button>
    </div>

    <div v-if="!fields" class="nt-panel__empty">
      <AppIcon name="file-text" :size="20" />
      <strong>{{ lang.label }} için içerik yok</strong>
      <span>
        Gönderimde TR içerik kullanılır. Çeviriye başlamak için yukarıdaki "Kaynak dilden kopyala"
        adımını kullanın.
      </span>
    </div>

    <div v-else class="nt-panel__fields">
      <template v-for="def in defs" :key="`${channel.id}-${lang.id}-${def.id}`">
        <NtRichText
          v-if="def.type === 'html'"
          :id="fid(def.id)"
          :ref="(el) => setControl(def.id, el)"
          v-model:mode="htmlMode"
          class="nt-panel__full"
          :field="def"
          :model-value="fields[def.id] || ''"
          :variables="variables"
          :required="required"
          :known="known"
          :channel="channel.id"
          :lang="lang.id"
          :dir="lang.dir"
          :readonly="!canEdit"
          :issues="issuesOf(def.id)"
          @update:model-value="set(def.id, $event)"
          @focus="lastField = $event"
        />
        <NtField
          v-else
          :id="fid(def.id)"
          :ref="(el) => setControl(def.id, el)"
          :class="def.half ? '' : 'nt-panel__full'"
          :field="def"
          :model-value="fields[def.id] || ''"
          :rows="def.type === 'text' ? 6 : def.type === 'sms' ? 4 : 3"
          :lang="lang.id"
          :dir="lang.dir"
          :readonly="!canEdit"
          :issues="issuesOf(def.id)"
          :known="known"
          @update:model-value="set(def.id, $event)"
          @focus="lastField = $event"
        >
          <template v-if="def.type === 'sms'" #after>
            <NtSmsMeter :text="smsFilled" :can-edit="canEdit" @simplify="simplifySms" />
          </template>
          <template v-else-if="def.type === 'text'" #after>
            <div>
              <button
                type="button"
                class="hdr-btn-outlined nt-btn--sm"
                :disabled="!canEdit"
                @click="generateText"
              >
                <AppIcon name="zap" :size="14" />Gövdeden üret
              </button>
            </div>
          </template>
        </NtField>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .nt-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  .nt-panel__top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .nt-panel__fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .nt-panel__full {
    grid-column: 1 / -1;
  }

  @container (max-width: 520px) {
    .nt-panel__fields > * {
      grid-column: 1 / -1;
    }
  }

  .nt-panel__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 28px 16px;
    border: 1px dashed var(--nt-field-line);
    border-radius: 10px;
    text-align: center;
    color: var(--nt-fg-2);
  }
</style>
