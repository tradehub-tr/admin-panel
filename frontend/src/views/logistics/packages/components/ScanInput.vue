<template>
  <div class="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/60 p-3 dark:border-amber-600 dark:bg-amber-900/10">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-sm font-semibold">{{ t("logistics.packing.scan.title") }}</span>
      <span class="ms-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        {{ activeLabel ? t("logistics.packing.scan.activePackage", { code: activeLabel }) : t("logistics.packing.scan.noActive") }}
      </span>
    </div>

    <input
      ref="inputEl"
      v-model="manual"
      type="text"
      class="form-input mt-2 w-full text-sm"
      :placeholder="t('logistics.packing.scan.placeholder')"
      :disabled="disabled"
      @keydown.enter.prevent="submitManual"
    />

    <p
      v-if="feedback"
      class="mt-2 flex items-start gap-2 rounded border p-2 text-xs"
      :class="feedbackClass"
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">{{ feedbackIcon }}</span>
      <span>
        <code class="font-mono">{{ feedback.code }}</code> — {{ feedbackMessage }}
      </span>
    </p>

    <p class="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
      <kbd class="rounded border px-1">Enter</kbd> {{ t("logistics.packing.scan.hintEnter") }} ·
      <kbd class="rounded border px-1">Shift</kbd>+<kbd class="rounded border px-1">Enter</kbd>
      {{ t("logistics.packing.scan.hintQty") }} ·
      <kbd class="rounded border px-1">F2</kbd> {{ t("logistics.packing.scan.hintNewPackage") }} ·
      <kbd class="rounded border px-1">Tab</kbd> {{ t("logistics.packing.scan.hintNextPackage") }}
    </p>
  </div>
</template>

