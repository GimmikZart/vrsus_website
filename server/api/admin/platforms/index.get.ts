import { createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const client = serverSupabaseServiceRole<Database>(event)

  const [platforms, categories, games] = await Promise.all([
    client.from('platforms').select('*').order('name'),
    client.from('platform_categories').select('*').order('sort_order'),
    client.from('games').select('id, platform_id, active'),
  ])

  if (platforms.error || categories.error || games.error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load platforms',
    })
  }

  // Il conteggio giochi serve alla card: evita una query per riga nel client.
  const counts = (games.data ?? []).reduce<Record<string, number>>(
    (acc, game) => {
      if (!game.active) return acc
      acc[game.platform_id] = (acc[game.platform_id] ?? 0) + 1
      return acc
    },
    {},
  )

  return {
    platforms: (platforms.data ?? []).map((platform) => ({
      ...platform,
      games_count: counts[platform.id] ?? 0,
    })),
    categories: categories.data ?? [],
  }
})
