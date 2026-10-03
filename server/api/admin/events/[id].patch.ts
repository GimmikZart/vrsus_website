import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { EventWriteBody } from '~~/server/utils/event-admin'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin'])

  const eventId = requireUuid(getRouterParam(event, 'id'), 'Invalid event id')
  const body = await readBody<EventWriteBody>(event)
  const payload = normalizeEventPayload(body)
  const client = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await client
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: error.code === '23505' ? 409 : 500,
      statusMessage:
        error.code === '23505' ? 'Slug already used' : 'Unable to update event',
    })
  }

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  return { id: data.id }
})
