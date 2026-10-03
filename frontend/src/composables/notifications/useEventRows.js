import { computed } from "vue";

import { DELIVERY, LANGS, RECIPIENTS, TRANSLATION_STATES } from "@/constants/notificationTemplates";
import {
  channelStateText,
  groupByCategory,
  ruleSentence,
  translationSummary,
} from "@/utils/notificationTemplates/catalog";
import { formatDateTime } from "@/utils/dateFormat";

const PUBLISH_SUB = { "yayinda-taslak": "yeni taslak var", taslak: "henüz yayınlanmadı" };

/** Olayı satır görünüm modeline çevirir (şablonda fonksiyon çağrısı olmasın diye). */
export function toEventRow(event) {
  return {
    key: event.key,
    event,
    name: event.name,
    recipients: (event.recipients || []).map((r) => RECIPIENTS[r]?.label || r).join(", "),
    recipientIcon: RECIPIENTS[event.recipients?.[0]]?.icon || "user",
    delivery: DELIVERY[event.delivery] || DELIVERY.aninda,
    translation: translationSummary(event),
    publishSub: PUBLISH_SUB[event.publish?.state] || "",
    channelText: channelStateText(event),
    rule: ruleSentence(event.channels),
    why: event.why || "",
    updatedBy: event.updated_by || "—",
    updatedAt: formatDateTime(event.updated_at),
    langStates: LANGS.map((l) => ({
      id: l.id,
      short: l.short,
      ...TRANSLATION_STATES[event.langs?.[l.id] || "eksik"],
    })),
  };
}

/**
 * Görünen olayları modül başlıklarıyla gruplar.
 * @param {import("vue").Ref<object[]>} visible sayfalanmış olaylar
 * @param {import("vue").Ref<object[]>} matched süzülmüş tüm olaylar (grup sayacı için)
 */
export function useEventRows(visible, matched) {
  const groups = computed(() =>
    groupByCategory(visible.value, matched.value).map((g) => ({
      ...g,
      rows: g.events.map(toEventRow),
    }))
  );
  return { groups };
}
