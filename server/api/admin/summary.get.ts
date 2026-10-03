import { createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

// Riepilogo della console: aggrega dati che il browser non puo leggere
// direttamente (capienza, prenotazioni, feedback interni).
export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin'])

  const client = serverSupabaseServiceRole<Database>(event)

  const [events, bookings, profiles, feedback, inquiries, tournaments] =
    await Promise.all([
      client
        .from('events')
        .select('id, title, starts_at, ends_at, max_capacity, status')
        .in('status', ['scheduled', 'running', 'completed'])
        .is('archived_at', null)
        .order('starts_at', { ascending: false })
        .limit(20),
      client.from('bookings').select('event_id, status, checked_in_at'),
      client.from('profiles').select('id'),
      client.from('user_feedback').select('id').eq('status', 'new'),
      client.from('service_inquiries').select('id').eq('status', 'new'),
      client
        .from('tournaments')
        .select('id')
        .in('status', [
          'registration_open',
          'registration_closed',
          'checkin',
          'running',
        ]),
    ])

  if (events.error || bookings.error || profiles.error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load summary',
    })
  }

  const rows = bookings.data ?? []
  const countFor = (eventId: string, status: string) =>
    rows.filter((row) => row.event_id === eventId && row.status === status)
      .length

  const now = Date.now()
  const upcoming = (events.data ?? [])
    .filter(
      (item) => item.starts_at && new Date(item.starts_at).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    )

  const next = upcoming[0] ?? null

  return {
    nextEvent: next
      ? {
          id: next.id,
          title: next.title,
          starts_at: next.starts_at,
          ends_at: next.ends_at,
          max_capacity: next.max_capacity,
          confirmed: countFor(next.id, 'confirmed'),
          waitlisted: countFor(next.id, 'waitlisted'),
          checked_in: rows.filter(
            (row) => row.event_id === next.id && row.checked_in_at !== null,
          ).length,
        }
      : null,
    usersCount: (profiles.data ?? []).length,
    openFeedback: (feedback.data ?? []).length,
    openInquiries: (inquiries.data ?? []).length,
    activeTournaments: (tournaments.data ?? []).length,
    // L'andamento guarda indietro: gli eventi gia iniziati, dal piu recente.
    trend: (events.data ?? [])
      .filter(
        (item) => item.starts_at && new Date(item.starts_at).getTime() < now,
      )
      .slice(0, 6)
      .map((item) => ({
        title: item.title,
        starts_at: item.starts_at,
        confirmed: countFor(item.id, 'confirmed'),
      })),
  }
})
