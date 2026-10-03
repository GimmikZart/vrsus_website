import { createError, readBody } from 'h3'
import { dispatchStoredNotification } from '../../utils/notification-dispatch'

type DispatchBody = { notificationIds?: unknown }

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['staff', 'admin'])

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

  const results = []
  for (const notificationId of notificationIds) {
    const result = await dispatchStoredNotification(event, notificationId)
    results.push({
      notificationId,
      result,
    })
  }

  return { results }
})
