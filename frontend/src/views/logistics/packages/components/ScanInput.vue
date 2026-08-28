<template>
  <!-- Kesikli çift çerçeve + dolgu kutuyu asıl işten (kalem listesi) daha
       ağır gösteriyordu. Okutma çalışma alanı düzeyinde çalışıyor; kutu
       bir hedef değil, durum göstergesi — ince çerçeve yetiyor. -->
  <div
    ref="rootEl"
    class="rounded-lg border border-amber-300 p-3 dark:border-amber-700"
    role="group"
    :aria-label="t('logistics.packing.scan.title')"
    aria-keyshortcuts="F2 F3"
  >
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
        {{ t("logistics.packing.scan.title") }}
      </span>
      <span
        class="ms-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      >
        {{
          activeLabel
            ? t("logistics.packing.scan.activePackage", { code: activeLabel })
            : t("logistics.packing.scan.noActive")
        }}
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

    <!-- Dört kısayol tek satırda 1280px'de sarıyordu ve hiçbiri okunmuyordu.
         İkisi her gün kullanılıyor (Enter, Shift+Enter), ikisi ara sıra —
         ikinci grup istendiğinde açılıyor. -->
    <p class="mt-2 text-[11px] text-gray-600 dark:text-gray-400">
      <kbd class="rounded border px-1">Enter</kbd> {{ t("logistics.packing.scan.hintEnter") }} ·
      <kbd class="rounded border px-1">Shift</kbd>+<kbd class="rounded border px-1">Enter</kbd>
      {{ t("logistics.packing.scan.hintQty") }}
      <button
        type="button"
        class="ms-1 underline decoration-dotted underline-offset-2 hover:text-gray-900 dark:hover:text-gray-200"
        :aria-expanded="allShortcuts"
        @click="allShortcuts = !allShortcuts"
      >
        {{
          allShortcuts ? t("logistics.packing.scan.hintLess") : t("logistics.packing.scan.hintMore")
        }}
      </button>
    </p>
    <p v-if="allShortcuts" class="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
      <kbd class="rounded border px-1">F2</kbd> {{ t("logistics.packing.scan.hintNewPackage") }} ·
      <kbd class="rounded border px-1">F3</kbd> {{ t("logistics.packing.scan.hintNextPackage") }}
    </p>
    <!-- Tab ARTIK KISAYOL DEĞİL. Eskiden sıradaki koliyi getiriyordu ve
         `document` düzeyinde `preventDefault` ediliyordu; odak bir butona
         geçtiği an klavye kullanıcısı ekrandan çıkamıyordu (WCAG 2.1.2,
         denetim 2026-08-28). Kullanıcı eski kısayolu aramasın diye tek
         cümleyle söyleniyor. -->
    <p v-if="allShortcuts" class="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
      {{ t("logistics.packing.scan.hintTabFree") }}
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
   *   Tuşlar ÇALIŞMA ALANININ KABINDA yakalanıyor (`document` DEĞİL); kutuya
   *   tıklamak gerekmiyor. Aksi hâlde operatör bir miktar alanına tıkladıktan
   *   sonra ürün okutunca barkod O ALANA yazılır — "500" yerine
   *   "SHOE-A-KIR-40" girer ve hata ancak kaydetmede fark edilir.
   *
   *   `document` NEDEN BIRAKILDI (WCAG 2.1.2, denetim 2026-08-28): belge
   *   düzeyindeki dinleyici, sayfadaki HER katmanın tuşlarını da görüyordu.
   *   Koli silme onayı (`ConfirmDialog`, `Teleport` ile `body`ye çıkıyor)
   *   açıkken diyaloğun kendi Tab döngüsü de bu dinleyiciye çarpıyordu.
   *   Kap dinleyicisi bunu yapı gereği çözüyor: teleport edilen katman kabın
   *   DOM alt ağacında olmadığı için olayları buraya hiç uğramıyor.
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

  const rootEl = ref(null);
  const inputEl = ref(null);
  const manual = ref("");
  /** İkincil kısayol satırı — kapalı başlar, kullanıcı isteyince açılır. */
  const allShortcuts = ref(false);

  /**
   * Okuyucu eşiği (ms). Düşürmek yavaş okuyucuları kaçırır, yükseltmek hızlı
   * yazan kullanıcının girdisini okutma sanır.
   */
  const SCANNER_GAP_MS = 30;
  /** Bu uzunluğun altındaki diziler kabul edilmiyor — tek tuş okutma değildir. */
  const MIN_LENGTH = 4;

  let buffer = "";
  let lastKeyAt = 0;
  /** Dinleyicinin bağlı olduğu kap — sökerken aynı düğüm gerekiyor. */
  let scopeEl = null;

  /**
   * Dinleme KABI.
   *
   * Kap, çalışma alanının `data-scan-scope` işaretli kökü; bulunamazsa
   * bileşenin kendi kökü. Prop yerine DOM işareti: kap bir ELEMAN, prop olarak
   * geçilseydi ebeveynin `ref`'i çocuğun `onMounted`'ında henüz `null` olurdu
   * (çocuk önce bağlanır) ve dinleyiciyi bir `watch` ile sonradan kurmak
   * gerekirdi. `onMounted` post-flush çalıştığı için ağaç o an belgede;
   * `closest` kabı ilk denemede buluyor.
   */
  function resolveScope() {
    return rootEl.value?.closest("[data-scan-scope]") ?? rootEl.value ?? null;
  }

  function onKeydown(event) {
    if (props.disabled) return;
    // Dinleyici zaten kapta; bu kontrol sözleşmeyi AÇIKÇA yazıyor: kabın
    // dışından gelen hiçbir tuş (teleport edilen diyalog, üst bar, tarayıcı
    // arama kutusu) bu akışa giremez.
    if (!scopeEl?.contains(event.target)) return;

    if (event.key === "F2") {
      event.preventDefault();
      emit("new-package");
      return;
    }

    // Sıradaki koli: F2'nin yanındaki F3. Tab KULLANILMIYOR — Tab tarayıcının
    // odak gezinmesidir ve onu yutmak klavye tuzağı üretir (WCAG 2.1.2).
    if (event.key === "F3") {
      event.preventDefault();
      emit("next-package");
      return;
    }

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

    // TAMPON YALNIZ ALAN DIŞINDA TOPLANIYOR. Eskiden korumasızdı: bir metin
    // alanına dikte/otomatik doldurma ile hızlı yazılan her şey tamponu
    // dolduruyor, Enter'da beklenmedik bir OKUTMA üretiyordu. Kutunun kendi
    // girdisi de bir alan; oradaki okutmayı `@keydown.enter` dalı işliyor.
    if (isTypingInField(event.target)) return;

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

  /** Metin alanına yazılıyorsa tampon toplanmaz — girdi kullanıcınındır. */
  function isTypingInField(target) {
    const tag = target?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  const feedbackClass = computed(() => {
    const r = props.feedback?.result;
    if (r === "added")
      return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300";
    if (r === "activated")
      return "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
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
    scopeEl = resolveScope();
    scopeEl?.addEventListener("keydown", onKeydown);
    inputEl.value?.focus();
  });
  onBeforeUnmount(() => {
    scopeEl?.removeEventListener("keydown", onKeydown);
    scopeEl = null;
  });
</script>
