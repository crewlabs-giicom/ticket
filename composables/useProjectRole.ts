export function useProjectRole() {
  const auth = useAuthStore()
  const cache = ref<Record<number, 'admin' | 'member' | null>>({})

  async function fetchRole(projectId: number) {
    if (auth.isAdmin) { cache.value[projectId] = 'admin'; return }
    if (cache.value[projectId] !== undefined) return
    try {
      const res = await $fetch<any>(`/api/projects/${projectId}/my-role`)
      cache.value[projectId] = res.project_role ?? null
    } catch {
      cache.value[projectId] = null
    }
  }

  function isProjectAdmin(projectId: number): boolean {
    if (auth.isAdmin) return true
    return cache.value[projectId] === 'admin'
  }

  function canManageProject(projectId: number): boolean {
    if (auth.isAdmin) return true
    return cache.value[projectId] === 'admin'
  }

  return { fetchRole, isProjectAdmin, canManageProject, cache }
}
