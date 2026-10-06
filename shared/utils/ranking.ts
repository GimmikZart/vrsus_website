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
    ? 'Tempo nel formato minuti:secondi.millisecondi (es. 1:42.380).'
    : 'Punteggio assoluto registrato.'
}

/**
 * Converte il valore digitato nel numero salvato in `game_scores.score`.
 * I ranking a tempo accettano sia `m:ss.mmm` sia i secondi assoluti; quelli a
 * punti accettano il separatore decimale italiano o internazionale.
 */
export function parseRankingScoreInput(
  input: string,
  kind: RankingScoreKind,
): number | null {
  const normalized = input.trim().replace(',', '.')
  if (!normalized) return null

  if (kind !== 'time') {
    const value = Number(normalized)
    return Number.isFinite(value) ? value : null
  }

  const parts = normalized.split(':')
  if (parts.length > 2) return null

  if (parts.length === 1) {
    const seconds = Number(parts[0])
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null
  }

  const minutes = Number(parts[0])
  const seconds = Number(parts[1])
  if (
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    seconds >= 60
  ) {
    return null
  }

  return minutes * 60 + seconds
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
