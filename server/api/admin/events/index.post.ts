import { createError, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { EventWriteBody } from '~~/server/utils/event-admin'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const body = await readBody<EventWriteBody>(event)
  const payload = normalizeEventPayload(body)
  const client = serverSupabaseServiceRole<Database>(event)

  // Lo slug nasce dal titolo della serata. Due serate possono chiamarsi allo
  // stesso modo (le ricorrenti si chiamano sempre uguale), quindi la
  // collisione la risolve il server invece di rimbalzarla all'operatore.
  const { data: siblings } = await client
    .from('events')
    .select('slug')
    .like('slug', `${payload.slug}%`)

  payload.slug = uniqueSlug(
    payload.slug,
    (siblings ?? []).map((row) => row.slug),
  )

  const { data, error } = await client
    .from('events')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === '23505' ? 409 : 500,
      statusMessage:
        error.code === '23505' ? 'Slug already used' : 'Unable to create event',
    })
  }

  return { id: data.id }
})
