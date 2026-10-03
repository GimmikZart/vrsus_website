import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Iscrizione manuale di un utente a un torneo.
//
// La RPC register_tournament_entry iscrive solo chi la chiama e
// tournament_entries non ha una policy di scrittura per gli admin: l
// iscrizione fatta dallo staff passa da qui, dove il ruolo viene verificato
// prima di usare il ruolo di servizio.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['staff', 'admin'])

  const tournamentId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid tournament id',
  )
  const body = await readBody<{ userId?: string }>(event)
  const userId = requireUuid(body?.userId, 'Invalid user id')

  const client = serverSupabaseServiceRole<Database>(event)

  const { data: tournament } = await client
    .from('tournaments')
    .select('id, status, max_entries, entry_size')
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

  const { data: profile } = await client
    .from('profiles')
    .select('id, display_name, nickname')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const { data: existingEntries } = await client
    .from('tournament_entries')
    .select('id, status')
    .eq('tournament_id', tournamentId)

  const activeEntries = (existingEntries ?? []).filter(
    (entry) => entry.status !== 'withdrawn',
  )

  if (
    tournament.max_entries &&
    activeEntries.length >= tournament.max_entries
  ) {
    throw createError({ statusCode: 409, statusMessage: 'TOURNAMENT_FULL' })
  }

  if (activeEntries.length) {
    const { data: members } = await client
      .from('tournament_entry_members')
      .select('entry_id')
      .eq('user_id', userId)
      .in(
        'entry_id',
        activeEntries.map((entry) => entry.id),
      )
    if (members?.length) {
      throw createError({
        statusCode: 409,
        statusMessage: 'USER_ALREADY_IN_TOURNAMENT',
      })
    }
  }

  // In un torneo a squadre l'iscrizione manuale apre una squadra nuova con
  // questa persona come capitano: resta "in formazione" finche non e completa.
  const isTeam = (tournament.entry_size ?? 1) > 1
  const { data: entry, error: entryError } = await client
    .from('tournament_entries')
    .insert({
      tournament_id: tournamentId,
      display_name: isTeam
        ? `Squadra di ${profile.nickname ?? profile.display_name}`
        : (profile.nickname ?? profile.display_name),
      status: isTeam ? 'forming' : 'registered',
    })
    .select('id')
    .single()

  if (entryError || !entry) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to create entry',
    })
  }

  const { error: memberError } = await client
    .from('tournament_entry_members')
    .insert({ entry_id: entry.id, user_id: userId, is_captain: true })

  if (memberError) {
    // Una entry senza membri sarebbe un fantasma in classifica.
    await client.from('tournament_entries').delete().eq('id', entry.id)
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to link user to entry',
    })
  }

  return { entryId: entry.id }
})
