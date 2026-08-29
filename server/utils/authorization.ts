import type { H3Event } from 'h3'
import { createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~/types/database.types'

type RoleCode = 'user' | 'staff' | 'tournament_admin' | 'admin' | 'super_admin'

export async function requireServerRole(
  event: H3Event,
  requiredRole: RoleCode,
) {
  let user

  try {
    user = await serverSupabaseUser(event)
  } catch {
    user = null
  }

  if (!user?.sub) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
  }

  const client = await serverSupabaseClient<Database>(event)
  const { data, error } = await client.rpc('has_role', {
    required_role: requiredRole,
  })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Authorization unavailable',
    })
  }

  if (!data) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions',
    })
  }

  return { client, user }
}
