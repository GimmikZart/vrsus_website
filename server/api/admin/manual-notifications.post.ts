import { createError, readBody } from 'h3'
import { dispatchManualNotificationPush } from '../../utils/manual-notification-push'

type Payload = {
  scope?: 'all' | 'live_event' | 'user'
  eventId?: string | null
  targetUserId?: string | null
  message?: string
  dispatchId?: string
}

export default defineEventHandler(async (event) => {
  const { client } = await requireServerAnyRole(event, ['staff', 'admin'])
  const body = await readBody<Payload>(event)
  const message = body?.message?.trim()
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (
    !message ||
    [...message].length > 300 ||
    !['all', 'live_event', 'user'].includes(body?.scope ?? '') ||
    !body?.dispatchId ||
    !uuid.test(body.dispatchId) ||
    (body.scope === 'all' &&
      (body.eventId != null || body.targetUserId != null)) ||
    (body.scope === 'live_event' &&
      (!body.eventId ||
        !uuid.test(body.eventId) ||
        body.targetUserId != null)) ||
    (body.scope === 'user' &&
      (!body.targetUserId ||
        !uuid.test(body.targetUserId) ||
        body.eventId != null))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid notification',
    })
  }

  const { data, error } = await client.rpc('send_manual_notification', {
    p_scope: body.scope!,
    p_event_id: body.scope === 'live_event' ? body.eventId! : null,
    p_message: message,
    p_dispatch_id: body.dispatchId,
    p_target_user_id: body.scope === 'user' ? body.targetUserId! : null,
  })

  if (error) {
    if (error.message.includes('FORBIDDEN')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Notification audience not allowed',
      })
    }
    if (error.message.includes('EVENT_NOT_RUNNING')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Event no longer running',
      })
    }
    if (error.message.includes('USER_NOT_FOUND')) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Notification dispatch failed',
    })
  }

  const push = await dispatchManualNotificationPush(event, body.dispatchId)
  if (push.errors.length) {
    // eslint-disable-next-line no-console
    console.warn('[vrsus] Manual notification push did not complete', {
      dispatchId: body.dispatchId,
      errors: push.errors,
      attemptedDevices: push.attemptedDevices,
    })
  }

  return { notified: data, push }
})
