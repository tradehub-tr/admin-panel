<script setup>
  /**
   * Bildirim şablonları · Şablon düzenleyici (olay anahtarı route paramı).
   *
   * İnce kabuk: store + router + katmanlar. Sütun sayısı sayfaya KALAN
   * genişlikten seçilir (panel kabuğu 280px alır):
   *   ≥ 1124px  üç sütun   değişkenler 240 · düzenleyici ≥ 472 · önizleme 380
   *   ≥ 828px   iki sütun  düzenleyici (alan ≥ 420) + önizleme 360; değişkenler çekmece
   *   altı      tek sütun  Düzenle / Önizle anahtarı; değişkenler çekmece
   */
  import { computed, nextTick, ref, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { onBeforeRouteLeave, useRoute } from "vue-router";

  import BaseSegmented from "@/components/common/BaseSegmented.vue";
  import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import NtNote from "@/components/notifications/NtNote.vue";
  import NtOverlay from "@/components/notifications/NtOverlay.vue";
  import NtPage from "@/components/notifications/NtPage.vue";
  import NtSubnav from "@/components/notifications/NtSubnav.vue";
  import NtTabs from "@/components/notifications/NtTabs.vue";
  import NtConflictDialog from "@/components/notifications/editor/NtConflictDialog.vue";
  import NtEditorHeader from "@/components/notifications/editor/NtEditorHeader.vue";
  import NtFieldPanel from "@/components/notifications/editor/NtFieldPanel.vue";
  import NtFullPreviewDialog from "@/components/notifications/editor/NtFullPreviewDialog.vue";
  import NtPreview from "@/components/notifications/editor/NtPreview.vue";
  import NtPublishDialog from "@/components/notifications/editor/NtPublishDialog.vue";
  import NtTestDialog from "@/components/notifications/editor/NtTestDialog.vue";
  import NtTranslationFlow from "@/components/notifications/editor/NtTranslationFlow.vue";
  import NtVariables from "@/components/notifications/editor/NtVariables.vue";
  import NtChannelDrawer from "@/components/notifications/events/NtChannelDrawer.vue";
  import { useElementWidth } from "@/composables/notifications/useElementWidth";
  import { useTemplateEditor } from "@/composables/notifications/useTemplateEditor";
  import { useToast } from "@/composables/useToast";
  import { CHANNEL_IDS, TRANSLATION_STATES } from "@/constants/notificationTemplates";
  import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
  import { sentChannels } from "@/utils/notificationTemplates/catalog";

  const COLS_3 = 1124;
  const COLS_2 = 828;
  const NARROW = 640;

  const route = useRoute();
  const store = useNotificationTemplatesStore();
  const {
    template,
    working,
    templateLoading,
    templateError,
    saving,
    saveFailed,
    conflict,
    isDirty,
    draftDiffers,
    canEdit,
    canTest,
    publishMode,
  } = storeToRefs(store);
  const toast = useToast();
  const editor = useTemplateEditor();
  const {
    channel,
    lang,
    event,
    variables,
    required,
    known,
    fields,
    used,
    issues,
    scopeIssues,
    channelTabs,
    langTabs,
    channelInfo,
    langInfo,
  } = editor;

  const rootRef = ref(null);
  const panelRef = ref(null);
  const { width } = useElementWidth(rootRef);
  const cols = computed(() => (width.value >= COLS_3 ? 3 : width.value >= COLS_2 ? 2 : 1));
  const narrow = computed(() => width.value < NARROW);

  const mode = ref("edit");
  const htmlMode = ref("rich");
  const MODES = [
    { value: "edit", label: "Düzenle" },
    { value: "preview", label: "Önizle" },
  ];

  const drawerOpen = ref(false);
  const variablesOpen = ref(false);
  const publishOpen = ref(false);
  const testOpen = ref(false);
  const conflictOpen = ref(false);
  const fullOpen = ref(false);
  const fullOptions = ref({ lang: "tr", sample: "normal", device: "mobile" });
  const translating = ref(false);
  const leaveOpen = ref(false);
  let leaveResolve = null;

  const eventKey = computed(() => String(route.params.key || ""));
  const ready = computed(() => !!template.value && !!working.value && !!event.value);
  const langState = computed(() => event.value?.langs?.[lang.value] || "eksik");

  const actions = computed(() => {
    const editable = canEdit.value;
    const busy = saving.value;
    const dirty = isDirty.value || saveFailed.value;
    const nothing = !draftDiffers.value && !dirty;
    const review = event.value?.review_state === "onay-bekliyor";
    const direct = publishMode.value === "publish";
    let reason = "";
    if (!editable) reason = store.reasonFor("duzenle");
    else if (!direct)
      reason = `${store.reasonFor("yayinla")} Taslağı kaydedip onaya gönderebilirsiniz.`;
    else if (nothing) reason = "Yayınlanacak değişiklik yok.";
    return {
      reason,
      testDisabled: !canTest.value || busy,
      saveDisabled: !editable || busy || !dirty,
      publishDisabled:
        !editable || busy || nothing || publishMode.value === "none" || (review && !direct),
      publishLabel: direct ? "Yayınla" : review ? "Onay bekliyor" : "Onaya gönder",
    };
  });

  async function load(key) {
    if (!key) return;
    try {
      const fresh = template.value?.event?.key !== key;
      await store.loadTemplate(key);
      if (fresh) {
        editor.reset();
        mode.value = "edit";
      }
    } catch {
      /* hata `templateError` ile gösterilir */
    }
  }

  async function save() {
    const result = await store.saveDraft();
    if (result === "saved") toast.success("Taslak kaydedildi");
    else if (result === "conflict") conflictOpen.value = true;
    else if (result === "failed") {
      toast.error("Kaydedilemedi; değişiklikleriniz duruyor.");
      await nextTick();
      document.getElementById("nt-retry-save")?.focus();
    }
  }

  function insertVariable(name) {
    const fromDrawer = variablesOpen.value;
    variablesOpen.value = false;
    // Çekmece kapanıp odak iade edildikten sonra alana ekle.
    nextTick(() => {
      const label = variables.value.find((v) => v.name === name)?.label || name;
      if (panelRef.value?.insertVariable(name)) toast.success(`Eklendi: ${label}`);
      else if (fromDrawer) toast.info("Değişken eklenecek alan bulunamadı.");
    });
  }

  /** Çeviri akışı: eksik → kopya → bekliyor → hazır. */
  async function advanceTranslation() {
    const code = lang.value;
    const short = langInfo.value.short;
    const state = langState.value;
    translating.value = true;
    try {
      if (state === "eksik") {
        for (const ch of CHANNEL_IDS) store.setScope(ch, code, working.value[ch]?.tr || null);
        const saved = await store.saveDraft();
        if (saved === "conflict") return (conflictOpen.value = true);
        if (saved === "failed") return toast.error("Kaydedilemedi; kopya bu sekmede duruyor.");
        await store.setTranslationState(code, "kopya");
        toast.success(
          `${short}: kaynak dilden kopyalandı. Durum: ${TRANSLATION_STATES.kopya.label}.`
        );
      } else if (state === "kopya" || state === "hazir") {
        if (isDirty.value) {
          const saved = await store.saveDraft();
          if (saved === "conflict") return (conflictOpen.value = true);
          if (saved === "failed") return toast.error("Kaydedilemedi; önce taslağı kaydedin.");
        }
        const { contentChanged } = await store.setTranslationState(code, "bekliyor");
        toast.info(
          contentChanged
            ? `${short}: çeviri istendi. Çeviri geldi, gözden geçirin.`
            : `${short}: çeviri istendi. Durum: ${TRANSLATION_STATES.bekliyor.label}.`
        );
      } else {
        const open = sentChannels(event.value).map((c) => c.id);
        const errors = issues.value.filter(
          (i) => i.severity === "blocking" && i.lang === code && open.includes(i.channel)
        ).length;
        if (errors)
          return toast.error(`${short} içeriğinde ${errors} engelleyici hata var; önce düzeltin.`);
        await store.setTranslationState(code, "hazir");
        toast.success(`${short}: hazır olarak işaretlendi.`);
      }
    } catch (e) {
      toast.error(e.message || "Çeviri durumu değiştirilemedi.");
    } finally {
      translating.value = false;
      await nextTick();
      document.getElementById("nt-translation-next")?.focus();
    }
  }

  /** "Alana git": ilgili kanal/dil/alanı açıp odaklar. */
  async function gotoIssue(issue) {
    if (issue.channel) channel.value = issue.channel;
    if (issue.lang) lang.value = issue.lang;
    mode.value = "edit";
    await nextTick();
    await nextTick();
    const target =
      (issue.field &&
        document.getElementById(`nt-fld-${channel.value}-${lang.value}-${issue.field}`)) ||
      document.getElementById("nt-translation-next") ||
      document.getElementById(`nt-lang-${lang.value}`);
    target?.focus();
    target?.scrollIntoView({ block: "center" });
  }

  function openFull(options) {
    fullOptions.value = options;
    fullOpen.value = true;
  }

  function onConflict() {
    conflictOpen.value = true;
  }

  function answerLeave(ok) {
    leaveOpen.value = false;
    leaveResolve?.(ok);
    leaveResolve = null;
  }

  // Sürüm geçmişi aynı çalışma kopyasını paylaşır; başka yere çıkış değişiklikleri atar.
  onBeforeRouteLeave(async (to) => {
    if (!isDirty.value) return true;
    if (to.name === "NotificationTemplateHistory" && to.params.key === eventKey.value) return true;
    leaveOpen.value = true;
    const ok = await new Promise((resolve) => (leaveResolve = resolve));
    if (ok) store.discardChanges();
    return ok;
  });

  watch(eventKey, load, { immediate: true });
</script>

<template>
  <NtPage>
    <div ref="rootRef" class="nt-ed" :data-cols="cols" :data-narrow="narrow">
      <NtSubnav :event-key="eventKey" current="editor" />

      <ErrorState v-if="templateError" :error="templateError" @retry="load(eventKey)" />

      <div
        v-else-if="!ready || templateLoading"
        class="nt-surface nt-ed__loading"
        aria-hidden="true"
      >
        <Skeleton variant="title" />
        <Skeleton variant="row" :count="4" />
      </div>

      <template v-else>
        <NtEditorHeader
          :show-actions="!narrow"
          :actions="actions"
          @test="testOpen = true"
          @save="save"
          @publish="publishOpen = true"
          @channels="drawerOpen = true"
        />

        <div class="nt-ed__banners">
          <NtNote v-if="!canEdit" icon="lock">
            <strong>Salt okunur görünüm.</strong> İçerikleri ve önizlemeyi inceleyebilirsiniz;
            alanlar kilitli. Düzenlemek için İçerik yöneticisi ya da Süper admin rolü gerekir.
          </NtNote>
          <NtNote v-if="saveFailed" tone="err" alert>
            <strong>Kaydedilemedi.</strong> Değişiklikleriniz bu sekmede duruyor; bağlantı düzelince
            yeniden deneyin.
            <template #action>
              <button
                id="nt-retry-save"
                type="button"
                class="hdr-btn-outlined nt-btn--sm"
                @click="save"
              >
                Yeniden dene
              </button>
            </template>
          </NtNote>
          <NtNote v-if="conflict" tone="err" alert>
            <strong>Başkası değiştirdi.</strong>
            {{ conflict.saved_by || "Başka bir yönetici" }} bu taslağı değiştirdi; kaydınız
            yazılmadı.
            <template #action>
              <button
                type="button"
                class="hdr-btn-outlined nt-btn--sm"
                data-resolve-conflict
                @click="conflictOpen = true"
              >
                Çakışmayı çöz
              </button>
            </template>
          </NtNote>
          <NtNote v-if="event.review_state === 'onay-bekliyor'" tone="info" icon="clock">
            <strong>Onay bekliyor.</strong> Süper admin yayınlayana kadar yayındaki sürüm değişmez.
            <template v-if="publishMode === 'publish'"> Yayınla ile onaylayabilirsiniz.</template>
          </NtNote>
        </div>

        <BaseSegmented v-if="cols === 1" v-model="mode" class="nt-ed__mode" :options="MODES" />

        <div class="nt-ed__grid">
          <aside v-if="cols === 3" class="nt-ed__vars nt-surface" aria-label="Değişkenler">
            <NtVariables
              :variables="variables"
              :required="required"
              :used="used"
              :channel-label="channelInfo.label"
              :can-insert="canEdit && !!fields"
              @insert="insertVariable"
            />
          </aside>

          <section v-show="cols > 1 || mode === 'edit'" class="nt-ed__main nt-surface">
            <NtTabs
              v-model="channel"
              :tabs="channelTabs"
              label="Kanal"
              prefix="nt-chan"
              panel="nt-ed-panel"
            />
            <NtTabs
              v-model="lang"
              :tabs="langTabs"
              label="Dil"
              prefix="nt-lang"
              panel="nt-ed-panel"
              look="pill"
            />
            <div
              id="nt-ed-panel"
              class="nt-ed__panel"
              role="tabpanel"
              :aria-labelledby="`nt-chan-${channel}`"
            >
              <NtTranslationFlow
                v-if="!langInfo.source"
                :lang="langInfo"
                :state="langState"
                :can-edit="canEdit"
                :busy="translating || saving"
                @advance="advanceTranslation"
              />
              <NtFieldPanel
                ref="panelRef"
                v-model:html-mode="htmlMode"
                :channel="channelInfo"
                :lang="langInfo"
                :fields="fields"
                :issues="scopeIssues"
                :variables="variables"
                :required="required"
                :known="known"
                :show-variables-button="cols < 3"
                @open-variables="variablesOpen = true"
              />
            </div>
          </section>

          <div v-show="cols > 1 || mode === 'preview'" class="nt-ed__preview">
            <NtPreview
              :event="event"
              :tree="working"
              :channel="channelInfo"
              :lang="lang"
              :variables="variables"
              :required="required"
              :issues="issues"
              @fullscreen="openFull"
            />
          </div>
        </div>

        <!-- Dar alan: tek eylem çubuğu (Test gönder → Kaydet → Yayınla) -->
        <div v-if="narrow" class="nt-ed__bar">
          <p v-if="actions.reason" id="nt-ed-bar-reason" class="nt-hint">{{ actions.reason }}</p>
          <div class="nt-ed__bar-row">
            <button
              type="button"
              class="hdr-btn-outlined"
              data-act="test"
              :disabled="actions.testDisabled"
              @click="testOpen = true"
            >
              Test gönder
            </button>
            <button
              type="button"
              class="hdr-btn-outlined"
              data-act="save"
              :disabled="actions.saveDisabled"
              @click="save"
            >
              Kaydet
            </button>
            <button
              type="button"
              class="hdr-btn-primary"
              data-act="publish"
              :disabled="actions.publishDisabled"
              :aria-describedby="actions.reason ? 'nt-ed-bar-reason' : undefined"
              @click="publishOpen = true"
            >
              {{ actions.publishLabel }}
            </button>
          </div>
        </div>

        <NtOverlay
          v-model:open="variablesOpen"
          variant="drawer"
          title="Değişkenler"
          :subtitle="`${channelInfo.label} kanalı için`"
          :return-focus="() => rootRef?.querySelector('[data-variables-btn]')"
        >
          <NtVariables
            plain
            :variables="variables"
            :required="required"
            :used="used"
            :channel-label="channelInfo.label"
            :can-insert="canEdit && !!fields"
            @insert="insertVariable"
          />
        </NtOverlay>

        <NtChannelDrawer v-model:open="drawerOpen" :event="event" />
        <NtPublishDialog
          v-model:open="publishOpen"
          :issues="issues"
          @goto="gotoIssue"
          @conflict="onConflict"
        />
        <NtTestDialog v-model:open="testOpen" :channel="channel" :lang="lang" :issues="issues" />
        <NtConflictDialog v-model:open="conflictOpen" />
        <NtFullPreviewDialog
          v-model:open="fullOpen"
          :event="event"
          :tree="working"
          :channel="channelInfo"
          :variables="variables"
          :required="required"
          :options="fullOptions"
        />
      </template>
    </div>

    <ConfirmDialog
      :open="leaveOpen"
      tone="warning"
      title="Kaydedilmemiş değişiklikler var"
      message="Bu sayfadan çıkarsanız kaydedilmemiş değişiklikleriniz kaybolur."
      confirm-label="Çık"
      cancel-label="Düzenlemeye dön"
      @confirm="answerLeave(true)"
      @cancel="answerLeave(false)"
    />
  </NtPage>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/media" as media;

  .nt-ed {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  .nt-ed__loading {
    padding: 16px;
  }

  .nt-ed__banners {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &:empty {
      display: none;
    }
  }

  .nt-ed__mode {
    max-width: 420px;
  }

  .nt-ed__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    gap: 16px;
  }

  [data-cols="2"] .nt-ed__grid {
    grid-template-columns: minmax(454px, 1fr) 360px;
  }

  [data-cols="3"] .nt-ed__grid {
    grid-template-columns: 240px minmax(472px, 1fr) 380px;
  }

  .nt-ed__vars {
    padding: 14px;
  }

  .nt-ed__main {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 14px 16px 16px;
    container-type: inline-size;
  }

  .nt-ed__panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
    padding-top: 12px;
    border-top: 1px solid var(--nt-line);
  }

  .nt-ed__preview {
    min-width: 0;
  }

  // Yan paneller yalnız görünüme sığacak yükseklikte yapışkan olur.
  @media (min-height: 1000px) {
    [data-cols="2"] .nt-ed__preview,
    [data-cols="3"] .nt-ed__preview,
    [data-cols="3"] .nt-ed__vars {
      position: sticky;
      top: media.$m-sticky-top;
    }
  }

  // Tek eylem çubuğu: kaydırma kabının altına, mobil gezinme çubuğunun ÜSTÜNE yapışır.
  .nt-ed__bar {
    position: sticky;
    bottom: 0;
    z-index: 20;

    @media (max-width: media.$m-bp-md) {
      bottom: calc(#{media.$m-tabbar-h} + env(safe-area-inset-bottom));
    }

    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0 -16px -16px;
    padding: 8px 16px;
    border-top: 1px solid var(--nt-line);
    background: var(--nt-bg);
  }

  .nt-ed__bar-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  // Odaklanan alan yapışkan çubuğun altında kalmasın (WCAG 2.4.11).
  [data-narrow="true"] :deep(:is(input, textarea, select, button, a, [contenteditable])) {
    scroll-margin-block: 72px 150px;
  }
</style>
