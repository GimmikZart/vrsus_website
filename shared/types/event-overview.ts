// Riepilogo operativo di un evento: chi ha prenotato, quali tornei e quali
// postazioni. Vive in shared perche lo scrive un endpoint service-role e lo
// leggono sia la dashboard sia la scheda dell'evento.

/**
 * `past` vale per una giornata gia finita: la lista dei presenti resta
 * leggibile come storico, mentre i comandi della serata non hanno piu senso.
 */
export type EventOverviewMode = 'live' | 'upcoming' | 'past' | 'none'

export type EventOverviewTournament = {
  id: string
  name: string
  format: string
  status: string
  startsAt: string | null
  platformName: string | null
  platformCode: string | null
  gameName: string | null
  entriesCount: number
  checkedInCount: number
  matchesTotal: number
  matchesPlayed: number
}

export type EventOverviewBooking = {
  bookingId: string
  userId: string
  displayName: string
  nickname: string | null
  firstName: string | null
  lastName: string | null
  age: number | null
  status: string
  checkedInAt: string | null
  createdAt: string
  /** Nessuna prenotazione su eventi cominciati prima di questo. */
  firstTime: boolean
  /** Tessera ARCI valida nella stagione associativa corrente. */
  arciCardValid: boolean
  tournaments: { id: string; name: string; gameName: string | null }[]
}

export type EventOverviewPlatform = {
  id: string
  name: string
  code: string | null
  imagePath: string | null
  games: { id: string; name: string; imagePath: string | null }[]
}

export type EventOverviewEvent = {
  id: string
  title: string
  slug: string
  status: string
  eventType: string
  startsAt: string | null
  endsAt: string | null
  priceCents: number
  paymentRequired: boolean
  maxCapacity: number | null
  venueName: string | null
  platformsCount: number
  arciRequired: boolean
}

export type EventOverviewCounts = {
  booked: number
  confirmed: number
  waitlisted: number
  checkedIn: number
  noShow: number
  tournaments: number
  /** Prenotati senza tessera ARCI valida: conta solo dove la tessera serve. */
  missingArci: number
}

export type EventOverviewPayload = {
  mode: EventOverviewMode
  event: EventOverviewEvent | null
  counts: EventOverviewCounts | null
  bookings: EventOverviewBooking[]
  tournaments: EventOverviewTournament[]
  platforms: EventOverviewPlatform[]
}
