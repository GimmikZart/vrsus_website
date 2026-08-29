export default defineNuxtRouteMiddleware(async (to) => {
  const { user } = useVrsusAuth()

  if (user.value) {
    return
  }

  return navigateTo({
    path: '/login',
    query: { redirect: to.fullPath },
  })
})
