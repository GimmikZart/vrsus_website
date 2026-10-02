import { createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { dispatchStoredNotification } from '~~/server/utils/notification-dispatch'

// Avvio dell evento: passaggio in modalita live e avviso agli iscritti.
//
// La guardia di transizione in database accetta solo scheduled -> running:
// qui si verifica prima lo stato per restituire un 409 leggibile invece di
// lasciar affiorare l errore del trigger.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const eventId = requireUuid(getRouterParam(event, 'id'), 'Invalid event id')
  const client = serverSupabaseServiceRole<Database>(event)

  const { data: current } = await client
    .from('events')
    .select('id, title, status, slug')
    .eq('id', eventId)
    .maybeSingle()

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  if (current.status === 'running') {
    throw createError({ statusCode: 409, statusMessage: 'EVENT_ALREADY_LIVE' })
  }

  if (current.status !== 'scheduled') {
    throw createError({ statusCode: 409, statusMessage: 'EVENT_NOT_SCHEDULED' })
  }

  const { error: updateError } = await client
    .from('events')
    .update({ status: 'running' })
    .eq('id', eventId)

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to start event',
    })
  }

  const { data: bookings } = await client
    .from('bookings')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmed')

  const userIds = [...new Set((bookings ?? []).map((row) => row.user_id))]

  if (!userIds.length) {
    return { id: eventId, status: 'running', notified: 0, push: null }
  }

  const title = 'Evento iniziato'
  const message = `${current.title} e appena cominciato. Ti aspettiamo in sede.`

  const { data: notifications, error: notificationsError } = await client
    .from('notifications')
    .insert(
      userIds.map((userId) => ({
        user_id: userId,
        type: 'event_started',
        title,
        message,
        action_url: '/app',
        metadata: { event_id: eventId },
      })),
    )
    .select('id')

  if (notificationsError) {
    // L evento e gia live: l avviso mancato non deve annullare l avvio, ma
    // deve restare visibile a chi ha premuto il pulsante.
    return {
      id: eventId,
      status: 'running',
      notified: 0,
      push: null,
      warning: 'NOTIFICATIONS_NOT_CREATED',
    }
  }

  const push = []
  for (const notification of notifications ?? []) {
    try {
      push.push(await dispatchStoredNotification(event, notification.id))
    } catch {
      push.push({
        configured: false,
        attempted: false,
        delivered: false,
        recipientCount: 0,
        error: 'PUSH_DISPATCH_FAILED',
      })
    }
  }

  return { id: eventId, status: 'running', notified: userIds.length, push }
})
