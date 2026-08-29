import { expect, test } from '@playwright/test'

test('home presents the VRSUS event call to action', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/VRSUS/)
  await expect(
    page.getByRole('heading', { name: /Il gioco è il punto di partenza/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Scopri il prossimo evento/i }),
  ).toBeVisible()
})

test('public event catalog and detail use the Supabase fixture', async ({
  page,
}) => {
  await page.goto('/eventi')

  await expect(
    page.getByRole('heading', { name: /Eventi da vivere insieme/i }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /VRSUS Demo/i })).toBeVisible()

  await page.getByRole('link', { name: /VRSUS Demo/i }).click()
  await expect(page).toHaveURL(/\/eventi\/vrsus-demo$/)
  await expect(page.getByRole('heading', { name: /VRSUS Demo/i })).toBeVisible()
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    1,
  )
})

test('public CMS pages render published content from Supabase views', async ({
  page,
}) => {
  await page.goto('/esperienze')
  await expect(
    page.getByRole('heading', { name: /Gioca come vuoi/i }),
  ).toBeVisible()
  await expect(page.getByText('Tekken 8 Demo')).toBeVisible()

  await page.goto('/news')
  await expect(
    page.getByRole('heading', { name: /Le storie di VRSUS/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Benvenuti in VRSUS/i }),
  ).toBeVisible()

  await page.goto('/servizi')
  await expect(
    page.getByRole('heading', { name: /Porta VRSUS nel tuo gruppo/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Eventi privati/i }),
  ).toBeVisible()

  await page.getByRole('link', { name: /Eventi privati/i }).click()
  await expect(
    page.getByRole('heading', { name: /Eventi privati/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Invia richiesta/i }),
  ).toBeVisible()
})

test('anonymous users are redirected away from protected areas', async ({
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

test('anonymous users cannot call the admin users endpoint', async ({
  page,
}) => {
  const response = await page.request.get('/api/admin/users')

  expect(response.status()).toBe(401)
})
