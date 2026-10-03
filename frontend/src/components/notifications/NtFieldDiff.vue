<script setup>
  /** Alan bazında fark satırları (`diff.js` → `fieldDiffs`). Eklenen/silinen parça <ins>/<del> ile. */
  defineProps({
    /** `fieldDiffs().rows` */
    rows: { type: Array, required: true },
    oldLabel: { type: String, default: "Eski" },
    newLabel: { type: String, default: "Yeni" },
  });

  const TONE = { aynı: "same", değişti: "warn", eklendi: "ok", kaldırıldı: "err" };
</script>

<template>
  <div class="nt-diff">
    <div v-for="row in rows" :key="row.id" class="nt-diff__field">
      <div class="nt-diff__head">
        <strong>{{ row.label }}</strong>
        <span class="nt-diff__tag" :class="`is-${TONE[row.state]}`">{{ row.state }}</span>
      </div>
      <div v-if="row.state === 'aynı'" class="nt-diff__col nt-diff__col--same">
        <div class="nt-diff__body" :class="{ 'nt-mono': row.mono }">
          <template v-if="row.old.length && row.old[0].text">{{ row.old[0].text }}</template>
          <span v-else class="nt-hint">boş</span>
        </div>
      </div>
      <div v-else class="nt-diff__cols">
        <div class="nt-diff__col">
          <span class="nt-diff__side">{{ oldLabel }}</span>
          <div v-if="row.old.length" class="nt-diff__body" :class="{ 'nt-mono': row.mono }">
            <template v-for="(seg, i) in row.old" :key="i"
              ><del v-if="seg.op === '-'">{{ seg.text }}</del
              ><template v-else>{{ seg.text }}</template></template
            >
          </div>
          <span v-else class="nt-hint">bu sürümde yok</span>
        </div>
        <div class="nt-diff__col">
          <span class="nt-diff__side">{{ newLabel }}</span>
          <div v-if="row.neu.length" class="nt-diff__body" :class="{ 'nt-mono': row.mono }">
            <template v-for="(seg, i) in row.neu" :key="i"
              ><ins v-if="seg.op === '+'">{{ seg.text }}</ins
              ><template v-else>{{ seg.text }}</template></template
            >
          </div>
          <span v-else class="nt-hint">bu sürümde yok</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .nt-diff {
    display: flex;
    flex-direction: column;
    gap: 14px;
    container-type: inline-size;
  }

  .nt-diff__head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .nt-diff__tag {
    padding: 0 8px;
    border-radius: 999px;
    background: var(--nt-bg-muted);
    font-size: 12px;
    font-weight: 600;

    &.is-warn {
      background: var(--nt-warn-bg);
      color: var(--nt-warn-fg);
    }

    &.is-ok {
      background: var(--nt-ok-bg);
      color: var(--nt-ok-fg);
    }

    &.is-err {
      background: var(--nt-err-bg);
      color: var(--nt-err-fg);
    }
  }

  .nt-diff__cols {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  // Dar alanda fark alt alta.
  @container (max-width: 520px) {
    .nt-diff__cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .nt-diff__col {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid var(--nt-line);
    border-radius: 8px;
    background: var(--nt-bg);
  }

  .nt-diff__col--same {
    background: var(--nt-bg-soft);
    color: var(--nt-fg-2);
  }

  .nt-diff__side {
    font-size: 12px;
    color: var(--nt-muted);
  }

  .nt-diff__body {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  del {
    background: var(--nt-err-bg);
    color: var(--nt-err-fg);
    text-decoration: line-through;
  }

  ins {
    background: var(--nt-ok-bg);
    color: var(--nt-ok-fg);
    font-weight: 700;
    text-decoration: none;
  }
</style>
