<script setup>
  /**
   * Düzenleyici başlığı: olay bağlamı, yayın durumu, SABİT kayıt durumu
   * göstergesi (`role="status"`), eylemler ve yetkisiz eylemin nedeni.
   */
  import { computed } from "vue";
  import { storeToRefs } from "pinia";

  import AppIcon from "@/components/common/AppIcon.vue";
  import {
    CHANNEL_STATES,
    DELIVERY,
    RECIPIENTS,
    SAVE_STATES,
  } from "@/constants/notificationTemplates";
  import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
  import {
    channelStateText,
    ruleSentence,
    sentChannels,
  } from "@/utils/notificationTemplates/catalog";
  import { formatClock } from "@/utils/dateFormat";

  import NtBadge from "../NtBadge.vue";
  import NtPublishBadge from "../NtPublishBadge.vue";

  defineProps({
    /** Eylem düğmeleri başlıkta mı (dar alanda alt çubuğa taşınır)? */
    showActions: { type: Boolean, default: true },
    actions: { type: Object, required: true },
  });
  const emit = defineEmits(["test", "save", "publish", "channels"]);

  const store = useNotificationTemplatesStore();
  const { template, saveState, draftDiffers, isDirty, canChannels } = storeToRefs(store);

  const event = computed(() => template.value.event);

  /** Düzenleme başlar başlamaz rozet "Yayında · yeni taslak var" olur. */
  const publish = computed(() => {
    const p = event.value.publish;
    if (p.version > 0 && (isDirty.value || draftDiffers.value) && p.state === "yayinda")
      return { ...p, state: "yayinda-taslak" };
    return p;
  });

  const save = computed(() => {
    const s = saveState.value;
    if (s === "degisti") return { tone: "warn", icon: "pencil", text: SAVE_STATES.degisti.label };
    if (s === "kaydediliyor")
      return { tone: "muted", icon: "clock", text: SAVE_STATES.kaydediliyor.label };
    if (s === "basarisiz")
      return { tone: "err", icon: "triangle-alert", text: SAVE_STATES.basarisiz.label };
    if (s === "cakisma")
      return { tone: "err", icon: "triangle-alert", text: SAVE_STATES.cakisma.label };
    if (draftDiffers.value)
      return {
        tone: "ok",
        icon: "check",
        text: `Taslak kaydedildi${template.value.saved_at ? ` · ${formatClock(template.value.saved_at)}` : ""}`,
      };
    return { tone: "muted", icon: "check", text: "Yayındaki sürümle aynı" };
  });

  const recipients = computed(() =>
    (event.value.recipients || []).map((r) => RECIPIENTS[r]?.label || r).join(", ")
  );
  const recipientIcon = computed(() => RECIPIENTS[event.value.recipients?.[0]]?.icon || "user");
  const chans = computed(() =>
    sentChannels(event.value).map((c) => ({
      ...c,
      mandatory: event.value.channels[c.id] === "zorunlu",
      state: CHANNEL_STATES[event.value.channels[c.id]].label,
    }))
  );
  const delivery = computed(() => DELIVERY[event.value.delivery] || DELIVERY.aninda);
  const rule = computed(() => ruleSentence(event.value.channels));
  const chanText = computed(() => channelStateText(event.value));
</script>

<template>
  <div class="nt-edh">
    <div class="nt-edh__top">
      <div class="nt-edh__title">
        <h1 class="nt-h1">{{ event.name }}</h1>
        <p class="nt-sub nt-mono">{{ event.key }}</p>
      </div>
      <div v-if="showActions" class="nt-edh__actions">
        <button
          type="button"
          class="hdr-btn-outlined"
          data-act="test"
          :disabled="actions.testDisabled"
          @click="emit('test')"
        >
          <AppIcon name="send" :size="14" />Test gönder
        </button>
        <button
          type="button"
          class="hdr-btn-outlined"
          data-act="save"
          :disabled="actions.saveDisabled"
          @click="emit('save')"
        >
          Taslağı kaydet
        </button>
        <button
          type="button"
          class="hdr-btn-primary"
          data-act="publish"
          :disabled="actions.publishDisabled"
          :aria-describedby="actions.reason ? 'nt-ed-reason' : undefined"
          @click="emit('publish')"
        >
          {{ actions.publishLabel }}
        </button>
      </div>
    </div>

    <div class="nt-edh__status">
      <NtPublishBadge :publish="publish" full />
      <NtBadge v-if="event.review_state === 'onay-bekliyor'" tone="info" icon="clock">
        Onay bekliyor
      </NtBadge>
      <NtBadge
        v-if="event.representative"
        tone="outline"
        icon="file-text"
        title="Bu olayın metni olay adından üretilmiş temsili içeriktir."
      >
        Temsili içerik
      </NtBadge>
      <span id="nt-save-state" class="nt-edh__save" :class="`is-${save.tone}`" role="status">
        <AppIcon :name="save.icon" :size="13" />{{ save.text }}
      </span>
    </div>

    <p v-if="actions.reason && showActions" id="nt-ed-reason" class="nt-hint">
      {{ actions.reason }}
    </p>

    <div class="nt-edh__ctx">
      <span class="nt-edh__item">
        <AppIcon :name="recipientIcon" :size="14" /><span class="nt-sr">Alıcı: </span
        >{{ recipients }}
      </span>
      <span class="nt-edh__chans" role="img" :aria-label="`Kanallar. ${chanText}`">
        <NtBadge
          v-for="c in chans"
          :key="c.id"
          :tone="c.mandatory ? 'brand' : 'outline'"
          :icon="c.icon"
        >
          {{ c.label }}<AppIcon v-if="c.mandatory" name="lock" :size="11" />
        </NtBadge>
      </span>
      <span class="nt-edh__item">
        <AppIcon :name="delivery.icon" :size="14" />{{ delivery.label }}
      </span>
      <button type="button" class="nt-link" data-channel-link @click="emit('channels')">
        {{ canChannels ? "Kanal ayarı" : "Kanal ayarını gör" }}
      </button>
    </div>
    <p class="nt-hint">{{ rule }}</p>
  </div>
</template>

<style scoped lang="scss">
  .nt-edh {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .nt-edh__top {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .nt-edh__title {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .nt-edh__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .nt-edh__status,
  .nt-edh__ctx {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }

  .nt-edh__save {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    color: var(--nt-muted);

    &.is-ok {
      color: var(--nt-ok-fg);
    }

    &.is-warn {
      color: var(--nt-warn-fg);
    }

    &.is-err {
      color: var(--nt-err-fg);
    }
  }

  .nt-edh__item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .nt-edh__chans {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
  }
</style>
