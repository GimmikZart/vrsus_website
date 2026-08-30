import { createError, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { sendOneSignalPush } from '../../utils/push-provider'

type DispatchBody = { notificationIds?: unknown }

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, [
    'tournament_admin',
    'admin',
    'super_admin',
  ])

  const body = await readBody<DispatchBody>(event)
  const notificationIds = Array.isArray(body?.notificationIds)
    ? body.notificationIds
        .filter((id): id is string => typeof id === 'string')
        .slice(0, 50)
    : []

  if (!notificationIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one notification id is required',
    })
  }

  const client = serverSupabaseServiceRole<Database>(event)
  const { data: notifications, error } = await client
    .from('notifications')
    .select('id, user_id, title, message, action_url, metadata')
    .in('id', notificationIds)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load notifications',
    })
  }

  const results = []
  for (const notification of notifications ?? []) {
    const result = await sendOneSignalPush(event, [notification.user_id], {
      title: notification.title,
      message: notification.message,
      actionUrl: notification.action_url,
      data:
        notification.metadata && typeof notification.metadata === 'object'
          ? (notification.metadata as Record<string, unknown>)
          : undefined,
    })
    if (result.error) {
      // Provider failures must remain observable without breaking the inbox flow.
      // eslint-disable-next-line no-console
      console.warn('[vrsus] OneSignal dispatch did not complete', {
        notificationId: notification.id,
        error: result.error,
        attempted: result.attempted,
      })
    }
    results.push({
      notificationId: notification.id,
      result,
    })
  }

  return { results }
})
