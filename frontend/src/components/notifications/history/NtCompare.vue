<script setup>
  /**
   * Sürüm karşılaştırması: kapsam (kanal + dil) seçimli alan bazında fark ve
   * eski/yeni görünüm. Geniş alanda yan yana, dar alanda alt alta.
   */
  import { computed, ref } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { LANGS, channelOf, langOf } from "@/constants/notificationTemplates";
  import { sentChannels } from "@/utils/notificationTemplates/catalog";
  import { fieldDiffs, scopeChanges } from "@/utils/notificationTemplates/diff";
  import { buildPreview, previewWidth } from "@/utils/notificationTemplates/preview";
  import { sanitizeHtml } from "@/utils/sanitize";

  import NtFieldDiff from "../NtFieldDiff.vue";
  import NtPreviewFrame from "../NtPreviewFrame.vue";

  const props = defineProps({
    event: { type: Object, required: true },
    variables: { type: Array, required: true },
    requiredByChannel: { type: Object, required: true },
    /** [{ version, name }] — yeniden eskiye */
    versions: { type: Array, required: true },
    oldVersion: { type: Number, default: null },
    newVersion: { type: Number, default: null },
    oldContent: { type: Object, default: null },
    newContent: { type: Object, default: null },
    channel: { type: String, required: true },
    lang: { type: String, required: true },
  });
  const emit = defineEmits([
    "update:oldVersion",
    "update:newVersion",
    "update:channel",
    "update:lang",
  ]);

  const sizes = ref({ old: "", neu: "" });

  const channels = computed(() => sentChannels(props.event));
  const hasOld = computed(() => props.oldVersion !== null && !!props.oldContent);
  const oldOptions = computed(() => props.versions.filter((v) => v.version !== props.newVersion));
  const scopes = computed(() =>
    hasOld.value && props.newContent
      ? scopeChanges(props.event, props.oldContent, props.newContent).map((s) => ({
          ...s,
          id: `${s.channel}|${s.lang}`,
          text: `${channelOf(s.channel)?.label} · ${langOf(s.lang)?.short}`,
          count: s.kind === "değişti" ? s.count : s.kind,
          on: s.channel === props.channel && s.lang === props.lang,
        }))
      : []
  );
  const diff = computed(() =>
    hasOld.value
      ? fieldDiffs(
          props.channel,
          props.oldContent?.[props.channel]?.[props.lang] ?? null,
          props.newContent?.[props.channel]?.[props.lang] ?? null
        )
      : null
  );
  const scopeLabel = computed(
    () => `${channelOf(props.channel)?.label} · ${langOf(props.lang)?.short}`
  );
  const width = computed(() => previewWidth(props.channel, "mobile"));

  const previewOf = (tree) =>
    buildPreview({
      event: props.event,
      tree: tree || {},
      channel: props.channel,
      lang: props.lang,
      variables: props.variables,
      required: props.requiredByChannel[props.channel] || [],
      sanitize: sanitizeHtml,
    });
  const oldPreview = computed(() => previewOf(props.oldContent));
  const newPreview = computed(() => previewOf(props.newContent));

  function pickScope(s) {
    emit("update:channel", s.channel);
    emit("update:lang", s.lang);
  }
</script>

