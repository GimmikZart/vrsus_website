import { createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Selettore postazioni per le operazioni di torneo: espone solo il nome
// visibile delle piattaforme attive di un evento, mai capienza o metadati
// interni.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['staff', 'admin'])

  const eventId = requireUuid(getRouterParam(event, 'id'), 'Invalid event id')
  const client = serverSupabaseServiceRole<Database>(event)

  const { data: links, error: linksError } = await client
    .from('event_platforms')
    .select('id, platform_id, public_name')
    .eq('event_id', eventId)
    .eq('active', true)
    .order('sort_order')

  if (linksError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load event platforms',
    })
  }

  if (!links?.length) return []

  const { data: platforms, error: platformsError } = await client
    .from('platforms')
    .select('id, name')
    .in(
      'id',
      links.map((link) => link.platform_id),
    )

  if (platformsError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load platforms',
    })
  }

  return links.map((link) => ({
    id: link.id,
    name:
      link.public_name ??
      platforms?.find((platform) => platform.id === link.platform_id)?.name ??
      'Postazione',
  }))
})
