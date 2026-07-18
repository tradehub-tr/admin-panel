<script setup>
  import { ref, onMounted, computed } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { useReservationStore } from "@/stores/reservation";
  import { usePageTour } from "@/composables/usePageTour";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();

  // Sayfa-içi onboarding: müsaitlik slotları formu → sekmeler → liste/durum.
  usePageTour("availability", () => [
    {
      target: '[data-tour="avl-form"]',
      title: t("tourSteps.page.avlForm_t"),
      desc: t("tourSteps.page.avlForm_d"),
    },
    {
      target: '[data-tour="avl-tabs"]',
      title: t("tourSteps.page.avlTabs_t"),
      desc: t("tourSteps.page.avlTabs_d"),
    },
    {
      target: '[data-tour="avl-list"]',
      title: t("tourSteps.page.avlList_t"),
      desc: t("tourSteps.page.avlList_d"),
    },
  ]);
  const store = useReservationStore();
  const {
    slots,
    reservations,
    loadingSlots,
    loadingReservations,
    saving,
    error,
    activeReservationsCount,
  } = storeToRefs(store);

  const activeTab = ref("slots"); // 'slots' | 'reservations'

  // Yeni slot form state
  const formStart = ref("");
  const formEnd = ref("");
  const formNotes = ref("");
  const showForm = ref(false);
  const includePast = ref(false);

  // Bugünün başlangıcı — onMounted'da set edilir (computed içinde `new Date()`
  // yasak; gün etiketleri buna göre reaktif hesaplanır).
  const todayStart = ref(null);

  // ── Tarih yardımcıları ──────────────────────────────────────────────
  function parseDate(v) {
    return new Date(String(v).replace(" ", "T"));
  }
  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function fmtTime(v) {
    const d = parseDate(v);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function dayKey(d) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  // Slot/rezervasyon dizisini güne göre gruplar; her grup sticky başlık taşır.
  function groupByDay(list) {
    const groups = new Map();
    for (const item of list) {
      const d = parseDate(item.start_at);
      const key = dayKey(d);
      if (!groups.has(key)) groups.set(key, { key, date: d, items: [] });
      groups.get(key).items.push(item);
    }
    const todayKey = todayStart.value ? dayKey(todayStart.value) : null;
    const tomorrow = todayStart.value ? new Date(todayStart.value.getTime() + 864e5) : null;
    const tomorrowKey = tomorrow ? dayKey(tomorrow) : null;

    return [...groups.values()]
      .sort((a, b) => a.date - b.date)
      .map((g) => ({
        key: g.key,
        items: g.items,
        count: g.items.length,
        label: g.date.toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        weekday: g.date.toLocaleDateString("tr-TR", { weekday: "long" }),
        relative:
          g.key === todayKey
            ? t("availability.today")
            : g.key === tomorrowKey
              ? t("availability.tomorrow")
              : "",
      }));
  }

  const groupedSlots = computed(() => groupByDay(slots.value));

  const activeReservations = computed(() =>
    reservations.value.filter((r) => r.status === "Active")
  );
  const cancelledReservations = computed(() =>
    reservations.value.filter((r) => r.status !== "Active")
  );
  const groupedActiveReservations = computed(() => groupByDay(activeReservations.value));

  const openSlotsCount = computed(() => slots.value.filter((s) => s.status === "Open").length);

  function defaultSlotStart() {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16); // datetime-local format
  }

  function defaultSlotEnd() {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  }

  function openForm() {
    formStart.value = defaultSlotStart();
    formEnd.value = defaultSlotEnd();
    formNotes.value = "";
    showForm.value = true;
  }

  async function submitForm() {
    if (!formStart.value || !formEnd.value) return;
    try {
      await store.createSlot({
        start_at: formStart.value,
        end_at: formEnd.value,
        notes: formNotes.value,
      });
      showForm.value = false;
    } catch {
      // error store'da
    }
  }

  async function handleDelete(slotId) {
    if (!confirm(t("availability.confirmDeleteSlot"))) return;
    try {
      await store.deleteSlot(slotId);
    } catch {
      // error
    }
  }

  async function handleCancel(resId) {
    if (!confirm(t("availability.confirmCancelReservation"))) return;
    try {
      await store.cancelReservation(resId);
    } catch {
      // error
    }
  }

  async function refresh() {
    await Promise.all([
      store.fetchSlots(includePast.value),
      store.fetchReservations(includePast.value),
    ]);
  }

  onMounted(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    todayStart.value = d;
    refresh();
  });