<template>
  <section id="nt-compare" class="nt-cmp nt-surface" aria-labelledby="nt-cmp-title" tabindex="-1">
    <div class="nt-cmp__head">
      <h2 id="nt-cmp-title" class="nt-h2">Sürüm karşılaştırması</h2>
      <span v-if="newVersion !== null" class="nt-num nt-cmp__pair">
        <template v-if="hasOld"
          >v{{ oldVersion }}
          <AppIcon name="arrow-right" :size="13" class="inline mx-1" /> </template
        >v{{ newVersion }}
      </span>
    </div>

    <p v-if="newVersion === null" class="nt-hint">Bu olay için henüz sürüm yok.</p>

    <template v-else>
      <div class="nt-cmp__ctl">
        <div>
          <label class="form-label" for="nt-cmp-old">Eski sürüm</label>
          <select
            id="nt-cmp-old"
            class="form-input"
            :value="oldVersion ?? ''"
            :disabled="!oldOptions.length"
            @change="emit('update:oldVersion', Number($event.target.value))"
          >
            <option v-if="!oldOptions.length" value="">yok</option>
            <option v-for="v in oldOptions" :key="v.version" :value="v.version">
              {{ v.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="form-label" for="nt-cmp-new">Yeni sürüm</label>
          <select
            id="nt-cmp-new"
            class="form-input"
            :value="newVersion"
            @change="emit('update:newVersion', Number($event.target.value))"
          >
            <option v-for="v in versions" :key="v.version" :value="v.version">{{ v.name }}</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="nt-cmp-channel">Kanal</label>
          <select
            id="nt-cmp-channel"
            class="form-input"
            :value="channel"
            @change="emit('update:channel', $event.target.value)"
          >
            <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="nt-cmp-lang">Dil</label>
          <select
            id="nt-cmp-lang"
            class="form-input"
            :value="lang"
            @change="emit('update:lang', $event.target.value)"
          >
            <option v-for="l in LANGS" :key="l.id" :value="l.id">
              {{ l.label }} ({{ l.short }})
            </option>
          </select>
        </div>
      </div>

      <div v-if="hasOld" class="nt-cmp__scopes" role="group" aria-label="Değişiklik olan kapsamlar">
        <span class="nt-hint">
          {{
            scopes.length
              ? "Değişen kapsamlar:"
              : "Bu iki sürüm arasında açık kanallarda içerik farkı yok."
          }}
        </span>
        <button
          v-for="s in scopes"
          :key="s.id"
          type="button"
          class="nt-chip-btn"
          :aria-pressed="s.on"
          @click="pickScope(s)"
        >
          {{ s.text }} <span class="nt-num">{{ s.count }}</span>
        </button>
      </div>

      <h3 class="nt-h3 nt-cmp__h">
        Alan bazında fark
        <span class="nt-hint">
          {{ scopeLabel }}<template v-if="diff"> · {{ diff.changed }} alan farklı</template>
        </span>
      </h3>
      <p v-if="!diff" class="nt-hint">
        İlk sürüm; karşılaştırılacak önceki sürüm yok. Aşağıda bu sürümün görünümü var.
      </p>
      <p v-else-if="diff.empty" class="nt-hint">Bu kapsamda iki sürümde de içerik yok.</p>
      <NtFieldDiff
        v-else
        :rows="diff.rows"
        :old-label="`Eski · v${oldVersion}`"
        :new-label="`Yeni · v${newVersion}`"
      />

      <h3 class="nt-h3 nt-cmp__h">Görünüm <span class="nt-hint">örnek veriyle</span></h3>
      <div class="nt-cmp__renders" :class="{ 'is-single': !hasOld }">
        <figure v-if="hasOld" class="nt-cmp__render">
          <figcaption>
            Eski · v{{ oldVersion }}
            <span v-if="sizes.old" class="nt-num nt-hint">{{ sizes.old }}</span>
          </figcaption>
          <NtPreviewFrame
            :preview="oldPreview"
            :channel="channel"
            :width="width"
            @fit="sizes.old = $event"
          />
        </figure>
        <figure class="nt-cmp__render">
          <figcaption>
            {{ hasOld ? "Yeni" : "Bu sürüm" }} · v{{ newVersion }}
            <span v-if="sizes.neu" class="nt-num nt-hint">{{ sizes.neu }}</span>
          </figcaption>
          <NtPreviewFrame
            :preview="newPreview"
            :channel="channel"
            :width="width"
            @fit="sizes.neu = $event"
          />
        </figure>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
  .nt-cmp {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 16px;
    container-type: inline-size;
    outline: none;
  }

  .nt-cmp__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .nt-cmp__pair {
    font-weight: 700;
  }

  .nt-cmp__ctl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;

    select {
      width: 100%;
    }
  }

  .nt-cmp__scopes {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--nt-line);
  }

  .nt-cmp__h {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    margin-top: 4px;

    .nt-hint {
      font-weight: 500;
    }
  }

  .nt-cmp__renders {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    &.is-single {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  // Dar alanda eski/yeni görünüm alt alta.
  @container (max-width: 620px) {
    .nt-cmp__renders {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .nt-cmp__render {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    margin: 0;

    figcaption {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-weight: 600;
    }
  }
</style>
