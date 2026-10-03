import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Registrazione di un record su una sfida.
//
// `game_scores` non ha grant per il browser (DEC-005): la scrittura passa da
// qui, dove si controlla il ruolo, che la sfida sia ancora aperta e che il
// numero sia un numero. Chi registra resta scritto nella riga.
export default defineEventHandler(async (event) => {
  const { user } = await requireServerAnyRole(event, ['staff', 'admin'])

  const rankingId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid ranking id',
  )
  const body = await readBody<{
    userId?: string
    score?: number | string
    notes?: string | null
  }>(event)

  const userId = requireUuid(body?.userId, 'Invalid user id')
  const score = Number(String(body?.score ?? '').replace(',', '.'))

  if (!Number.isFinite(score)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid score' })
  }

  const client = serverSupabaseServiceRole<Database>(event)

  const { data: ranking } = await client
    .from('game_rankings')
    .select('id, game_id, status, ends_at')
    .eq('id', rankingId)
    .maybeSingle()

  if (!ranking) {
    throw createError({ statusCode: 404, statusMessage: 'Ranking not found' })
  }

  // Una sfida chiusa o scaduta e un archivio: non si scrive piu.
  const expired = ranking.ends_at
    ? new Date(ranking.ends_at).getTime() <= Date.now()
    : false

  if (ranking.status !== 'open' || expired) {
    throw createError({ statusCode: 409, statusMessage: 'RANKING_CLOSED' })
  }

  const notes =
    typeof body?.notes === 'string' && body.notes.trim()
      ? body.notes.trim().slice(0, 500)
      : null

  const { data, error } = await client
    .from('game_scores')
    .insert({
      ranking_id: rankingId,
      game_id: ranking.game_id,
      user_id: userId,
      score,
      notes,
      recorded_by: String(user.sub),
    })
    .select('id')
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to record score',
    })
  }

  return { id: data.id }
})
