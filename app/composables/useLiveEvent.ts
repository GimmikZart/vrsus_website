import type { Database } from '~/types/database.types'

// La serata in corso, vista dal cliente.
//
// La console ha il suo `useAdminLiveEvent`, che passa da un endpoint
// service-role; qui basta la view pubblica, perche un evento in corso e
// pubblico per definizione. La chiave e condivisa: la shell la legge una volta
// e chi fa il check-in puo aggiornarla con `refreshNuxtData(LIVE_EVENT_KEY)`.
//
// Non blocca il rendering (`lazy`) e non viene chiesta in SSR (`server: false`):
// l'app si vede subito e la voce Live si accende appena arriva la risposta.

export type LiveEvent = {
  id: string
  title: string
  starts_at: string | null
  ends_at: string | null
  arci_required: boolean | null
}

export const LIVE_EVENT_KEY = 'app-live-event'

export function usePublicLiveEvent() {
  const client = useSupabaseClient<Database>()

  return useAsyncData<LiveEvent | null>(
    LIVE_EVENT_KEY,
    async () => {
      const { data } = await client
        .from('public_events')
        .select('id, title, starts_at, ends_at, arci_required')
        .eq('status', 'running')
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!data?.id) return null

      const { data: booking } = await client
        .from('bookings')
        .select('id')
        .eq('event_id', data.id)
        .eq('status', 'confirmed')
        .limit(1)
        .maybeSingle()

      // La voce Live appartiene alla serata di chi ha un posto confermato, non
      // a chi e ancora in attesa o apre l'app durante un evento altrui.
      if (!booking?.id) return null

      return {
        id: String(data.id),
        title: data.title ?? 'Serata in corso',
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        arci_required: data.arci_required,
      }
    },
    { lazy: true, server: false, default: () => null },
  )
}
