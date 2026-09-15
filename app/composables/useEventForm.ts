import type { Database } from '~/types/database.types'
import { slugify } from '~/utils/slugify'

// Stato del form evento, condiviso fra creazione e modifica.
//
// Il wizard mostra solo i campi che servono a organizzare una giornata. I
// campi che l'interfaccia non espone piu (descrizioni lunghe, note, SEO,
// visibilita della capienza) restano nello stato e vengono rimandati
// invariati: l'endpoint riscrive la riga intera e senza di loro il salvataggio
// cancellerebbe dati che nessuno ha chiesto di cancellare.

export type EventRow = Database['public']['Tables']['events']['Row']

export type EventType =
  'birthday' | 'all_you_can_play' | 'team_building' | 'private_day'

export type EventFormState = {
  title: string
  slug: string
  eventType: EventType
  startsAt: string
  endsAt: string
  bookingOpensAt: string
  bookingClosesAt: string
  priceEuro: number
  maxCapacity: number | undefined
  venueName: string
  venueAddress: string
  coverImagePath: string
  isPublic: boolean
  bookingEnabled: boolean
  waitlistEnabled: boolean
  paymentRequired: boolean
  /** Tessera ARCI obbligatoria per partecipare alla giornata. */
  arciRequired: boolean
  /** Campi conservati ma non modificabili dal wizard. */
  passthrough: {
    shortDescription: string
    description: string
    venueNotes: string
    capacityVisibility: string
    seoTitle: string
    seoDescription: string
    status: string
  }
}

export const EVENT_TYPE_OPTIONS = [
  { value: 'all_you_can_play', label: 'All you can play' },
  { value: 'birthday', label: 'Compleanno' },
  { value: 'team_building', label: 'Team building' },
  { value: 'private_day', label: 'Giornata privata' },
]

export function emptyEventForm(): EventFormState {
  return {
    title: '',
    slug: '',
    eventType: 'all_you_can_play',
    startsAt: '',
    endsAt: '',
    bookingOpensAt: '',
    bookingClosesAt: '',
    priceEuro: 0,
    maxCapacity: undefined,
    venueName: '',
    venueAddress: '',
    coverImagePath: '',
    isPublic: false,
    bookingEnabled: true,
    waitlistEnabled: true,
    paymentRequired: true,
    // Il circolo e affiliato ARCI: la tessera si da per richiesta e si toglie
    // sui compleanni e sulle giornate private.
    arciRequired: true,
    passthrough: {
      shortDescription: '',
      description: '',
      venueNotes: '',
      capacityVisibility: 'hidden',
      seoTitle: '',
      seoDescription: '',
      status: 'draft',
    },
  }
}

export function toDateTimeInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function eventFormFromRow(row: EventRow): EventFormState {
  return {
    title: row.title,
    slug: row.slug,
    eventType: (row.event_type as EventType) ?? 'all_you_can_play',
    startsAt: toDateTimeInput(row.starts_at),
    endsAt: toDateTimeInput(row.ends_at),
    bookingOpensAt: toDateTimeInput(row.booking_opens_at),
    bookingClosesAt: toDateTimeInput(row.booking_closes_at),
    priceEuro: row.price_cents / 100,
    maxCapacity: row.max_capacity ?? undefined,
    venueName: row.venue_name ?? '',
    venueAddress: row.venue_address ?? '',
    coverImagePath: row.cover_image_path ?? '',
    isPublic: row.is_public,
    bookingEnabled: row.booking_enabled,
    waitlistEnabled: row.waitlist_enabled,
    paymentRequired: row.payment_required,
    arciRequired: row.arci_required,
    passthrough: {
      shortDescription: row.short_description ?? '',
      description: row.description ?? '',
      venueNotes: row.venue_notes ?? '',
      capacityVisibility: row.capacity_visibility,
      seoTitle: row.seo_title ?? '',
      seoDescription: row.seo_description ?? '',
      status: row.status,
    },
  }
}

/**
 * Traduce il form nel payload dell'endpoint, oppure restituisce il primo
 * errore leggibile. Lo stato dell'evento non e un campo del form: pubblicare
 * significa programmare, non pubblicare significa restare in bozza. Su un
 * evento gia avviato o concluso lo stato non si tocca, perche la guardia in
 * database non ammette il ritorno indietro.
 */
export function eventFormToPayload(form: EventFormState) {
  const title = form.title.trim()
  // In modifica `form.slug` e quello gia salvato e non cambia con il titolo:
  // l'indirizzo di una serata pubblicata puo essere gia stato condiviso.
  const slug = slugify(form.slug || title)
  const startsAt = form.startsAt ? new Date(form.startsAt) : null
  const endsAt = form.endsAt ? new Date(form.endsAt) : null
  const priceEuro = Number(form.priceEuro)

  const fail = (message: string) => ({ error: message, payload: null })

  if (!title) return fail('Il titolo e obbligatorio.')
  if (!slug) return fail('Il titolo non e valido.')
  if (!startsAt || !endsAt) {
    return fail('Inizio e fine evento sono obbligatori.')
  }
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return fail('Le date inserite non sono valide.')
  }
  if (endsAt <= startsAt) {
    return fail('La fine dell evento deve essere dopo l inizio.')
  }
  if (!Number.isFinite(priceEuro) || priceEuro < 0) {
    return fail('Il prezzo deve essere zero o un numero positivo.')
  }
  if (
    form.maxCapacity !== undefined &&
    (!Number.isInteger(form.maxCapacity) || form.maxCapacity <= 0)
  ) {
    return fail('La capienza massima deve essere un intero.')
  }

  const current = form.passthrough.status
  const status = ['draft', 'scheduled'].includes(current)
    ? form.isPublic
      ? 'scheduled'
      : 'draft'
    : current

  return {
    error: null,
    payload: {
      title,
      slug,
      shortDescription: form.passthrough.shortDescription,
      description: form.passthrough.description,
      status,
      eventType: form.eventType,
      isPublic: form.isPublic,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      bookingOpensAt: form.bookingOpensAt
        ? new Date(form.bookingOpensAt).toISOString()
        : null,
      bookingClosesAt: form.bookingClosesAt
        ? new Date(form.bookingClosesAt).toISOString()
        : null,
      bookingEnabled: form.bookingEnabled,
      venueName: form.venueName.trim(),
      venueAddress: form.venueAddress.trim(),
      venueNotes: form.passthrough.venueNotes,
      priceCents: Math.round(priceEuro * 100),
      paymentRequired: form.paymentRequired,
      maxCapacity: form.maxCapacity ?? null,
      capacityVisibility: form.passthrough.capacityVisibility,
      waitlistEnabled: form.waitlistEnabled,
      arciRequired: form.arciRequired,
      coverImagePath: form.coverImagePath.trim(),
      seoTitle: form.passthrough.seoTitle,
      seoDescription: form.passthrough.seoDescription,
    },
  }
}
