<script setup>
  import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { useBuyerMessagesStore } from "@/stores/buyerMessages";
  import { usePageTour } from "@/composables/usePageTour";
  import { sanitizeHtml } from "@/utils/sanitize";
  import AppIcon from "@/components/common/AppIcon.vue";
  import Skeleton from "@/components/common/Skeleton.vue";

  const { t } = useI18n();
  const store = useBuyerMessagesStore();

  // Sayfa-içi onboarding: gelen kutusu listesi → mesaj akışı → yazma alanı.
  usePageTour("buyer-messages", () => [
    {
      target: '[data-tour="bms-list"]',
      title: t("tourSteps.page.bmsList_t"),
      desc: t("tourSteps.page.bmsList_d"),
    },
    {
      target: '[data-tour="bms-thread"]',
      title: t("tourSteps.page.bmsThread_t"),
      desc: t("tourSteps.page.bmsThread_d"),
    },
    {
      target: '[data-tour="bms-composer"]',
      title: t("tourSteps.page.bmsComposer_t"),
      desc: t("tourSteps.page.bmsComposer_d"),
    },
  ]);
  const {
    sortedConversations,
    activeConversation,
    activeConversationId,
    activeMessages,
    loadingInbox,
    loadingMessages,
    sending,
    startingCall,
    error,
    totalUnread,
  } = storeToRefs(store);

  const draft = ref("");
  const threadEl = ref(null);
  const composerEl = ref(null);
  const search = ref("");

  // Composer tek satırdan başlar, yazdıkça içeriğe göre büyür (maks 128px), sonra
  // kendi içinde kaydırır. Sabit iki satır yerine simetrik, WhatsApp-benzeri his.
  function autoGrowComposer() {
    const el = composerEl.value;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  // V3 triyaj: Tümü / Okunmamış (Arşiv backend'de yok — dead tab eklenmedi)
  const inboxFilter = ref("all");
  const unreadConvCount = computed(
    () => sortedConversations.value.filter((c) => c.unread > 0).length
  );

  const filteredConversations = computed(() => {
    let list = sortedConversations.value;
    if (inboxFilter.value === "unread") list = list.filter((c) => c.unread > 0);
    const q = search.value.trim().toLocaleLowerCase("tr-TR");
    if (!q) return list;
    return list.filter((c) => {
      const hay = [c.buyerName, c.buyerEmail, c.lastMessage]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return hay.includes(q);
    });
  });

  // Avatar rengi isimden türetilir (deterministik) — tüm avatarlar tek sarı ton
  // yerine kişiye özel, tarama hızını artırır. Ton koyu (fg) / açık (bg) → ≥4.5:1.
  const AVATAR_PALETTE = [
    { bg: "#eef2ff", fg: "#4338ca" }, // indigo
    { bg: "#d1fae5", fg: "#047857" }, // emerald
    { bg: "#ffe4e6", fg: "#be123c" }, // rose
    { bg: "#fef3c7", fg: "#b45309" }, // amber
    { bg: "#ede9fe", fg: "#6d28d9" }, // violet
    { bg: "#cffafe", fg: "#0e7490" }, // cyan
  ];
  function avatarStyle(seed) {
    const s = String(seed || "");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const p = AVATAR_PALETTE[h % AVATAR_PALETTE.length];
    return { backgroundColor: p.bg, color: p.fg };
  }

  // Tarih ayracı etiketi: Bugün / Dün / "12 Mart"
  function dayLabel(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
    if (diffDays <= 0) return t("buyerMessages.today");
    if (diffDays === 1) return t("buyerMessages.yesterday");
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  }

  // Mesajlar + gün değişiminde tarih ayracı ekle (sep) — tek listede render.
  const threadItems = computed(() => {
    const items = [];
    let lastDay = null;
    for (const m of activeMessages.value) {
      const dayKey = m.timestamp ? new Date(m.timestamp).toDateString() : "no-date";
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        items.push({ type: "sep", id: `sep-${dayKey}`, label: dayLabel(m.timestamp) });
      }
      items.push({ type: "msg", id: m.id, m });
    }
    return items;
  });

  // Mobil master→detail: geri = aktif konuşmayı kapat (liste tekrar tam ekran).
  function goBackToList() {
    store.setActiveConversation(null);
  }

  async function selectConversation(id) {
    await store.setActiveConversation(id);
    await nextTick();
    scrollToBottom();
  }

  async function send() {
    const text = draft.value.trim();
    if (!text || !activeConversationId.value) return;
    try {
      await store.sendMessage(text);
      draft.value = "";
      await nextTick();
      autoGrowComposer();
      scrollToBottom();
    } catch {
      // store error state'inde gösteriliyor
    }
  }

  function onKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function scrollToBottom() {
    if (threadEl.value) {
      threadEl.value.scrollTop = threadEl.value.scrollHeight;
    }
  }

  function isNearBottom() {
    const el = threadEl.value;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  // Yeni mesaj geldiğinde: kullanıcı en alttaysa scroll'u alta indir.
  // Eski mesajları okuyorsa (yukarıda) dokunma.
  let prevMessageCount = 0;
  watch(activeMessages, async (newMsgs) => {
    const wasAtBottom = isNearBottom();
    const grew = newMsgs.length > prevMessageCount;
    prevMessageCount = newMsgs.length;
    await nextTick();
    if (grew && wasAtBottom) scrollToBottom();
  });

  // Konuşma değişince scroll'u sıfırla
  watch(activeConversationId, async () => {
    prevMessageCount = 0;
    await nextTick();
    scrollToBottom();
  });

  onMounted(() => {
    store.startPolling();
  });

  onUnmounted(() => {
    store.stopPolling();
  });
</script>

<template>
  <div class="buyer-messages h-[calc(100vh-64px)] flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
      <div>
        <h1 class="text-lg font-bold text-gray-800">{{ t("buyerMessages.title") }}</h1>
        <p class="text-xs text-gray-500">{{ t("buyerMessages.subtitle") }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span
          v-if="totalUnread > 0"
          class="text-xs font-medium px-2 py-1 rounded-full bg-brand-100 text-brand-800"
        >
          {{ totalUnread }} {{ t("buyerMessages.unread") }}
        </span>
        <button
          class="text-xs text-brand-800 hover:text-brand-900 font-medium"
          :disabled="loadingInbox"
          @click="store.fetchConversations()"
        >
          {{ loadingInbox ? t("buyerMessages.refreshing") : t("buyerMessages.refresh") }}
        </button>
      </div>
    </div>

    <!-- Hata -->
    <div v-if="error" class="px-6 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700">
      {{ error }}
    </div>

    <div class="flex-1 flex overflow-hidden">
      <!-- Inbox liste · mobilde konuşma seçilince gizlenir (master→detail) -->
      <aside
        class="w-full lg:w-80 border-r border-gray-200 bg-gray-50 flex-col"
        :class="activeConversationId ? 'hidden lg:flex' : 'flex'"
        data-tour="bms-list"
      >
        <div class="p-3 border-b border-gray-200 bg-white space-y-2.5">
          <!-- Triyaj segmenti: Tümü / Okunmamış -->
          <div class="bms-seg">
            <button
              type="button"
              :class="{ on: inboxFilter === 'all' }"
              @click="inboxFilter = 'all'"
            >
              {{ t("buyerMessages.filterAll") }}
              <span class="n">{{ sortedConversations.length }}</span>
            </button>
            <button
              type="button"
              :class="{ on: inboxFilter === 'unread' }"
              @click="inboxFilter = 'unread'"
            >
              {{ t("buyerMessages.filterUnread") }}
              <span v-if="unreadConvCount > 0" class="n on">{{ unreadConvCount }}</span>
            </button>
          </div>
          <div class="bms-search-field">
            <AppIcon name="search" :size="16" class="bms-search-field__icon" aria-hidden="true" />
            <input
              v-model="search"
              type="search"
              :placeholder="t('buyerMessages.searchPlaceholder')"
              :aria-label="t('buyerMessages.searchPlaceholder')"
              class="bms-search-field__input"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="loadingInbox && filteredConversations.length === 0" class="p-3">
            <Skeleton variant="row" :count="7" />
          </div>

          <div
            v-else-if="filteredConversations.length === 0 && inboxFilter === 'unread'"
            class="p-8 text-center text-sm text-gray-500"
          >
            <div class="mb-2 text-gray-300"><AppIcon name="check-circle" :size="32" /></div>
            <div>{{ t("buyerMessages.allRead") }}</div>
          </div>

          <div
            v-else-if="filteredConversations.length === 0"
            class="p-6 text-center text-sm text-gray-500"
          >
            <div class="mb-2"><AppIcon name="inbox" :size="32" /></div>
            <div>{{ t("buyerMessages.emptyTitle") }}</div>
            <div class="text-xs mt-1 text-gray-400">
              {{ t("buyerMessages.emptyHint") }}
            </div>
          </div>

          <button
            v-for="c in filteredConversations"
            :key="c.id"
            class="w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-white border-b border-gray-100 transition-colors"
            :class="{
              'bg-white border-l-4 border-l-brand-500': c.id === activeConversationId,
            }"
            @click="selectConversation(c.id)"
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
              :style="avatarStyle(c.buyerName || c.buyerEmail)"
            >
              {{ c.buyerInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <div
                  class="text-sm truncate"
                  :class="c.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'"
                >
                  {{ c.buyerName }}
                </div>
                <div
                  class="text-[10px] flex-shrink-0"
                  :class="c.unread > 0 ? 'text-brand-600 font-semibold' : 'text-gray-400'"
                >
                  {{ c.lastTime }}
                </div>
              </div>
              <div
                class="text-xs truncate mt-0.5"
                :class="c.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'"
              >
                {{ c.lastMessage || t("buyerMessages.emptyMessage") }}
              </div>
            </div>
            <span
              v-if="c.unread > 0"
              class="text-[10px] font-bold min-w-[20px] h-5 px-1.5 grid place-items-center rounded-full bg-brand-500 text-brand-ink flex-shrink-0"
            >
              {{ c.unread }}
            </span>
          </button>
        </div>
      </aside>

      <!-- Thread + composer · mobilde konuşma seçilince TAM EKRAN overlay (footer +
           tab bar dahil her şeyi kaplar); lg'de normal iki-panel akışında kalır. -->
      <main
        class="bg-white flex-col lg:flex-1"
        :class="
          activeConversationId ? 'fixed inset-0 z-[60] flex lg:static lg:z-auto' : 'hidden lg:flex'
        "
        data-tour="bms-thread"
      >
        <div
          v-if="!activeConversation"
          class="flex-1 flex items-center justify-center text-gray-400"
        >
          <div class="text-center">
            <div class="mb-3"><AppIcon name="message-circle" :size="48" /></div>
            <div class="text-sm">{{ t("buyerMessages.selectConversation") }}</div>
          </div>
        </div>

        <template v-else>
          <!-- Thread header -->
          <div class="px-4 lg:px-5 py-3 border-b border-gray-200 flex items-center gap-3">
            <!-- Geri (yalnız mobil): listeye dön -->
            <button
              type="button"
              class="lg:hidden w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 flex-shrink-0"
              :aria-label="t('buyerMessages.back')"
              @click="goBackToList"
            >
              <AppIcon name="arrow-left" :size="18" />
            </button>
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
              :style="avatarStyle(activeConversation.buyerName || activeConversation.buyerEmail)"
            >
              {{ activeConversation.buyerInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 truncate">
                {{ activeConversation.buyerName }}
              </div>
              <div class="text-xs text-gray-500 truncate">
                {{ activeConversation.buyerEmail }}
              </div>
            </div>
            <span
              class="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full flex-shrink-0"
              :class="{
                'bg-green-100 text-green-700': activeConversation.status === 'open',
                'bg-amber-100 text-amber-700': activeConversation.status === 'pending',
                'bg-gray-100 text-gray-600': activeConversation.status === 'resolved',
              }"
            >
              {{ activeConversation.status }}
            </span>
          </div>

          <!-- Mesajlar -->
          <div ref="threadEl" class="flex-1 overflow-y-auto px-4 lg:px-5 py-4 space-y-2 bg-gray-50">
            <div
              v-if="loadingMessages && activeMessages.length === 0"
              class="text-center text-sm text-gray-400 py-8"
            >
              {{ t("buyerMessages.loading") }}
            </div>
            <template v-else>
              <template v-for="item in threadItems" :key="item.id">
                <!-- Tarih ayracı (Bugün / Dün / gün) -->
                <div v-if="item.type === 'sep'" class="flex justify-center py-1">
                  <span class="bms-daysep">{{ item.label }}</span>
                </div>

                <!-- Mesaj balonu -->
                <div
                  v-else
                  class="flex"
                  :class="item.m.direction === 'me' ? 'justify-end' : 'justify-start'"
                >
                  <div
                    class="max-w-[78%] lg:max-w-[70%] rounded-2xl px-4 py-2 text-sm leading-snug shadow-sm"
                    :class="
                      item.m.direction === 'me'
                        ? 'bg-brand-500 text-brand-ink rounded-br-sm'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                    "
                  >
                    <!-- Image attachment — thumbnail, tıklayınca yeni sekmede orjinal -->
                    <a
                      v-if="item.m.attachmentType === 'image'"
                      :href="item.m.attachmentUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="block rounded-lg overflow-hidden no-underline mb-1"
                    >
                      <img
                        :src="item.m.attachmentUrl"
                        :alt="item.m.attachmentName"
                        class="block max-h-40 max-w-full lg:max-w-[240px] object-cover"
                      />
                    </a>
                    <!-- File attachment — indirme kartı -->
                    <a
                      v-else-if="item.m.attachmentType === 'file'"
                      :href="item.m.attachmentUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      :download="item.m.attachmentName"
                      class="inline-flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-xs no-underline mb-1 hover:bg-current/5 transition-colors"
                      :class="item.m.direction === 'me' ? 'text-white' : 'text-gray-700'"
                    >
                      <svg
                        class="w-4 h-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                      <span class="min-w-0">
                        <span class="block font-medium truncate">{{ item.m.attachmentName }}</span>
                        <span class="block text-[10px] opacity-70"
                          >{{ Math.round(item.m.attachmentSize / 1024) }} KB</span
                        >
                      </span>
                    </a>
                    <!--
                      Güvenli: textHtml store'daki linkify() çıktısı — tüm metin
                      escapeHtml() ile kaçışlanır, yalnızca escape edilmiş URL'lerle
                      güvenli <a> etiketi enjekte edilir (buyerMessages.js).
                    -->
                    <!-- eslint-disable vue/no-v-html -->
                    <!-- F-019: XSS koruması — sanitizeHtml ile sarıldı -->
                    <div
                      v-if="item.m.text"
                      class="whitespace-pre-wrap break-words"
                      v-html="sanitizeHtml(item.m.textHtml || item.m.text)"
                    ></div>
                    <!-- eslint-enable vue/no-v-html -->
                    <a
                      v-if="item.m.videoCallUrl"
                      :href="item.m.videoCallUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white no-underline hover:bg-green-600 transition-colors"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                        />
                      </svg>
                      {{ t("buyerMessages.joinCall") }}
                    </a>
                    <div
                      class="text-[10px] mt-1 opacity-70"
                      :class="item.m.direction === 'me' ? 'text-white/80' : 'text-gray-500'"
                    >
                      {{ item.m.time }}
                    </div>
                  </div>
                </div>
              </template>
            </template>
          </div>

          <!-- Composer · kamera ve input aynı eksende; gönder butonu input kabuğunun içinde. -->
          <div class="border-t border-gray-200 px-3 py-2.5 bg-white" data-tour="bms-composer">
            <div class="bms-composer-row">
              <button
                type="button"
                :disabled="startingCall || !activeConversationId"
                class="bms-icon-btn bms-icon-btn--ghost shrink-0"
                :title="t('buyerMessages.startVideoCall')"
                :aria-label="t('buyerMessages.startVideoCall')"
                @click="store.startVideoCall()"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </button>
              <div class="bms-input-shell">
                <textarea
                  ref="composerEl"
                  v-model="draft"
                  :disabled="sending"
                  rows="1"
                  data-tx-resize="off"
                  :placeholder="t('buyerMessages.composerPlaceholder')"
                  :aria-label="t('buyerMessages.composerPlaceholder')"
                  class="bms-input"
                  @input="autoGrowComposer"
                  @keydown="onKeydown"
                ></textarea>
                <button
                  type="button"
                  :disabled="sending || !draft.trim()"
                  class="bms-icon-btn bms-icon-btn--send shrink-0"
                  :title="t('buyerMessages.send')"
                  :aria-label="t('buyerMessages.send')"
                  @click="send"
                >
                  <svg
                    v-if="sending"
                    class="w-5 h-5 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" d="M12 3a9 9 0 1 0 9 9" />
                  </svg>
                  <svg
                    v-else
                    class="w-5 h-5 -ml-px"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M22 2 11 13" />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M22 2l-7 20-4-9-9-4 20-7z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "sass:color";

  /* Triyaj segmenti (Tümü / Okunmamış) */
  .bms-seg {
    display: flex;
    gap: 2px;
    padding: 3px;
    background: $l-bg-muted;
    border-radius: 10px;

    button {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 6px;
      border: none;
      border-radius: 7px;
      background: transparent;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 600;
      color: $l-text-500;
      cursor: pointer;
      transition:
        background $t-base,
        color $t-base;

      .n {
        font-size: 10.5px;
        font-weight: 700;
        min-width: 16px;
        padding: 0 5px;
        border-radius: 99px;
        background: rgba($l-text-500, 0.12);
        color: $l-text-500;

        &.on {
          background: $brand;
          color: $brand-ink;
        }
      }

      &.on {
        background: $l-bg;
        color: $l-text-900;
        box-shadow: 0 1px 3px rgba(#000, 0.1);
      }
    }
  }

  /* Arama ikonu ve input aynı 40px kontrolün içinde, tek eksende. */
  .bms-search-field {
    position: relative;
    height: 40px;
    color: $l-text-500;

    &__icon {
      position: absolute;
      top: 50%;
      left: 12px;
      z-index: 1;
      transform: translateY(-50%);
      pointer-events: none;
    }

    &__input {
      width: 100%;
      height: 100%;
      padding: 0 12px 0 38px;
      border: 1px solid $l-border;
      border-radius: 8px;
      outline: none;
      color: $l-text-900;
      background: $l-bg;
      font-family: inherit;
      font-size: 14px;
      transition:
        border-color $t-base,
        box-shadow $t-base;

      &::placeholder {
        color: $l-text-500;
      }

      &:focus {
        border-color: $brand;
        box-shadow: 0 0 0 2px rgba($brand, 0.12);
      }

      &::-webkit-search-cancel-button {
        cursor: pointer;
      }
    }
  }

  /* Tarih ayracı hapı */
  .bms-daysep {
    font-size: 11px;
    font-weight: 600;
    color: $l-text-500;
    background: rgba($l-text-900, 0.06);
    padding: 4px 12px;
    border-radius: 99px;
  }

  /* Composer — kamera ve input kabuğu aynı merkez hattını paylaşır. */
  .bms-composer-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bms-input-shell {
    display: flex;
    flex: 1;
    align-items: center;
    min-width: 0;
    min-height: 44px;
    overflow: hidden;
    border: 1px solid $l-border;
    border-radius: 10px;
    background: $l-bg;
    transition:
      border-color $t-base,
      box-shadow $t-base;

    &:focus-within {
      border-color: $brand;
      box-shadow: 0 0 0 2px rgba($brand, 0.12);
    }
  }

  .bms-icon-btn {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 10px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-family: inherit;
    cursor: pointer;
    transition:
      background $t-base,
      color $t-base,
      opacity $t-base;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:focus-visible {
      outline: 2px solid $brand;
      outline-offset: 2px;
    }
  }

  .bms-icon-btn--ghost {
    color: $l-text-600;
    background: $l-bg-muted;

    &:not(:disabled):hover {
      color: $l-text-900;
      background: rgba($brand, 0.12);
    }
  }

  .bms-icon-btn--send {
    width: 36px;
    height: 36px;
    margin: 3px 4px 3px 0;
    border-radius: 8px;
    background: $brand;
    color: $brand-ink;

    &:not(:disabled):hover {
      background: color.adjust($brand, $lightness: -6%);
    }
  }

  /* Esneyen giriş — global textarea resize wrapper'ından bilinçli olarak opt-out. */
  .bms-input {
    flex: 1;
    min-width: 0;
    min-height: 42px;
    max-height: 128px;
    padding: 10px 10px 10px 14px;
    font-size: 14px;
    line-height: 20px;
    color: $l-text-900;
    background: transparent;
    border: 0;
    border-radius: 10px 0 0 10px;
    resize: none;
    outline: none;
    overflow-y: auto;
    scrollbar-width: none;

    &::placeholder {
      color: $l-text-500;
    }
    &::-webkit-resizer {
      display: none;
    }
    &::-webkit-scrollbar {
      width: 0;
      height: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bms-search-field__input,
    .bms-input-shell,
    .bms-icon-btn {
      transition: none;
    }
  }

  /* Mobil (<768px):
     - Sohbet artık TAM EKRAN fixed overlay (template'te), footer + tab bar dahil
       her şeyi kaplar. Bu yüzden kökü sabit viewport yüksekliğine kilitlemiyoruz;
       liste doğal aksın (sayfa kaysın, footer sonda) — diğer liste view'larıyla
       tutarlı. Yan padding'i mobile'a çekiyoruz.
     - Overlay composer'ı, alttaki home indicator'ın üstünde kalsın diye safe-area. */
  @media (max-width: 767px) {
    .buyer-messages {
      height: auto;
      margin: 0 -0.75rem;

      > .px-6 {
        padding-left: 0.75rem;
        padding-right: 0.75rem;
      }
    }

    main[data-tour="bms-thread"] {
      /* tam-ekran overlay üst çentik güvenli alanı */
      > .border-b:first-child {
        padding-top: max(0.75rem, env(safe-area-inset-top));
      }

      [data-tour="bms-composer"] {
        padding-bottom: calc(0.625rem + env(safe-area-inset-bottom));
      }
    }
  }
</style>
