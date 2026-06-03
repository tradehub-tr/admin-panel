<script setup>
  import { onMounted, ref } from "vue";
  import { storeToRefs } from "pinia";
  import { useI18n } from "vue-i18n";
  import { useSeoRedirectsStore } from "@/stores/seoRedirects";
  import { useToast } from "@/composables/useToast";
  import RedirectForm from "@/components/seo/RedirectForm.vue";

  const { t } = useI18n();
  const store = useSeoRedirectsStore();
  const { redirects, loading, saving, error, enabledCount } = storeToRefs(store);
  const toast = useToast();

  const showForm = ref(false);
  const editingRedirect = ref(null);

  onMounted(() => store.fetchRedirects());

  function openCreate() {
    editingRedirect.value = null;
    showForm.value = true;
  }

  function openEdit(redirect) {
    editingRedirect.value = redirect;
    showForm.value = true;
  }

  async function onSave(data) {
    try {
      if (editingRedirect.value) {
        await store.update(editingRedirect.value.name, data);
        toast.success(t("seoRedirectList.updated"));
      } else {
        await store.createNew(data);
        toast.success(t("seoRedirectList.created"));
      }
      showForm.value = false;
      editingRedirect.value = null;
    } catch (e) {
      toast.error(e.message || t("seoRedirectList.saveFailed"));
    }
  }

  async function onDelete(redirect) {
    if (!confirm(t("seoRedirectList.confirmDelete", { path: redirect.source_path }))) {
      return;
    }
    try {
      await store.remove(redirect.name);
      toast.success(t("seoRedirectList.deleted"));
    } catch (e) {
      toast.error(e.message || t("seoRedirectList.deleteFailed"));
    }
  }

  async function toggleEnabled(redirect) {
    try {
      await store.update(redirect.name, { enabled: redirect.enabled ? 0 : 1 });
      toast.success(
        redirect.enabled ? t("seoRedirectList.disabled") : t("seoRedirectList.enabled")
      );
    } catch (e) {
      toast.error(e.message);
    }
  }
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-[15px] font-bold text-gray-900">
          {{ t("seoRedirectList.title", { count: enabledCount }) }}
        </h1>
        <p class="text-xs text-gray-400">{{ t("seoRedirectList.subtitle") }}</p>
      </div>
      <button type="button" class="hdr-btn-primary" @click="openCreate">
        {{ t("seoRedirectList.newRedirect") }}
      </button>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading && redirects.length === 0" class="text-center py-8 text-gray-500">
      {{ t("seoRedirectList.loading") }}
    </div>
    <div v-else-if="error" class="text-center py-8 text-red-500">
      {{ error }}
    </div>

    <!-- Form (modal-like, inline) -->
    <div v-if="showForm" class="bg-white border border-gray-200 rounded-lg p-5 mb-4">
      <h2 class="text-base font-semibold text-gray-900 mb-3">
        {{
          editingRedirect
            ? t("seoRedirectList.editRedirect")
            : t("seoRedirectList.newRedirectTitle")
        }}
      </h2>
      <RedirectForm
        :initial="editingRedirect || {}"
        @save="onSave"
        @cancel="
          showForm = false;
          editingRedirect = null;
        "
      />
    </div>

    <!-- List -->
    <div
      v-if="redirects.length > 0"
      class="bg-white border border-gray-200 rounded-lg overflow-hidden"
    >
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr class="text-left">
            <th class="px-4 py-2 font-medium text-gray-700">
              {{ t("seoRedirectList.colSource") }}
            </th>
            <th class="px-4 py-2 font-medium text-gray-700">
              {{ t("seoRedirectList.colTarget") }}
            </th>
            <th class="px-4 py-2 font-medium text-gray-700">{{ t("seoRedirectList.colType") }}</th>
            <th class="px-4 py-2 font-medium text-gray-700">
              {{ t("seoRedirectList.colStatus") }}
            </th>
            <th class="px-4 py-2 font-medium text-gray-700">{{ t("seoRedirectList.colHits") }}</th>
            <th class="px-4 py-2 font-medium text-gray-700">
              {{ t("seoRedirectList.colEnabled") }}
            </th>
            <th class="px-4 py-2 font-medium text-gray-700">
              {{ t("seoRedirectList.colActions") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="redirect in redirects"
            :key="redirect.name"
            class="border-b border-gray-100 hover:bg-gray-50"
          >
            <td class="px-4 py-2 font-mono text-xs text-gray-700">
              {{ redirect.source_path }}
            </td>
            <td class="px-4 py-2 font-mono text-xs text-gray-700">
              {{ redirect.target_path }}
            </td>
            <td class="px-4 py-2 text-xs text-gray-600">
              {{ redirect.match_type }}
            </td>
            <td class="px-4 py-2 text-xs text-gray-600">
              {{ redirect.status_code }}
            </td>
            <td class="px-4 py-2 text-xs text-gray-600 text-center">
              {{ redirect.hit_count }}
            </td>
            <td class="px-4 py-2 text-center">
              <button
                type="button"
                class="text-xs"
                :class="redirect.enabled ? 'text-green-600' : 'text-gray-400'"
                @click="toggleEnabled(redirect)"
              >
                {{ redirect.enabled ? "✓" : "✗" }}
              </button>
            </td>
            <td class="px-4 py-2">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="text-xs text-blue-600 hover:underline"
                  :disabled="saving"
                  @click="openEdit(redirect)"
                >
                  {{ t("seoRedirectList.edit") }}
                </button>
                <button
                  type="button"
                  class="text-xs text-red-500 hover:underline"
                  :disabled="saving"
                  @click="onDelete(redirect)"
                >
                  {{ t("seoRedirectList.delete") }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="text-center py-12 text-gray-500">
      <p>{{ t("seoRedirectList.empty") }}</p>
      <p class="text-xs mt-1">
        {{ t("seoRedirectList.emptyHintPrefix") }}
        <router-link to="/404-report" class="text-blue-600 hover:underline">{{
          t("seoRedirectList.emptyHintLink")
        }}</router-link>
        {{ t("seoRedirectList.emptyHintSuffix") }}
      </p>
    </div>
  </div>
</template>
