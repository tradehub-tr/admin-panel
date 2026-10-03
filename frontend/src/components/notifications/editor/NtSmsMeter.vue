<script setup>
  /**
   * SMS sayacı: örnek veriyle DOLDURULMUŞ metni ölçer (GSM-7: 160 / 153,
   * Unicode: 70 / 67). Sınırlar standart GSM 03.38 varsayımıdır.
   */
  import { computed } from "vue";

  import { smsInfo } from "@/utils/notificationTemplates/sms";

  const props = defineProps({
    /** Örnek veriyle doldurulmuş metin */
    text: { type: String, default: "" },
    canEdit: { type: Boolean, default: false },
  });
  const emit = defineEmits(["simplify"]);

  const info = computed(() => smsInfo(props.text));
</script>

<template>
  <div class="nt-sms-meter" role="status">
    <span class="nt-sms-meter__main" :class="{ 'is-over': info.segments > 1 }">
      <b class="nt-num">{{ info.len }}</b
      ><span class="nt-num">/{{ info.single }}</span> karakter
    </span>
    <span>{{ info.encoding }}</span>
    <span class="nt-num">{{ info.segments }} segment</span>
    <span class="nt-hint">örnek veriyle ölçüldü</span>
    <button
      v-if="info.turkish && canEdit"
      type="button"
      class="hdr-btn-outlined nt-btn--sm"
      @click="emit('simplify')"
    >
      Türkçe karakterleri sadeleştir
    </button>
  </div>
</template>

<style scoped lang="scss">
  .nt-sms-meter {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 14px;
    font-size: 12px;
    color: var(--nt-fg-2);
  }

  .nt-sms-meter__main.is-over {
    font-weight: 700;
    color: var(--nt-warn-fg);
  }
</style>