</script>

<template>
  <div class="avl">
    <!-- Başlık -->
    <header class="avl__head">
      <div class="min-w-0">
        <h1 class="text-lg font-bold text-gray-800">{{ t("availability.title") }}</h1>
        <p class="text-xs text-gray-500 mt-0.5">{{ t("availability.subtitle") }}</p>
      </div>
      <div class="avl__head-actions">
        <label class="flex items-center gap-1.5 text-xs text-gray-600 select-none">
          <input v-model="includePast" type="checkbox" class="rounded" @change="refresh" />
          {{ t("availability.showPast") }}
        </label>
        <button
          class="avl__refresh"
          :disabled="loadingSlots || loadingReservations"
          @click="refresh"
        >
          <AppIcon name="refresh-cw" :size="14" :class="{ 'avl__spin': loadingSlots }" />
          <span>{{ t("availability.refresh") }}</span>
        </button>
      </div>
    </header>

    <!-- Hata -->
    <div v-if="error" class="avl__error">{{ error }}</div>

    <!-- Tabs -->
    <div class="avl__tabs" data-tour="avl-tabs" role="tablist">
      <button
        class="avl__tab"
        :class="{ 'avl__tab--active': activeTab === 'slots' }"
        role="tab"
        :aria-selected="activeTab === 'slots'"
        @click="activeTab = 'slots'"
      >
        <span class="avl__tab-label">{{ t("availability.slotsTab") }}</span>
        <span class="avl__tab-count">{{ slots.length }}</span>
      </button>
      <button
        class="avl__tab"
        :class="{ 'avl__tab--active': activeTab === 'reservations' }"
        role="tab"
        :aria-selected="activeTab === 'reservations'"
        @click="activeTab = 'reservations'"
      >
        <span class="avl__tab-label">{{ t("availability.reservationsTab") }}</span>
        <span
          class="avl__tab-count"
          :title="
            t('availability.tabReservations', {
              active: activeReservationsCount,
              total: reservations.length,
            })
          "
          >{{ reservations.length }}</span
        >
      </button>
    </div>

    <!-- SLOTS TAB -->
    <div v-if="activeTab === 'slots'" data-tour="avl-list">
      <!-- Aksiyon çubuğu: özet solda, buton sağda (simetrik) -->
      <div class="avl__toolbar" data-tour="avl-form">
        <p class="avl__summary">
          <template v-if="slots.length">{{
            t("availability.openSlotsSummary", { n: openSlotsCount })
          }}</template>
          <template v-else>&nbsp;</template>
        </p>
        <button class="avl__primary" @click="openForm">
          <AppIcon name="plus" :size="16" />
          <span>{{ t("availability.newSlotLabel") }}</span>
        </button>
      </div>

      <!-- Form -->
      <transition name="avl-form">
        <div v-if="showForm" class="avl__form">
          <h3 class="text-sm font-semibold text-gray-800 mb-3">
            {{ t("availability.newSlotFormTitle") }}
          </h3>
          <div class="avl__form-grid">
            <div>
              <label class="avl__label">{{ t("availability.start") }}</label>
              <input v-model="formStart" type="datetime-local" class="avl__input" />
            </div>
            <div>
              <label class="avl__label">{{ t("availability.end") }}</label>
              <input v-model="formEnd" type="datetime-local" class="avl__input" />
            </div>
          </div>
          <div class="mt-3">
            <label class="avl__label">{{ t("availability.note") }}</label>
            <input
              v-model="formNotes"
              type="text"
              :placeholder="t('availability.notePlaceholder')"
              class="avl__input"
            />
          </div>
          <div class="flex gap-2 justify-end mt-4">
            <button class="avl__ghost" @click="showForm = false">
              {{ t("availability.cancel") }}
            </button>
            <button :disabled="saving" class="avl__primary avl__primary--sm" @click="submitForm">
              {{ saving ? t("availability.saving") : t("availability.create") }}
            </button>
          </div>
        </div>
      </transition>

      <!-- Slot list -->
      <div v-if="loadingSlots && slots.length === 0" class="avl__loading">
        {{ t("availability.loading") }}
      </div>

      <!-- Boş durum -->
      <div v-else-if="slots.length === 0" class="avl__empty">
        <div class="avl__empty-icon"><AppIcon name="calendar" :size="30" /></div>
        <p class="avl__empty-title">{{ t("availability.noSlots") }}</p>
        <p class="avl__empty-hint">{{ t("availability.noSlotsHint") }}</p>
        <button class="avl__primary mt-1" @click="openForm">
          <AppIcon name="plus" :size="16" />
          <span>{{ t("availability.newSlotLabel") }}</span>
        </button>
      </div>

      <!-- Gün-gruplu slot listesi -->
      <div v-else class="avl__groups">
        <section v-for="g in groupedSlots" :key="g.key" class="avl__group">
          <div class="avl__day">
            <div class="avl__day-label">
              <span class="avl__day-date">{{ g.label }}</span>
              <span class="avl__day-weekday">{{ g.weekday }}</span>
              <span v-if="g.relative" class="avl__day-rel">{{ g.relative }}</span>
            </div>
            <span class="avl__day-count">{{ g.count }}</span>
          </div>

          <ul class="avl__rows">
            <li
              v-for="s in g.items"
              :key="s.id"
              class="avl__row"
              :class="{ 'avl__row--reserved': !!s.reservation }"
            >
              <span class="avl__time">
                <AppIcon name="clock" :size="15" class="avl__time-icon" />
                {{ fmtTime(s.start_at) }}<span class="avl__dash">–</span>{{ fmtTime(s.end_at) }}
              </span>

              <div class="avl__row-body">
                <p v-if="s.notes" class="avl__note">{{ s.notes }}</p>
                <p v-if="s.reservation" class="avl__reserved-by">
                  <AppIcon name="lock" :size="12" />
                  {{ t("availability.reservedBy") }}
                  <strong>{{ s.reservation.buyer_name }}</strong>
                </p>
              </div>

              <span
                class="avl__badge"
                :class="s.status === 'Open' ? 'avl__badge--open' : 'avl__badge--muted'"
              >
                {{ s.status }}
              </span>

              <button
                class="avl__del"
                :disabled="!!s.reservation"
                :title="
                  s.reservation
                    ? t('availability.cannotDeleteReserved')
                    : t('availability.deleteSlotTitle')
                "
                @click="handleDelete(s.id)"
              >
                <AppIcon name="trash-2" :size="15" />
                <span class="avl__del-text">{{ t("availability.delete") }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- RESERVATIONS TAB -->
    <div v-else-if="activeTab === 'reservations'">
      <div v-if="loadingReservations && reservations.length === 0" class="avl__loading">
        {{ t("availability.loading") }}
      </div>

      <div v-else-if="reservations.length === 0" class="avl__empty">
        <div class="avl__empty-icon"><AppIcon name="mail-open" :size="30" /></div>
        <p class="avl__empty-title">{{ t("availability.noReservations") }}</p>
        <p class="avl__empty-hint">{{ t("availability.noReservationsHint") }}</p>
      </div>

      <template v-else>
        <!-- Aktif rezervasyonlar — gün gruplu -->
        <h2 class="avl__section-title">{{ t("availability.active") }}</h2>
        <p v-if="activeReservations.length === 0" class="avl__section-empty">
          {{ t("availability.noActiveReservations") }}
        </p>
        <div v-else class="avl__groups mb-6">
          <section v-for="g in groupedActiveReservations" :key="g.key" class="avl__group">
            <div class="avl__day">
              <div class="avl__day-label">
                <span class="avl__day-date">{{ g.label }}</span>
                <span class="avl__day-weekday">{{ g.weekday }}</span>
                <span v-if="g.relative" class="avl__day-rel">{{ g.relative }}</span>
              </div>
              <span class="avl__day-count">{{ g.count }}</span>
            </div>
            <ul class="avl__rows">
              <li
                v-for="r in g.items"
                :key="r.id"
                class="avl__row avl__row--reserved"
              >
                <span class="avl__avatar">
                  {{ (r.counterpart_name || "A").charAt(0).toLocaleUpperCase("tr") }}
                </span>
                <div class="avl__row-body">
                  <p class="avl__name">{{ r.counterpart_name }}</p>
                  <p class="avl__note">{{ fmtTime(r.start_at) }} – {{ fmtTime(r.end_at) }}</p>
                </div>
                <span class="avl__badge avl__badge--open">{{ r.status }}</span>
                <button class="avl__del" @click="handleCancel(r.id)">
                  <AppIcon name="x" :size="15" />
                  <span class="avl__del-text">{{ t("availability.cancelReservation") }}</span>
                </button>
              </li>
            </ul>
          </section>
        </div>

        <!-- Geçmiş / iptal -->
        <template v-if="cancelledReservations.length > 0">
          <h2 class="avl__section-title">{{ t("availability.pastCancelled") }}</h2>
          <ul class="avl__rows avl__rows--flat">
            <li
              v-for="r in cancelledReservations"
              :key="r.id"
              class="avl__row avl__row--past"
            >
              <span class="avl__avatar avl__avatar--muted">
                {{ (r.counterpart_name || "A").charAt(0).toLocaleUpperCase("tr") }}
              </span>
              <div class="avl__row-body">
                <p class="avl__name">{{ r.counterpart_name }}</p>
                <p class="avl__note">{{ store.fmtSlot(r.start_at, r.end_at) }}</p>
              </div>
              <span
                class="avl__badge"
                :class="r.status === 'Cancelled' ? 'avl__badge--danger' : 'avl__badge--muted'"
              >
                {{ r.status }}
              </span>
            </li>
          </ul>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .avl {
    max-width: 56rem;
    margin: 0 auto;
    padding: 1.5rem;
  }

  // ── Başlık ──
  .avl__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  .avl__head-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }
  .avl__refresh {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: $brand;
    transition: color $t-fast;
    &:hover:not(:disabled) {
      color: color-mix(in srgb, $brand, #000 15%);
    }
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
    @include dark {
      color: $brand-light;
    }
  }
  .avl__spin {
    animation: avl-spin 0.8s linear infinite;
  }
  @keyframes avl-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .avl__error {
    margin-bottom: 1rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    color: $c-error;
    background: rgba($c-error, 0.08);
    border: 1px solid rgba($c-error, 0.25);
  }

  // ── Tabs ──
  .avl__tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid $l-border;
    margin-bottom: 1rem;
    // Aşırı dar ekranda kırpmak yerine yatay kaydır (başlıklar tek satır kalır)
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
    @include dark {
      border-color: $d-border;
    }
  }
  .avl__tab {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    flex-shrink: 0;
    padding: 0.5rem 0.85rem;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    color: $l-text-500;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition:
      color $t-fast,
      border-color $t-fast;
    &:hover {
      color: $l-text-700;
    }
    @include dark {
      color: $d-text-muted;
      &:hover {
        color: $d-text;
      }
    }
  }
  .avl__tab--active {
    color: $brand;
    border-color: $brand;
    font-weight: 600;
    @include dark {
      color: $brand-light;
      border-color: $brand-light;
    }
  }
  .avl__tab-count {
    display: inline-grid;
    place-items: center;
    min-width: 1.35rem;
    height: 1.35rem;
    padding: 0 0.35rem;
    font-size: 0.6875rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    border-radius: 999px;
    color: $l-text-500;
    background: $l-bg-muted;
    transition:
      color $t-fast,
      background $t-fast;
    @include dark {
      color: $d-text-muted;
      background: $d-bg-elevated;
    }
  }
  .avl__tab--active .avl__tab-count {
    color: $brand-ink;
    background: $brand;
    @include dark {
      color: $brand-ink;
      background: $brand-light;
    }
  }

  // ── Aksiyon çubuğu (özet + primary) ──
  .avl__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .avl__summary {
    font-size: 0.8125rem;
    color: $l-text-500;
    min-width: 0;
    strong {
      color: $l-text-900;
      font-weight: 700;
    }
    @include dark {
      color: $d-text-muted;
      strong {
        color: $d-text-max;
      }
    }
  }

  // ── Butonlar ──
  .avl__primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.55rem 1rem;
    border-radius: 10px;
    color: $brand-ink;
    background: $brand;
    transition:
      background $t-fast,
      transform $t-fast;
    &:hover:not(:disabled) {
      background: color-mix(in srgb, $brand, #000 8%);
    }
    &:active:not(:disabled) {
      transform: translateY(1px);
    }
    &:disabled {
      opacity: 0.55;
      cursor: default;
    }
  }
  .avl__primary--sm {
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
  }
  .avl__ghost {
    font-size: 0.875rem;
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    color: $l-text-700;
    border: 1px solid $l-border-alt;
    transition: background $t-fast;
    &:hover {
      background: $l-bg-soft;
    }
    @include dark {
      color: $d-text;
      border-color: $d-border;
      &:hover {
        background: $d-bg-hover;
      }
    }
  }

  // ── Form ──
  .avl__form {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 12px;
    background: rgba($brand, 0.05);
    border: 1px solid rgba($brand, 0.2);
    @include dark {
      background: rgba($brand-light, 0.08);
      border-color: rgba($brand-light, 0.22);
    }
  }
  .avl__form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .avl__label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: $l-text-600;
    margin-bottom: 0.25rem;
    @include dark {
      color: $d-text-muted;
    }
  }
  .avl__input {
    width: 100%;
    min-width: 0;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border-radius: 8px;
    border: 1px solid $l-border;
    background: $l-bg;
    color: $l-text-900;
    transition: border-color $t-fast;
    &:focus {
      outline: none;
      border-color: $brand;
    }
    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text;
    }
  }

  // ── Boş / yükleniyor ──
  .avl__loading {
    padding: 3rem 1rem;
    text-align: center;
    font-size: 0.875rem;
    color: $l-text-500;
  }
  .avl__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
    padding: 3rem 1.5rem;
  }
  .avl__empty-icon {
    display: grid;
    place-items: center;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    color: $brand;
    background: rgba($brand, 0.1);
    margin-bottom: 0.25rem;
    @include dark {
      color: $brand-light;
      background: rgba($brand-light, 0.12);
    }
  }
  .avl__empty-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: $l-text-900;
    @include dark {
      color: $d-text-hi;
    }
  }
  .avl__empty-hint {
    font-size: 0.8125rem;
    color: $l-text-400;
    max-width: 22rem;
    line-height: 1.5;
    @include dark {
      color: $d-text-faint;
    }
  }

  // ── Gün grupları ──
  .avl__groups {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .avl__day {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.4rem 0.25rem 0.4rem 0;
    margin-bottom: 0.4rem;
    background: color-mix(in srgb, $l-bg 88%, transparent);
    backdrop-filter: blur(6px);
    @include dark {
      background: color-mix(in srgb, $d-bg 85%, transparent);
    }
  }
  .avl__day-label {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.4rem 0.5rem;
    min-width: 0;
  }
  .avl__day-date {
    font-size: 0.8125rem;
    font-weight: 700;
    color: $l-text-900;
    @include dark {
      color: $d-text-hi;
    }
  }
  .avl__day-weekday {
    font-size: 0.75rem;
    color: $l-text-400;
    text-transform: capitalize;
    @include dark {
      color: $d-text-faint;
    }
  }
  .avl__day-rel {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    color: $brand;
    background: rgba($brand, 0.12);
    @include dark {
      color: $brand-light;
      background: rgba($brand-light, 0.14);
    }
  }
  .avl__day-count {
    flex-shrink: 0;
    min-width: 1.4rem;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.05rem 0.45rem;
    border-radius: 999px;
    color: $l-text-500;
    background: $l-bg-muted;
    @include dark {
      color: $d-text-muted;
      background: $d-bg-elevated;
    }
  }

  // ── Satırlar ──
  .avl__rows {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .avl__row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    border-radius: 10px;
    background: $l-bg;
    border: 1px solid $l-border;
    transition:
      border-color $t-fast,
      background $t-fast;
    &:hover {
      border-color: color-mix(in srgb, $brand 40%, $l-border);
      background: $l-bg-soft;
    }
    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      &:hover {
        background: $d-bg-hover;
        border-color: color-mix(in srgb, $brand-light 40%, $d-border);
      }
    }
  }
  .avl__row--reserved {
    border-color: rgba($brand, 0.35);
    @include dark {
      border-color: rgba($brand-light, 0.32);
    }
  }
  .avl__row--past {
    opacity: 0.7;
    background: $l-bg-soft;
    @include dark {
      background: $d-bg;
    }
  }

  .avl__time {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: $l-text-900;
    @include dark {
      color: $d-text-max;
    }
  }
  .avl__time-icon {
    color: $brand;
    @include dark {
      color: $brand-light;
    }
  }
  .avl__dash {
    margin: 0 0.35rem;
    color: $l-text-400;
    @include dark {
      color: $d-text-faint;
    }
  }

  .avl__avatar {
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    flex-shrink: 0;
    border-radius: 50%;
    font-size: 0.875rem;
    font-weight: 700;
    color: $brand;
    background: rgba($brand, 0.12);
    @include dark {
      color: $brand-light;
      background: rgba($brand-light, 0.14);
    }
  }
  .avl__avatar--muted {
    color: $l-text-500;
    background: $l-bg-muted;
    @include dark {
      color: $d-text-muted;
      background: $d-bg-elevated;
    }
  }

  .avl__row-body {
    flex: 1 1 auto;
    min-width: 0;
  }
  .avl__name {
    font-size: 0.875rem;
    font-weight: 600;
    color: $l-text-900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    @include dark {
      color: $d-text-hi;
    }
  }
  .avl__note {
    font-size: 0.75rem;
    color: $l-text-500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    @include dark {
      color: $d-text-muted;
    }
  }
  .avl__reserved-by {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: $c-success;
    margin-top: 0.15rem;
    strong {
      font-weight: 700;
    }
  }

  .avl__badge {
    flex-shrink: 0;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.22rem 0.5rem;
    border-radius: 999px;
  }
  .avl__badge--open {
    color: $c-success;
    background: rgba($c-success, 0.14);
  }
  .avl__badge--muted {
    color: $l-text-500;
    background: $l-bg-muted;
    @include dark {
      color: $d-text-muted;
      background: $d-bg-elevated;
    }
  }
  .avl__badge--danger {
    color: $c-error;
    background: rgba($c-error, 0.12);
  }

  .avl__del {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.3rem 0.5rem;
    border-radius: 8px;
    color: $c-error;
    transition:
      background $t-fast,
      opacity $t-fast;
    &:hover:not(:disabled) {
      background: rgba($c-error, 0.1);
    }
    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }

  .avl__section-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: $l-text-500;
    margin-bottom: 0.5rem;
    @include dark {
      color: $d-text-muted;
    }
  }
  .avl__section-empty {
    font-size: 0.875rem;
    color: $l-text-400;
    margin-bottom: 1rem;
    @include dark {
      color: $d-text-faint;
    }
  }
  .avl__rows--flat {
    gap: 0.375rem;
  }

  // ── Form geçişi ──
  .avl-form-enter-active,
  .avl-form-leave-active {
    transition:
      opacity $t-fast,
      transform $t-fast;
  }
  .avl-form-enter-from,
  .avl-form-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }

  // ── Mobil ──
  @media (max-width: 767px) {
    .avl {
      padding: 1rem 0.25rem 1.25rem;
      margin: 0 -0.75rem;
    }
    .avl__head {
      flex-direction: column;
      gap: 0.75rem;
    }
    .avl__head-actions {
      width: 100%;
      justify-content: space-between;
    }
    .avl__toolbar {
      flex-wrap: wrap;
    }
    .avl__primary {
      // Mobilde birincil eylem tam genişlik → net dokunma hedefi
      flex: 1 1 auto;
      justify-content: center;
    }
    .avl__summary {
      flex: 1 0 100%;
      order: 2;
    }
    .avl__form-grid {
      grid-template-columns: 1fr;
    }
    // Satır: saat + badge üstte, not/sil alta düzgün sarsın
    .avl__row {
      flex-wrap: wrap;
      row-gap: 0.4rem;
    }
    .avl__row-body {
      flex-basis: 100%;
      order: 3;
    }
    .avl__del-text {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .avl__spin {
      animation: none;
    }
    .avl-form-enter-active,
    .avl-form-leave-active {
      transition: opacity $t-fast;
    }
    .avl-form-enter-from,
    .avl-form-leave-to {
      transform: none;
    }
  }
</style>
