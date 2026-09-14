// Classifica, etichette e spiegazione di un torneo: logica pura, senza
// dipendenze da Vue o da Supabase, cosi la stessa funzione gira nel server
// service-role della console e nel browser dell'app utente.
//
// L'ordinamento deve dare lo stesso risultato di `tournament_standings` nel
// database: se i due divergessero, la console e l'app mostrerebbero due
// classifiche diverse dello stesso torneo.

import type {
  TournamentEntryView,
  TournamentMatchView,
  TournamentParticipantView,
  TournamentRules,
  TournamentStandingRow,
} from '../types/tournament-view'

/**
 * Eta compiuta alla data odierna. Si deriva sempre dalla data di nascita
 * (DEC-024): un'eta memorizzata diventerebbe falsa al compleanno.
 */
export function computeAge(birthDate: string | null | undefined) {
  if (!birthDate) return null
  const born = new Date(birthDate)
  if (Number.isNaN(born.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const monthDelta = today.getMonth() - born.getMonth()
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < born.getDate())
  ) {
    age -= 1
  }
  return age >= 0 && age < 130 ? age : null
}

export function isKnockout(format: string) {
  return format === 'single_elimination'
}

/**
 * Configurazione del torneo dalla riga del database.
 *
 * La leggono sia il server service-role della console sia il browser dell'app
 * dalle view pubbliche: le colonne sono le stesse, e la conversione deve
 * essere una sola perche un valore letto male cambierebbe classifica e
 * spiegazione.
 */
export function tournamentRulesFrom(row: {
  format?: string | null
  result_kind?: string | null
  standing_metric?: string | null
  score_direction?: string | null
  entry_size?: number | null
  team_formation?: string | null
  group_size?: number | null
  rounds_count?: number | null
  heat_seeding?: string | null
  allow_draw?: boolean | null
  scoring_config?: unknown
}): TournamentRules {
  const config =
    row.scoring_config && typeof row.scoring_config === 'object'
      ? (row.scoring_config as Record<string, unknown>)
      : {}
  const rawPoints = config.placement_points

  return {
    format: row.format ?? 'single_elimination',
    resultKind: row.result_kind ?? 'win_loss',
    standingMetric: row.standing_metric ?? 'bracket',
    scoreDirection:
      row.score_direction === 'asc' || row.score_direction === 'desc'
        ? row.score_direction
        : null,
    entrySize: row.entry_size ?? 1,
    teamFormation: row.team_formation ?? 'solo',
    groupSize: row.group_size ?? 2,
    roundsCount: row.rounds_count ?? null,
    heatSeeding: row.heat_seeding ?? 'rotation',
    allowDraw: row.allow_draw ?? false,
    placementPoints: Array.isArray(rawPoints)
      ? rawPoints
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      : [],
  }
}

/** Posti della partita in ordine di arrivo, o di posto se non si e giocato. */
export function orderedParticipants(match: TournamentMatchView) {
  return [...match.participants].sort((first, second) => {
    if (first.placement !== null && second.placement !== null) {
      return first.placement - second.placement
    }
    if (first.placement !== null) return -1
    if (second.placement !== null) return 1
    return first.slot - second.slot
  })
}

export function participantOf(
  match: TournamentMatchView,
  entryId: string | null,
) {
  if (!entryId) return null
  return match.participants.find((part) => part.entryId === entryId) ?? null
}

/** Quante persone sono davvero assegnate ai posti di una partita. */
export function assignedParticipants(match: TournamentMatchView) {
  return match.participants.filter((part) => part.entryId !== null)
}

/**
 * Punteggio leggibile: un tempo si scrive in minuti e secondi, i punti si
 * scrivono come numero. Senza questa distinzione un giro da 83 secondi
 * comparirebbe come "83".
 */
export function formatTournamentScore(
  value: number | null,
  rules: Pick<TournamentRules, 'resultKind'>,
) {
  if (value === null || Number.isNaN(value)) return '—'

  if (rules.resultKind !== 'time') {
    return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(
      value,
    )
  }

  const total = Math.max(0, value)
  const minutes = Math.floor(total / 60)
  const seconds = total - minutes * 60
  const secondsLabel = seconds.toFixed(3).padStart(6, '0')
  return minutes > 0 ? `${minutes}:${secondsLabel}` : `${seconds.toFixed(3)}`
}

