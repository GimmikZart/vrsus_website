import { createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const client = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await client
    .from('events')
    .select('*')
    .order('starts_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load events',
    })
  }

  return data ?? []
})
