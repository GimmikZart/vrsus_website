import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type {
  EventOverviewMode,
  EventOverviewPayload,
} from '~~/shared/types/event-overview'

// Dashboard operativa della console.
//
// Qui si decide soltanto quale evento conta adesso: quello in corso se ce n e
// uno in modalita live, altrimenti il prossimo gia programmato. Il riepilogo
// lo compone `buildEventOverview`, lo stesso usato dalla scheda di un evento.
export default defineEventHandler(
  async (event): Promise<EventOverviewPayload> => {
    await requireServerAnyRole(event, ['admin', 'super_admin'])

    const client = serverSupabaseServiceRole<Database>(event)
    const now = Date.now()

    const { data: eventRows } = await client
      .from('events')
      .select(OVERVIEW_EVENT_COLUMNS)
      .is('archived_at', null)
      .order('starts_at', { ascending: true })

    const allEvents = eventRows ?? []

    const liveEvent =
      allEvents.find((item) => item.status === 'running') ?? null
    const nextEvent =
      liveEvent ??
      allEvents.find(
        (item) =>
          item.status === 'scheduled' &&
          item.starts_at &&
          new Date(item.starts_at).getTime() >= now,
      ) ??
      allEvents.filter((item) => item.status === 'scheduled').slice(-1)[0] ??
      null

    const mode: EventOverviewMode = liveEvent
      ? 'live'
      : nextEvent
        ? 'upcoming'
        : 'none'

    if (!nextEvent) return emptyEventOverview(mode)

    return await buildEventOverview(event, nextEvent, {
      mode,
      eventStartById: new Map(
        allEvents.map((item) => [
          item.id,
          item.starts_at ? new Date(item.starts_at).getTime() : 0,
        ]),
      ),
    })
  },
)
