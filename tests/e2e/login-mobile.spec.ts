import { expect, test, devices } from '@playwright/test'

test.use({
  ...devices['iPhone 13'],
  browserName: 'chromium',
  channel: 'chrome',
})

test('la pagina di login mostra il gesto di aggiornamento nella PWA Apple', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true })
  })
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() =>
    Boolean(document.getElementById('__nuxt')?.__vue_app__),
  )
  await expect(
    page.getByRole('heading', { name: 'Accedi a VRSUS' }),
  ).toBeVisible()

  await page
    .locator('main')
    .first()
    .evaluate((element) => {
      const touch = (y: number) =>
        new Touch({ identifier: 1, target: element, clientX: 180, clientY: y })
      const start = touch(180)
      const end = touch(310)
      element.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [start],
          changedTouches: [start],
        }),
      )
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [end],
          changedTouches: [end],
        }),
      )
    })

  await expect(page.getByRole('status')).toContainText(
    'Rilascia per aggiornare',
  )
})

test('un errore di rete al login termina il caricamento e mostra un messaggio', async ({
  page,
}) => {
  await page.route('**/auth/v1/token?grant_type=password', (route) =>
    route.abort('failed'),
  )
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() =>
    Boolean(document.getElementById('__nuxt')?.__vue_app__),
  )
  await page.getByRole('textbox', { name: 'Email' }).fill('prova@example.test')
  await page.getByLabel('Password').fill('password-di-prova')
  await page.getByRole('button', { name: 'Accedi', exact: true }).click()

  await expect(page.getByText('Accesso non riuscito')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Accedi', exact: true }),
  ).toBeEnabled()
})

test('dopo un accesso valido carica la pagina protetta con una nuova richiesta', async ({
  page,
}) => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const claims = {
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`

  await page.route('**/auth/v1/token?grant_type=password', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: token,
        refresh_token: 'test-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: userId,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'prova@example.test',
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      }),
    }),
  )
  await page.route('**/app', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<h1>Pagina dopo il login</h1>',
    }),
  )

  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() =>
    Boolean(document.getElementById('__nuxt')?.__vue_app__),
  )
  await page.getByRole('textbox', { name: 'Email' }).fill('prova@example.test')
  await page.getByLabel('Password').fill('password-di-prova')
  await page.getByRole('button', { name: 'Accedi', exact: true }).click()

  await expect(
    page.getByRole('heading', { name: 'Pagina dopo il login' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/app$/)
})
