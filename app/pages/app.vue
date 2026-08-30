<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const { user, roles, isAdmin, loadRoles, signOut } = useVrsusAuth()
const { data: bookings } = await useMyBookings()
const { data: notifications } = await useMyNotifications()
const supabase = useSupabaseClient()
const pending = ref(false)
const { data: rankingSummary } = await useAsyncData(
  'my-ranking-summary',
  async () => {
    const { data, error } = await supabase.rpc('get_my_ranking_summary')
    if (error) return []
    return data ?? []
  },
)

const bookingEvents = await useAsyncData('my-booking-events', async () => {
  const eventIds = [
    ...new Set((bookings.value ?? []).map((item) => item.event_id)),
  ]
  if (!eventIds.length) return []

  const { data, error } = await supabase
    .from('public_events')
    .select('*')
    .in('id', eventIds)

  if (error) return []
  return data ?? []
})

const activeBookings = computed(() =>
  (bookings.value ?? []).filter((booking) =>
    ['confirmed', 'waitlisted'].includes(booking.status),
  ),
)
const unreadNotifications = computed(() =>
  (notifications.value ?? []).filter((notification) => !notification.read_at),
)

function eventForBooking(eventId: string) {
  return bookingEvents.data.value?.find((event) => event.id === eventId)
}

await loadRoles()

useSeoMeta({
  title: 'Area personale — VRSUS',
  robots: 'noindex, nofollow',
})

const statusMessage = computed(() => {
  if (route.query.error === 'forbidden') {
    return 'Non hai i permessi per aprire quella sezione.'
  }

  if (route.query.error === 'roles-unavailable') {
    return 'I ruoli non sono disponibili. Riprova tra poco.'
  }

  return ''
})

async function logout() {
  pending.value = true
  await signOut()
  await navigateTo('/')
}
</script>

<template>
  <main
    class="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-5 py-16 sm:px-8 lg:py-24"
  >
    <div
      class="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p
          class="text-brand-blue-400 text-xs font-semibold tracking-[0.24em] uppercase"
        >
          Area personale
        </p>
        <h1 class="font-display mt-3 text-4xl font-semibold text-white">
          Ciao, {{ user?.email }}
        </h1>
        <p class="mt-4 max-w-xl text-white/55">
          Qui troverai le tue prenotazioni, i tuoi QR e le informazioni utili
          per partecipare.
        </p>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        :loading="pending"
        label="Esci"
        @click="logout"
      />
    </div>

    <UAlert
      v-if="statusMessage"
      class="mt-8"
      color="warning"
      variant="subtle"
      :description="statusMessage"
    />

    <section v-if="activeBookings.length" class="mt-10 space-y-4">
      <div>
        <p class="text-sm text-white/45">Le tue prenotazioni</p>
        <h2 class="font-display mt-2 text-2xl font-semibold text-white">
          Ci vediamo all’evento
        </h2>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <NuxtLink
          v-for="booking in activeBookings"
          :key="booking.id"
          :to="`/app/prenotazioni/${booking.id}`"
          class="hover:border-brand-blue-400/50 block rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-medium text-white">
                {{ eventForBooking(booking.event_id)?.title ?? 'Evento VRSUS' }}
              </p>
              <p
                v-if="eventForBooking(booking.event_id)?.starts_at"
                class="mt-1 text-xs text-white/45"
              >
                {{
                  formatPublicEventDate(
                    eventForBooking(booking.event_id)?.starts_at ?? null,
                  )
                }}
              </p>
            </div>
            <UBadge
              :color="booking.status === 'confirmed' ? 'success' : 'secondary'"
              variant="subtle"
              :label="formatBookingStatus(booking.status)"
            />
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="mt-10 grid gap-4 md:grid-cols-3">
      <UCard class="border border-white/10 bg-white/[0.04]">
        <p class="text-sm text-white/45">Prossimo passo</p>
        <h2 class="font-display mt-3 text-2xl font-semibold text-white">
          Scopri il prossimo evento
        </h2>
        <p class="mt-3 text-sm leading-6 text-white/55">
          Le prenotazioni saranno disponibili quando un evento verrà pubblicato.
        </p>
        <UButton
          to="/evento"
          class="mt-6"
          variant="soft"
          color="secondary"
          label="Vai all’evento"
        />
        <UButton
          to="/app/notifiche"
          class="mt-3"
          variant="ghost"
          color="neutral"
          :label="`Notifiche${unreadNotifications.length ? ` (${unreadNotifications.length} nuove)` : ''}`"
        />
      </UCard>

      <UCard class="border border-white/10 bg-white/[0.04]">
        <p class="text-sm text-white/45">Ruoli account</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <UBadge
            v-for="role in roles"
            :key="role"
            color="secondary"
            variant="subtle"
            :label="role"
          />
          <span v-if="roles.length === 0" class="text-sm text-white/45"
            >Nessun ruolo assegnato</span
          >
        </div>
        <UButton
          v-if="isAdmin"
          to="/admin"
          class="mt-6"
          variant="outline"
          label="Apri console admin"
        />
      </UCard>

      <UCard class="border border-white/10 bg-white/[0.04]">
        <p class="text-sm text-white/45">Il tuo ranking</p>
        <p class="font-display mt-3 text-3xl font-semibold text-white">
          {{ rankingSummary?.[0]?.points ?? 0 }} pt
        </p>
        <p class="mt-2 text-sm text-white/55">
          {{ rankingSummary?.[0]?.wins ?? 0 }} vittorie ·
          {{ rankingSummary?.[0]?.runner_ups ?? 0 }} podi
        </p>
        <UButton
          to="/ranking"
          class="mt-6"
          variant="soft"
          color="secondary"
          label="Vedi classifica"
        />
      </UCard>
    </section>
  </main>
</template>
