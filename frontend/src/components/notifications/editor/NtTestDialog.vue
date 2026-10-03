<script setup>
  /**
   * Test gönder: kanala göre hedef; hangi sürümün ve hangi dilin gideceği özet
   * satırında yazar. Alan doğrulaması, bekleme, hata + yeniden dene, sonuç.
   *
   * Sunucu kuralı (`send_test`): e-posta/SMS hedefi doğrulanmış kendi adresiniz ya da
   * sunucudaki izinli test adresleridir; uygulama içi/push hedefi boş bırakılırsa oturumdaki
   * kullanıcıdır. Her deneme bir `request_id` (UUID) taşır: aynı kimlikle yeniden deneme
   * ikinci ileti üretmez. Başarı "kuyruğa alındı" demektir (202 queued) — teslim değil.
   */
  import { computed, ref, watch } from "vue";
  import { storeToRefs } from "pinia";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { newRequestId, providerUnavailable, rateLimited } from "@/api/notificationTemplates";
  import { useToast } from "@/composables/useToast";
  import { LANGS, channelOf, langOf } from "@/constants/notificationTemplates";
  import { useAuthStore } from "@/stores/auth";
  import { useNotificationTemplatesStore } from "@/stores/notificationTemplates";
  import { sentChannels } from "@/utils/notificationTemplates/catalog";
  import { resolvePreviewContent } from "@/utils/notificationTemplates/preview";

  import NtChoice from "../NtChoice.vue";
  import NtIssue from "../NtIssue.vue";
  import NtNote from "../NtNote.vue";
  import NtOverlay from "../NtOverlay.vue";

  const props = defineProps({
    channel: { type: String, required: true },
    lang: { type: String, required: true },
    issues: { type: Array, default: () => [] },
  });
  const open = defineModel("open", { type: Boolean, default: false });

  const store = useNotificationTemplatesStore();
  const { template, working, isDirty } = storeToRefs(store);
  const auth = useAuthStore();
  const toast = useToast();

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const TARGETS = {
    email: {
      label: "E-posta adresi",
      type: "email",
      hint: "Doğrulanmış kendi adresiniz ya da izinli test adresi.",
      check: (v) =>
        EMAIL_RE.test(v) ? "" : "Geçerli bir e-posta adresi yazın; örnek: ad@firma.example",
    },
    sms: {
      label: "Telefon numarası",
      type: "tel",
      placeholder: "+90 5xx xxx xx xx",
      hint: "Yalnız sunucuda izinli test numaraları.",
      check: (v) =>
        /^\+?\d{10,14}$/.test(v.replace(/[\s()-]/g, ""))
          ? ""
          : "Ülke koduyla geçerli bir numara yazın; örnek: +90 5xx xxx xx xx",
    },
    push: {
      label: "Test kullanıcısı (isteğe bağlı)",
      type: "email",
      hint: "Boş bırakılırsa kendi kayıtlı cihazlarınıza gider.",
      check: (v) => (!v || EMAIL_RE.test(v) ? "" : "Test kullanıcısının e-posta adresini yazın."),
    },
    inapp: {
      label: "Test kullanıcısı (isteğe bağlı)",
      type: "email",
      hint: "Boş bırakılırsa kendi bildirim kutunuza düşer.",
      check: (v) => (!v || EMAIL_RE.test(v) ? "" : "Test kullanıcısının e-posta adresini yazın."),
    },
  };

  const state = ref({ channel: "email", lang: "tr", version: "draft", target: "" });
  const targetError = ref("");
  const phase = ref("idle"); // idle | sending | sent | failed
  const sentSummary = ref("");
  const failure = ref("");
  const failureTone = ref("err");
  // Bir deneme dizisinin kimliği: başarıdan sonra yenilenir, hata sonrası yeniden denemede korunur.
  let requestId = newRequestId();

  const event = computed(() => template.value?.event);
  const channels = computed(() => (event.value ? sentChannels(event.value) : []));
  const hasLive = computed(() => (event.value?.publish.version || 0) > 0);
  const target = computed(() => TARGETS[state.value.channel]);
  const versionOptions = computed(() => [
    { value: "draft", label: "Taslak (şu an düzenlediğiniz)" },
    {
      value: "published",
      label: hasLive.value ? `Yayındaki v${event.value.publish.version}` : "Yayında sürüm yok",
      disabled: !hasLive.value,
    },
  ]);
  const tree = computed(() =>
    state.value.version === "draft" ? working.value : template.value?.published
  );
  const resolved = computed(() =>
    resolvePreviewContent(tree.value, state.value.channel, state.value.lang)
  );
  const fallbackIssue = computed(() => {
    if (!resolved.value.fell) return null;
    const s = event.value.langs?.[state.value.lang];
    return {
      kind: "missing_translation",
      severity: "warning",
      channel: null,
      lang: state.value.lang,
      state: s === "hazir" ? "eksik" : s,
    };
  });
  const blockers = computed(() =>
    state.value.version === "draft" && !resolved.value.fell
      ? props.issues.filter(
          (i) =>
            i.severity === "blocking" &&
            i.channel === state.value.channel &&
            i.lang === state.value.lang
        ).length
      : 0
  );
  const summary = computed(
    () =>
      `${channelOf(state.value.channel)?.label} · ${langOf(resolved.value.lang)?.short} · ${
        state.value.version === "draft" ? "Taslak" : `Yayındaki v${event.value?.publish.version}`
      }`
  );

  function defaultTarget(channel) {
    return channel === "email" ? auth.user?.email || "" : "";
  }

  watch(open, (isOpen) => {
    if (!isOpen) return;
    state.value = {
      channel: props.channel,
      lang: props.lang,
      version: "draft",
      target: defaultTarget(props.channel),
    };
    targetError.value = "";
    phase.value = "idle";
    failure.value = "";
    requestId = newRequestId();
  });
  watch(
    () => state.value.channel,
    (c) => {
      state.value.target = defaultTarget(c);
      targetError.value = "";
    }
  );

  async function send() {
    const value = state.value.target.trim();
    targetError.value = target.value.check(value);
    if (targetError.value) return document.getElementById("nt-test-target")?.focus();
    phase.value = "sending";
    failure.value = "";
    try {
      // Taslak testi sunucudaki taslağı gönderir: önce kaydedilmemiş değişiklikler yazılır.
      if (state.value.version === "draft" && isDirty.value) {
        const saved = await store.saveDraft();
        if (saved !== "saved" && saved !== "clean") throw new Error("Taslak kaydedilemedi.");
      }
      await store.sendTest({
        key: event.value.key,
        channel: state.value.channel,
        lang: state.value.lang,
        version: state.value.version,
        target: value,
        request_id: requestId,
      });
      sentSummary.value = `${summary.value} → ${value || auth.user?.email || "kendi hesabınız"}`;
      phase.value = "sent";
      requestId = newRequestId();
      toast.success("Test kuyruğa alındı");
    } catch (e) {
      const noProvider = providerUnavailable(e);
      failureTone.value = noProvider ? "warn" : "err";
      failure.value = noProvider
        ? `${channelOf(state.value.channel)?.label} için gönderim sağlayıcısı henüz yapılandırılmamış; test iletisi gönderilemez.`
        : rateLimited(e)
          ? "Çok sık deneme yapıldı. Bir süre sonra yeniden deneyin."
          : e.message || "Sunucu yanıt vermedi.";
      phase.value = "failed";
    }
  }
