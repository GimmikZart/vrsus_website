import type { Database } from '~/types/database.types'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireServerRole(event, 'super_admin')

  const serviceClient = serverSupabaseServiceRole<Database>(event)
  const [
    { data: profiles, error: profilesError },
    { data: assignments, error: assignmentsError },
  ] = await Promise.all([
    serviceClient
      .from('profiles')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: true }),
    serviceClient.from('user_roles').select('user_id, roles(code)'),
  ])

  if (profilesError || assignmentsError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load users',
    })
  }

  const rolesByUser = new Map<string, string[]>()
  for (const assignment of assignments ?? []) {
    const role = Array.isArray(assignment.roles)
      ? assignment.roles[0]?.code
      : assignment.roles?.code
    if (role) {
      rolesByUser.set(assignment.user_id, [
        ...(rolesByUser.get(assignment.user_id) ?? []),
        role,
      ])
    }
  }

  return (profiles ?? []).map((profile) => ({
    ...profile,
    roles: rolesByUser.get(profile.id) ?? [],
  }))
})
