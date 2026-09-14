<script setup lang="ts">
import { HOME_CONTENT } from '~~/shared/constants/site-content'
import {
  formatPublicEventDate,
  formatPublicEventPrice,
  publicEventsRobots,
} from '~/composables/usePublicEvents'
import {
  usePublicPlatforms,
  usePublicServicePages,
} from '~/composables/usePublicCatalog'

definePageMeta({ layout: 'site' })

const { data: nextEvent } = await usePublicNextEvent()
const { data: platforms } = await usePublicPlatforms()
const { data: services } = await usePublicServicePages()
const { isAuthenticated } = useVrsusAuth()

const eventTypeLabels: Record<string, string> = {
  birthday: 'Compleanno',
  all_you_can_play: 'All you can play',
  team_building: 'Team building',
  private_day: 'Giornata privata',
}

// Da anonimo la CTA porta alla registrazione: prenotare richiede un account.
// Da autenticato porta alla scheda della giornata in area personale, dove si
// prenota con una conferma esplicita (DEC-042).
const bookingTarget = computed(() =>
  isAuthenticated.value && nextEvent.value?.id
    ? `/app/eventi/${nextEvent.value.id}`
    : '/registrati',
)

const previewPlatforms = computed(() => (platforms.value ?? []).slice(0, 4))
const previewServices = computed(() => (services.value ?? []).slice(0, 4))

useSeoMeta({
  title: 'VRSUS — Gioco e socialità',
  description: HOME_CONTENT.hero.body,
  robots: publicEventsRobots(),
})
</script>

