import { describe, expect, it } from 'vitest'
import {
  formatRankingScore,
  parseRankingScoreInput,
} from '../../shared/utils/ranking'

describe('ranking score input', () => {
  it('accetta punti con entrambi i separatori decimali', () => {
    expect(parseRankingScoreInput('128,5', 'points')).toBe(128.5)
    expect(parseRankingScoreInput('128.5', 'points')).toBe(128.5)
  })

  it('converte un tempo formattato in secondi', () => {
    expect(parseRankingScoreInput('1:42.380', 'time')).toBe(102.38)
    expect(parseRankingScoreInput('42,500', 'time')).toBe(42.5)
  })

  it('rifiuta tempi impossibili', () => {
    expect(parseRankingScoreInput('1:60.000', 'time')).toBeNull()
    expect(parseRankingScoreInput('-1:20', 'time')).toBeNull()
    expect(parseRankingScoreInput('abc', 'time')).toBeNull()
  })

  it('formatta nuovamente il valore salvato', () => {
    expect(formatRankingScore(102.38, 'time')).toBe('1:42.380')
  })
})
