import type { Database } from '~/types/database.types'

export type PublicTournament =
  Database['public']['Views']['public_tournaments']['Row']
export type PublicTournamentEntry =
  Database['public']['Views']['public_tournament_entries']['Row']
export type PublicTournamentMatch =
  Database['public']['Views']['public_tournament_matches']['Row']
export type PublicRankingRow =
  Database['public']['Views']['public_ranking']['Row']
export type PublicGameRankingRow =
  Database['public']['Views']['public_ranking_by_game']['Row']
export type PublicGameLeaderboardRow =
  Database['public']['Views']['public_game_leaderboards']['Row']

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

export function tournamentFormatLabel(format: string) {
  return (
    {
      single_elimination: 'Eliminazione diretta',
      round_robin: 'Tutti contro tutti',
      double_round_robin: 'Andata e ritorno',
      heats: 'Manche',
      time_trial: 'Time attack',
    }[format] ?? format
  )
}

export async function createTournamentTeam(
  tournamentId: string,
  name: string,
  visibility: 'open' | 'invite',
) {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client.rpc('create_tournament_team', {
    p_tournament_id: tournamentId,
    p_name: name,
    p_visibility: visibility,
  })
  if (error) throw error
  return data
}

export async function joinTournamentTeam(options: {
  entryId?: string
  code?: string
}) {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client.rpc('join_tournament_team', {
    p_entry_id: options.entryId ?? undefined,
    p_code: options.code ?? undefined,
  })
  if (error) throw error
  return data
}

export async function leaveTournamentTeam(entryId: string) {
  const client = useSupabaseClient<Database>()
  const { error } = await client.rpc('leave_tournament_team', {
    p_entry_id: entryId,
  })
  if (error) throw error
}

/** Messaggi delle RPC di iscrizione, in italiano e senza gergo tecnico. */
export function tournamentRegistrationError(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : ''

  return (
    {
      AUTH_REQUIRED: 'Serve accedere per iscriversi.',
      REGISTRATION_CLOSED: 'Le iscrizioni non sono aperte.',
      ALREADY_REGISTERED: 'Sei gia iscritto a questo torneo.',
      TOURNAMENT_FULL: 'Il torneo ha raggiunto il numero massimo di iscritti.',
      TEAM_TOURNAMENT:
        'Questo torneo si gioca in squadra: creane una o entra in una esistente.',
      SOLO_TOURNAMENT: 'Questo torneo si gioca in singolo.',
      TEAMS_MANAGED_BY_STAFF:
        'Le squadre di questo torneo le compone lo staff.',
      TEAM_NOT_FOUND: 'Squadra non trovata: controlla il codice.',
      TEAM_FULL: 'La squadra e gia al completo.',
      CODE_REQUIRED: 'Questa squadra e a invito: serve il codice del capitano.',
      TOURNAMENT_STARTED: 'Il torneo e gia cominciato.',
      NOT_A_MEMBER: 'Non fai parte di questa squadra.',
    }[message] ?? 'Operazione non riuscita. Riprova.'
  )
}

export function formatTournamentDate(value: string | null) {
  if (!value) return 'Data da definire'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data da definire'
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