<template>
  <div>
    <!-- Locandina del prossimo evento: la prima cosa che si vede. -->
    <section class="px-5 pt-10 pb-14 sm:px-8 lg:pt-16">
      <div class="mx-auto max-w-7xl">
        <div
          class="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12"
        >
          <div>
            <p
              class="text-brand-red-400 text-xs font-semibold tracking-[0.24em] uppercase"
            >
              {{ HOME_CONTENT.hero.eyebrow }}
            </p>
            <h1
              class="font-display mt-4 text-4xl leading-[1.05] font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              {{ HOME_CONTENT.hero.title }}
            </h1>
            <p class="mt-5 max-w-xl text-base leading-7 text-white/60">
              {{ HOME_CONTENT.hero.body }}
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <UButton
                v-if="nextEvent"
                :to="bookingTarget"
                color="primary"
                size="lg"
                label="Prenota il tuo posto"
              />
              <UButton
                to="/postazioni"
                color="neutral"
                variant="outline"
                size="lg"
                label="Scopri le postazioni"
              />
            </div>
          </div>

          <article
            v-if="nextEvent"
            class="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8"
          >
            <div
              class="bg-brand-red-500/15 absolute -top-20 -right-16 size-52 rounded-full blur-3xl"
            />
            <div class="relative">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="bg-brand-red-500/15 text-brand-red-300 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase"
                >
                  Prossimo evento
                </span>
                <span
                  v-if="nextEvent.event_type"
                  class="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70"
                >
                  {{
                    eventTypeLabels[nextEvent.event_type] ??
                    nextEvent.event_type
                  }}
                </span>
              </div>

              <h2
                data-testid="home-next-event-title"
                class="font-display mt-5 text-2xl font-semibold text-white sm:text-3xl"
              >
                {{ nextEvent.title }}
              </h2>
              <p v-if="nextEvent.short_description" class="mt-3 text-white/60">
                {{ nextEvent.short_description }}
              </p>

              <dl class="mt-6 space-y-3 text-sm">
                <div class="flex items-start gap-3">
                  <UIcon
                    name="i-lucide-calendar-days"
                    class="mt-0.5 size-4 text-white/40"
                  />
                  <dd class="text-white/80">
                    {{
                      formatPublicEventDate(
                        nextEvent.starts_at,
                        nextEvent.ends_at,
                      )
                    }}
                  </dd>
                </div>
                <div v-if="nextEvent.venue_name" class="flex items-start gap-3">
                  <UIcon
                    name="i-lucide-map-pin"
                    class="mt-0.5 size-4 text-white/40"
                  />
                  <dd class="text-white/80">{{ nextEvent.venue_name }}</dd>
                </div>
                <div class="flex items-start gap-3">
                  <UIcon
                    name="i-lucide-ticket"
                    class="mt-0.5 size-4 text-white/40"
                  />
                  <dd class="text-white/80">
                    {{
                      formatPublicEventPrice(
                        nextEvent.price_cents,
                        nextEvent.payment_required,
                      )
                    }}
                  </dd>
                </div>
              </dl>

              <div class="mt-7 flex flex-col gap-2 sm:flex-row">
                <UButton
                  :to="bookingTarget"
                  color="primary"
                  block
                  label="Prenota ora"
                />
                <UButton
                  :to="`/eventi/${nextEvent.slug}`"
                  color="neutral"
                  variant="ghost"
                  block
                  label="Dettagli"
                />
              </div>
            </div>
          </article>

          <!-- Senza eventi pubblicati non si inventa una locandina. -->
          <div
            v-else
            class="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center"
          >
            <UIcon
              name="i-lucide-calendar-off"
              class="mx-auto size-8 text-white/30"
            />
            <p class="mt-4 font-medium text-white/80">
              Nessun evento in programma
            </p>
            <p class="mt-2 text-sm text-white/50">
              Stiamo preparando la prossima data. Torna a trovarci fra poco.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="border-t border-white/10 px-5 py-14 sm:px-8 lg:py-20">
      <div class="mx-auto max-w-7xl">
        <PublicSectionHeading
          :eyebrow="HOME_CONTENT.intro.eyebrow"
          :title="HOME_CONTENT.intro.title"
          :description="HOME_CONTENT.intro.description"
        />

        <div class="mt-10 grid gap-4 sm:grid-cols-3">
          <div
            v-for="(step, index) in HOME_CONTENT.steps"
            :key="step.title"
            class="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <div class="flex items-center gap-3">
              <span
                class="grid size-9 place-items-center rounded-xl bg-white/10 text-sm font-semibold text-white"
                >{{ index + 1 }}</span
              >
              <UIcon :name="step.icon" class="text-brand-red-400 size-5" />
            </div>
            <h3 class="font-display mt-4 text-lg font-semibold text-white">
              {{ step.title }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-white/55">{{ step.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="border-t border-white/10 px-5 py-14 sm:px-8 lg:py-20">
      <div class="mx-auto max-w-7xl">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <PublicSectionHeading
            :eyebrow="HOME_CONTENT.platforms.eyebrow"
            :title="HOME_CONTENT.platforms.title"
            :description="HOME_CONTENT.platforms.description"
          />
          <UButton
            to="/postazioni"
            color="neutral"
            variant="outline"
            label="Vedi tutte"
          />
        </div>

        <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="platform in previewPlatforms"
            :key="String(platform.id ?? platform.slug)"
            :to="`/postazioni/${platform.slug}`"
            class="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25"
          >
            <span
              class="inline-flex rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold tracking-wider text-white/70"
              >{{ platform.code }}</span
            >
            <h3 class="font-display mt-3 text-base font-semibold text-white">
              {{ platform.name }}
            </h3>
            <p
              v-if="platform.description"
              class="mt-2 line-clamp-2 text-sm text-white/50"
            >
              {{ platform.description }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="border-t border-white/10 px-5 py-14 sm:px-8 lg:py-20">
      <div class="mx-auto max-w-7xl">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <PublicSectionHeading
            :eyebrow="HOME_CONTENT.services.eyebrow"
            :title="HOME_CONTENT.services.title"
            :description="HOME_CONTENT.services.description"
          />
          <UButton
            to="/servizi"
            color="neutral"
            variant="outline"
            label="Tutti i servizi"
          />
        </div>

        <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="service in previewServices"
            :key="String(service.id ?? service.slug)"
            :to="`/servizi/${service.slug}`"
            class="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25"
          >
            <h3 class="font-display text-base font-semibold text-white">
              {{ service.title }}
            </h3>
            <p
              v-if="service.excerpt"
              class="mt-2 line-clamp-3 text-sm text-white/50"
            >
              {{ service.excerpt }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="border-t border-white/10 px-5 py-16 sm:px-8">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="font-display text-3xl font-semibold text-white sm:text-4xl">
          {{ HOME_CONTENT.closing.title }}
        </h2>
        <p class="mt-4 text-white/60">{{ HOME_CONTENT.closing.body }}</p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <UButton
            v-if="!isAuthenticated"
            to="/registrati"
            color="primary"
            size="lg"
            label="Crea il tuo account"
          />
          <UButton
            v-else
            to="/app"
            color="primary"
            size="lg"
            label="Vai all’area personale"
          />
        </div>
      </div>
    </section>
  </div>
</template>
