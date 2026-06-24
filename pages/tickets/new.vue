<template>
  <TicketFormModal
    :taskId="task?.id"
    :taskTitle="task?.title"
    :projectId="task?.project_id"
    :prefillTitle="task?.title"
    :prefillDescription="task?.description"
    :prefillSystemMenuId="task?.system_menu_id"
    @close="navigateTo('/tickets')"
    @created="navigateTo('/tickets')"
  />
</template>
<script setup lang="ts">
const route = useRoute()
const taskId = route.query.task_id

const task = ref<any>(null)
if (taskId) {
  const res = await $fetch<any>(`/api/tasks/${taskId}`).catch(() => null)
  task.value = res || null
}
</script>
