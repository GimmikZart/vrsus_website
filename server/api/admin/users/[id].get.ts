import { createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type {
  ProfileDetailView,
  ProfileEventView,
  ProfileRankingRow,
  ProfileTournamentView,
} from '~~/shared/types/profile-view'
import type { TournamentEntryView } from '~~/shared/types/tournament-view'
import {
  computeAge,
  computeStandings,
  tournamentRulesFrom,
} from '~~/shared/utils/tournament-standings'

// Scheda utente della console: anagrafica, eventi, tornei e storico punti.
// Tutto passa dal ruolo di servizio perche profiles, bookings ed events non
// hanno grant per il browser (DEC-005, DEC-018).
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['staff', 'admin', 'super_admin'])

  const userId = requireUuid(getRouterParam(event, 'id'), 'Invalid user id')
  const client = serverSupabaseServiceRole<Database>(event)

  const { data: profile } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const [rolesResult, consentResult, bookingsResult, membersResult] =
    await Promise.all([
      client.from('user_roles').select('roles(code)').eq('user_id', userId),
      client
        .from('guardian_consents')
        .select('id, revoked_at')
        .eq('user_id', userId)
        .maybeSingle(),
      client
        .from('bookings')
        .select('id, event_id, status, checked_in_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      client
        .from('tournament_entry_members')
        .select('entry_id')
        .eq('user_id', userId),
    ])

  // --- Eventi ---------------------------------------------------------------
  const bookings = bookingsResult.data ?? []
  const eventIds = [...new Set(bookings.map((booking) => booking.event_id))]
  const { data: eventRows } = eventIds.length
    ? await client
        .from('events')
        .select('id, title, slug, starts_at, ends_at, status')
        .in('id', eventIds)
    : { data: [] }

  const eventById = new Map((eventRows ?? []).map((row) => [row.id, row]))
  const now = Date.now()

  const events: ProfileEventView[] = bookings
    .map((booking) => {
      const eventRow = eventById.get(booking.event_id)
      const startsAt = eventRow?.starts_at ?? null
      return {
        bookingId: booking.id,
        eventId: booking.event_id,
        title: eventRow?.title ?? 'Evento',
        slug: eventRow?.slug ?? null,
        startsAt,
        endsAt: eventRow?.ends_at ?? null,
        eventStatus: eventRow?.status ?? 'draft',
        bookingStatus: booking.status,
        checkedInAt: booking.checked_in_at,
        upcoming: startsAt ? new Date(startsAt).getTime() >= now : false,
      }
    })
    // Prima i futuri in ordine crescente, poi i passati dal piu recente.
    .sort((a, b) => {
      if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1
      const left = a.startsAt ? new Date(a.startsAt).getTime() : 0
      const right = b.startsAt ? new Date(b.startsAt).getTime() : 0
      return a.upcoming ? left - right : right - left
    })

  // --- Tornei ---------------------------------------------------------------
  const myEntryIds = (membersResult.data ?? []).map((member) => member.entry_id)

  const { data: myEntries } = myEntryIds.length
    ? await client
        .from('tournament_entries')
        .select('id, tournament_id, status')
        .in('id', myEntryIds)
    : { data: [] }

  const tournamentIds = [
    ...new Set((myEntries ?? []).map((entry) => entry.tournament_id)),
  ]

  const [tournamentsResult, allEntriesResult, matchesResult] =
    await Promise.all([
      tournamentIds.length
        ? client.from('tournaments').select('*').in('id', tournamentIds)
        : Promise.resolve({ data: [] }),
      tournamentIds.length
        ? client
            .from('tournament_entries')
            .select(
              'id, tournament_id, display_name, status, seed, created_at, visibility',
            )
            .in('tournament_id', tournamentIds)
            .order('created_at')
        : Promise.resolve({ data: [] }),
      tournamentIds.length
        ? client
            .from('matches')
            .select(
              'id, tournament_id, stage_number, round_number, bracket_position, status, winner_entry_id, scheduled_at, completed_at, next_match_id, next_match_slot, match_participants(entry_id, slot, score, placement, outcome, points_awarded)',
            )
            .in('tournament_id', tournamentIds)
        : Promise.resolve({ data: [] }),
    ])

  const tournamentRows = tournamentsResult.data ?? []
  const [platformsResult, gamesResult, ledgerResult, scoresResult] =
    await Promise.all([
      client.from('platforms').select('id, name, code'),
      client.from('games').select('id, name, platform_id'),
      client
        .from('ranking_points_ledger')
        .select(
          'id, points, reason_code, description, created_at, game_id, tournament_id',
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      client
        .from('game_scores')
        .select('id, score, notes, recorded_at, game_id, tournament_id')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false }),
    ])

  const platformById = new Map(
    (platformsResult.data ?? []).map((row) => [row.id, row]),
  )
  const gameById = new Map((gamesResult.data ?? []).map((row) => [row.id, row]))

  const entriesByTournament = new Map<string, TournamentEntryView[]>()
  for (const entry of allEntriesResult.data ?? []) {
    const list = entriesByTournament.get(entry.tournament_id) ?? []
    list.push({
      id: entry.id,
      userId: null,
      displayName: entry.display_name,
      firstName: null,
      lastName: null,
      age: null,
      status: entry.status,
      seed: entry.seed,
      createdAt: entry.created_at,
      visibility: entry.visibility ?? 'open',
      membersCount: 0,
      members: [],
    })
    entriesByTournament.set(entry.tournament_id, list)
  }

  const matchesByTournament = new Map<
    string,
    ReturnType<typeof toMatchView>[]
  >()
  function toMatchView(match: NonNullable<typeof matchesResult.data>[number]) {
    return {
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
      platformName: null,
      participants: (match.match_participants ?? []).map((participant) => ({
        entryId: participant.entry_id,
        slot: participant.slot,
        score: participant.score === null ? null : Number(participant.score),
        placement: participant.placement,
        outcome: participant.outcome,
        pointsAwarded: Number(participant.points_awarded ?? 0),
      })),
    }
  }
  for (const match of matchesResult.data ?? []) {
    const list = matchesByTournament.get(match.tournament_id) ?? []
    list.push(toMatchView(match))
    matchesByTournament.set(match.tournament_id, list)
  }

  const tournaments: ProfileTournamentView[] = (myEntries ?? [])
    .map((entry) => {
      const tournament = tournamentRows.find(
        (row) => row.id === entry.tournament_id,
      )
      if (!tournament) return null

      const tournamentEntries =
        entriesByTournament.get(tournament.id) ?? ([] as TournamentEntryView[])
      const tournamentMatches = matchesByTournament.get(tournament.id) ?? []
      const standings = computeStandings(
        tournamentEntries,
        tournamentMatches,
        tournamentRulesFrom(tournament),
      )
      const row = standings.find((item) => item.entryId === entry.id)
      const game = tournament.game_id ? gameById.get(tournament.game_id) : null
      const platform = tournament.platform_id
        ? platformById.get(tournament.platform_id)
        : null

      return {
        tournamentId: tournament.id,
        entryId: entry.id,
        name: tournament.name,
        startsAt: tournament.starts_at,
        format: tournament.format,
        status: tournament.status,
        gameName: game?.name ?? null,
        platformName: platform?.name ?? null,
        platformCode: platform?.code ?? null,
        entriesCount: tournamentEntries.filter(
          (item) => item.status !== 'withdrawn',
        ).length,
        position: row?.position ?? null,
        played: row?.played ?? 0,
        wins: row?.wins ?? 0,
        losses: row?.losses ?? 0,
      } satisfies ProfileTournamentView
    })
    .filter((row): row is ProfileTournamentView => row !== null)
    .sort((a, b) => {
      const left = a.startsAt ? new Date(a.startsAt).getTime() : 0
      const right = b.startsAt ? new Date(b.startsAt).getTime() : 0
      return right - left
    })

  // --- Ranking --------------------------------------------------------------
  const tournamentNameById = new Map(
    tournamentRows.map((row) => [row.id, row.name]),
  )

  const ledgerRows: ProfileRankingRow[] = (ledgerResult.data ?? []).map(
    (row) => {
      const game = row.game_id ? gameById.get(row.game_id) : null
      const platform = game?.platform_id
        ? platformById.get(game.platform_id)
        : null
      return {
        id: row.id,
        kind: 'points',
        recordedAt: row.created_at,
        value: row.points,
        gameId: row.game_id,
        gameName: game?.name ?? null,
        platformId: game?.platform_id ?? null,
        platformName: platform?.name ?? null,
        tournamentId: row.tournament_id,
        tournamentName: row.tournament_id
          ? (tournamentNameById.get(row.tournament_id) ?? null)
          : null,
        label: row.description ?? row.reason_code,
      }
    },
  )

  const scoreRows: ProfileRankingRow[] = (scoresResult.data ?? []).map(
    (row) => {
      const game = gameById.get(row.game_id)
      const platform = game?.platform_id
        ? platformById.get(game.platform_id)
        : null
      return {
        id: row.id,
        kind: 'score',
        recordedAt: row.recorded_at,
        value: Number(row.score),
        gameId: row.game_id,
        gameName: game?.name ?? null,
        platformId: game?.platform_id ?? null,
        platformName: platform?.name ?? null,
        tournamentId: row.tournament_id,
        tournamentName: row.tournament_id
          ? (tournamentNameById.get(row.tournament_id) ?? null)
          : null,
        label: row.notes ?? 'Punteggio registrato',
      }
    },
  )

  const ranking = [...ledgerRows, ...scoreRows].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  )

  // --- Anagrafica -----------------------------------------------------------
  // L indirizzo vive in auth.users, non nel profilo: se la lettura non riesce
  // la scheda resta valida senza recapito.
  const email = await client.auth.admin
    .getUserById(userId)
    .then((result) => result.data?.user?.email ?? null)
    .catch(() => null)

  const age = computeAge(profile.birth_date)

  // La validita della tessera dipende dalla stagione associativa, che sta in
  // database: si chiede a lui invece di duplicarne la regola qui.
  const { data: seasonStart } = await client.rpc('arci_season_start')
  const arciCardValid = Boolean(
    profile.arci_card_verified_at &&
    seasonStart &&
    new Date(profile.arci_card_verified_at).getTime() >=
      new Date(seasonStart).getTime(),
  )

  const detail: ProfileDetailView = {
    id: profile.id,
    displayName: profile.display_name,
    nickname: profile.nickname,
    firstName: profile.first_name,
    lastName: profile.last_name,
    birthDate: profile.birth_date,
    age,
    phone: profile.phone,
    email,
    avatarPath: profile.avatar_path,
    createdAt: profile.created_at,
    roles: (rolesResult.data ?? [])
      .map((assignment) =>
        Array.isArray(assignment.roles)
          ? assignment.roles[0]?.code
          : assignment.roles?.code,
      )
      .filter((code): code is string => Boolean(code)),
    isMinor: age !== null && age < 18,
    guardianConsent: Boolean(
      consentResult.data && !consentResult.data.revoked_at,
    ),
    arciCardValid,
    arciVerifiedAt: arciCardValid ? profile.arci_card_verified_at : null,
    totals: {
      events: events.length,
      attended: events.filter((item) => item.checkedInAt !== null).length,
      tournaments: tournaments.length,
      points: ledgerRows.reduce((sum, row) => sum + row.value, 0),
      wins: tournaments.reduce((sum, row) => sum + row.wins, 0),
    },
    events,
    tournaments,
    ranking,
  }

  return detail
})
