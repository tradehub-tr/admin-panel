<script setup>
  /**
   * Bildirim şablonları · Olaylar ve kanallar.
   *
   * İnce kabuk: store + router. Sayaçlar, arama ve filtre olay listesinden
   * türer; tablo ↔ kart seçimi sayfaya KALAN genişliğe göre yapılır (panel
   * kabuğu 280px aldığı için viewport sorgusu yanıltır).
   */
  import { computed, nextTick, onMounted, ref } from "vue";
  import { storeToRefs } from "pinia";

  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";
  import EmptyState from "@/components/logistics/EmptyState.vue";
  import ErrorState from "@/components/logistics/ErrorState.vue";
  import NtPage from "@/components/notifications/NtPage.vue";
  import NtChannelDrawer from "@/components/notifications/events/NtChannelDrawer.vue";
  import NtEventCards from "@/components/notifications/events/NtEventCards.vue";
  import NtEventTable from "@/components/notifications/events/NtEventTable.vue";
  import NtFilters from "@/components/notifications/events/NtFilters.vue";
  import NtStats from "@/components/notifications/events/NtStats.vue";
  import { useElementWidth } from "@/composables/notifications/useElementWidth";
  import { useEventRows } from "@/composables/notifications/useEventRows";
  import { CHANNEL_STATES } from "@/constants/notificationTemplates";
  import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
  import { listCountLabel } from "@/utils/notificationTemplates/catalog";

  /** Bu genişliğin altında tablo karta döner. */
  const CARD_BREAKPOINT = 640;

  const store = useNotificationTemplatesStore();
  const {
    events,
    eventsLoading,
    eventsLoaded,
    eventsError,
    filters,
    stats,
    filteredEvents,
    visibleEvents,
    filterChips,
    remaining,
    canEdit,
  } = storeToRefs(store);

  const rootRef = ref(null);
  const listRef = ref(null);
  const { width } = useElementWidth(rootRef);
  const compact = computed(() => width.value < CARD_BREAKPOINT);

  const { groups } = useEventRows(visibleEvents, filteredEvents);

  const expanded = ref(new Set());
  const drawerKey = ref(null);
  const drawerOpen = ref(false);
  const drawerEvent = computed(() => (drawerKey.value ? store.eventByKey(drawerKey.value) : null));

  const legend = Object.entries(CHANNEL_STATES).map(([id, def]) => ({ id, ...def }));

  const countLabel = computed(() =>
    eventsLoading.value && !eventsLoaded.value
      ? "Yükleniyor"
      : listCountLabel({
          total: events.value.length,
          matched: filteredEvents.value.length,
          shown: visibleEvents.value.length,
          filtered: filterChips.value.length > 0,
        })
  );
  const listError = computed(() => (eventsError.value ? { message: eventsError.value } : null));
  const showSkeleton = computed(() => eventsLoading.value && !listError.value);

  function toggleExpanded(key) {
    const next = new Set(expanded.value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    expanded.value = next;
  }

  function openDrawer(key) {
    drawerKey.value = key;
    drawerOpen.value = true;
  }

  /** Sayaca basınca liste süzülür; etkin sayaca ikinci basış filtreyi kaldırır. */
  function toggleStat(id, wasOn) {
    if (id === "total") return store.clearFilters();
    if (["email", "push", "sms"].includes(id)) return store.setFilter("channel", wasOn ? "" : id);
    if (id === "published") return store.setFilter("publish", wasOn ? "" : "yayinda");
    if (id === "draft") return store.setFilter("publish", wasOn ? "" : "taslak");
    if (id === "missing") return store.setFilter("translation", wasOn ? "" : "var");
  }

  async function showMore() {
    const before = visibleEvents.value.length;
    store.showMore();
    await nextTick();
    // Odak yeni gelen ilk olayın ayrıntı düğmesine geçer (klavye akışı kopmasın).
    listRef.value?.querySelectorAll("[aria-controls^='nt-detail-']")[before]?.focus();
  }

  function load() {
    store.fetchEvents().catch(() => {});
  }

  onMounted(() => {
    if (!eventsLoaded.value) load();
  });
</script>

<template>
  <NtPage>
    <div ref="rootRef" class="nt-events">
      <div>
        <h1 class="nt-h1">Olaylar ve kanallar</h1>
        <p v-if="!compact" class="nt-sub">
          Hangi olay hangi kanaldan gider, kullanıcı neyi kapatabilir. Varsayılan kanal uygulama
          içi; e-posta istisna ve maliyetli.
        </p>
      </div>

      <NtStats :stats="stats" :filters="filters" :compact="compact" @toggle="toggleStat" />

      <NtFilters
        :filters="filters"
        :chips="filterChips"
        :compact="compact"
        @set="store.setFilter"
        @clear="store.clearFilters"
      />

      <div class="nt-events__meta">
        <p class="nt-sub" role="status">{{ countLabel }}</p>
        <ul class="nt-legend" aria-label="Kanal durumu göstergesi">
          <li v-for="item in legend" :key="item.id">
            <span class="nt-legend__mark" :class="`is-${item.id}`" aria-hidden="true">
              <AppIcon :name="item.icon" :size="11" />
            </span>
            {{ item.label }}
          </li>
        </ul>
      </div>

      <ErrorState v-if="listError" :error="listError" @retry="load" />

      <div v-else-if="showSkeleton" class="nt-surface nt-events__skeleton" aria-hidden="true">
        <Skeleton variant="row" :count="6" />
      </div>

      <EmptyState
        v-else-if="!filteredEvents.length"
        :filtered="filterChips.length > 0 || events.length === 0"
        entity="olay"
        @clear-filters="store.clearFilters"
      />

      <div v-else ref="listRef">
        <NtEventCards
          v-if="compact"
          :groups="groups"
          :expanded="expanded"
          :can-edit="canEdit"
          @toggle="toggleExpanded"
          @channels="openDrawer"
        />
        <NtEventTable
          v-else
          :groups="groups"
          :expanded="expanded"
          :can-edit="canEdit"
          :width="width"
          @toggle="toggleExpanded"
          @channels="openDrawer"
        />
        <div v-if="remaining > 0" class="nt-events__more">
          <button type="button" class="hdr-btn-outlined" @click="showMore">
            Daha fazla göster ({{ remaining }} olay kaldı)
          </button>
        </div>
      </div>
    </div>

    <NtChannelDrawer v-model:open="drawerOpen" :event="drawerEvent" />
  </NtPage>
</template>

<style scoped lang="scss">
  .nt-events {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  .nt-events__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 16px;
  }

  .nt-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
    color: var(--nt-fg-2);

    li {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }

  .nt-legend__mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 18px;
    border: 1px solid var(--nt-field-line);
    border-radius: 4px;

    &.is-zorunlu {
      border-color: var(--nt-brand-line);
      background: var(--nt-brand-bg);
    }

    &.is-kapali {
      border-style: dashed;
      color: var(--nt-muted);
    }
  }

  .nt-events__skeleton {
    padding: 12px;
  }

  .nt-events__more {
    display: flex;
    justify-content: center;
    margin-top: 14px;
  }
</style>
