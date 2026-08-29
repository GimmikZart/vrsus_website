import type { Database } from '~/types/database.types'

export type PublicEvent = Database['public']['Views']['public_events']['Row']
export type PublicEventStation =
  Database['public']['Views']['public_event_stations']['Row']
export type PublicEventActivity =
  Database['public']['Views']['public_event_activities']['Row']

export interface PublicEventDetail {
  event: PublicEvent
  stations: PublicEventStation[]
  activities: PublicEventActivity[]
}

export function usePublicEvents() {
  const supabase = useSupabaseClient<Database>()

  return useAsyncData<PublicEvent[]>('public-events', async () => {
    const { data, error } = await supabase
      .from('public_events')
      .select('*')
      .order('starts_at', { ascending: true })

    if (error) {
      throw new Error('Impossibile caricare gli eventi pubblici.')
    }

    return data ?? []
  })
}

export function usePublicNextEvent() {
  const supabase = useSupabaseClient<Database>()

  return useAsyncData<PublicEvent | null>('public-next-event', async () => {
    const { data, error } = await supabase
      .from('public_events')
      .select('*')
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error('Impossibile caricare il prossimo evento.')
    }

    return data
  })
}

export async function fetchPublicEventDetail(
  slug: string,
): Promise<PublicEventDetail | null> {
  const supabase = useSupabaseClient<Database>()
  const { data: event, error: eventError } = await supabase
    .from('public_events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (eventError) {
    throw new Error('Impossibile caricare il dettaglio dell’evento.')
  }

  if (!event?.id) {
    return null
  }

  const [stationsResult, activitiesResult] = await Promise.all([
    supabase
      .from('public_event_stations')
      .select('*')
      .eq('event_id', event.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('public_event_activities')
      .select('*')
      .eq('event_id', event.id)
      .order('starts_at', { ascending: true }),
  ])

  if (stationsResult.error || activitiesResult.error) {
    throw new Error('Impossibile caricare le esperienze dell’evento.')
  }

  return {
    event,
    stations: stationsResult.data ?? [],
    activities: activitiesResult.data ?? [],
  }
}

export function formatPublicEventDate(
  startsAt: string | null,
  endsAt?: string | null,
) {
  if (!startsAt) {
    return 'Data da definire'
  }

  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) {
    return 'Data da definire'
  }

  const date = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(start)
  const startTime = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(start)

  if (!endsAt) {
    return `${date} · ${startTime}`
  }

  const end = new Date(endsAt)
  const endTime = Number.isNaN(end.getTime())
    ? null
    : new Intl.DateTimeFormat('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(end)

  return `${date} · ${startTime}${endTime ? `–${endTime}` : ''}`
}

export function formatPublicEventPrice(
  priceCents: number | null,
  paymentRequired: boolean | null,
) {
  if (paymentRequired === false) {
    return 'Accesso gratuito'
  }

  if (paymentRequired === null) {
    return 'Accesso da definire'
  }

  if (priceCents === null) {
    return 'Prezzo da definire'
  }

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(priceCents / 100)
}

export function publicEventsRobots() {
  const config = useRuntimeConfig()
  return config.public.appEnv === 'production'
    ? 'index, follow'
    : 'noindex, nofollow'
}
