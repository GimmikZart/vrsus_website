// Come si legge e come si ordina il punteggio di una sfida.
//
// Una sfida registra punti oppure tempi: sono lo stesso numero in database
// (`game_scores.score`), ma un tempo si scrive `1:42.380` e vince il piu
// basso, un punteggio si scrive `128.400` e di solito vince il piu alto. La
// direzione la decide la sfida, non il gioco: sulla stessa pista si puo fare
// una gara al giro piu veloce e una a punti.

export type RankingScoreKind = 'points' | 'time' | string

/** Secondi in `m:ss.mmm`, o `ss.mmm` sotto il minuto. */
export function formatRankingScore(
  value: number | null,
  kind: RankingScoreKind,
) {
  if (value === null || Number.isNaN(value)) return '—'

  if (kind !== 'time') {
    return new Intl.NumberFormat('it-IT', {
      maximumFractionDigits: 3,
    }).format(value)
  }

  const total = Math.max(0, value)
  const minutes = Math.floor(total / 60)
  const seconds = total - minutes * 60
  const secondsLabel = seconds.toFixed(3).padStart(6, '0')

  return minutes > 0 ? `${minutes}:${secondsLabel}` : secondsLabel
}

/** Unita di misura da mostrare accanto al campo di inserimento. */
export function rankingScoreHint(kind: RankingScoreKind) {
  return kind === 'time'
    ? 'Tempo in secondi, con i decimali (es. 102.38).'
    : 'Punteggio assoluto registrato.'
}

export function sortRankingScores<T>(
  rows: T[],
  direction: string,
  value: (row: T) => number,
): T[] {
  return [...rows].sort((first, second) =>
    direction === 'asc'
      ? value(first) - value(second)
      : value(second) - value(first),
  )
}

/**
 * Una sfida e ancora giocabile? Chiusa a mano o scaduta vale come archivio:
 * la classifica resta leggibile ma nessuno la puo piu cambiare.
 */
export function isRankingOpen(ranking: {
  status?: string | null
  ends_at?: string | null
}) {
  if (ranking.status !== 'open') return false
  if (!ranking.ends_at) return true
  const end = new Date(ranking.ends_at).getTime()
  return Number.isNaN(end) ? true : end > Date.now()
}
