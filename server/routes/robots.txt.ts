export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const isProduction = config.public.appEnv === 'production'
  const baseUrl = config.public.appBaseUrl.replace(/\/$/, '')

  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')

  if (!isProduction) {
    return ['User-agent: *', 'Disallow: /'].join('\n')
  }

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /app',
    'Disallow: /admin',
    'Disallow: /login',
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join('\n')
})
