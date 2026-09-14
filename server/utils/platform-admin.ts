import type { Database } from '~/types/database.types'

// `platforms` non ha grant per il browser: contiene la capienza standard e il
// flag `internal` (DEC-005, DEC-021). Le scritture passano da qui e questo
// modulo e l'unico punto di validazione prima del database.

export type PlatformWriteBody = {
  name?: string
  slug?: string
  code?: string
  description?: string | null
  imagePath?: string | null
  categoryId?: string | null
  defaultCapacity?: number | null
  internal?: boolean
  active?: boolean
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizePlatformPayload(body: PlatformWriteBody | undefined) {
  const name = body?.name?.trim() ?? ''
  const slug = (body?.slug?.trim() || slugify(name)).slice(0, 180)
  const code = body?.code?.trim().toUpperCase() ?? ''

  if (name.length < 1 || name.length > 180) invalid('Invalid platform name')
  if (!slugPattern.test(slug)) invalid('Invalid platform slug')
  if (code.length < 1 || code.length > 12) invalid('Invalid platform code')

  const capacity = body?.defaultCapacity
  if (
    capacity !== null &&
    capacity !== undefined &&
    (!Number.isInteger(capacity) || capacity <= 0)
  ) {
    invalid('Invalid default capacity')
  }

  const categoryId = body?.categoryId
  if (categoryId) requireUuid(categoryId, 'Invalid category id')

  return {
    name,
    slug,
    code,
    description: body?.description?.trim() || null,
    image_path: body?.imagePath?.trim() || null,
    category_id: categoryId || null,
    default_capacity: capacity ?? null,
    internal: typeof body?.internal === 'boolean' ? body.internal : false,
    active: typeof body?.active === 'boolean' ? body.active : true,
  } satisfies Database['public']['Tables']['platforms']['Insert']
}
