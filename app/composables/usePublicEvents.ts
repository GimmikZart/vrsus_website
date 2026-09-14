import type { Database } from '~/types/database.types'

export type PublicEvent = Database['public']['Views']['public_events']['Row']
export type PublicEventPlatform =
  Database['public']['Views']['public_event_platforms']['Row']
export type PublicEventPlatformGame =
  Database['public']['Views']['public_event_platform_games']['Row']

export interface PublicEventDetail {
  event: PublicEvent
  platforms: PublicEventPlatform[]
  games: PublicEventPlatformGame[]
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

  const { data: platforms, error: platformsError } = await supabase
    .from('public_event_platforms')
    .select('*')
    .eq('event_id', event.id)
    .order('sort_order', { ascending: true })

  if (platformsError) {
    throw new Error('Impossibile caricare le postazioni dell’evento.')
  }

  const platformIds = (platforms ?? []).map((item) => item.id).filter(Boolean)

  // Senza postazioni non esistono giochi da mostrare: si evita una query
  // con una lista vuota, che PostgREST rifiuterebbe.
  let games: PublicEventPlatformGame[] = []
  if (platformIds.length) {
    const { data, error } = await supabase
      .from('public_event_platform_games')
      .select('*')
      .in('event_platform_id', platformIds as string[])
      .order('sort_order', { ascending: true })

    if (error) {
      throw new Error('Impossibile caricare i giochi dell’evento.')
    }
    games = data ?? []
  }

  return { event, platforms: platforms ?? [], games }
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