<script setup>
  import { computed, onBeforeUnmount, onMounted, ref } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * Barkod okuma kutusu — B1+B3 birleşik tasarımın tarama yarısı.
   *
   * ODAK YÖNETİMİ (sözleşme §4.4):
   *   Tuşlar `document` düzeyinde yakalanıyor; kutuya tıklamak gerekmiyor.
   *   Aksi hâlde operatör bir miktar alanına tıkladıktan sonra ürün okutunca
   *   barkod O ALANA yazılır — "500" yerine "SHOE-A-KIR-40" girer ve hata
   *   ancak kaydetmede fark edilir.
   *
   *   Okuyucu insandan HIZ İMZASIYLA ayrılıyor: el terminali tuşları
   *   ~5-15 ms aralıkla gönderiyor, insan en hızlı hâlinde ~80 ms. Eşik
   *   30 ms; arası açılırsa tampon sıfırlanıyor, yani yavaş yazan kullanıcı
   *   yanlışlıkla "okutma" üretmiyor.
   */
  const props = defineProps({
    /** Aktif kolinin X/Y etiketi — okutmanın nereye gideceğini gösterir. */
    activeLabel: { type: String, default: "" },
    /** `applyScan` sonucu — `{result, code, item?, package?, qty?}`. */
    feedback: { type: Object, default: null },
    disabled: { type: Boolean, default: false },
  });

  const emit = defineEmits(["scan", "new-package", "next-package"]);
  const { t } = useI18n();

  const inputEl = ref(null);
  const manual = ref("");

  /**
   * Okuyucu eşiği (ms). Düşürmek yavaş okuyucuları kaçırır, yükseltmek hızlı
   * yazan kullanıcının girdisini okutma sanır.
   */
  const SCANNER_GAP_MS = 30;
  /** Bu uzunluğun altındaki diziler kabul edilmiyor — tek tuş okutma değildir. */
  const MIN_LENGTH = 4;

  let buffer = "";
  let lastKeyAt = 0;

  function onKeydown(event) {
    if (props.disabled) return;

    if (event.key === "F2") {
      event.preventDefault();
      emit("new-package");
      return;
    }

    // Tab normalde odak gezdiriyor; tarama akışında elin klavyeden
    // ayrılmaması için aktif koliyi ilerletiyor. Metin alanına elle yazan
    // kullanıcı için istisna: orada Tab kendi işini yapmalı.
    if (event.key === "Tab" && !isTypingInField(event.target)) {
      event.preventDefault();
      emit("next-package");
      return;
    }

    // Kullanıcı bir metin alanına ELLE yazıyorsa karışma. Okuyucu da aynı
    // alana yazabilir, ama o zaman hız imzası tamponu zaten dolduruyor ve
    // Enter'da okutma olarak işleniyor.
    const now = Date.now();
    const gap = now - lastKeyAt;
    lastKeyAt = now;

    if (event.key === "Enter") {
      const fast = buffer.length >= MIN_LENGTH;
      const code = buffer;
      buffer = "";
      if (!fast) return;
      // Okuyucu kendi Enter'ını gönderiyor; formun submit'ine düşmesin.
      event.preventDefault();
      // Shift+Enter: tek tek okutmak yerine miktar sorulur. 200 adet vidayı
      // 200 kez okutmak yerine bir kez okutup sayıyı yazmak isteniyor.
      if (event.shiftKey) askQuantity(code);
      else emit("scan", code);
      return;
    }

    // Tek karakterli basımlar dışındakiler (Shift, Tab, ok tuşları) dizinin
    // parçası değil — tamponu bozmadan geçiliyor.
    if (event.key.length !== 1) return;

    // Aralık açıldıysa yeni bir dizi başlıyor demektir.
    if (gap > SCANNER_GAP_MS) buffer = "";
    buffer += event.key;
  }

  /** Elle yazılan kod — barkodsuz ürün ya da okuyucusuz kullanım için. */
  function submitManual(event) {
    const code = manual.value.trim();
    if (!code) return;
    manual.value = "";
    if (event?.shiftKey) askQuantity(code);
    else emit("scan", code);
  }

  /**
   * Okutulan koda kaç adet gireceğini sorar.
   *
   * `prompt` bilinçli: tarama akışında el klavyede kalıyor, açılır bir form
   * fare gerektirirdi. Gerçek uçlara bağlanınca da davranış değişmiyor —
   * miktar istemci tarafında belirleniyor.
   */
  function askQuantity(code) {
    const answer = window.prompt(t("logistics.packing.scan.qtyPrompt"), "1");
    if (answer === null) return;
    const qty = Math.max(1, Number(answer) || 0);
    emit("scan", code, qty);
  }

  /** Metin alanına elle yazılıyorsa Tab kendi işini yapmalı. */
  function isTypingInField(target) {
    const tag = target?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  const feedbackClass = computed(() => {
    const r = props.feedback?.result;
    if (r === "added") return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300";
    if (r === "activated") return "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
    return "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300";
  });

  const feedbackIcon = computed(() => {
    const r = props.feedback?.result;
    if (r === "added") return "✓";
    if (r === "activated") return "⇄";
    return "✖";
  });

  const feedbackMessage = computed(() => {
    const f = props.feedback;
    if (!f) return "";
    switch (f.result) {
      case "added":
        return t("logistics.packing.scan.added", {
          item: f.item?.item_name ?? "",
          qty: f.qty ?? 1,
          uom: f.item?.uom ?? "",
        });
      case "activated":
        return t("logistics.packing.scan.activated", { code: f.package?.package_code ?? "" });
      case "already-full":
        return t("logistics.packing.scan.alreadyFull", { item: f.item?.item_name ?? "" });
      case "no-package":
        return t("logistics.packing.scan.noPackage");
      default:
        // "unknown" — kod başka bir siparişe ait olabilir. Hiçbir koli
        // değişmedi; bunu söylemek operatörün "eklendi mi?" diye
        // kontrol etmesini önlüyor.
        return t("logistics.packing.scan.unknown");
    }
  });

  onMounted(() => {
    document.addEventListener("keydown", onKeydown);
    inputEl.value?.focus();
  });
  onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>
