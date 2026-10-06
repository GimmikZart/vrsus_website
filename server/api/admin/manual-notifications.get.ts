import { createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['staff', 'admin'])
  const client = serverSupabaseServiceRole<Database>(event)
  const [
    { data: users, error: usersError },
    { data: events, error: eventsError },
  ] = await Promise.all([
    client
      .from('profiles')
      .select('id, display_name, nickname')
      .order('nickname', { nullsFirst: false }),
    client
      .from('events')
      .select('id, title, starts_at')
      .eq('status', 'running')
      .order('starts_at', { ascending: false }),
  ])

  if (usersError || eventsError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Audience unavailable',
    })
  }

  const liveEvents = await Promise.all(
    (events ?? []).map(async (liveEvent) => {
      const { count: participants, error } = await client
        .from('event_checkins')
        .select('id', { head: true, count: 'exact' })
        .eq('event_id', liveEvent.id)
      if (error) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Audience unavailable',
        })
      }
      return { ...liveEvent, participants: participants ?? 0 }
    }),
  )

  return { allUsers: users?.length ?? 0, users: users ?? [], liveEvents }
})
