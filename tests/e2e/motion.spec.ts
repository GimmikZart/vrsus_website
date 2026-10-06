import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

// DEV fixtures only. Never use real accounts or a remote Supabase instance.
const localEnv = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(/^([A-Z_]+)=(.*)$/)
      return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : []
    }),
)
const url = localEnv.NUXT_PUBLIC_SUPABASE_URL ?? ''
if (!/^http:\/\/(127\.0\.0\.1|localhost):54331\/?$/.test(url)) {
  throw new Error('Motion E2E requires the isolated local VRSUS Supabase.')
}
const admin = createClient(url, localEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const runId = randomUUID().slice(0, 8)
const email = `motion-${runId}-0@example.test`
const password = randomUUID()
const userIds: string[] = []
let rankingId = ''

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  for (let index = 0; index < 4; index += 1) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `motion-${runId}-${index}@example.test`,
      password,
      email_confirm: true,
      user_metadata: {
        nickname: `Motion_${runId}_${index}`,
        first_name: 'Motion',
        last_name: 'QA',
        birth_date: '1990-01-01',
      },
    })
    if (error) throw error
    userIds.push(data.user.id)
  }
  const { data: role, error: roleError } = await admin
    .from('roles')
    .select('id')
    .eq('code', 'admin')
    .single()
  if (roleError) throw roleError
  const { error: grantError } = await admin
    .from('user_roles')
    .insert({ user_id: userIds[0], role_id: role.id })
  if (grantError) throw grantError
  const { data: game, error: gameError } = await admin
    .from('public_games')
    .select('id')
    .limit(1)
    .single()
  if (gameError) throw gameError
  const { data: ranking, error: rankingError } = await admin
    .from('game_rankings')
    .insert({
      game_id: game.id,
      name: `Motion QA ${runId}`,
      rules: 'Regole di prova motion: vince il punteggio maggiore.',
      status: 'open',
      is_public: true,
    })
    .select('id')
    .single()
  if (rankingError) throw rankingError
  rankingId = ranking.id
  const { error: scoresError } = await admin.from('game_scores').insert(
    userIds.map((id, index) => ({
      user_id: id,
      recorded_by: userIds[0],
      game_id: game.id,
      ranking_id: rankingId,
      score: 100 - index * 10,
    })),
  )
  if (scoresError) throw scoresError
})

test.afterAll(async () => {
  if (rankingId) {
    await admin.from('game_scores').delete().eq('ranking_id', rankingId)
    await admin.from('game_rankings').delete().eq('id', rankingId)
  }
  for (const id of userIds) await admin.auth.admin.deleteUser(id)
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const samples: { text: string; time: number }[] = []
    Object.assign(window, { __vrsusMotionSamples: samples })
    const seen = new WeakSet<Element>()
    new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target
        if (
          target instanceof HTMLElement &&
          target.parentElement?.matches('ol[data-motion="rows"]') &&
          target.style.willChange &&
          Number(target.style.opacity) > 0 &&
          Number(target.style.opacity) < 0.99 &&
          !seen.has(target)
        ) {
          seen.add(target)
          samples.push({
            text: target.textContent ?? '',
            time: performance.now(),
          })
        }
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    })
  })
  await page.addInitScript(() =>
    localStorage.setItem('vrsus-install-prompt-seen', '1'),
  )
  await page.goto('/login')
  await page.waitForFunction(() =>
    Boolean(document.getElementById('__nuxt')?.__vue_app__),
  )
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Accedi', exact: true }).click()
  await expect(page).toHaveURL(/\/app$/)
  await page.waitForLoadState('networkidle')
})

test('logo, card, classifica e dettagli funzionano su mobile e desktop', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/app/ranking')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('header img[alt="VRSUS"]')).toBeVisible()
  const gallery = page.locator('[data-motion="cards"]')
  await expect(gallery).toBeVisible()
  await page
    .getByRole('link', { name: new RegExp(`Motion QA ${runId}`) })
    .click()
  await expect(page).toHaveURL(new RegExp(rankingId))
  await page.waitForLoadState('networkidle')
  const rows = page.locator('ol[data-motion="rows"] > li')
  await expect(rows).toHaveCount(4)
  await expect
    .poll(() =>
      rows.evaluateAll((elements) =>
        elements.every((element) => !element.getAttribute('style')),
      ),
    )
    .toBe(true)
  await expect(rows.first()).toContainText(`Motion_${runId}_0`)
  const samples = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __vrsusMotionSamples: { text: string; time: number }[]
        }
      ).__vrsusMotionSamples,
  )
  expect(samples).toHaveLength(4)
  samples.forEach((sample, index) =>
    expect(sample.text).toContain(`Motion_${runId}_${index}`),
  )
  expect(samples[3].time - samples[0].time).toBeLessThan(400)
  await page.getByRole('button', { name: 'Regole', exact: true }).click()
  await expect(
    page.getByText('Regole di prova motion:', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Regole', exact: true }).click()
  await expect(
    page.getByText('Regole di prova motion:', { exact: false }),
  ).toBeHidden()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true)
  await page.screenshot({ path: testInfo.outputPath('ranking-mobile.png') })

  await page.goto(`/admin/ranking/${rankingId}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Assegna punti', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin/utenti')
  await page.waitForLoadState('networkidle')
  await expect(
    page.getByRole('heading', { name: 'Utenti', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('link', { name: new RegExp(`Motion_${runId}_0`) })
    .click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Info', exact: true }).click()
  await expect(page.locator('.vrsus-collapse.is-open')).toBeVisible()
  await page.getByRole('button', { name: 'Info', exact: true }).click()
  await expect(page.locator('.vrsus-collapse')).toHaveAttribute('inert', '')
  await page.getByRole('tab', { name: /Tornei/ }).click()
  const activeTab = page.getByRole('tab', { name: /Tornei/ })
  await expect(activeTab).toHaveAttribute('aria-selected', 'true')
  await expect
    .poll(async () => {
      const marker = await page.locator('.vrsus-tab-marker').boundingBox()
      const tab = await activeTab.boundingBox()
      return marker && tab
        ? Math.abs(marker.x - tab.x) + Math.abs(marker.width - tab.width)
        : 100
    })
    .toBeLessThan(2)
  await page.screenshot({ path: testInfo.outputPath('profile-desktop.png') })
  expect(errors).toEqual([])
})

test('movimento ridotto conserva contenuti visibili e focus immediato', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/app/ranking/${rankingId}`)
  await page.waitForLoadState('networkidle')
  const rows = page.locator('ol[data-motion="rows"] > li')
  await expect(rows).toHaveCount(4)
  for (const row of await rows.all()) {
    await expect(row).toBeVisible()
    await expect(row).not.toHaveAttribute('style', /opacity|transform/)
  }
  await page.getByRole('button', { name: 'Regole', exact: true }).focus()
  await expect(
    page.getByRole('button', { name: 'Regole', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(
    page.getByText('Regole di prova motion:', { exact: false }),
  ).toBeVisible()
})
