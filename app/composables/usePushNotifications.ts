import type { Database } from '~/types/database.types'

type OneSignalApi = {
  init(options: {
    appId: string
    allowLocalhostAsSecureOrigin?: boolean
  }): Promise<void>
  login(externalId: string): Promise<void>
  logout(): Promise<void>
  Notifications: {
    permission: boolean
    requestPermission(): Promise<void>
  }
  User: {
    PushSubscription: {
      id: string | null
    }
  }
}

declare global {
  interface Window {
    OneSignal?: OneSignalApi
    OneSignalDeferred?: Array<(api: OneSignalApi) => void | Promise<void>>
  }
}

async function loadOneSignal(appId: string): Promise<OneSignalApi> {
  if (!import.meta.client) throw new Error('PUSH_CLIENT_ONLY')
  if (window.OneSignal) return window.OneSignal

  const existing = useState<Promise<OneSignalApi> | null>(
    'onesignal-sdk-promise',
    () => null,
  )
  if (existing.value) return existing.value

  existing.value = new Promise<OneSignalApi>((resolve, reject) => {
    const deferred = (window.OneSignalDeferred ??= [])
    deferred.push(async (api) => {
      try {
        await api.init({ appId, allowLocalhostAsSecureOrigin: true })
        resolve(api)
      } catch (error) {
        reject(error)
      }
    })

    if (!document.querySelector('script[data-vrsus-onesignal]')) {
      const script = document.createElement('script')
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
      script.async = true
      script.defer = true
      script.dataset.vrsusOnesignal = 'true'
      script.onerror = () => reject(new Error('PUSH_SDK_LOAD_FAILED'))
      document.head.appendChild(script)
    }
  })

  return existing.value
}

async function waitForSubscriptionId(api: OneSignalApi) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (api.User.PushSubscription.id) return api.User.PushSubscription.id
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return null
}

export function usePushNotifications() {
  const config = useRuntimeConfig()
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const configured = computed(() => Boolean(config.public.oneSignalAppId))
  const pending = ref(false)
  const error = ref('')

  async function enable() {
    if (!configured.value) throw new Error('PUSH_NOT_CONFIGURED')
    if (!user.value?.sub) throw new Error('AUTH_REQUIRED')
    pending.value = true
    error.value = ''
    try {
      const api = await loadOneSignal(String(config.public.oneSignalAppId))
      await api.login(user.value.sub)
      await api.Notifications.requestPermission()
      const subscriptionId = await waitForSubscriptionId(api)
      if (!subscriptionId) throw new Error('PUSH_PERMISSION_NOT_GRANTED')
      const { error: subscriptionError } = await client.rpc(
        'upsert_push_subscription',
        {
          p_provider: 'onesignal',
          p_provider_subscription_id: subscriptionId,
          p_device_label: navigator.userAgent.slice(0, 120),
        },
      )
      if (subscriptionError) throw subscriptionError
      return subscriptionId
    } catch (caughtError) {
      error.value = String((caughtError as { message?: string }).message ?? '')
      throw caughtError
    } finally {
      pending.value = false
    }
  }

  async function disable() {
    const { data: subscriptions, error: subscriptionsError } = await client
      .from('push_subscriptions')
      .select('id')
      .eq('active', true)
    if (subscriptionsError) throw subscriptionsError
    for (const subscription of subscriptions ?? []) {
      await client.rpc('deactivate_push_subscription', {
        p_subscription_id: subscription.id,
      })
    }
    await updateNotificationPreferences({
      push_enabled: false,
      email_enabled: false,
    })
  }

  return { configured, pending, error, enable, disable }
}
