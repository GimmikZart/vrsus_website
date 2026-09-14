import type { Database } from '~/types/database.types'

// Le letture pubbliche del catalogo passano dalle view di proiezione: le
// tabelle grezze non hanno grant per il browser e conterrebbero capienza e
// flag interni (DEC-005, DEC-021).
export type PublicPlatform =
  Database['public']['Views']['public_platforms']['Row']
export type PublicGame = Database['public']['Views']['public_games']['Row']
export type PublicServicePage =
  Database['public']['Views']['public_service_pages']['Row']

export function usePublicPlatforms() {
  const supabase = useSupabaseClient<Database>()

  return useAsyncData<PublicPlatform[]>('public-platforms', async () => {
    const { data, error } = await supabase
      .from('public_platforms')
      .select('*')
      .order('category_name', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      throw new Error('Impossibile caricare le postazioni.')
    }

    return data ?? []
  })
}

export function usePublicGames() {
  const supabase = useSupabaseClient<Database>()

  return useAsyncData<PublicGame[]>('public-games', async () => {
    const { data, error } = await supabase
      .from('public_games')
      .select('*')
      .order('platform_name', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      throw new Error('Impossibile caricare i giochi.')
    }

    return data ?? []
  })
}

export async function fetchPublicPlatformDetail(slug: string) {
  const supabase = useSupabaseClient<Database>()

  const { data: platform, error } = await supabase
    .from('public_platforms')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw new Error('Impossibile caricare la postazione.')
  }

  if (!platform?.id) return null

  const { data: games, error: gamesError } = await supabase
    .from('public_games')
    .select('*')
    .eq('platform_id', platform.id)
    .order('name', { ascending: true })

  if (gamesError) {
    throw new Error('Impossibile caricare i giochi della postazione.')
  }

  return { platform, games: games ?? [] }
}

export function usePublicServicePages() {
  const supabase = useSupabaseClient<Database>()

  return useAsyncData<PublicServicePage[]>('public-service-pages', async () => {
    const { data, error } = await supabase
      .from('public_service_pages')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true })

    if (error) {
      throw new Error('Impossibile caricare i servizi.')
    }

    return data ?? []
  })
}

export function formatPlayerRange(
  min: number | null,
  max: number | null,
): string {
  if (min && max && min !== max) return `${min}-${max} giocatori`
  if (max) return max === 1 ? '1 giocatore' : `${max} giocatori`
  if (min) return min === 1 ? '1 giocatore' : `da ${min} giocatori`
  return 'Numero giocatori variabile'
}

export function formatPublicContentDate(value: string | null) {
  if (!value) return 'Data non disponibile'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data non disponibile'

  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
