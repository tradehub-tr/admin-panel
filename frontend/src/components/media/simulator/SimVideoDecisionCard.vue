<script>
  import VIDEO_DECISION from "@/lib/media/simulator/vendor/video_decision.js";

  /**
   * T-071 — video karar tablosunun GEREKÇESİ.
   *
   * ## Ne gösteriyor
   *
   * `tradehub_core/media/pipeline/policy/video_decision.json` sıralı bir kural
   * listesidir ve **ilk eşleşen kural kazanır**. Panelde bugüne kadar bu
   * tablodan yalnız `poster` bloğunun sayıları görünüyordu
   * (`scripts/sync-simulator.mjs`); kararın kendisi — hangi girdinin hangi
   * kararı doğurduğu, hangi eşiğin bunu söylediği, fayda kapısının neyi
   * reddettiği — hiç görünmüyordu. Bu kart onu gösterir.
   *
   * ## Ekrandaki hiçbir sayı burada yazılmadı
   *
   *   · **Eşikler, gerekçeler, kapı oranları** → `video_decision.json`'dan
   *     vendor'lanır.
   *   · **Künyeler** → `tradehub_core/tests/fixtures/media/live-probe.json`;
   *     konteynerde gerçek `ffprobe` koşumuyla ölçülmüştür.
   *   · **Kararlar, kural izi, fayda kapısı sayıları, REMUX geri çekilme
   *     hükmü** → referans motor (`decision.py` + `transcode.py`) senkron
   *     sırasında KOŞTURULUR, çıktısı vektör olarak vendor'lanır.
   *
   * Aşağıdaki `evaluateDecision` panelin kendi yorumlayıcısıdır — açıklama
   * satırlarını ("bpp 0,35 > 0,08") üretebilmek için gerekli, çünkü referans
   * motor kararı verir ama yaprak yaprak gerekçeyi dökmez. Denetimsiz değil:
   * `__tests__/videoDecision.test.js` 23 vektörün tamamında bu yorumlayıcının
   * kararını referans motorunkiyle karşılaştırır, ve kart sapma olursa bunu
   * ekranda KIRMIZI olarak duyurur (aşağıda `parityBreak`).
   *
   * ## Vendor'lanamayan alan gizlenmez
   *
   * `live-probe.json` künye başına 16 alan taşıyor; `VideoFacts` 26 değişken
   * tanımlıyor. Aradaki 6 alan (`moov_at_end`, `nb_streams`,
   * `audio_bitrate_bps`, `audio_channels`, `rotation`, `video_profile`)
   * ÖLÇÜLMEDİ ve `VideoFacts` varsayılanında kalıyor. Ekran bunu alan alan
   * yazar ve o alanlara bakan kuralları "varsayılana dayanıyor" diye
   * işaretler; karar da bu yüzden "kesin değil" sayılır.
   */

  /** Karar tablosunun sekiz operatörü — `decision.py` `_OPS` ile birebir. */
  const OPS = {
    eq: (a, b) => a === b,
    ne: (a, b) => a !== b,
    lt: (a, b) => a < b,
    lte: (a, b) => a <= b,
    gt: (a, b) => a > b,
    gte: (a, b) => a >= b,
    in: (a, b) => (Array.isArray(b) ? b : []).includes(a),
    not_in: (a, b) => !(Array.isArray(b) ? b : []).includes(a),
  };

  /** Ekranda basılan işaret — çeviriye girmez, dört dilde de aynı. */
  export const OP_SYMBOL = Object.freeze({
    eq: "=",
    ne: "≠",
    lt: "<",
    lte: "≤",
    gt: ">",
    gte: "≥",
    in: "∈",
    not_in: "∉",
  });

  const ORDERING_OPS = ["lt", "lte", "gt", "gte"];

  /**
   * Bozuk tablo hatası — `decision.py` `DecisionTableError` karşılığı.
   *
   * Sessizce `false` dönmek bir kuralı ÖLÜ bırakır ve testleri geçirir; bu
   * yüzden bilinmeyen değişken/operatör ve karşılaştırılamayan tip atar.
   */
  export class DecisionTableError extends Error {}

  /** Bir koşul ağacının okuduğu değişken adları. */
  export function conditionVars(when, out = []) {
    if (!when || typeof when !== "object") return out;
    for (const k of ["all", "any"]) {
      if (Array.isArray(when[k])) {
        when[k].forEach((c) => conditionVars(c, out));
        return out;
      }
    }
    if (when.not) return conditionVars(when.not, out);
    if (when.var && !out.includes(when.var)) out.push(when.var);
    return out;
  }

  /** Koşul ağacını değerlendir — `decision.py` `_eval_condition` portu. */
  export function evalCondition(when, vars, ruleId = "") {
    if (Array.isArray(when?.all)) return when.all.every((c) => evalCondition(c, vars, ruleId));
    if (Array.isArray(when?.any)) return when.any.some((c) => evalCondition(c, vars, ruleId));
    if (when?.not) return !evalCondition(when.not, vars, ruleId);

    const { var: ad, op, value } = when || {};
    if (!(ad in vars)) throw new DecisionTableError(`${ruleId}: bilinmeyen değişken ${ad}`);
    const fn = OPS[op];
    if (!fn) throw new DecisionTableError(`${ruleId}: bilinmeyen operatör ${op}`);
    const sol = vars[ad];
    // Python `"a" < 1` TypeError atar; JavaScript sessizce false döner. Sessiz
    // false kuralı ölü bırakır — tabloyu bozar ama testi geçirir.
    if (ORDERING_OPS.includes(op) && typeof sol !== typeof value)
      throw new DecisionTableError(`${ruleId}: ${ad} ${op} karşılaştırılamadı`);
    return Boolean(fn(sol, value));
  }

  /**
   * Künyeyi kural listesinden geçir — İLK EŞLEŞEN kazanır, yoksa `default`.
   *
   * @returns {{action, ruleId, code, reason, trace: Array}}
   */
  export function evaluateDecision(vars, table = VIDEO_DECISION) {
    const trace = [];
    for (const rule of table.rules) {
      const matched = evalCondition(rule.when, vars, rule.id);
      trace.push({ id: rule.id, matched });
      if (matched)
        return {
          action: rule.action,
          ruleId: rule.id,
          code: rule.code,
          reason: rule.reason,
          trace,
        };
    }
    const d = table.fallbackRule || {};
    return {
      action: d.action || "PASSTHROUGH",
      ruleId: "default",
      code: d.code || "",
      reason: d.reason || "",
      trace,
    };
  }

  /**
   * Koşul ağacını ekrana basılabilir DÜZ satırlara aç.
   *
   * Şablonda özyineleme bir bileşen gerektirirdi; gerekçe iki seviyeden derin
   * olmadığı için (bugün en derini `all` + iki yaprak) düzleştirmek yeterli.
   */
  export function explainCondition(when, vars, depth = 0, out = []) {
    if (Array.isArray(when?.all) || Array.isArray(when?.any)) {
      const isAll = Array.isArray(when.all);
      out.push({
        kind: isAll ? "all" : "any",
        depth,
        ok: evalCondition(when, vars),
      });
      (isAll ? when.all : when.any).forEach((c) => explainCondition(c, vars, depth + 1, out));
      return out;
    }
    if (when?.not) {
      out.push({ kind: "not", depth, ok: evalCondition(when, vars) });
      return explainCondition(when.not, vars, depth + 1, out);
    }
    out.push({
      kind: "leaf",
      depth,
      name: when.var,
      op: when.op,
      expected: when.value,
      actual: vars[when.var],
      ok: evalCondition(when, vars),
    });
    return out;
  }

  export { VIDEO_DECISION };
