<template>
  <button
    type="button"
    class="mpick-btn"
    :class="[`mpick-btn--${variant}`, { 'mpick-btn--icon': iconOnly }]"
    :disabled="disabled"
    :title="iconOnly ? label || t('media.pick.button') : undefined"
    :aria-label="iconOnly ? label || t('media.pick.button') : undefined"
    @click.stop.prevent="ac"
  >
    <AppIcon name="package" :size="iconOnly ? 14 : 13" />
    <span v-if="!iconOnly">{{ label || t("media.pick.button") }}</span>
  </button>

  <MediaPickerModal
    v-if="yuklendi"
    v-model:open="acik"
    :items="ogeler"
    :multiple="multiple"
    @confirm="onaylandi"
    @upload="yukle"
  />
</template>

<script setup>
  /**
   * "Medyamdan seç" düğmesi — kütüphaneyi her yerden erişilebilir kılar.
   *
   * **Neden gerekliydi.** Medya seçici bileşeni yazılmıştı ama YALNIZ medya
   * kütüphanesinin kendi içinde kullanılıyordu. Ürün formu, vitrin düzenleyici,
   * mağaza ayarları — hepsi ham dosya seçme kutusuyla doğrudan yüklüyordu ve
   * kütüphaneye hiç bakmıyordu. Sonuç: satıcı aynı görseli iki kez yüklemek
   * zorunda kalıyordu, bir kez kütüphaneye bir kez ürüne.
   *
   * **Veriyi kendisi çeker.** Çağıran ekranın medya listesini taşımasını
   * beklemiyor; kendi içinde yükler. Aksi hâlde her ekran aynı yükleme
   * mantığını tekrar yazardı ve biri unutulduğunda o ekranda seçici boş
   * görünürdü.
   *
   * **Liste geç yüklenir.** Düğmeye basılana kadar hiçbir istek gitmiyor:
   * ürün formunda beş tane bu düğmeden var, açılışta beşinin de listeyi
   * çekmesi anlamsız bir yük olurdu.
   *
   * Seçilen dosyanın adresi `select` ile döner — tek seçimde metin, çoklu
   * seçimde dizi. Yükleme kuralları burada TEKRAR EDİLMEZ; modal içinden
   * yapılan yüklemeler de kütüphanenin kendi kurallarından geçer (TUR-123).
   */
  import { ref, shallowRef } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import MediaPickerModal from "@/components/media/MediaPickerModal.vue";
  import { useSellerMedia } from "@/composables/useSellerMedia";
  import { useToast } from "@/composables/useToast";

  const props = defineProps({
    /** Birden çok dosya seçilebilsin mi (galeri alanları için). */
    multiple: { type: Boolean, default: false },
    /** Düğme metni — verilmezse ortak metin kullanılır. */
    label: { type: String, default: "" },
    /** Yalnız simge göster — dar yerlerde (kart üstü aksiyonları). */
    iconOnly: { type: Boolean, default: false },
    variant: { type: String, default: "outline" },
    disabled: { type: Boolean, default: false },
    /** Yalnız bu türü göster: "image" | "video" | "" (hepsi). */
    kind: { type: String, default: "" },
  });

  const emit = defineEmits(["select"]);

  const { t } = useI18n();
  const toast = useToast();
  const medya = useSellerMedia();

  const acik = ref(false);
  const yuklendi = ref(false);
  // Liste büyük olabiliyor; her öğeye Proxy sarmanın anlamı yok, salt okunur.
  const ogeler = shallowRef([]);

  async function listeyiGetir() {
    try {
      await medya.load({ page: 1, pageSize: 200 });
      const hepsi = medya.items.value || [];
      ogeler.value = props.kind ? hepsi.filter((m) => m.kind === props.kind) : hepsi;
    } catch (e) {
      toast.error(e.message || t("media.pick.loadFailed"));
      ogeler.value = [];
    }
  }

  async function ac() {
    yuklendi.value = true;
    await listeyiGetir();
    acik.value = true;
  }

  function onaylandi({ ids }) {
    // Kayıt kimliği zaten dosyanın adresi; yine de `fileUrl` üzerinden
    // okunuyor ki kimlik ileride değişirse burası sessizce bozulmasın.
    const adresler = (ids || [])
      .map((id) => ogeler.value.find((m) => m.id === id)?.fileUrl)
      .filter(Boolean);
    if (!adresler.length) return;
    emit("select", props.multiple ? adresler : adresler[0]);
    acik.value = false;
  }

  /**
   * Seçicinin içinden yükleme.
   *
   * Yükleme kuralları burada tekrarlanmıyor — kütüphanenin kendi yükleme yolu
   * kullanılıyor, dolayısıyla tür, boyut ve içerik kontrolleri aynen geçerli.
   * Yüklenen dosya hem kütüphaneye girer hem seçime hazır olur.
   */
  async function yukle(files) {
    const eklenen = [];
    for (const file of files) {
      try {
        const r = await medya.upload(file);
        if (r?.file_url) eklenen.push(r.file_url);
      } catch (e) {
        toast.error(e.message || t("media.pick.uploadFailed"));
      }
    }
    if (!eklenen.length) return;
    await listeyiGetir();
    toast.success(t("media.pick.uploaded", { n: eklenen.length }));
  }
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .mpick-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.7rem;
    border-radius: 0.5rem;
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
    transition: background $t-fast, border-color $t-fast;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  .mpick-btn--outline {
    border: 1px solid $l-border;
    background: none;
    color: $l-text-700;

    &:not(:disabled):hover {
      border-color: $brand;
      color: $brand;
    }

    @include dark {
      border-color: $d-border;
      color: $d-text;
    }
  }

  .mpick-btn--ghost {
    border: 0;
    background: rgb(255 255 255 / 20%);
    color: #fff;
    padding: 0.35rem;

    &:not(:disabled):hover {
      background: rgb(255 255 255 / 30%);
    }
  }

  // Kart üstü aksiyon sırasında yalnız simge — metin sığmıyor.
  .mpick-btn--icon {
    padding: 0.35rem;
    gap: 0;
  }
</style>
