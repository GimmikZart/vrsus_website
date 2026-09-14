import { createError, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { PlatformWriteBody } from '~~/server/utils/platform-admin'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const body = await readBody<PlatformWriteBody>(event)
  const payload = normalizePlatformPayload(body)
  const client = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await client
    .from('platforms')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === '23505' ? 409 : 500,
      statusMessage:
        error.code === '23505'
          ? 'Slug or code already used'
          : 'Unable to create platform',
    })
  }

  return { id: data.id }
})
