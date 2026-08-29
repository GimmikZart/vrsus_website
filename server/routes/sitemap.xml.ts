import type { Database } from '~/types/database.types'
import { serverSupabaseClient } from '#supabase/server'

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const baseUrl = config.public.appBaseUrl.replace(/\/$/, '')
  const urls = [
    '/',
    '/eventi',
    '/esperienze',
    '/news',
    '/servizi',
    '/regolamento',
  ]

  try {
    const supabase = await serverSupabaseClient<Database>(event)
    const { data } = await supabase.from('public_events').select('slug')

    for (const item of data ?? []) {
      if (item.slug) {
        urls.push(`/eventi/${item.slug}`)
      }
    }

    const [{ data: posts }, { data: services }] = await Promise.all([
      supabase.from('public_news_posts').select('slug'),
      supabase.from('public_service_pages').select('slug'),
    ])

    for (const item of posts ?? []) {
      if (item.slug) urls.push(`/news/${item.slug}`)
    }
    for (const item of services ?? []) {
      if (item.slug) urls.push(`/servizi/${item.slug}`)
    }
  } catch {
    // The static public URLs remain a valid sitemap when Supabase is unavailable.
  }

  const entries = urls
    .filter((url, index) => urls.indexOf(url) === index)
    .map((url) => `  <url><loc>${escapeXml(`${baseUrl}${url}`)}</loc></url>`)
    .join('\n')

  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
  ].join('\n')
})
