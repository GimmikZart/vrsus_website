import { createError, getRouterParam } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Eliminazione definitiva di un evento e di tutto cio che gli appartiene.
//
// Le chiavi esterne di prenotazioni, check-in e tornei sono `restrict`: una
// delete diretta fallirebbe. L'ordine qui sotto e quello imposto dai vincoli,
// non una preferenza: prima i figli che bloccano, poi l'evento. Le postazioni
// dell'evento e i loro giochi cadono in cascata con la riga dell'evento.
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const eventId = requireUuid(getRouterParam(event, 'id'), 'Invalid event id')
  const client = serverSupabaseServiceRole<Database>(event)

  const { data: target } = await client
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .maybeSingle()

  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  const steps = [
    {
      label: 'tournaments',
      run: async () =>
        await client.from('tournaments').delete().eq('event_id', eventId),
    },
    {
      label: 'checkins',
      run: async () =>
        await client.from('event_checkins').delete().eq('event_id', eventId),
    },
    {
      label: 'bookings',
      run: async () =>
        await client.from('bookings').delete().eq('event_id', eventId),
    },
    {
      label: 'notifications',
      run: async () =>
        await client
          .from('notifications')
          .delete()
          .eq('metadata->>event_id', eventId),
    },
    {
      label: 'event',
      run: async () => await client.from('events').delete().eq('id', eventId),
    },
  ]

  for (const step of steps) {
    const { error } = await step.run()
    if (error) {
      throw createError({
        statusCode: 409,
        statusMessage: `Unable to delete event (${step.label})`,
      })
    }
  }

  return { id: eventId, deleted: true }
})
