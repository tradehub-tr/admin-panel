<script setup>
  /**
   * Yayın modalı. Engelleyici hata yayını DURDURUR ("Alana git" ilgili
   * kanal/dil/alanı açar); uyarı onay kutusuyla geçilir. Yayın yetkisi yoksa
   * aynı modal "Onaya gönder" olarak çalışır.
   */
  import { computed, nextTick, ref, watch } from "vue";
  import { storeToRefs } from "pinia";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { useToast } from "@/composables/useToast";
  import { conflictOf, validationOf } from "@/api/notificationTemplates";
  import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
  import { changedFieldList } from "@/utils/notificationTemplates/diff";
  import { normalizeServerIssue, splitIssues } from "@/utils/notificationTemplates/validation";

  import NtBadge from "../NtBadge.vue";
  import NtIssue from "../NtIssue.vue";
  import NtNote from "../NtNote.vue";
  import NtOverlay from "../NtOverlay.vue";

  const props = defineProps({
    /** Yerel doğrulamanın tüm sorunları */
    issues: { type: Array, default: () => [] },
  });
  const emit = defineEmits(["goto", "conflict"]);
  const open = defineModel("open", { type: Boolean, default: false });

  const store = useNotificationTemplatesStore();
  const { template, working, isDirty, publishMode } = storeToRefs(store);
  const toast = useToast();

  const ack = ref(false);
  const busy = ref(false);
  const failure = ref("");
  const retried = ref(false);
  const serverIssues = ref(null);

  const event = computed(() => template.value?.event);
  const canPublish = computed(() => publishMode.value === "publish");
  const verb = computed(() => (canPublish.value ? "Yayınla" : "Onaya gönder"));
  const current = computed(() => event.value?.publish.version || 0);
  const next = computed(() => current.value + 1);

  const lists = computed(() => serverIssues.value || splitIssues(props.issues));
  const blocking = computed(() => lists.value.blocking);
  const warnings = computed(() => lists.value.warnings);
  const changes = computed(() =>
    event.value ? changedFieldList(event.value, template.value.published, working.value) : []
  );
  const disabled = computed(
    () => busy.value || blocking.value.length > 0 || (warnings.value.length > 0 && !ack.value)
  );
  const focusTarget = computed(() =>
    blocking.value.length ? "[data-goto]" : warnings.value.length ? "#nt-pub-ack" : "#nt-pub-ok"
  );

  watch(open, (isOpen) => {
    if (!isOpen) return;
    ack.value = false;
    failure.value = "";
    retried.value = false;
    serverIssues.value = null;
  });

  async function fromServer(payload) {
    serverIssues.value = {
      blocking: (payload.blocking || []).map((i) => normalizeServerIssue(i, "blocking")),
      warnings: (payload.warnings || []).map((i) => normalizeServerIssue(i, "warning")),
    };
    // Sunucu reddiyle onay düğmesi kapanır ve odak kaybolur; ilk "Alana git"e taşınır
    // ki klavye (Esc dahil) modalın içinde kalsın.
    await nextTick();
    document.querySelector(".nt-ov__panel [data-goto]")?.focus();
  }

  async function confirm() {
    busy.value = true;
    failure.value = "";
    try {
      const res = await store.publish();
      if (res.status === "conflict") {
        open.value = false;
        return emit("conflict");
      }
      if (res.status === "save-failed") {
        retried.value = true;
        failure.value = "Taslak kaydedilemedi; değişiklikleriniz bu sekmede duruyor.";
        return;
      }
      open.value = false;
      if (res.status === "published")
        toast.success(`v${res.version} yayınlandı; sonraki gönderimler bu sürümü kullanır.`);
      else
        toast.info(
          `Onaya gönderildi. ${current.value ? `Yayındaki v${current.value} değişmedi.` : "Henüz yayında sürüm yok."}`
        );
    } catch (e) {
      const invalid = validationOf(e);
      if (invalid) return fromServer(invalid);
      if (conflictOf(e)) {
        open.value = false;
        return emit("conflict", conflictOf(e));
      }
      retried.value = true;
      failure.value = `${canPublish.value ? "Yayınlanamadı" : "Onaya gönderilemedi"}. Sunucu yanıt vermedi; yayındaki sürüm değişmedi, taslağınız duruyor.`;
    } finally {
      busy.value = false;
    }
  }

  function go(issue) {
    open.value = false;
    emit("goto", issue);
  }
</script>

