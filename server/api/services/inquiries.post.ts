import { createError, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

type InquiryBody = {
  servicePageId?: string | null
  name?: string
  email?: string
  phone?: string | null
  organization?: string | null
  peopleCount?: number | null
  preferredDate?: string | null
  message?: string
  website?: string
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function optionalText(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim() ?? ''
  return normalized ? normalized.slice(0, maxLength) : null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<InquiryBody>(event)

  if (body?.website?.trim()) {
    return { ok: true }
  }

  const name = body?.name?.trim() ?? ''
  const email = body?.email?.trim().toLowerCase() ?? ''
  const message = body?.message?.trim() ?? ''
  const servicePageId = body?.servicePageId ?? null
  const preferredDate = body?.preferredDate?.trim() || null
  const peopleCount = body?.peopleCount ?? null

  if (
    name.length < 1 ||
    name.length > 160 ||
    email.length < 3 ||
    email.length > 320 ||
    !emailPattern.test(email) ||
    message.length < 1 ||
    message.length > 5000
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid inquiry data',
    })
  }

  if (
    (servicePageId && !uuidPattern.test(servicePageId)) ||
    (preferredDate && !datePattern.test(preferredDate)) ||
    (peopleCount !== null &&
      (!Number.isInteger(peopleCount) ||
        peopleCount < 1 ||
        peopleCount > 10000))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid inquiry data',
    })
  }

  const client = serverSupabaseServiceRole<Database>(event)

  if (servicePageId) {
    const { data: service, error: serviceError } = await client
      .from('public_service_pages')
      .select('id')
      .eq('id', servicePageId)
      .maybeSingle()

    if (serviceError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Service validation unavailable',
      })
    }

    if (!service) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Service is not available',
      })
    }
  }

  const { error } = await client.from('service_inquiries').insert({
    service_page_id: servicePageId,
    name,
    email,
    phone: optionalText(body?.phone, 80),
    organization: optionalText(body?.organization, 180),
    people_count: peopleCount,
    preferred_date: preferredDate,
    message,
  })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to save inquiry',
    })
  }

  return { ok: true }
})
