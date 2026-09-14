// Forma normalizzata della scheda utente. La pagina profilo ha la stessa
// struttura ovunque venga aperta: intestazione anagrafica e tre schede
// (eventi, tornei, ranking).

export type ProfileEventView = {
  bookingId: string
  eventId: string
  title: string
  slug: string | null
  startsAt: string | null
  endsAt: string | null
  eventStatus: string
  bookingStatus: string
  checkedInAt: string | null
  /** true quando l'evento non e ancora iniziato. */
  upcoming: boolean
}

export type ProfileTournamentView = {
  tournamentId: string
  entryId: string
  name: string
  startsAt: string | null
  format: string
  status: string
  gameName: string | null
  platformName: string | null
  platformCode: string | null
  entriesCount: number
  position: number | null
  played: number
  wins: number
  losses: number
}

export type ProfileRankingRow = {
  id: string
  /** `points`: ledger dei punti VRSUS. `score`: record assoluto su un gioco. */
  kind: 'points' | 'score'
  recordedAt: string
  value: number
  gameId: string | null
  gameName: string | null
  platformId: string | null
  platformName: string | null
  tournamentId: string | null
  tournamentName: string | null
  label: string
}

export type ProfileDetailView = {
  id: string
  displayName: string
  nickname: string | null
  firstName: string | null
  lastName: string | null
  birthDate: string | null
  age: number | null
  phone: string | null
  email: string | null
  avatarPath: string | null
  createdAt: string
  roles: string[]
  isMinor: boolean
  guardianConsent: boolean
  /** Tessera ARCI valida nella stagione associativa corrente. */
  arciCardValid: boolean
  /** Quando lo staff ha visto la tessera. Null se non risulta tesserato. */
  arciVerifiedAt: string | null
  totals: {
    events: number
    attended: number
    tournaments: number
    points: number
    wins: number
  }
  events: ProfileEventView[]
  tournaments: ProfileTournamentView[]
  ranking: ProfileRankingRow[]
}
