import { createError, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

type BoardBody = {
  title?: string
  slug?: string
  body?: string
  postType?: string
  imagePath?: string
  pinned?: boolean
  publish?: boolean
  options?: unknown
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export default defineEventHandler(async (event) => {
  const { user } = await requireServerAnyRole(event, ['admin', 'super_admin'])

  const body = await readBody<BoardBody>(event)
  const title = body?.title?.trim() ?? ''
  const slug = body?.slug?.trim() ?? ''
  const postType = body?.postType ?? 'announcement'

  if (title.length < 1 || title.length > 200) invalid('Invalid title')
  if (!slugPattern.test(slug)) invalid('Invalid slug')
  if (!['announcement', 'poll'].includes(postType)) invalid('Invalid post type')

  const options = Array.isArray(body?.options)
    ? body.options
        .map((option) => String(option).trim())
        .filter((option) => option.length > 0 && option.length <= 120)
    : []

  // Un sondaggio senza almeno due opzioni non e votabile.
  if (postType === 'poll' && options.length < 2) {
    invalid('A poll needs at least two options')
  }

  const client = serverSupabaseServiceRole<Database>(event)

  const { data: post, error } = await client
    .from('board_posts')
    .insert({
      title,
      slug,
      body: body?.body?.trim() || null,
      post_type: postType,
      image_path: body?.imagePath?.trim() || null,
      pinned: body?.pinned === true,
      status: body?.publish === false ? 'draft' : 'published',
      published_at: body?.publish === false ? null : new Date().toISOString(),
      author_id: user.sub,
    })
    .select('id')
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === '23505' ? 409 : 500,
      statusMessage:
        error.code === '23505' ? 'Slug already used' : 'Unable to create post',
    })
  }

  if (postType === 'poll') {
    const { error: optionsError } = await client
      .from('board_poll_options')
      .insert(
        options.map((label, index) => ({
          post_id: post.id,
          label,
          sort_order: index * 10,
        })),
      )
    if (optionsError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to save poll options',
      })
    }
  }

  return { id: post.id }
})
