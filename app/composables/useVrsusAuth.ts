import type { Database } from '~/types/database.types'

const roleNames = ['user', 'staff', 'admin'] as const

export type VrsusRole = (typeof roleNames)[number]

export function useVrsusAuth() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const roles = useState<VrsusRole[]>('vrsus-auth-roles', () => [])
  const rolesLoadedFor = useState<string | null>(
    'vrsus-auth-roles-user',
    () => null,
  )

  const isAuthenticated = computed(() => Boolean(user.value))
  const isStaff = computed(() => hasAnyRole(['staff', 'admin']))
  const isAdmin = computed(() => hasAnyRole(['admin']))

  function hasRole(role: VrsusRole) {
    return roles.value.includes(role)
  }

  function hasAnyRole(requiredRoles: readonly VrsusRole[]) {
    return requiredRoles.some((role) => roles.value.includes(role))
  }

  async function loadRoles(force = false) {
    const userId = user.value?.sub

    if (!userId) {
      roles.value = []
      rolesLoadedFor.value = null
      return []
    }

    if (!force && rolesLoadedFor.value === userId) {
      return roles.value
    }

    const { data, error } = await client.rpc('get_my_roles')

    if (error) {
      roles.value = []
      rolesLoadedFor.value = null
      throw error
    }

    roles.value = (data ?? [])
      .map((entry) => entry.code)
      .filter((role): role is VrsusRole =>
        roleNames.includes(role as VrsusRole),
      )
    rolesLoadedFor.value = userId

    return roles.value
  }

  async function signOut() {
    // A shared device must stop receiving this account's push before the
    // Supabase session is removed and the subscription can no longer be edited.
    try {
      await usePushNotifications().revokeCurrentDevice()
    } catch {
      // A provider outage must not lock the user into their account.
    }
    const { error } = await client.auth.signOut()

    if (error) {
      throw error
    }

    roles.value = []
    rolesLoadedFor.value = null
  }

  return {
    user,
    roles,
    isAuthenticated,
    isStaff,
    isAdmin,
    hasRole,
    hasAnyRole,
    loadRoles,
    signOut,
  }
}
