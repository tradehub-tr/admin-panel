<template>
  <div>
    <!-- Create row -->
    <div class="flex items-center gap-2 mb-4">
      <input
        v-model="newTask.title"
        type="text"
        :placeholder="t('tasks.newTaskPlaceholder')"
        class="form-input flex-1"
        @keyup.enter="createTask"
      />
      <select v-model="newTask.priority" class="form-input-sm w-auto">
        <option value="Low">{{ t("tasks.priorityLow") }}</option>
        <option value="Medium">{{ t("tasks.priorityMedium") }}</option>
        <option value="High">{{ t("tasks.priorityHigh") }}</option>
      </select>
      <input v-model="newTask.due_date" type="date" class="form-input-sm w-auto" />
      <button
        class="hdr-btn-primary"
        :disabled="saving || !newTask.title.trim()"
        @click="createTask"
      >
        <AppIcon name="plus" :size="13" /><span>{{ t("tasks.add") }}</span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-6">
      <AppIcon name="loader" :size="20" class="text-violet-500 animate-spin" />
    </div>
    <div v-else-if="!tasks.length" class="crm-empty">
      <div class="icon"><AppIcon name="check-square" :size="22" /></div>
      <h3>{{ t("tasks.empty") }}</h3>
      <p>{{ t("tasks.emptyHint") }}</p>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="task in tasks"
        :key="task.name"
        class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-violet-300 transition-all"
      >
        <button
          class="w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5"
          :class="
            task.status === 'Done'
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-gray-300 dark:border-white/20'
          "
          :title="task.status === 'Done' ? t('tasks.done') : t('tasks.complete')"
          @click="toggleDone(task)"
        >
          <AppIcon v-if="task.status === 'Done'" name="check" :size="12" class="text-white" />
        </button>
        <div class="flex-1 min-w-0">
          <div
            class="text-[13px] font-semibold"
            :class="
              task.status === 'Done'
                ? 'line-through text-gray-400'
                : 'text-gray-800 dark:text-gray-100'
            "
          >
            {{ task.title }}
          </div>
          <div class="flex items-center gap-3 mt-1 flex-wrap">
            <StatusPill :status="task.status" :label="statusLabel(task.status)" />
            <span class="text-[11px] text-gray-500">
              <AppIcon name="flag" :size="11" class="inline mr-1" />{{
                priorityLabel(task.priority)
              }}
            </span>
            <span
              v-if="task.due_date"
              class="text-[11px]"
              :class="isOverdue(task) ? 'text-rose-500' : 'text-gray-500'"
            >
              <AppIcon name="calendar" :size="11" class="inline mr-1" />{{
                formatDate(task.due_date)
              }}
            </span>
            <span v-if="task.assigned_to" class="text-[11px] text-gray-500">
              <AppIcon name="user" :size="11" class="inline mr-1" />{{
                (task.assigned_to || "").split("@")[0]
              }}
            </span>
          </div>
        </div>
        <button
          class="text-gray-400 hover:text-rose-500"
          :title="t('tasks.delete')"
          @click="removeTask(task)"
        >
          <AppIcon name="trash-2" :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch } from "vue";
  import { useI18n } from "vue-i18n";
  import { useCrmTaskStore } from "@/stores/crmTasks";
  import { useToast } from "@/composables/useToast";
  import AppIcon from "@/components/common/AppIcon.vue";
  import StatusPill from "@/components/crm/StatusPill.vue";

  const props = defineProps({
    doctype: { type: String, required: true },
    docname: { type: String, required: true },
  });

  const { t } = useI18n();
  const store = useCrmTaskStore();
  const toast = useToast();

  const tasks = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const newTask = ref({ title: "", priority: "Medium", due_date: "" });

  function statusLabel(s) {
    const m = {
      Backlog: t("tasks.statusBacklog"),
      Todo: t("tasks.statusTodo"),
      "In Progress": t("tasks.statusInProgress"),
      Done: t("tasks.statusDone"),
      Canceled: t("tasks.statusCanceled"),
    };
    return m[s] || s;
  }
  function priorityLabel(p) {
    const m = {
      Low: t("tasks.priorityLow"),
      Medium: t("tasks.priorityMedium"),
      High: t("tasks.priorityHigh"),
    };
    return m[p] || p;
  }
  function formatDate(s) {
    if (!s) return "";
    try {
      return new Date(s).toLocaleDateString("tr-TR");
    } catch {
      return s;
    }
  }
  function isOverdue(t) {
    if (!t.due_date || t.status === "Done") return false;
    try {
      return new Date(t.due_date) < new Date(new Date().toDateString());
    } catch {
      return false;
    }
  }

  async function load() {
    if (!props.docname || props.docname === "new") return;
    loading.value = true;
    try {
      tasks.value = await store.fetchTasksForRef(props.doctype, props.docname);
    } finally {
      loading.value = false;
    }
  }

  async function createTask() {
    if (!newTask.value.title.trim()) return;
    saving.value = true;
    try {
      await store.createTask({
        title: newTask.value.title.trim(),
        priority: newTask.value.priority,
        due_date: newTask.value.due_date || null,
        status: "Todo",
        reference_doctype: props.doctype,
        reference_docname: props.docname,
      });
      newTask.value = { title: "", priority: "Medium", due_date: "" };
      await load();
      toast.success(t("tasks.taskAdded"));
    } catch (e) {
      toast.error(e.message || t("tasks.taskAddFailed"));
    } finally {
      saving.value = false;
    }
  }

  async function toggleDone(task) {
    const newStatus = task.status === "Done" ? "Todo" : "Done";
    try {
      await store.setStatus(task.name, newStatus);
      task.status = newStatus;
    } catch (e) {
      toast.error(e.message || t("tasks.updateFailed"));
    }
  }

  async function removeTask(task) {
    if (!confirm(t("tasks.confirmDelete", { title: task.title }))) return;
    try {
      await store.deleteTask(task.name);
      tasks.value = tasks.value.filter((x) => x.name !== task.name);
      toast.success(t("tasks.deleted"));
    } catch (e) {
      toast.error(e.message || t("tasks.deleteFailed"));
    }
  }

  watch(() => props.docname, load, { immediate: true });
  onMounted(load);
</script>
