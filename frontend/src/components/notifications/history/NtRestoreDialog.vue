<script setup>
  /**
   * "Bu sürüme dön": önce önizleme, sonra onay.
   *
   * API sözleşmesi (`restore_version` → yeni taslak): seçilen sürümün içeriği
   * TASLAĞA alınır; yayındaki sürüm değişmez, yayın ayrıca düzenleyiciden yapılır.
   * (Prototip doğrudan yayınlıyordu; fark teslim raporunda not edildi.)
   */
  import { computed, ref, watch } from "vue";

  import { LANGS } from "@/constants/notificationTemplates";
  import { useToast } from "@/composables/useToast";
  import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
  import { sentChannels } from "@/utils/notificationTemplates/catalog";
  import { buildPreview, previewWidth } from "@/utils/notificationTemplates/preview";
  import { sanitizeHtml } from "@/utils/sanitize";

  import NtNote from "../NtNote.vue";
  import NtOverlay from "../NtOverlay.vue";
  import NtPreviewFrame from "../NtPreviewFrame.vue";

  const props = defineProps({
    event: { type: Object, required: true },
    variables: { type: Array, required: true },
    requiredByChannel: { type: Object, required: true },
    /** Dönülecek sürüm numarası */
    version: { type: Number, default: null },
    /** O sürümün içeriği */
    content: { type: Object, default: null },
    /** Kaydedilmiş taslak var mı? (üzerine yazılır) */
    hasDraft: { type: Boolean, default: false },
    channel: { type: String, default: "" },
    lang: { type: String, default: "tr" },
  });
  const emit = defineEmits(["restored"]);
  const open = defineModel("open", { type: Boolean, default: false });

  const store = useNotificationTemplatesStore();
  const toast = useToast();

  const scope = ref({ channel: "", lang: "tr" });
  const busy = ref(false);
  const failure = ref("");
  const retried = ref(false);
  const sizeLabel = ref("");

  const channels = computed(() => sentChannels(props.event));
  const langs = computed(() =>
    LANGS.map((l) => ({
      ...l,
      text: `${l.label} (${l.short})${props.content?.[scope.value.channel]?.[l.id] ? "" : " · bu sürümde yok"}`,
    }))
  );
  const preview = computed(() =>
    buildPreview({
      event: props.event,
      tree: props.content || {},
      channel: scope.value.channel,
      lang: scope.value.lang,
      variables: props.variables,
      required: props.requiredByChannel[scope.value.channel] || [],
      sanitize: sanitizeHtml,
    })
  );
  const width = computed(() => previewWidth(scope.value.channel, "mobile"));
  const returnFocus = () => document.querySelector(`[data-restore="${props.version}"]`);

  watch(open, (isOpen) => {
    if (!isOpen) return;
    const channel = props.channel || channels.value[0]?.id || "email";
    scope.value = {
      channel,
      lang: props.content?.[channel]?.[props.lang] ? props.lang : "tr",
    };
    failure.value = "";
    retried.value = false;
  });

  async function confirm() {
    busy.value = true;
    failure.value = "";
    try {
      await store.restoreVersion(props.event.key, props.version);
      open.value = false;
      toast.success(
        `v${props.version} içeriği taslağa alındı. Yayınlamak için düzenleyicide Yayınla'yı kullanın.`
      );
      emit("restored", props.version);
    } catch (e) {
      retried.value = true;
      failure.value =
        e.status === 409
          ? "Bu şablon az önce başka bir yönetici tarafından değiştirildi. Geçmişi yenileyip yeniden deneyin; yayındaki sürüm değişmedi."
          : "Sunucu yanıt vermedi; yayındaki sürüm ve taslak değişmedi.";
    } finally {
      busy.value = false;
    }
  }
</script>

<template>
  <NtOverlay
    v-model:open="open"
    :title="`v${version} içeriğine dön`"
    size="wide"
    :busy="busy"
    initial-focus="#nt-rv-cancel"
    :return-focus="returnFocus"
  >
    <p class="nt-rv__desc">
      v{{ version }} içeriği değiştirilmeden yeni taslak olur. Yayındaki
      <template v-if="event.publish.version">v{{ event.publish.version }}</template>
      <template v-else>sürüm</template> değişmez; taslağı düzenleyiciden yayınlarsınız.
    </p>
    <NtNote v-if="hasDraft" tone="warn">
      Kaydedilmiş taslağın üzerine yazılır; taslaktaki değişiklikler kaybolur.
    </NtNote>
    <div class="nt-rv__grid">
      <div>
        <label class="form-label" for="nt-rv-channel">Kanal</label>
        <select id="nt-rv-channel" v-model="scope.channel" class="form-input">
          <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
      </div>
      <div>
        <label class="form-label" for="nt-rv-lang">Dil</label>
        <select id="nt-rv-lang" v-model="scope.lang" class="form-input">
          <option v-for="l in langs" :key="l.id" :value="l.id">{{ l.text }}</option>
        </select>
      </div>
    </div>
    <figure class="nt-rv__figure">
      <figcaption>
        Taslağa alınacak içerik · v{{ version }}
        <span v-if="sizeLabel" class="nt-num nt-hint">{{ sizeLabel }}</span>
      </figcaption>
      <NtPreviewFrame
        v-if="scope.channel"
        :preview="preview"
        :channel="scope.channel"
        :width="width"
        @fit="sizeLabel = $event"
      />
    </figure>
    <NtNote v-if="failure" tone="err" alert>
      <strong>Sürüme dönülemedi.</strong> {{ failure }}
    </NtNote>

    <template #footer>
      <button
        id="nt-rv-cancel"
        type="button"
        class="hdr-btn-outlined"
        :disabled="busy"
        @click="open = false"
      >
        Vazgeç
      </button>
      <button
        type="button"
        class="hdr-btn-primary"
        data-restore-confirm
        :disabled="busy"
        @click="confirm"
      >
        {{ busy ? "Alınıyor" : retried ? "Yeniden dene" : "Taslağa al" }}
      </button>
    </template>
  </NtOverlay>
</template>

<style scoped lang="scss">
  .nt-rv__desc {
    margin: 0;
  }

  .nt-rv__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    select {
      width: 100%;
    }
  }

  .nt-rv__figure {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;

    figcaption {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-weight: 600;
    }
  }
</style>
