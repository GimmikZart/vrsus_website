import type { Database } from '~/types/database.types'

type Inquiry = Database['public']['Tables']['service_inquiries']['Row']

export default defineEventHandler(async (event) => {
  const { client } = await requireServerRole(event, 'admin')
  const { data: inquiries, error } = await client
    .from('service_inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load service inquiries',
    })
  }

  const serviceIds = [
    ...new Set(
      (inquiries ?? [])
        .map((inquiry) => inquiry.service_page_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const serviceTitles = new Map<string, string>()

  if (serviceIds.length > 0) {
    const { data: services, error: servicesError } = await client
      .from('service_pages')
      .select('id, title')
      .in('id', serviceIds)

    if (servicesError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to load service labels',
      })
    }

    for (const service of services ?? []) {
      serviceTitles.set(service.id, service.title)
    }
  }

  return (inquiries ?? []).map((inquiry: Inquiry) => ({
    ...inquiry,
    service_title: inquiry.service_page_id
      ? (serviceTitles.get(inquiry.service_page_id) ?? null)
      : null,
  }))
})
