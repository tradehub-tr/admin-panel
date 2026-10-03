<script setup>
  /**
   * Bildirim şablonları · Sürüm geçmişi (olay anahtarı route paramı).
   * Zaman çizelgesi + kapsamlı karşılaştırma + "Bu sürüme dön".
   */
  import { computed, nextTick, ref, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { useRoute } from "vue-router";

  import Skeleton from "@/components/common/Skeleton.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import NtPage from "@/components/notifications/NtPage.vue";
  import NtSubnav from "@/components/notifications/NtSubnav.vue";
  import NtCompare from "@/components/notifications/history/NtCompare.vue";
  import NtRestoreDialog from "@/components/notifications/history/NtRestoreDialog.vue";
  import NtTimeline from "@/components/notifications/history/NtTimeline.vue";
  import { useElementWidth } from "@/composables/notifications/useElementWidth";
  import { NOTIFICATION_TEMPLATE_POLICY } from "@/constants/notificationTemplatePolicy";
  import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
  import { sentChannels } from "@/utils/notificationTemplates/catalog";
  import { formatDateTime } from "@/utils/dateFormat";
  import { scopeChanges } from "@/utils/notificationTemplates/diff";

  const route = useRoute();
  const store = useNotificationTemplatesStore();
  const {
    template,
    versions,
    versionsTotal,
    versionsRemaining,
    versionsLoading,
    versionsError,
    versionContents,
    canRestore,
  } = storeToRefs(store);

  const rootRef = ref(null);
  const { width } = useElementWidth(rootRef);
  const wide = computed(() => width.value >= 900);

  const eventKey = computed(() => String(route.params.key || ""));
  const event = computed(() =>
    template.value?.event?.key === eventKey.value ? template.value.event : null
  );
  const variables = computed(() => template.value?.variables || []);
  const requiredByChannel = computed(() => template.value?.required_by_channel || {});

  const oldVersion = ref(null);
  const newVersion = ref(null);
  const channel = ref("");
  const lang = ref("tr");
  const restoreOpen = ref(false);
  const restoreTarget = ref(null);
  const loadError = ref(null);

  const nf = new Intl.NumberFormat("tr-TR");
  const SUFFIX = { draft: " (taslak)", live: " (yayında)" };

  const rows = computed(() =>
    versions.value.map((v, i) => ({
      version: v.version,
      status: v.status,
      date: formatDateTime(v.created_at),
      by: v.created_by,
      note: v.note,
      sends:
        v.send_count === null || v.send_count === undefined
          ? "henüz gönderilmedi"
          : `${nf.format(v.send_count)} gönderim`,
      prev: versions.value[i + 1]?.version ?? null,
      name: `v${v.version}${SUFFIX[v.status] || ""}`,
    }))
  );
  // Sunucunun sürüm listesinde taslak satırı yok; yayındakinden farklı kayıtlı taslak
  // olayın yayın durumundan okunur (sürüme dönüş onu ezer).
  const hasDraft = computed(() => !!event.value && event.value.publish?.state !== "yayinda");
  const loadingMore = ref(false);

  async function loadMore() {
    loadingMore.value = true;
    try {
      await store.loadMoreVersions(eventKey.value);
    } catch (e) {
      loadError.value = { code: e.code || "", message: e.message || "Sürümler yüklenemedi." };
    } finally {
      loadingMore.value = false;
    }
  }
  const contentOf = (version) =>
    version === null ? null : versionContents.value[`${eventKey.value}@${version}`] || null;
  const oldContent = computed(() => contentOf(oldVersion.value));
  const newContent = computed(() => contentOf(newVersion.value));
  const restoreContent = computed(() => contentOf(restoreTarget.value));
  const restoreReason = computed(
    () =>
      `Sürüme dönmek için yetki gerekir. ${store.reasonFor(NOTIFICATION_TEMPLATE_POLICY.restoreRequires)}`
  );

  async function ensureContents() {
    const wanted = [oldVersion.value, newVersion.value].filter((v) => v !== null);
    await Promise.all(wanted.map((v) => store.loadVersionContent(eventKey.value, v)));
  }

  /** Varsayılan kapsam: fark olan ilk kanal + dil. */
  function defaultScope() {
    const open = sentChannels(event.value);
    if (channel.value && open.some((c) => c.id === channel.value)) return;
    const first =
      oldContent.value && newContent.value
        ? scopeChanges(event.value, oldContent.value, newContent.value)[0]
        : null;
    channel.value = first?.channel || open[0]?.id || "email";
    lang.value = first?.lang || "tr";
  }

  async function select(version, { scroll = false } = {}) {
    const i = versions.value.findIndex((v) => v.version === version);
    if (i < 0) return;
    newVersion.value = version;
    oldVersion.value = versions.value[i + 1]?.version ?? null;
    await ensureContents();
    if (!scroll) return;
    await nextTick();
    const target = document.getElementById("nt-compare");
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start" });
  }

  async function load(key) {
    if (!key) return;
    loadError.value = null;
    channel.value = "";
    try {
      await Promise.all([store.loadTemplate(key), store.loadVersions(key, { force: true })]);
      const first = versions.value[0];
      newVersion.value = first?.version ?? null;
      oldVersion.value = versions.value[1]?.version ?? null;
      await ensureContents();
      defaultScope();
    } catch (e) {
      loadError.value = { code: e.code || "", message: e.message || "Sürümler yüklenemedi." };
    }
  }

  async function setNew(version) {
    newVersion.value = version;
    if (oldVersion.value === version || oldVersion.value === null) {
      const i = versions.value.findIndex((v) => v.version === version);
      oldVersion.value =
        versions.value[i + 1]?.version ??
        versions.value.find((v) => v.version !== version)?.version ??
        null;
    }
    await ensureContents();
  }

  async function setOld(version) {
    oldVersion.value = version;
    await ensureContents();
  }

  async function openRestore(version) {
    restoreTarget.value = version;
    await store.loadVersionContent(eventKey.value, version);
    restoreOpen.value = true;
  }

  async function onRestored() {
    const first = versions.value[0];
    if (first) await select(first.version);
  }

  watch(eventKey, load, { immediate: true });
</script>

<template>
  <NtPage>
    <div ref="rootRef" class="nt-hist" :class="{ 'nt-hist--wide': wide }">
      <NtSubnav :event-key="eventKey" current="history" />

      <ErrorState
        v-if="loadError || versionsError"
        :error="loadError || versionsError"
        @retry="load(eventKey)"
      />

      <div
        v-else-if="!event || (versionsLoading && !versions.length)"
        class="nt-surface nt-hist__loading"
        aria-hidden="true"
      >
        <Skeleton variant="title" />
        <Skeleton variant="row" :count="4" />
      </div>

      <template v-else>
        <div>
          <h1 class="nt-h1">Sürüm geçmişi</h1>
          <p class="nt-sub">
            {{ event.name }} <code>{{ event.key }}</code> için {{ versionsTotal }} sürüm. Bir sürümü
            seçip kanal ve dil kapsamında alan alan karşılaştırın.
            <template v-if="event.representative"> Geçmiş kayıtları temsilidir.</template>
          </p>
        </div>

        <div class="nt-hist__grid">
          <NtTimeline
            :versions="rows"
            :selected="newVersion"
            :event-key="eventKey"
            :can-restore="canRestore"
            :restore-reason="restoreReason"
            @compare="select($event, { scroll: true })"
            @restore="openRestore"
          >
            <template v-if="versionsRemaining" #after>
              <button
                type="button"
                class="hdr-btn-outlined nt-hist__more"
                data-versions-more
                :disabled="loadingMore"
                @click="loadMore"
              >
                {{
                  loadingMore ? "Yükleniyor" : `Daha fazla yükle (${versionsRemaining} sürüm daha)`
                }}
              </button>
            </template>
          </NtTimeline>
          <NtCompare
            v-if="channel"
            :event="event"
            :variables="variables"
            :required-by-channel="requiredByChannel"
            :versions="rows"
            :old-version="oldVersion"
            :new-version="newVersion"
            :old-content="oldContent"
            :new-content="newContent"
            :channel="channel"
            :lang="lang"
            @update:old-version="setOld"
            @update:new-version="setNew"
            @update:channel="channel = $event"
            @update:lang="lang = $event"
          />
        </div>

        <NtRestoreDialog
          v-model:open="restoreOpen"
          :event="event"
          :variables="variables"
          :required-by-channel="requiredByChannel"
          :version="restoreTarget"
          :content="restoreContent"
          :has-draft="hasDraft"
          :channel="channel"
          :lang="lang"
          @restored="onRestored"
        />
      </template>
    </div>
  </NtPage>
</template>

<style scoped lang="scss">
  .nt-hist {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  .nt-hist__more {
    width: 100%;
    margin-top: 8px;
  }

  .nt-hist__loading {
    padding: 16px;
  }

  .nt-hist__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    gap: 16px;
  }

  .nt-hist--wide .nt-hist__grid {
    grid-template-columns: 320px minmax(0, 1fr);
  }
</style>
