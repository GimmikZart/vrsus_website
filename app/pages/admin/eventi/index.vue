<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { VrsusRole } from '~/composables/useVrsusAuth'
import { formatPublicEventPrice } from '~/composables/usePublicEvents'

type EventRow = Database['public']['Tables']['events']['Row']

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'super_admin'] satisfies VrsusRole[],
})

// Il dominio evento non ha grant per il browser (DEC-005): la lista arriva da
// un endpoint service-role. La creazione e la modifica hanno una vista propria.
const {
  data: events,
  status: loadStatus,
  error: loadError,
} = await useFetch<EventRow[]>('/api/admin/events', { default: () => [] })

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

usePageActions([{ label: 'Nuovo evento', to: '/admin/eventi/nuovo' }])

useSeoMeta({ title: 'Gestione eventi — VRSUS', robots: 'noindex, nofollow' })
</script>

<template>
  <div>
    <header
      class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          CMS eventi
        </p>
        <h1
          class="font-display mt-2 text-2xl font-semibold text-white sm:text-3xl"
        >
          Gestione eventi
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-white/50">
          Crea e prepara gli eventi VRSUS. La capienza resta privata salvo
          esplicita scelta di visibilita.
        </p>
      </div>
    </header>

    <UAlert
      v-if="loadError"
      class="mt-5"
      color="error"
      variant="subtle"
      description="Impossibile caricare gli eventi."
    />
    <div
      v-if="loadStatus === 'pending'"
      class="mt-5 h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
    />

    <ul v-else class="mt-5 space-y-3">
      <li v-for="event in events" :key="event.id">
        <NuxtLink
          :to="`/admin/eventi/${event.id}`"
          class="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.06] sm:p-5"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h2
                class="font-display truncate text-lg font-semibold text-white"
              >
                {{ event.title }}
              </h2>
              <p class="mt-1 text-sm text-white/55">
                {{ formatDate(event.starts_at) }}
              </p>
              <p class="mt-1 text-sm text-white/45">
                {{ event.venue_name || 'Sede da definire' }}
              </p>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="mt-1 size-5 shrink-0 text-white/25"
            />
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span class="font-medium text-white/80">
              {{
                formatPublicEventPrice(
                  event.price_cents,
                  event.payment_required,
                )
              }}
            </span>
            <span class="text-white/25">•</span>
            <span
              class="rounded-full px-2.5 py-0.5 font-medium"
              :class="
                event.is_public
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-white/10 text-white/55'
              "
            >
              {{ event.is_public ? 'Pubblico' : 'Bozza' }}
            </span>
          </div>
        </NuxtLink>
      </li>

      <li
        v-if="!events.length"
        class="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55"
      >
        Nessun evento presente.
      </li>
    </ul>
  </div>
</template>
