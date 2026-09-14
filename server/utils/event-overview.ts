import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import { computeAge } from '~~/shared/utils/tournament-standings'
import type {
  EventOverviewBooking,
  EventOverviewMode,
  EventOverviewPayload,
  EventOverviewPlatform,
  EventOverviewTournament,
} from '~~/shared/types/event-overview'

// Riepilogo operativo di un evento: prenotati, tornei della giornata e
// postazioni con i loro giochi.
//
// Lo usano la dashboard, che sceglie da sola l'evento che conta, e la scheda
// di un evento specifico. Il conteggio dei dati anagrafici e il calcolo della
// prima volta passano da qui una sola volta.

export type OverviewEventRow = {
  id: string
  title: string
  slug: string
  status: string
  event_type: string
  starts_at: string
  ends_at: string
  price_cents: number
  payment_required: boolean
  max_capacity: number | null
  venue_name: string | null
  arci_required: boolean
}

export const OVERVIEW_EVENT_COLUMNS =
  'id, title, slug, status, event_type, starts_at, ends_at, price_cents, payment_required, max_capacity, venue_name, arci_required'

export function emptyEventOverview(
  mode: EventOverviewMode = 'none',
): EventOverviewPayload {
  return {
    mode,
    event: null,
    counts: null,
    bookings: [],
    tournaments: [],
    platforms: [],
  }
}

