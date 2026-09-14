import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * In Nuxt una pagina `X.vue` affiancata alla cartella `X/` diventa il layout
 * genitore delle sottorotte e deve contenere `<NuxtPage />`. Senza, le
 * sottorotte renderizzano la pagina genitore e la rotta cambia senza che il
 * contenuto si aggiorni. La convenzione del progetto e `X/index.vue`
 * (DEC-019): questo test impedisce che il problema si ripresenti.
 */
function collectDirectories(root: string): string[] {
  const found: string[] = []

  function walk(current: string) {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) {
        found.push(full)
        walk(full)
      }
    }
  }

  walk(root)
  return found
}

describe('struttura delle rotte', () => {
  it('non ha pagine indice affiancate alla cartella omonima', () => {
    const conflicts = collectDirectories('app/pages').filter((directory) =>
      existsSync(`${directory}.vue`),
    )

    expect(conflicts).toEqual([])
  })
})
