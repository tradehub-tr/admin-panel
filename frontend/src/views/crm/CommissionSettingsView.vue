<script setup>
  import { onMounted, ref } from "vue";
  import { useFieldCommissionsStore } from "@/stores/fieldCommissions";

  const store = useFieldCommissionsStore();

  const quotaPeriod = ref("Aylık");
  const saving = ref(false);
  const savedMsg = ref("");

  onMounted(async () => {
    await store.fetchSettings();
    const s = store.settings || {};
    quotaPeriod.value = s.quota_period || "Aylık";
  });

  async function save() {
    saving.value = true;
    savedMsg.value = "";
    try {
      await store.saveSettings({
        quota_period: quotaPeriod.value,
      });
      savedMsg.value = "Kaydedildi.";
    } finally {
      saving.value = false;
    }
  }
</script>

<template>
  <div class="commission-settings">
    <h1>Hakediş Ayarları</h1>

    <h2>Kota Bonusu</h2>
    <p class="hint">
      Kota eşik tablosu artık <strong>paket bazlıdır</strong> — her paketin eşiklerini "Sistem →
      İzin Yönetimi → Planlar" sayfasından düzenleyin. Buradaki dönem, tüm paketler için ortak sayım
      penceresidir.
    </p>
    <label class="field">
      <span>Kota Dönemi</span>
      <select v-model="quotaPeriod">
        <option value="Aylık">Aylık</option>
        <option value="Çeyrek">Çeyrek</option>
        <option value="Yıllık">Yıllık</option>
      </select>
    </label>

    <div class="actions">
      <button :disabled="saving" class="th-btn-primary" @click="save">
        {{ saving ? "Kaydediliyor…" : "Kaydet" }}
      </button>
      <span v-if="savedMsg" class="saved">{{ savedMsg }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .commission-settings {
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 0.5rem;
  }
  .hint {
    color: $l-text-500;
    font-size: 0.875rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .field input,
  .field select {
    padding: 0.5rem 0.75rem;
    border: 1px solid $l-border;
    border-radius: 0.5rem;
    @include dark {
      border-color: $d-border;
      background: $d-bg-card;
      color: $d-text;
    }
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .saved {
    color: $c-success;
    font-size: 0.875rem;
  }
</style>
