import type { Database } from '~/types/database.types'

export type UserNotification =
  Database['public']['Tables']['notifications']['Row']
export type NotificationPreferences =
  Database['public']['Tables']['notification_preferences']['Row']

export function useMyNotifications() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  return useAsyncData(
    () => `my-notifications-${user.value?.sub ?? 'guest'}`,
    async () => {
      if (!user.value?.sub) return []
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', user.value.sub)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
  )
}

export function useUnreadNotificationCount() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  return useAsyncData(
    () => `my-unread-notifications-${user.value?.sub ?? 'guest'}`,
    async () => {
      if (!user.value?.sub) return 0
      const { count, error } = await client
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.value.sub)
        .is('read_at', null)
      if (error) throw error
      return count ?? 0
    },
    { lazy: true, default: () => 0 },
  )
}

export function useNotificationRealtime() {
  const client = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { data: unreadCount, refresh: refreshCount } =
    useUnreadNotificationCount()

  async function refresh() {
    await Promise.all([
      refreshNuxtData(`my-notifications-${user.value?.sub ?? 'guest'}`),
      refreshCount(),
    ])
  }

  if (import.meta.client) {
    let channel: ReturnType<typeof client.channel> | null = null
    let stopWatching: (() => void) | null = null
    let connectVersion = 0
    const connect = async (userId?: string) => {
      const version = ++connectVersion
      if (channel) {
        void client.removeChannel(channel)
        channel = null
      }
      if (!userId) return
      const { data: sessionData } = await client.auth.getSession()
      if (
        !sessionData.session ||
        sessionData.session.user.id !== userId ||
        user.value?.sub !== userId ||
        version !== connectVersion
      )
        return
      await client.realtime.setAuth(sessionData.session.access_token)
      channel = client
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void refresh()
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void refresh()
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') void refresh()
        })
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    onMounted(() => {
      stopWatching = watch(
        () => user.value?.sub,
        (userId) => {
          void connect(userId).catch(() => undefined)
        },
        { immediate: true },
      )
      document.addEventListener('visibilitychange', onVisible)
    })
    onUnmounted(() => {
      connectVersion += 1
      stopWatching?.()
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) void client.removeChannel(channel)
    })
  }

  return { unreadCount, refresh }
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
  const user = useSupabaseUser()
  return useAsyncData(
    () => `my-notification-preferences-${user.value?.sub ?? 'guest'}`,
    async () => {
      if (!user.value?.sub) return null
      const { data, error } = await client
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.value.sub)
        .maybeSingle()
      if (error) throw error
      return data
    },
  )
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
