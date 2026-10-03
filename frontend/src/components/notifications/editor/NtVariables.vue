<script setup>
  /**
   * Değişken listesi. "Zorunlu / isteğe bağlı" etiketi AKTİF kanala göredir
   * (ör. `order.confirmed`: e-posta 3, uygulama içi 2, push 1 zorunlu).
   * Geniş alanda sütun, dar alanda çekmece içinde aynı bileşen kullanılır.
   */
  import { computed } from "vue";

  import { variableCode, variableKindLabel } from "@/utils/notificationTemplates/template";

  const props = defineProps({
    variables: { type: Array, required: true },
    /** Aktif kanalın zorunlu değişken adları */
    required: { type: Array, default: () => [] },
    /** Aktif kapsamın içeriğinde geçen adlar (Set) */
    used: { type: Object, required: true },
    channelLabel: { type: String, default: "" },
    /** İçerik var mı ve düzenlenebilir mi? */
    canInsert: { type: Boolean, default: false },
    /** Başlığı çizme (çekmecenin kendi başlığı var). */
    plain: { type: Boolean, default: false },
  });
  const emit = defineEmits(["insert"]);

  const rows = computed(() =>
    props.variables.map((v) => {
      const req = props.required.includes(v.name);
      const missing = req && props.canInsert && !props.used.has(v.name);
      return {
        name: v.name,
        label: v.label,
        code: variableCode(v),
        nested: !!v.scope,
        tag: req
          ? missing
            ? "zorunlu · eksik"
            : "zorunlu"
          : variableKindLabel(v) || "isteğe bağlı",
        tone: req ? (missing ? "err" : "req") : "",
      };
    })
  );
  const requiredCodes = computed(() => props.required.map((n) => `{{${n}}}`).join(", "));
</script>

<template>
  <div class="nt-vars">
    <div v-if="!plain" class="nt-vars__head">
      <h2 class="nt-h2">Değişkenler</h2>
      <p class="nt-hint">{{ channelLabel }} kanalı için</p>
    </div>
    <ul class="nt-vars__list">
      <li
        v-for="row in rows"
        :key="row.name"
        class="nt-var"
        :class="{ 'nt-var--nested': row.nested }"
      >
        <div class="nt-var__text">
          <span class="nt-var__name">{{ row.label }}</span>
          <code>{{ row.code }}</code>
          <span class="nt-var__tag" :class="row.tone ? `is-${row.tone}` : ''">{{ row.tag }}</span>
        </div>
        <button
          type="button"
          class="hdr-btn-outlined nt-btn--sm"
          :aria-label="`Ekle: ${row.label}`"
          :disabled="!canInsert"
          @click="emit('insert', row.name)"
        >
          Ekle
        </button>
      </li>
    </ul>
    <p class="nt-hint">
      <template v-if="required.length">
        {{ channelLabel }} kanalında zorunlu: <code>{{ requiredCodes }}</code
        >.
      </template>
      <template v-else>{{ channelLabel }} kanalında zorunlu değişken yok.</template>
      "Ekle", imlecin bulunduğu alana yerleştirir.
    </p>
  </div>
</template>

<style scoped lang="scss">
  .nt-vars {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .nt-vars__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .nt-var {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 0;
    border-top: 1px solid var(--nt-line-soft);
  }

  .nt-var--nested {
    padding-inline-start: 12px;
  }

  .nt-var__text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;

    code {
      color: var(--nt-muted);
      overflow-wrap: anywhere;
    }
  }

  .nt-var__name {
    font-weight: 600;
  }

  .nt-var__tag {
    padding: 0 6px;
    border-radius: 4px;
    background: var(--nt-bg-muted);
    font-size: 12px;
    color: var(--nt-fg-2);

    &.is-req {
      background: var(--nt-brand-bg);
      color: var(--nt-fg);
      font-weight: 600;
    }

    &.is-err {
      background: var(--nt-err-bg);
      color: var(--nt-err-fg);
      font-weight: 600;
    }
  }
</style>
