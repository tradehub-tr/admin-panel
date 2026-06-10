import { ref } from "vue";

/**
 * Native drag-drop davranışı + validation — mevcut UI elementini drop-target
 * yapmak için kullanılır (label, div, vs.). RFQ pattern'iyle (tradehub-upload-ui
 * core bindDropzone) aynı validation: extension/MIME + size + max files.
 *
 * Kullanım (Vue template):
 *   const dz = useDropzone(onDrop, { accept: "image/*", multiple: true });
 *   <label
 *     :class="{ 'border-violet-500 bg-violet-50': dz.isOver.value }"
 *     @dragenter="dz.onDragEnter"
 *     @dragover="dz.onDragOver"
 *     @dragleave="dz.onDragLeave"
 *     @drop="dz.onDrop"
 *   />
 *
 * onDrop callback: File[] alır. Validation hatalı dosyalar onValidationError
 * üzerinden tek tek bildirilir; geçenler tek bir batch olarak onDrop'a gider.
 */
export function useDropzone(onDrop, options = {}) {
  const {
    accept = "*/*",
    multiple = true,
    maxBytes = 10 * 1024 * 1024,
    onValidationError = null,
  } = options;

  const isOver = ref(false);

  function matchAccept(file) {
    if (!accept || accept === "*/*" || accept === "*") return true;
    const type = file.type || "";
    const name = file.name || "";
    // "image/*" → MIME prefix kontrolü
    const parts = accept.split(",").map((s) => s.trim());
    for (const part of parts) {
      if (part.endsWith("/*")) {
        const prefix = part.slice(0, -1); // "image/"
        if (type.startsWith(prefix)) return true;
      } else if (part.startsWith(".")) {
        if (name.toLowerCase().endsWith(part.toLowerCase())) return true;
      } else if (part === type) {
        return true;
      }
    }
    return false;
  }

  function filterFiles(rawList) {
    const accepted = [];
    for (const f of Array.from(rawList)) {
      if (!matchAccept(f)) {
        onValidationError?.("unsupported", f);
        continue;
      }
      if (f.size > maxBytes) {
        onValidationError?.("tooLarge", f);
        continue;
      }
      accepted.push(f);
      if (!multiple) break;
    }
    return accepted;
  }

  function onDragEnter(e) {
    e.preventDefault();
    if (!e.dataTransfer?.types?.includes("Files")) return;
    isOver.value = true;
  }

  function onDragOver(e) {
    e.preventDefault();
    if (!e.dataTransfer?.types?.includes("Files")) return;
    isOver.value = true;
  }

  function onDragLeave(e) {
    // Sadece kendi dış sınırından çıkıldığında kapat — iç child'lara geçişte
    // dragleave tetiklenir, isOver flicker yapar.
    if (e.currentTarget === e.target || !e.currentTarget?.contains(e.relatedTarget)) {
      isOver.value = false;
    }
  }

  function _readBytes(file) {
    // Bir File'in baytlarini oku → { name, type, lastModified, buf } (hata/boş → buf:null)
    return new Promise((resolve) => {
      const meta = { name: file.name, type: file.type, lastModified: file.lastModified };
      const reader = new FileReader();
      reader.onload = () => resolve({ ...meta, buf: reader.result });
      reader.onerror = () => resolve({ ...meta, buf: null });
      try {
        reader.readAsArrayBuffer(file);
      } catch {
        resolve({ ...meta, buf: null });
      }
    });
  }

  async function onDropHandler(e) {
    e.preventDefault();
    isOver.value = false;
    const dt = e.dataTransfer;
    if (!dt) {
      onValidationError?.("unreadable", { name: "(boş)" });
      return;
    }

    // Tarayicilar ayni dosyayi birden fazla API ile farkli verir; biri 0-bayt,
    // digeri dolu olabilir. TUM adaylari topla, BAYTLARINI oku, isim basina
    // EN COK bayt vereni sec. (Senkron erisimler `await`ten ONCE yapilmali —
    // dataTransfer ilk await'te neuter olur.)
    const candidates = [];
    const entries = [];
    if (dt.items) {
      for (const item of dt.items) {
        if (item.kind !== "file") continue;
        const entry = item.webkitGetAsEntry?.();
        if (entry?.isFile) entries.push(entry);
        const f = item.getAsFile();
        if (f) candidates.push(f);
      }
    }
    for (const f of Array.from(dt.files || [])) candidates.push(f);

    // entry.file() (async) — ek adaylar (handle-invalidation'a en dayanikli)
    if (entries.length) {
      const viaEntry = await Promise.all(
        entries.map(
          (en) =>
            new Promise((resolve) =>
              en.file(
                (f) => resolve(f),
                () => resolve(null)
              )
            )
        )
      );
      for (const f of viaEntry) if (f) candidates.push(f);
    }

    if (!candidates.length) {
      onValidationError?.("unreadable", { name: "(boş)" });
      return;
    }

    // Tum adaylarin baytlarini oku, isim basina en buyuk dolu olani sec.
    const reads = await Promise.all(candidates.map(_readBytes));
    const bestByName = new Map();
    for (const r of reads) {
      const len = r.buf?.byteLength || 0;
      const cur = bestByName.get(r.name);
      if (!cur || len > cur.len) bestByName.set(r.name, { ...r, len });
    }

    const files = [];
    for (const { name, type, lastModified, buf, len } of bestByName.values()) {
      if (len > 0) {
        files.push(
          new File([buf], name, { type: type || "application/octet-stream", lastModified })
        );
      }
    }

    if (!files.length) {
      // Tum adaylar 0 bayt → tarayici/OS dosya icerigini vermedi (gercekten okunamaz).
      onValidationError?.("unreadable", candidates[0]);
      return;
    }

    const accepted = filterFiles(files);
    if (accepted.length) onDrop(accepted);
  }

  return {
    isOver,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop: onDropHandler,
  };
}
