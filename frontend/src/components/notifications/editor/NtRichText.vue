<script setup>
  /**
   * E-posta gövdesi: zengin metin (varsayılan) ↔ kod.
   *
   * Zengin metinde `{{degisken}}` okunur chip'tir; Kod'a dönüşte sözdizimi
   * AYNEN geri gelir. Dokunulmadan yapılan geçişte kaynak HTML birebir korunur
   * (`baseline`). Dönüşüm ve gerekçe: `utils/notificationTemplates/richText.js`.
   *
   * GÜVENLİK: `innerHTML`'e yazılan her şey önce DOMPurify'dan geçer
   * (`utils/sanitize.js`); yapıştırma düz metne indirilir. Sunucu tarafı
   * temizleme ayrıca şarttır.
   *
   * SINIR: biçimlendirme `document.execCommand` ile yapılır (paket eklenmedi);
   * tarayıcılar arasında ürettiği HTML farklı olabilir.
   */
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import BaseSegmented from "@/components/common/BaseSegmented.vue";
  import { chipNodes, fromRichElement, toRichHtml } from "@/utils/notificationTemplates/richText";
  import { insertionTokens, variableKindLabel } from "@/utils/notificationTemplates/template";
  import { validUrl } from "@/utils/notificationTemplates/validation";
  import { sanitizeHtml } from "@/utils/sanitize";

  import NtIssue from "../NtIssue.vue";
  import NtField from "./NtField.vue";

  const props = defineProps({
    field: { type: Object, required: true },
    id: { type: String, required: true },
    variables: { type: Array, required: true },
    /** Aktif kanalın zorunlu değişkenleri (menüde etiketlenir) */
    required: { type: Array, default: () => [] },
    known: { type: Object, required: true },
    channel: { type: String, required: true },
    lang: { type: String, default: "tr" },
    dir: { type: String, default: "ltr" },
    readonly: { type: Boolean, default: false },
    issues: { type: Array, default: () => [] },
  });
  const emit = defineEmits(["focus"]);
  const model = defineModel({ type: String, default: "" });
  const mode = defineModel("mode", { type: String, default: "rich" });

  const env = { doc: document, sanitize: sanitizeHtml };
  const MODES = [
    { value: "rich", label: "Zengin metin" },
    { value: "code", label: "Kod" },
  ];
  const TOOLS = [
    { cmd: "bold", icon: "bold", label: "Kalın" },
    { cmd: "italic", icon: "italic", label: "İtalik" },
    { cmd: "heading", icon: "heading-2", label: "Başlık" },
    { cmd: "list", icon: "list", label: "Liste" },
    { cmd: "link", icon: "link", label: "Bağlantı" },
    { cmd: "button", icon: "square-pen", label: "Düğme bloğu" },
  ];

  const editorRef = ref(null);
  const codeRef = ref(null);
  const menuRef = ref(null);
  const menuBtnRef = ref(null);
  const menuOpen = ref(false);
  const form = ref(null); // { kind: "link" | "button", text, url, issues[] }

  let baseline = { source: "", serialized: "" };
  let lastEmitted = null;
  let savedRange = null;

  const invalid = computed(() => props.issues.some((i) => i.severity === "blocking"));
  const urlVariables = computed(() => props.variables.filter((v) => v.type === "url" && !v.scope));
  const menuItems = computed(() =>
    props.variables.map((v) => ({
      name: v.name,
      label: v.label,
      code: insertionTokens(v)
        .map((t) => t.raw)
        .join(" … "),
      tag: props.required.includes(v.name) ? "zorunlu" : variableKindLabel(v),
    }))
  );

  // ── Kaynak ↔ zengin metin ───────────────────────────────────────────
  function render() {
    const el = editorRef.value;
    if (!el) return;
    // `toRichHtml` kaynağı DOMPurify ile temizleyip chip'leri DOM API'siyle üretir.
    el.innerHTML = toRichHtml(model.value, props.variables, env);
    baseline = { source: model.value, serialized: fromRichElement(el, env) };
    lastEmitted = model.value;
    savedRange = null;
  }

  function onInput() {
    const now = fromRichElement(editorRef.value, env);
    // Dokunulmadıysa özgün kaynak korunur (tarayıcının yeniden biçimlemesi yazılmaz).
    const next = now === baseline.serialized ? baseline.source : now;
    lastEmitted = next;
    model.value = next;
  }

  // Dışarıdan değişim (kanal/dil değişti, "onların sürümü" yüklendi…): yeniden çiz.
  watch(
    () => [model.value, props.variables],
    () => {
      if (mode.value === "rich" && model.value !== lastEmitted) render();
    },
    { flush: "post" }
  );
  watch(mode, async (m) => {
    form.value = null;
    menuOpen.value = false;
    await nextTick();
    if (m === "rich") render();
  });
  onMounted(() => {
    if (mode.value === "rich") render();
    document.addEventListener("selectionchange", trackSelection);
    document.addEventListener("mousedown", onOutsidePointer);
  });
  onBeforeUnmount(() => {
    document.removeEventListener("selectionchange", trackSelection);
    document.removeEventListener("mousedown", onOutsidePointer);
  });

  // ── Seçim takibi (araçlar ve değişken ekleme imleci kullanır) ───────
  function trackSelection() {
    const sel = document.getSelection();
    const el = editorRef.value;
    if (!el || !sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (el.contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
  }

  function restoreRange() {
    const el = editorRef.value;
    el.focus();
    const sel = document.getSelection();
    if (savedRange && el.contains(savedRange.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } else {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      savedRange = range.cloneRange();
    }
    return sel.getRangeAt(0);
  }

  function runCommand(cmd) {
    if (props.readonly || !editorRef.value) return;
    if (cmd === "link" || cmd === "button") return openForm(cmd);
    restoreRange();
    if (cmd === "bold" || cmd === "italic") document.execCommand(cmd);
    else if (cmd === "list") document.execCommand("insertUnorderedList");
    else if (cmd === "heading")
      document.execCommand(
        "formatBlock",
        false,
        /h2/i.test(document.queryCommandValue("formatBlock")) ? "p" : "h2"
      );
    onInput();
  }

  function onPaste(event) {
    // Yapıştırılan içerik düz metne indirilir: dış kaynaklı HTML/stil girmez.
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  // ── Bağlantı / düğme bloğu formu ────────────────────────────────────
  function openForm(kind) {
    const range = restoreRange();
    const first = urlVariables.value[0];
    form.value = {
      kind,
      text: range.toString(),
      url: first ? `{{${first.name}}}` : "https://",
      issues: [],
    };
    nextTick(() => document.getElementById(`${props.id}-rf-text`)?.focus());
  }

  function closeForm(refocus = true) {
    form.value = null;
    if (refocus) nextTick(() => restoreRange());
  }

  function applyForm() {
    const f = form.value;
    const text = f.text.trim();
    const url = f.url.trim();
    const base = { severity: "blocking", channel: props.channel, lang: props.lang };
    const issues = [];
    if (!text) issues.push({ ...base, kind: "missing_action_label", field: "text" });
    if (!validUrl(url, props.variables))
      issues.push({ ...base, kind: "invalid_url", field: "url", value: url });
    f.issues = issues;
    if (issues.length) {
      document.getElementById(`${props.id}-rf-${issues[0].field}`)?.focus();
      return;
    }
    const el = editorRef.value;
    const range = restoreRange();
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.textContent = text;
    if (f.kind === "button") {
      a.className = "cta";
      const p = document.createElement("p");
      p.appendChild(a);
      let block = range.startContainer;
      while (block && block.parentNode !== el) block = block.parentNode;
      if (block) block.after(p);
      else el.appendChild(p);
    } else {
      range.deleteContents();
      range.insertNode(a);
      range.setStartAfter(a);
      range.collapse(true);
    }
    form.value = null;
    onInput();
    el.focus();
  }

  const formHas = (field) => form.value?.issues.some((i) => i.field === field);

  // ── Değişken ekleme ─────────────────────────────────────────────────
  /** Zengin metinde imlece chip, kod görünümünde `{{…}}` metni ekler. */
  function insertVariable(name) {
    const def = props.variables.find((v) => v.name === name);
    if (!def || props.readonly) return false;
    const tokenList = insertionTokens(def);
    const block = tokenList.length > 1;
    if (mode.value !== "rich") {
      codeRef.value?.insertText(tokenList.map((t) => t.raw).join(block ? "\n\n" : ""));
      return true;
    }
    const range = restoreRange();
    range.deleteContents();
    const nodes = chipNodes(document, tokenList, props.variables);
    const fragment = document.createDocumentFragment();
    nodes.forEach((node, i) => {
      if (i) fragment.appendChild(document.createTextNode(" "));
      fragment.appendChild(node);
    });
    range.insertNode(fragment);
    // Chip düzenlenemez; imlecin arkasına yerleşebilmesi için sıfır genişlikte boşluk.
    const tail = document.createTextNode(String.fromCharCode(0x200b));
    nodes[nodes.length - 1].after(tail);
    range.setStart(tail, 1);
    range.collapse(true);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    savedRange = range.cloneRange();
    onInput();
    return true;
  }

  // ── Değişken menüsü (klavye: ok tuşları, Esc) ───────────────────────
  async function toggleMenu() {
    menuOpen.value = !menuOpen.value;
    if (!menuOpen.value) return;
    await nextTick();
    menuRef.value?.querySelector("[role='menuitem']")?.focus();
  }

  function closeMenu(refocus = true) {
    if (!menuOpen.value) return;
    menuOpen.value = false;
    if (refocus) menuBtnRef.value?.focus();
  }

  function onMenuKeydown(event) {
    const items = Array.from(menuRef.value?.querySelectorAll("[role='menuitem']") || []);
    const i = items.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      return closeMenu();
    }
    let target = null;
    if (event.key === "ArrowDown") target = (i + 1) % items.length;
    else if (event.key === "ArrowUp") target = (i - 1 + items.length) % items.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = items.length - 1;
    if (target === null) return;
    event.preventDefault();
    items[target]?.focus();
  }

  function pickVariable(name) {
    closeMenu(false);
    insertVariable(name);
  }

  function onOutsidePointer(event) {
    if (!menuOpen.value) return;
    if (menuRef.value?.contains(event.target) || menuBtnRef.value?.contains(event.target)) return;
    closeMenu(false);
  }

  defineExpose({
    insertVariable,
    focus: () => (mode.value === "rich" ? editorRef.value?.focus() : codeRef.value?.focus()),
  });
</script>

<template>
  <div class="nt-rt">
    <div class="nt-rt__label">
      <label :id="`${id}-label`" class="form-label" :for="mode === 'code' ? id : undefined">
        {{ field.label }}
        <span v-if="field.required" class="nt-rt__req">zorunlu</span>
      </label>
      <BaseSegmented v-model="mode" class="nt-rt__mode" :options="MODES" />
    </div>

    <div class="nt-rt__toolbar" role="toolbar" aria-label="Biçimlendirme">
      <template v-if="mode === 'rich'">
        <button
          v-for="tool in TOOLS"
          :key="tool.cmd"
          type="button"
          class="nt-rt__tool"
          :aria-label="tool.label"
          :title="tool.label"
          :disabled="readonly"
          @mousedown.prevent
          @click="runCommand(tool.cmd)"
        >
          <AppIcon :name="tool.icon" :size="15" />
        </button>
      </template>
      <div class="nt-rt__menu-wrap">
        <button
          ref="menuBtnRef"
          type="button"
          class="hdr-btn-outlined nt-btn--sm"
          aria-haspopup="menu"
          :aria-expanded="menuOpen"
          :disabled="readonly"
          @mousedown.prevent
          @click="toggleMenu"
        >
          <AppIcon name="braces" :size="14" />
          Değişken ekle
        </button>
        <div
          v-if="menuOpen"
          ref="menuRef"
          class="nt-rt__menu"
          role="menu"
          aria-label="Değişkenler"
          @keydown="onMenuKeydown"
        >
          <button
            v-for="item in menuItems"
            :key="item.name"
            type="button"
            role="menuitem"
            class="nt-rt__menu-item"
            tabindex="-1"
            @mousedown.prevent
            @click="pickVariable(item.name)"
          >
            <span class="nt-rt__menu-text">
              <span>{{ item.label }}</span>
              <code>{{ item.code }}</code>
            </span>
            <span v-if="item.tag" class="nt-rt__menu-tag">{{ item.tag }}</span>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="form"
      class="nt-rt__form"
      role="group"
      :aria-label="form.kind === 'link' ? 'Bağlantı ekle' : 'Düğme bloğu ekle'"
      @keydown.enter.prevent="applyForm"
      @keydown.esc.prevent.stop="closeForm()"
    >
      <div>
        <label class="form-label" :for="`${id}-rf-text`">
          {{ form.kind === "link" ? "Bağlantı metni" : "Düğme metni" }}
        </label>
        <input
          :id="`${id}-rf-text`"
          v-model="form.text"
          type="text"
          class="form-input"
          autocomplete="off"
          :aria-invalid="formHas('text') ? 'true' : undefined"
          :aria-describedby="`${id}-rf-err`"
        />
      </div>
      <div>
        <label class="form-label" :for="`${id}-rf-url`">Adres</label>
        <input
          :id="`${id}-rf-url`"
          v-model="form.url"
          type="text"
          class="form-input nt-mono"
          autocomplete="off"
          :list="`${id}-rf-urls`"
          :aria-invalid="formHas('url') ? 'true' : undefined"
          :aria-describedby="`${id}-rf-err`"
        />
        <datalist :id="`${id}-rf-urls`">
          <option v-for="v in urlVariables" :key="v.name" :value="`{{${v.name}}}`">
            {{ v.label }}
          </option>
        </datalist>
      </div>
      <div class="nt-rt__form-actions">
        <button type="button" class="hdr-btn-outlined nt-btn--sm" @click="closeForm()">
          Vazgeç
        </button>
        <button type="button" class="hdr-btn-primary nt-btn--sm" @click="applyForm">Ekle</button>
      </div>
      <div :id="`${id}-rf-err`" class="nt-rt__form-err" role="alert">
        <NtIssue v-for="issue in form.issues" :key="issue.kind" :issue="issue" />
      </div>
    </div>

    <!-- İçerik `render()` ile yazılır (DOMPurify'dan geçmiş HTML); Vue bu düğümün
         çocuklarını yönetmez. -->
    <div
      v-if="mode === 'rich'"
      :id="id"
      ref="editorRef"
      class="nt-rte"
      role="textbox"
      aria-multiline="true"
      :aria-labelledby="`${id}-label`"
      :aria-describedby="`${id}-desc`"
      :aria-required="field.required ? 'true' : undefined"
      :aria-invalid="invalid ? 'true' : undefined"
      :aria-readonly="readonly ? 'true' : undefined"
      :contenteditable="readonly ? 'false' : 'true'"
      :lang="lang"
      :dir="dir"
      tabindex="0"
      spellcheck="false"
      @input="onInput"
      @paste="onPaste"
      @click="$event.target.closest?.('a') && $event.preventDefault()"
      @focus="emit('focus', field.id)"
    />
    <NtField
      v-else
      :id="id"
      ref="codeRef"
      v-model="model"
      bare
      :field="{ ...field, type: 'code' }"
      :rows="12"
      :lang="lang"
      dir="ltr"
      :readonly="readonly"
      :known="known"
      @focus="emit('focus', field.id)"
    />

    <div :id="`${id}-desc`" class="nt-rt__msgs">
      <NtIssue
        v-for="(issue, i) in issues"
        :key="`${issue.kind}-${issue.variable || ''}-${i}`"
        :issue="issue"
      />
    </div>
  </div>
</template>

<style lang="scss">
  @use "@/assets/scss/variables" as *;

  // `innerHTML` ile yazılan düğümlere erişebilmek için scoped değil; hepsi `.nt-rt*` altında.
  .nt-rt {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .nt-rt__label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    .form-label {
      margin: 0;
    }
  }

  .nt-rt__req {
    margin-inline-start: 4px;
    font-weight: 500;
    color: var(--nt-muted);
  }

  .nt-rt__mode {
    width: auto;
    min-width: 190px;
  }

  .nt-rt__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .nt-rt__tool {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--nt-field-line);
    border-radius: 8px;
    background: var(--nt-bg);
    color: var(--nt-fg-2);
    cursor: pointer;

    &:hover:not(:disabled) {
      background: var(--nt-bg-muted);
    }

    @media (max-width: 767px) {
      width: 44px;
      height: 44px;
    }
  }

  .nt-rt__menu-wrap {
    position: relative;
  }

  .nt-rt__menu {
    position: absolute;
    top: calc(100% + 4px);
    inset-inline-start: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    width: min(300px, 80vw);
    max-height: 320px;
    padding: 4px;
    border: 1px solid var(--nt-line);
    border-radius: 10px;
    background: var(--nt-bg);
    box-shadow: var(--nt-shadow);
    overflow-y: auto;
  }

  .nt-rt__menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 40px;
    padding: 6px 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--nt-fg);
    font: inherit;
    text-align: start;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: var(--nt-bg-muted);
    }

    @media (max-width: 767px) {
      min-height: 44px;
    }
  }

  .nt-rt__menu-text {
    display: flex;
    flex-direction: column;
    min-width: 0;

    code {
      color: var(--nt-muted);
      overflow-wrap: anywhere;
    }
  }

  .nt-rt__menu-tag {
    flex-shrink: 0;
    padding: 0 6px;
    border-radius: 4px;
    background: var(--nt-brand-bg);
    font-size: 12px;
    font-weight: 600;
  }

  .nt-rt__form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--nt-line);
    border-radius: 10px;
    background: var(--nt-bg-soft);
  }

  .nt-rt__form-actions {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }

  .nt-rt__form-err {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    &:empty {
      display: none;
    }
  }

  .nt-rt__msgs {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &:empty {
      display: none;
    }
  }

  // Zengin metin yüzeyi — e-posta gövdesinin sade bir karşılığı.
  .nt-rte {
    min-height: 220px;
    padding: 14px 16px;
    border: 1px solid var(--nt-field-line);
    border-radius: 8px;
    background: var(--nt-bg);
    color: var(--nt-fg);
    font-size: 14px;
    line-height: 1.55;
    overflow-wrap: anywhere;

    &[aria-invalid="true"] {
      border-color: var(--nt-err-line);
      box-shadow: inset 0 0 0 1px var(--nt-err-line);
    }

    &[contenteditable="false"] {
      background: var(--nt-bg-soft);
    }

    h1 {
      margin: 0 0 10px;
      font-size: 17px;
      font-weight: 700;
    }

    h2 {
      margin: 12px 0 6px;
      font-size: 15px;
      font-weight: 700;
    }

    p {
      margin: 0 0 10px;
    }

    ul,
    ol {
      margin: 0 0 10px;
      padding-inline-start: 20px;
      list-style: disc;
    }

    a {
      color: var(--nt-link);
      text-decoration: underline;
    }

    table {
      width: 100%;
      margin: 0 0 12px;
      border-collapse: collapse;
    }

    td {
      padding: 8px 0;
      border-bottom: 1px solid var(--nt-line);
    }

    td:last-child {
      text-align: end;
    }

    a.cta {
      display: inline-block;
      padding: 8px 14px;
      border-radius: 8px;
      background: $brand;
      color: $brand-ink;
      font-weight: 700;
      text-decoration: none;
    }
  }

  .nt-chip {
    display: inline-block;
    margin: 0 1px;
    padding: 0 6px;
    border-radius: 4px;
    background: var(--nt-brand-bg);
    color: var(--nt-fg);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.6;
    white-space: nowrap;
    user-select: all;
  }

  .nt-chip--loop {
    background: var(--nt-info-bg);
    color: var(--nt-info-fg);
  }

  .nt-chip--bad {
    background: var(--nt-err-bg);
    color: var(--nt-err-fg);
    box-shadow: inset 0 -2px 0 var(--nt-err-line);
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }

  a.cta .nt-chip {
    background: rgba(#000, 0.12);
    color: $brand-ink;
  }
</style>
