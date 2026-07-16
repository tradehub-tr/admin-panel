<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
      <div class="flex items-center gap-3 min-w-0">
        <button class="hd-action flex-shrink-0" @click="$router.push('/helpdesk/tickets')">
          <AppIcon name="arrow-left" :size="14" /><span>{{ t("ticketDetail.back") }}</span>
        </button>
        <div class="min-w-0">
          <h1 class="hd-page-title truncate">{{ ticket.subject || "..." }}</h1>
          <p class="hd-page-sub">
            <span class="hd-mono">#{{ name }}</span> · {{ ticket.raised_by || "-" }}
          </p>
        </div>
      </div>

      <!-- Action bar -->
      <div class="flex items-center gap-2 flex-wrap" data-tour="tkd-actions">
        <select
          v-model="ticket.status"
          class="hd-action-select"
          :class="statusSelectCls(ticket.status)"
          @change="saveStatus"
        >
          <option value="Open">{{ t("ticketDetail.statusOpen") }}</option>
          <option value="Replied">{{ t("ticketDetail.statusReplied") }}</option>
          <option value="Resolved">{{ t("ticketDetail.statusResolved") }}</option>
          <option value="Closed">{{ t("ticketDetail.statusClosed") }}</option>
        </select>

        <select
          v-model="ticket.priority"
          class="hd-action-select"
          :class="prioritySelectCls(ticket.priority)"
          @change="savePriority"
        >
          <option value="">{{ t("ticketDetail.priorityNone") }}</option>
          <option value="Low">{{ t("ticketDetail.priorityLow") }}</option>
          <option value="Medium">{{ t("ticketDetail.priorityMedium") }}</option>
          <option value="High">{{ t("ticketDetail.priorityHigh") }}</option>
          <option value="Urgent">{{ t("ticketDetail.priorityUrgent") }}</option>
        </select>

        <div v-click-outside="() => (assignOpen = false)" class="relative">
          <button class="hd-action" @click="openAssign">
            <AppIcon name="user-plus" :size="14" />
            <span>{{ assignedLabel || t("ticketDetail.assign") }}</span>
          </button>
          <div v-if="assignOpen" class="hd-dropdown">
            <div class="hd-dropdown-search">
              <input
                v-model="assignQuery"
                type="text"
                :placeholder="t('ticketDetail.searchAgent')"
                class="hd-input"
                style="font-size: 12px; padding: 7px 10px"
              />
            </div>
            <div class="hd-dropdown-list">
              <button
                v-for="a in filteredAgents"
                :key="a.name"
                class="hd-dropdown-item"
                @click="doAssign(a)"
              >
                <div class="hd-dropdown-avatar">
                  {{ (a.agent_name || a.user || "?").charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="hd-dropdown-name truncate">{{ a.agent_name || a.user }}</div>
                  <div class="hd-dropdown-sub truncate">{{ a.user }}</div>
                </div>
              </button>
              <div v-if="filteredAgents.length === 0" class="px-3 py-4 hd-empty-sub text-center">
                {{ t("ticketDetail.noMatchingAgent") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="hd-empty">
      <AppIcon name="loader" :size="24" class="text-violet-500 animate-spin" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Main column: conversation -->
      <div class="lg:col-span-2 space-y-3" data-tour="tkd-thread">
        <!-- Original request -->
        <article class="hd-timeline tl-customer">
          <div class="hd-tl-avatar av-customer">
            {{ initial(ticket.raised_by) }}
          </div>
          <div class="hd-tl-body">
            <header class="hd-tl-head">
              <span class="hd-tl-author">{{ ticket.raised_by || "-" }}</span>
              <span class="hd-tl-badge bd-customer">{{ t("ticketDetail.firstRequest") }}</span>
              <span class="hd-tl-meta">{{ formatDT(ticket.creation) }}</span>
            </header>
            <!-- ticket.description = Frappe Communication HTML; backend bleach sanitize ediyor -->
            <!-- eslint-disable vue/no-v-html -->
            <div
              v-if="ticket.description"
              class="hd-tl-content prose prose-sm max-w-none"
              v-html="sanitizeHtml(ticket.description)"
            ></div>
            <!-- eslint-enable vue/no-v-html -->
            <div v-else class="hd-tl-content" style="opacity: 0.5">
              {{ t("ticketDetail.noDescription") }}
            </div>
          </div>
        </article>

        <!-- Timeline -->
        <article
          v-for="item in timeline"
          :key="item.kind + ':' + item.name"
          class="hd-timeline"
          :class="timelineCls(item)"
        >
          <div class="hd-tl-avatar" :class="avatarCls(item)">
            {{ initial(authorOf(item)) }}
          </div>
          <div class="hd-tl-body">
            <header class="hd-tl-head">
              <span class="hd-tl-author">{{ authorLabelOf(item) }}</span>
              <span v-if="item.kind === 'comment'" class="hd-tl-badge bd-internal">{{
                t("ticketDetail.internalNote")
              }}</span>
              <span v-else-if="item.sent_or_received === 'Sent'" class="hd-tl-badge bd-agent">{{
                t("ticketDetail.agentReply")
              }}</span>
              <span v-else class="hd-tl-badge bd-customer">{{ t("ticketDetail.customer") }}</span>
              <span class="hd-tl-meta">{{
                formatDT(item.communication_date || item.creation)
              }}</span>
            </header>
            <!-- item.content = Frappe Communication body; backend bleach sanitize ediyor -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="hd-tl-content prose prose-sm max-w-none" v-html="sanitizeHtml(item.content || '')"></div>
          </div>
        </article>

        <div v-if="timeline.length === 0" class="hd-empty-sub text-center py-3">
          {{ t("ticketDetail.noReplyYet") }}
        </div>

        <!-- Reply composer — reply modunda drag-drop dosya alanı -->
        <div
          data-tour="tkd-composer"
          class="hd-composer mt-4 relative"
          :class="
            composerMode === 'reply' && composerDropzone.isOver.value
              ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 rounded-lg'
              : ''
          "
          @dragenter="composerMode === 'reply' ? composerDropzone.onDragEnter($event) : null"
          @dragover="composerMode === 'reply' ? composerDropzone.onDragOver($event) : null"
          @dragleave="composerMode === 'reply' ? composerDropzone.onDragLeave($event) : null"
          @drop="composerMode === 'reply' ? composerDropzone.onDrop($event) : null"
        >
          <!-- Drag-over overlay: composer'a dosya sürüklendiğinde belirir -->
          <Transition name="fade">
            <div
              v-if="composerMode === 'reply' && composerDropzone.isOver.value"
              class="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-violet-500/10 border-2 border-dashed border-violet-500 rounded-lg"
            >
              <div
                class="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 text-white text-sm font-semibold shadow-lg"
              >
                <AppIcon name="upload" :size="16" />
                <span>{{ t("ticketDetail.dropFiles") }}</span>
              </div>
            </div>
          </Transition>
          <div class="hd-composer-tabs">
            <button
              class="hd-composer-tab"
              :class="{ active: composerMode === 'reply' }"
              @click="composerMode = 'reply'"
            >
              <AppIcon name="reply" :size="13" /><span>{{
                t("ticketDetail.replyToCustomer")
              }}</span>
            </button>
            <button
              class="hd-composer-tab"
              :class="{ active: composerMode === 'comment' }"
              @click="composerMode = 'comment'"
            >
              <AppIcon name="message-square" :size="13" /><span>{{
                t("ticketDetail.internalNote")
              }}</span>
            </button>
          </div>
          <textarea
            v-model="replyText"
            :rows="composerMode === 'reply' ? 5 : 3"
            class="hd-textarea"
            :placeholder="
              composerMode === 'reply'
                ? t('ticketDetail.replyPlaceholder')
                : t('ticketDetail.commentPlaceholder')
            "
          ></textarea>

          <!-- Reply modunda eklenmek üzere bekleyen dosyalar — her satırda upload
               progress bar overlay'i (transform-free flex centering, Tailwind CDN safe). -->
          <div v-if="composerMode === 'reply' && pendingFiles.length > 0" class="mt-2 space-y-1.5">
            <div
              v-for="p in pendingFiles"
              :key="p.id"
              class="relative flex items-center gap-3 px-3 py-2 rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/3 overflow-hidden"
            >
              <!-- Image dosyalar için küçük thumbnail; diğerleri için paperclip ikon -->
              <img
                v-if="p.previewUrl"
                :src="p.previewUrl"
                class="w-10 h-10 object-cover rounded shrink-0 border border-gray-200 dark:border-white/10"
                :alt="p.file.name"
              />
              <div
                v-else
                class="w-10 h-10 rounded shrink-0 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center"
              >
                <AppIcon name="paperclip" :size="16" class="text-gray-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-gray-700 dark:text-white/80 truncate">
                  {{ p.file.name }}
                </p>
                <p class="text-[10px] text-gray-400 dark:text-white/40">
                  {{ fmtSize(p.file.size) }}
                </p>
              </div>
              <!-- Sağ slot: uploading → spinner, success → ✓ rozet, idle → × kaldır -->
              <div
                v-if="uploads.states[`file-${p.id}`]?.status === 'uploading'"
                class="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin shrink-0"
                :title="
                  t('ticketDetail.uploading', {
                    pct: Math.round(uploads.states[`file-${p.id}`].progress),
                  })
                "
              ></div>
              <Transition name="fade" mode="out-in">
                <div
                  v-if="uploads.states[`file-${p.id}`]?.status === 'success'"
                  class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                  :title="t('ticketDetail.ready')"
                >
                  ✓
                </div>
                <button
                  v-else-if="!uploads.states[`file-${p.id}`]"
                  type="button"
                  class="text-gray-300 hover:text-red-500 shrink-0"
                  :aria-label="t('ticketDetail.removeFile', { name: p.file.name })"
                  @click="removePendingFile(p.id)"
                >
                  <AppIcon name="x" :size="16" />
                </button>
              </Transition>

              <!-- Thin progress hairline — satırın altında, içeriği örtmez -->
              <div
                v-if="uploads.states[`file-${p.id}`]?.status === 'uploading'"
                class="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/70 dark:bg-white/10 overflow-hidden rounded-b-md"
              >
                <div
                  class="h-full bg-violet-500 transition-all duration-300 ease-out"
                  :style="{ width: Math.max(6, uploads.states[`file-${p.id}`].progress) + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <div class="hd-composer-foot">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="hd-composer-hint">
                {{
                  composerMode === "reply"
                    ? t("ticketDetail.replyHint")
                    : t("ticketDetail.commentHint")
                }}
              </p>
              <div
                v-if="composerMode === 'reply'"
                v-click-outside="() => (cannedOpen = false)"
                class="relative"
              >
                <button class="hd-action" @click="toggleCanned">
                  <AppIcon name="message-square" :size="13" /><span>{{
                    t("ticketDetail.template")
                  }}</span>
                </button>
                <div v-if="cannedOpen" class="hd-dropdown" style="width: 320px">
                  <div class="hd-dropdown-search">
                    <input
                      v-model="cannedQuery"
                      type="text"
                      :placeholder="t('ticketDetail.searchTemplate')"
                      class="hd-input"
                      style="font-size: 12px; padding: 7px 10px"
                    />
                  </div>
                  <div class="hd-dropdown-list">
                    <button
                      v-for="r in filteredCanned"
                      :key="r.name"
                      class="hd-dropdown-item"
                      @click="applyCanned(r)"
                    >
                      <div class="flex-1 min-w-0">
                        <div class="hd-dropdown-name truncate">{{ r.title }}</div>
                        <div class="hd-dropdown-sub truncate">
                          {{ r.category || t("ticketDetail.general") }} · {{ r.scope }}
                        </div>
                      </div>
                    </button>
                    <div
                      v-if="filteredCanned.length === 0"
                      class="px-3 py-4 hd-empty-sub text-center"
                    >
                      {{ t("ticketDetail.noTemplate") }}
                    </div>
                  </div>
                </div>
              </div>
              <!-- Dosya ekle (sadece reply modunda) -->
              <button
                v-if="composerMode === 'reply'"
                type="button"
                class="hd-action"
                :disabled="sending || pendingFiles.length >= MAX_ATTACHMENT_FILES"
                :title="t('ticketDetail.attachLimit', { max: MAX_ATTACHMENT_FILES })"
                @click="fileInputRef?.click()"
              >
                <AppIcon name="paperclip" :size="13" />
                <span
                  >{{ t("ticketDetail.attachFile")
                  }}{{ pendingFiles.length ? ` (${pendingFiles.length})` : "" }}</span
                >
              </button>
              <input ref="fileInput" type="file" multiple class="hidden" @change="onFilePick" />
            </div>
            <button
              class="hd-btn-primary"
              :disabled="sending || !replyText.trim()"
              @click="sendMessage"
            >
              <AppIcon :name="composerMode === 'reply' ? 'send' : 'message-square'" :size="14" />
              <span>{{
                sending
                  ? t("ticketDetail.sending")
                  : composerMode === "reply"
                    ? t("ticketDetail.send")
                    : t("ticketDetail.addNote")
              }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="space-y-3">
        <!-- Customer card -->
        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">{{ t("ticketDetail.requester") }}</h3>
          <div class="hd-customer">
            <div class="hd-customer-avatar">
              {{ initial(ticket.raised_by) }}
            </div>
            <div class="min-w-0">
              <p class="hd-customer-name truncate">{{ ticket.raised_by || "-" }}</p>
              <p class="hd-customer-sub">{{ ticket.customer || t("ticketDetail.noCustomer") }}</p>
            </div>
          </div>
        </div>

        <!-- Etiketler -->
        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">{{ t("ticketDetail.tags") }}</h3>
          <div class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="tag in tags"
              :key="tag.link_name"
              class="hd-tag-chip"
              :class="`hd-tag-${tag.color}`"
            >
              {{ tag.tag_name }}
              <button class="hd-tag-x" @click="removeTag(tag)">
                <AppIcon name="x" :size="10" />
              </button>
            </span>
            <span v-if="tags.length === 0" class="text-[11px] text-gray-400">
              {{ t("ticketDetail.noTags") }}
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <input
              v-model="newTagText"
              type="text"
              :placeholder="t('ticketDetail.newTag')"
              class="hd-input"
              style="font-size: 12px; padding: 6px 9px"
              @keyup.enter="addTag"
            />
            <button class="hd-action" :disabled="!newTagText.trim()" @click="addTag">
              <AppIcon name="plus" :size="13" />
            </button>
          </div>
        </div>

        <!-- Details -->
        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">{{ t("ticketDetail.details") }}</h3>
          <dl class="hd-dl">
            <div>
              <dt>{{ t("ticketDetail.fieldStatus") }}</dt>
              <dd>{{ statusLabel(ticket.status) }}</dd>
            </div>
            <div>
              <dt>{{ t("ticketDetail.fieldPriority") }}</dt>
              <dd>{{ ticket.priority || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("ticketDetail.fieldType") }}</dt>
              <dd>{{ ticket.ticket_type || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("ticketDetail.fieldAgentGroup") }}</dt>
              <dd>{{ ticket.agent_group || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("ticketDetail.fieldAssignee") }}</dt>
              <dd>{{ assignedLabel || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("ticketDetail.fieldFirstResponse") }}</dt>
              <dd>{{ formatDT(ticket.first_responded_on) || "-" }}</dd>
            </div>
            <div>
              <dt>{{ t("ticketDetail.fieldCreated") }}</dt>
              <dd>{{ formatDT(ticket.creation) }}</dd>
            </div>
            <div>
              <dt>{{ t("ticketDetail.fieldLastUpdated") }}</dt>
              <dd>{{ formatDT(ticket.modified) }}</dd>
            </div>
          </dl>
        </div>

        <!-- Attachments -->
        <div v-if="attachments.length > 0" class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">
            {{ t("ticketDetail.attachments", { n: attachments.length }) }}
          </h3>
          <div class="space-y-2">
            <a
              v-for="f in attachments"
              :key="f.name"
              :href="f.file_url"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 px-2.5 py-2 rounded-md border border-gray-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-500/5 transition-colors group"
            >
              <AppIcon
                name="paperclip"
                :size="14"
                class="text-gray-400 shrink-0 group-hover:text-violet-500"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-gray-700 dark:text-white/80 truncate">
                  {{ f.file_name }}
                </p>
                <p class="text-[10px] text-gray-400 dark:text-white/40">
                  {{ fmtFileSize(f.file_size) }}
                </p>
              </div>
              <AppIcon
                name="download"
                :size="13"
                class="text-gray-300 dark:text-white/30 group-hover:text-violet-500 shrink-0"
              />
            </a>
          </div>
        </div>

        <!-- İlişkili Kayıtlar -->
        <div
          v-if="ticket.related_order || ticket.related_rfq || ticket.related_listing"
          class="hd-card hd-card-pad"
        >
          <h3 class="hd-eyebrow mb-3">{{ t("ticketDetail.relatedRecords") }}</h3>
          <div class="space-y-2">
            <a
              v-if="ticket.related_order"
              :href="`/panel/app/Order/${encodeURIComponent(ticket.related_order)}`"
              class="hd-quick"
            >
              <AppIcon name="shopping-bag" :size="14" class="text-blue-500" />
              <span class="flex-1 truncate"
                >{{ t("ticketDetail.order") }}: {{ ticket.related_order }}</span
              >
              <AppIcon name="external-link" :size="12" class="text-gray-300" />
            </a>
            <a
              v-if="ticket.related_rfq"
              :href="`/panel/app/RFQ/${encodeURIComponent(ticket.related_rfq)}`"
              class="hd-quick"
            >
              <AppIcon name="handshake" :size="14" class="text-indigo-500" />
              <span class="flex-1 truncate"
                >{{ t("ticketDetail.rfq") }}: {{ ticket.related_rfq }}</span
              >
              <AppIcon name="external-link" :size="12" class="text-gray-300" />
            </a>
            <a
              v-if="ticket.related_listing"
              :href="`/panel/app/Listing/${encodeURIComponent(ticket.related_listing)}`"
              class="hd-quick"
            >
              <AppIcon name="cube" :size="14" class="text-emerald-500" />
              <span class="flex-1 truncate"
                >{{ t("ticketDetail.product") }}: {{ ticket.related_listing }}</span
              >
              <AppIcon name="external-link" :size="12" class="text-gray-300" />
            </a>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="hd-card hd-card-pad">
          <h3 class="hd-eyebrow mb-3">{{ t("ticketDetail.quickActions") }}</h3>
          <div class="space-y-2">
            <button
              class="hd-quick"
              :disabled="ticket.status === 'Resolved' || ticket.status === 'Closed'"
              @click="quickStatus('Resolved')"
            >
              <AppIcon name="check-circle" :size="14" class="text-emerald-500" />
              <span>{{ t("ticketDetail.markResolved") }}</span>
            </button>
            <button
              class="hd-quick"
              :disabled="ticket.status === 'Closed'"
              @click="quickStatus('Closed')"
            >
              <AppIcon name="archive" :size="14" class="text-gray-500 dark:text-white/40" />
              <span>{{ t("ticketDetail.close") }}</span>
            </button>
            <button
              class="hd-quick"
              :disabled="ticket.status === 'Open'"
              @click="quickStatus('Open')"
            >
              <AppIcon name="refresh-cw" :size="14" class="text-blue-500" />
              <span>{{ t("ticketDetail.reopen") }}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, useTemplateRef } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute } from "vue-router";
  import { useHelpdeskStore } from "@/stores/helpdesk";
  import { useToast } from "@/composables/useToast";
  import { useImageUploadProgressMap } from "@/composables/useImageUploadProgressMap";
  import { sanitizeHtml } from "@/utils/sanitize";
  import { useDropzone } from "@/composables/useDropzone";
  import { usePageTour } from "@/composables/usePageTour";
  import AppIcon from "@/components/common/AppIcon.vue";
  import api from "@/utils/api";

  const { t } = useI18n();
  const route = useRoute();
  const hd = useHelpdeskStore();
  const toast = useToast();

  // Sayfa-içi onboarding: konuşma akışı → yanıt kutusu → durum/atama yan paneli.
  usePageTour("ticket-detail", () => [
    {
      target: '[data-tour="tkd-thread"]',
      title: t("tourSteps.page.tkdThread_t"),
      desc: t("tourSteps.page.tkdThread_d"),
    },
    {
      target: '[data-tour="tkd-composer"]',
      title: t("tourSteps.page.tkdComposer_t"),
      desc: t("tourSteps.page.tkdComposer_d"),
    },
    {
      target: '[data-tour="tkd-actions"]',
      title: t("tourSteps.page.tkdActions_t"),
      desc: t("tourSteps.page.tkdActions_d"),
    },
  ]);

  const name = computed(() => route.params.name);
  const loading = ref(true);
  const sending = ref(false);
  const composerMode = ref("reply"); // reply | comment
  const replyText = ref("");

  // Dosya ekleri — sadece "reply" modunda; backend HD Ticket'a File ekler
  // (max 5 dosya, 10MB / dosya — tradehub_core.api.public.upload_ticket_attachment).
  const MAX_ATTACHMENT_FILES = 5;
  const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
  // Composer drag-drop — dosyaları `addFiles` valide ediyor, biz sadece drop event'ini yakalıyoruz.
  const composerDropzone = useDropzone((files) => addFiles(files), {
    accept: "*/*",
    multiple: true,
    maxBytes: MAX_ATTACHMENT_BYTES,
  });
  const pendingFiles = ref([]); // { id, file }
  const uploads = useImageUploadProgressMap(); // key = `file-<id>`
  const fileInputRef = useTemplateRef("fileInput");
  let _fileIdSeq = 0;

  const ticket = ref({});
  const comms = ref([]);
  const comments = ref([]);
  const attachments = ref([]);

  const assignOpen = ref(false);
  const assignQuery = ref("");

  // Tag state
  const tags = ref([]);
  const newTagText = ref("");

  async function loadTags() {
    try {
      const res = await api.callMethod("tradehub_core.api.ticket_tag.list_ticket_tags", {
        ticket: name.value,
      });
      tags.value = res?.message || [];
    } catch {
      tags.value = [];
    }
  }

  async function addTag() {
    const t = newTagText.value.trim();
    if (!t) return;
    try {
      await api.callMethod("tradehub_core.api.ticket_tag.add_ticket_tag", {
        ticket: name.value,
        tag: t,
        create_if_missing: 1,
      });
      newTagText.value = "";
      await loadTags();
    } catch (e) {
      toast.error(e.message || t("ticketDetail.tagAddFailed"));
    }
  }

  async function removeTag(t) {
    try {
      await api.callMethod("tradehub_core.api.ticket_tag.remove_ticket_tag", {
        link_name: t.link_name,
      });
      await loadTags();
    } catch (e) {
      toast.error(e.message || t("ticketDetail.tagRemoveFailed"));
    }
  }

  // Canned response dropdown
  const cannedOpen = ref(false);
  const cannedQuery = ref("");
  const filteredCanned = computed(() => {
    const q = cannedQuery.value.toLowerCase().trim();
    const list = hd.cannedResponses;
    if (!q) return list;
    return list.filter((r) => (r.title || "").toLowerCase().includes(q));
  });

  async function toggleCanned() {
    cannedOpen.value = !cannedOpen.value;
    if (cannedOpen.value) {
      await hd.fetchCannedResponses();
    }
  }

  async function applyCanned(r) {
    cannedOpen.value = false;
    try {
      const rendered = await hd.renderCannedResponse(r.name, name.value);
      const text = (rendered.content || "").replace(/<[^>]+>/g, "");
      replyText.value = replyText.value ? `${replyText.value}\n\n${text}` : text;
    } catch (e) {
      toast.error(e.message || t("ticketDetail.templateApplyFailed"));
    }
  }

  const timeline = computed(() => {
    const merged = [...comms.value, ...comments.value];
    return merged.sort((a, b) => {
      const ta = new Date(a.communication_date || a.creation).getTime();
      const tb = new Date(b.communication_date || b.creation).getTime();
      return ta - tb;
    });
  });

  const filteredAgents = computed(() => {
    const q = assignQuery.value.toLowerCase().trim();
    const list = hd.agents;
    if (!q) return list;
    return list.filter(
      (a) =>
        (a.agent_name || "").toLowerCase().includes(q) || (a.user || "").toLowerCase().includes(q)
    );
  });

  const assignedLabel = computed(() => {
    try {
      const raw = ticket.value._assign;
      if (!raw) return "";
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!arr?.length) return "";
      return arr.length === 1 ? arr[0] : `${arr[0]} +${arr.length - 1}`;
    } catch {
      return "";
    }
  });

  function initial(s) {
    return s ? String(s).trim().charAt(0).toUpperCase() : "?";
  }

  function statusLabel(s) {
    const m = {
      Open: t("ticketDetail.statusOpen"),
      Replied: t("ticketDetail.statusReplied"),
      Resolved: t("ticketDetail.statusResolved"),
      Closed: t("ticketDetail.statusClosed"),
    };
    return m[s] || s || "-";
  }

  function statusSelectCls(s) {
    const m = {
      Open: "hd-as-blue",
      Replied: "hd-as-amber",
      Resolved: "hd-as-emerald",
      Closed: "hd-as-gray",
    };
    return m[s] || "hd-as-gray";
  }

  function prioritySelectCls(p) {
    const m = {
      Low: "hd-as-gray",
      Medium: "hd-as-blue",
      High: "hd-as-amber",
      Urgent: "hd-as-rose",
    };
    return m[p] || "hd-as-gray";
  }

  function formatDT(s) {
    if (!s) return "";
    try {
      return new Date(s).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return s;
    }
  }

  function timelineCls(item) {
    if (item.kind === "comment") return "tl-internal";
    return item.sent_or_received === "Sent" ? "tl-agent" : "tl-customer";
  }

  function avatarCls(item) {
    if (item.kind === "comment") return "av-internal";
    return item.sent_or_received === "Sent" ? "av-agent" : "av-customer";
  }

  function authorOf(item) {
    return item.sender_full_name || item.sender || item.commented_by || "?";
  }

  function authorLabelOf(item) {
    return authorOf(item);
  }

  async function loadAll() {
    loading.value = true;
    try {
      const [doc, cms, cmts, atts] = await Promise.all([
        hd.fetchTicket(name.value),
        hd.fetchCommunications(name.value),
        hd.fetchComments(name.value),
        hd.fetchAttachments(name.value).catch(() => []),
        loadTags(),
      ]);
      ticket.value = doc;
      comms.value = cms;
      comments.value = cmts;
      attachments.value = atts;
      await hd.fetchAgents();
    } catch (e) {
      toast.error(e.message || t("ticketDetail.ticketLoadFailed"));
    } finally {
      loading.value = false;
    }
  }

  function fmtFileSize(bytes) {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  async function saveStatus() {
    try {
      await hd.setStatus(name.value, ticket.value.status);
      toast.success(t("ticketDetail.statusUpdated"));
    } catch (e) {
      toast.error(e.message || t("ticketDetail.failed"));
    }
  }

  async function savePriority() {
    try {
      await hd.setPriority(name.value, ticket.value.priority);
      toast.success(t("ticketDetail.priorityUpdated"));
    } catch (e) {
      toast.error(e.message || t("ticketDetail.failed"));
    }
  }

  async function quickStatus(s) {
    ticket.value.status = s;
    await saveStatus();
  }

  function openAssign() {
    assignOpen.value = !assignOpen.value;
    if (assignOpen.value) hd.fetchAgents();
  }

  async function doAssign(agent) {
    assignOpen.value = false;
    try {
      await hd.assignAgent(name.value, agent.user);
      toast.success(t("ticketDetail.assigned", { name: agent.agent_name || agent.user }));
      ticket.value = await hd.fetchTicket(name.value);
    } catch (e) {
      toast.error(e.message || t("ticketDetail.assignFailed"));
    }
  }

  // ── Dosya ekleri (reply composer) ──────────────────────────
  function onFilePick(ev) {
    const input = ev.target;
    const picked = Array.from(input?.files || []);
    addFiles(picked);
    if (input) input.value = ""; // aynı dosyayı tekrar seçebilmek için reset
  }

  function addFiles(files) {
    for (const file of files) {
      if (pendingFiles.value.length >= MAX_ATTACHMENT_FILES) {
        toast.error(t("ticketDetail.maxFilesError", { max: MAX_ATTACHMENT_FILES }));
        break;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(t("ticketDetail.fileTooLarge", { name: file.name }));
        continue;
      }
      const dup = pendingFiles.value.some(
        (p) => p.file.name === file.name && p.file.size === file.size
      );
      if (dup) {
        toast.error(t("ticketDetail.alreadyAdded", { name: file.name }));
        continue;
      }
      const id = ++_fileIdSeq;
      // Image dosyalar için anında küçük preview URL (revoke removePendingFile/unmount sırasında).
      const previewUrl = file.type?.startsWith("image/") ? URL.createObjectURL(file) : "";
      pendingFiles.value.push({ id, file, previewUrl });
      // Staging animation — drop edildiği anda görsel feedback (~700ms fake progress + ✓).
      // Gerçek upload sendMessage sırasında yine `file-${id}` key'iyle çalışır.
      stageFileAttachment(id);
    }
  }

  function stageFileAttachment(id) {
    uploads.start(`file-${id}`);
    window.setTimeout(() => {
      // Component hala mount'lu ve dosya hala listede ise finish et
      if (pendingFiles.value.some((p) => p.id === id)) {
        uploads.finish(`file-${id}`);
      } else {
        uploads.fail(`file-${id}`);
      }
    }, 700);
  }

  function removePendingFile(id) {
    const idx = pendingFiles.value.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const p = pendingFiles.value[idx];
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      pendingFiles.value.splice(idx, 1);
    }
  }

  function fmtSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  /** Tek dosyayı upload_ticket_attachment endpoint'ine yükler.
   *  Progress bar gerçek XHR progress'i değil — simulated tick (UX paketinin pattern'i). */
  async function uploadOneAttachment(ticketName, file) {
    const csrf = await api.getCsrfToken();
    const fd = new FormData();
    fd.append("ticket", ticketName);
    fd.append("file", file);
    // BASE_URL api.js'te private; storefront help.ts'deki gibi relative path kullanıyoruz —
    // vite proxy + production nginx /api/* yolunu Frappe'ye geçiriyor.
    const res = await fetch("/api/method/tradehub_core.api.public.upload_ticket_attachment", {
      method: "POST",
      body: fd,
      headers: { "X-Frappe-CSRF-Token": csrf },
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data._server_messages
        ? (() => {
            try {
              return JSON.parse(JSON.parse(data._server_messages)[0])?.message;
            } catch {
              return null;
            }
          })()
        : data.exception || data.message || `HTTP ${res.status}`;
      throw new Error(msg || t("ticketDetail.uploadFailed"));
    }
    return data.message || data;
  }

  async function sendMessage() {
    if (!replyText.value.trim()) return;
    sending.value = true;
    try {
      if (composerMode.value === "reply") {
        await hd.replyViaAgent(name.value, replyText.value);
        // Reply için seçilen dosyaları paralel yükle (concurrency = 2 değil, basitlik için
        // tüm dosyalar paralel — backend rate limit 20 / 5dk yeterli buffer veriyor).
        const items = pendingFiles.value.slice();
        if (items.length > 0) {
          const results = await Promise.allSettled(
            items.map(async ({ id, file }) => {
              const key = `file-${id}`;
              uploads.start(key);
              try {
                await uploadOneAttachment(name.value, file);
                await uploads.finish(key);
                return { id, ok: true };
              } catch (err) {
                uploads.fail(key);
                return { id, ok: false, error: err };
              }
            })
          );
          const failed = results
            .map((r) => (r.status === "fulfilled" ? r.value : null))
            .filter((v) => v && !v.ok);
          if (failed.length > 0) {
            toast.error(t("ticketDetail.filesUploadFailed", { n: failed.length }));
          }
          // Başarılıları pending listeden çıkar (başarısızları gözden geçirilsin diye tut)
          const failedIds = new Set(failed.map((f) => f.id));
          pendingFiles.value = pendingFiles.value.filter((p) => failedIds.has(p.id));
        }
        toast.success(t("ticketDetail.replySent"));
      } else {
        await hd.newComment(name.value, replyText.value);
        toast.success(t("ticketDetail.noteAdded"));
      }
      replyText.value = "";
      const [cms, cmts, doc, atts] = await Promise.all([
        hd.fetchCommunications(name.value),
        hd.fetchComments(name.value),
        hd.fetchTicket(name.value),
        hd.fetchAttachments(name.value).catch(() => attachments.value),
      ]);
      comms.value = cms;
      comments.value = cmts;
      ticket.value = doc;
      attachments.value = atts;
    } catch (e) {
      toast.error(e.message || t("ticketDetail.sendFailed"));
    } finally {
      sending.value = false;
    }
  }

  const vClickOutside = {
    mounted(el, binding) {
      el.__clickOutside__ = (ev) => {
        if (!el.contains(ev.target)) binding.value?.();
      };
      document.addEventListener("click", el.__clickOutside__);
    },
    unmounted(el) {
      document.removeEventListener("click", el.__clickOutside__);
    },
  };

  onMounted(loadAll);
</script>

<!-- Tag chip stilleri global helpdesk.scss'te -->
