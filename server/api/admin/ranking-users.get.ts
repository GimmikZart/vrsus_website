import type { Database } from '~/types/database.types'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const client = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await client
    .from('profiles')
    .select('id, display_name')
    .order('display_name')

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load ranking users',
    })
  }

  return data ?? []
})
