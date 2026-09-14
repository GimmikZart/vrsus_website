import { describe, expect, it } from 'vitest'
import type {
  TournamentEntryView,
  TournamentMatchView,
  TournamentRules,
} from '../../shared/types/tournament-view'
import {
  computeStandings,
  formatTournamentScore,
  tournamentRoundLabel,
  tournamentSummary,
} from '../../shared/utils/tournament-standings'

/**
 * La classifica decide chi sale sul podio: e la funzione con il maggior
 * numero di casi limite dell intera scheda torneo e non dipende da Supabase,
 * quindi si verifica qui invece che a mano nell interfaccia.
 *
 * Lo stesso ordinamento vive anche in `tournament_standings` nel database: se
 * i due divergessero, console e app mostrerebbero classifiche diverse dello
 * stesso torneo.
 */
function rules(overrides: Partial<TournamentRules> = {}): TournamentRules {
  return {
    format: 'single_elimination',
    resultKind: 'win_loss',
    standingMetric: 'bracket',
    scoreDirection: null,
    entrySize: 1,
    teamFormation: 'solo',
    groupSize: 2,
    roundsCount: null,
    heatSeeding: 'rotation',
    allowDraw: false,
    placementPoints: [],
    ...overrides,
  }
}

function entry(id: string): TournamentEntryView {
  return {
    id,
    userId: null,
    displayName: id.toUpperCase(),
    firstName: null,
    lastName: null,
    age: null,
    status: 'registered',
    seed: null,
    createdAt: null,
    visibility: 'open',
    membersCount: 1,
    members: [],
  }
}

/** Duello fra due iscritti, con l esito gia scritto sui posti. */
function duel(
  id: string,
  round: number,
  position: number,
  a: string | null,
  b: string | null,
  winner: string | null,
): TournamentMatchView {
  const outcome = (entryId: string | null) =>
    winner === null ? null : entryId === winner ? 'win' : 'loss'

  return {
    id,
    stageNumber: 1,
    roundNumber: round,
    bracketPosition: position,
    status: winner ? 'completed' : 'ready',
    winnerEntryId: winner,
    scheduledAt: null,
    completedAt: null,
    nextMatchId: null,
    nextMatchSlot: null,
    platformName: null,
    participants: [
      {
        entryId: a,
        slot: 1,
        score: null,
        placement: winner ? (a === winner ? 1 : 2) : null,
        outcome: outcome(a),
        pointsAwarded: 0,
      },
      {
        entryId: b,
        slot: 2,
        score: null,
        placement: winner ? (b === winner ? 1 : 2) : null,
        outcome: outcome(b),
        pointsAwarded: 0,
      },
    ],
  }
}

/** Manche a piu concorrenti: ordine di arrivo e punti per posizione. */
function heat(
  id: string,
  round: number,
  position: number,
  order: string[],
  points: number[],
): TournamentMatchView {
  return {
    id,
    stageNumber: 1,
    roundNumber: round,
    bracketPosition: position,
    status: 'completed',
    winnerEntryId: order[0] ?? null,
    scheduledAt: null,
    completedAt: null,
    nextMatchId: null,
    nextMatchSlot: null,
    platformName: null,
    participants: order.map((entryId, index) => ({
      entryId,
      slot: index + 1,
      score: null,
      placement: index + 1,
      outcome: index === 0 ? 'win' : 'loss',
      pointsAwarded: points[index] ?? 0,
    })),
  }
}

/** Tentativo a cronometro: un solo posto e un tempo. */
function attempt(
  id: string,
  round: number,
  position: number,
  entryId: string,
  seconds: number,
): TournamentMatchView {
  return {
    id,
    stageNumber: 1,
    roundNumber: round,
    bracketPosition: position,
    status: 'completed',
    winnerEntryId: entryId,
    scheduledAt: null,
    completedAt: null,
    nextMatchId: null,
    nextMatchSlot: null,
    platformName: null,
    participants: [
      {
        entryId,
        slot: 1,
        score: seconds,
        placement: 1,
        outcome: 'win',
        pointsAwarded: 0,
      },
    ],
  }
}

