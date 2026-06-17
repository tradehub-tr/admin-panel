<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">
          {{ t("crmSettingsShell.title") }}
        </h1>
        <p class="text-xs text-gray-400">{{ t("crmSettingsShell.subtitle") }}</p>
      </div>
    </div>

    <div class="crm-settings-shell">
      <nav class="crm-settings-nav" data-tour="crs-nav">
        <div class="crm-settings-nav-group">{{ t("crmSettingsShell.groupGeneral") }}</div>
        <router-link to="/crm/settings/general" class="crm-settings-nav-item"
          ><AppIcon name="settings" :size="14" /><span>{{
            t("crmSettingsShell.general")
          }}</span></router-link
        >

        <div class="crm-settings-nav-group">{{ t("crmSettingsShell.groupTaxonomy") }}</div>
        <router-link to="/crm/settings/lead-statuses" class="crm-settings-nav-item"
          ><AppIcon name="user-plus" :size="14" /><span>{{
            t("crmSettingsShell.leadStatuses")
          }}</span></router-link
        >
        <router-link to="/crm/settings/deal-statuses" class="crm-settings-nav-item"
          ><AppIcon name="trending-up" :size="14" /><span>{{
            t("crmSettingsShell.dealStatuses")
          }}</span></router-link
        >
        <router-link to="/crm/settings/lead-sources" class="crm-settings-nav-item"
          ><AppIcon name="git-branch" :size="14" /><span>{{
            t("crmSettingsShell.sources")
          }}</span></router-link
        >
        <router-link to="/crm/settings/industries" class="crm-settings-nav-item"
          ><AppIcon name="factory" :size="14" /><span>{{
            t("crmSettingsShell.industries")
          }}</span></router-link
        >
        <router-link to="/crm/settings/territories" class="crm-settings-nav-item"
          ><AppIcon name="map" :size="14" /><span>{{
            t("crmSettingsShell.territories")
          }}</span></router-link
        >
        <router-link to="/crm/settings/lost-reasons" class="crm-settings-nav-item"
          ><AppIcon name="x-octagon" :size="14" /><span>{{
            t("crmSettingsShell.lostReasons")
          }}</span></router-link
        >
        <router-link to="/crm/settings/communication" class="crm-settings-nav-item"
          ><AppIcon name="message-circle" :size="14" /><span>{{
            t("crmSettingsShell.communicationStatuses")
          }}</span></router-link
        >

        <div class="crm-settings-nav-group">{{ t("crmSettingsShell.groupAutomation") }}</div>
        <router-link to="/crm/settings/sla" class="crm-settings-nav-item"
          ><AppIcon name="clock" :size="14" /><span>{{
            t("crmSettingsShell.sla")
          }}</span></router-link
        >
        <router-link to="/crm/settings/assignment-rules" class="crm-settings-nav-item"
          ><AppIcon name="git-merge" :size="14" /><span>{{
            t("crmSettingsShell.assignmentRules")
          }}</span></router-link
        >

        <div class="crm-settings-nav-group">{{ t("crmSettingsShell.groupIntegrations") }}</div>
        <router-link to="/crm/settings/integrations" class="crm-settings-nav-item"
          ><AppIcon name="plug" :size="14" /><span>{{
            t("crmSettingsShell.telephonyErpnext")
          }}</span></router-link
        >
        <router-link to="/crm/settings/email-accounts" class="crm-settings-nav-item"
          ><AppIcon name="mail" :size="14" /><span>{{
            t("crmSettingsShell.emailAccounts")
          }}</span></router-link
        >
      </nav>

      <div data-tour="crs-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useI18n } from "vue-i18n";
  import AppIcon from "@/components/common/AppIcon.vue";
  import { usePageTour } from "@/composables/usePageTour";

  const { t } = useI18n();

  // Sayfa-içi onboarding: ayar gezinme çubuğu → seçili ayar içeriği.
  usePageTour("crm-settings", () => [
    {
      target: '[data-tour="crs-nav"]',
      title: t("tourSteps.page.crsNav_t"),
      desc: t("tourSteps.page.crsNav_d"),
    },
    {
      target: '[data-tour="crs-content"]',
      title: t("tourSteps.page.crsContent_t"),
      desc: t("tourSteps.page.crsContent_d"),
    },
  ]);
</script>
