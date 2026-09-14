import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type {
  TournamentDetailView,
  TournamentEntryView,
  TournamentMatchView,
} from '~~/shared/types/tournament-view'
import {
  computeAge,
  computeStandings,
  tournamentRulesFrom,
} from '~~/shared/utils/tournament-standings'

// I dati anagrafici degli iscritti (nome, cognome, data di nascita) non sono
// leggibili dal browser: la tabella profiles espone in RLS solo la riga
// dell utente corrente. La scheda torneo della console passa quindi da qui,
// con il ruolo di servizio, e resta l unico punto in cui vengono composti.

function unique(values: (string | null)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

export async function loadTournamentDetail(
  event: H3Event,
  tournamentId: string,
): Promise<TournamentDetailView | null> {
  const client = serverSupabaseServiceRole<Database>(event)

  const { data: tournament, error } = await client
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle()

  if (error || !tournament) return null

  const [entriesResult, matchesResult, checkinsResult] = await Promise.all([
    client
      .from('tournament_entries')
      .select('id, display_name, status, seed, created_at, visibility')
      .eq('tournament_id', tournamentId)
      .order('created_at'),
    client
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('round_number')
      .order('bracket_position'),
    client
      .from('tournament_checkins')
      .select('entry_id')
      .eq('tournament_id', tournamentId),
  ])

  const entryRows = entriesResult.data ?? []
  const matchRows = matchesResult.data ?? []
  const checkedInEntryIds = new Set(
    (checkinsResult.data ?? []).map((row) => row.entry_id),
  )

  const [membersResult, participantsResult] = await Promise.all([
    entryRows.length
      ? client
          .from('tournament_entry_members')
          .select('entry_id, user_id, is_captain')
          .in(
            'entry_id',
            entryRows.map((entry) => entry.id),
          )
      : Promise.resolve({ data: [] }),
    matchRows.length
      ? client
          .from('match_participants')
          .select(
            'match_id, entry_id, slot, score, placement, outcome, points_awarded',
          )
          .in(
            'match_id',
            matchRows.map((match) => match.id),
          )
          .order('slot')
      : Promise.resolve({ data: [] }),
  ])

  const members = membersResult.data ?? []
  const profileIds = unique(members.map((member) => member.user_id))

  const profilesResult = profileIds.length
    ? await client
        .from('profiles')
        .select('id, display_name, nickname, first_name, last_name, birth_date')
        .in('id', profileIds)
    : { data: [] }

  const profileById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
  )
  // Con le squadre una entry ha piu membri: il collegamento al profilo resta
  // solo dove l'iscritto e una persona sola.
  const membersByEntry = new Map<string, typeof members>()
  for (const member of members) {
    const list = membersByEntry.get(member.entry_id) ?? []
    list.push(member)
    membersByEntry.set(member.entry_id, list)
  }

  const [platformResult, gameResult, eventResult, schemeResult] =
    await Promise.all([
      tournament.platform_id
        ? client
            .from('platforms')
            .select('id, name, code')
            .eq('id', tournament.platform_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      tournament.game_id
        ? client
            .from('games')
            .select('id, name')
            .eq('id', tournament.game_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      tournament.event_id
        ? client
            .from('events')
            .select('id, title, arci_required')
            .eq('id', tournament.event_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      tournament.point_scheme_id
        ? client
            .from('point_schemes')
            .select('id, name')
            .eq('id', tournament.point_scheme_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  // Il nome della postazione assegnata a un incontro vive sull evento, non sul
  // torneo: i tornei indipendenti semplicemente non lo mostrano.
  const platformNameByEventPlatform = new Map<string, string>()
  const assignedIds = unique(matchRows.map((match) => match.event_platform_id))
  if (assignedIds.length) {
    const { data: links } = await client
      .from('event_platforms')
      .select('id, platform_id, public_name')
      .in('id', assignedIds)
    const linkedPlatformIds = unique(
      (links ?? []).map((link) => link.platform_id),
    )
    const { data: linkedPlatforms } = linkedPlatformIds.length
      ? await client
          .from('platforms')
          .select('id, name')
          .in('id', linkedPlatformIds)
      : { data: [] }
    for (const link of links ?? []) {
      platformNameByEventPlatform.set(
        link.id,
        link.public_name ??
          (linkedPlatforms ?? []).find(
            (platform) => platform.id === link.platform_id,
          )?.name ??
          'Postazione',
      )
    }
  }

  const entries: TournamentEntryView[] = entryRows.map((entry) => {
    const entryMembers = membersByEntry.get(entry.id) ?? []
    const soloUserId =
      entryMembers.length === 1 ? entryMembers[0]!.user_id : null
    const profile = soloUserId ? profileById.get(soloUserId) : undefined
    return {
      id: entry.id,
      userId: soloUserId,
      displayName: profile?.nickname ?? entry.display_name,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      age: computeAge(profile?.birth_date),
      status: checkedInEntryIds.has(entry.id) ? 'checked_in' : entry.status,
      seed: entry.seed,
      createdAt: entry.created_at,
      visibility: entry.visibility ?? 'open',
      membersCount: entryMembers.length,
      members: entryMembers.map((member) => {
        const memberProfile = profileById.get(member.user_id)
        return {
          userId: member.user_id,
          displayName:
            memberProfile?.nickname ?? memberProfile?.display_name ?? 'Membro',
          isCaptain: member.is_captain ?? false,
        }
      }),
    }
  })

  type ParticipantRow = {
    match_id: string
    entry_id: string | null
    slot: number
    score: number | null
    placement: number | null
    outcome: string | null
    points_awarded: number
  }
  const participantsByMatch = new Map<string, ParticipantRow[]>()
  for (const participant of (participantsResult.data ??
    []) as ParticipantRow[]) {
    const list = participantsByMatch.get(participant.match_id) ?? []
    list.push(participant)
    participantsByMatch.set(participant.match_id, list)
  }

  const matches: TournamentMatchView[] = matchRows.map((match) => ({
    id: match.id,
    stageNumber: match.stage_number,
    roundNumber: match.round_number,
    bracketPosition: match.bracket_position,
    status: match.status,
    winnerEntryId: match.winner_entry_id,
    scheduledAt: match.scheduled_at,
    completedAt: match.completed_at,
    nextMatchId: match.next_match_id,
    nextMatchSlot: match.next_match_slot,
    platformName: match.event_platform_id
      ? (platformNameByEventPlatform.get(match.event_platform_id) ?? null)
      : null,
    participants: (participantsByMatch.get(match.id) ?? []).map(
      (participant) => ({
        entryId: participant.entry_id,
        slot: participant.slot,
        score: participant.score === null ? null : Number(participant.score),
        placement: participant.placement,
        outcome: participant.outcome,
        pointsAwarded: Number(participant.points_awarded ?? 0),
      }),
    ),
  }))

  const rules = tournamentRulesFrom(tournament)
  const standings = computeStandings(entries, matches, rules)
  const totalRounds = matches.reduce(
    (max, match) => Math.max(max, match.roundNumber),
    0,
  )
  const final =
    tournament.format === 'single_elimination'
      ? matches.find(
          (match) =>
            match.roundNumber === totalRounds &&
            match.status === 'completed' &&
            match.winnerEntryId,
        )
      : undefined
  const winnerEntryId =
    final?.winnerEntryId ??
    (tournament.status === 'completed' ? (standings[0]?.entryId ?? null) : null)
  const winnerRow = standings.find((row) => row.entryId === winnerEntryId)

  return {
    id: tournament.id,
    slug: tournament.slug,
    name: tournament.name,
    description: tournament.description,
    rules: tournament.rules,
    status: tournament.status,
    startsAt: tournament.starts_at,
    maxEntries: tournament.max_entries,
    rankingEnabled: tournament.ranking_enabled,
    checkinRequired: tournament.checkin_required,
    isPublic: tournament.is_public,
    pointSchemeName: schemeResult.data?.name ?? null,
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
    checkedInCount: checkedInEntryIds.size,
    matchesTotal: matches.length,
    matchesPlayed: matches.filter((match) => match.status === 'completed')
      .length,
    winner: winnerRow
      ? {
          entryId: winnerRow.entryId,
          userId: winnerRow.userId,
          displayName: winnerRow.displayName,
        }
      : null,
    entries,
    standings,
    matches,
    ...rules,
  }
}
