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

  async function onDropHandler(e) {
    e.preventDefault();
    isOver.value = false;
    // Chrome Linux drag-drop bug: File handle drop sonrası invalidate olur
    // (özellikle DevTools açıkken). 4 katmanlı fallback stratejisi:
    //   1) webkitGetAsEntry() → FileSystemFileEntry.file() (en sağlam, async ama drop'ta başlatılır)
    //   2) dataTransfer.items[i].getAsFile() (modern API)
    //   3) dataTransfer.files (eski API)
    //   4) FileReader.readAsArrayBuffer SYNC initiation (handle kilidi)

    // 1: webkitGetAsEntry — FileSystemFileEntry async ama güvenilir
    const filesViaEntry = [];
    if (e.dataTransfer?.items) {
      const entryPromises = [];
      for (const item of e.dataTransfer.items) {
        if (item.kind !== "file") continue;
        const entry = item.webkitGetAsEntry?.();
        if (entry?.isFile) {
          entryPromises.push(
            new Promise((resolve) => {
              entry.file(
                (f) => resolve(f),
                () => resolve(null)
              );
            })
          );
        }
      }
      if (entryPromises.length) {
        const results = await Promise.all(entryPromises);
        for (const f of results) if (f) filesViaEntry.push(f);
      }
    }

    // 2+3: items[i].getAsFile() veya dataTransfer.files fallback
    let raw = filesViaEntry;
    if (!raw.length && e.dataTransfer?.items) {
      for (const item of e.dataTransfer.items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) raw.push(f);
        }
      }
    }
    if (!raw.length) {
      raw = Array.from(e.dataTransfer?.files || []);
    }

    if (!raw.length) {
      onValidationError?.("unreadable", { name: "(boş)" });
      return;
    }

    // 4: FileReader SYNC init — drop event hala "açık" iken handle kilidi
    const readers = raw.map((f) => {
      const reader = new FileReader();
      try {
        reader.readAsArrayBuffer(f);
      } catch (err) {
        console.warn("[dropzone] readAsArrayBuffer threw:", err);
      }
      return { reader, file: f };
    });

    const buffers = await Promise.all(
      readers.map(
        ({ reader, file }) =>
          new Promise((resolve) => {
            if (reader.readyState === 2 /* DONE */) {
              resolve({ buffer: reader.result, file });
              return;
            }
            reader.onload = () => resolve({ buffer: reader.result, file });
            reader.onerror = () => {
              console.warn(
                "[dropzone] FileReader error:",
                file.name,
                reader.error?.name,
                reader.error?.message
              );
              resolve({ buffer: null, file });
            };
          })
      )
    );

    const copies = buffers
      .filter((b) => b.buffer && b.buffer.byteLength > 0)
      .map(
        ({ buffer, file }) =>
          new File([buffer], file.name, {
            type: file.type || "application/octet-stream",
            lastModified: file.lastModified,
          })
      );

    if (!copies.length) {
      console.warn(
        "[dropzone] hiçbir dosya okunamadı. raw=",
        raw.map((f) => ({ name: f.name, size: f.size, type: f.type }))
      );
      onValidationError?.("unreadable", raw[0]);
      return;
    }

    const files = filterFiles(copies);
    if (files.length) onDrop(files);
  }

  return {
    isOver,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop: onDropHandler,
  };
}
