// Forma normalizzata di un torneo, condivisa fra console e app utente.
//
// La stessa pagina torneo deve poter essere costruita da due sorgenti diverse:
// le view pubbliche (nickname, nessun dato anagrafico) e gli endpoint
// service-role della console (nome, cognome, eta). I componenti leggono solo
// questo tipo, cosi la struttura della pagina resta una sola.

/** Come ci si affronta: struttura delle partite. */
export type TournamentFormat =
  | 'single_elimination'
  | 'round_robin'
  | 'double_round_robin'
  | 'heats'
  | 'time_trial'

/** Cosa si registra a fine partita. */
export type TournamentResultKind = 'win_loss' | 'points' | 'time' | 'placement'

/** Come si ordina la classifica, e quindi quali colonne ha senso mostrare. */
export type TournamentStandingMetric =
  | 'bracket'
  | 'wins'
  | 'points_sum'
  | 'placement_points'
  | 'best_time'
  | 'total_time'

/** Come si compone un iscritto quando non si gioca da soli. */
export type TournamentTeamFormation = 'solo' | 'open' | 'invite' | 'admin'

/**
 * I tre assi che descrivono un torneo. Li leggono classifica, schede partita e
 * frase di spiegazione: e l'unica cosa che devono sapere per comportarsi bene
 * con qualunque tipo di torneo.
 */
export type TournamentRules = {
  format: TournamentFormat | string
  resultKind: TournamentResultKind | string
  standingMetric: TournamentStandingMetric | string
  scoreDirection: 'asc' | 'desc' | null
  entrySize: number
  teamFormation: TournamentTeamFormation | string
  groupSize: number
  roundsCount: number | null
  heatSeeding: 'rotation' | 'standings' | string
  allowDraw: boolean
  placementPoints: number[]
}

export type TournamentMemberView = {
  userId: string | null
  displayName: string
  isCaptain: boolean
}

export type TournamentEntryView = {
  id: string
  /** Popolato solo nei tornei in singolo: con una squadra non c'e un profilo. */
  userId: string | null
  displayName: string
  firstName: string | null
  lastName: string | null
  age: number | null
  status: string
  seed: number | null
  createdAt: string | null
  visibility: string
  membersCount: number
  members: TournamentMemberView[]
}

/** Un posto in una partita: due in un duello, quattro in una manche. */
export type TournamentParticipantView = {
  entryId: string | null
  slot: number
  /** Punti o tempo in secondi, secondo il tipo di risultato del torneo. */
  score: number | null
  placement: number | null
  outcome: string | null
  pointsAwarded: number
}

export type TournamentMatchView = {
  id: string
  stageNumber: number
  roundNumber: number
  bracketPosition: number
  status: string
  winnerEntryId: string | null
  scheduledAt: string | null
  completedAt: string | null
  nextMatchId: string | null
  nextMatchSlot: string | null
  platformName: string | null
  participants: TournamentParticipantView[]
}

export type TournamentStandingRow = {
  /** Posizione in classifica. `null` finche non esiste un risultato. */
  position: number | null
  entryId: string
  userId: string | null
  displayName: string
  firstName: string | null
  lastName: string | null
  age: number | null
  status: string
  played: number
  wins: number
  draws: number
  losses: number
  /** Punti del torneo, non punti VRSUS: somma di quanto assegnato partita per partita. */
  points: number
  /** Miglior risultato singolo: il tempo piu basso o il punteggio piu alto. */
  bestScore: number | null
  totalScore: number
  /** Round in cui la entry e stata eliminata, solo per l'eliminazione diretta. */
  eliminatedRound: number | null
  members: TournamentMemberView[]
}

export type TournamentWinnerView = {
  entryId: string
  userId: string | null
  displayName: string
}

export type TournamentDetailView = {
  id: string
  slug: string
  name: string
  description: string | null
  rules: string | null
  status: string
  startsAt: string | null
  maxEntries: number | null
  rankingEnabled: boolean
  checkinRequired: boolean
  isPublic: boolean
  pointSchemeName: string | null
  platformId: string | null
  platformName: string | null
  platformCode: string | null
  gameId: string | null
  gameName: string | null
  eventId: string | null
  eventTitle: string | null
  /**
   * Tessera ARCI richiesta, ereditata dalla giornata che ospita il torneo.
   * `null` quando il torneo non e agganciato a nessun evento: non c e una
   * porta da superare e quindi non c e niente da dichiarare.
   */
  arciRequired: boolean | null
  entriesCount: number
  checkedInCount: number
  matchesTotal: number
  matchesPlayed: number
  winner: TournamentWinnerView | null
  entries: TournamentEntryView[]
  standings: TournamentStandingRow[]
  matches: TournamentMatchView[]
} & TournamentRules
