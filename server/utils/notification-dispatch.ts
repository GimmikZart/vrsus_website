import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { sendOneSignalPush } from './push-provider'

export async function dispatchStoredNotification(
  event: H3Event,
  notificationId: string,
) {
  const client = serverSupabaseServiceRole<Database>(event)
  const { data: notification, error } = await client
    .from('notifications')
    .select('id, user_id, title, message, action_url, metadata')
    .eq('id', notificationId)
    .maybeSingle()
  if (error) throw error
  if (!notification) return null

  const result = await sendOneSignalPush(event, [notification.user_id], {
    title: notification.title,
    message: notification.message,
    actionUrl: notification.action_url,
    data:
      notification.metadata && typeof notification.metadata === 'object'
        ? (notification.metadata as Record<string, unknown>)
        : undefined,
    idempotencyKey: notification.id,
  })
  if (result.error) {
    // eslint-disable-next-line no-console
    console.warn('[vrsus] OneSignal dispatch did not complete', {
      notificationId,
      error: result.error,
      attempted: result.attempted,
    })
  }
  return result
}
