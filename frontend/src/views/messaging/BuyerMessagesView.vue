<script setup>
  import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { useBuyerMessagesStore } from "@/stores/buyerMessages";
  import { usePageTour } from "@/composables/usePageTour";
  import { sanitizeHtml } from "@/utils/sanitize";
  import AppIcon from "@/components/common/AppIcon.vue";

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
  const search = ref("");

  const filteredConversations = computed(() => {
    const q = search.value.trim().toLocaleLowerCase("tr-TR");
    if (!q) return sortedConversations.value;
    return sortedConversations.value.filter((c) => {
      const hay = [c.buyerName, c.buyerEmail, c.lastMessage]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return hay.includes(q);
    });
  });

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
      <!-- Inbox liste -->
      <aside class="w-80 border-r border-gray-200 bg-gray-50 flex flex-col" data-tour="bms-list">
        <div class="p-3 border-b border-gray-200 bg-white">
          <input
            v-model="search"
            type="text"
            :placeholder="t('buyerMessages.searchPlaceholder')"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400"
          />
        </div>

        <div class="flex-1 overflow-y-auto">
          <div
            v-if="loadingInbox && filteredConversations.length === 0"
            class="p-6 text-center text-sm text-gray-500"
          >
            {{ t("buyerMessages.loading") }}
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
              class="w-10 h-10 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-semibold flex-shrink-0"
            >
              {{ c.buyerInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <div class="text-sm font-medium text-gray-800 truncate">
                  {{ c.buyerName }}
                </div>
                <div class="text-[10px] text-gray-400 flex-shrink-0">
                  {{ c.lastTime }}
                </div>
              </div>
              <div class="text-xs text-gray-500 truncate mt-0.5">
                {{ c.lastMessage || t("buyerMessages.emptyMessage") }}
              </div>
            </div>
            <span
              v-if="c.unread > 0"
              class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-500 text-brand-ink flex-shrink-0"
            >
              {{ c.unread }}
            </span>
          </button>
        </div>
      </aside>

      <!-- Thread + composer -->
      <main class="flex-1 flex flex-col bg-white" data-tour="bms-thread">
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
          <div class="px-5 py-3 border-b border-gray-200 flex items-center gap-3">
            <div
              class="w-9 h-9 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-semibold"
            >
              {{ activeConversation.buyerInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800">
                {{ activeConversation.buyerName }}
              </div>
              <div class="text-xs text-gray-500">
                {{ activeConversation.buyerEmail }}
              </div>
            </div>
            <span
              class="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full"
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
          <div ref="threadEl" class="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-gray-50">
            <div
              v-if="loadingMessages && activeMessages.length === 0"
              class="text-center text-sm text-gray-400 py-8"
            >
              {{ t("buyerMessages.loading") }}
            </div>
            <template v-else>
              <div
                v-for="m in activeMessages"
                :key="m.id"
                class="flex"
                :class="m.direction === 'me' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[70%] rounded-2xl px-4 py-2 text-sm leading-snug shadow-sm"
                  :class="
                    m.direction === 'me'
                      ? 'bg-brand-500 text-brand-ink rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                  "
                >
                  <!-- Image attachment — thumbnail, tıklayınca yeni sekmede orjinal -->
                  <a
                    v-if="m.attachmentType === 'image'"
                    :href="m.attachmentUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="block rounded-lg overflow-hidden no-underline mb-1"
                  >
                    <img
                      :src="m.attachmentUrl"
                      :alt="m.attachmentName"
                      class="block max-h-40 max-w-[240px] object-cover"
                    />
                  </a>
                  <!-- File attachment — indirme kartı -->
                  <a
                    v-else-if="m.attachmentType === 'file'"
                    :href="m.attachmentUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    :download="m.attachmentName"
                    class="inline-flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-xs no-underline mb-1 hover:bg-current/5 transition-colors"
                    :class="m.direction === 'me' ? 'text-white' : 'text-gray-700'"
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
                      <span class="block font-medium truncate">{{ m.attachmentName }}</span>
                      <span class="block text-[10px] opacity-70"
                        >{{ Math.round(m.attachmentSize / 1024) }} KB</span
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
                    v-if="m.text"
                    class="whitespace-pre-wrap break-words"
                    v-html="sanitizeHtml(m.textHtml || m.text)"
                  ></div>
                  <!-- eslint-enable vue/no-v-html -->
                  <a
                    v-if="m.videoCallUrl"
                    :href="m.videoCallUrl"
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
                    :class="m.direction === 'me' ? 'text-white/80' : 'text-gray-500'"
                  >
                    {{ m.time }}
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Composer -->
          <div class="border-t border-gray-200 px-4 py-3 bg-white" data-tour="bms-composer">
            <div class="flex items-end gap-2">
              <button
                type="button"
                :disabled="startingCall || !activeConversationId"
                class="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:text-brand-800 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                :title="t('buyerMessages.startVideoCall')"
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
              <textarea
                v-model="draft"
                :disabled="sending"
                rows="2"
                :placeholder="t('buyerMessages.composerPlaceholder')"
                class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 resize-none"
                @keydown="onKeydown"
              ></textarea>
              <button
                :disabled="sending || !draft.trim()"
                class="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-brand-ink text-sm font-medium transition-colors"
                @click="send"
              >
                {{ sending ? "…" : t("buyerMessages.send") }}
              </button>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>
