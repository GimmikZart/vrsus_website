import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { PlatformWriteBody } from '~~/server/utils/platform-admin'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin'])

  const platformId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid platform id',
  )
  const body = await readBody<PlatformWriteBody>(event)
  const payload = normalizePlatformPayload(body)
  const client = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await client
    .from('platforms')
    .update(payload)
    .eq('id', platformId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: error.code === '23505' ? 409 : 500,
      statusMessage:
        error.code === '23505'
          ? 'Slug or code already used'
          : 'Unable to update platform',
    })
  }

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Platform not found' })
  }

  return { id: data.id }
})
