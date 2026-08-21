<template>
  <span v-if="!editable" class="font-semibold tabular-nums">{{ display }}</span>

  <span
    v-else-if="!editing"
    class="inline-flex cursor-text items-center gap-1 rounded border border-dashed border-transparent px-1 py-0.5 transition-colors hover:border-gray-300 dark:hover:border-gray-600"
    role="button"
    tabindex="0"
    @click="start"
    @keydown.enter.prevent="start"
  >
    <span class="font-semibold tabular-nums">{{ display }}</span>
    <AppIcon name="pencil" :size="11" class="text-gray-600 dark:text-gray-400" />
  </span>

  <span
    v-else
    class="inline-flex items-center gap-1 rounded border border-brand-500 bg-brand-50 px-1 py-0.5 dark:bg-brand-900/20"
  >
    <input
      ref="input"
      v-model="draft"
      type="number"
      step="0.01"
      min="0"
      class="w-20 border-0 bg-transparent p-0 text-end text-[13px] tabular-nums focus:outline-none focus:ring-0"
      @keydown.enter.prevent="commit"
      @keydown.esc.prevent="cancel"
      @blur="commit"
    />
    <span class="text-[11px]">₺</span>
  </span>
</template>

<script setup>
  import { computed, nextTick, ref } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";

  /**
   * Satır içi para düzenleme.
   *
   * NEDEN VAR: fiyat değiştirmek en sık yapılan iş. Forma girip çıkmak
   * (liste → form → alan → kaydet → geri) beş adım; hücreye tıklayıp yazmak
   * bir. Kök `CLAUDE.md` §4.14a'nın doğrudan karşılığı.
   *
   * SALT-OKUNUR HÂLDE KALEM İKONU ÇİZİLMİYOR: düzenlenemeyen bir alanda
   * düzenleme işareti göstermek ölü buton olurdu (satıcı, platform kuralına
   * baktığında bunu görüyor).
   */
  const props = defineProps({
    value: { type: Number, default: null },
    editable: { type: Boolean, default: false },
  });

  const emit = defineEmits(["commit"]);

  const editing = ref(false);
  const draft = ref("");
  const input = ref(null);

  const display = computed(() =>
    props.value == null
      ? "—"
      : Number(props.value).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })
  );

  async function start() {
    draft.value = props.value ?? "";
    editing.value = true;
    await nextTick();
    input.value?.focus();
    input.value?.select();
  }

  function commit() {
    if (!editing.value) return;
    editing.value = false;
    const sayi = Number(draft.value);
    // Değişmediyse istek atma: her odak kaybında kaydetmek gereksiz yazma
    // üretir ve "kaydedildi" bildirimi kullanıcıyı yorar.
    if (!Number.isFinite(sayi) || sayi === props.value) return;
    emit("commit", sayi);
  }

  function cancel() {
    editing.value = false;
  }
</script>
