import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { LANGS, channelOf, langOf } from "@/constants/notificationTemplates";
import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
import { sentChannels } from "@/utils/notificationTemplates/catalog";
import { knownNames, tokens } from "@/utils/notificationTemplates/template";
import { validateAll } from "@/utils/notificationTemplates/validation";

/**
 * Düzenleyicinin ekran durumu: seçili kanal/dil ve bunlardan türeyen her şey
 * (alanlar, doğrulama, sekme bayrakları). Sunucu durumu store'dadır.
 */
export function useTemplateEditor() {
  const store = useNotificationTemplatesStore();
  const { template, working } = storeToRefs(store);

  const channel = ref("email");
  const lang = ref("tr");

  const event = computed(() => template.value?.event || null);
  const variables = computed(() => template.value?.variables || []);
  const requiredByChannel = computed(() => template.value?.required_by_channel || {});
  const known = computed(() => knownNames(variables.value));
  const channels = computed(() => (event.value ? sentChannels(event.value) : []));
  const required = computed(() => requiredByChannel.value[channel.value] || []);

  /** Aktif kapsamın alan değerleri; `null` → bu dilde içerik yok. */
  const fields = computed(() => working.value?.[channel.value]?.[lang.value] ?? null);

  /** İçerikte geçen değişken adları (değişken panelindeki "eksik" etiketi için). */
  const used = computed(() => {
    const out = new Set();
    for (const value of Object.values(fields.value || {}))
      for (const t of tokens(value)) out.add(t.name);
    return out;
  });

  /** Tek sözlükten üretilen tüm sorunlar (açık kanallar × diller + çeviri durumu). */
  const issues = computed(() =>
    event.value && working.value
      ? validateAll(event.value, working.value, {
          variables: variables.value,
          requiredByChannel: requiredByChannel.value,
        })
      : []
  );
  const scopeIssues = computed(() =>
    issues.value.filter((i) => i.channel === channel.value && i.lang === lang.value)
  );
  const blockers = (list) => list.filter((i) => i.severity === "blocking").length;

  const channelTabs = computed(() =>
    channels.value.map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      lock: event.value.channels[c.id] === "zorunlu",
      errors: blockers(issues.value.filter((i) => i.channel === c.id)),
    }))
  );

  const langTabs = computed(() =>
    LANGS.map((l) => {
      const state = event.value?.langs?.[l.id] || "eksik";
      const errors = blockers(
        issues.value.filter((i) => i.channel === channel.value && i.lang === l.id)
      );
      const STATE = {
        bekliyor: ["bekliyor", "warn", "clock"],
        kopya: ["kopya", "warn", "copy"],
        eksik: ["eksik", "err", "triangle-alert"],
      };
      const [meta, metaTone, metaIcon] = l.source
        ? ["kaynak", "", ""]
        : STATE[state] || ["", "", ""];
      const LABEL = {
        hazir: "Hazır",
        bekliyor: "Çeviri bekliyor",
        kopya: "Kaynak dilden kopya",
        eksik: "Eksik",
      };
      return {
        id: l.id,
        label: l.short,
        meta,
        metaTone,
        metaIcon,
        errors,
        ariaLabel: `${l.label} (${l.short})${l.source ? ", kaynak dil" : `, ${LABEL[state]}`}${errors ? `, ${errors} hata` : ""}`,
      };
    })
  );

  const channelInfo = computed(() => channelOf(channel.value));
  const langInfo = computed(() => langOf(lang.value));

  // Olay değişince ya da seçili kanal kapatılınca geçerli bir kanala düş.
  watch(
    channels,
    (list) => {
      if (list.length && !list.some((c) => c.id === channel.value))
        channel.value = (list.find((c) => c.id === "email") || list[0]).id;
    },
    { immediate: true }
  );

  function reset() {
    lang.value = "tr";
    const list = channels.value;
    channel.value = (list.find((c) => c.id === "email") || list[0] || { id: "email" }).id;
  }

  return {
    channel,
    lang,
    event,
    variables,
    requiredByChannel,
    required,
    known,
    channels,
    fields,
    used,
    issues,
    scopeIssues,
    channelTabs,
    langTabs,
    channelInfo,
    langInfo,
    reset,
  };
}