</script>

<script setup>
  import { computed, ref } from "vue";
  import { useI18n } from "vue-i18n";

  import AppIcon from "@/components/common/AppIcon.vue";
  import { formatBytes } from "@/utils/mediaFormat";

  /**
   * Başlangıçta seçili künye. Varsayılan, ölçülmüş korpusun ilk künyesidir.
   *
   * Testin ikinci bir karar dalını (varsayılana düşen PASSTHROUGH, kapının
   * işlemediği durum) sunucu çıktısında görebilmesi için gerekiyor; ileride
   * ekrana derin bağlantı vermek için de kullanılabilir.
   */
  const props = defineProps({
    initialKind: { type: String, default: "measured" },
    initialName: { type: String, default: "" },
  });

  const { t } = useI18n();

  const data = VIDEO_DECISION;
  const measured = computed(() => data.vectors.filter((v) => v.kind === "measured"));
  const synthetic = computed(() => data.vectors.filter((v) => v.kind === "synthetic"));

  const vectorName = ref(
    props.initialName || measured.value[0]?.name || data.vectors[0]?.name || ""
  );
  const vectorKind = ref(props.initialKind);

  const vector = computed(
    () =>
      data.vectors.find((v) => v.kind === vectorKind.value && v.name === vectorName.value) ||
      data.vectors[0]
  );

  /** Sentetik künyede DEĞİŞTİRİLEN alanlar — künye tablosunda ayrı etiketlenir. */
  const mutatedVars = computed(() => (vector.value.mutation || []).map((m) => m.var));

  /** Panelin kendi hesabı. Referansla karşılaştırılır, gizlenmez. */
  const panel = computed(() => evaluateDecision(vector.value.variables));

  /** Referans motorla sapma — varsa ekranda kırmızı duyurulur. */
  const parityBreak = computed(() => {
    const ref_ = vector.value.decision;
    const p = panel.value;
    return p.action !== ref_.action || p.ruleId !== ref_.rule_id ? { panel: p, ref: ref_ } : null;
  });

  const matchedRule = computed(() => data.rules.find((r) => r.id === panel.value.ruleId) || null);

  const explain = computed(() =>
    matchedRule.value ? explainCondition(matchedRule.value.when, vector.value.variables) : []
  );

  /** Kural sırası anlamlı: eşleşmeden sonrasına BAKILMAZ. */
  const traceRows = computed(() => {
    const hit = panel.value.trace;
    return data.rules.map((rule) => {
      const seen = hit.find((h) => h.id === rule.id);
      const assumed = conditionVars(rule.when).filter((v) =>
        (vector.value.defaulted || []).includes(v)
      );
      return {
        rule,
        state: !seen ? "skipped" : seen.matched ? "hit" : "miss",
        assumed,
        thresholds: explainCondition(rule.when, vector.value.variables).filter(
          (l) => l.kind === "leaf"
        ),
      };
    });
  });

  /**
   * Karar KESİN Mİ.
   *
   * Bakılan (eşleşmeden önceki) kurallardan biri vendor'lanmamış bir alana
   * bakıyorsa, o kural `VideoFacts` varsayılanıyla değerlendirilmiştir. O
   * alanın gerçek değeri kararı değiştirebilirdi — ekran bunu saklamaz.
   */
  const assumedRules = computed(() =>
    traceRows.value.filter((r) => r.state !== "skipped" && r.assumed.length)
  );

  const gate = computed(() => vector.value.benefit_gate || {});

  /** Fayda kapısı bu kararda işler mi — üç durum, üçü de ayrı cümle. */
  const gateState = computed(() => {
    const a = panel.value.action;
    if (a === "TRANSCODE") return "applies";
    if ((data.benefitGate.exempt_actions || []).includes(a)) return "exempt";
    return "noOutput";
  });

  const variableRows = computed(() => {
    const vars = vector.value.variables;
    return Object.keys(vars)
      .sort()
      .map((name) => ({
        name,
        value: vars[name],
        spec: data.variables[name] || null,
        origin: mutatedVars.value.includes(name)
          ? "synthetic"
          : (vector.value.defaulted || []).includes(name)
            ? "unvendored"
            : (vector.value.derived || []).includes(name)
              ? "derived"
              : "measured",
      }));
  });

  const unvendored = computed(() =>
    (vector.value.defaulted || []).map((name) => ({
      name,
      value: vector.value.variables[name],
      rules: data.rules.filter((r) => conditionVars(r.when).includes(name)).map((r) => r.id),
    }))
  );

  const ACTION_TONE = Object.freeze({
    PASSTHROUGH: "ok",
    REMUX: "info",
    TRANSCODE: "warn",
    REJECT: "bad",
  });

  const ORIGIN_FALLBACK = Object.freeze({
    measured: "ÖLÇÜM",
    derived: "TÜRETİLDİ",
    synthetic: "SENTETİK GİRDİ",
    unvendored: "VENDOR'LANMADI",
  });

  const NOTE_FALLBACK = Object.freeze({
    source: "Kaynak",
    note: "Not",
    gap_today: "BUGÜNKÜ HATTA YOK",
    diverges_from_today: "BUGÜNKÜ HATTAN AYRILIYOR",
    why_two_conditions: "Neden iki koşul",
    measured: "Ölçüm",
    cost: "Maliyet",
  });

  /**
   * Kural kimliklerinin insan dilindeki karşılığı — çeviri gelene kadarki
   * varsayılanlar. Kimlik (`probe_unavailable` gibi) politika dosyasıyla
   * sözleşmedir ve ekranda KALIR; etiket yalnız ne anlama geldiğini söyler.
   */
  const RULE_LABEL = Object.freeze({
    probe_unavailable: "Teknik ölçüm alınamadı",
    no_video_stream: "Dosyada video izi yok",
    resolution_over_max: "Çözünürlük 4K tavanını aşıyor",
    duration_over_engine_max: "Süre 15 dakika tavanını aşıyor",
    codec_not_deliverable: "Video kodeği H.264 değil",
    pix_fmt_not_web: "Piksel biçimi tarayıcıda oynamaz",
    width_over_cap: "Genişlik 1280 px tavanını aşıyor",
    bitrate_over_cap: "Video bit hızı 2,5 Mbps tavanını aşıyor",
    fps_over_cap: "Kare hızı 30 fps tavanını aşıyor",
    inefficient_encoding: "Kodlama verimsiz — aynı kalite daha az baytla olur",
    audio_codec_not_deliverable: "Ses kodeği AAC/MP3 değil",
    audio_bitrate_over_cap: "Ses bit hızı 192 kbps tavanını aşıyor",
    moov_at_end: "moov atomu dosya sonunda — akış geç başlar",
    container_not_mp4: "Kap MP4 değil",
    extra_streams: "Video+ses dışında fazladan akış var",
    default: "Hiçbir kurala takılmadı — dosya zaten teslim edilebilir",
  });

  const ruleLabel = (id) =>
    t(`mediaSimulator.videoDecision.rule.${id}`, {}, RULE_LABEL[id] || id);

  /** Ölçülmeyen alan kimliklerinin insan dilindeki karşılığı. */
  const FIELD_LABEL = Object.freeze({
    audio_bitrate_bps: "Ses bit hızı",
    audio_channels: "Ses kanal sayısı",
    moov_at_end: "moov atomunun dosyadaki yeri",
    nb_streams: "Dosyadaki akış sayısı",
    rotation: "Görüntü döndürme bilgisi",
    video_profile: "H.264 profili",
  });

  const fieldLabel = (id) =>
    t(`mediaSimulator.videoDecision.field.${id}`, {}, FIELD_LABEL[id] || id);

  /** Kuralları "İnsan adı (kimlik)" biçiminde birleştir. */
  const ruleList = (ids) => ids.map((id) => `${ruleLabel(id)} (${id})`).join(", ");

  const num = (v) => (typeof v === "number" ? v.toLocaleString("tr-TR") : String(v));

  /** Değeri ekrana bas — tip bilgisi kaybolmasın diye dizgi tırnaklı. */
  function show(v) {
    if (v === null || v === undefined) return "—";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (Array.isArray(v)) return v.join(" · ");
    if (typeof v === "string") return v === "" ? '""' : v;
    return num(v);
  }

  function pick(kind, name) {
    vectorKind.value = kind;
    vectorName.value = name;
  }
