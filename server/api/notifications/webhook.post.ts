import { timingSafeEqual } from 'node:crypto'
import { createError, getHeader, readBody } from 'h3'
import { dispatchStoredNotification } from '../../utils/notification-dispatch'

type WebhookBody = {
  type?: unknown
  table?: unknown
  schema?: unknown
  record?: { id?: unknown }
}

export default defineEventHandler(async (event) => {
  const secret = String(useRuntimeConfig(event).notificationWebhookSecret ?? '')
  if (!secret)
    throw createError({
      statusCode: 503,
      statusMessage: 'Webhook not configured',
    })
  const supplied = getHeader(event, 'x-vrsus-webhook-secret') ?? ''
  const expectedBytes = Buffer.from(secret)
  const suppliedBytes = Buffer.from(supplied)
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<WebhookBody>(event)
  const notificationId = body?.record?.id
  if (
    body?.type !== 'INSERT' ||
    body?.schema !== 'public' ||
    body?.table !== 'notifications' ||
    typeof notificationId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      notificationId,
    )
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid notification event',
    })
  }

  return {
    notificationId,
    result: await dispatchStoredNotification(event, notificationId),
  }
})
