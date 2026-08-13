<template>
  <div class="space-y-4">
    <header>
      <h1 class="text-lg font-semibold">{{ t("logistics.pod.title") }}</h1>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t("logistics.pod.subtitle", { shipment: shipmentName }) }}
      </p>
    </header>

    <ErrorState v-if="error" :error="error" @retry="$emit('retry')" />

    <p v-else-if="!pod" class="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
      {{ t("logistics.pod.empty") }}
    </p>

    <template v-else>
      <dl class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <dt class="text-xs text-slate-500">{{ t("logistics.pod.deliveredAt") }}</dt>
          <dd class="mt-0.5 text-sm font-medium">{{ formatTime(pod.delivered_at) }}</dd>
        </div>
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <dt class="text-xs text-slate-500">{{ t("logistics.pod.receivedBy") }}</dt>
          <dd class="mt-0.5 text-sm font-medium">{{ pod.received_by || "—" }}</dd>
        </div>
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <dt class="text-xs text-slate-500">{{ t("logistics.pod.codeUsed") }}</dt>
          <dd class="mt-0.5">
            <StatusBadge
              :status="pod.delivery_code_used ? 'verified' : 'not_required'"
              :tone="pod.delivery_code_used ? 'success' : 'neutral'"
              :label="pod.delivery_code_used ? t('logistics.pod.codeVerified') : t('logistics.pod.codeNotUsed')"
              :show-dot="false"
            />
          </dd>
        </div>
        <!-- Konum kaynağı ve kaydedilme zamanı ayrı: teslim saatiyle konum
             kaydı arasındaki fark ihtilafta anlamlı bir bilgi. -->
        <div class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <dt class="text-xs text-slate-500">{{ t("logistics.pod.locationSource") }}</dt>
          <dd class="mt-0.5 text-sm">
            {{ sourceLabel(pod.location_source) }}
            <span v-if="pod.location_recorded_at" class="block text-xs text-slate-500">
              {{ formatTime(pod.location_recorded_at) }}
            </span>
          </dd>
        </div>
      </dl>

      <!-- VERİ MİNİMİZASYONU: imza ve fotoğraf kişisel veri. Yetki yoksa
           dosya HİÇ istenmiyor — bulanıklaştırılmış bir önizleme göstermek
           veriyi yine de istemciye indirirdi. -->
      <section v-if="can.viewMedia" class="space-y-3">
        <h2 class="text-sm font-semibold">{{ t("logistics.pod.media") }}</h2>
        <div class="grid gap-3 sm:grid-cols-3">
          <figure v-for="media in mediaItems" :key="media.key" class="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
            <figcaption class="mb-1 text-xs text-slate-500">{{ media.label }}</figcaption>
            <a v-if="media.url" :href="media.url" target="_blank" rel="noopener" class="block">
              <!-- Dosya silinmiş veya erişilemezse kırık-resim ikonu yerine
                   açık bir mesaj: "sunulmadı" ile "yüklenemedi" ihtilafta
                   çok farklı iki durum. -->
              <img
                v-if="media.isImage && !brokenMedia.has(media.key)"
                :src="media.url"
                :alt="media.label"
                class="h-32 w-full rounded object-contain"
                loading="lazy"
                @error="markBroken(media.key)"
              />
              <span v-else class="flex h-32 items-center justify-center rounded bg-slate-50 text-xs dark:bg-slate-800">
                {{ media.isImage ? t("logistics.pod.mediaUnavailable") : t("logistics.document.open") }}
              </span>
            </a>
            <p v-else class="flex h-32 items-center justify-center text-xs text-slate-400">
              {{ t("logistics.pod.notProvided") }}
            </p>
          </figure>
        </div>
        <p class="text-xs text-slate-500">{{ t("logistics.pod.privacyNote") }}</p>
      </section>

      <ErrorState
        v-else
        :error="{ code: 'CAPABILITY_REQUIRED', message: t('logistics.pod.noMediaPermission') }"
      />
    </template>
  </div>
</template>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import ErrorState from "./ErrorState.vue";
  import StatusBadge from "./StatusBadge.vue";

  /**
   * **H2 · Teslim kanıtı inceleme** (TUR-115).
   *
   * İmza ve teslim fotoğrafı KİŞİSEL VERİ. Yetki yoksa ekran bulanık bir
   * önizleme göstermiyor — dosyayı hiç istemiyor. Bulanıklaştırma istemcide
   * yapılırdı ve veri yine tarayıcıya inerdi.
   *
   * Metadata (teslim saati, teslim alan, kod doğrulaması) yetki olmadan da
   * görünür: operasyonun teslimatı doğrulaması için görsel gerekmiyor.
   */
  const props = defineProps({
    shipmentName: { type: String, required: true },
    /** `proof_of_delivery` sözleşmesindeki tek kayıt. */
    pod: { type: Object, default: null },
    error: { type: Object, default: null },
    /** `viewMedia` = imza/fotoğraf görüntüleme yetkisi. */
    can: { type: Object, default: () => ({ read: true, viewMedia: false }) },
  });

  defineEmits(["retry"]);

  const { t, te } = useI18n();

  /** Yüklenemeyen görseller — Set mutasyonu reaktif değil, yeni referans atanıyor. */
  const brokenMedia = ref(new Set());
  function markBroken(key) {
    brokenMedia.value = new Set(brokenMedia.value).add(key);
  }

  const mediaItems = computed(() => {
    const pod = props.pod ?? {};
    return [
      { key: "signature", label: t("logistics.pod.signature"), url: pod.signature_url, isImage: true },
      { key: "photo", label: t("logistics.pod.photo"), url: pod.photo_url, isImage: true },
      { key: "document", label: t("logistics.pod.document"), url: pod.document_url, isImage: false },
    ];
  });

  function sourceLabel(source) {
    const key = `logistics.locationSource.${source}`;
    return te(key) ? t(key) : source || "—";
  }

  function formatTime(value) {
    if (!value) return "—";
    const parsed = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString(undefined, {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
</script>