export async function buildEventOverview(
  event: H3Event,
  eventRow: OverviewEventRow,
  options: { mode: EventOverviewMode; eventStartById: Map<string, number> },
): Promise<EventOverviewPayload> {
  const client = serverSupabaseServiceRole<Database>(event)
  const now = Date.now()
  const mode = options.mode
  const eventStartById = options.eventStartById

  const eventId = eventRow.id
  const eventStart = eventRow.starts_at
    ? new Date(eventRow.starts_at).getTime()
    : now

  const [bookingsResult, platformsLinkResult, tournamentsResult] =
    await Promise.all([
      client
        .from('bookings')
        .select('id, user_id, status, checked_in_at, created_at')
        .eq('event_id', eventId)
        .in('status', ['confirmed', 'waitlisted', 'no_show'])
        .order('created_at'),
      client
        .from('event_platforms')
        .select('id, platform_id, public_name, sort_order')
        .eq('event_id', eventId)
        .eq('active', true)
        .order('sort_order'),
      client
        .from('tournaments')
        .select(
          'id, name, format, status, starts_at, platform_id, game_id, max_entries',
        )
        .eq('event_id', eventId)
        .order('starts_at', { ascending: true, nullsFirst: false }),
    ])

  const bookingRows = bookingsResult.data ?? []
  const userIds = [...new Set(bookingRows.map((row) => row.user_id))]

  const [profilesResult, previousBookingsResult, seasonStartResult] =
    await Promise.all([
      userIds.length
        ? client
            .from('profiles')
            .select(
              'id, display_name, nickname, first_name, last_name, birth_date, arci_card_verified_at',
            )
            .in('id', userIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? client
            .from('bookings')
            .select('user_id, event_id, status')
            .in('user_id', userIds)
            .neq('event_id', eventId)
            .in('status', ['confirmed', 'no_show'])
        : Promise.resolve({ data: [] }),
      // La stagione associativa vive in database: qui serve una volta sola per
      // decidere quali tessere sono ancora valide.
      client.rpc('arci_season_start'),
    ])

  const seasonStart = seasonStartResult.data
    ? new Date(seasonStartResult.data).getTime()
    : Number.POSITIVE_INFINITY

  const profileById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
  )

  // Prima volta da VRSUS: nessuna prenotazione su un evento cominciato prima
  // di questo. Le prenotazioni su eventi futuri non contano, altrimenti chi si
  // iscrive a due date in anticipo risulterebbe gia veterano.
  const returningUserIds = new Set(
    (previousBookingsResult.data ?? [])
      .filter((row) => (eventStartById.get(row.event_id) ?? 0) < eventStart)
      .map((row) => row.user_id),
  )

  // --- Tornei dell evento ---------------------------------------------------
  const tournamentRows = tournamentsResult.data ?? []
  const tournamentIds = tournamentRows.map((row) => row.id)

  const [entriesResult, checkinsResult, matchesResult] = await Promise.all([
    tournamentIds.length
      ? client
          .from('tournament_entries')
          .select('id, tournament_id, status')
          .in('tournament_id', tournamentIds)
      : Promise.resolve({ data: [] }),
    tournamentIds.length
      ? client
          .from('tournament_checkins')
          .select('tournament_id, entry_id')
          .in('tournament_id', tournamentIds)
      : Promise.resolve({ data: [] }),
    tournamentIds.length
      ? client
          .from('matches')
          .select('id, tournament_id, status')
          .in('tournament_id', tournamentIds)
      : Promise.resolve({ data: [] }),
  ])

  const entryRows = (entriesResult.data ?? []).filter(
    (entry) => entry.status !== 'withdrawn',
  )

  const membersResult = entryRows.length
    ? await client
        .from('tournament_entry_members')
        .select('entry_id, user_id')
        .in(
          'entry_id',
          entryRows.map((entry) => entry.id),
        )
    : { data: [] }

  // --- Piattaforme e giochi dell evento -------------------------------------
  const eventPlatformRows = platformsLinkResult.data ?? []

  const { data: gameLinks } = eventPlatformRows.length
    ? await client
        .from('event_platform_games')
        .select('event_platform_id, game_id, sort_order')
        .eq('active', true)
        .in(
          'event_platform_id',
          eventPlatformRows.map((row) => row.id),
        )
        .order('sort_order')
    : { data: [] }

  const platformIds = [
    ...new Set([
      ...eventPlatformRows.map((row) => row.platform_id),
      ...tournamentRows
        .map((row) => row.platform_id)
        .filter((id): id is string => Boolean(id)),
    ]),
  ]
  const gameIds = [
    ...new Set([
      ...(gameLinks ?? []).map((link) => link.game_id),
      ...tournamentRows
        .map((row) => row.game_id)
        .filter((id): id is string => Boolean(id)),
    ]),
  ]

  const [platformsResult, gamesResult] = await Promise.all([
    platformIds.length
      ? client
          .from('platforms')
          .select('id, name, code, image_path')
          .in('id', platformIds)
      : Promise.resolve({ data: [] }),
    gameIds.length
      ? client.from('games').select('id, name, image_path').in('id', gameIds)
      : Promise.resolve({ data: [] }),
  ])

  const platformById = new Map(
    (platformsResult.data ?? []).map((row) => [row.id, row]),
  )
  const gameById = new Map((gamesResult.data ?? []).map((row) => [row.id, row]))

  const platforms: EventOverviewPlatform[] = eventPlatformRows.map((row) => {
    const platform = platformById.get(row.platform_id)
    return {
      id: row.id,
      name: row.public_name ?? platform?.name ?? 'Postazione',
      code: platform?.code ?? null,
      imagePath: platform?.image_path ?? null,
      games: (gameLinks ?? [])
        .filter((link) => link.event_platform_id === row.id)
        .map((link) => {
          const game = gameById.get(link.game_id)
          return {
            id: link.game_id,
            name: game?.name ?? 'Gioco',
            imagePath: game?.image_path ?? null,
          }
        }),
    }
  })

  const tournaments: EventOverviewTournament[] = tournamentRows.map((row) => {
    const entries = entryRows.filter((entry) => entry.tournament_id === row.id)
    const matches = (matchesResult.data ?? []).filter(
      (match) => match.tournament_id === row.id,
    )
    const platform = row.platform_id ? platformById.get(row.platform_id) : null
    return {
      id: row.id,
      name: row.name,
      format: row.format,
      status: row.status,
      startsAt: row.starts_at,
      platformName: platform?.name ?? null,
      platformCode: platform?.code ?? null,
      gameName: row.game_id ? (gameById.get(row.game_id)?.name ?? null) : null,
      entriesCount: entries.length,
      checkedInCount: (checkinsResult.data ?? []).filter(
        (checkin) => checkin.tournament_id === row.id,
      ).length,
      matchesTotal: matches.length,
      matchesPlayed: matches.filter((match) => match.status === 'completed')
        .length,
    }
  })

  const tournamentByEntry = new Map(
    entryRows.map((entry) => [entry.id, entry.tournament_id]),
  )
  const tournamentsByUser = new Map<
    string,
    { id: string; name: string; gameName: string | null }[]
  >()
  for (const member of membersResult.data ?? []) {
    const tournamentId = tournamentByEntry.get(member.entry_id)
    if (!tournamentId) continue
    const tournament = tournaments.find((item) => item.id === tournamentId)
    if (!tournament) continue
    const list = tournamentsByUser.get(member.user_id) ?? []
    list.push({
      id: tournament.id,
      name: tournament.name,
      gameName: tournament.gameName,
    })
    tournamentsByUser.set(member.user_id, list)
  }

  const bookings: EventOverviewBooking[] = bookingRows.map((booking) => {
    const profile = profileById.get(booking.user_id)
    return {
      bookingId: booking.id,
      userId: booking.user_id,
      displayName: profile?.display_name ?? 'Partecipante',
      nickname: profile?.nickname ?? null,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      age: computeAge(profile?.birth_date),
      status: booking.status,
      checkedInAt: booking.checked_in_at,
      createdAt: booking.created_at,
      firstTime: !returningUserIds.has(booking.user_id),
      arciCardValid: profile?.arci_card_verified_at
        ? new Date(profile.arci_card_verified_at).getTime() >= seasonStart
        : false,
      tournaments: tournamentsByUser.get(booking.user_id) ?? [],
    }
  })

  return {
    mode,
    event: {
      id: eventRow.id,
      title: eventRow.title,
      slug: eventRow.slug,
      status: eventRow.status,
      eventType: eventRow.event_type,
      startsAt: eventRow.starts_at,
      endsAt: eventRow.ends_at,
      priceCents: eventRow.price_cents,
      paymentRequired: eventRow.payment_required,
      maxCapacity: eventRow.max_capacity,
      venueName: eventRow.venue_name,
      platformsCount: platforms.length,
      arciRequired: eventRow.arci_required,
    },
    counts: {
      booked: bookings.filter((row) => row.status !== 'no_show').length,
      confirmed: bookings.filter((row) => row.status === 'confirmed').length,
      waitlisted: bookings.filter((row) => row.status === 'waitlisted').length,
      checkedIn: bookings.filter((row) => row.checkedInAt !== null).length,
      noShow: bookings.filter((row) => row.status === 'no_show').length,
      tournaments: tournaments.length,
      missingArci: eventRow.arci_required
        ? bookings.filter(
            (row) => row.status !== 'no_show' && !row.arciCardValid,
          ).length
        : 0,
    },
    bookings,
    tournaments,
    platforms,
  }
}
