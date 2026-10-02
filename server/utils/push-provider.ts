import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

type PushMessage = {
  title: string
  message: string
  actionUrl?: string | null
  data?: Record<string, unknown>
  idempotencyKey?: string
}

export type PushDispatchResult = {
  configured: boolean
  attempted: boolean
  delivered: boolean
  recipientCount: number
  error?: string
}

export async function sendOneSignalPush(
  event: H3Event,
  userIds: string[],
  message: PushMessage,
): Promise<PushDispatchResult> {
  const config = useRuntimeConfig(event)
  const appId = String(config.public.oneSignalAppId ?? '')
  const apiKey = String(config.oneSignalRestApiKey ?? '')

  if (!appId || !apiKey) {
    return {
      configured: false,
      attempted: false,
      delivered: false,
      recipientCount: 0,
      error: 'ONESIGNAL_NOT_CONFIGURED',
    }
  }

  const uniqueUserIds = [...new Set(userIds)].filter(Boolean)
  if (!uniqueUserIds.length) {
    return {
      configured: true,
      attempted: false,
      delivered: false,
      recipientCount: 0,
    }
  }

  const client = serverSupabaseServiceRole<Database>(event)
  const { data: preferences, error: preferencesError } = await client
    .from('notification_preferences')
    .select('user_id')
    .eq('push_enabled', true)
    .in('user_id', uniqueUserIds)

  if (preferencesError) {
    return {
      configured: true,
      attempted: false,
      delivered: false,
      recipientCount: 0,
      error: preferencesError.message,
    }
  }
  const eligibleUserIds = (preferences ?? []).map((row) => row.user_id)
  if (!eligibleUserIds.length) {
    return {
      configured: true,
      attempted: false,
      delivered: false,
      recipientCount: 0,
    }
  }
  const { data: subscriptions, error: subscriptionsError } = await client
    .from('push_subscriptions')
    .select('provider_subscription_id')
    .eq('provider', 'onesignal')
    .eq('active', true)
    .in('user_id', eligibleUserIds)

  if (subscriptionsError) {
    return {
      configured: true,
      attempted: false,
      delivered: false,
      recipientCount: 0,
      error: subscriptionsError.message,
    }
  }

  const subscriptionIds = [
    ...new Set(
      (subscriptions ?? [])
        .map((subscription) => subscription.provider_subscription_id)
        .filter(Boolean),
    ),
  ]

  if (!subscriptionIds.length) {
    return {
      configured: true,
      attempted: false,
      delivered: false,
      recipientCount: 0,
    }
  }

  let launchUrl: string | undefined
  if (
    message.actionUrl?.startsWith('/') &&
    !message.actionUrl.startsWith('//')
  ) {
    try {
      launchUrl = new URL(
        message.actionUrl,
        String(config.public.appBaseUrl),
      ).toString()
    } catch {
      // A malformed launch URL must not cancel the notification itself.
    }
  }

  const payload = {
    app_id: appId,
    target_channel: 'push',
    include_subscription_ids: subscriptionIds,
    headings: { it: message.title, en: message.title },
    contents: { it: message.message, en: message.message },
    ...(launchUrl ? { url: launchUrl } : {}),
    ...(message.data ? { data: message.data } : {}),
    ...(message.idempotencyKey
      ? { idempotency_key: message.idempotencyKey }
      : {}),
  }

  let response: Response | null = null
  let responseText = ''
  let transportError = ''
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch('https://api.onesignal.com/notifications?c=push', {
        method: 'POST',
        headers: {
          Authorization: `Key ${apiKey}`,
          'Content-Type': 'application/json',
          'OneSignal-Usage': 'VRSUS | Partner Integration',
        },
        body: JSON.stringify(payload),
      })
      responseText = await response.text()
    } catch (error) {
      response = null
      transportError = String((error as Error).message ?? 'REQUEST_FAILED')
      if (attempt < 2) continue
      break
    }
    if (response.ok) break
    if (![429, 503].includes(response.status) || attempt === 2) break
    const retryAfter = Number(response.headers.get('retry-after') ?? '1')
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(Math.max(retryAfter, 1) * 1000, 5000)),
    )
  }

  if (!response?.ok) {
    return {
      configured: true,
      attempted: true,
      delivered: false,
      recipientCount: subscriptionIds.length,
      error: `ONESIGNAL_${response?.status ?? 'REQUEST_FAILED'}:${(responseText || transportError).slice(0, 240)}`,
    }
  }

  return {
    configured: true,
    attempted: true,
    delivered: true,
    recipientCount: subscriptionIds.length,
  }
}
