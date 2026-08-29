import type { VrsusRole } from '~/composables/useVrsusAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, loadRoles, hasAnyRole } = useVrsusAuth()
  const requiredRoles = (to.meta.requiredRoles ?? []) as VrsusRole[]

  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  try {
    await loadRoles()
  } catch {
    return navigateTo('/app?error=roles-unavailable')
  }

  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return navigateTo('/app?error=forbidden')
  }
})
