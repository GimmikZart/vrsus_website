import type { Database } from '~/types/database.types'

export type MyBooking =
  Database['public']['Functions']['get_my_bookings']['Returns'][number]
export type BookingQr =
  Database['public']['Functions']['get_my_booking_qr']['Returns'][number]

export function useMyBookings() {
  const client = useSupabaseClient<Database>()

  return useAsyncData<MyBooking[]>('my-bookings', async () => {
    const { data, error } = await client.rpc('get_my_bookings')

    if (error) {
      throw new Error('Impossibile caricare le tue prenotazioni.')
    }

    return data ?? []
  })
}

export async function createEventBooking(eventId: string) {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client.rpc('create_event_booking', {
    p_event_id: eventId,
  })

  if (error) {
    throw error
  }

  const booking = data?.[0]
  if (!booking) {
    throw new Error('La prenotazione non ha restituito un risultato valido.')
  }

  return booking
}

export async function cancelEventBooking(bookingId: string) {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client.rpc('cancel_event_booking', {
    p_booking_id: bookingId,
  })

  if (error) {
    throw error
  }

  return data?.[0] ?? null
}

export async function getMyBookingQr(bookingId: string) {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client.rpc('get_my_booking_qr', {
    p_booking_id: bookingId,
  })

  if (error) {
    throw error
  }

  return data?.[0] ?? null
}

export async function markBookingNoShow(bookingId: string) {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client.rpc('mark_booking_no_show', {
    p_booking_id: bookingId,
  })

  if (error) {
    throw error
  }

  return data?.[0] ?? null
}

export function getBookingErrorCode(error: unknown) {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : String(error ?? '')

  return message.split(':')[0]?.trim() || 'UNKNOWN'
}

export function formatBookingStatus(status: string) {
  const labels: Record<string, string> = {
    confirmed: 'Confermata',
    waitlisted: 'Lista d’attesa',
    cancelled: 'Annullata',
    no_show: 'Non presentato',
  }

  return labels[status] ?? status
}

export function formatPaymentStatus(status: string) {
  const labels: Record<string, string> = {
    unpaid: 'Da registrare sul posto',
    paid_on_site: 'Pagato sul posto',
    complimentary: 'Omaggio',
    not_required: 'Non richiesto',
  }

  return labels[status] ?? status
}
