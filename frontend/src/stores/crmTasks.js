/**
 * CRM Task Store — CRM Task DocType
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/utils/api";

const TASK_FIELDS = [
  "name",
  "title",
  "description",
  "status",
  "priority",
  "start_date",
  "due_date",
  "assigned_to",
  "reference_doctype",
  "reference_docname",
  "modified",
  "creation",
];

export const useCrmTaskStore = defineStore("crmTasks", () => {
  const tasks = ref([]);
  const total = ref(0);
  const loading = ref(false);

  async function fetchTasks({
    page = 1,
    pageSize = 30,
    filters = [],
    orderBy = "due_date asc",
  } = {}) {
    loading.value = true;
    try {
      const [listRes, countRes] = await Promise.all([
        api.getList("CRM Task", {
          fields: TASK_FIELDS,
          filters,
          order_by: orderBy,
          limit_start: (page - 1) * pageSize,
          limit_page_length: pageSize,
        }),
        api.getCount("CRM Task", filters),
      ]);
      tasks.value = listRes.data || [];
      total.value = countRes.message || 0;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTasksForRef(doctype, docname) {
    const res = await api.getList("CRM Task", {
      fields: TASK_FIELDS,
      filters: [
        ["reference_doctype", "=", doctype],
        ["reference_docname", "=", docname],
      ],
      order_by: "creation desc",
      limit_page_length: 200,
    });
    return res.data || [];
  }

  async function createTask(data) {
    const res = await api.createDoc("CRM Task", data);
    return res.data;
  }

  async function updateTask(name, data) {
    const res = await api.updateDoc("CRM Task", name, data);
    return res.data;
  }

  async function deleteTask(name) {
    return api.deleteDoc("CRM Task", name);
  }

  async function setStatus(name, status) {
    return updateTask(name, { status });
  }

  return {
    tasks,
    total,
    loading,
    fetchTasks,
    fetchTasksForRef,
    createTask,
    updateTask,
    deleteTask,
    setStatus,
  };
});
