<script setup lang="ts">
// Invito a installare l'app, al primo accesso da un dispositivo.
//
// Compare una volta sola per dispositivo: la scelta finisce in `localStorage`,
// che e per browser e non per account, ed e quello che serve qui - l'invito
// riguarda il telefono che hai in mano, non l'identita con cui ti colleghi.
//
// Non compare mai se l'app e gia aperta come applicazione installata.
const STORAGE_KEY = 'vrsus-install-prompt-seen'

const { platform, standalone, canPromptInstall, promptInstall } =
  usePwaInstall()

const open = ref(false)
const pending = ref(false)

function alreadySeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // Navigazione privata o cookie di sito bloccati: meglio non insistere.
    return true
  }
}

function remember() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Niente da fare: l'invito ricomparira al prossimo accesso.
  }
}

onMounted(() => {
  if (standalone.value || alreadySeen()) return

  // Un attimo di respiro: `beforeinstallprompt` arriva dopo il primo render, e
  // aspettarlo permette di mostrare il bottone vero invece delle istruzioni.
  setTimeout(() => {
    if (standalone.value || alreadySeen()) return
    open.value = true
  }, 1500)
})

function close() {
  remember()
  open.value = false
}

async function install() {
  pending.value = true
  try {
    const outcome = await promptInstall()
    if (outcome !== 'dismissed') close()
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="open"
        class="fixed inset-0 z-50 grid place-items-end bg-black/75 p-4 backdrop-blur-sm sm:place-items-center"
        @click.self="close"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-prompt-title"
          class="vrsus-dialog-panel w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0f14] p-5 shadow-2xl shadow-black/60"
        >
          <div class="flex items-start gap-3">
            <UiVrsusBrandMark compact />
            <div>
              <h2
                id="install-prompt-title"
                class="font-display text-lg leading-tight font-semibold text-white"
              >
                Installa VRSUS
              </h2>
              <p class="mt-1 text-sm leading-6 text-white/55">
                Si apre a schermo intero come un'app, parte piu in fretta e
                tieni il QR del check-in a portata di mano.
              </p>
            </div>
          </div>

          <!-- Android e desktop: il browser sa farlo, basta chiederglielo. -->
          <p
            v-if="canPromptInstall"
            class="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/65"
          >
            Tocca <span class="text-white">Installa</span>: ci pensa il browser,
            non scarichi niente da uno store.
          </p>

          <!-- iPhone e iPad: nessuna installazione automatica, solo il gesto. -->
          <div
            v-else-if="platform === 'ios'"
            class="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/65"
          >
            <p>Su iPhone si fa dal menu di Safari:</p>
            <ol class="mt-2 space-y-1 text-white/55">
              <li>
                1. tocca
                <UIcon
                  name="i-lucide-share"
                  class="mx-0.5 -mb-0.5 size-4 text-white/80"
                />
                <span class="text-white">Condividi</span>, in basso;
              </li>
              <li>
                2. scorri e scegli
                <span class="text-white">Aggiungi alla schermata Home</span>;
              </li>
              <li>3. conferma con <span class="text-white">Aggiungi</span>.</li>
            </ol>
          </div>

          <p
            v-else
            class="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/65"
          >
            Apri il menu del browser e cerca
            <span class="text-white">Installa applicazione</span> (o
            <span class="text-white">Aggiungi alla schermata Home</span>).
          </p>

          <div
            class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
          >
            <UButton
              color="neutral"
              variant="ghost"
              label="Non ora"
              :disabled="pending"
              @click="close"
            />
            <UButton
              v-if="canPromptInstall"
              color="primary"
              icon="i-lucide-download"
              label="Installa"
              :loading="pending"
              @click="install"
            />
            <UButton
              v-else
              color="primary"
              variant="outline"
              label="Ho capito"
              @click="close"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
