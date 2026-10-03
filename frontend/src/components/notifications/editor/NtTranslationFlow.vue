<script setup>
  /** Çeviri akışı bandı: eksik → kopya → bekliyor → hazır. Kaynak dilde çizilmez. */
  import { computed } from "vue";

  import AppIcon from "@/components/common/AppIcon.vue";
  import {
    TRANSLATION_FLOW,
    TRANSLATION_NEXT,
    TRANSLATION_STATES,
  } from "@/constants/notificationTemplates";

  const props = defineProps({
    /** `LANGS` kaydı */
    lang: { type: Object, required: true },
    state: { type: String, required: true },
    canEdit: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
  });
  const emit = defineEmits(["advance"]);

  const current = computed(() => TRANSLATION_STATES[props.state] || TRANSLATION_STATES.eksik);
  const next = computed(() => TRANSLATION_NEXT[props.state] || TRANSLATION_NEXT.eksik);
  const steps = computed(() => {
    const at = TRANSLATION_FLOW.indexOf(props.state);
    return TRANSLATION_FLOW.map((id, i) => ({
      id,
      ...TRANSLATION_STATES[id],
      current: i === at,
      done: i < at,
    }));
  });
</script>

<template>
  <div class="nt-flow" :class="`nt-flow--${current.tone}`">
    <ol class="nt-flow__steps" aria-label="Çeviri durumu adımları">
      <li
        v-for="step in steps"
        :key="step.id"
        class="nt-flow__step"
        :class="{ 'is-current': step.current, 'is-done': step.done }"
        :aria-current="step.current ? 'step' : undefined"
      >
        <AppIcon :name="step.icon" :size="12" />{{ step.label }}
      </li>
    </ol>
    <div class="nt-flow__row">
      <p>
        <strong>{{ lang.label }} ({{ lang.short }}): {{ current.label }}.</strong>
        {{ current.desc }}
      </p>
      <button
        id="nt-translation-next"
        type="button"
        class="hdr-btn-outlined nt-btn--sm"
        :disabled="!canEdit || busy"
        @click="emit('advance')"
      >
        <AppIcon :name="next.icon" :size="14" />{{ next.label }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .nt-flow {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--nt-bg-soft);
    border: 1px solid var(--nt-line);
  }

  .nt-flow--warn {
    border-color: transparent;
    background: var(--nt-warn-bg);
  }

  .nt-flow--err {
    border-color: transparent;
    background: var(--nt-err-bg);
  }

  .nt-flow__steps {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .nt-flow__step {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 8px;
    border: 1px solid var(--nt-field-line);
    border-radius: 999px;
    font-size: 12px;
    color: var(--nt-fg-2);

    &.is-current {
      background: var(--nt-bg);
      color: var(--nt-fg);
      font-weight: 700;
    }

    &.is-done {
      border-style: dashed;
    }
  }

  .nt-flow__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    p {
      flex: 1 1 220px;
      margin: 0;
    }
  }
</style>
