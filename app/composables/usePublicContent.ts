import type { Database } from '~/types/database.types'

export type PublicActivity =
  Database['public']['Views']['public_activities']['Row']
export type PublicNewsPost =
  Database['public']['Views']['public_news_posts']['Row']
export type PublicServicePage =
  Database['public']['Views']['public_service_pages']['Row']

export function usePublicActivities() {
  const supabase = useSupabaseClient<Database>()

  return useAsyncData<PublicActivity[]>('public-activities', async () => {
    const { data, error } = await supabase
      .from('public_activities')
      .select('*')
      .order('category_name', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      throw new Error('Impossibile caricare le esperienze pubbliche.')
    }

    return data ?? []
  })
}

export function usePublicNewsPosts() {
  const supabase = useSupabaseClient<Database>()

  return useAsyncData<PublicNewsPost[]>('public-news-posts', async () => {
    const { data, error } = await supabase
      .from('public_news_posts')
      .select('*')
      .order('published_at', { ascending: false })

    if (error) {
      throw new Error('Impossibile caricare le news pubbliche.')
    }

    return data ?? []
  })
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
      throw new Error('Impossibile caricare i servizi pubblici.')
    }

    return data ?? []
  })
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
