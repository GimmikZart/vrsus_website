/**
 * Primo slug libero a partire da `base`.
 *
 * Gli slug non si scrivono piu a mano: nascono dal nome del record, e due
 * record possono legittimamente chiamarsi allo stesso modo (due postazioni
 * "PlayStation 5", due serate "Torneo del giovedi"). Senza un modo automatico
 * di distinguerli, il secondo inserimento fallirebbe e l'operatore non avrebbe
 * nessun campo da correggere.
 *
 * La progressione parte da 2 perche il primo record tiene lo slug pulito:
 * `torneo-del-giovedi`, poi `torneo-del-giovedi-2`, `-3` e cosi via.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)

  if (!used.has(base)) {
    return base
  }

  let counter = 2
  while (used.has(`${base}-${counter}`)) {
    counter += 1
  }

  return `${base}-${counter}`
}