</script>

<template>
  <section class="simvd">
    <header class="simvd__head">
      <h3 class="simvd__title">
        {{ t("mediaSimulator.videoDecision.title", {}, "Video karar tablosu — gerekçesiyle") }}
      </h3>
      <p class="simvd__lead">
        {{
          t(
            "mediaSimulator.videoDecision.lead",
            { n: data.rules.length },
            "{n} kural sıralıdır ve İLK EŞLEŞEN KAZANIR. Aşağıdaki her sayı vendor'lanmış dosyadan gelir; kararı referans motor verdi, panel yalnız gerekçeyi açıyor."
          )
        }}
      </p>
    </header>

    <!-- Künye seçimi: ölçülmüş korpus + her kuralı tetikleyen örnekler. -->
    <h4 class="simvd__sub">
      {{ t("mediaSimulator.videoDecision.inputTitle", {}, "Girdi künyesi") }}
    </h4>
    <div
      class="simvd__switch"
      role="group"
      :aria-label="t('mediaSimulator.videoDecision.measuredGroup', {}, 'Ölçülmüş künyeler')"
    >
      <button
        v-for="v in measured"
        :key="v.name"
        type="button"
        class="simvd__switchBtn"
        :class="{ 'is-on': vectorKind === 'measured' && vectorName === v.name }"
        :aria-pressed="vectorKind === 'measured' && vectorName === v.name ? 'true' : 'false'"
        @click="pick('measured', v.name)"
      >
        {{ v.name }}
      </button>
    </div>
    <label class="simvd__field">
      <span>{{
        t("mediaSimulator.videoDecision.syntheticGroup", {}, "Kural örneği (SENTETİK künye)")
      }}</span>
      <select
        class="simvd__select"
        :value="vectorKind === 'synthetic' ? vectorName : ''"
        @change="pick('synthetic', $event.target.value)"
      >
        <option value="" disabled>
          {{ t("mediaSimulator.videoDecision.choose", {}, "Kural örneği seç…") }}
        </option>
        <option v-for="v in synthetic" :key="v.name" :value="v.name">
          {{ ruleLabel(v.expects_rule || v.name) }}
        </option>
      </select>
    </label>

    <p v-if="vector.kind === 'measured'" class="simvd__note">
      <AppIcon name="info" :size="14" />
      <span>
        {{
          t(
            "mediaSimulator.videoDecision.measuredNote",
            { env: data.source.kunyeOrtami, file: data.source.kunyeKorpusu },
            "Bu künye {env} konteynerinde gerçek ffprobe koşumuyla ÖLÇÜLDÜ ({file})."
          )
        }}
      </span>
    </p>
    <p v-else class="simvd__note simvd__note--unmeasured">
      <AppIcon name="triangle-alert" :size="14" />
      <span>
        {{
          t(
            "mediaSimulator.videoDecision.syntheticNote",
            { base: vector.base, why: vector.mutation_why },
            "SENTETİK künye — ölçüm DEĞİL. Ölçülmüş {base} künyesinden tek alan değiştirildi: {why}. Kararı yine referans motor verdi."
          )
        }}
      </span>
    </p>
    <ul v-if="vector.mutation && vector.mutation.length" class="simvd__mutation">
      <li v-for="m in vector.mutation" :key="m.var">
        <code>{{ m.var }}</code>
        {{ show(m.from) }} → <strong>{{ show(m.to) }}</strong>
      </li>
    </ul>

    <!-- ── Karar ────────────────────────────────────────────────── -->

    <h4 class="simvd__sub">
      {{ t("mediaSimulator.videoDecision.verdictTitle", {}, "Karar") }}
    </h4>

    <p v-if="parityBreak" class="simvd__note simvd__note--bad">
      <AppIcon name="triangle-alert" :size="14" />
      <span>
        {{
          t(
            "mediaSimulator.videoDecision.parityBreak",
            {
              panel: `${parityBreak.panel.action} / ${parityBreak.panel.ruleId}`,
              ref: `${parityBreak.ref.action} / ${parityBreak.ref.rule_id}`,
            },
            "SAPMA: panelin hesabı ({panel}) referans motorun kararından ({ref}) farklı. Ekranda gösterilen gerekçeye GÜVENME, senkron koştur."
          )
        }}
      </span>
    </p>

    <div class="simvd__verdict" :class="`simvd__verdict--${ACTION_TONE[panel.action]}`">
      <span class="simvd__action" :class="`simvd__action--${ACTION_TONE[panel.action]}`">
        {{ panel.action }}
      </span>
      <div class="simvd__verdictText">
        <p class="simvd__reason">{{ panel.reason }}</p>
        <p class="simvd__meaning">{{ (data.actions[panel.action] || {}).meaning }}</p>
        <p class="simvd__ruleRef">
          <span class="simvd__ruleRefName">{{ ruleLabel(panel.ruleId) }}</span>
          <code class="simvd__ruleId">{{ panel.ruleId }}</code>
          <code v-if="panel.code" class="simvd__code">{{ panel.code }}</code>
        </p>
      </div>
    </div>

    <p v-if="vector.kind === 'measured'" class="simvd__note">
      <AppIcon name="info" :size="14" />
      <span>
        {{
          vector.today_needs_transcode === (panel.action === "TRANSCODE")
            ? t(
                "mediaSimulator.videoDecision.todayAgrees",
                { today: vector.today_needs_transcode ? "transcode" : "dokunma" },
                "Bugünkü hat ({today}) bu künyede karar tablosuyla AYNI sonucu veriyor."
              )
            : t(
                "mediaSimulator.videoDecision.todayDiffers",
                {
                  today: vector.today_needs_transcode ? "transcode" : "dokunma",
                  table: panel.action,
                },
                "Bugünkü hat {today} diyor, karar tablosu {table} diyor — SAPMA."
              )
        }}
      </span>
    </p>

    <!-- Gerekçe: hangi eşik, hangi ölçü. -->
    <h4 class="simvd__sub">
      {{ t("mediaSimulator.videoDecision.becauseTitle", {}, "Çünkü — eşik eşik") }}
    </h4>
    <p v-if="panel.ruleId === 'default'" class="simvd__reason">
      {{
        t(
          "mediaSimulator.videoDecision.defaultWhy",
          { n: data.rules.length },
          "{n} kuralın hiçbiri eşleşmedi; tablo varsayılana düştü."
        )
      }}
    </p>
    <ul v-else class="simvd__explain">
      <li
        v-for="(line, i) in explain"
        :key="i"
        :class="[`simvd__explain--d${line.depth}`, line.ok ? 'is-ok' : 'is-off']"
      >
        <template v-if="line.kind === 'leaf'">
          <code>{{ line.name }}</code>
          <span class="simvd__actual">{{ show(line.actual) }}</span>
          <span class="simvd__op">{{ OP_SYMBOL[line.op] }}</span>
          <span class="simvd__expected">{{ show(line.expected) }}</span>
          <span class="simvd__flag">{{ line.ok ? "✓" : "✗" }}</span>
        </template>
        <template v-else>
          {{
            line.kind === "all"
              ? t("mediaSimulator.videoDecision.opAll", {}, "TÜMÜ (VE)")
              : line.kind === "any"
                ? t("mediaSimulator.videoDecision.opAny", {}, "EN AZ BİRİ (VEYA)")
                : t("mediaSimulator.videoDecision.opNot", {}, "DEĞİL")
          }}
        </template>
      </li>
    </ul>

    <dl v-if="matchedRule && Object.keys(matchedRule.notes).length" class="simvd__notes">
      <template v-for="(text, key) in matchedRule.notes" :key="key">
        <dt>{{ t(`mediaSimulator.videoDecision.note.${key}`, {}, NOTE_FALLBACK[key] || key) }}</dt>
        <dd>{{ text }}</dd>
      </template>
    </dl>

    <p v-if="assumedRules.length" class="simvd__note simvd__note--unmeasured">
      <AppIcon name="triangle-alert" :size="14" />
      <span>
        {{
          t(
            "mediaSimulator.videoDecision.notCertain",
            { rules: assumedRules.map((r) => r.rule.id).join(", ") },
            "Karar KESİN DEĞİL: şu kurallar vendor'lanmamış alanların VARSAYILAN değeriyle değerlendirildi — {rules}. Gerçek değer kararı değiştirebilirdi."
          )
        }}
      </span>
    </p>

    <!-- ── Kural izi ─────────────────────────────────────────────── -->

    <h4 class="simvd__sub">
      {{ t("mediaSimulator.videoDecision.traceTitle", {}, "Kural izi — sıra anlamlıdır") }}
    </h4>
    <table class="simvd__table">
      <caption class="simvd__caption">
        {{
          t(
            "mediaSimulator.videoDecision.traceCaption",
            {
              looked: panel.trace.length,
              total: data.rules.length,
            },
            "{total} kuralın {looked} tanesine bakıldı; eşleşmeden sonrasına BAKILMAZ."
          )
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t("mediaSimulator.videoDecision.col.rule", {}, "Kural") }}</th>
          <th scope="col">{{ t("mediaSimulator.videoDecision.col.action", {}, "Aksiyon") }}</th>
          <th scope="col">{{ t("mediaSimulator.videoDecision.col.threshold", {}, "Eşik") }}</th>
          <th scope="col">{{ t("mediaSimulator.videoDecision.col.state", {}, "Durum") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in traceRows" :key="row.rule.id" :class="`is-${row.state}`">
          <th scope="row">
            <span class="simvd__ruleName">
              {{ ruleLabel(row.rule.id) }}
              <span v-if="row.assumed.length" class="simvd__assumed">{{
                t("mediaSimulator.videoDecision.assumed", {}, "VARSAYILAN")
              }}</span>
            </span>
            <code class="simvd__ruleCode">{{ row.rule.id }}</code>
          </th>
          <td>
            <span class="simvd__action" :class="`simvd__action--${ACTION_TONE[row.rule.action]}`">
              {{ row.rule.action }}
            </span>
          </td>
          <td class="simvd__thresholds">
            <span v-for="(l, i) in row.thresholds" :key="i">
              <code>{{ l.name }}</code> {{ OP_SYMBOL[l.op] }} {{ show(l.expected) }}
            </span>
          </td>
          <td>
            <span v-if="row.state === 'hit'" class="simvd__ok">{{
              t("mediaSimulator.videoDecision.state.hit", {}, "EŞLEŞTİ")
            }}</span>
            <span v-else-if="row.state === 'miss'" class="simvd__muted">{{
              t("mediaSimulator.videoDecision.state.miss", {}, "eşleşmedi")
            }}</span>
            <span v-else class="simvd__muted">{{
              t("mediaSimulator.videoDecision.state.skipped", {}, "bakılmadı")
            }}</span>
          </td>
        </tr>
        <tr :class="panel.ruleId === 'default' ? 'is-hit' : 'is-skipped'">
          <th scope="row">
            <span class="simvd__ruleName">{{ ruleLabel("default") }}</span>
            <code class="simvd__ruleCode">default</code>
          </th>
          <td>
            <span
              class="simvd__action"
              :class="`simvd__action--${ACTION_TONE[data.fallbackRule.action]}`"
            >
              {{ data.fallbackRule.action }}
            </span>
          </td>
          <td class="simvd__thresholds">
            {{ t("mediaSimulator.videoDecision.noCondition", {}, "koşul yok") }}
          </td>
          <td>
            <span v-if="panel.ruleId === 'default'" class="simvd__ok">{{
              t("mediaSimulator.videoDecision.state.hit", {}, "EŞLEŞTİ")
            }}</span>
            <span v-else class="simvd__muted">{{
              t("mediaSimulator.videoDecision.state.skipped", {}, "bakılmadı")
            }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- ── Fayda kapısı ──────────────────────────────────────────── -->

    <h4 class="simvd__sub">
      {{
        t("mediaSimulator.videoDecision.gateTitle", {}, "Fayda kapısı — reddetmek de bir karardır")
      }}
    </h4>
    <dl class="simvd__spec">
      <div>
        <dt>{{ t("mediaSimulator.videoDecision.gate.id", {}, "Kapı") }}</dt>
        <dd>{{ data.benefitGate.id }}</dd>
      </div>
      <div>
        <dt>{{ t("mediaSimulator.videoDecision.gate.ratio", {}, "En az kazanç") }}</dt>
        <dd>%{{ Math.round((gate.min_saving_ratio || 0) * 100) }}</dd>
      </div>
      <div>
        <dt>{{ t("mediaSimulator.videoDecision.gate.src", {}, "Kaynak") }}</dt>
        <dd>{{ formatBytes(gate.src_bytes) }}</dd>
      </div>
      <div>
        <dt>{{ t("mediaSimulator.videoDecision.gate.max", {}, "Çıktı en fazla") }}</dt>
        <dd>{{ formatBytes(gate.max_output_bytes) }}</dd>
      </div>
      <div>
        <dt>{{ t("mediaSimulator.videoDecision.gate.ceiling", {}, "Hız tavanı") }}</dt>
        <dd>{{ num(gate.rate_ceiling_kbps) }} kbps</dd>
      </div>
    </dl>

    <p class="simvd__note" :class="{ 'simvd__note--unmeasured': gateState !== 'applies' }">
      <AppIcon name="info" :size="14" />
      <span>
        {{
          gateState === "applies"
            ? t(
                "mediaSimulator.videoDecision.gateApplies",
                {
                  max: formatBytes(gate.max_output_bytes),
                  ceiling: num(gate.rate_ceiling_kbps),
                },
                "Karar TRANSCODE: çıktı {max} baytı AŞARSA çıktı ATILIR ve kaynak korunur. Hız tavanı ({ceiling} kbps) kapıdan TÜRETİLİR — sabit bir çarpan değildir."
              )
            : gateState === "exempt"
              ? t(
                  "mediaSimulator.videoDecision.gateExempt",
                  { action: panel.action },
                  "{action} kapıdan MUAF."
                )
              : t(
                  "mediaSimulator.videoDecision.gateNoOutput",
                  { action: panel.action },
                  "{action} yeni dosya üretmez — fayda kapısı işlemez."
                )
        }}
      </span>
    </p>
    <p v-if="gateState === 'exempt'" class="simvd__meaning">
      {{ data.benefitGate.exempt_reason }}
    </p>
    <p class="simvd__meaning">{{ data.benefitGate.meaning }}</p>
    <p class="simvd__note simvd__note--unmeasured">
      <AppIcon name="triangle-alert" :size="14" />
      <span>{{ data.benefitGate.why }}</span>
    </p>

    <h5 class="simvd__sub2">
      {{
        t(
          "mediaSimulator.videoDecision.fallbackTitle",
          {},
          "Kapıdan düşerse — REMUX'a geri çekilme"
        )
      }}
    </h5>
    <p class="simvd__note" :class="{ 'simvd__note--unmeasured': !gate.remux_fallback_applies }">
      <AppIcon :name="gate.remux_fallback_applies ? 'info' : 'triangle-alert'" :size="14" />
      <span>
        {{
          gate.remux_fallback_applies
            ? t(
                "mediaSimulator.videoDecision.fallbackYes",
                { why: gate.remux_fallback_reason },
                "Geri çekilme UYGULANIR — {why}. REMUX kapıdan muaf olduğu için bu ikinci koşum her zaman teslim edilebilir bir dosya bırakır."
              )
            : t(
                "mediaSimulator.videoDecision.fallbackNo",
                { why: gate.remux_fallback_reason },
                "Geri çekilme UYGULANMAZ — {why}."
              )
        }}
      </span>
    </p>

    <!-- ── Kalite kapısı ─────────────────────────────────────────── -->

    <h4 class="simvd__sub">
      {{ t("mediaSimulator.videoDecision.qualityTitle", {}, "Kalite kapısı") }}
    </h4>
    <dl class="simvd__spec">
      <div>
        <dt>{{ t("mediaSimulator.videoDecision.quality.vmaf", {}, "VMAF en az") }}</dt>
        <dd>{{ num(data.qualityGate.vmaf_min) }}</dd>
      </div>
      <div>
        <dt>
          {{ t("mediaSimulator.videoDecision.quality.duration", {}, "Süre sapması en fazla") }}
        </dt>
        <dd>{{ num(data.qualityGate.max_duration_delta_s) }} s</dd>
      </div>
    </dl>
    <p class="simvd__note simvd__note--unmeasured">
      <AppIcon name="triangle-alert" :size="14" />
      <span>{{ data.qualityGate.vmaf_note }}</span>
    </p>
    <p class="simvd__meaning">{{ data.qualityGate.duration_note }}</p>

    <!-- ── Vendor'lanmayan alanlar ───────────────────────────────── -->

    <h4 class="simvd__sub">
      {{ t("mediaSimulator.videoDecision.gapsTitle", {}, "Vendor'lanmayan alanlar") }}
    </h4>
    <p v-if="!unvendored.length" class="simvd__meaning">
      {{
        t(
          "mediaSimulator.videoDecision.noGaps",
          {},
          "Bu künyede kararın okuduğu her alan vendor'lanmış."
        )
      }}
    </p>
    <ul v-else class="simvd__gaps">
      <li v-for="g in unvendored" :key="g.name">
        <span class="simvd__gapHead">
          <span class="simvd__gapName">{{ fieldLabel(g.name) }}</span>
          <code class="simvd__gapCode">{{ g.name }}</code>
          <span class="simvd__bad">{{
            t("mediaSimulator.videoDecision.notVendored", {}, "ÖLÇÜLMEDİ")
          }}</span>
        </span>
        <span class="simvd__gapValue">
          {{
            t(
              "mediaSimulator.videoDecision.gapValue",
              { value: show(g.value) },
              "Karar, VideoFacts varsayılanıyla verildi: {value}."
            )
          }}
        </span>
        <span v-if="g.rules.length" class="simvd__gapRules">
          {{
            t(
              "mediaSimulator.videoDecision.gapRules",
              { rules: ruleList(g.rules) },
              "Etkilediği kural: {rules}"
            )
          }}
        </span>
        <span v-else class="simvd__gapRules">
          {{ t("mediaSimulator.videoDecision.gapNoRule", {}, "Hiçbir kural bu alana bakmıyor.") }}
        </span>
      </li>
    </ul>

    <!-- ── Künye ve hedef ────────────────────────────────────────── -->

    <details class="simvd__details">
      <summary>
        <AppIcon name="chevron-right" :size="12" />
        {{
          t(
            "mediaSimulator.videoDecision.varsTitle",
            { n: variableRows.length },
            "Künyenin {n} değişkeni"
          )
        }}
      </summary>
      <table class="simvd__table">
        <thead>
          <tr>
            <th scope="col">{{ t("mediaSimulator.videoDecision.col.var", {}, "Değişken") }}</th>
            <th scope="col">{{ t("mediaSimulator.videoDecision.col.value", {}, "Değer") }}</th>
            <th scope="col">{{ t("mediaSimulator.videoDecision.col.origin", {}, "Köken") }}</th>
            <th scope="col">{{ t("mediaSimulator.videoDecision.col.source", {}, "Nereden") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in variableRows" :key="row.name">
            <th scope="row">
              <code>{{ row.name }}</code>
            </th>
            <td class="simvd__num">{{ show(row.value) }}</td>
            <td>
              <span class="simvd__origin" :class="`simvd__origin--${row.origin}`">
                {{
                  t(
                    `mediaSimulator.videoDecision.origin.${row.origin}`,
                    {},
                    ORIGIN_FALLBACK[row.origin]
                  )
                }}
              </span>
            </td>
            <td class="simvd__muted">{{ row.spec ? row.spec.source : "—" }}</td>
          </tr>
        </tbody>
      </table>
    </details>

    <details class="simvd__details">
      <summary>
        <AppIcon name="chevron-right" :size="12" />
        {{ t("mediaSimulator.videoDecision.targetTitle", {}, "TRANSCODE hedefi ve gerekçesi") }}
      </summary>
      <dl class="simvd__spec">
        <div>
          <dt>{{ t("mediaSimulator.videoDecision.target.codec", {}, "Kodek") }}</dt>
          <dd>{{ data.target.videoCodec }} {{ data.target.profile }} {{ data.target.level }}</dd>
        </div>
        <div>
          <dt>{{ t("mediaSimulator.videoDecision.target.width", {}, "En fazla genişlik") }}</dt>
          <dd>{{ num(data.target.maxWidth) }} px</dd>
        </div>
        <div>
          <dt>{{ t("mediaSimulator.videoDecision.target.rate", {}, "Hız denetimi") }}</dt>
          <dd>{{ data.target.rateControl }} · crf {{ num(data.target.crf) }}</dd>
        </div>
        <div>
          <dt>{{ t("mediaSimulator.videoDecision.target.maxrate", {}, "Tavan / taban") }}</dt>
          <dd>{{ num(data.target.maxrateKbps) }} / {{ num(data.target.minMaxrateKbps) }} kbps</dd>
        </div>
        <div>
          <dt>{{ t("mediaSimulator.videoDecision.target.fps", {}, "Kare hızı tavanı") }}</dt>
          <dd>{{ num(data.target.frameRateCap) }} fps</dd>
        </div>
        <div>
          <dt>{{ t("mediaSimulator.videoDecision.target.audio", {}, "Ses") }}</dt>
          <dd>{{ data.target.audioCodec }} {{ num(data.target.audioBitrateKbps) }} kbps</dd>
        </div>
      </dl>
      <p v-for="(line, i) in data.target.whyH264NotVp9" :key="`w${i}`" class="simvd__meaning">
        {{ line }}
      </p>
      <p v-for="(line, i) in data.target.rateControlWhy" :key="`r${i}`" class="simvd__meaning">
        {{ line }}
      </p>
    </details>

    <!-- Künye çeviriye girmez: dosya yolu dört dilde de aynıdır. -->
    <p class="simvd__prov">
      <code>{{ data.source.tablo }}</code> · <code>{{ data.source.motor }}</code> ·
      {{ data.source.tabloDurumu }} v{{ data.source.tabloSurumu }} · {{ data.source.olcum }}
    </p>
    <p class="simvd__prov">
      {{
        t(
          "mediaSimulator.videoDecision.todayLine",
          {
            width: num(data.source.bugunkuHat.NEEDS_TRANSCODE_MAX_WIDTH),
            bitrate: num(data.source.bugunkuHat.NEEDS_TRANSCODE_MAX_BITRATE),
          },
          "Bugünkü hat iki eşikle karar veriyor: genişlik > {width} VEYA bitrate > {bitrate}."
        )
      }}
    </p>
  </section>
</template>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;
  @use "@/assets/scss/media" as media;
  @use "@/assets/scss/simulator" as sim;

  .simvd {
    @include media.surface("soft");
    padding: media.$s-4;
    border-radius: media.$r-lg;
  }

  .simvd__head {
    margin-bottom: media.$s-3;
  }

  .simvd__title {
    margin: 0;
    @include media.text("body");
    font-weight: 700;
    letter-spacing: -0.005em;
    @include media.heading;
  }

  .simvd__lead {
    margin: media.$s-05 0 0;
    @include media.text("xs");
    @include media.muted(1);
    line-height: 1.5;
  }

  .simvd__note {
    @include sim.note("info");
    @include media.text("xs");
    margin-bottom: media.$s-2;
  }

  // Ölçülmedi/varsayım: kesikli çerçeve — renk uyarıya saklanır.
  .simvd__note--unmeasured {
    @include sim.note("unmeasured");
    @include media.text("xs");
    margin-bottom: media.$s-2;
  }

  .simvd__note--bad {
    @include sim.note("bad");
    @include media.text("xs");
    margin-bottom: media.$s-2;
    font-weight: 620;
  }

  .simvd__sub {
    margin: media.$s-4 0 media.$s-2;
    @include sim.section-title;
  }

  .simvd__sub2 {
    margin: media.$s-3 0 media.$s-2;
    @include media.text("xs");
    font-weight: 700;
    @include media.heading;
  }

  // ── Künye seçimi ─────────────────────────────────────────────
  .simvd__switch {
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-1;
    margin-bottom: media.$s-2;
  }

  .simvd__switchBtn {
    @include sim.chip-button;
    @include media.text("xs");
    @include sim.mono;
  }

  .simvd__field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: media.$s-2;
    margin-bottom: media.$s-3;
    @include media.text("sm");
  }

  .simvd__select {
    @include media.field-input;
    max-width: 22rem;
  }

  .simvd__mutation {
    list-style: none;
    margin: 0 0 media.$s-2;
    padding: media.$s-2 media.$s-3;
    border: 1px dashed $l-border-alt;
    border-radius: media.$r-md;
    @include media.text("xs");
    @include media.muted(1);

    @include dark {
      border-color: $d-border;
    }

    code {
      @include sim.mono;
      font-weight: 600;
    }
  }

  // ── Karar bandı ──────────────────────────────────────────────
  .simvd__verdict {
    display: flex;
    align-items: flex-start;
    gap: media.$s-3;
    margin: 0 0 media.$s-2;
    padding: media.$s-3;
    border-radius: media.$r-md;
    background: $l-bg-muted;

    @include dark {
      background: $d-bg-elevated;
    }
  }

  .simvd__verdict--ok {
    background: rgb(16 185 129 / 8%);
  }

  .simvd__verdict--warn {
    background: rgb(245 158 11 / 9%);
  }

  .simvd__verdict--bad {
    background: rgb(239 68 68 / 8%);
  }

  .simvd__verdict--info {
    background: rgb(59 130 246 / 8%);
  }

  .simvd__verdictText {
    min-width: 0;
  }

  .simvd__reason {
    margin: 0;
    @include media.text("sm");
    font-weight: 620;
    @include media.heading;
    line-height: 1.45;
  }

  .simvd__meaning {
    margin: media.$s-1 0 0;
    @include media.text("xs");
    @include media.muted(1);
    line-height: 1.5;
  }

  .simvd__ruleRef {
    margin: media.$s-1 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: media.$s-2;
  }

  .simvd__ruleId,
  .simvd__code {
    @include sim.mono;
    @include media.text("xs");
    @include media.muted(1);
  }

  // Aksiyon rozeti — PASSTHROUGH/REMUX/TRANSCODE/REJECT.
  .simvd__action {
    @include sim.mono;
    display: inline-block;
    flex-shrink: 0;
    padding: 0.2rem 0.55rem;
    border-radius: media.$r-sm;
    @include media.text("xs");
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .simvd__action--ok {
    color: $c-success;
    background: rgb(16 185 129 / 14%);
  }

  .simvd__action--info {
    color: $c-info;
    background: rgb(59 130 246 / 13%);
  }

  .simvd__action--warn {
    color: $c-warning;
    background: rgb(245 158 11 / 15%);
  }

  .simvd__action--bad {
    color: $c-error;
    background: rgb(239 68 68 / 13%);
  }

  // ── Eşik açıklaması ──────────────────────────────────────────
  .simvd__explain {
    list-style: none;
    margin: 0 0 media.$s-2;
    padding: media.$s-2 media.$s-3;
    border-radius: media.$r-md;
    background: $l-bg-muted;
    @include media.text("xs");

    @include dark {
      background: $d-bg-elevated;
    }

    li {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: media.$s-2;
      padding: media.$s-05 0;
      @include sim.mono;
    }

    li.is-off {
      @include media.muted(2);
    }

    @for $d from 1 through 3 {
      li.simvd__explain--d#{$d} {
        padding-inline-start: media.$s-3 * $d;
      }
    }
  }

  .simvd__actual {
    font-weight: 700;
    color: $l-text-900;

    @include dark {
      color: $d-text-hi;
    }
  }

  .simvd__op {
    @include media.muted(1);
  }

  .simvd__expected {
    @include media.muted(1);
  }

  .simvd__flag {
    font-weight: 700;
  }

  li.is-ok .simvd__flag {
    color: $c-success;
  }

  li.is-off .simvd__flag {
    color: $l-text-400;

    @include dark {
      color: $d-text-faint;
    }
  }

  .simvd__notes {
    margin: 0 0 media.$s-2;
    @include media.text("xs");

    dt {
      @include media.muted(1);
      font-weight: 700;
      margin-top: media.$s-2;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 0.6875rem;
    }

    dd {
      margin: media.$s-05 0 0;
      @include media.muted(2);
      line-height: 1.5;
    }
  }

  // ── Kural izi tablosu ────────────────────────────────────────
  .simvd__table {
    @include sim.data-table;
    margin-bottom: media.$s-2;
  }

  .simvd__caption {
    @include media.text("xs");
    @include media.muted(1);
    text-align: start;
    padding-bottom: media.$s-1;
  }

  .simvd__table tbody tr.is-hit {
    background: rgb(16 185 129 / 8%);
  }

  .simvd__table tbody tr.is-skipped th,
  .simvd__table tbody tr.is-skipped td {
    @include media.muted(2);
  }

  .simvd__table th code {
    @include sim.mono;
    @include media.text("xs");
  }

  // Kural hücresi: insan dilinde ad üstte, kimlik kodu altta soluk.
  .simvd__ruleName {
    display: block;
    font-weight: 620;
    line-height: 1.35;
  }

  .simvd__ruleCode {
    display: block;
    margin-top: 1px;
    @include media.muted(2);
    font-weight: 400;
  }

  .simvd__ruleRefName {
    @include media.text("xs");
    font-weight: 620;
    @include media.muted(1);
  }

  .simvd__thresholds {
    @include sim.mono;
    @include media.text("xs");
    @include media.muted(1);

    span {
      display: block;
      padding: 1px 0;
    }

    code {
      color: $l-text-700;

      @include dark {
        color: $d-text;
      }
    }
  }

  .simvd__assumed {
    display: inline-block;
    margin-inline-start: media.$s-1;
    padding: 0.05rem 0.3rem;
    border: 1px dashed $c-warning;
    border-radius: media.$r-sm;
    color: $c-warning;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    vertical-align: 0.1em;
  }

  .simvd__ok {
    @include media.chip("success");
  }

  .simvd__muted {
    @include media.muted(2);
    @include media.text("xs");
  }

  // ── Kapılar / spec ızgarası ──────────────────────────────────
  .simvd__spec {
    @include sim.kpi-grid(7.5rem);
    margin: 0 0 media.$s-2;

    > div {
      @include sim.kpi;

      dd {
        font-size: 0.9375rem;
      }
    }
  }

  // ── Vendor'lanmayan alanlar ──────────────────────────────────
  .simvd__gaps {
    list-style: none;
    margin: 0 0 media.$s-2;
    padding: 0;

    li {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: media.$s-2 0;
      @include media.text("xs");
      @include media.divider(bottom);

      &:last-child {
        border-bottom: 0;
      }
    }
  }

  .simvd__gapHead {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: media.$s-2;
  }

  .simvd__gapName {
    @include media.text("sm");
    font-weight: 620;
    @include media.heading;
  }

  .simvd__gapCode {
    @include sim.mono;
    @include media.muted(2);
  }

  .simvd__bad {
    display: inline-block;
    padding: 0.05rem 0.35rem;
    border: 1px dashed $c-warning;
    border-radius: media.$r-sm;
    color: $c-warning;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .simvd__gapValue,
  .simvd__gapRules {
    @include media.muted(2);
  }

  .simvd__origin {
    display: inline-block;
    padding: 0.05rem 0.4rem;
    border-radius: media.$r-pill;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    background: $l-bg-muted;
    color: $l-text-600;

    @include dark {
      background: $d-bg-elevated;
      color: $d-text-muted;
    }
  }

  .simvd__origin--measured {
    color: $c-success;
    background: rgb(16 185 129 / 12%);
  }

  .simvd__origin--synthetic {
    color: $c-info;
    background: rgb(59 130 246 / 12%);
  }

  .simvd__origin--unvendored {
    color: $c-warning;
    background: transparent;
    border: 1px dashed $c-warning;
  }

  .simvd__num {
    @include sim.mono;
  }

  // ── Katlanır bölümler ve künye satırı ────────────────────────
  .simvd__details {
    @include sim.disclosure;

    summary svg {
      color: $l-text-500;
      transition: transform 150ms $ease-out;

      @include dark {
        color: $d-text-muted;
      }
    }

    &[open] > summary svg {
      transform: rotate(90deg);
    }

    .simvd__table {
      margin-top: media.$s-2;
    }

    .simvd__spec {
      margin-top: media.$s-2;
    }
  }

  .simvd__prov {
    margin: media.$s-3 0 0;
    @include media.text("xs");
    @include media.muted(2);
    word-break: break-word;
    line-height: 1.55;

    code {
      @include sim.mono;
    }
  }
</style>
