<script setup lang="ts">
import type { ProfileEventView } from '~~/shared/types/profile-view'
import { formatPublicEventDate } from '~/composables/usePublicEvents'

// Eventi a cui l utente e prenotato o ha partecipato. I futuri stanno in alto
// con il bordo acceso, i passati sotto in ordine cronologico inverso.
defineProps<{
  events: ProfileEventView[]
  /** Prefisso della scheda evento, se la vista corrente puo aprirla. */
  eventBasePath?: string
}>()

function bookingLabel(status: string) {
  return (
    {
      confirmed: 'Confermata',
      waitlisted: 'Lista d attesa',
      cancelled: 'Annullata',
      no_show: 'Non presentato',
    }[status] ?? status
  )
}
</script>

<template>
  <div>
    <p v-if="!events.length" class="text-sm text-white/45">
      Nessun evento registrato per questo utente.
    </p>

    <ul v-else v-vrsus-motion="'cards'" class="grid gap-3 sm:grid-cols-2">
      <li v-for="item in events" :key="item.bookingId">
        <component
          :is="eventBasePath ? resolveComponent('NuxtLink') : 'div'"
          :to="eventBasePath ? `${eventBasePath}/${item.eventId}` : undefined"
          class="block h-full rounded-2xl border p-4 transition-colors"
          :class="
            item.upcoming
              ? 'border-brand-red-500/40 bg-brand-red-500/[0.06] hover:bg-brand-red-500/[0.1]'
              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
          "
        >
          <div class="flex items-start justify-between gap-3">
            <p class="min-w-0 flex-1 truncate font-medium text-white">
              {{ item.title }}
            </p>
            <span
              class="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] tracking-wide text-white/70 uppercase"
              >{{ item.upcoming ? 'In arrivo' : 'Passato' }}</span
            >
          </div>
          <p class="mt-1.5 text-sm text-white/50">
            {{ formatPublicEventDate(item.startsAt, item.endsAt) }}
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              class="rounded-md px-2 py-0.5"
              :class="
                item.bookingStatus === 'confirmed'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-white/10 text-white/60'
              "
              >{{ bookingLabel(item.bookingStatus) }}</span
            >
            <span
              v-if="item.checkedInAt"
              class="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-white/70"
            >
              <UIcon name="i-lucide-check" class="size-3.5" />
              Presente
            </span>
          </div>
        </component>
      </li>
    </ul>
  </div>
</template>
