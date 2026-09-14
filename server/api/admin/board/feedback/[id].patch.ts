import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin', 'super_admin'])

  const feedbackId = requireUuid(
    getRouterParam(event, 'id'),
    'Invalid feedback id',
  )
  const body = await readBody<{ status?: string; internalNotes?: string }>(
    event,
  )

  if (body?.status && !['new', 'reviewed', 'archived'].includes(body.status)) {
    invalid('Invalid status')
  }

  const client = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await client
    .from('user_feedback')
    .update({
      status: body?.status ?? 'reviewed',
      internal_notes: body?.internalNotes?.trim() || null,
    })
    .eq('id', feedbackId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to update feedback',
    })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Feedback not found' })
  }

  return { id: data.id }
})
