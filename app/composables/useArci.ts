import type { Database } from '~/types/database.types'

// Stato della propria tessera ARCI.
//
// La validita dipende dalla stagione associativa, che sta in site_settings e
// non e leggibile dal browser: la risposta arriva da una RPC, mai da un
// calcolo fatto qui.

export type MyArciStatus =
  Database['public']['Functions']['my_arci_status']['Returns'][number]

export function useMyArciStatus() {
  const client = useSupabaseClient<Database>()

  return useAsyncData<MyArciStatus | null>('my-arci-status', async () => {
    const { data, error } = await client.rpc('my_arci_status')
    if (error) return null
    return data?.[0] ?? null
  })
}
