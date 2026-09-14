import { createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Una sfida vista dalla console: configurazione, punteggi registrati e nome di
// chi li ha fatti.
//
// `profiles` non ha grant per il browser (DEC-005) e la view pubblica mostra i
// soli nickname: allo staff che registra un record serve il nome vero, quindi
// la lettura passa da qui con il ruolo di servizio.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['staff', 'admin', 'super_admin'])

  const rankingId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid ranking id',
  )
  const client = serverSupabaseServiceRole<Database>(event)

  const { data: ranking } = await client
    .from('game_rankings')
    .select('*')
    .eq('id', rankingId)
    .maybeSingle()

  if (!ranking) {
    throw createError({ statusCode: 404, statusMessage: 'Ranking not found' })
  }

  const [gameResult, scoresResult] = await Promise.all([
    client
      .from('games')
      .select('id, name, platform_id')
      .eq('id', ranking.game_id)
      .maybeSingle(),
    client
      .from('game_scores')
      .select('id, user_id, score, notes, recorded_at, event_id')
      .eq('ranking_id', rankingId)
      .order('recorded_at', { ascending: false }),
  ])

  const scoreRows = scoresResult.data ?? []
  const userIds = [...new Set(scoreRows.map((row) => row.user_id))]

  const { data: profiles } = userIds.length
    ? await client
        .from('profiles')
        .select('id, display_name, nickname, first_name, last_name')
        .in('id', userIds)
    : { data: [] }

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  )

  return {
    ranking,
    game: gameResult.data ?? null,
    scores: scoreRows.map((row) => {
      const profile = profileById.get(row.user_id)
      const fullName = [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .join(' ')
      return {
        id: row.id,
        userId: row.user_id,
        nickname: profile?.nickname ?? profile?.display_name ?? 'Giocatore',
        fullName: fullName || null,
        score: Number(row.score),
        notes: row.notes,
        recordedAt: row.recorded_at,
      }
    }),
  }
})
