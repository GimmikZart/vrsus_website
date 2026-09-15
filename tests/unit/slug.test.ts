import { describe, expect, it } from 'vitest'
import { uniqueSlug } from '../../shared/utils/slug'

describe('uniqueSlug', () => {
  it('lascia lo slug pulito quando e libero', () => {
    expect(uniqueSlug('playstation-5', [])).toBe('playstation-5')
    expect(uniqueSlug('playstation-5', ['altro', 'playstation-4'])).toBe(
      'playstation-5',
    )
  })

  it('numera dal secondo record in poi', () => {
    expect(uniqueSlug('test-agente', ['test-agente'])).toBe('test-agente-2')
    expect(uniqueSlug('test-agente', ['test-agente', 'test-agente-2'])).toBe(
      'test-agente-3',
    )
  })

  it('riempie i buchi lasciati da record cancellati', () => {
    // `-2` cancellato: il numero torna disponibile invece di crescere.
    expect(uniqueSlug('serata', ['serata', 'serata-3'])).toBe('serata-2')
  })

  it('non confonde uno slug che inizia allo stesso modo', () => {
    // La query cerca per prefisso, quindi fra i candidati arrivano anche
    // slug piu lunghi che non sono varianti numerate.
    expect(uniqueSlug('torneo', ['torneo-di-natale'])).toBe('torneo')
  })
})
