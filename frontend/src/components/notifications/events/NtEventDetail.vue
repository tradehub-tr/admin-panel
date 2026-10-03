<script setup>
  /** Olayın açılır ayrıntısı: dar genişlikte gizlenen her sütun burada görünür. */
  import AppIcon from "@/components/common/AppIcon.vue";

  defineProps({
    /** `toEventRow(event)` çıktısı */
    row: { type: Object, required: true },
  });
</script>

<template>
  <dl class="nt-detail">
    <div>
      <dt>Dil kapsamı</dt>
      <dd>
        <ul class="nt-detail__langs">
          <li v-for="l in row.langStates" :key="l.id">
            <span class="nt-detail__lang">{{ l.short }}</span>
            <span class="nt-detail__state" :class="`is-${l.tone}`">
              <AppIcon :name="l.icon" :size="12" />{{ l.label }}
            </span>
          </li>
        </ul>
      </dd>
    </div>
    <div>
      <dt>Son değişiklik</dt>
      <dd>
        {{ row.updatedBy }}<br /><span class="nt-num">{{ row.updatedAt }}</span>
      </dd>
    </div>
    <div>
      <dt>Alıcı</dt>
      <dd>{{ row.recipients }}</dd>
    </div>
    <div>
      <dt>Gönderim</dt>
      <dd>
        {{ row.delivery.label }}<br /><span class="nt-hint">{{ row.delivery.desc }}</span>
      </dd>
    </div>
    <div class="nt-detail__wide">
      <dt>Kanal kuralı</dt>
      <dd>
        {{ row.rule }}
        <template v-if="row.why"
          ><br /><span class="nt-hint">{{ row.why }}</span></template
        >
      </dd>
    </div>
  </dl>
</template>

<style scoped lang="scss">
  .nt-detail {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 12px 20px;
    margin: 0;
    padding: 12px 16px 14px;
    background: var(--nt-bg-soft);

    dt {
      margin-bottom: 2px;
      font-size: 12px;
      font-weight: 600;
      color: var(--nt-muted);
    }

    dd {
      margin: 0;
    }
  }

  .nt-detail__wide {
    grid-column: 1 / -1;
  }

  .nt-detail__langs {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .nt-detail__lang {
    min-width: 26px;
    font-weight: 700;
  }

  .nt-detail__state {
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &.is-ok {
      color: var(--nt-ok-fg);
    }

    &.is-warn {
      color: var(--nt-warn-fg);
    }

    &.is-err {
      color: var(--nt-err-fg);
    }
  }
</style>
