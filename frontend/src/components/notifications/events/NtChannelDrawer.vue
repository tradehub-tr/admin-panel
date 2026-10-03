<script setup>
  /**
   * Kanal çekmecesi: kanal başına üç durumlu seçim + seçmeli kanalda
   * kullanıcı varsayılanı + e-posta gönderim zamanı.
   *
   * "Olay zorunlu" ayrı bir anahtar DEĞİL; kanal durumlarından türeyen cümle
   * canlı gösterilir, çelişkili durum oluşamaz. En az bir kanal açık olmalıdır.
   * Kayıttan sonra odak, listedeki aynı olayın kanal düğmesine döner.
   */
  import { computed, ref, watch } from "vue";
  import { storeToRefs } from "pinia";

  import AppIcon from "@/components/common/AppIcon.vue";
  import BaseSwitch from "@/components/common/BaseSwitch.vue";
  import { useToast } from "@/composables/useToast";
  import { CHANNELS, CHANNEL_STATES, DELIVERY } from "@/constants/notificationTemplates";
  import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
  import {
    channelPayload,
    hasOpenChannel,
    ruleSentence,
  } from "@/utils/notificationTemplates/catalog";

  import NtChoice from "../NtChoice.vue";
  import NtNote from "../NtNote.vue";
  import NtOverlay from "../NtOverlay.vue";

  const props = defineProps({
    event: { type: Object, default: null },
  });
  const emit = defineEmits(["saved"]);
  const open = defineModel("open", { type: Boolean, default: false });

  const store = useNotificationTemplatesStore();
  const { canChannels, roleName } = storeToRefs(store);
  const toast = useToast();

  const work = ref({ channels: {}, defaults: {}, delivery: "aninda" });
  const saving = ref(false);
  const failure = ref("");
  const retried = ref(false);
  const nf = new Intl.NumberFormat("tr-TR");

  watch(
    () => [open.value, props.event?.key],
    ([isOpen]) => {
      if (!isOpen || !props.event) return;
      work.value = {
        channels: { ...props.event.channels },
        defaults: { ...props.event.defaults },
        delivery: props.event.delivery,
      };
      failure.value = "";
      retried.value = false;
    },
    { immediate: true }
  );

  const stateOptions = (channel) =>
    Object.entries(CHANNEL_STATES).map(([value, def]) => ({
      value,
      label: def.label,
      title: def.desc,
      // "Kullanıcı seçer" yalnız kullanıcının kapatabildiği kanallarda anlamlı.
      disabled: value === "secmeli" && !channel.userToggle,
    }));

  const rows = computed(() =>
    CHANNELS.map((c) => {
      const state = work.value.channels[c.id] || "kapali";
      return {
        ...c,
        state,
        options: stateOptions(c),
        note: `${CHANNEL_STATES[state].desc}${c.userToggle ? "" : ` ${c.note}`}`,
        defaultOn: work.value.defaults[c.id] !== false,
      };
    })
  );
  const deliveryOptions = Object.entries(DELIVERY).map(([value, def]) => ({
    value,
    label: def.label,
    title: def.desc,
  }));

  const rule = computed(() => ruleSentence(work.value.channels));
  const noneOpen = computed(() => !hasOpenChannel(work.value.channels));
  const emailOn = computed(() => (work.value.channels.email || "kapali") !== "kapali");
  const monthly = computed(() => nf.format(props.event?.monthly_estimate || 0));

  function setState(channel, state) {
    work.value.channels[channel] = state;
    if (state === "secmeli" && work.value.defaults[channel] === undefined)
      work.value.defaults[channel] = true;
  }

  async function save() {
    if (!props.event || noneOpen.value || saving.value) return;
    saving.value = true;
    failure.value = "";
    try {
      const updated = await store.saveChannels(props.event.key, channelPayload(work.value));
      open.value = false;
      toast.success(`Kanal ayarı kaydedildi: ${updated.name}. ${ruleSentence(updated.channels)}`);
      emit("saved", updated);
    } catch (e) {
      retried.value = true;
      failure.value =
        e.status === 409
          ? "Bu olayın kanal ayarını başka bir yönetici az önce değiştirdi. Paneli kapatıp güncel ayarı gördükten sonra yeniden deneyin."
          : e.status === 422
            ? e.message
            : "Ayar sunucuya yazılamadı; seçimleriniz bu panelde duruyor.";
    } finally {
      saving.value = false;
    }
  }

  const returnFocus = () =>
    props.event ? document.querySelector(`[data-channel-btn="${props.event.key}"]`) : null;
</script>

