import { createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const platformId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid platform id',
  )
  const client = serverSupabaseServiceRole<Database>(event)

  const [platform, games, categories] = await Promise.all([
    client.from('platforms').select('*').eq('id', platformId).maybeSingle(),
    client
      .from('games')
      .select('*')
      .eq('platform_id', platformId)
      .order('name'),
    client.from('platform_categories').select('*').order('sort_order'),
  ])

  if (platform.error || games.error || categories.error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load platform',
    })
  }

  if (!platform.data) {
    throw createError({ statusCode: 404, statusMessage: 'Platform not found' })
  }

  return {
    platform: platform.data,
    games: games.data ?? [],
    categories: categories.data ?? [],
  }
})
