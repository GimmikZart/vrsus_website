import { createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireServerRole(event, 'admin')
  const client = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await client
    .from('user_feedback')
    .select('*, profiles(nickname, first_name, last_name)')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load inbox',
    })
  }
  return data ?? []
})
