<script setup lang="ts">
import type { ProfileDetailView } from '~~/shared/types/profile-view'

// Intestazione della scheda utente: foto, identita e numeri principali, nella
// forma di un profilo social. E la stessa ovunque si apra un utente.
const props = defineProps<{
  profile: ProfileDetailView
  /** Nasconde recapiti e dati anagrafici dove non sono ammessi. */
  publicOnly?: boolean
  arciPending?: boolean
}>()

const emit = defineEmits<{
  requestArci: []
}>()

const infoOpen = ref(false)

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
  {
    label: 'Presenze',
    value: props.profile.totals.attended,
    icon: 'i-lucide-scan-line',
  },
  {
    label: 'Tornei',
    value: props.profile.totals.tournaments,
    icon: 'i-lucide-swords',
  },
  {
    label: 'Punti VRSUS',
    value: props.profile.totals.points,
    icon: 'i-lucide-trophy',
  },
])

const details = computed(() =>
  [
    props.profile.age !== null
      ? {
          label: 'Età',
          value: `${props.profile.age} anni`,
          icon: 'i-lucide-cake-slice',
        }
      : null,
    !props.publicOnly
      ? {
          label: 'Tessera ARCI',
          value: props.profile.arciCardValid ? 'Registrata' : 'Non registrata',
          icon: 'i-lucide-badge-check',
          arci: true,
        }
      : null,
    !props.publicOnly && props.profile.email
      ? {
          label: 'Email',
          value: props.profile.email,
          icon: 'i-lucide-mail',
        }
      : null,
    !props.publicOnly && props.profile.phone
      ? {
          label: 'Telefono',
          value: props.profile.phone,
          icon: 'i-lucide-phone',
        }
      : null,
    {
      label: 'Iscritto da',
      value: memberSince.value,
      icon: 'i-lucide-calendar-check-2',
    },
  ].filter(
    (
      item,
    ): item is {
      label: string
      value: string
      icon: string
      arci?: boolean
    } => item !== null,
  ),
)

const arciVerifiedLabel = computed(() => {
  const value = props.profile.arciVerifiedAt
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
})
</script>

<template>
  <header
    class="overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_15%_0%,rgba(181,41,64,0.14),transparent_38%),rgba(255,255,255,0.025)] px-4 py-4 sm:px-5"
  >
    <div class="flex items-center gap-4 sm:gap-6">
      <div
        class="bg-brand-red-500/15 border-brand-red-500/30 font-display grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border text-2xl font-semibold text-white shadow-lg shadow-black/25 sm:size-24"
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
        <p class="text-xs tracking-[0.18em] text-white/35 uppercase">Utente</p>
        <div class="mt-1 flex flex-wrap items-center gap-2">
          <h1
            class="font-display truncate text-2xl font-semibold text-white sm:text-3xl"
          >
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

        <p v-if="!publicOnly" class="mt-1 truncate text-sm text-white/55">
          {{ fullName }}
        </p>
      </div>

      <div class="shrink-0 empty:hidden">
        <slot name="actions" />
      </div>
    </div>

    <UiVrsusCollapse :open="infoOpen">
      <div class="pt-2">
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <component
            :is="detail.arci && !profile.arciCardValid ? 'button' : 'div'"
            v-for="detail in details"
            :key="detail.label"
            :type="detail.arci ? 'button' : undefined"
            :disabled="detail.arci ? arciPending : undefined"
            class="flex min-w-0 items-center gap-3 rounded-2xl bg-black/10 p-3 text-left"
            :class="
              detail.arci
                ? profile.arciCardValid
                  ? 'bg-emerald-500/10'
                  : 'bg-amber-500/10 transition-colors hover:bg-amber-500/15'
                : ''
            "
            @click="
              detail.arci && !profile.arciCardValid && emit('requestArci')
            "
          >
            <span
              class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-white/65"
              :class="
                detail.arci
                  ? profile.arciCardValid
                    ? 'text-emerald-300'
                    : 'text-amber-200'
                  : ''
              "
            >
              <UIcon :name="detail.icon" class="size-4.5" />
            </span>
            <div class="min-w-0">
              <p class="text-[10px] tracking-wide text-white/35 uppercase">
                {{ detail.label }}
              </p>
              <p
                class="mt-0.5 truncate text-sm font-medium"
                :class="
                  detail.arci
                    ? profile.arciCardValid
                      ? 'text-emerald-200'
                      : 'text-amber-100'
                    : 'text-white/80'
                "
              >
                {{
                  arciPending && detail.arci ? 'Registrazione…' : detail.value
                }}
              </p>
              <p
                v-if="detail.arci && profile.arciCardValid && arciVerifiedLabel"
                class="mt-0.5 text-[10px] text-emerald-300/60"
              >
                Verificata il {{ arciVerifiedLabel }}
              </p>
            </div>
          </component>
        </div>

        <dl class="mt-2 grid grid-cols-3 gap-2">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="rounded-2xl bg-white/[0.035] px-3 py-3"
          >
            <div class="flex items-center justify-between gap-2">
              <dt class="text-[10px] tracking-wide text-white/40 uppercase">
                {{ stat.label }}
              </dt>
              <UIcon :name="stat.icon" class="size-4 text-white/25" />
            </div>
            <dd class="font-display mt-1.5 text-2xl font-semibold text-white">
              {{ stat.value }}
            </dd>
          </div>
        </dl>
      </div>
    </UiVrsusCollapse>
    <button
      type="button"
      class="mx-auto mt-2 flex min-h-9 items-center gap-1.5 px-4 text-xs font-semibold tracking-wide text-white/50 uppercase transition-colors hover:text-white"
      :aria-expanded="infoOpen"
      @click="infoOpen = !infoOpen"
    >
      Info
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 transition-transform"
        :class="{ 'rotate-180': infoOpen }"
      />
    </button>
  </header>
</template>