</script>

<template>
  <NtOverlay
    v-model:open="open"
    title="Test gönder"
    :busy="phase === 'sending'"
    initial-focus="#nt-test-target"
  >
    <template v-if="event">
      <p class="nt-test__desc">
        {{ event.name }} için tek bir test iletisi gönderilir. Örnek veri kullanılır; gerçek
        kullanıcıya gitmez.
      </p>
      <div class="nt-test__grid">
        <div>
          <label class="form-label" for="nt-test-channel">Kanal</label>
          <select id="nt-test-channel" v-model="state.channel" class="form-input">
            <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="nt-test-lang">Dil</label>
          <select id="nt-test-lang" v-model="state.lang" class="form-input">
            <option v-for="l in LANGS" :key="l.id" :value="l.id">
              {{ l.label }} ({{ l.short }})
            </option>
          </select>
        </div>
      </div>
      <fieldset class="nt-test__set">
        <legend class="form-label">Gönderilecek sürüm</legend>
        <NtChoice v-model="state.version" name="nt-test-version" :options="versionOptions" />
      </fieldset>
      <div>
        <label class="form-label" for="nt-test-target">{{ target.label }}</label>
        <input
          id="nt-test-target"
          v-model="state.target"
          class="form-input"
          autocomplete="off"
          :type="target.type"
          :inputmode="target.type === 'tel' ? 'tel' : undefined"
          :placeholder="target.placeholder"
          :aria-invalid="targetError ? 'true' : undefined"
          aria-describedby="nt-test-target-desc"
        />
        <div id="nt-test-target-desc" class="nt-test__desc-line">
          <span v-if="target.hint" class="nt-hint">{{ target.hint }}</span>
          <p v-if="targetError" class="nt-test__err">
            <AppIcon name="triangle-alert" :size="14" />{{ targetError }}
          </p>
        </div>
      </div>

      <NtIssue v-if="fallbackIssue" :issue="fallbackIssue" />
      <NtNote v-if="blockers" tone="warn">
        <strong>Bu içerikte {{ blockers }} engelleyici hata var.</strong> Test yine de gider;
        tanımsız değişkenler boş görünür.
      </NtNote>
      <p v-if="isDirty && state.version === 'draft'" class="nt-hint">
        Kaydedilmemiş değişiklikler önce kaydedilir.
      </p>

      <p class="nt-test__sum" data-test-summary>
        <AppIcon name="send" :size="14" />
        <span
          >Gönderilecek: <strong>{{ summary }}</strong></span
        >
      </p>

      <div role="status">
        <NtNote v-if="phase === 'sending'" tone="info" icon="clock">
          Test iletisi sıraya alınıyor…
        </NtNote>
        <NtNote v-else-if="phase === 'sent'" tone="ok">
          <strong>Test kuyruğa alındı.</strong><br />{{ sentSummary }}<br />
          <span class="nt-hint">Teslim, sağlayıcı iletiyi işleyince gerçekleşir.</span>
        </NtNote>
        <NtNote v-else-if="phase === 'failed'" :tone="failureTone">
          <strong>Test gönderilemedi.</strong><br />{{ failure }} Hedef ve içerik değişmedi.
        </NtNote>
      </div>
    </template>

    <template #footer>
      <button
        type="button"
        class="hdr-btn-outlined"
        :disabled="phase === 'sending'"
        @click="open = false"
      >
        {{ phase === "sent" ? "Kapat" : "Vazgeç" }}
      </button>
      <button
        v-if="phase !== 'sent'"
        type="button"
        class="hdr-btn-primary"
        data-test-send
        :disabled="phase === 'sending'"
        @click="send"
      >
        <AppIcon name="send" :size="14" />
        {{
          phase === "sending" ? "Gönderiliyor" : phase === "failed" ? "Yeniden dene" : "Test gönder"
        }}
      </button>
    </template>
  </NtOverlay>
</template>

<style scoped lang="scss">
  .nt-test__desc {
    margin: 0;
  }

  .nt-test__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    select {
      width: 100%;
    }
  }

  .nt-test__set {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .nt-test__desc-line {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
  }

  .nt-test__err {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 12px;
    color: var(--nt-err-fg);
  }

  .nt-test__sum {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--nt-bg-muted);
  }
</style>
