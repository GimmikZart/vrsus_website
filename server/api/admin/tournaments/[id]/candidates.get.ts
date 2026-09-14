import { getQuery, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Utenti iscrivibili a un torneo: profili non ancora presenti fra gli iscritti
// attivi. Serve al selettore dell iscrizione manuale, quindi restituisce solo
// quel che la lista deve mostrare.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, [
    'tournament_admin',
    'admin',
    'super_admin',
  ])

  const tournamentId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid tournament id',
  )
  const query = getQuery(event)
  const search = typeof query.q === 'string' ? query.q.trim().slice(0, 60) : ''

  const client = serverSupabaseServiceRole<Database>(event)

  const { data: entries } = await client
    .from('tournament_entries')
    .select('id, status')
    .eq('tournament_id', tournamentId)

  const activeEntryIds = (entries ?? [])
    .filter((entry) => entry.status !== 'withdrawn')
    .map((entry) => entry.id)

  const registeredUserIds = new Set<string>()
  if (activeEntryIds.length) {
    const { data: members } = await client
      .from('tournament_entry_members')
      .select('user_id')
      .in('entry_id', activeEntryIds)
    for (const member of members ?? []) registeredUserIds.add(member.user_id)
  }

  let request = client
    .from('profiles')
    .select('id, display_name, nickname, first_name, last_name')
    .order('display_name')
    .limit(40)

  if (search) {
    const pattern = `%${search}%`
    request = request.or(
      `display_name.ilike.${pattern},nickname.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
    )
  }

  const { data: profiles } = await request

  return (profiles ?? [])
    .filter((profile) => !registeredUserIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
      nickname: profile.nickname,
      firstName: profile.first_name,
      lastName: profile.last_name,
    }))
})
