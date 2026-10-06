import { expect, test } from '@playwright/test'

test('la home presenta la locandina e la call to action', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/VRSUS/)
  await expect(
    page.getByRole('heading', { name: /Il gioco è il punto di partenza/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Scopri le postazioni/i }),
  ).toBeVisible()
  // La locandina viene da Supabase, non da copy nel frontend. Il titolo dipende
  // da quale evento e il prossimo, quindi si verifica che ci sia e che porti
  // alla sua scheda, non quale evento sia (DEC-030).
  const poster = page.getByTestId('home-next-event-title')
  await expect(poster).toBeVisible()
  await expect(poster).not.toBeEmpty()
  await expect(page.getByRole('link', { name: /^Dettagli$/ })).toHaveAttribute(
    'href',
    /^\/eventi\/[a-z0-9-]+$/,
  )
})

test('il catalogo eventi e il dettaglio leggono da Supabase', async ({
  page,
}) => {
  await page.goto('/eventi')

  await expect(
    page.getByRole('link', { name: /VRSUS Demo/i }).first(),
  ).toBeVisible()

  await page
    .getByRole('link', { name: /VRSUS Demo/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/eventi\/vrsus-demo$/)
  await expect(page.getByRole('heading', { name: /VRSUS Demo/i })).toBeVisible()
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    1,
  )
})

test('le postazioni pubbliche escludono quelle interne', async ({ page }) => {
  await page.goto('/postazioni')

  await expect(
    page.getByRole('heading', { name: /Il catalogo delle postazioni/i }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /PlayStation 5/i })).toBeVisible()

  // `Postazione regia` e marcata come interna: non deve mai comparire.
  await expect(page.getByText('Postazione regia')).toHaveCount(0)

  await page.getByRole('link', { name: /PlayStation 5/i }).click()
  await expect(page).toHaveURL(/\/postazioni\/playstation-5$/)
  await expect(
    page.getByRole('heading', { name: 'Tekken 8', exact: true }),
  ).toBeVisible()
})

test('chi siamo e servizi rendono il contenuto della vetrina', async ({
  page,
}) => {
  await page.goto('/chi-siamo')
  await expect(
    page.getByRole('heading', { name: /VRSUS nasce da una convinzione/i }),
  ).toBeVisible()

  await page.goto('/servizi')
  await expect(
    page.getByRole('link', { name: /Team building/i }).first(),
  ).toBeVisible()

  await page
    .getByRole('link', { name: /Team building/i })
    .first()
    .click()
  await expect(
    page.getByRole('heading', { name: /Team building/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Invia richiesta/i }),
  ).toBeVisible()
})

test('la registrazione chiede il consenso solo ai minorenni', async ({
  page,
}) => {
  await page.goto('/registrati')
  // La sezione compare per reattivita lato client: serve l'idratazione.
  await page.waitForLoadState('networkidle')

  await expect(
    page.getByRole('heading', { name: /Registrati a VRSUS/i }),
  ).toBeVisible()

  const consentHeading = page.getByRole('heading', {
    name: /Consenso di un genitore o tutore/i,
  })
  await expect(consentHeading).toHaveCount(0)

  // La sezione compare al variare della data di nascita, senza ricaricare.
  await page.locator('input[type="date"]').fill('2012-04-15')
  await expect(consentHeading).toBeVisible()

  await page.locator('input[type="date"]').fill('1990-04-15')
  await expect(consentHeading).toHaveCount(0)
})

test('gli utenti anonimi vengono respinti dalle aree protette', async ({
  page,
}) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)app/)
  await expect(
    page.getByRole('heading', { name: /Accedi a VRSUS/i }),
  ).toBeVisible()

  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)admin/)
})

test('gli endpoint admin rifiutano le chiamate anonime', async ({ page }) => {
  const placeholderId = '00000000-0000-4000-8000-000000000000'

  for (const endpoint of [
    '/api/admin/users',
    '/api/admin/ranking-users',
    '/api/admin/events',
    '/api/admin/platforms',
    '/api/admin/board',
    '/api/admin/summary',
    '/api/admin/dashboard',
    // Gli endpoint dinamici verificano il ruolo prima del parametro: un id
    // qualunque, purche ben formato, deve comunque fermarsi a 401.
    `/api/admin/users/${placeholderId}`,
    `/api/admin/tournaments/${placeholderId}`,
  ]) {
    const response = await page.request.get(endpoint)
    expect(response.status(), endpoint).toBe(401)
  }
})

test('le sottoaree utente e admin restano protette', async ({ page }) => {
  for (const path of [
    '/app/ranking',
    '/app/tornei',
    '/app/scrivici',
    '/app/impostazioni',
    '/admin/piattaforme',
    '/admin/giochi',
    '/admin/impostazioni',
    '/admin/utenti',
    '/admin/tornei',
  ]) {
    await page.goto(path)
    await expect(page).toHaveURL(
      new RegExp(`/login\\?redirect=.*${path.replaceAll('/', '\\/')}`),
    )
  }
})
