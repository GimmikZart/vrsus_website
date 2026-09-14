import { createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const eventId = requireUuid(getRouterParam(event, 'id'), 'Invalid event id')
  const client = serverSupabaseServiceRole<Database>(event)

  const [eventResult, platformsResult, gamesResult, eventPlatformsResult] =
    await Promise.all([
      client.from('events').select('*').eq('id', eventId).maybeSingle(),
      client.from('platforms').select('*').eq('active', true).order('name'),
      client.from('games').select('*').eq('active', true).order('name'),
      client
        .from('event_platforms')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order'),
    ])

  if (
    eventResult.error ||
    platformsResult.error ||
    gamesResult.error ||
    eventPlatformsResult.error
  ) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load event configuration',
    })
  }

  if (!eventResult.data) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  const eventPlatforms = eventPlatformsResult.data ?? []

  // La tabella di collegamento ha senso solo quando l'evento ha gia delle
  // piattaforme configurate.
  let links: Database['public']['Tables']['event_platform_games']['Row'][] = []
  if (eventPlatforms.length) {
    const { data, error } = await client
      .from('event_platform_games')
      .select('*')
      .in(
        'event_platform_id',
        eventPlatforms.map((item) => item.id),
      )

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to load event games',
      })
    }
    links = data ?? []
  }

  return {
    event: eventResult.data,
    platforms: platformsResult.data ?? [],
    games: gamesResult.data ?? [],
    eventPlatforms,
    links,
  }
})
