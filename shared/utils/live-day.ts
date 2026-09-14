// "I tuoi tornei" della serata, dal punto di vista di un giocatore.
//
// Durante l'evento a un giocatore non interessa il tabellone: interessa quando
// tocca a lui, contro chi, e quanto tempo ha prima di essere chiamato. Questo
// calcolo prende le righe pubbliche del torneo e risponde a quelle tre
// domande. E una funzione pura perche la stessa risposta serve nella pagina
// Live e, in futuro, nelle notifiche.

export type LiveTournamentInput = {
  id: string
  name: string
  status: string
  startsAt: string | null
  gameName: string | null
  platformName: string | null
}

export type LiveEntryInput = {
  id: string
  tournamentId: string
  displayName: string
  status: string
}

export type LiveMatchInput = {
  id: string
  tournamentId: string
  stageNumber: number
  roundNumber: number
  bracketPosition: number
  status: string
  platformName: string | null
}

export type LiveParticipantInput = {
  matchId: string
  entryId: string | null
}

export type MyLiveMatch = {
  matchId: string
  roundNumber: number
  status: string
  /** Chi trovo dall'altra parte. Vuoto finche il tabellone non lo sa. */
  opponents: string[]
  platformName: string | null
  /** Quante partite del torneo devono finire prima della mia. */
  matchesBefore: number
}

export type MyLiveTournament = {
  tournamentId: string
  name: string
  status: string
  startsAt: string | null
  gameName: string | null
  platformName: string | null
  entryName: string
  next: MyLiveMatch | null
  /** Nessuna partita rimasta: per me il torneo e finito. */
  done: boolean
}

/** Ordine di gioco: fase, poi turno, poi posizione nel tabellone. */
function matchOrder(match: LiveMatchInput) {
  return [match.stageNumber, match.roundNumber, match.bracketPosition]
}

function isBefore(first: LiveMatchInput, second: LiveMatchInput) {
  const left = matchOrder(first)
  const right = matchOrder(second)
  for (let index = 0; index < left.length; index += 1) {
    if (left[index]! !== right[index]!) return left[index]! < right[index]!
  }
  return false
}

const CLOSED_MATCH_STATUSES = ['completed', 'cancelled']

export function buildMyLiveTournaments(input: {
  tournaments: LiveTournamentInput[]
  entries: LiveEntryInput[]
  matches: LiveMatchInput[]
  participants: LiveParticipantInput[]
  /** Le mie iscrizioni: in un torneo a squadre e la squadra, non io. */
  myEntryIds: string[]
}): MyLiveTournament[] {
  const myEntries = new Set(input.myEntryIds)
  const entryById = new Map(input.entries.map((entry) => [entry.id, entry]))

  const participantsByMatch = new Map<string, LiveParticipantInput[]>()
  for (const participant of input.participants) {
    const list = participantsByMatch.get(participant.matchId) ?? []
    list.push(participant)
    participantsByMatch.set(participant.matchId, list)
  }

  const result: MyLiveTournament[] = []

  for (const tournament of input.tournaments) {
    const myEntry = input.entries.find(
      (entry) =>
        entry.tournamentId === tournament.id &&
        myEntries.has(entry.id) &&
        entry.status !== 'withdrawn',
    )
    if (!myEntry) continue

    const tournamentMatches = input.matches
      .filter((match) => match.tournamentId === tournament.id)
      .sort((first, second) => (isBefore(first, second) ? -1 : 1))

    const myMatches = tournamentMatches.filter((match) =>
      (participantsByMatch.get(match.id) ?? []).some(
        (participant) => participant.entryId === myEntry.id,
      ),
    )

    const nextMatch =
      myMatches.find(
        (match) => !CLOSED_MATCH_STATUSES.includes(match.status),
      ) ?? null

    result.push({
      tournamentId: tournament.id,
      name: tournament.name,
      status: tournament.status,
      startsAt: tournament.startsAt,
      gameName: tournament.gameName,
      platformName: tournament.platformName,
      entryName: myEntry.displayName,
      next: nextMatch
        ? {
            matchId: nextMatch.id,
            roundNumber: nextMatch.roundNumber,
            status: nextMatch.status,
            opponents: (participantsByMatch.get(nextMatch.id) ?? [])
              .filter(
                (participant) =>
                  participant.entryId && participant.entryId !== myEntry.id,
              )
              .map(
                (participant) =>
                  entryById.get(String(participant.entryId))?.displayName ??
                  'Da definire',
              ),
            platformName: nextMatch.platformName,
            // Le partite ancora aperte che vengono prima della mia: e il
            // numero che dice quanto tempo ho davvero.
            matchesBefore: tournamentMatches.filter(
              (match) =>
                !CLOSED_MATCH_STATUSES.includes(match.status) &&
                isBefore(match, nextMatch),
            ).length,
          }
        : null,
      done: myMatches.length > 0 && nextMatch === null,
    })
  }

  return result
}
