import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Completamento manuale di una squadra.
//
// Serve in sala: se una squadra resta spaiata, lo staff chiede a qualcuno di
// unirsi e lo aggiunge al volo. Le RPC di squadra iscrivono solo chi le
// chiama, quindi questa strada passa dal ruolo di servizio dopo aver
// verificato il ruolo di chi la usa.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['staff', 'admin'])

  const tournamentId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid tournament id',
  )
  const entryId = requireUuid(
    getRouterParam(event, 'entryId'),
    'Invalid entry id',
  )
  const body = await readBody<{ userId?: string }>(event)
  const userId = requireUuid(body?.userId, 'Invalid user id')

  const client = serverSupabaseServiceRole<Database>(event)

  const { data: tournament } = await client
    .from('tournaments')
    .select('id, status, entry_size')
    .eq('id', tournamentId)
    .maybeSingle()

  if (!tournament) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Tournament not found',
    })
  }
  if (['completed', 'cancelled'].includes(tournament.status)) {
    throw createError({ statusCode: 409, statusMessage: 'TOURNAMENT_CLOSED' })
  }

  const { data: entry } = await client
    .from('tournament_entries')
    .select('id, tournament_id, status')
    .eq('id', entryId)
    .maybeSingle()

  if (!entry || entry.tournament_id !== tournamentId) {
    throw createError({ statusCode: 404, statusMessage: 'Entry not found' })
  }

  const { data: members } = await client
    .from('tournament_entry_members')
    .select('entry_id, user_id')
    .eq('entry_id', entryId)

  if ((members ?? []).length >= tournament.entry_size) {
    throw createError({ statusCode: 409, statusMessage: 'TEAM_FULL' })
  }

  // Una persona sola per torneo, squadra o no.
  const { data: entries } = await client
    .from('tournament_entries')
    .select('id, status')
    .eq('tournament_id', tournamentId)

  const activeEntryIds = (entries ?? [])
    .filter((row) => row.status !== 'withdrawn')
    .map((row) => row.id)

  if (activeEntryIds.length) {
    const { data: existing } = await client
      .from('tournament_entry_members')
      .select('entry_id')
      .eq('user_id', userId)
      .in('entry_id', activeEntryIds)

    if (existing?.length) {
      throw createError({
        statusCode: 409,
        statusMessage: 'USER_ALREADY_IN_TOURNAMENT',
      })
    }
  }

  const { error } = await client
    .from('tournament_entry_members')
    .insert({ entry_id: entryId, user_id: userId, is_captain: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to add member',
    })
  }

  // Squadra al completo: smette di essere in formazione ed entra in gara.
  if ((members ?? []).length + 1 >= tournament.entry_size) {
    await client
      .from('tournament_entries')
      .update({ status: 'registered' })
      .eq('id', entryId)
      .eq('status', 'forming')
  }

  return { entryId, userId }
})
