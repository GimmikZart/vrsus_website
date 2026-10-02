<script setup lang="ts">
import type { ProfileDetailView } from '~~/shared/types/profile-view'

// Intestazione della scheda utente: foto, identita e numeri principali, nella
// forma di un profilo social. E la stessa ovunque si apra un utente.
const props = defineProps<{
  profile: ProfileDetailView
  /** Nasconde recapiti e dati anagrafici dove non sono ammessi. */
  publicOnly?: boolean
}>()

const initials = computed(() => {
  const source = [props.profile.firstName, props.profile.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  const fallback = props.profile.nickname ?? props.profile.displayName
  const letters = (source || fallback)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
  return letters || 'V'
})

const fullName = computed(() => {
  const parts = [props.profile.firstName, props.profile.lastName].filter(
    Boolean,
  )
  return parts.length ? parts.join(' ') : props.profile.displayName
})

const memberSince = computed(() =>
  new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(props.profile.createdAt)),
)

const stats = computed(() => [
  { label: 'Eventi', value: props.profile.totals.events },
  { label: 'Presenze', value: props.profile.totals.attended },
  { label: 'Tornei', value: props.profile.totals.tournaments },
  { label: 'Punti', value: props.profile.totals.points },
])
</script>

<template>
  <header class="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
    <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div
        class="bg-brand-red-500/15 border-brand-red-500/30 font-display grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border text-2xl font-semibold text-white sm:size-24"
      >
        <img
          v-if="profile.avatarPath"
          :src="profile.avatarPath"
          :alt="fullName"
          class="size-full object-cover"
        />
        <span v-else>{{ initials }}</span>
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="font-display text-2xl font-semibold text-white">
            {{ profile.nickname ?? profile.displayName }}
          </h1>
          <span
            v-for="role in profile.roles.filter((code) => code !== 'user')"
            :key="role"
            class="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] tracking-wide text-white/70 uppercase"
            >{{ role }}</span
          >
          <span
            v-if="profile.isMinor"
            class="rounded-full px-2.5 py-0.5 text-[11px] tracking-wide uppercase"
            :class="
              profile.guardianConsent
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-amber-500/15 text-amber-200'
            "
          >
            {{
              profile.guardianConsent
                ? 'Minore con consenso'
                : 'Minore senza consenso'
            }}
          </span>
        </div>

        <p v-if="!publicOnly" class="mt-1 text-white/70">{{ fullName }}</p>

        <ul
          class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/45"
        >
          <li v-if="profile.age !== null">{{ profile.age }} anni</li>
          <li v-if="!publicOnly && profile.email" class="truncate">
            {{ profile.email }}
          </li>
          <li v-if="!publicOnly && profile.phone">{{ profile.phone }}</li>
          <li>Iscritto da {{ memberSince }}</li>
        </ul>

        <dl class="mt-5 grid grid-cols-4 gap-2 text-center sm:max-w-md">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="rounded-xl bg-white/[0.04] py-2.5"
          >
            <dd class="font-display text-lg font-semibold text-white">
              {{ stat.value }}
            </dd>
            <dt
              class="mt-0.5 text-[11px] tracking-wide text-white/40 uppercase"
            >
              {{ stat.label }}
            </dt>
          </div>
        </dl>
      </div>

      <div class="shrink-0 empty:hidden">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
