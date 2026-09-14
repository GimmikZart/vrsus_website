import { createError } from 'h3'
import type { Database } from '~/types/database.types'

// The event domain tables have no grants for `anon`/`authenticated` (DEC-005),
// so admin reads and writes run server-side with the service role. That makes
// these handlers the only authorization and validation boundary: every payload
// is normalized here before it reaches the database.

export type EventStatus =
  'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled'
export type EventType =
  'birthday' | 'all_you_can_play' | 'team_building' | 'private_day'
export type CapacityVisibility = 'hidden' | 'status' | 'exact'

export const EVENT_STATUSES: readonly EventStatus[] = [
  'draft',
  'scheduled',
  'running',
  'completed',
  'cancelled',
]
export const EVENT_TYPES: readonly EventType[] = [
  'birthday',
  'all_you_can_play',
  'team_building',
  'private_day',
]
export const CAPACITY_VISIBILITIES: readonly CapacityVisibility[] = [
  'hidden',
  'status',
  'exact',
]

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type EventWriteBody = {
  title?: string
  slug?: string
  shortDescription?: string | null
  description?: string | null
  status?: string
  eventType?: string
  isPublic?: boolean
  startsAt?: string
  endsAt?: string
  bookingOpensAt?: string | null
  bookingClosesAt?: string | null
  bookingEnabled?: boolean
  venueName?: string | null
  venueAddress?: string | null
  venueNotes?: string | null
  priceCents?: number
  paymentRequired?: boolean
  maxCapacity?: number | null
  capacityVisibility?: string
  waitlistEnabled?: boolean
  arciRequired?: boolean
  coverImagePath?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
}

export function invalid(message: string): never {
  throw createError({ statusCode: 400, statusMessage: message })
}

export function requireUuid(value: unknown, message: string) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) invalid(message)
  return value as string
}

function optionalText(value: string | null | undefined, maxLength: number) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized ? normalized.slice(0, maxLength) : null
}

function optionalIso(value: string | null | undefined, label: string) {
  if (value === null || value === undefined || value === '') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) invalid(`Invalid ${label}`)
  return date.toISOString()
}

function optionalPositiveInt(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) return null
  if (!Number.isInteger(value) || value <= 0) invalid(`Invalid ${label}`)
  return value
}

function boolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Validates an admin event payload and maps it onto the `events` columns.
 * Mirrors the database check constraints so a bad payload fails as a 400
 * instead of a 500 raised by Postgres.
 */
export function normalizeEventPayload(body: EventWriteBody | undefined) {
  const title = body?.title?.trim() ?? ''
  const slug = body?.slug?.trim() ?? ''
  const status = body?.status ?? 'draft'
  const eventType = body?.eventType ?? 'all_you_can_play'
  const capacityVisibility = body?.capacityVisibility ?? 'hidden'
  const priceCents = body?.priceCents ?? 0

  if (title.length < 1 || title.length > 180) invalid('Invalid title')
  if (!slugPattern.test(slug)) invalid('Invalid slug')
  if (!EVENT_STATUSES.includes(status as EventStatus)) invalid('Invalid status')
  if (!EVENT_TYPES.includes(eventType as EventType))
    invalid('Invalid event type')
  if (!CAPACITY_VISIBILITIES.includes(capacityVisibility as CapacityVisibility))
    invalid('Invalid capacity visibility')
  if (!Number.isInteger(priceCents) || priceCents < 0) invalid('Invalid price')

  const startsAt = optionalIso(body?.startsAt, 'start date')
  const endsAt = optionalIso(body?.endsAt, 'end date')
  if (!startsAt || !endsAt) invalid('Start and end dates are required')
  if (new Date(endsAt) <= new Date(startsAt)) invalid('Invalid event range')

  const bookingOpensAt = optionalIso(body?.bookingOpensAt, 'booking opening')
  const bookingClosesAt = optionalIso(body?.bookingClosesAt, 'booking closing')
  if (
    bookingOpensAt &&
    bookingClosesAt &&
    new Date(bookingClosesAt) < new Date(bookingOpensAt)
  ) {
    invalid('Invalid booking window')
  }

  return {
    title,
    slug,
    short_description: optionalText(body?.shortDescription, 500),
    description: optionalText(body?.description, 20000),
    status,
    event_type: eventType,
    is_public: boolean(body?.isPublic, false),
    starts_at: startsAt,
    ends_at: endsAt,
    booking_opens_at: bookingOpensAt,
    booking_closes_at: bookingClosesAt,
    booking_enabled: boolean(body?.bookingEnabled, true),
    venue_name: optionalText(body?.venueName, 180),
    venue_address: optionalText(body?.venueAddress, 300),
    venue_notes: optionalText(body?.venueNotes, 2000),
    price_cents: priceCents,
    payment_required: boolean(body?.paymentRequired, true),
    max_capacity: optionalPositiveInt(body?.maxCapacity, 'max capacity'),
    capacity_visibility: capacityVisibility,
    waitlist_enabled: boolean(body?.waitlistEnabled, true),
    // Default true: una giornata aperta al pubblico richiede la tessera se
    // nessuno dice il contrario.
    arci_required: boolean(body?.arciRequired, true),
    cover_image_path: optionalText(body?.coverImagePath, 500),
    seo_title: optionalText(body?.seoTitle, 180),
    seo_description: optionalText(body?.seoDescription, 400),
  } satisfies Database['public']['Tables']['events']['Insert']
}

export type PlatformOverrideBodyBase = {
  publicName?: string | null
  description?: string | null
  capacity?: number | null
  isPublic?: boolean
  active?: boolean
}

export type PlatformOverrideBody = PlatformOverrideBodyBase

export function normalizePlatformOverride(
  override: PlatformOverrideBodyBase = {},
) {
  return {
    public_name: optionalText(override.publicName, 180),
    description_override: optionalText(override.description, 2000),
    capacity_override: optionalPositiveInt(
      override.capacity,
      'platform capacity',
    ),
    is_public: boolean(override.isPublic, true),
    active: boolean(override.active, true),
  }
}
