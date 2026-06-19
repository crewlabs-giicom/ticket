export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  if (!auth.user) {
    const headers = useRequestHeaders(['cookie'])
    await auth.fetchMe(headers)
  }
  if (!auth.user) {
    return navigateTo('/login')
  }
})
