import type { Database } from '~/types/database.types'

export type PublicTournament =
  Database['public']['Views']['public_tournaments']['Row']
export type PublicTournamentEntry =
  Database['public']['Views']['public_tournament_entries']['Row']
export type PublicTournamentMatch =
  Database['public']['Views']['public_tournament_matches']['Row']
export type PublicRankingRow =
  Database['public']['Views']['public_ranking']['Row']
export type PublicActivityRankingRow =
  Database['public']['Views']['public_ranking_by_activity']['Row']

export function tournamentStatusLabel(status: string) {
  return (
    {
      draft: 'Bozza',
      registration_open: 'Iscrizioni aperte',
      registration_closed: 'Iscrizioni chiuse',
      checkin: 'Check-in aperto',
      running: 'In corso',
      completed: 'Concluso',
      cancelled: 'Annullato',
    }[status] ?? status
  )
}

export function tournamentMatchStatusLabel(status: string) {
  return (
    {
      pending: 'In attesa',
      ready: 'Pronto',
      called: 'Chiamato',
      running: 'In corso',
      completed: 'Concluso',
      cancelled: 'Annullato',
    }[status] ?? status
  )
}

export async function registerTournamentEntry(tournamentId: string) {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client.rpc('register_tournament_entry', {
    p_tournament_id: tournamentId,
  })
  if (error) throw error
  return data
}

export async function withdrawTournamentEntry(tournamentId: string) {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client.rpc('withdraw_tournament_entry', {
    p_tournament_id: tournamentId,
  })
  if (error) throw error
  return data
}

export async function checkInTournamentEntry(entryId: string) {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client.rpc('check_in_tournament_entry', {
    p_entry_id: entryId,
  })
  if (error) throw error
  return data
}
