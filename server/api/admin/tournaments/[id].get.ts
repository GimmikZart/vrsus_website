import { createError, getRouterParam } from 'h3'

// Scheda torneo per la console: stessa struttura della pagina utente, con in
// piu i dati anagrafici degli iscritti che le view pubbliche non espongono.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, [
    'staff',
    'tournament_admin',
    'admin',
    'super_admin',
  ])

  const tournamentId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid tournament id',
  )

  const detail = await loadTournamentDetail(event, tournamentId)

  if (!detail) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Tournament not found',
    })
  }

  return detail
})
