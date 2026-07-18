/**
 * nativeSelectPicker — native <select> açılır panelini TÜM tarayıcılarda markalar.
 *
 * Chromium 135+ bunu saf CSS ile yapar (`appearance: base-select`, bkz.
 * forms.scss) — orada bu plugin kendini devre dışı bırakır. Desteklemeyen
 * tarayıcılarda (Safari, Firefox) OS picker'ı engellenir ve aynı görünümde
 * özel bir panel açılır (.np-panel / .np-option, forms.scss).
 *
 * Native <select> DOM'da aynen kalır: v-model, form gönderimi, ekran
 * okuyucu ve kapalı-durum görünümü değişmez. Seçim yapılınca 'input' +
 * 'change' dispatch edilir (Vue v-model 'change' dinler).
 *
 * Opt-out: <select data-native-picker> OS picker'ını korur.
 * Kapsam dışı: multiple / size>1 (sayfa içi listbox) ve disabled.
 */

const SUPPORTS_BASE_SELECT =
  typeof CSS !== "undefined" && CSS.supports("appearance", "base-select");

let panel = null;
let currentSelect = null;

function eligible(el) {
  return (
    el &&
    el.tagName === "SELECT" &&
    !el.multiple &&
    el.size <= 1 &&
    !el.disabled &&
    el.dataset.nativePicker === undefined
  );
}

function ensurePanel() {
  if (panel) return panel;
  panel = document.createElement("div");
  panel.className = "np-panel";
  panel.setAttribute("role", "listbox");
  // Panel içi tıklama select'in focus'unu bozmasın
  panel.addEventListener("mousedown", (e) => e.preventDefault());
  document.body.appendChild(panel);
  return panel;
}

const CHECK_SVG =
  '<svg class="np-check" width="13" height="13" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" ' +
  'stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

function buildOptions(sel) {
  const p = ensurePanel();
  p.innerHTML = "";
  Array.from(sel.options).forEach((opt, i) => {
    const row = document.createElement("div");
    row.className = "np-option";
    row.setAttribute("role", "option");
    if (opt.disabled) row.classList.add("disabled");
    if (i === sel.selectedIndex) {
      row.classList.add("selected");
      row.setAttribute("aria-selected", "true");
    }
    const label = document.createElement("span");
    label.className = "np-option-label";
    label.textContent = opt.textContent.trim(); // textContent ataması — XSS güvenli
    row.appendChild(label);
    if (i === sel.selectedIndex) row.insertAdjacentHTML("beforeend", CHECK_SVG);
    if (!opt.disabled) {
      row.addEventListener("click", () => {
        applySelection(sel, i);
        close();
        sel.focus();
      });
    }
    p.appendChild(row);
  });
}

function applySelection(sel, index) {
  if (sel.selectedIndex === index) return;
  sel.selectedIndex = index;
  sel.dispatchEvent(new Event("input", { bubbles: true }));
  sel.dispatchEvent(new Event("change", { bubbles: true }));
}

function position(sel) {
  const r = sel.getBoundingClientRect();
  const p = ensurePanel();
  p.style.minWidth = `${Math.max(r.width, 120)}px`;
  p.style.left = `${Math.min(r.left, window.innerWidth - p.offsetWidth - 8)}px`;
  // Altta yer yoksa üstte aç
  const spaceBelow = window.innerHeight - r.bottom;
  if (spaceBelow < Math.min(p.offsetHeight + 12, 292) && r.top > spaceBelow) {
    p.style.top = `${r.top - p.offsetHeight - 6}px`;
  } else {
    p.style.top = `${r.bottom + 6}px`;
  }
}

function open(sel) {
  currentSelect = sel;
  buildOptions(sel);
  const p = ensurePanel();
  p.classList.add("open");
  position(sel); // görünürken ölçüp konumlandır
  sel.classList.add("np-open");
  p.querySelector(".np-option.selected")?.scrollIntoView({ block: "nearest" });
}

function close() {
  if (!panel) return;
  panel.classList.remove("open");
  currentSelect?.classList.remove("np-open");
  currentSelect = null;
}

function onPointer(e) {
  // Panel içi etkileşim — satır click handler'ları halleder
  if (panel && panel.contains(e.target)) return;

  const sel = e.target.closest?.("select");
  if (eligible(sel)) {
    e.preventDefault(); // OS picker'ını engelle
    if (currentSelect === sel) {
      close();
    } else {
      close();
      open(sel);
      sel.focus();
    }
    return;
  }
  close();
}

function onKeydown(e) {
  const sel = e.target;
  if (!eligible(sel)) {
    if (e.key === "Escape") close();
    return;
  }
  const openKeys = e.key === " " || e.key === "Enter" || (e.altKey && e.key === "ArrowDown");
  if (!currentSelect && openKeys) {
    e.preventDefault();
    open(sel);
    return;
  }
  if (currentSelect === sel) {
    if (e.key === "Escape" || e.key === "Tab") {
      close();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      let i = sel.selectedIndex;
      do {
        i += dir;
      } while (sel.options[i] && sel.options[i].disabled);
      if (sel.options[i]) {
        applySelection(sel, i);
        buildOptions(sel); // seçili işaretini tazele
        panel.querySelector(".np-option.selected")?.scrollIntoView({ block: "nearest" });
      }
    }
  }
}

export default {
  install() {
    if (SUPPORTS_BASE_SELECT) return; // Chromium: saf CSS yolu aktif

    document.addEventListener("mousedown", onPointer, true);
    document.addEventListener("keydown", onKeydown, true);
    // Sayfa kayınca/boyut değişince panel açık kalmasın (capture: iç scroll'lar dahil)
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
  },
};
