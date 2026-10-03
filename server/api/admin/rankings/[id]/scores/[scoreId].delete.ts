import { createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Cancellazione di un record sbagliato. Succede: si digita un tempo storto o
// si sceglie il giocatore sopra quello giusto. La riga si elimina solo se
// appartiene davvero alla sfida indicata.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['staff', 'admin'])

  const rankingId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid ranking id',
  )
  const scoreId = requireUuid(
    getRouterParam(event, 'scoreId'),
    'Invalid score id',
  )

  const client = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await client
    .from('game_scores')
    .delete()
    .eq('id', scoreId)
    .eq('ranking_id', rankingId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to delete score',
    })
  }

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Score not found' })
  }

  return { id: data.id }
})
