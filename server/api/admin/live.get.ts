import { getQuery, createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['staff', 'admin', 'super_admin'])

  const query = getQuery(event)
  const requestedEventId =
    typeof query.eventId === 'string' ? query.eventId : null
  const client = serverSupabaseServiceRole<Database>(event)

  const { data: events, error: eventsError } = await client
    .from('events')
    .select('id, title, starts_at, status, max_capacity')
    .in('status', ['scheduled', 'running', 'completed'])
    .order('starts_at', { ascending: true })

  if (eventsError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load events',
    })
  }

  const selectedEventId = requestedEventId ?? events?.[0]?.id ?? null
  if (!selectedEventId) {
    return {
      events: events ?? [],
      selectedEvent: null,
      bookings: [],
      metrics: null,
    }
  }

  const selectedEvent = events?.find((item) => item.id === selectedEventId)
  if (!selectedEvent) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }

  const { data: bookings, error: bookingsError } = await client
    .from('bookings')
    .select(
      'id, status, payment_status, checked_in_at, created_at, profiles(display_name)',
    )
    .eq('event_id', selectedEventId)
    .order('created_at', { ascending: true })

  if (bookingsError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load bookings',
    })
  }

  const rows = (bookings ?? []).map((booking) => ({
    id: booking.id,
    status: booking.status,
    payment_status: booking.payment_status,
    checked_in_at: booking.checked_in_at,
    created_at: booking.created_at,
    display_name: Array.isArray(booking.profiles)
      ? (booking.profiles[0]?.display_name ?? 'Partecipante')
      : (booking.profiles?.display_name ?? 'Partecipante'),
  }))

  return {
    events: events ?? [],
    selectedEvent,
    bookings: rows,
    metrics: {
      confirmed: rows.filter((booking) => booking.status === 'confirmed')
        .length,
      waitlisted: rows.filter((booking) => booking.status === 'waitlisted')
        .length,
      checkedIn: rows.filter((booking) => booking.checked_in_at !== null)
        .length,
      paid: rows.filter((booking) => booking.payment_status !== 'unpaid')
        .length,
    },
  }
})
