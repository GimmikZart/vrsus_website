import { createError, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type { PlatformWriteBody } from '~~/server/utils/platform-admin'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin'])

  const body = await readBody<PlatformWriteBody>(event)
  const payload = normalizePlatformPayload(body)
  const client = serverSupabaseServiceRole<Database>(event)

  // Lo slug non arriva piu dal modulo: nasce dal nome. Due postazioni possono
  // chiamarsi allo stesso modo, quindi la collisione la risolve il server.
  const { data: siblings } = await client
    .from('platforms')
    .select('slug')
    .like('slug', `${payload.slug}%`)

  payload.slug = uniqueSlug(
    payload.slug,
    (siblings ?? []).map((row) => row.slug),
  )

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
