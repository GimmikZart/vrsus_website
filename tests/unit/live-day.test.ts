import { describe, expect, it } from 'vitest'
import {
  buildMyLiveTournaments,
  type LiveMatchInput,
} from '../../shared/utils/live-day'

// Durante la serata un giocatore vuole sapere tre cose: quando tocca a lui,
// contro chi e quanto tempo ha. Il calcolo e qui, quindi si verifica qui.

const tournament = {
  id: 't1',
  name: 'Tekken 8 Arena',
  status: 'running',
  startsAt: '2026-09-13T19:00:00Z',
  gameName: 'Tekken 8',
  platformName: 'PlayStation 5',
}

const entries = [
  { id: 'e1', tournamentId: 't1', displayName: 'io', status: 'registered' },
  { id: 'e2', tournamentId: 't1', displayName: 'Marco', status: 'registered' },
  { id: 'e3', tournamentId: 't1', displayName: 'Giulia', status: 'registered' },
  { id: 'e4', tournamentId: 't1', displayName: 'Sara', status: 'registered' },
]

function match(
  id: string,
  round: number,
  position: number,
  status: string,
): LiveMatchInput {
  return {
    id,
    tournamentId: 't1',
    stageNumber: 1,
    roundNumber: round,
    bracketPosition: position,
    status,
    platformName: 'PS5 · postazione 1',
  }
}

describe('buildMyLiveTournaments', () => {
  it('trova la prossima partita, l avversario e quante partite mancano', () => {
    const result = buildMyLiveTournaments({
      tournaments: [tournament],
      entries,
      matches: [
        match('m1', 1, 1, 'completed'),
        match('m2', 1, 2, 'running'),
        match('m3', 2, 1, 'pending'),
      ],
      participants: [
        { matchId: 'm1', entryId: 'e1' },
        { matchId: 'm1', entryId: 'e2' },
        { matchId: 'm2', entryId: 'e3' },
        { matchId: 'm2', entryId: 'e4' },
        { matchId: 'm3', entryId: 'e1' },
        { matchId: 'm3', entryId: 'e3' },
      ],
      myEntryIds: ['e1'],
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.next?.matchId).toBe('m3')
    expect(result[0]?.next?.opponents).toEqual(['Giulia'])
    // Prima della mia resta aperta solo m2: m1 e gia chiusa.
    expect(result[0]?.next?.matchesBefore).toBe(1)
    expect(result[0]?.done).toBe(false)
  })

  it('segnala che il torneo e finito quando non restano partite mie', () => {
    const result = buildMyLiveTournaments({
      tournaments: [tournament],
      entries,
      matches: [match('m1', 1, 1, 'completed'), match('m2', 2, 1, 'pending')],
      participants: [
        { matchId: 'm1', entryId: 'e1' },
        { matchId: 'm1', entryId: 'e2' },
        { matchId: 'm2', entryId: 'e3' },
        { matchId: 'm2', entryId: 'e4' },
      ],
      myEntryIds: ['e1'],
    })

    expect(result[0]?.next).toBeNull()
    expect(result[0]?.done).toBe(true)
  })

  it('tiene il torneo senza calendario, senza dichiararlo finito', () => {
    const result = buildMyLiveTournaments({
      tournaments: [tournament],
      entries,
      matches: [],
      participants: [],
      myEntryIds: ['e1'],
    })

    expect(result[0]?.next).toBeNull()
    expect(result[0]?.done).toBe(false)
  })

  it('ignora i tornei in cui non sono iscritto e le iscrizioni ritirate', () => {
    const withdrawn = entries.map((entry) =>
      entry.id === 'e1' ? { ...entry, status: 'withdrawn' } : entry,
    )

    expect(
      buildMyLiveTournaments({
        tournaments: [tournament],
        entries,
        matches: [],
        participants: [],
        myEntryIds: [],
      }),
    ).toHaveLength(0)

    expect(
      buildMyLiveTournaments({
        tournaments: [tournament],
        entries: withdrawn,
        matches: [],
        participants: [],
        myEntryIds: ['e1'],
      }),
    ).toHaveLength(0)
  })

  it('mostra Da definire finche il tabellone non sa chi arriva', () => {
    const result = buildMyLiveTournaments({
      tournaments: [tournament],
      entries,
      matches: [match('m3', 2, 1, 'pending')],
      participants: [
        { matchId: 'm3', entryId: 'e1' },
        { matchId: 'm3', entryId: null },
      ],
      myEntryIds: ['e1'],
    })

    expect(result[0]?.next?.opponents).toEqual([])
  })
})
