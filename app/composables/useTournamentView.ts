import type { Database } from '~/types/database.types'
import type {
  TournamentDetailView,
  TournamentEntryView,
  TournamentMatchView,
} from '~~/shared/types/tournament-view'
import {
  computeStandings,
  tournamentRulesFrom,
} from '~~/shared/utils/tournament-standings'

// Scheda torneo costruita dalle view pubbliche, per la shell utente.
//
// La console usa lo stesso tipo ma lo compone lato server con i dati
// anagrafici: qui restano i soli nickname, che e quanto le view espongono.
export async function fetchPublicTournamentView(
  tournamentId: string,
): Promise<TournamentDetailView | null> {
  const client = useSupabaseClient<Database>()

  const { data: tournament } = await client
    .from('public_tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle()

  if (!tournament?.id) return null

  const [
    entriesResult,
    membersResult,
    matchesResult,
    participantsResult,
    gameResult,
    platformResult,
    eventResult,
  ] = await Promise.all([
    client
      .from('public_tournament_entries')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at'),
    client
      .from('public_tournament_entry_members')
      .select('*')
      .eq('tournament_id', tournamentId),
    client
      .from('public_tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round_number')
      .order('bracket_position'),
    client
      .from('public_match_participants')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('slot'),
    tournament.game_id
      ? client
          .from('public_games')
          .select('id, name')
          .eq('id', tournament.game_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    tournament.platform_id
      ? client
          .from('public_platforms')
          .select('id, name, code')
          .eq('id', tournament.platform_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    tournament.event_id
      ? client
          .from('public_events')
          .select('id, title, arci_required')
          .eq('id', tournament.event_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const membersByEntry = new Map<
    string,
    { userId: string | null; displayName: string; isCaptain: boolean }[]
  >()
  for (const member of membersResult.data ?? []) {
    if (!member.entry_id) continue
    const list = membersByEntry.get(String(member.entry_id)) ?? []
    list.push({
      userId: member.user_id,
      displayName: member.nickname ?? member.display_name ?? 'Membro',
      isCaptain: member.is_captain ?? false,
    })
    membersByEntry.set(String(member.entry_id), list)
  }

  const entries: TournamentEntryView[] = (entriesResult.data ?? []).map(
    (entry) => {
      const members = membersByEntry.get(String(entry.id)) ?? []
      return {
        id: String(entry.id),
        // Nell'app utente le schede profilo non si aprono dalla classifica:
        // restano i nickname, come previsto dalla V2.
        userId: null,
        displayName: entry.display_name ?? 'Partecipante',
        firstName: null,
        lastName: null,
        age: null,
        status: entry.status ?? 'registered',
        seed: entry.seed,
        createdAt: entry.created_at,
        visibility: entry.visibility ?? 'open',
        membersCount: entry.members_count ?? members.length,
        members,
      }
    },
  )

  const participantsByMatch = new Map<
    string,
    NonNullable<typeof participantsResult.data>
  >()
  for (const participant of participantsResult.data ?? []) {
    if (!participant.match_id) continue
    const list = participantsByMatch.get(String(participant.match_id)) ?? []
    list.push(participant)
    participantsByMatch.set(String(participant.match_id), list)
  }

  const matches: TournamentMatchView[] = (matchesResult.data ?? []).map(
    (match) => ({
      id: String(match.id),
      stageNumber: match.stage_number ?? 1,
      roundNumber: match.round_number ?? 1,
      bracketPosition: match.bracket_position ?? 1,
      status: match.status ?? 'pending',
      winnerEntryId: match.winner_entry_id,
      scheduledAt: match.scheduled_at,
      completedAt: match.completed_at,
      nextMatchId: match.next_match_id,
      nextMatchSlot: match.next_match_slot,
      platformName: null,
      participants: (participantsByMatch.get(String(match.id)) ?? []).map(
        (participant) => ({
          entryId: participant.entry_id,
          slot: participant.slot ?? 1,
          score: participant.score === null ? null : Number(participant.score),
          placement: participant.placement,
          outcome: participant.outcome,
          pointsAwarded: Number(participant.points_awarded ?? 0),
        }),
      ),
    }),
  )

  const rules = tournamentRulesFrom(tournament)
  const standings = computeStandings(entries, matches, rules)
  const winnerEntryId =
    tournament.status === 'completed' ? (standings[0]?.entryId ?? null) : null
  const winnerRow = standings.find((row) => row.entryId === winnerEntryId)

  return {
    id: String(tournament.id),
    slug: tournament.slug ?? '',
    name: tournament.name ?? 'Torneo',
    description: tournament.description,
    rules: tournament.rules,
    status: tournament.status ?? 'draft',
    startsAt: tournament.starts_at,
    maxEntries: tournament.max_entries,
    rankingEnabled: tournament.ranking_enabled ?? true,
    checkinRequired: tournament.checkin_required ?? true,
    isPublic: tournament.is_public ?? true,
    pointSchemeName: null,
    platformId: tournament.platform_id,
    platformName: platformResult.data?.name ?? null,
    platformCode: platformResult.data?.code ?? null,
    gameId: tournament.game_id,
    gameName: gameResult.data?.name ?? null,
    eventId: tournament.event_id,
    eventTitle: eventResult.data?.title ?? null,
    arciRequired: eventResult.data?.arci_required ?? null,
    entriesCount: entries.filter((entry) => entry.status !== 'withdrawn')
      .length,
    checkedInCount: entries.filter((entry) => entry.status === 'checked_in')
      .length,
    matchesTotal: matches.length,
    matchesPlayed: matches.filter((match) => match.status === 'completed')
      .length,
    winner: winnerRow
      ? {
          entryId: winnerRow.entryId,
          userId: null,
          displayName: winnerRow.displayName,
        }
      : null,
    entries,
    standings,
    matches,
    ...rules,
  }
}
