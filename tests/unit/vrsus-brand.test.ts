import { describe, expect, it } from 'vitest'
import { VRSUS_BRAND } from '../../shared/constants/vrsus'

describe('VRSUS brand foundation', () => {
  it('keeps the approved brand identity and timezone explicit', () => {
    expect(VRSUS_BRAND.name).toBe('VRSUS')
    expect(VRSUS_BRAND.locale).toBe('it-IT')
    expect(VRSUS_BRAND.timezone).toBe('Europe/Rome')
    expect(VRSUS_BRAND.colors.primary).toBe('#ef3340')
    expect(VRSUS_BRAND.colors.secondary).toBe('#2f80ed')
  })
})
