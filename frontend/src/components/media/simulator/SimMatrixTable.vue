<script setup>
  import { computed } from "vue";
  import { useI18n } from "vue-i18n";

  /**
   * Tüm kombinasyonların tablosu — 13 cihaz × 5 birincil yerleşim = **65**,
   * ya da 15 bölgenin tamamı seçilirse 195.
   *
   * Neden tablo: kolonlu sayısal veri liste değil tablodur; ekran okuyucu
   * "gereken sütunu, 327" diye okuyabilsin diye `<th scope>` kullanılıyor.
   * Satır başlığı cihaz+bölge birleşimi — tek hücrede iki bilgi, çünkü
   * satırı benzersiz kılan o çift.
   */
  const props = defineProps({
    /** `simulateMatrix()` çıktısı. */
    rows: { type: Array, required: true },
    /** `summarize()` çıktısı. */
    summary: { type: Object, required: true },
    /** Seçili kombinasyonun anahtarı — tabloda vurgulanır. */
    activeKey: { type: String, default: "" },
  });

  const emit = defineEmits(["pick"]);
  const { t } = useI18n();

  const caption = computed(() =>
    t("mediaSimulator.matrix.caption", {
      total: props.summary.total,
      insufficient: props.summary.sourceInsufficient,
      overshoot: props.summary.overshoot,
      zoom: props.summary.zoomInsufficient,
    })
  );
</script>

<template>
  <div class="simtab">
    <table class="simtab__table">
      <caption class="simtab__caption">
        {{
          caption
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t("mediaSimulator.matrix.col.combo") }}</th>
          <th scope="col" class="simtab__num">{{ t("mediaSimulator.matrix.col.box") }}</th>
          <th scope="col" class="simtab__num">{{ t("mediaSimulator.matrix.col.required") }}</th>
          <th scope="col">{{ t("mediaSimulator.matrix.col.chosen") }}</th>
          <th scope="col" class="simtab__num">{{ t("mediaSimulator.matrix.col.overshoot") }}</th>
          <th scope="col">{{ t("mediaSimulator.matrix.col.warnings") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.key"
          :class="{ 'simtab__row--on': row.key === activeKey }"
          :aria-current="row.key === activeKey ? 'true' : undefined"
        >
          <th scope="row" class="simtab__combo">
            <button type="button" class="simtab__pick" @click="emit('pick', row)">
              <span class="simtab__device">{{ row.device.label }}</span>
              <span class="simtab__region">{{ row.region.title }}</span>
            </button>
          </th>
          <td class="simtab__num">{{ Math.round(row.cssBoxPx) }}</td>
          <td class="simtab__num">{{ row.requiredPx }}</td>
          <td>
            <code v-if="row.chosen" class="simtab__profile">{{ row.chosen.name }}</code>
            <span v-else class="simtab__ok">—</span>
          </td>
          <td class="simtab__num">{{ row.overshoot ? `${row.overshoot.toFixed(2)}×` : "—" }}</td>
          <td>
            <span v-if="!row.warnings.length" class="simtab__ok">—</span>
            <span v-for="w in row.warnings" :key="w" class="simtab__warn">
              {{ t(`mediaSimulator.warnShort.${w}`) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  @use "@/assets/scss/simulator" as sim;

  .simtab {
    overflow-x: auto;
  }

  .simtab__table {
    @include sim.data-table;
  }

  .simtab__table tbody tr {
    transition: background 120ms $ease-out;

    @include media.hoverable {
      &:hover {
        background: $l-bg-muted;

        @include dark {
          background: $d-bg-elevated;
        }
      }
    }
  }

  // Seçili satır: marka rengi = seçim.
  .simtab__row--on {
    background: rgba($brand, 0.12);

    @include dark {
      background: rgba($brand, 0.14);
    }

    @include media.hoverable {
      &:hover {
        background: rgba($brand, 0.16);

        @include dark {
          background: rgba($brand, 0.18);
        }
      }
    }
  }

  .simtab__pick {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: start;
    cursor: pointer;
    @include media.focus-ring;
  }

  .simtab__device {
    font-weight: 620;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .simtab__region {
    @include media.text("xs");
    font-weight: 400;
    @include media.muted(1);
  }

  .simtab__num {
    text-align: end;
    @include media.numeric;
  }

  .simtab__profile {
    @include sim.mono;
    @include media.text("xs");
    padding: 0.1rem 0.4rem;
    border-radius: media.$r-sm;
    background: $l-bg-muted;
    color: $l-text-700;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text;
    }
  }

  .simtab__warn {
    display: inline-block;
    margin-inline-end: media.$s-1;
    @include media.chip("warning");
  }

  .simtab__ok {
    @include media.muted(2);
  }
</style>
