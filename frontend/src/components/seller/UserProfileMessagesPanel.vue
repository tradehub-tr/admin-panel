<script setup>
  /**
   * User Profile formuna gömülü "Mesajlarım" paneli.
   *
   * Mağazam → Müşteriler & sosyal → Mesajlarım (BuyerMessagesView) ile AYNI
   * veriyi/akışı kullanır: aynı `buyerMessages` Pinia store'u (seller
   * perspektifi, tradehub_core.api.chat.* üzerinden). Burada kart formatında,
   * profil sayfası içinde gösterilir.
   *
   * `user` prop'u profilin kullanıcısıdır; inbox her zaman OTURUM AÇAN
   * kullanıcının konuşmalarıdır (chat.py caller'ın inbox'ını döner), bu yüzden
   * panel kendi profilinde anlamlıdır.
   */
  import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { useBuyerMessagesStore } from "@/stores/buyerMessages";
  import AppIcon from "@/components/common/AppIcon.vue";

  defineProps({
    user: { type: String, default: "" },
  });

  const { t } = useI18n();
  const store = useBuyerMessagesStore();
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
    return sortedConversations.value.filter((c) =>
      [c.buyerName, c.buyerEmail, c.lastMessage]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(q)
    );
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
      /* hata store.error'da */
    }
  }

  function onKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function scrollToBottom() {
    if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight;
  }
  function isNearBottom() {
    const el = threadEl.value;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  let prevCount = 0;
  watch(activeMessages, async (msgs) => {
    const wasAtBottom = isNearBottom();
    const grew = msgs.length > prevCount;
    prevCount = msgs.length;
    await nextTick();
    if (grew && wasAtBottom) scrollToBottom();
  });
  watch(activeConversationId, async () => {
    prevCount = 0;
    await nextTick();
    scrollToBottom();
  });

  onMounted(() => store.startPolling());
  onUnmounted(() => store.stopPolling());
</script>

<template>
  <div class="card !p-0 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
      <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <AppIcon name="message-square" :size="15" class="text-violet-500" />
        {{ t("buyerMessages.title") }}
        <span
          v-if="totalUnread > 0"
          class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700"
          >{{ totalUnread }} {{ t("buyerMessages.unread") }}</span
        >
      </h3>
      <button
        class="text-xs text-violet-600 hover:text-violet-700 font-medium"
        :disabled="loadingInbox"
        @click="store.fetchConversations()"
      >
        {{ loadingInbox ? t("buyerMessages.refreshing") : t("buyerMessages.refresh") }}
      </button>
    </div>

    <div v-if="error" class="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
      {{ error }}
    </div>

    <div class="flex h-[460px]">
      <!-- Inbox list -->
      <aside class="w-64 border-r border-gray-100 dark:border-white/10 flex flex-col bg-gray-50 dark:bg-white/3">
        <div class="p-2 border-b border-gray-100 dark:border-white/10">
          <input
            v-model="search"
            type="text"
            :placeholder="t('buyerMessages.searchPlaceholder')"
            class="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
          />
        </div>
        <div class="flex-1 overflow-y-auto">
          <div
            v-if="loadingInbox && filteredConversations.length === 0"
            class="p-5 text-center text-xs text-gray-500"
          >
            {{ t("buyerMessages.loading") }}
          </div>
          <div
            v-else-if="filteredConversations.length === 0"
            class="p-5 text-center text-xs text-gray-500"
          >
            <div class="mb-1"><AppIcon name="inbox" :size="26" class="mx-auto opacity-50" /></div>
            {{ t("buyerMessages.emptyTitle") }}
          </div>
          <button
            v-for="c in filteredConversations"
            :key="c.id"
            class="w-full flex items-start gap-2 px-2.5 py-2.5 text-left hover:bg-white dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 transition-colors"
            :class="{ 'bg-white dark:bg-white/5 border-l-4 border-l-violet-500': c.id === activeConversationId }"
            @click="selectConversation(c.id)"
          >
            <div class="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {{ c.buyerInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <div class="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{{ c.buyerName }}</div>
                <div class="text-[9px] text-gray-400 flex-shrink-0">{{ c.lastTime }}</div>
              </div>
              <div class="text-[11px] text-gray-500 truncate mt-0.5">
                {{ c.lastMessage || t("buyerMessages.emptyMessage") }}
              </div>
            </div>
            <span
              v-if="c.unread > 0"
              class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500 text-white flex-shrink-0"
              >{{ c.unread }}</span
            >
          </button>
        </div>
      </aside>

      <!-- Thread + composer -->
      <main class="flex-1 flex flex-col bg-white dark:bg-transparent">
        <div v-if="!activeConversation" class="flex-1 flex items-center justify-center text-gray-400">
          <div class="text-center">
            <div class="mb-2"><AppIcon name="message-circle" :size="38" class="opacity-60" /></div>
            <div class="text-xs">{{ t("buyerMessages.selectConversation") }}</div>
          </div>
        </div>
        <template v-else>
          <div class="px-4 py-2.5 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold">
              {{ activeConversation.buyerInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{{ activeConversation.buyerName }}</div>
              <div class="text-[10px] text-gray-500 truncate">{{ activeConversation.buyerEmail }}</div>
            </div>
          </div>

          <div ref="threadEl" class="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50 dark:bg-white/3">
            <div
              v-if="loadingMessages && activeMessages.length === 0"
              class="text-center text-xs text-gray-400 py-6"
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
                  class="max-w-[75%] rounded-2xl px-3 py-1.5 text-xs leading-snug shadow-sm"
                  :class="
                    m.direction === 'me'
                      ? 'bg-violet-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm dark:bg-white/10 dark:text-gray-100 dark:border-white/10'
                  "
                >
                  <a
                    v-if="m.attachmentType === 'image'"
                    :href="m.attachmentUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="block rounded-lg overflow-hidden no-underline mb-1"
                  >
                    <img :src="m.attachmentUrl" :alt="m.attachmentName" class="block max-h-32 max-w-[200px] object-cover" />
                  </a>
                  <a
                    v-else-if="m.attachmentType === 'file'"
                    :href="m.attachmentUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    :download="m.attachmentName"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-2 py-1 text-[11px] no-underline mb-1"
                  >
                    <AppIcon name="paperclip" :size="13" />
                    <span class="truncate">{{ m.attachmentName }}</span>
                  </a>
                  <!-- eslint-disable vue/no-v-html -->
                  <div v-if="m.text" class="whitespace-pre-wrap break-words" v-html="m.textHtml || m.text"></div>
                  <!-- eslint-enable vue/no-v-html -->
                  <a
                    v-if="m.videoCallUrl"
                    :href="m.videoCallUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-[11px] font-medium text-white no-underline hover:bg-green-600"
                  >
                    <AppIcon name="video" :size="12" /> {{ t("buyerMessages.joinCall") }}
                  </a>
                  <div class="text-[9px] mt-0.5 opacity-70" :class="m.direction === 'me' ? 'text-white/80' : 'text-gray-500'">
                    {{ m.time }}
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="border-t border-gray-100 dark:border-white/10 px-3 py-2.5">
            <div class="flex items-end gap-2">
              <button
                type="button"
                :disabled="startingCall || !activeConversationId"
                class="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                :title="t('buyerMessages.startVideoCall')"
                @click="store.startVideoCall()"
              >
                <AppIcon name="video" :size="17" />
              </button>
              <textarea
                v-model="draft"
                :disabled="sending"
                rows="2"
                :placeholder="t('buyerMessages.composerPlaceholder')"
                class="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400 resize-none"
                @keydown="onKeydown"
              ></textarea>
              <button
                :disabled="sending || !draft.trim()"
                class="px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
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
