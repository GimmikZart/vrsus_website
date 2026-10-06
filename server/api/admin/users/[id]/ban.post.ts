import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  const { user } = await requireServerRole(event, 'admin')
  const userId = requireUuid(getRouterParam(event, 'id'), 'Invalid user id')
  const body = await readBody<{ banned?: boolean }>(event)

  if (typeof body?.banned !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ban request' })
  }
  if (String(user.sub) === userId && body.banned) {
    throw createError({
      statusCode: 409,
      statusMessage: 'SELF_BAN_NOT_ALLOWED',
    })
  }

  const client = serverSupabaseServiceRole<Database>(event)
  const { data: beforeResult } = await client.auth.admin.getUserById(userId)
  if (!beforeResult.user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const { data, error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: body.banned ? '876000h' : 'none',
  })
  if (error || !data.user) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to update user ban',
    })
  }

  await client.from('audit_logs').insert({
    actor_user_id: String(user.sub),
    action: body.banned ? 'user.banned' : 'user.unbanned',
    entity_type: 'profile',
    entity_id: userId,
    before_data: { banned_until: beforeResult.user.banned_until ?? null },
    after_data: { banned_until: data.user.banned_until ?? null },
    metadata: { source: 'admin_user_profile' },
  })

  return { bannedUntil: data.user.banned_until ?? null }
})
