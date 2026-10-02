/**
 * Installazione dell'app sul dispositivo.
 *
 * Il browser non espone un comando "installa": manda un evento
 * `beforeinstallprompt` quando ritiene il sito installabile, e quell'evento va
 * conservato perche e l'unico modo per aprire la finestra di installazione in
 * un momento scelto da noi. L'evento arriva una volta sola per caricamento,
 * quindi lo stato vive a livello di modulo e non dentro la funzione.
 *
 * Safari su iPhone non manda niente e non ha un'installazione automatica: li
 * l'unica strada e spiegare il gesto (Condividi, poi Aggiungi alla schermata
 * Home), ed e il motivo per cui questo composable espone anche la piattaforma.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPlatform = 'ios' | 'android' | 'desktop'

const deferredPrompt = shallowRef<InstallPromptEvent | null>(null)
const installed = ref(false)
let listening = false

export function detectPlatform(): InstallPlatform {
  if (import.meta.server) return 'desktop'

  const ua = navigator.userAgent
  // Un iPad recente si presenta come Macintosh: lo distingue il touch.
  const isIpadOs = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1

  if (/iPhone|iPad|iPod/i.test(ua) || isIpadOs) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

/** Vero quando l'app e gia aperta come applicazione installata. */
export function detectStandalone(): boolean {
  if (import.meta.server) return false

  const iosStandalone = (navigator as Navigator & { standalone?: boolean })
    .standalone

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    iosStandalone === true
  )
}

export function usePwaInstall() {
  const platform = ref<InstallPlatform>('desktop')
  const standalone = ref(false)

  onMounted(() => {
    platform.value = detectPlatform()
    standalone.value = detectStandalone()

    if (listening) return
    listening = true

    window.addEventListener('beforeinstallprompt', (event) => {
      // Senza questo il browser mostra il proprio invito quando vuole lui.
      event.preventDefault()
      deferredPrompt.value = event as InstallPromptEvent
    })

    window.addEventListener('appinstalled', () => {
      installed.value = true
      deferredPrompt.value = null
    })
  })

  /** Il browser sa installare da solo: possiamo offrire un bottone vero. */
  const canPromptInstall = computed(() => deferredPrompt.value !== null)

  async function promptInstall(): Promise<
    'accepted' | 'dismissed' | 'unavailable'
  > {
    const event = deferredPrompt.value
    if (!event) return 'unavailable'

    await event.prompt()
    const { outcome } = await event.userChoice
    // L'evento si consuma: un secondo `prompt()` verrebbe rifiutato.
    deferredPrompt.value = null

    return outcome
  }

  return {
    platform,
    standalone,
    installed,
    canPromptInstall,
    promptInstall,
  }
}
