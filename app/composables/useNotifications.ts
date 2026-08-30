import type { Database } from '~/types/database.types'

export type UserNotification =
  Database['public']['Tables']['notifications']['Row']
export type NotificationPreferences =
  Database['public']['Tables']['notification_preferences']['Row']

export function useMyNotifications() {
  const client = useSupabaseClient<Database>()
  return useAsyncData('my-notifications', async () => {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data ?? []
  })
}

export async function markNotificationRead(notificationId: string) {
  const client = useSupabaseClient<Database>()
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (error) throw error
}

export async function markAllNotificationsRead(notificationIds: string[]) {
  if (!notificationIds.length) return
  const client = useSupabaseClient<Database>()
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', notificationIds)
  if (error) throw error
}

export function useNotificationPreferences() {
  const client = useSupabaseClient<Database>()
  return useAsyncData('my-notification-preferences', async () => {
    const { data, error } = await client
      .from('notification_preferences')
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data
  })
}

export async function updateNotificationPreferences(
  preferences: Pick<NotificationPreferences, 'push_enabled' | 'email_enabled'>,
) {
  const client = useSupabaseClient<Database>()
  const { data, error } = await client.rpc('upsert_notification_preferences', {
    p_push_enabled: preferences.push_enabled,
    p_email_enabled: preferences.email_enabled,
  })
  if (error) throw error
  return data
}
