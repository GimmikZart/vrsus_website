export type AdminLiveState = {
  live: boolean
  eventId: string | null
  title: string | null
}

export const ADMIN_LIVE_STATE_KEY = 'admin-live-state'

/**
 * Stato live della serata per la shell della console.
 *
 * La chiave e condivisa: la shell la legge una volta e le pagine che avviano o
 * chiudono un evento possono aggiornarla con
 * `refreshNuxtData(ADMIN_LIVE_STATE_KEY)` senza rimontare la barra.
 *
 * Non blocca il rendering (`lazy`) e non viene chiesta in SSR (`server: false`):
 * la console si vede subito, il pallino si accende appena arriva la risposta.
 */
export function useAdminLiveEvent() {
  return useFetch<AdminLiveState>('/api/admin/live-state', {
    key: ADMIN_LIVE_STATE_KEY,
    lazy: true,
    server: false,
    default: (): AdminLiveState => ({
      live: false,
      eventId: null,
      title: null,
    }),
  })
}
