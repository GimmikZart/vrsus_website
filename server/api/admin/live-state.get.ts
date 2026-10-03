import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// C e un evento in corso adesso?
//
// Lo chiede la shell della console per accendere il pallino sulla voce Live
// della tab bar. Volutamente minimo: la dashboard carica gia il riepilogo
// completo, qui serve solo una risposta leggera da ogni pagina della console.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['staff', 'admin'])

  const client = serverSupabaseServiceRole<Database>(event)

  const { data } = await client
    .from('events')
    .select('id, title')
    .eq('status', 'running')
    .is('archived_at', null)
    .order('starts_at', { ascending: true })
    .limit(1)

  const liveEvent = data?.[0] ?? null

  return {
    live: Boolean(liveEvent),
    eventId: liveEvent?.id ?? null,
    title: liveEvent?.title ?? null,
  }
})
