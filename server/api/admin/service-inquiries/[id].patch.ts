import { createError, getRouterParam, readBody } from 'h3'
import type { Database } from '~/types/database.types'

type InquiryStatus = 'new' | 'contacted' | 'quote_sent' | 'confirmed' | 'lost'

const inquiryStatuses: InquiryStatus[] = [
  'new',
  'contacted',
  'quote_sent',
  'confirmed',
  'lost',
]
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const { client } = await requireServerRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  const body = await readBody<{
    status?: InquiryStatus
    adminNotes?: string | null
  }>(event)

  if (
    !id ||
    !uuidPattern.test(id) ||
    !body?.status ||
    !inquiryStatuses.includes(body.status)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid inquiry update',
    })
  }

  const adminNotes = body.adminNotes?.trim() ?? ''
  if (adminNotes.length > 5000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Inquiry notes are too long',
    })
  }

  const payload: Database['public']['Tables']['service_inquiries']['Update'] = {
    status: body.status,
    admin_notes: adminNotes || null,
  }
  const { error } = await client
    .from('service_inquiries')
    .update(payload)
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Inquiry update rejected',
    })
  }

  return { ok: true }
})
