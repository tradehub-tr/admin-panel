<template>
  <div>
    <div v-if="loading" class="text-center py-6">
      <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
    </div>

    <div v-else-if="!items.length" class="crm-empty">
      <div class="icon"><AppIcon name="activity" :size="22" /></div>
      <h3>{{ t("activityTimeline.empty") }}</h3>
      <p>{{ t("activityTimeline.emptyHint") }}</p>
    </div>

    <div v-else class="crm-timeline">
      <div v-for="item in items" :key="item.name || item.creation" class="crm-timeline-item">
        <div class="crm-timeline-header">
          <UserAvatar :email="item.owner" size="sm" />
          <span class="actor">{{ ownerLabel(item.owner) }}</span>
          <span class="action">{{ actionLabel(item) }}</span>
          <span class="time"><RelativeTime :value="item.creation" /></span>
        </div>
        <!-- CRM activity content: backend Frappe bleach sanitize + lokal sanitizedContent() ek katman -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          v-if="item.content || item.data || item.comment"
          class="crm-timeline-content"
          v-html="sanitizedContent(item)"
        ></div>
        <!-- eslint-enable vue/no-v-html -->
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import UserAvatar from "./UserAvatar.vue";
  import RelativeTime from "./RelativeTime.vue";
  import { sanitizeHtml } from "@/utils/sanitize";

  const { t } = useI18n();

  defineProps({
    items: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  });

  function ownerLabel(email) {
    if (!email) return t("activityTimeline.system");
    return email.split("@")[0];
  }

  function actionLabel(item) {
    const type = item.activity_type || item.comment_type || "";
    const MAP = {
      comment: t("activityTimeline.actionComment"),
      Comment: t("activityTimeline.actionComment"),
      creation: t("activityTimeline.actionCreated"),
      updated: t("activityTimeline.actionUpdated"),
      Assigned: t("activityTimeline.actionAssigned"),
      status_changed: t("activityTimeline.actionStatusChanged"),
      email: t("activityTimeline.actionEmail"),
      call_log: t("activityTimeline.actionCallLog"),
      Like: t("activityTimeline.actionLike"),
    };
    return MAP[type] || type || t("activityTimeline.actionUpdated");
  }

  function sanitizedContent(item) {
    const raw = item.content || item.data || item.comment || "";
    if (typeof raw !== "string") return String(raw);
    return sanitizeHtml(raw);
  }
</script>
