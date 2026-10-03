import type { VrsusRole } from '~/composables/useVrsusAuth'

export function useRoleMode() {
  const { roles, hasRole } = useVrsusAuth()
  const mode = useCookie<VrsusRole>('vrsus-role-mode', {
    default: () => 'user',
    sameSite: 'lax',
  })

  const availableRoles = computed<VrsusRole[]>(() =>
    (['user', 'staff', 'admin'] as const).filter(
      (role) => role === 'user' || hasRole(role),
    ),
  )

  const operationalMode = computed<'staff' | 'admin'>(() => {
    if (mode.value === 'staff' && hasRole('staff')) return 'staff'
    if (mode.value === 'admin' && hasRole('admin')) return 'admin'
    return hasRole('admin') ? 'admin' : 'staff'
  })

  const targets: Record<VrsusRole, string> = {
    user: '/app',
    staff: '/admin/live',
    admin: '/admin',
  }

  async function selectRole(role: VrsusRole) {
    if (role !== 'user' && !roles.value.includes(role)) return
    mode.value = role
    await navigateTo(targets[role])
  }

  return { mode, availableRoles, operationalMode, selectRole }
}
