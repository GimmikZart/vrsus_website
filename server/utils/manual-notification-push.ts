import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { sendOneSignalPush } from './push-provider'

const PAGE_SIZE = 100

function batchId(dispatchId: string, page: number) {
  if (page === 0) return dispatchId
  const bytes = createHash('sha256')
    .update(`${dispatchId}:${page}`)
    .digest()
    .subarray(0, 16)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const value = bytes.toString('hex')
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
}

export async function dispatchManualNotificationPush(
  event: H3Event,
  dispatchId: string,
) {
  const client = serverSupabaseServiceRole<Database>(event)
  let acceptedDevices = 0
  let attemptedDevices = 0
  let page = 0
  const errors: string[] = []

  while (true) {
    const { data: notifications, error } = await client
      .from('notifications')
      .select('user_id, title, message, action_url')
      .eq('type', 'manual')
      .contains('metadata', { dispatch_id: dispatchId })
      .order('id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error) {
      errors.push(`NOTIFICATION_READ_FAILED:${error.message}`)
      break
    }
    if (!notifications?.length) break

    const first = notifications[0]!
    const result = await sendOneSignalPush(
      event,
      notifications.map((notification) => notification.user_id),
      {
        title: first.title,
        message: first.message,
        actionUrl: first.action_url,
        idempotencyKey: batchId(dispatchId, page),
      },
    )
    attemptedDevices += result.recipientCount
    if (result.delivered) acceptedDevices += result.recipientCount
    if (result.error) errors.push(result.error)
    if (notifications.length < PAGE_SIZE) break
    page += 1
  }

  return { attemptedDevices, acceptedDevices, errors }
}
