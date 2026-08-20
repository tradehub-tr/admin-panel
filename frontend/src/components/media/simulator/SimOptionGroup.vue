<script setup>
  import { computed, nextTick, ref, useId } from "vue";

  /**
   * Klavyeyle kullanılabilen tek seçim listesi — cihaz ve yerleşim seçicisi
   * bunun iki örneği. (İki ayrı bileşen yazılmadı: ARIA sözleşmesi ve tuş
   * davranışı iki yerde kopyalanırsa biri sessizce bozulur.)
   *
   * **ARIA sözleşmesi.** `role="radiogroup"` + dolaşan `tabindex` (roving
   * tabindex): grubun tamamı Tab sırasında TEK durak, içinde ok tuşlarıyla
   * gezilir. Bu, WAI-ARIA radio group deseninin gerektirdiği davranıştır;
   * her seçeneği ayrı Tab durağı yapmak 15 bölgede klavye kullanıcısını 15
   * kez durdururdu.
   *
   *   ↓ / →      sonraki      ↑ / ←   önceki
   *   Home / End ilk / son    Space   seçili olanı yeniden duyur
   *
   * Yatay oklar RTL'de (Arapça) ters çevrilir; dikey oklar yönden bağımsızdır
   * ve birincil gezinme onlardır.
   *
   * **İki düzen, tek sözleşme (UI/UX yeniden düzenlemesi).** `layout="chips"`
   * seçenekleri grup grup yatay çiplerle dizer — 13 cihaz ve 15 bölge,
   * kaydırmalı iki uzun liste yerine tek bakışta görünür. `layout="list"`
   * dar alan için dikey listedir. Roving tabindex, aria-checked ve tuş
   * davranışı ikisinde de aynı `options` sırasını izler; yalnız CSS farklı.
   *
   * ÖLÇÜLMEDİ: gerçek ekran okuyucu (NVDA/VoiceOver) ve tarayıcıdaki gerçek
   * odak halkası. Bu görevde tarayıcı doğrulaması yapılmadı.
   */
  const props = defineProps({
    /** `{ id, label, hint?, group?, primary? }` */
    options: { type: Array, required: true },
    /** Grubun görünür başlığı. */
    label: { type: String, required: true },
    /** Başlığın altındaki tek satırlık açıklama (isteğe bağlı). */
    description: { type: String, default: "" },
    /** `chips` (yatay çip grupları) | `list` (dikey liste). */
    layout: { type: String, default: "chips" },
    /** Grup anahtarlarının görünen adı — `{ phone: "Telefon" }` gibi. */
    groupLabels: { type: Object, default: () => ({}) },
  });

  const model = defineModel({ type: String, default: "" });

  const uid = useId();
  const labelId = `${uid}-label`;
  const descId = `${uid}-desc`;
  const optionId = (id) => `${uid}-${id}`;

  /** Şablonda `ref` dizisi: DOM sırası ile `options` sırası birebir. */
  const buttons = ref([]);

  const activeIndex = computed(() => {
    const i = props.options.findIndex((o) => o.id === model.value);
    // Seçim listeye uymuyorsa ilk seçenek odak durağı olur — grup Tab
    // sırasından TAMAMEN düşmemeli.
    return i === -1 ? 0 : i;
  });

  const groupLabel = (g) => props.groupLabels[g] || g;

  /** Ardışık aynı `group` değerleri tek başlık altında toplanır. */
  const rows = computed(() =>
    props.options.map((o, i) => ({
      ...o,
      index: i,
      showGroup: !!o.group && o.group !== props.options[i - 1]?.group,
    }))
  );

  /**
   * Çip düzeni için gruplar: `[{ group, label, items }]`. Seçenek sırası (ve
   * dolayısıyla ok tuşu sırası) değişmez — `index` korunur, `buttons` ref
   * dizisi DOM sırasıyla birebir kalır.
   */
  const groups = computed(() => {
    const out = [];
    for (const row of rows.value) {
      const key = row.group || "";
      let g = out[out.length - 1];
      if (!g || g.group !== key) {
        g = { group: key, label: groupLabel(key), items: [] };
        out.push(g);
      }
      g.items.push(row);
    }
    return out;
  });

  async function focusAt(index) {
    const clamped = Math.max(0, Math.min(props.options.length - 1, index));
    model.value = props.options[clamped].id;
    await nextTick();
    buttons.value[clamped]?.focus();
  }

  function isRtl() {
    if (typeof document === "undefined") return false;
    return document.documentElement.dir === "rtl";
  }

  function onKeydown(event) {
    const last = props.options.length - 1;
    const i = activeIndex.value;
    const horizontalNext = isRtl() ? "ArrowLeft" : "ArrowRight";
    const horizontalPrev = isRtl() ? "ArrowRight" : "ArrowLeft";

    let target = null;
    if (event.key === "ArrowDown" || event.key === horizontalNext) target = i >= last ? 0 : i + 1;
    else if (event.key === "ArrowUp" || event.key === horizontalPrev)
      target = i <= 0 ? last : i - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = last;
    if (target === null) return;

    event.preventDefault();
    focusAt(target);
  }
</script>