/** Distacco dal migliore, per le classifiche a tempo. */
export function formatTimeGap(value: number | null, best: number | null) {
  if (value === null || best === null || value === best) return null
  return `+${(value - best).toFixed(3)}`
}

/**
 * Classifica del torneo.
 *
 * Senza risultati la classifica e semplicemente l'ordine di iscrizione e
 * nessuna posizione viene assegnata: mostrare un podio prima che si giochi
 * sarebbe una bugia.
 */
export function computeStandings(
  entries: TournamentEntryView[],
  matches: TournamentMatchView[],
  rules: Pick<TournamentRules, 'format' | 'standingMetric' | 'scoreDirection'>,
): TournamentStandingRow[] {
  const active = entries.filter((entry) => entry.status !== 'withdrawn')
  const completed = matches.filter((match) => match.status === 'completed')
  const hasResults = completed.length > 0
  const maxRound = matches.reduce(
    (max, match) => Math.max(max, match.roundNumber),
    0,
  )

  type Accumulated = {
    parts: { match: TournamentMatchView; part: TournamentParticipantView }[]
  }
  const byEntry = new Map<string, Accumulated>()
  for (const match of completed) {
    for (const part of match.participants) {
      if (!part.entryId) continue
      const bucket = byEntry.get(part.entryId) ?? { parts: [] }
      bucket.parts.push({ match, part })
      byEntry.set(part.entryId, bucket)
    }
  }

  const rows = active.map<TournamentStandingRow>((entry) => {
    const played = byEntry.get(entry.id)?.parts ?? []
    const scores = played
      .map((item) => item.part.score)
      .filter((score): score is number => score !== null)
    const losses = played.filter((item) => item.part.outcome === 'loss')

    return {
      position: null,
      entryId: entry.id,
      userId: entry.userId,
      displayName: entry.displayName,
      firstName: entry.firstName,
      lastName: entry.lastName,
      age: entry.age,
      status: entry.status,
      played: played.length,
      wins: played.filter((item) => item.part.outcome === 'win').length,
      draws: played.filter((item) => item.part.outcome === 'draw').length,
      losses: losses.length,
      points: played.reduce(
        (sum, item) => sum + (item.part.pointsAwarded ?? 0),
        0,
      ),
      bestScore: scores.length
        ? rules.scoreDirection === 'asc'
          ? Math.min(...scores)
          : Math.max(...scores)
        : null,
      totalScore: scores.reduce((sum, score) => sum + score, 0),
      eliminatedRound: losses.length
        ? Math.max(...losses.map((item) => item.match.roundNumber))
        : null,
      members: entry.members,
    }
  })

  const registrationOrder = new Map(
    entries.map((entry, index) => [entry.id, index]),
  )
  const byRegistration = (a: TournamentStandingRow, b: TournamentStandingRow) =>
    (registrationOrder.get(a.entryId) ?? 0) -
    (registrationOrder.get(b.entryId) ?? 0)

  if (!hasResults) {
    return rows.sort(byRegistration)
  }

  // Il criterio principale dipende dal torneo; gli altri restano come
  // spareggio, nell'ordine in cui li guarderebbe un arbitro.
  const bracketRank = (row: TournamentStandingRow) => {
    if (row.status === 'winner') return 0
    if (row.eliminatedRound === null) return 1
    return maxRound - row.eliminatedRound + 2
  }
  const nullLast = (value: number | null) =>
    value === null ? Number.POSITIVE_INFINITY : value

  rows.sort((a, b) => {
    switch (rules.standingMetric) {
      case 'bracket': {
        const delta = bracketRank(a) - bracketRank(b)
        if (delta !== 0) return delta
        break
      }
      case 'wins': {
        if (a.wins !== b.wins) return b.wins - a.wins
        break
      }
      case 'points_sum':
      case 'placement_points': {
        if (a.points !== b.points) return b.points - a.points
        break
      }
      case 'best_time': {
        const delta = nullLast(a.bestScore) - nullLast(b.bestScore)
        if (delta !== 0) return delta
        break
      }
      case 'total_time': {
        if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore
        break
      }
    }

    if (a.wins !== b.wins) return b.wins - a.wins
    if (a.losses !== b.losses) return a.losses - b.losses
    if (a.played !== b.played) return b.played - a.played
    return byRegistration(a, b)
  })

  return rows.map((row, index) => ({ ...row, position: index + 1 }))
}

