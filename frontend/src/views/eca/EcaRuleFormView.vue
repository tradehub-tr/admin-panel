<template>
  <div class="eca-form-view">
    <header class="eca-form-header">
      <button class="back-btn" @click="goBack">
        <AppIcon name="arrow-left" :size="16" />
        {{ t("ecaRuleForm.back") }}
      </button>
      <div>
        <h1 class="eca-form-title">
          {{ isNew ? t("ecaRuleForm.newRule") : t("ecaRuleForm.editRule") }}
        </h1>
        <p class="eca-form-subtitle">
          {{ isSellerMode ? t("ecaRuleForm.subtitleSeller") : t("ecaRuleForm.subtitleAdmin") }}
        </p>
      </div>
    </header>

    <div v-if="loadingDoc" class="eca-loading">{{ t("ecaRuleForm.loading") }}</div>

    <!-- ── SATICI: Hazır şablon galerisi (yalnızca yeni kural) ─────────────── -->
    <section v-else-if="isSellerMode && showTemplatePicker" class="wiz-card">
      <h2 class="wiz-card-title">{{ t("ecaWizard.templatePickerTitle") }}</h2>
      <p class="wiz-card-desc">{{ t("ecaWizard.templatePickerDesc") }}</p>
      <div class="tpl-grid">
        <button
          v-for="tpl in RULE_TEMPLATES"
          :key="tpl.id"
          type="button"
          class="tpl"
          :class="{ sel: selectedTemplateId === tpl.id }"
          @click="selectedTemplateId = tpl.id"
        >
          <span class="tpl-ic"><AppIcon :name="tpl.icon" :size="18" /></span>
          <span class="tpl-body">
            <span class="tpl-tt">{{ t(tpl.titleKey) }}</span>
            <span class="tpl-td">{{ t(tpl.descKey) }}</span>
          </span>
        </button>
      </div>
      <div class="wiz-actions">
        <button type="button" class="btn-primary" :disabled="!selectedTemplateId" @click="applyTemplate">
          {{ t("ecaWizard.continue") }}
        </button>
        <button type="button" class="btn-outline" @click="startFromScratch">
          {{ t("ecaWizard.fromScratch") }}
        </button>
      </div>
    </section>

    <!-- ── SATICI: Sihirbaz ────────────────────────────────────────────────── -->
    <form v-else-if="isSellerMode" class="wiz-card" @submit.prevent="onWizardSubmit">
      <div class="field">
        <label>{{ t("ecaWizard.ruleNameLabel") }}</label>
        <input
          v-model="form.rule_name"
          type="text"
          class="field-input"
          :placeholder="t('ecaWizard.ruleNamePlaceholder')"
          required
        />
      </div>

      <!-- Adım 1: Hangi ürünlere -->
      <div class="stepbox">
        <div class="step-title">
          <span class="stepnum">1</span>
          {{ t("ecaWizard.step1Title") }}
        </div>
        <p class="step-hint">{{ t("ecaWizard.step1Hint") }}</p>

        <div class="cond-match">
          <button
            type="button"
            class="seg"
            :class="{ on: matchMode === 'all' }"
            @click="matchMode = 'all'"
          >
            {{ t("ecaWizard.matchAll") }}
          </button>
          <button
            type="button"
            class="seg"
            :class="{ on: matchMode === 'any' }"
            @click="matchMode = 'any'"
          >
            {{ t("ecaWizard.matchAny") }}
          </button>
        </div>

        <div v-for="(row, idx) in conditionRows" :key="row.uid" class="cond-row">
          <select class="field-input" :value="row.field" @change="onFieldChange(row, $event.target.value)">
            <option v-for="f in schema.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
          </select>
          <select v-model="row.op" class="field-input">
            <option v-for="op in operatorsFor(row.field)" :key="op" :value="op">
              {{ t("conditionBuilder.op." + op) }}
            </option>
          </select>
          <component
            :is="valueInputTag(row.field)"
            v-if="!isNoValueOp(row.op)"
            v-model="row.value"
            class="field-input"
            :type="valueInputType(row.field)"
            :placeholder="t('ecaWizard.valuePlaceholder')"
          >
            <template v-if="valueInputTag(row.field) === 'select'">
              <option value="">{{ t("conditionBuilder.selectValue") }}</option>
              <option v-for="opt in valueOptions(row.field)" :key="optKey(opt)" :value="optValue(opt)">
                {{ optLabel(opt) }}
              </option>
            </template>
          </component>
          <span v-else class="cond-novalue">—</span>
          <button
            type="button"
            class="cond-remove"
            :title="t('conditionBuilder.remove')"
            @click="removeCondition(idx)"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </div>

        <button type="button" class="add-cond" @click="addCondition">
          <AppIcon name="plus" :size="14" />
          {{ t("ecaWizard.addCondition") }}
        </button>

        <div class="preview" :class="{ 'is-error': !!countResult.error }">
          <AppIcon :name="countResult.error ? 'alert-circle' : 'check-circle-2'" :size="17" />
          <span v-if="countResult.error">{{ countResult.error }}</span>
          <span v-else-if="countLoading">{{ t("ecaWizard.countLoading") }}</span>
          <span v-else>{{ countMatchText }}</span>
        </div>
      </div>

      <!-- Adım 2: Ne yapılsın -->
      <div class="stepbox">
        <div class="step-title">
          <span class="stepnum">2</span>
          {{ t("ecaWizard.step2Title") }}
        </div>
        <p class="step-hint">{{ t("ecaWizard.step2Hint") }}</p>

        <div class="action-row">
          <select v-model="selectedAction" class="field-input action-select">
            <option v-for="a in schema.actions" :key="a.key" :value="a.key">{{ a.label }}</option>
          </select>

          <!-- Parametre UI — eylem tipine göre cascade -->
          <div v-if="activeActionParams.length" class="action-params">
            <template v-for="p in activeActionParams" :key="p.key">
              <span v-if="p.type === 'number'" class="param-pct">
                %<input v-model.number="actionParams[p.key]" type="number" class="field-input pct-input" />
                {{ t("ecaWizard.percentSuffix") }}
              </span>
              <select
                v-else-if="p.type === 'writable_field'"
                v-model="actionParams[p.key]"
                class="field-input"
              >
                <option value="">{{ t("ecaWizard.selectField") }}</option>
                <option v-for="wf in schema.writable_fields" :key="wf.key" :value="wf.key">
                  {{ wf.label }}
                </option>
              </select>
              <input
                v-else
                v-model="actionParams[p.key]"
                type="text"
                class="field-input"
                :placeholder="p.label"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- Toplu yüklemede de uygula -->
      <label class="bulk-toggle">
        <BaseSwitch v-model="form.bulk_import" :on-value="true" :off-value="false" />
        <span>{{ t("ecaWizard.bulkImportToggle") }}</span>
      </label>

      <!-- Gelişmiş: teknik karşılık (salt-okunur) -->
      <details class="adv">
        <summary>{{ t("ecaWizard.advancedSummary") }}</summary>
        <p class="adv-hint">{{ t("ecaWizard.advancedHint") }}</p>
        <code class="adv-code">{{ advancedExpression }}</code>
      </details>

      <div class="wiz-actions">
        <button type="submit" class="btn-primary" :disabled="saving">
          <AppIcon name="check" :size="15" />
          {{ saving ? t("ecaRuleForm.saving") : t("ecaWizard.saveRule") }}
        </button>
        <button type="button" class="btn-outline" @click="goBack">
          {{ t("ecaRuleForm.cancel") }}
        </button>
      </div>
    </form>

    <!-- ── ADMIN: Sihirbaz (Seçenek 3) ─────────────────────────────────────── -->
    <form v-else class="wiz-card" @submit.prevent="onAdminWizardSubmit">
      <div class="field">
        <label>{{ t("ecaWizard.ruleNameLabel") }}</label>
        <input
          v-model="form.rule_name"
          type="text"
          class="field-input"
          :placeholder="t('ecaWizard.ruleNamePlaceholder')"
          required
        />
      </div>

      <!-- Adım 1: Kime? -->
      <div class="stepbox">
        <div class="step-title">
          <span class="stepnum">1</span>
          {{ t("ecaAdminWizard.step1Title") }}
        </div>
        <p class="step-hint">{{ t("ecaAdminWizard.step1Hint") }}</p>

        <div class="cond-match">
          <button
            type="button"
            class="seg"
            :class="{ on: form.rule_scope === 'Platform' }"
            @click="setScope('Platform')"
          >
            {{ t("ecaAdminWizard.scopePlatform") }}
          </button>
          <button
            type="button"
            class="seg"
            :class="{ on: form.rule_scope === 'Per-Seller' }"
            @click="setScope('Per-Seller')"
          >
            {{ t("ecaAdminWizard.scopePerSeller") }}
          </button>
        </div>

        <div v-if="form.rule_scope === 'Per-Seller'" class="seller-pick">
          <input
            v-model="sellerSearch"
            type="text"
            class="field-input"
            :placeholder="t('ecaAdminWizard.sellerSearchPlaceholder')"
          />
          <select v-model="form.seller_profile" class="field-input">
            <option value="">{{ t("ecaRuleForm.selectSeller") }}</option>
            <option v-for="s in filteredSellers" :key="s.key" :value="s.key">
              {{ s.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Adım 2: Hangi ürünlerde? -->
      <div class="stepbox">
        <div class="step-title">
          <span class="stepnum">2</span>
          {{ t("ecaAdminWizard.step2Title") }}
        </div>
        <p class="step-hint">{{ t("ecaAdminWizard.step2Hint") }}</p>

        <div class="cond-match">
          <button
            type="button"
            class="seg"
            :class="{ on: matchMode === 'all' }"
            @click="matchMode = 'all'"
          >
            {{ t("ecaWizard.matchAll") }}
          </button>
          <button
            type="button"
            class="seg"
            :class="{ on: matchMode === 'any' }"
            @click="matchMode = 'any'"
          >
            {{ t("ecaWizard.matchAny") }}
          </button>
        </div>

        <div v-for="(row, idx) in conditionRows" :key="row.uid" class="cond-row">
          <select class="field-input" :value="row.field" @change="onFieldChange(row, $event.target.value)">
            <option v-for="f in schema.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
          </select>
          <select v-model="row.op" class="field-input">
            <option v-for="op in operatorsFor(row.field)" :key="op" :value="op">
              {{ t("conditionBuilder.op." + op) }}
            </option>
          </select>
          <component
            :is="valueInputTag(row.field)"
            v-if="!isNoValueOp(row.op)"
            v-model="row.value"
            class="field-input"
            :type="valueInputType(row.field)"
            :placeholder="t('ecaWizard.valuePlaceholder')"
          >
            <template v-if="valueInputTag(row.field) === 'select'">
              <option value="">{{ t("conditionBuilder.selectValue") }}</option>
              <option v-for="opt in valueOptions(row.field)" :key="optKey(opt)" :value="optValue(opt)">
                {{ optLabel(opt) }}
              </option>
            </template>
          </component>
          <span v-else class="cond-novalue">—</span>
          <button
            type="button"
            class="cond-remove"
            :title="t('conditionBuilder.remove')"
            @click="removeCondition(idx)"
          >
            <AppIcon name="x" :size="14" />
          </button>
        </div>

        <button type="button" class="add-cond" @click="addCondition">
          <AppIcon name="plus" :size="14" />
          {{ t("ecaWizard.addCondition") }}
        </button>

        <div class="preview" :class="{ 'is-error': !!countResult.error }">
          <AppIcon :name="countResult.error ? 'alert-circle' : 'check-circle-2'" :size="17" />
          <span v-if="countResult.error">{{ countResult.error }}</span>
          <span v-else-if="countLoading">{{ t("ecaWizard.countLoading") }}</span>
          <span v-else>{{ countMatchText }}</span>
        </div>
      </div>

      <!-- Adım 3: Ne yapılsın? — genişletilmiş izgara -->
      <div class="stepbox">
        <div class="step-title">
          <span class="stepnum">3</span>
          {{ t("ecaAdminWizard.step3Title") }}
        </div>
        <p class="step-hint">{{ t("ecaAdminWizard.step3Hint") }}</p>

        <div class="act-grid">
          <button
            v-for="a in schema.actions"
            :key="a.key"
            type="button"
            class="act"
            :class="{ sel: selectedAction === a.key, gated: a.gated }"
            @click="selectAction(a.key)"
          >
            <span class="act-ic"><AppIcon :name="actionIcon(a.key)" :size="14" /></span>
            <span class="act-body">
              <span class="act-tt">
                {{ a.label }}
                <span v-if="a.gated" class="badge gated">{{ t("ecaAdminWizard.badgeGated") }}</span>
                <span v-else-if="isAdminOnlyAction(a.key)" class="badge admin">
                  {{ t("ecaAdminWizard.badgeAdmin") }}
                </span>
              </span>
              <span v-if="a.gated" class="act-td">{{ t("ecaAdminWizard.gatedHint") }}</span>
            </span>
          </button>
        </div>

        <!-- Seçilen eylemin parametreleri -->
        <div v-if="activeActionParams.length" class="action-params">
          <template v-for="p in activeActionParams" :key="p.key">
            <span v-if="p.type === 'number'" class="param-field">
              <label>{{ p.label }}</label>
              <input v-model.number="actionParams[p.key]" type="number" class="field-input" />
            </span>
            <span v-else-if="p.type === 'writable_field'" class="param-field">
              <label>{{ p.label }}</label>
              <select v-model="actionParams[p.key]" class="field-input">
                <option value="">{{ t("ecaWizard.selectField") }}</option>
                <option v-for="wf in schema.writable_fields" :key="wf.key" :value="wf.key">
                  {{ wf.label }}
                </option>
              </select>
            </span>
            <span
              v-else-if="p.value_source && p.value_source.kind === 'enum'"
              class="param-field"
            >
              <label>{{ p.label }}</label>
              <select v-model="actionParams[p.key]" class="field-input">
                <option value="">{{ t("conditionBuilder.selectValue") }}</option>
                <option v-for="opt in p.value_source.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </span>
            <span
              v-else-if="p.value_source && p.value_source.kind === 'doctype'"
              class="param-field"
            >
              <label>{{ p.label }}</label>
              <select v-model="actionParams[p.key]" class="field-input">
                <option value="">{{ t("conditionBuilder.selectValue") }}</option>
                <option
                  v-for="opt in paramDoctypeOptions(p.value_source.doctype)"
                  :key="optKey(opt)"
                  :value="optValue(opt)"
                >
                  {{ optLabel(opt) }}
                </option>
              </select>
            </span>
            <!-- create_document: curated "kayıt türü" (Türkçe label; "DocType" yok) -->
            <span
              v-else-if="p.value_source && p.value_source.kind === 'creatable_doctype'"
              class="param-field"
            >
              <label>{{ p.label }}</label>
              <select
                v-model="actionParams[p.key]"
                class="field-input"
                @change="onCreatableDoctypeChange"
              >
                <option value="">{{ t("conditionBuilder.selectValue") }}</option>
                <option v-for="opt in p.value_source.options" :key="opt.key" :value="opt.key">
                  {{ opt.label }}
                </option>
              </select>
            </span>
            <!-- create_document: tıklama satır eşlemesi (hedef alan ← değer); JSON yok -->
            <span
              v-else-if="p.value_source && p.value_source.kind === 'field_map'"
              class="param-field wide"
            >
              <label>{{ p.label }}</label>
              <div v-if="!actionParams.doctype" class="map-empty">
                {{ t("ecaAdminWizard.fieldMapPickType") }}
              </div>
              <template v-else>
                <div v-for="(row, mi) in fieldMapRows" :key="mi" class="map-row">
                  <select v-model="row.target" class="field-input">
                    <option value="">{{ t("ecaWizard.selectField") }}</option>
                    <option v-for="tf in targetFields" :key="tf.value" :value="tf.value">
                      {{ tf.label }}
                    </option>
                  </select>
                  <span class="map-arrow">←</span>
                  <input
                    v-model="row.value"
                    type="text"
                    class="field-input"
                    :placeholder="t('ecaAdminWizard.fieldMapValuePlaceholder')"
                  />
                  <button
                    type="button"
                    class="cond-remove"
                    :title="t('conditionBuilder.remove')"
                    @click="removeFieldMapRow(mi)"
                  >
                    <AppIcon name="x" :size="14" />
                  </button>
                </div>
                <button type="button" class="add-cond" @click="addFieldMapRow">
                  <AppIcon name="plus" :size="14" />
                  {{ t("ecaAdminWizard.fieldMapAddRow") }}
                </button>
              </template>
            </span>
            <span v-else class="param-field" :class="{ wide: p.type === 'text' }">
              <label>{{ p.label }}</label>
              <textarea
                v-if="selectedAction === 'custom_script' && p.key === 'script'"
                v-model="actionParams[p.key]"
                class="field-input mono"
                rows="5"
                spellcheck="false"
              ></textarea>
              <input v-else v-model="actionParams[p.key]" type="text" class="field-input" />
            </span>
          </template>
        </div>
      </div>

      <!-- Toplu yüklemede de uygula -->
      <label class="bulk-toggle">
        <BaseSwitch v-model="form.bulk_import" :on-value="true" :off-value="false" />
        <span>{{ t("ecaWizard.bulkImportToggle") }}</span>
      </label>

      <!-- Dry-run önizleme -->
      <div class="dryrun">
        <button type="button" class="btn-outline" :disabled="previewLoading" @click="onPreview">
          <AppIcon name="check-circle-2" :size="15" />
          {{ previewLoading ? t("ecaAdminWizard.previewLoading") : t("ecaAdminWizard.previewBtn") }}
        </button>

        <div v-if="previewResult" class="dryrun-result" :class="{ 'is-error': !!previewResult.error }">
          <p v-if="previewResult.error" class="dryrun-err">{{ previewResult.error }}</p>
          <template v-else>
            <p class="dryrun-summary">
              {{ t("ecaAdminWizard.previewSummary", { count: previewResult.count }) }}
            </p>
            <table v-if="previewResult.samples.length" class="dryrun-table">
              <thead>
                <tr>
                  <th>{{ t("ecaAdminWizard.colSku") }}</th>
                  <th>{{ t("ecaAdminWizard.colField") }}</th>
                  <th>{{ t("ecaAdminWizard.colOld") }}</th>
                  <th>{{ t("ecaAdminWizard.colNew") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in previewResult.samples" :key="i">
                  <td>{{ s.sku || "—" }}</td>
                  <td>{{ s.field }}</td>
                  <td class="dryrun-old">{{ formatCell(s.old) }}</td>
                  <td class="dryrun-new">{{ formatCell(s.new) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="dryrun-empty">{{ t("ecaAdminWizard.previewNoSamples") }}</p>
          </template>
        </div>
      </div>

      <!-- Örnek üründe test (tek SKU) -->
      <div class="gov-box">
        <div class="gov-title">
          <AppIcon name="flask-conical" :size="15" />
          {{ t("ecaGovernance.testTitle") }}
        </div>
        <p class="gov-hint">{{ t("ecaGovernance.testHint") }}</p>
        <div class="gov-test-row">
          <input
            v-model="testSku"
            type="text"
            class="field-input"
            :placeholder="t('ecaGovernance.testSkuPlaceholder')"
            @keyup.enter="onTestProduct"
          />
          <button type="button" class="btn-outline" :disabled="testLoading" @click="onTestProduct">
            {{ testLoading ? t("ecaGovernance.testLoading") : t("ecaGovernance.testBtn") }}
          </button>
        </div>

        <div v-if="testResult" class="gov-test-result" :class="{ 'is-error': !!testResult.error }">
          <p v-if="testResult.error" class="dryrun-err">{{ testResult.error }}</p>
          <p v-else-if="!testResult.found" class="dryrun-empty">
            {{ t("ecaGovernance.testNotFound") }}
          </p>
          <template v-else>
            <p class="gov-test-verdict" :class="{ match: testResult.matches }">
              <AppIcon :name="testResult.matches ? 'check-circle-2' : 'x-circle'" :size="16" />
              {{ testResult.matches ? t("ecaGovernance.testMatches") : t("ecaGovernance.testNoMatch") }}
            </p>
            <table v-if="testResult.matches && testResult.samples.length" class="dryrun-table">
              <thead>
                <tr>
                  <th>{{ t("ecaAdminWizard.colField") }}</th>
                  <th>{{ t("ecaAdminWizard.colOld") }}</th>
                  <th>{{ t("ecaAdminWizard.colNew") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in testResult.samples" :key="i">
                  <td>{{ s.field }}</td>
                  <td class="dryrun-old">{{ formatCell(s.old) }}</td>
                  <td class="dryrun-new">{{ formatCell(s.new) }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>
      </div>

      <!-- Versiyon geçmişi (yalnız düzenleme) -->
      <details v-if="!isNew" class="adv">
        <summary>{{ t("ecaGovernance.versionsTitle") }}</summary>
        <p v-if="versionsLoading" class="adv-hint">{{ t("ecaRuleForm.loading") }}</p>
        <p v-else-if="!versions.length" class="adv-hint">{{ t("ecaGovernance.versionsEmpty") }}</p>
        <ul v-else class="gov-versions">
          <li v-for="v in versions" :key="v.version" class="gov-version">
            <div class="gov-version-head">
              <span class="gov-version-meta">{{ v.modified }} · {{ v.modified_by }}</span>
              <button type="button" class="gov-restore" @click="onRestoreVersion(v.version)">
                <AppIcon name="rotate-ccw" :size="13" />
                {{ t("ecaGovernance.restoreBtn") }}
              </button>
            </div>
            <ul v-if="v.changes.length" class="gov-changes">
              <li v-for="(c, ci) in v.changes" :key="ci">
                <code>{{ c.field }}</code>: {{ formatCell(c.old) }} → {{ formatCell(c.new) }}
              </li>
            </ul>
            <p v-else class="gov-nochange">{{ t("ecaGovernance.versionsNoChange") }}</p>
          </li>
        </ul>
      </details>

      <!-- Çakışma uyarısı (engelleme değil) -->
      <div v-if="conflicts.length" class="gov-conflict">
        <div class="gov-conflict-head">
          <AppIcon name="alert-triangle" :size="16" />
          {{ t("ecaGovernance.conflictTitle", { count: conflicts.length }) }}
        </div>
        <ul class="gov-conflict-list">
          <li v-for="c in conflicts" :key="c.rule">
            <span class="gov-conflict-name">{{ c.rule_name }}</span>
            <span class="gov-conflict-reason">{{ c.reason }}</span>
            <span v-if="c.priority != null" class="gov-conflict-prio">
              {{ t("ecaGovernance.conflictPriority", { priority: c.priority }) }}
            </span>
          </li>
        </ul>
        <p class="gov-conflict-note">{{ t("ecaGovernance.conflictNote") }}</p>
      </div>

      <!-- Gelişmiş: event/priority (salt-okunur / düzenlenebilir) -->
      <details class="adv">
        <summary>{{ t("ecaAdminWizard.advancedSummary") }}</summary>
        <div class="adv-grid">
          <div class="field">
            <label>{{ t("ecaRuleForm.event") }}</label>
            <select v-model="form.event" class="field-input">
              <option value="before_save">{{ t("ecaRuleForm.eventBeforeSave") }}</option>
              <option value="after_insert">{{ t("ecaRuleForm.eventAfterInsert") }}</option>
              <option value="on_update">{{ t("ecaRuleForm.eventOnUpdate") }}</option>
              <option value="on_submit">{{ t("ecaRuleForm.eventOnSubmit") }}</option>
              <option value="on_cancel">{{ t("ecaRuleForm.eventOnCancel") }}</option>
            </select>
          </div>
          <div class="field">
            <label>{{ priorityLabel }}</label>
            <input
              v-model.number="form.priority"
              type="number"
              class="field-input"
              :min="priorityMin"
              :max="priorityMax"
            />
            <p class="field-hint">{{ t("ecaRuleForm.priorityHintBase") }}</p>
          </div>
        </div>
        <code class="adv-code">{{ advancedExpression }}</code>
      </details>

      <div class="wiz-actions">
        <button type="submit" class="btn-primary" :disabled="saving">
          <AppIcon name="check" :size="15" />
          {{ saving ? t("ecaRuleForm.saving") : t("ecaWizard.saveRule") }}
        </button>
        <button type="button" class="btn-outline" @click="goBack">
          {{ t("ecaRuleForm.cancel") }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
  import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useRoute, useRouter } from "vue-router";
  import { storeToRefs } from "pinia";
  import api from "@/utils/api";
  import AppIcon from "@/components/common/AppIcon.vue";
  import BaseSwitch from "@/components/common/BaseSwitch.vue";
  import { useAuthStore } from "@/stores/auth";
  import { useEcaRule } from "@/composables/useEcaRule";
  import { useToast } from "@/composables/useToast";

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const authStore = useAuthStore();
  const { isAdmin } = storeToRefs(authStore);

  const {
    getRule,
    getRuleSchema,
    countMatching,
    previewRuleEffect,
    detectConflicts,
    testOnProduct,
    getVersions,
    restoreVersion,
    saveWizardRule,
  } = useEcaRule();

  const ruleName = computed(() => {
    const raw = route.params.name;
    return raw && raw !== "new" ? String(raw) : null;
  });
  const isNew = computed(() => ruleName.value === null);

  // Satıcı modu: route /my-eca-rules altında, isAdmin false veya route path my-eca-rules ile başlıyorsa.
  const isSellerMode = computed(() => {
    return route.path.startsWith("/my-eca-rules") || !isAdmin.value;
  });

  // ── Hazır şablonlar (sözleşme §3 — 4 senaryo) ──────────────────────────────
  const RULE_TEMPLATES = [
    {
      id: "brand_discount",
      icon: "percent",
      titleKey: "ecaWizard.tplBrandDiscountTitle",
      descKey: "ecaWizard.tplBrandDiscountDesc",
      match: "all",
      conditions: [{ field: "brand", op: "eq", value: "" }],
      action: "discount_price",
      params: { percent: 15 },
      bulk_import: false,
    },
    {
      id: "low_stock",
      icon: "alert-triangle",
      titleKey: "ecaWizard.tplLowStockTitle",
      descKey: "ecaWizard.tplLowStockDesc",
      match: "all",
      conditions: [{ field: "stock_qty", op: "lte", value: 10 }],
      action: "email",
      params: { note: "" },
      bulk_import: false,
    },
    {
      id: "reject_row",
      icon: "ban",
      titleKey: "ecaWizard.tplRejectRowTitle",
      descKey: "ecaWizard.tplRejectRowDesc",
      match: "all",
      conditions: [{ field: "base_price", op: "is_empty", value: "" }],
      action: "reject_row",
      params: {},
      bulk_import: true,
    },
    {
      id: "fill_field",
      icon: "edit-3",
      titleKey: "ecaWizard.tplFillFieldTitle",
      descKey: "ecaWizard.tplFillFieldDesc",
      match: "all",
      conditions: [{ field: "currency", op: "is_empty", value: "" }],
      action: "set_field",
      params: { field: "currency", value: "TRY" },
      bulk_import: true,
    },
  ];

  // ── Admin mod state ─────────────────────────────────────────────────────────
  const priorityMin = 1;
  const priorityMax = 99999;
  const priorityLabel = computed(() => t("ecaRuleForm.priorityLabelAdmin"));

  const form = reactive({
    rule_name: "",
    event: "before_save",
    rule_scope: "Per-Seller",
    seller_profile: "",
    owner_role: "Seller",
    priority: 500,
    bulk_import: true,
  });

  const loadingDoc = ref(false);
  const saving = ref(false);

  function onScopeChange() {
    form.owner_role = "Marketplace Admin";
    if (form.rule_scope === "Platform" && form.priority < 1000) form.priority = 1000;
  }

  function goBack() {
    router.push(isSellerMode.value ? "/my-eca-rules" : "/eca-rules");
  }

  // ── SİHİRBAZ state (satıcı modu) ───────────────────────────────────────────
  const schema = reactive({ fields: [], actions: [], writable_fields: [] });
  const showTemplatePicker = ref(false);
  const selectedTemplateId = ref("");

  const matchMode = ref("all");
  let condUid = 0;
  const conditionRows = ref([]);

  const selectedAction = ref("discount_price");
  const actionParams = reactive({});

  // ── Admin sihirbazı: "Kime?" + eylem izgarası + dry-run ─────────────────────
  const adminSellers = ref([]); // schema.sellers — {key, label}
  const sellerSearch = ref("");
  const filteredSellers = computed(() => {
    const q = sellerSearch.value.trim().toLocaleLowerCase("tr");
    if (!q) return adminSellers.value;
    return adminSellers.value.filter((s) => s.label.toLocaleLowerCase("tr").includes(q));
  });

  // Admin'e özel (satıcının yapamadığı) eylemler — rozet için.
  const ADMIN_ONLY_ACTIONS = new Set(["webhook", "create_document"]);
  const isAdminOnlyAction = (key) => ADMIN_ONLY_ACTIONS.has(key);

  // Eylem ikonları (lucide) — şema anahtarına göre.
  const ACTION_ICONS = {
    discount_price: "trending-down",
    markup_price: "trending-up",
    set_field: "edit-3",
    add_tag: "tag",
    set_status: "toggle-right",
    set_category: "folder-tree",
    set_stock: "boxes",
    email: "mail",
    reject_row: "ban",
    webhook: "webhook",
    create_document: "file-plus",
    custom_script: "terminal",
  };
  const actionIcon = (key) => ACTION_ICONS[key] || "circle";

  // create_document/set_category gibi doctype param seçenekleri (cache reuse).
  const paramDoctypeOptions = (doctype) => linkOptions[doctype] || [];

  function selectAction(key) {
    selectedAction.value = key;
    // doctype tipli paramlar için seçenekleri önceden yükle.
    const act = schema.actions.find((a) => a.key === key);
    for (const p of act?.params || []) {
      if (p.value_source?.kind === "doctype") loadLinkOptions(p.value_source.doctype);
    }
    // create_document seçilince alan eşleme satırlarını sıfırla (kayıt türü henüz seçilmedi).
    if (key === "create_document") {
      fieldMapRows.value = [{ target: "", value: "" }];
      targetFields.value = [];
    }
  }

  function setScope(scope) {
    form.rule_scope = scope;
    if (scope === "Platform") form.seller_profile = "";
    onScopeChange();
  }

  // ── create_document Karar1=A: kayıt türü + tıklama alan eşlemesi ──────────────
  // Hedef alanlar seçilen "kayıt türü"ne bağlı (backend get_doctype_target_fields);
  // alan eşleme satırları actionParams.mappings'e (list of {target, value}) yansır.
  const targetFields = ref([]);
  const fieldMapRows = ref([{ target: "", value: "" }]);

  function addFieldMapRow() {
    fieldMapRows.value.push({ target: "", value: "" });
  }
  function removeFieldMapRow(idx) {
    fieldMapRows.value.splice(idx, 1);
    if (!fieldMapRows.value.length) fieldMapRows.value.push({ target: "", value: "" });
  }

  async function loadTargetFields(doctype) {
    targetFields.value = [];
    if (!doctype) return;
    try {
      const res = await api.callMethodGET(
        "tradehub_core.eca.api.get_doctype_target_fields",
        { doctype }
      );
      targetFields.value = res.message || [];
    } catch {
      targetFields.value = [];
    }
  }

  async function onCreatableDoctypeChange() {
    // Kayıt türü değişince hedef alanları yenile + eski eşleme satırlarını sıfırla.
    fieldMapRows.value = [{ target: "", value: "" }];
    await loadTargetFields(actionParams.doctype);
  }

  // Eşleme satırlarını backend payload'una çevir (boş satırlar atlanır).
  function buildFieldMappings() {
    return fieldMapRows.value
      .map((r) => ({ target: (r.target || "").trim(), value: (r.value ?? "").toString().trim() }))
      .filter((r) => r.target && r.value);
  }

  // Eyleme gönderilecek parametreler — create_document'ta tıklama eşleme satırları
  // actionParams.mappings'e (list of {target, value}) enjekte edilir; aksi halde ham.
  function currentActionParams() {
    if (selectedAction.value === "create_document") {
      return { ...actionParams, mappings: buildFieldMappings() };
    }
    return { ...actionParams };
  }

  const fieldDef = (key) => schema.fields.find((f) => f.key === key);
  const operatorsFor = (key) => fieldDef(key)?.operators || [];
  const NO_VALUE_OPS = new Set(["is_set", "is_empty"]);
  const isNoValueOp = (op) => NO_VALUE_OPS.has(op);

  const valueInputTag = (key) => {
    const kind = fieldDef(key)?.value_source?.kind;
    return kind === "enum" || kind === "doctype" || kind === "bool" ? "select" : "input";
  };
  const valueInputType = (key) => (fieldDef(key)?.type === "number" ? "number" : "text");

  // Link/doctype değer seçenekleri — doctype başına cache.
  const linkOptions = reactive({});
  const valueOptions = (key) => {
    const src = fieldDef(key)?.value_source;
    if (!src) return [];
    if (src.kind === "enum") return src.options || [];
    if (src.kind === "bool") return [{ v: "1", l: t("ecaWizard.yes") }, { v: "0", l: t("ecaWizard.no") }];
    if (src.kind === "doctype") return linkOptions[src.doctype] || [];
    return [];
  };
  const optKey = (opt) => (typeof opt === "object" ? opt.v : opt);
  const optValue = (opt) => (typeof opt === "object" ? opt.v : opt);
  const optLabel = (opt) => (typeof opt === "object" ? opt.l : opt);

  async function loadLinkOptions(doctype) {
    if (!doctype || linkOptions[doctype]) return;
    try {
      // Okunur ad (title_field) ile {v: name, l: display} döner — UUID name gösterilmez.
      const res = await api.callMethodGET("tradehub_core.eca.api.get_link_options", { doctype });
      linkOptions[doctype] = res.message || [];
    } catch {
      linkOptions[doctype] = [];
    }
  }

  function makeRow(field, op, value) {
    const def = field ? fieldDef(field) : schema.fields[0];
    const f = def?.key || "base_price";
    const o = op || (def?.operators?.[0] ?? "gt");
    if (def?.value_source?.kind === "doctype") loadLinkOptions(def.value_source.doctype);
    return { uid: ++condUid, field: f, op: o, value: value ?? "" };
  }

  function addCondition() {
    conditionRows.value.push(makeRow());
  }

  function removeCondition(idx) {
    conditionRows.value.splice(idx, 1);
  }

  function onFieldChange(row, newField) {
    row.field = newField;
    const ops = operatorsFor(newField);
    if (!ops.includes(row.op)) row.op = ops[0];
    row.value = "";
    const src = fieldDef(newField)?.value_source;
    if (src?.kind === "doctype") loadLinkOptions(src.doctype);
  }

  const activeAction = computed(() => schema.actions.find((a) => a.key === selectedAction.value));
  const activeActionParams = computed(() => activeAction.value?.params || []);

  // Programatik eylem değişiminde (şablon/düzenleme) watcher param sıfırlamasını atla.
  let suppressActionReset = false;

  function resetActionParams() {
    Object.keys(actionParams).forEach((k) => delete actionParams[k]);
    for (const p of activeActionParams.value) actionParams[p.key] = p.type === "number" ? 0 : "";
  }

  watch(selectedAction, () => {
    // Kullanıcı eylemi değiştirince eski parametreleri temizle, yeni paramlara default ver.
    if (suppressActionReset) return;
    resetActionParams();
  });

  // Builder JSON — count_matching + kaydetme için ConditionBuilder şemasıyla aynı.
  function serializeRow(row) {
    const def = fieldDef(row.field);
    const cond = { field: row.field, op: row.op };
    if (NO_VALUE_OPS.has(row.op)) return cond;
    if (row.op === "in_list" || row.op === "not_in_list") {
      cond.value = String(row.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (def?.type === "number") {
      cond.value = Number(row.value);
    } else {
      cond.value = row.value ?? "";
    }
    return cond;
  }

  const builderModel = computed(() => ({
    match: matchMode.value,
    conditions: conditionRows.value.filter((r) => r.field && r.op).map(serializeRow),
  }));

  const builderJson = computed(() => {
    const m = builderModel.value;
    return m.conditions.length ? JSON.stringify(m) : "";
  });

  // ── Canlı önizleme sayacı ───────────────────────────────────────────────────
  const countResult = reactive({ count: 0, total: 0, error: null });
  const countLoading = ref(false);
  const countMatchText = computed(() => {
    const key = isSellerMode.value ? "ecaWizard.countMatch" : "ecaAdminWizard.countMatch";
    return t(key, { count: countResult.count, total: countResult.total });
  });
  let countDebounce = null;

  // Admin sayımı scope/satıcıya da bağlı; bu kaynakları izleyip yeniden say.
  const countSources = computed(() => [builderJson.value, form.rule_scope, form.seller_profile]);

  watch(
    countSources,
    () => {
      // Admin Per-Seller modunda satıcı seçilene kadar sayma (boş = anlamsız sonuç).
      if (!isSellerMode.value && form.rule_scope === "Per-Seller" && !form.seller_profile) {
        countResult.count = 0;
        countResult.total = 0;
        countResult.error = null;
        countLoading.value = false;
        return;
      }
      clearTimeout(countDebounce);
      countLoading.value = true;
      countDebounce = setTimeout(async () => {
        const res = isSellerMode.value
          ? await countMatching("Listing", builderJson.value)
          : await countMatching("Listing", builderJson.value, form.rule_scope, form.seller_profile);
        countResult.count = res.count;
        countResult.total = res.total;
        countResult.error = res.error;
        countLoading.value = false;
      }, 350);
    },
    { immediate: true }
  );

  // Çakışma kontrolü — yalnız admin modunda; scope/satıcı/koşul/eylem değişince yeniden
  // değerlendir (debounce). Satıcı modunda kullanılmaz.
  let conflictDebounce = null;
  const conflictSources = computed(() => [
    builderJson.value,
    form.rule_scope,
    form.seller_profile,
    selectedAction.value,
  ]);
  watch(conflictSources, () => {
    if (isSellerMode.value) return;
    clearTimeout(conflictDebounce);
    conflictDebounce = setTimeout(runConflictCheck, 450);
  });

  // Gelişmiş: teknik karşılık (salt-okunur özet).
  const advancedExpression = computed(() => {
    const parts = builderModel.value.conditions.map((c) => {
      if (NO_VALUE_OPS.has(c.op)) return `${c.field} ${c.op}`;
      return `${c.field} ${c.op} ${JSON.stringify(c.value)}`;
    });
    const joiner = matchMode.value === "all" ? " AND " : " OR ";
    const cond = parts.join(joiner) || "(koşul yok)";
    const evt = form.bulk_import ? "before_save + bulk_import" : "before_save";
    return `${cond}\n→ ${evt} · ${selectedAction.value}`;
  });

  function buildWizardConditionRows(conditions) {
    return (conditions || []).map((c) => makeRow(c.field, c.op, c.value));
  }

  // Eylemi + parametrelerini programatik ata; watcher reset'ini bastır
  // (selectedAction değişimi watcher'ı tetikler, atadığımız paramları silmesin).
  async function applyAction(actionKey, params) {
    suppressActionReset = true;
    selectedAction.value = actionKey;
    Object.keys(actionParams).forEach((k) => delete actionParams[k]);
    Object.assign(actionParams, params);
    await nextTick();
    suppressActionReset = false;
  }

  // ── Şablon seçimi ───────────────────────────────────────────────────────────
  function applyTemplate() {
    const tpl = RULE_TEMPLATES.find((x) => x.id === selectedTemplateId.value);
    if (!tpl) return;
    form.rule_name = t(tpl.titleKey);
    matchMode.value = tpl.match;
    conditionRows.value = buildWizardConditionRows(tpl.conditions);
    form.bulk_import = tpl.bulk_import;
    showTemplatePicker.value = false;
    applyAction(tpl.action, tpl.params);
  }

  function startFromScratch() {
    form.rule_name = "";
    matchMode.value = "all";
    conditionRows.value = [makeRow()];
    form.bulk_import = true;
    showTemplatePicker.value = false;
    applyAction("discount_price", { percent: 10 });
  }

  async function onWizardSubmit() {
    if (!form.rule_name?.trim()) {
      toast.error(t("ecaRuleForm.ruleNameRequired"));
      return;
    }
    saving.value = true;
    try {
      await saveWizardRule({
        name: ruleName.value || "",
        rule_name: form.rule_name.trim(),
        condition_builder: builderModel.value,
        action: { key: selectedAction.value, params: { ...actionParams } },
        bulk_import: !!form.bulk_import,
        enabled: true,
      });
      goBack();
    } catch {
      /* toast composable tarafından */
    } finally {
      saving.value = false;
    }
  }

  // ── Admin dry-run önizleme ──────────────────────────────────────────────────
  const previewResult = ref(null);
  const previewLoading = ref(false);

  function formatCell(v) {
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
  }

  async function onPreview() {
    previewResult.value = null;
    previewLoading.value = true;
    try {
      previewResult.value = await previewRuleEffect({
        referenceDoctype: "Listing",
        conditionBuilderJson: builderJson.value,
        actionKey: selectedAction.value,
        paramsJson: JSON.stringify(currentActionParams()),
        scope: form.rule_scope,
        sellerProfile: form.rule_scope === "Per-Seller" ? form.seller_profile : null,
      });
    } finally {
      previewLoading.value = false;
    }
  }

  // ── Çakışma uyarısı (kaydetmeden önce, engelleme DEĞİL) ──────────────────────
  const conflicts = ref([]);
  const conflictsLoading = ref(false);

  async function runConflictCheck() {
    conflicts.value = [];
    // Per-Seller'da satıcı seçilmeden anlamlı sonuç yok; kontrolü atla.
    if (form.rule_scope === "Per-Seller" && !form.seller_profile) return;
    conflictsLoading.value = true;
    try {
      const res = await detectConflicts({
        conditionBuilderJson: builderJson.value,
        actionKey: selectedAction.value,
        scope: form.rule_scope,
        sellerProfile: form.rule_scope === "Per-Seller" ? form.seller_profile : null,
        paramsJson: JSON.stringify(currentActionParams()),
        excludeRule: ruleName.value,
      });
      conflicts.value = res.error ? [] : res.conflicts || [];
    } finally {
      conflictsLoading.value = false;
    }
  }

  // ── Örnek üründe test (tek SKU) ──────────────────────────────────────────────
  const testSku = ref("");
  const testResult = ref(null);
  const testLoading = ref(false);

  async function onTestProduct() {
    if (!testSku.value.trim()) {
      toast.error(t("ecaGovernance.testSkuRequired"));
      return;
    }
    testResult.value = null;
    testLoading.value = true;
    try {
      testResult.value = await testOnProduct({
        skuOrName: testSku.value.trim(),
        conditionBuilderJson: builderJson.value,
        actionKey: selectedAction.value,
        paramsJson: JSON.stringify(currentActionParams()),
        scope: form.rule_scope,
        seller: form.rule_scope === "Per-Seller" ? form.seller_profile : null,
      });
    } finally {
      testLoading.value = false;
    }
  }

  // ── Versiyon geçmişi (yalnız düzenleme modu) ─────────────────────────────────
  const versions = ref([]);
  const versionsLoading = ref(false);

  async function loadVersions() {
    if (isNew.value || !ruleName.value) return;
    versionsLoading.value = true;
    try {
      const res = await getVersions(ruleName.value);
      versions.value = res.error ? [] : res.versions || [];
    } finally {
      versionsLoading.value = false;
    }
  }

  async function onRestoreVersion(version) {
    if (!window.confirm(t("ecaGovernance.restoreConfirm"))) return;
    const res = await restoreVersion(ruleName.value, version);
    if (res.ok) {
      await loadRule();
      await loadVersions();
    }
  }

  // ── Admin sihirbaz kaydet ────────────────────────────────────────────────────
  async function onAdminWizardSubmit() {
    if (!form.rule_name?.trim()) {
      toast.error(t("ecaRuleForm.ruleNameRequired"));
      return;
    }
    if (form.rule_scope === "Per-Seller" && !form.seller_profile) {
      toast.error(t("ecaRuleForm.sellerRequiredForPerSeller"));
      return;
    }
    saving.value = true;
    try {
      await saveWizardRule({
        name: ruleName.value || "",
        rule_name: form.rule_name.trim(),
        condition_builder: builderModel.value,
        action: { key: selectedAction.value, params: currentActionParams() },
        bulk_import: !!form.bulk_import,
        enabled: true,
        scope: form.rule_scope,
        seller_profile: form.rule_scope === "Per-Seller" ? form.seller_profile : "",
      });
      goBack();
    } catch {
      /* toast composable tarafından */
    } finally {
      saving.value = false;
    }
  }

  // Düzenleme modu: ECA Rule doc'unu sihirbaz state'ine geri yükle (satıcı + admin ortak).
  // action_type -> sihirbaz eylem anahtarı. discount/markup_price backend'de field_update'e
  // derlendiği için ayırt edilemez; düzenlemede set_field gösterilir, paramları boş başlar.
  function hydrateWizardFromDoc(doc) {
    form.rule_name = doc.rule_name || "";
    form.bulk_import = doc.context_filter === "bulk_import";
    if (!isSellerMode.value) {
      form.rule_scope = doc.rule_scope || "Per-Seller";
      form.seller_profile = doc.seller_profile || "";
      form.owner_role = doc.owner_role || "Marketplace Admin";
      form.event = doc.event || "before_save";
      form.priority = doc.priority ?? 1100;
    }
    matchMode.value = "all";
    conditionRows.value = [];
    try {
      const builder = doc.condition_builder ? JSON.parse(doc.condition_builder) : null;
      if (builder) {
        matchMode.value = builder.match === "any" ? "any" : "all";
        conditionRows.value = buildWizardConditionRows(builder.conditions);
      }
    } catch {
      /* bozuk JSON — boş başla */
    }
    if (!conditionRows.value.length) conditionRows.value = [makeRow()];
    const map = {
      field_update: "set_field",
      email: "email",
      reject_row: "reject_row",
      webhook: "webhook",
      create_document: "create_document",
      custom_script: "custom_script",
    };
    applyAction(map[doc.action_type] || "discount_price", {});
  }

  async function loadRule() {
    if (!ruleName.value) return;
    loadingDoc.value = true;
    try {
      const doc = await getRule(ruleName.value);
      if (doc) hydrateWizardFromDoc(doc);
    } finally {
      loadingDoc.value = false;
    }
  }

  function setDefaultsForAdminNew() {
    const scopeQuery = route.query?.scope;
    if (scopeQuery === "Platform") {
      form.rule_scope = "Platform";
      form.priority = 1100;
    } else {
      form.rule_scope = "Per-Seller";
      form.priority = 500;
    }
    form.owner_role = "Marketplace Admin";
    conditionRows.value = [makeRow()];
    actionParams.percent = 10;
  }

  async function loadSchema() {
    const s = await getRuleSchema();
    schema.fields = s.fields || [];
    schema.actions = s.actions || [];
    schema.writable_fields = s.writable_fields || [];
    adminSellers.value = s.sellers || [];
  }

  onMounted(async () => {
    // Şema her iki modda da gerekli (admin izgarası + satıcı select aynı kaynaktan).
    await loadSchema();
    if (isNew.value) {
      if (isSellerMode.value) {
        showTemplatePicker.value = true;
        conditionRows.value = [makeRow()];
        actionParams.percent = 10;
      } else {
        setDefaultsForAdminNew();
      }
    } else {
      await loadRule();
      if (!isSellerMode.value) await loadVersions();
    }
  });
</script>

<style scoped lang="scss">
  @use "@/assets/scss/variables" as *;

  .eca-form-view {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .eca-form-header {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid $l-border;
    color: $l-text-700;
    font-size: 12px;
    border-radius: 6px;
    height: 32px;
    padding: 0 12px;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: $l-bg-subtle;
    }

    @include dark {
      border-color: $d-border;
      color: $d-text;

      &:hover {
        background: $d-bg-hover;
      }
    }
  }

  .eca-form-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .eca-form-subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    color: $l-text-500;
    max-width: 640px;

    @include dark {
      color: $d-text-muted;
    }
  }

  .eca-loading {
    padding: 48px;
    text-align: center;
    color: $l-text-500;
  }

  // ── Sihirbaz kartı ──────────────────────────────────────────────────────────
  .wiz-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 760px;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 12px;
    padding: 24px;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .wiz-card-title {
    font-size: 16px;
    font-weight: 650;
    margin: 0;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .wiz-card-desc {
    margin: -8px 0 0;
    font-size: 13px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .tpl-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 11px;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  .tpl {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    text-align: left;
    padding: 13px;
    border: 1px solid $l-border;
    border-radius: 11px;
    background: $l-bg-subtle;
    cursor: pointer;
    transition:
      border-color $t-base,
      background $t-base;

    &:hover {
      border-color: $brand;
    }

    &.sel {
      border-color: $brand;
      background: rgba($brand, 0.08);
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .tpl-ic {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: rgba($brand, 0.16);
    color: $brand;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tpl-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tpl-tt {
    font-size: 13px;
    font-weight: 650;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .tpl-td {
    font-size: 11.5px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .stepbox {
    border: 1px solid $l-border;
    border-radius: 12px;
    padding: 15px;
    background: $l-bg-subtle;
    display: flex;
    flex-direction: column;
    gap: 10px;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .step-title {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13.5px;
    font-weight: 650;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .stepnum {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: $brand;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }

  .step-hint {
    margin: -6px 0 0 31px;
    font-size: 11.5px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .cond-match {
    display: inline-flex;
    gap: 6px;
  }

  .seg {
    font-size: 11.5px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid $l-border;
    color: $l-text-500;
    background: $l-bg;
    cursor: pointer;
    transition: all $t-base;

    &.on {
      background: rgba($brand, 0.12);
      color: $brand;
      border-color: rgba($brand, 0.5);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
      color: $d-text-muted;

      // Dark'ta .seg.on'u (0,2,0) bu blok (0,2,1) specificity ile ezdiği için seçili
      // toggle gri kalıyordu; brand renkleri dark içinde yeniden ata.
      &.on {
        background: rgba($brand, 0.22);
        color: $brand-light;
        border-color: rgba($brand, 0.6);
      }
    }
  }

  .cond-row {
    display: grid;
    grid-template-columns: 1fr 0.9fr 1fr auto;
    gap: 8px;
    align-items: center;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  .cond-novalue {
    color: $l-text-500;
    text-align: center;
  }

  .cond-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
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

  .add-cond {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border: 1px dashed $l-border;
    border-radius: 6px;
    background: transparent;
    color: $brand;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: rgba($brand, 0.08);
    }

    @include dark {
      border-color: $d-border;
    }
  }

  .preview {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 13px;
    border-radius: 10px;
    background: rgba($c-success, 0.08);
    border: 1px solid rgba($c-success, 0.3);
    font-size: 12.5px;
    color: $l-text-700;

    svg {
      color: $c-success;
      flex-shrink: 0;
    }

    b {
      color: darken($c-success, 12%);
    }

    &.is-error {
      background: rgba($c-error, 0.08);
      border-color: rgba($c-error, 0.3);

      svg {
        color: $c-error;
      }
    }

    @include dark {
      color: $d-text;
    }
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .action-select {
    min-width: 220px;
    flex: 0 0 auto;
  }

  // ── Admin "Kime?" satıcı seçici ──────────────────────────────────────────────
  .seller-pick {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  // ── Admin eylem izgarası ─────────────────────────────────────────────────────
  .act-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  .act {
    display: flex;
    gap: 9px;
    align-items: center;
    text-align: left;
    padding: 9px;
    border: 1px solid $l-border;
    border-radius: 9px;
    background: $l-bg;
    cursor: pointer;
    transition:
      border-color $t-base,
      background $t-base;

    &:hover {
      border-color: $brand;
    }

    &.sel {
      border-color: $brand;
      background: rgba($brand, 0.08);
    }

    &.gated {
      opacity: 0.85;
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .act-ic {
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: rgba($brand, 0.14);
    color: $brand;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .act-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .act-tt {
    font-size: 12px;
    font-weight: 600;
    color: $l-text-900;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;

    @include dark {
      color: $d-text;
    }
  }

  .act-td {
    font-size: 10.5px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .badge {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.02em;

    &.admin {
      background: rgba(#f59e0b, 0.16);
      color: #b45309;

      @include dark {
        color: #fcd34d;
      }
    }

    &.gated {
      background: rgba($c-error, 0.14);
      color: darken($c-error, 4%);
    }
  }

  .action-params {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  // create_document tıklama alan eşlemesi (hedef alan ← değer satırları).
  .map-row {
    display: grid;
    grid-template-columns: 1fr 24px 1fr auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 7px;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  .map-arrow {
    text-align: center;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .map-empty {
    font-size: 11.5px;
    color: $l-text-500;
    padding: 8px 0;

    @include dark {
      color: $d-text-muted;
    }
  }

  .param-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1 1 160px;

    &.wide {
      flex-basis: 100%;
    }

    label {
      font-size: 11px;
      font-weight: 600;
      color: $l-text-700;

      @include dark {
        color: $d-text;
      }
    }
  }

  .add-link {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 600;
    color: $brand;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  // ── Dry-run önizleme ─────────────────────────────────────────────────────────
  .dryrun {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .dryrun-result {
    border: 1px solid rgba($c-success, 0.3);
    background: rgba($c-success, 0.06);
    border-radius: 10px;
    padding: 12px;

    &.is-error {
      border-color: rgba($c-error, 0.3);
      background: rgba($c-error, 0.06);
    }
  }

  .dryrun-summary {
    margin: 0 0 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .dryrun-err {
    margin: 0;
    font-size: 12.5px;
    color: darken($c-error, 6%);
  }

  .dryrun-empty {
    margin: 0;
    font-size: 12px;
    color: $l-text-500;
  }

  .dryrun-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 11.5px;

    // Tutarlı kolon genişlikleri (kayık hücreleri önler). 3 veya 4 kolonlu tablonun
    // ilk kolonu (SKU/Alan) sabit, değer kolonları eşit dağılır.
    th:first-child,
    td:first-child {
      width: 30%;
    }

    th,
    td {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    th {
      text-align: left;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: $l-text-500;
      padding: 5px 7px;
      border-bottom: 1px solid $l-border;

      @include dark {
        border-color: $d-border;
      }
    }

    td {
      padding: 6px 7px;
      border-bottom: 1px solid $l-border;
      color: $l-text-700;

      @include dark {
        border-color: $d-border-inner;
        color: $d-text;
      }
    }
  }

  .dryrun-old {
    color: $l-text-500;
    text-decoration: line-through;
  }

  .dryrun-new {
    color: darken($c-success, 12%);
    font-weight: 600;
  }

  // ── Governance (test / versiyon / çakışma) ───────────────────────────────────
  .gov-box {
    border: 1px solid $l-border;
    border-radius: 10px;
    padding: 13px;
    background: $l-bg-subtle;
    display: flex;
    flex-direction: column;
    gap: 9px;

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
    }
  }

  .gov-title {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 650;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .gov-hint {
    margin: -4px 0 0;
    font-size: 11.5px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .gov-test-row {
    display: flex;
    gap: 8px;
    align-items: center;

    .field-input {
      flex: 1 1 auto;
    }

    .btn-outline {
      flex: 0 0 auto;
    }
  }

  .gov-test-result {
    border: 1px solid $l-border;
    border-radius: 9px;
    padding: 11px;
    background: $l-bg;

    &.is-error {
      border-color: rgba($c-error, 0.3);
      background: rgba($c-error, 0.06);
    }

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .gov-test-verdict {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0 0 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: $c-error;

    svg {
      flex-shrink: 0;
    }

    &.match {
      color: darken($c-success, 8%);
    }
  }

  .gov-versions {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .gov-version {
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 9px 11px;
    background: $l-bg;

    @include dark {
      background: $d-bg-card;
      border-color: $d-border;
    }
  }

  .gov-version-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .gov-version-meta {
    font-size: 11px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .gov-restore {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid $l-border;
    border-radius: 6px;
    background: transparent;
    color: $brand;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 9px;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: rgba($brand, 0.08);
    }

    @include dark {
      border-color: $d-border;
    }
  }

  .gov-changes {
    list-style: none;
    margin: 7px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11.5px;
    color: $l-text-700;

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: $brand;
    }

    @include dark {
      color: $d-text;
    }
  }

  .gov-nochange {
    margin: 6px 0 0;
    font-size: 11px;
    color: $l-text-500;
  }

  .gov-conflict {
    border: 1px solid rgba($c-warning, 0.45);
    background: rgba($c-warning, 0.08);
    border-radius: 10px;
    padding: 12px 13px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .gov-conflict-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 650;
    color: darken($c-warning, 18%);

    svg {
      color: $c-warning;
      flex-shrink: 0;
    }

    @include dark {
      color: $c-warning;
    }
  }

  .gov-conflict-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;

    li {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      align-items: baseline;
      font-size: 12px;
      color: $l-text-700;

      @include dark {
        color: $d-text;
      }
    }
  }

  .gov-conflict-name {
    font-weight: 650;
    color: $l-text-900;

    @include dark {
      color: $d-text;
    }
  }

  .gov-conflict-reason {
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .gov-conflict-prio {
    font-size: 10.5px;
    color: $l-text-500;
  }

  .gov-conflict-note {
    margin: 0;
    font-size: 11px;
    color: $l-text-500;

    @include dark {
      color: $d-text-muted;
    }
  }

  .adv-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 10px 0;

    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }

  .bulk-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: $l-text-700;

    @include dark {
      color: $d-text;
    }
  }

  .adv {
    border: 1px dashed $l-border;
    border-radius: 10px;
    padding: 11px 13px;
    background: $l-bg-subtle;

    summary {
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      color: $l-text-500;
    }

    @include dark {
      border-color: $d-border;
      background: $d-bg-elevated;
    }
  }

  .adv-hint {
    margin: 8px 0 6px;
    font-size: 11.5px;
    color: $l-text-500;
  }

  .adv-code {
    display: block;
    white-space: pre-wrap;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
    color: $brand;
    background: $l-bg;
    border: 1px solid $l-border;
    border-radius: 8px;
    padding: 10px 12px;

    @include dark {
      background: $d-bg;
      border-color: $d-border-inner;
    }
  }

  .wiz-actions {
    display: flex;
    gap: 9px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
      font-size: 12px;
      font-weight: 600;
      color: $l-text-700;

      @include dark {
        color: $d-text;
      }
    }
  }

  .field-input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid $l-border;
    border-radius: 6px;
    font-size: 13px;
    background: $l-bg;
    color: $l-text-900;
    outline: none;
    transition:
      border-color $t-base,
      box-shadow $t-base;

    &:focus {
      border-color: $brand;
      box-shadow: 0 0 0 2px rgba($brand, 0.18);
    }

    &.mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      line-height: 1.6;
    }

    @include dark {
      background: $d-bg-elevated;
      border-color: $d-border;
      color: $d-text;
    }
  }

  textarea.field-input {
    resize: vertical;
    min-height: 80px;
  }

  .field-hint {
    font-size: 11px;
    color: $l-text-500;
    margin: 2px 0 0;

    @include dark {
      color: $d-text-muted;
    }
  }

  .btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    background: transparent;
    color: $l-text-700;
    border: 1px solid $l-border;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: $l-bg-subtle;
    }

    @include dark {
      color: $d-text;
      border-color: $d-border;

      &:hover {
        background: $d-bg-hover;
      }
    }
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 16px;
    background: $brand;
    color: #fff;
    border: 0;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background $t-base;

    &:hover {
      background: darken(#7c3aed, 6%);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
</style>
