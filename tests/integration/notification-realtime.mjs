// Run against local Supabase with: node tests/integration/notification-realtime.mjs
// Creates two disposable accounts, checks insert/update delivery and RLS,
// then deletes both accounts even when an assertion fails.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env')
const url = process.env.NUXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NUXT_PUBLIC_SUPABASE_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anonKey || !serviceKey || !url.includes('127.0.0.1')) {
  throw new Error('Local Supabase credentials are required')
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const users = []
const channels = []
const clients = []

function waitForEvent(events, eventType) {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(
      () => reject(new Error(`${eventType} not received`)),
      8000,
    )
    const check = setInterval(() => {
      const event = events.find((item) => item.eventType === eventType)
      if (!event) return
      clearInterval(check)
      clearTimeout(deadline)
      resolve(event)
    }, 25)
  })
}

async function createTestUser() {
  const email = `notification-${randomUUID()}@example.test`
  const password = randomUUID() + randomUUID()
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (created.error || !created.data.user)
    throw created.error ?? new Error('User creation failed')
  users.push(created.data.user.id)
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  clients.push(client)
  const signedIn = await client.auth.signInWithPassword({ email, password })
  if (signedIn.error) throw signedIn.error
  await client.realtime.setAuth(signedIn.data.session.access_token)
  return { id: created.data.user.id, client }
}

async function subscribe(client, userId, events) {
  const channel = client.channel(`notification-test-${userId}`).on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => events.push(payload),
  )
  channels.push({ client, channel })
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Realtime subscription timed out')),
      8000,
    )
    channel.subscribe((status, error) => {
      if (error) process.stderr.write(`Realtime: ${status}: ${error.message}\n`)
      if (status !== 'SUBSCRIBED') return
      clearTimeout(timeout)
      resolve()
    })
  })
}

try {
  const a = await createTestUser()
  const b = await createTestUser()
  const aEvents = []
  const bEvents = []
  await subscribe(a.client, a.id, aEvents)
  await subscribe(b.client, b.id, bEvents)

  const inserted = await admin
    .from('notifications')
    .insert({
      user_id: a.id,
      type: 'integration_test',
      title: 'Only A',
      message: 'Private',
    })
    .select('id')
    .single()
  if (inserted.error) throw inserted.error
  const notificationId = inserted.data.id
  const received = await waitForEvent(aEvents, 'INSERT')
  assert.equal(received.new.id, notificationId)
  assert.equal(received.new.user_id, a.id)

  const update = await a.client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (update.error) throw update.error
  const updated = await waitForEvent(aEvents, 'UPDATE')
  assert.equal(updated.new.id, notificationId)
  assert.ok(updated.new.read_at)

  const bInbox = await b.client
    .from('notifications')
    .select('id')
    .eq('id', notificationId)
  if (bInbox.error) throw bInbox.error
  assert.equal(bInbox.data.length, 0)
  await new Promise((resolve) => setTimeout(resolve, 500))
  assert.equal(bEvents.length, 0)
  process.stdout.write(
    'Notification Realtime insert/update and user isolation: PASS\n',
  )
} finally {
  for (const { client, channel } of channels)
    await client.removeChannel(channel)
  for (const client of clients) client.realtime.disconnect()
  for (const id of users) await admin.auth.admin.deleteUser(id)
}
