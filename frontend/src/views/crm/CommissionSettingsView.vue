<script setup>
  import { onMounted, ref } from "vue";
  import { storeToRefs } from "pinia";
  import { useFieldCommissionsStore } from "@/stores/fieldCommissions";

  const store = useFieldCommissionsStore();
  const { settings } = storeToRefs(store);

  const amount = ref(0);
  const saving = ref(false);
  const savedMsg = ref("");

  onMounted(async () => {
    await store.fetchSettings();
    amount.value = settings.value.global_per_sale_amount ?? 0;
  });

  async function save() {
    saving.value = true;
    savedMsg.value = "";
    try {
      await store.saveSettings({ global_per_sale_amount: Number(amount.value) || 0 });
      savedMsg.value = "Kaydedildi.";
    } finally {
      saving.value = false;
    }
  }
</script>

<template>
  <div class="commission-settings">
    <h1>Hakediş Ayarları</h1>
    <p class="hint">
      Pakette ayrı komisyon ayarı yoksa her satış için uygulanan global sabit tutar. 0 = uygulanmaz.
    </p>
    <label class="field">
      <span>Global Satış Başı Sabit Tutar</span>
      <input v-model.number="amount" type="number" min="0" step="1" />
    </label>
    <div class="actions">
      <button :disabled="saving" @click="save">{{ saving ? "Kaydediliyor…" : "Kaydet" }}</button>
      <span v-if="savedMsg" class="saved">{{ savedMsg }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .commission-settings {
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
  .field input {
    padding: 0.5rem 0.75rem;
    border: 1px solid $l-border;
    border-radius: 0.5rem;
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
