import { createError } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
  await requireServerAnyRole(event, ['admin'])

  const client = serverSupabaseServiceRole<Database>(event)

  const [posts, options, votes] = await Promise.all([
    client
      .from('board_posts')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    client.from('board_poll_options').select('*').order('sort_order'),
    client.from('board_poll_votes').select('option_id'),
  ])

  if (posts.error || options.error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load board',
    })
  }

  const voteCounts = (votes.data ?? []).reduce<Record<string, number>>(
    (acc, vote) => {
      acc[vote.option_id] = (acc[vote.option_id] ?? 0) + 1
      return acc
    },
    {},
  )

  return {
    posts: (posts.data ?? []).map((post) => ({
      ...post,
      options: (options.data ?? [])
        .filter((option) => option.post_id === post.id)
        .map((option) => ({
          id: option.id,
          label: option.label,
          votes: voteCounts[option.id] ?? 0,
        })),
    })),
  }
})
