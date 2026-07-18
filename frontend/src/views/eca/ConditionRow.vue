<script setup>
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";

  const { t } = useI18n();

  // Tek bir koşul satırı: [alan] [operator] [değer] [sil].
  // Alan/operator tanımları ve link seçenekleri parent'tan gelir (tek kaynak).
  const row = defineModel("row", { type: Object, required: true });

  const props = defineProps({
    fieldDefs: { type: Array, required: true },
    opsByType: { type: Object, required: true },
    noValueOps: { type: Object, required: true }, // Set
    linkOptions: { type: Object, default: () => ({}) },
  });

  const emit = defineEmits(["field-change", "remove"]);

  const fieldDef = (name) => props.fieldDefs.find((f) => f.name === name) || props.fieldDefs[0];
  const opsFor = (r) => props.opsByType[fieldDef(r.field).type];
  const valueless = (r) => props.noValueOps.has(r.op);
  const isList = (r) => r.op === "in_list" || r.op === "not_in_list";
</script>

<template>
  <div class="cb-row">
    <select v-model="row.field" class="field-input" @change="emit('field-change', row)">
      <option v-for="f in fieldDefs" :key="f.name" :value="f.name">{{ f.name }}</option>
    </select>

    <select v-model="row.op" class="field-input cb-op">
      <option v-for="op in opsFor(row)" :key="op" :value="op">
        {{ t("conditionBuilder.op." + op) }}
      </option>
    </select>

    <template v-if="!valueless(row)">
      <select
        v-if="fieldDef(row.field).type === 'select' && !isList(row)"
        v-model="row.value"
        class="field-input"
      >
        <option v-for="opt in fieldDef(row.field).options" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>

      <select
        v-else-if="fieldDef(row.field).type === 'link' && !isList(row)"
        v-model="row.value"
        class="field-input"
      >
        <option value="">{{ t("conditionBuilder.selectValue") }}</option>
        <option
          v-for="opt in linkOptions[fieldDef(row.field).doctype] || []"
          :key="opt"
          :value="opt"
        >
          {{ opt }}
        </option>
      </select>

      <input
        v-else
        v-model="row.value"
        :type="fieldDef(row.field).type === 'number' && !isList(row) ? 'number' : 'text'"
        class="field-input"
        :placeholder="isList(row) ? t('conditionBuilder.listPlaceholder') : ''"
      />
    </template>
    <span v-else class="cb-novalue">—</span>

    <button
      type="button"
      class="cb-remove"
      :title="t('conditionBuilder.remove')"
      @click="emit('remove')"
    >
      <AppIcon name="trash-2" :size="14" />
    </button>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .cb-row {
    display: grid;
    grid-template-columns: 1.3fr 1.1fr 1.3fr auto;
    gap: 6px;
    align-items: center;

    // Mobil: 3 select yan yana ~50-60px'e sıkışıyor; EcaRuleFormView'daki
    // .cond-row deseniyle aynı şekilde tek kolona düşür (560px kırılımı).
    @media (max-width: 560px) {
      grid-template-columns: 1fr;

      // Uzun option metinleri (min-content) kolonun küçülmesini engelleyip
      // yatay taşmaya yol açıyor — grid item'ın daralabilmesi için şart.
      .field-input {
        min-width: 0;
      }

      // Sil butonu tek kolonda tam satıra yayılmasın, sağa hizala.
      .cb-remove {
        justify-self: end;
      }
    }
  }

  .field-input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid $l-border;
    border-radius: 6px;
    font-size: 12px;
    background: $l-bg;
    color: $l-text-900;
    outline: none;
    transition: border-color $t-base;

    &:focus {
      border-color: $brand;
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text;
    }
  }

  .cb-novalue {
    text-align: center;
    color: $l-text-500;
  }

  .cb-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid $l-border;
    border-radius: 6px;
    background: transparent;
    color: $c-error;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: rgba($c-error, 0.1);
    }

    @include dark {
      border-color: $d-border;
    }
  }
</style>