describe('computeStandings', () => {
  it('senza risultati tiene l ordine di iscrizione e non assegna posizioni', () => {
    const entries = [entry('c'), entry('a'), entry('b')]
    const standings = computeStandings(entries, [], rules())

    expect(standings.map((row) => row.entryId)).toEqual(['c', 'a', 'b'])
    expect(standings.every((row) => row.position === null)).toBe(true)
  })

  it('ordina l eliminazione diretta per round di eliminazione', () => {
    const entries = [entry('a'), entry('b'), entry('c'), entry('d')]
    const matches = [
      duel('m1', 1, 1, 'a', 'b', 'a'),
      duel('m2', 1, 2, 'c', 'd', 'c'),
      duel('m3', 2, 1, 'a', 'c', 'a'),
    ]

    const standings = computeStandings(entries, matches, rules())

    expect(standings.map((row) => row.entryId)).toEqual(['a', 'c', 'b', 'd'])
    expect(standings.map((row) => row.position)).toEqual([1, 2, 3, 4])
  })

  it('mette chi e ancora in gara davanti a chi e gia stato eliminato', () => {
    const entries = [entry('a'), entry('b'), entry('c'), entry('d')]
    const matches = [
      duel('m1', 1, 1, 'a', 'b', 'a'),
      duel('m2', 1, 2, 'c', 'd', null),
      duel('m3', 2, 1, null, null, null),
    ]

    const standings = computeStandings(entries, matches, rules())

    expect(standings.map((row) => row.entryId)).toEqual(['a', 'c', 'd', 'b'])
  })

  it('ordina il girone per vittorie', () => {
    const entries = [entry('a'), entry('b'), entry('c')]
    const matches = [
      duel('m1', 1, 1, 'a', 'b', 'a'),
      duel('m2', 1, 2, 'a', 'c', 'a'),
      duel('m3', 1, 3, 'b', 'c', 'b'),
    ]

    const standings = computeStandings(
      entries,
      matches,
      rules({ format: 'round_robin', standingMetric: 'wins' }),
    )

    expect(standings.map((row) => row.entryId)).toEqual(['a', 'b', 'c'])
    expect(standings[0]?.wins).toBe(2)
    expect(standings[2]?.losses).toBe(2)
  })

  it('somma i punti delle manche, non le vittorie', () => {
    const entries = [entry('a'), entry('b'), entry('c'), entry('d')]
    const matches = [
      // B vince la prima manche, A arriva sempre secondo ma non perde mai
      // terreno: e il caso che l ordinamento per vittorie sbaglierebbe.
      heat('h1', 1, 1, ['b', 'a', 'c', 'd'], [10, 8, 6, 4]),
      heat('h2', 2, 1, ['a', 'c', 'd', 'b'], [10, 8, 6, 4]),
    ]

    const standings = computeStandings(
      entries,
      matches,
      rules({
        format: 'heats',
        resultKind: 'placement',
        standingMetric: 'placement_points',
        groupSize: 4,
        placementPoints: [10, 8, 6, 4],
      }),
    )

    expect(standings.map((row) => row.entryId)).toEqual(['a', 'b', 'c', 'd'])
    expect(standings[0]?.points).toBe(18)
    expect(standings[1]?.points).toBe(14)
  })

  it('ordina i tempi dal piu basso e tiene il migliore di ogni concorrente', () => {
    const entries = [entry('a'), entry('b')]
    const matches = [
      attempt('t1', 1, 1, 'a', 95.5),
      attempt('t2', 1, 2, 'b', 92.1),
      attempt('t3', 2, 1, 'a', 91.2),
      attempt('t4', 2, 2, 'b', 99.9),
    ]

    const standings = computeStandings(
      entries,
      matches,
      rules({
        format: 'time_trial',
        resultKind: 'time',
        standingMetric: 'best_time',
        scoreDirection: 'asc',
        groupSize: 1,
        roundsCount: 2,
      }),
    )

    expect(standings.map((row) => row.entryId)).toEqual(['a', 'b'])
    expect(standings[0]?.bestScore).toBe(91.2)
  })

  it('ignora le entry ritirate', () => {
    const entries = [entry('a'), { ...entry('b'), status: 'withdrawn' }]
    const standings = computeStandings(
      entries,
      [],
      rules({ format: 'round_robin', standingMetric: 'wins' }),
    )

    expect(standings.map((row) => row.entryId)).toEqual(['a'])
  })
})

describe('formatTournamentScore', () => {
  it('scrive i tempi in minuti e secondi e i punti come numero', () => {
    expect(formatTournamentScore(83.421, { resultKind: 'time' })).toBe(
      '1:23.421',
    )
    expect(formatTournamentScore(42.5, { resultKind: 'time' })).toBe('42.500')
    // Niente separatore delle migliaia nell asserzione: dipende dai dati di
    // localizzazione presenti nell ambiente che esegue i test.
    expect(formatTournamentScore(120, { resultKind: 'points' })).toBe('120')
    expect(formatTournamentScore(null, { resultKind: 'points' })).toBe('—')
  })
})

describe('tournamentSummary', () => {
  it('descrive il torneo con la sua stessa configurazione', () => {
    expect(
      tournamentSummary(
        rules({
          format: 'heats',
          resultKind: 'placement',
          standingMetric: 'placement_points',
          groupSize: 4,
          roundsCount: 3,
          placementPoints: [10, 8, 6, 4],
        }),
      ),
    ).toEqual([
      'Singolo',
      '3 manche da 4',
      'punti per posizione: 10/8/6/4',
      'avversari sempre diversi',
    ])

    expect(
      tournamentSummary(
        rules({
          entrySize: 2,
          teamFormation: 'invite',
          format: 'time_trial',
          resultKind: 'time',
          standingMetric: 'best_time',
          scoreDirection: 'asc',
          groupSize: 1,
          roundsCount: 2,
        }),
      ),
    ).toEqual(['Coppie', '2 tentativi a cronometro', 'vince il tempo migliore'])
  })
})

describe('tournamentRoundLabel', () => {
  it('nomina i round dell eliminazione diretta a partire dalla finale', () => {
    expect(tournamentRoundLabel(3, 3, 'single_elimination')).toBe('Finale')
    expect(tournamentRoundLabel(2, 3, 'single_elimination')).toBe('Semifinali')
    expect(tournamentRoundLabel(1, 3, 'single_elimination')).toBe(
      'Quarti di finale',
    )
  })

  it('distingue andata e ritorno nei gironi', () => {
    expect(tournamentRoundLabel(1, 2, 'double_round_robin')).toBe(
      'Girone di andata',
    )
    expect(tournamentRoundLabel(2, 2, 'double_round_robin')).toBe(
      'Girone di ritorno',
    )
    expect(tournamentRoundLabel(1, 1, 'round_robin')).toBe('Girone unico')
  })

  it('nomina manche e tentativi', () => {
    expect(tournamentRoundLabel(2, 3, 'heats')).toBe('Manche 2')
    expect(tournamentRoundLabel(1, 2, 'time_trial')).toBe('Tentativo 1')
  })
})
