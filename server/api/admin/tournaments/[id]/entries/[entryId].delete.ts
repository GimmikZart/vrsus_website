import { createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Rimozione di un iscritto.
//
// Se la entry compare gia in un incontro non viene cancellata ma ritirata:
// cancellarla lascerebbe un tabellone con caselle vuote e risultati orfani.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, [
    'tournament_admin',
    'admin',
    'super_admin',
  ])

  const tournamentId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid tournament id',
  )
  const entryId = requireUuid(
    getRouterParam(event, 'entryId'),
    'Invalid entry id',
  )

  const client = serverSupabaseServiceRole<Database>(event)

  const { data: entry } = await client
    .from('tournament_entries')
    .select('id, tournament_id, status')
    .eq('id', entryId)
    .maybeSingle()

  if (!entry || entry.tournament_id !== tournamentId) {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }

  const { data: usedInMatches } = await client
    .from('match_participants')
    .select('id, matches!inner(tournament_id)')
    .eq('entry_id', entryId)
    .eq('matches.tournament_id', tournamentId)
    .limit(1)

  if (usedInMatches?.length) {
    const { error } = await client
      .from('tournament_entries')
      .update({ status: 'withdrawn' })
      .eq('id', entryId)

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to withdraw entry',
      })
    }

    return { entryId, outcome: 'withdrawn' as const }
  }

  const { error } = await client
    .from('tournament_entries')
    .delete()
    .eq('id', entryId)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to delete entry',
    })
  }

  return { entryId, outcome: 'deleted' as const }
})
