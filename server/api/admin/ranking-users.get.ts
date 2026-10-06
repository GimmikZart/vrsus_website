import type { Database } from '~/types/database.types'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Anche lo staff ne ha bisogno: e chi registra i punteggi delle sfide
  // durante la serata, e deve poter scegliere il giocatore.
  await requireServerAnyRole(event, ['staff', 'admin'])

  const client = serverSupabaseServiceRole<Database>(event)
  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, nickname')
    .order('nickname', { nullsFirst: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load ranking users',
    })
  }

  return data ?? []
})
