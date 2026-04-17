<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900 dark:text-gray-100">CRM Ayarları</h1>
        <p class="text-xs text-gray-400">Taksonomi, SLA, otomasyon ve entegrasyonlar</p>
      </div>
    </div>

    <div class="crm-settings-shell">
      <nav class="crm-settings-nav">
        <div class="crm-settings-nav-group">Genel</div>
        <router-link to="/crm/settings/general"          class="crm-settings-nav-item"><AppIcon name="settings" :size="14" /><span>Genel</span></router-link>

        <div class="crm-settings-nav-group">Taksonomi</div>
        <router-link to="/crm/settings/lead-statuses"    class="crm-settings-nav-item"><AppIcon name="user-plus" :size="14" /><span>Lead Durumları</span></router-link>
        <router-link to="/crm/settings/deal-statuses"    class="crm-settings-nav-item"><AppIcon name="trending-up" :size="14" /><span>Deal Durumları</span></router-link>
        <router-link to="/crm/settings/lead-sources"     class="crm-settings-nav-item"><AppIcon name="git-branch" :size="14" /><span>Kaynaklar</span></router-link>
        <router-link to="/crm/settings/industries"       class="crm-settings-nav-item"><AppIcon name="factory" :size="14" /><span>Sektörler</span></router-link>
        <router-link to="/crm/settings/territories"      class="crm-settings-nav-item"><AppIcon name="map" :size="14" /><span>Bölgeler</span></router-link>
        <router-link to="/crm/settings/lost-reasons"     class="crm-settings-nav-item"><AppIcon name="x-octagon" :size="14" /><span>Kayıp Nedenleri</span></router-link>
        <router-link to="/crm/settings/communication"    class="crm-settings-nav-item"><AppIcon name="message-circle" :size="14" /><span>İletişim Durumları</span></router-link>

        <div class="crm-settings-nav-group">Otomasyon</div>
        <router-link to="/crm/settings/sla"              class="crm-settings-nav-item"><AppIcon name="clock" :size="14" /><span>SLA</span></router-link>
        <router-link to="/crm/settings/assignment-rules" class="crm-settings-nav-item"><AppIcon name="git-merge" :size="14" /><span>Atama Kuralları</span></router-link>

        <div class="crm-settings-nav-group">Entegrasyonlar</div>
        <router-link to="/crm/settings/integrations"     class="crm-settings-nav-item"><AppIcon name="plug" :size="14" /><span>Telefoni & ERPNext</span></router-link>
        <router-link to="/crm/settings/email-accounts"   class="crm-settings-nav-item"><AppIcon name="mail" :size="14" /><span>E-posta Hesapları</span></router-link>
      </nav>

      <div>
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import AppIcon from '@/components/common/AppIcon.vue'
</script>