<template>
  <div class="simopt" :class="`simopt--${layout}`">
    <div class="simopt__head">
      <p :id="labelId" class="simopt__label">{{ label }}</p>
      <p v-if="description" :id="descId" class="simopt__desc">{{ description }}</p>
    </div>

    <!-- ÇİP DÜZENİ: her grup bir etiket + çip satırı. Tek radiogroup —
         ok tuşları gruplar arasında da akar. -->
    <div
      v-if="layout === 'chips'"
      class="simopt__groups"
      role="radiogroup"
      :aria-labelledby="labelId"
      :aria-describedby="description ? descId : undefined"
      @keydown="onKeydown"
    >
      <div v-for="g in groups" :key="g.group || '_'" class="simopt__section">
        <p v-if="g.group" class="simopt__group" aria-hidden="true">{{ g.label }}</p>
        <div class="simopt__chips">
          <button
            v-for="o in g.items"
            :id="optionId(o.id)"
            :key="o.id"
            ref="buttons"
            type="button"
            class="simopt__chip"
            :class="{ 'simopt__chip--primary': o.primary }"
            role="radio"
            :aria-checked="model === o.id"
            :tabindex="o.index === activeIndex ? 0 : -1"
            @click="model = o.id"
          >
            <span class="simopt__name">{{ o.label }}</span>
            <span v-if="o.hint" class="simopt__hint">{{ o.hint }}</span>
            <!-- Grup başlığı `aria-hidden`; ekran okuyucu seçeneği bağlamsız
                 duymasın diye grup adı seçenek adının içinde de geçiyor. -->
            <span v-if="o.group" class="simopt__sr">{{ groupLabel(o.group) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- LİSTE DÜZENİ: dar alan için dikey liste. -->
    <div
      v-else
      class="simopt__list"
      role="radiogroup"
      :aria-labelledby="labelId"
      :aria-describedby="description ? descId : undefined"
      @keydown="onKeydown"
    >
      <template v-for="(o, i) in rows" :key="o.id">
        <p v-if="o.showGroup" class="simopt__group" aria-hidden="true">
          {{ groupLabel(o.group) }}
        </p>
        <button
          :id="optionId(o.id)"
          ref="buttons"
          type="button"
          class="simopt__item"
          :class="{ 'simopt__item--on': model === o.id }"
          role="radio"
          :aria-checked="model === o.id"
          :tabindex="i === activeIndex ? 0 : -1"
          @click="model = o.id"
        >
          <span class="simopt__text">
            <span class="simopt__name">{{ o.label }}</span>
            <span v-if="o.hint" class="simopt__hint">{{ o.hint }}</span>
          </span>
          <span v-if="o.group" class="simopt__sr">{{ groupLabel(o.group) }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  @use "@/assets/scss/simulator" as sim;

  .simopt {
    display: flex;
    flex-direction: column;
    gap: media.$s-2;
    min-width: 0;
  }

  .simopt__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: media.$s-1 media.$s-2;
  }

  .simopt__label {
    @include sim.section-title;
  }

  .simopt__desc {
    margin: 0;
    @include media.text("xs");
    @include media.muted(2);
  }

  // ── Çip düzeni ─────────────────────────────────────────────────
  .simopt__groups {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-2 media.$s-4;
  }

  .simopt__section {
    display: flex;
    flex-direction: column;
    gap: media.$s-1;
    min-width: 0;
  }

  .simopt__group {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.2;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 700;
    @include media.muted(2);
  }

  // Liste düzeninde grup başlığı seçeneklerin arasına girer, boşluk ister.
  .simopt--list .simopt__group {
    margin: media.$s-2 0 media.$s-05;
  }

  .simopt__chips {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-1;
  }

  .simopt__chip {
    @include sim.chip-button;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    padding-block: media.$s-1;
    border-radius: media.$r-md;
    line-height: 1.25;
    text-align: start;

    .simopt__name {
      @include media.text("sm");
      font-weight: inherit;
    }

    .simopt__hint {
      @include media.text("xs");
      font-weight: 500;
      opacity: 0.72;
      @include media.numeric;
    }
  }

  // Sayfanın birincil bölgesi: küçük nokta — metinle değil, şekille.
  .simopt__chip--primary .simopt__name::after {
    content: "";
    display: inline-block;
    width: 0.3rem;
    height: 0.3rem;
    margin-inline-start: media.$s-1;
    border-radius: 50%;
    background: currentcolor;
    opacity: 0.55;
    vertical-align: middle;
  }

  // ── Liste düzeni ───────────────────────────────────────────────
  .simopt__list {
    display: flex;
    flex-direction: column;
    gap: media.$s-05;
    max-height: 22rem;
    overflow-y: auto;
  }

  .simopt__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: media.$s-2;
    width: 100%;
    padding: media.$s-2 media.$s-3;
    border: 1px solid transparent;
    border-radius: media.$r-md;
    background: transparent;
    text-align: start;
    cursor: pointer;
    @include media.focus-ring;
    @include media.press(0.99);

    @include media.hoverable {
      &:hover {
        background: $l-bg-muted;

        @include dark {
          background: $d-bg-elevated;
        }
      }
    }
  }

  .simopt__item--on {
    border-color: $brand;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .simopt__text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .simopt__item .simopt__name {
    @include media.text("sm");
    font-weight: 600;
    @include media.truncate;
  }

  .simopt__item .simopt__hint {
    @include media.text("xs");
    @include media.muted(1);
    @include media.numeric;
  }

  .simopt__sr {
    @include media.sr-only;
  }
</style>
