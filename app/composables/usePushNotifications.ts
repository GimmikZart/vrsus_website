import type { Database } from '~/types/database.types'

type OneSignalApi = {
  init(options: {
    appId: string
    allowLocalhostAsSecureOrigin?: boolean
    serviceWorkerPath: string
    serviceWorkerParam: { scope: string }
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
      optIn(): Promise<void>
      optOut(): Promise<void>
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
        await api.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/onesignal/' },
        })
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
      script.onerror = () => {
        script.remove()
        reject(new Error('PUSH_SDK_LOAD_FAILED'))
      }
      document.head.appendChild(script)
    }
  })

  try {
    return await existing.value
  } catch (error) {
    existing.value = null
    throw error
  }
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
  const enabledOnThisDevice = ref(false)
  const pending = ref(false)
  const error = ref('')

  async function refreshDeviceStatus() {
    const subscriptionId = import.meta.client
      ? localStorage.getItem('vrsus-push-subscription-id')
      : null
    if (!configured.value || !user.value?.sub || !subscriptionId) {
      enabledOnThisDevice.value = false
      return
    }
    const { data } = await client
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.value.sub)
      .eq('provider_subscription_id', subscriptionId)
      .eq('active', true)
      .maybeSingle()
    enabledOnThisDevice.value = Boolean(data)
  }

  async function enable() {
    if (!configured.value) throw new Error('PUSH_NOT_CONFIGURED')
    if (!user.value?.sub) throw new Error('AUTH_REQUIRED')
    pending.value = true
    error.value = ''
    try {
      const api = await loadOneSignal(String(config.public.oneSignalAppId))
      await api.login(user.value.sub)
      await api.Notifications.requestPermission()
      if (!api.Notifications.permission)
        throw new Error('PUSH_PERMISSION_NOT_GRANTED')
      await api.User.PushSubscription.optIn()
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
      localStorage.setItem('vrsus-push-subscription-id', subscriptionId)
      enabledOnThisDevice.value = true
      return subscriptionId
    } catch (caughtError) {
      error.value = String((caughtError as { message?: string }).message ?? '')
      throw caughtError
    } finally {
      pending.value = false
    }
  }

  async function disable() {
    if (!user.value?.sub) throw new Error('AUTH_REQUIRED')
    let api: OneSignalApi | null = null
    if (configured.value) {
      try {
        api = await loadOneSignal(String(config.public.oneSignalAppId))
      } catch {
        // Revoking the database mapping still stops server-side delivery.
      }
    }
    const { data: subscriptions, error: subscriptionsError } = await client
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.value.sub)
      .eq('active', true)
    if (subscriptionsError) throw subscriptionsError
    for (const subscription of subscriptions ?? []) {
      await client.rpc('deactivate_push_subscription', {
        p_subscription_id: subscription.id,
      })
    }
    if (api) {
      try {
        await api.User.PushSubscription.optOut()
        await api.logout()
      } catch {
        // The database mapping is already inactive.
      }
    }
    localStorage.removeItem('vrsus-push-subscription-id')
    enabledOnThisDevice.value = false
    await updateNotificationPreferences({
      push_enabled: false,
      email_enabled: false,
    })
  }

  async function revokeCurrentDevice() {
    if (!configured.value || !user.value?.sub) return
    let api: OneSignalApi | null = null
    try {
      api = await loadOneSignal(String(config.public.oneSignalAppId))
    } catch {
      // The locally stored ID still lets us revoke delivery when the SDK is down.
    }
    const subscriptionId =
      api?.User.PushSubscription.id ??
      localStorage.getItem('vrsus-push-subscription-id')
    if (subscriptionId) {
      const { data: subscription } = await client
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.value.sub)
        .eq('provider_subscription_id', subscriptionId)
        .maybeSingle()
      if (subscription) {
        await client.rpc('deactivate_push_subscription', {
          p_subscription_id: subscription.id,
        })
      }
    }
    localStorage.removeItem('vrsus-push-subscription-id')
    enabledOnThisDevice.value = false
    if (api) {
      await api.User.PushSubscription.optOut()
      await api.logout()
    }
  }

  return {
    configured,
    enabledOnThisDevice,
    pending,
    error,
    refreshDeviceStatus,
    enable,
    disable,
    revokeCurrentDevice,
  }
}
