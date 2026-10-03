import { createError, getRouterParam, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin'])

  const postId = requireUuid(getRouterParam(event, 'id'), 'Invalid post id')
  const body = await readBody<{ status?: string; pinned?: boolean }>(event)

  if (
    body?.status &&
    !['draft', 'published', 'archived'].includes(body.status)
  ) {
    invalid('Invalid status')
  }

  const client = serverSupabaseServiceRole<Database>(event)

  const patch: Database['public']['Tables']['board_posts']['Update'] = {}
  if (body?.status) {
    patch.status = body.status
    // Pubblicare senza data di pubblicazione lascerebbe il post invisibile
    // nella view pubblica, che filtra su published_at.
    if (body.status === 'published')
      patch.published_at = new Date().toISOString()
  }
  if (typeof body?.pinned === 'boolean') patch.pinned = body.pinned

  if (!Object.keys(patch).length) invalid('Nothing to update')

  const { data, error } = await client
    .from('board_posts')
    .update(patch)
    .eq('id', postId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to update post',
    })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  }

  return { id: data.id }
})
