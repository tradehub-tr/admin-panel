<script setup>
  /**
   * Çakışma (409): başka bir oturum taslağı değiştirdi. Farkı gör (alan
   * bazında) / Onların sürümünü yükle / Benimkini yaz. Kapatılırsa başlıkta
   * "Başkası değiştirdi" ve "Çakışmayı çöz" bandı kalır.
   */
  import { computed, ref, watch } from "vue";
  import { storeToRefs } from "pinia";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useToast } from "@/composables/useToast";
  import { LANGS } from "@/constants/notificationTemplates";
  import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
  import { sentChannels } from "@/utils/notificationTemplates/catalog";
  import { formatClock } from "@/utils/dateFormat";
  import { fieldDiffs } from "@/utils/notificationTemplates/diff";

  import NtFieldDiff from "../NtFieldDiff.vue";
  import NtNote from "../NtNote.vue";
  import NtOverlay from "../NtOverlay.vue";

  const open = defineModel("open", { type: Boolean, default: false });

  const store = useNotificationTemplatesStore();
  const { conflict, template, working } = storeToRefs(store);
  const toast = useToast();

  const showDiff = ref(false);
  const busy = ref(false);
  const failure = ref("");

  const who = computed(() => conflict.value?.saved_by || "Başka bir yönetici");
  const when = computed(() =>
    conflict.value?.saved_at ? formatClock(conflict.value.saved_at) : ""
  );

  /** Onların sürümü ↔ benimki arasında fark olan kapsamlar. */
  const scopes = computed(() => {
    const theirs = conflict.value?.theirs;
    const event = template.value?.event;
    if (!theirs || !event || !showDiff.value) return [];
    const out = [];
    for (const channel of sentChannels(event))
      for (const lang of LANGS) {
        const diff = fieldDiffs(
          channel.id,
          theirs[channel.id]?.[lang.id] ?? null,
          working.value?.[channel.id]?.[lang.id] ?? null,
          { onlyChanged: true }
        );
        if (diff.changed)
          out.push({
            id: `${channel.id}-${lang.id}`,
            title: `${channel.label} · ${lang.short}`,
            rows: diff.rows,
          });
      }
    return out;
  });

  watch(open, (isOpen) => {
    if (!isOpen) return;
    showDiff.value = false;
    failure.value = "";
  });

  async function resolve(choice) {
    busy.value = true;
    failure.value = "";
    try {
      const result = await store.resolveConflict(choice);
      if (result === "failed" || result === "conflict") {
        failure.value = "İşlem tamamlanamadı; yeniden deneyin.";
        return;
      }
      open.value = false;
      if (choice === "theirs")
        toast.info("Onların sürümü yüklendi; sizin değişiklikleriniz atıldı.");
      else toast.success("Sizin sürümünüz yazıldı; önceki kayıt geçmişte duruyor.");
    } catch {
      failure.value = "İşlem tamamlanamadı; yeniden deneyin.";
    } finally {
      busy.value = false;
    }
  }
</script>

<template>
  <NtOverlay
    v-model:open="open"
    title="Başkası değiştirdi"
    size="wide"
    :busy="busy"
    initial-focus="#nt-cf-diff"
  >
    <p class="nt-cf__desc">
      <strong
        >{{ who }}<template v-if="when"> {{ when }}'de</template> değiştirdi.</strong
      >
      Siz düzenlerken bu şablonun taslağı başka bir oturumdan kaydedildi. Sizin kaydınız yazılmadı;
      iki sürümden birini seçin.
    </p>

    <div v-if="showDiff" class="nt-cf__diff">
      <template v-for="scope in scopes" :key="scope.id">
        <h3 class="nt-h3">{{ scope.title }}</h3>
        <NtFieldDiff
          :rows="scope.rows"
          :old-label="`Onların sürümü${when ? ` (${when})` : ''}`"
          new-label="Sizin sürümünüz"
        />
      </template>
      <p v-if="!scopes.length" class="nt-hint">İki sürüm arasında içerik farkı yok.</p>
    </div>

    <NtNote v-if="failure" tone="err" alert>{{ failure }}</NtNote>

    <template #footer>
      <button
        id="nt-cf-diff"
        type="button"
        class="hdr-btn-outlined"
        :aria-expanded="showDiff"
        @click="showDiff = !showDiff"
      >
        <AppIcon name="git-compare" :size="14" />Farkı gör
      </button>
      <button type="button" class="hdr-btn-outlined" :disabled="busy" @click="resolve('theirs')">
        Onların sürümünü yükle
      </button>
      <button type="button" class="hdr-btn-primary" :disabled="busy" @click="resolve('mine')">
        Benimkini yaz
      </button>
    </template>
  </NtOverlay>
</template>

<style scoped lang="scss">
  .nt-cf__desc {
    margin: 0;
  }

  .nt-cf__diff {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>