/** Etichetta di un round: "Finale", "Manche 2", "Girone di ritorno". */
export function tournamentRoundLabel(
  roundNumber: number,
  totalRounds: number,
  format: string,
) {
  if (format === 'heats') return `Manche ${roundNumber}`
  if (format === 'time_trial') return `Tentativo ${roundNumber}`

  if (!isKnockout(format)) {
    if (format === 'double_round_robin') {
      return roundNumber === 1 ? 'Girone di andata' : 'Girone di ritorno'
    }
    return 'Girone unico'
  }

  const fromEnd = totalRounds - roundNumber
  return (
    {
      0: 'Finale',
      1: 'Semifinali',
      2: 'Quarti di finale',
      3: 'Ottavi di finale',
      4: 'Sedicesimi di finale',
    }[fromEnd] ?? `Round ${roundNumber}`
  )
}

/** Round presenti negli incontri, in ordine crescente. */
export function tournamentRounds(matches: TournamentMatchView[]) {
  return [...new Set(matches.map((match) => match.roundNumber))].sort(
    (a, b) => a - b,
  )
}

export function tournamentEntryLabel(entrySize: number) {
  if (entrySize <= 1) return 'Singolo'
  if (entrySize === 2) return 'Coppie'
  return `Squadre da ${entrySize}`
}

export function tournamentStructureLabel(rules: TournamentRules) {
  switch (rules.format) {
    case 'single_elimination':
      return 'Eliminazione diretta'
    case 'round_robin':
      return 'Tutti contro tutti'
    case 'double_round_robin':
      return 'Tutti contro tutti, andata e ritorno'
    case 'heats':
      return `${rules.roundsCount ?? 1} manche da ${rules.groupSize}`
    case 'time_trial':
      return rules.roundsCount === 1
        ? 'Tentativo a cronometro'
        : `${rules.roundsCount ?? 1} tentativi a cronometro`
    default:
      return 'Torneo'
  }
}

export function tournamentResultLabel(rules: TournamentRules) {
  switch (rules.resultKind) {
    case 'win_loss':
      return 'Vittoria o sconfitta'
    case 'points':
      return rules.scoreDirection === 'asc'
        ? 'Punteggio, vince il piu basso'
        : 'Punteggio, vince il piu alto'
    case 'time':
      return 'Tempo sul giro'
    case 'placement':
      return 'Ordine di arrivo'
    default:
      return 'Risultato'
  }
}

/**
 * La frase che spiega il torneo a chi lo gioca, generata dalla stessa
 * configurazione che governa il motore: non puo raccontare una dinamica
 * diversa da quella che poi succede davvero.
 */
export function tournamentSummary(rules: TournamentRules) {
  const parts: string[] = [
    tournamentEntryLabel(rules.entrySize),
    tournamentStructureLabel(rules),
  ]

  switch (rules.standingMetric) {
    case 'bracket':
      parts.push('chi perde e fuori')
      break
    case 'wins':
      parts.push('vince chi porta a casa piu partite')
      break
    case 'points_sum':
      parts.push(
        rules.scoreDirection === 'asc'
          ? 'vince chi somma il punteggio piu basso'
          : 'vince chi somma piu punti',
      )
      break
    case 'placement_points':
      parts.push(
        rules.placementPoints.length
          ? `punti per posizione: ${rules.placementPoints.join('/')}`
          : 'punti per posizione',
      )
      break
    case 'best_time':
      parts.push('vince il tempo migliore')
      break
    case 'total_time':
      parts.push('vince la somma dei tempi piu bassa')
      break
  }

  if (rules.format === 'heats') {
    parts.push(
      rules.heatSeeding === 'standings'
        ? 'i gruppi seguono la classifica'
        : 'avversari sempre diversi',
    )
  }

  return parts
}

export function tournamentSummarySentence(rules: TournamentRules) {
  return `${tournamentSummary(rules).join(' · ')}.`
}

/** Quanti posti liberi restano in una squadra. */
export function teamOpenSlots(entry: TournamentEntryView, entrySize: number) {
  return Math.max(0, entrySize - entry.membersCount)
}
