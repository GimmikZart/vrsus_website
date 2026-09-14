import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { PlatformOverrideBody } from '~~/server/utils/event-admin'

type ConfigurationBody = {
  platformIds?: unknown
  platformOverrides?: Record<string, PlatformOverrideBody>
  // Chiave: id della piattaforma di catalogo. Valore: id dei giochi scelti per
  // quella piattaforma in questo evento.
  games?: Record<string, unknown>
}

function uniqueUuids(value: unknown, label: string) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) invalid(`Invalid ${label}`)
  return [
    ...new Set(value.map((item) => requireUuid(item, `Invalid ${label}`))),
  ]
}

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const eventId = requireUuid(getRouterParam(event, 'id'), 'Invalid event id')
  const body = await readBody<ConfigurationBody>(event)
  const platformIds = uniqueUuids(body?.platformIds, 'platform selection')

  const client = serverSupabaseServiceRole<Database>(event)

  const { data: targetEvent, error: eventError } = await client
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load event',
    })
  }
  if (!targetEvent) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  // Solo piattaforme di catalogo ancora attive possono essere collegate.
  if (platformIds.length) {
    const { data, error } = await client
      .from('platforms')
      .select('id')
      .eq('active', true)
      .in('id', platformIds)

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to validate platform selection',
      })
    }
    if ((data ?? []).length !== platformIds.length) {
      invalid('Selection contains unknown or inactive platforms')
    }
  }

  const { data: currentPlatforms, error: currentError } = await client
    .from('event_platforms')
    .select('id, platform_id')
    .eq('event_id', eventId)

  if (currentError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load current configuration',
    })
  }

  // Togliere una piattaforma elimina a cascata i suoi giochi: si cancella prima.
  const removed = (currentPlatforms ?? [])
    .filter((item) => !platformIds.includes(item.platform_id))
    .map((item) => item.id)

  if (removed.length) {
    const { error } = await client
      .from('event_platforms')
      .delete()
      .in('id', removed)
    if (error) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Unable to remove a platform still in use',
      })
    }
  }

  if (platformIds.length) {
    const rows = platformIds.map((platformId, index) => ({
      event_id: eventId,
      platform_id: platformId,
      sort_order: index * 10,
      ...normalizePlatformOverride(body?.platformOverrides?.[platformId]),
    }))
    const { error } = await client
      .from('event_platforms')
      .upsert(rows, { onConflict: 'event_id,platform_id' })
    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to save platforms',
      })
    }
  }

  const { data: savedPlatforms, error: savedError } = await client
    .from('event_platforms')
    .select('id, platform_id')
    .eq('event_id', eventId)

  if (savedError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to reload configuration',
    })
  }

  const eventPlatformByPlatform = new Map(
    (savedPlatforms ?? []).map((item) => [item.platform_id, item.id]),
  )

  // I giochi vanno validati contro la piattaforma a cui appartengono: un gioco
  // di un'altra piattaforma non ha senso in questo collegamento.
  const requestedGameIds = platformIds.flatMap((platformId) =>
    uniqueUuids(body?.games?.[platformId] ?? [], 'game selection'),
  )

  let gamesByPlatform = new Map<string, Set<string>>()
  if (requestedGameIds.length) {
    const { data, error } = await client
      .from('games')
      .select('id, platform_id')
      .eq('active', true)
      .in('id', [...new Set(requestedGameIds)])

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to validate game selection',
      })
    }

    gamesByPlatform = (data ?? []).reduce((acc, game) => {
      const set = acc.get(game.platform_id) ?? new Set<string>()
      set.add(game.id)
      acc.set(game.platform_id, set)
      return acc
    }, new Map<string, Set<string>>())
  }

  const links: {
    event_platform_id: string
    game_id: string
    sort_order: number
  }[] = []
  for (const platformId of platformIds) {
    const eventPlatformId = eventPlatformByPlatform.get(platformId)
    if (!eventPlatformId) continue

    const allowed = gamesByPlatform.get(platformId) ?? new Set<string>()
    const selected = uniqueUuids(
      body?.games?.[platformId] ?? [],
      'game selection',
    )

    selected.forEach((gameId, index) => {
      if (!allowed.has(gameId)) return
      links.push({
        event_platform_id: eventPlatformId,
        game_id: gameId,
        sort_order: index * 10,
      })
    })
  }

  const eventPlatformIds = [...eventPlatformByPlatform.values()]
  if (eventPlatformIds.length) {
    const { error } = await client
      .from('event_platform_games')
      .delete()
      .in('event_platform_id', eventPlatformIds)
    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to reset event games',
      })
    }
  }

  if (links.length) {
    const { error } = await client.from('event_platform_games').insert(links)
    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to save event games',
      })
    }
  }

  return { ok: true }
})