<template>
  <NtOverlay v-model:open="open" size="wide" :busy="busy" :initial-focus="focusTarget">
    <template #title>
      {{ verb }}:
      <span class="nt-num">
        <template v-if="current"
          >v{{ current }} <AppIcon name="arrow-right" :size="13" class="inline mx-1" /> </template
        >v{{ next }}
      </span>
    </template>

    <template v-if="event">
      <p class="nt-pub__desc">
        {{ event.name }} <code>{{ event.key }}</code
        >.
        {{
          canPublish
            ? "Yayınlanınca sonraki gönderimler bu sürümü kullanır; eski sürüme geri dönebilirsiniz."
            : "Süper admin onaylayana kadar yayındaki sürüm değişmez."
        }}
      </p>

      <section
        v-if="blocking.length"
        class="nt-pub__sec nt-pub__sec--err"
        aria-labelledby="nt-pub-err"
      >
        <h3 id="nt-pub-err" class="nt-h3">
          <AppIcon name="triangle-alert" :size="14" />Engelleyici hatalar
          <span class="nt-num">{{ blocking.length }}</span>
        </h3>
        <ul>
          <li v-for="(issue, i) in blocking" :key="`b${i}`">
            <NtIssue :issue="issue" />
            <button type="button" class="hdr-btn-outlined nt-btn--sm" data-goto @click="go(issue)">
              Alana git
            </button>
          </li>
        </ul>
      </section>

      <section
        v-if="warnings.length"
        class="nt-pub__sec nt-pub__sec--warn"
        aria-labelledby="nt-pub-warn"
      >
        <h3 id="nt-pub-warn" class="nt-h3">
          <AppIcon name="info" :size="14" />Uyarılar
          <span class="nt-num">{{ warnings.length }}</span>
        </h3>
        <ul>
          <li v-for="(issue, i) in warnings" :key="`w${i}`">
            <NtIssue :issue="issue" />
            <button type="button" class="hdr-btn-outlined nt-btn--sm" data-goto @click="go(issue)">
              Alana git
            </button>
          </li>
        </ul>
      </section>

      <section class="nt-pub__sec" aria-labelledby="nt-pub-diff">
        <h3 id="nt-pub-diff" class="nt-h3">
          Değişen alanlar <span class="nt-num">{{ changes.length }}</span>
        </h3>
        <ul>
          <li v-for="(c, i) in changes" :key="`c${i}`" class="nt-pub__change">
            <span><AppIcon :name="c.icon" :size="13" class="inline" /> {{ c.text }}</span>
            <NtBadge :tone="c.tag === 'yeni' ? 'ok' : 'neutral'">{{ c.tag }}</NtBadge>
          </li>
          <li v-if="!changes.length">Yayındaki sürüme göre içerik farkı yok.</li>
        </ul>
      </section>

      <p v-if="isDirty" class="nt-hint">
        Kaydedilmemiş değişiklikler bu işlemle birlikte kaydedilir.
      </p>

      <label v-if="!blocking.length && warnings.length" class="nt-pub__ack">
        <input id="nt-pub-ack" v-model="ack" type="checkbox" />
        <span>Uyarıları gördüm; yine de {{ canPublish ? "yayınla" : "onaya gönder" }}</span>
      </label>

      <NtNote v-if="failure" tone="err" alert>{{ failure }}</NtNote>

      <p v-if="blocking.length" id="nt-pub-reason" class="nt-pub__reason">
        <AppIcon name="lock" :size="14" />{{ blocking.length }} engelleyici hata düzeltilmeden
        {{ canPublish ? "yayınlanamaz" : "onaya gönderilemez" }}.
      </p>
    </template>

    <template #footer>
      <button type="button" class="hdr-btn-outlined" :disabled="busy" @click="open = false">
        Vazgeç
      </button>
      <button
        id="nt-pub-ok"
        type="button"
        class="hdr-btn-primary"
        :disabled="disabled"
        :aria-describedby="blocking.length ? 'nt-pub-reason' : undefined"
        @click="confirm"
      >
        {{
          busy ? (canPublish ? "Yayınlanıyor" : "Gönderiliyor") : retried ? "Yeniden dene" : verb
        }}
      </button>
    </template>
  </NtOverlay>
</template>

<style scoped lang="scss">
  .nt-pub__desc {
    margin: 0;
  }

  .nt-pub__sec {
    padding: 10px 12px;
    border: 1px solid var(--nt-line);
    border-radius: 10px;

    h3 {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;

      > :first-child {
        flex: 1 1 240px;
      }
    }
  }

  .nt-pub__sec--err {
    border-color: var(--nt-err-line);
  }

  .nt-pub__sec--warn {
    border-color: transparent;
    background: var(--nt-warn-bg);
  }

  .nt-pub__ack {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    font-weight: 600;
    cursor: pointer;

    input {
      width: 18px;
      height: 18px;
    }
  }

  .nt-pub__reason {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-weight: 600;
    color: var(--nt-err-fg);
  }
</style>
