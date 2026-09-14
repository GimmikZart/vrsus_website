import { createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'
import type {
  EventOverviewMode,
  EventOverviewPayload,
} from '~~/shared/types/event-overview'

// Riepilogo di un evento specifico: la stessa lettura della dashboard, ma su
// un evento scelto invece che su quello del momento.
export default defineEventHandler(
  async (event): Promise<EventOverviewPayload> => {
    await requireServerAnyRole(event, ['staff', 'admin', 'super_admin'])

    const eventId = requireUuid(getRouterParam(event, 'id'), 'Invalid event id')
    const client = serverSupabaseServiceRole<Database>(event)

    const { data: eventRows } = await client
      .from('events')
      .select(OVERVIEW_EVENT_COLUMNS)
      .is('archived_at', null)

    const allEvents = eventRows ?? []
    const target = allEvents.find((item) => item.id === eventId)

    if (!target) {
      throw createError({ statusCode: 404, statusMessage: 'Event not found' })
    }

    // Una giornata gia chiusa non e "prossima": la scheda deve mostrarla come
    // storico, con la lista di chi e effettivamente entrato.
    const ended = target.ends_at
      ? new Date(target.ends_at).getTime() < Date.now()
      : false
    const mode: EventOverviewMode =
      target.status === 'running'
        ? 'live'
        : ['completed', 'cancelled'].includes(target.status) || ended
          ? 'past'
          : 'upcoming'

    return await buildEventOverview(event, target, {
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