<template>
  <NtOverlay
    v-model:open="open"
    variant="drawer"
    :title="event?.name || ''"
    :subtitle="event ? `${event.key} · Kanal ayarı` : ''"
    :busy="saving"
    :return-focus="returnFocus"
  >
    <template v-if="event">
      <NtNote v-if="!canChannels" icon="lock">
        <strong>Bu ayar salt okunur.</strong> {{ store.reasonFor("kanal") }} Rolünüz:
        {{ roleName }}.
      </NtNote>

      <p class="nt-rule" aria-live="polite">
        <AppIcon name="info" :size="15" />
        <span>{{ rule }}</span>
      </p>

      <fieldset v-for="row in rows" :key="row.id" class="nt-chset">
        <legend><AppIcon :name="row.icon" :size="15" />{{ row.label }}</legend>
        <NtChoice
          :name="`nt-state-${row.id}`"
          :options="row.options"
          :model-value="row.state"
          :disabled="!canChannels"
          @update:model-value="setState(row.id, $event)"
        />
        <p class="nt-hint">{{ row.note }}</p>
        <BaseSwitch
          v-if="row.state === 'secmeli'"
          class="nt-chset__default"
          :label="`Yeni kullanıcıda varsayılan: ${row.defaultOn ? 'Açık' : 'Kapalı'}`"
          description="Kullanıcı sonradan kendi tercihinden değiştirir."
          :disabled="!canChannels"
          :model-value="row.defaultOn"
          @update:model-value="work.defaults[row.id] = $event"
        />
      </fieldset>

      <NtNote v-if="noneOpen" tone="err" alert>
        <strong>En az bir kanal gönderilmeli.</strong> Olayı tümüyle durdurmak için bir kanalı açık
        bırakıp şablonu yayından kaldırın.
      </NtNote>

      <fieldset class="nt-chset">
        <legend><AppIcon name="clock" :size="15" />E-posta gönderim zamanı</legend>
        <NtChoice
          v-model="work.delivery"
          name="nt-delivery"
          :options="deliveryOptions"
          :disabled="!canChannels || !emailOn"
        />
        <p class="nt-hint">
          {{
            emailOn
              ? DELIVERY[work.delivery].desc
              : "E-posta bu olayda gönderilmiyor; özet ayarı etkisiz."
          }}
        </p>
      </fieldset>

      <NtNote v-if="emailOn" tone="info">
        <strong>E-posta bu olay için ayda yaklaşık {{ monthly }} gönderim demek.</strong><br />
        Son 30 günün olay sayısından türetilmiş tahmin; maliyet sağlayıcı tarifesine bağlı.
      </NtNote>

      <NtNote v-if="failure" tone="err" alert>
        <strong>Kaydedilemedi.</strong> {{ failure }}
      </NtNote>
    </template>

    <template #footer>
      <button type="button" class="hdr-btn-outlined" :disabled="saving" @click="open = false">
        {{ canChannels ? "Vazgeç" : "Kapat" }}
      </button>
      <button
        v-if="canChannels"
        type="button"
        class="hdr-btn-primary"
        :disabled="saving || noneOpen"
        @click="save"
      >
        {{ saving ? "Kaydediliyor" : retried ? "Yeniden dene" : "Kaydet" }}
      </button>
    </template>
  </NtOverlay>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .nt-rule {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--nt-bg-muted);

    svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
  }

  .nt-chset {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    margin: 0;
    padding: 0 0 12px;
    border: 0;
    border-bottom: 1px solid var(--nt-line-soft);

    legend {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      padding: 0;
      font-weight: 700;
    }
  }

  // Panelin ortak anahtarı; burada metin modül ölçüsünde, odak göstergesi
  // panelin tek odak rengiyle (sarı halka beyazda 3:1'i tutmuyor) ve mobilde
  // dokunma hedefi 44px (görsel iz aynı kalır, saydam kenarlık hedefi büyütür).
  .nt-chset__default {
    :deep(.switch-title) {
      font-size: 13px;
      font-weight: 700;
      color: var(--nt-fg);
    }

    :deep(.switch-desc) {
      font-size: 12px;
      color: var(--nt-muted);
    }

    :deep(.switch:focus-visible) {
      outline: 2px solid $c-info;
      outline-offset: 2px;
    }

    :deep(.switch:not(.on)) {
      background-color: var(--nt-field-line);
    }

    @media (max-width: 767px) {
      :deep(.switch) {
        box-sizing: content-box;
        border: 9px solid transparent;
        background-clip: padding-box;
      }
    }
  }
</style>
