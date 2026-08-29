import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'

const nodeVersion = readFileSync(
  new URL('./.nvmrc', import.meta.url),
  'utf8',
).trim()
const nvmNodeExecutable =
  process.platform === 'win32' && process.env.NVM_HOME
    ? join(process.env.NVM_HOME, `v${nodeVersion}`, 'node.exe')
    : process.execPath
const nodeRuntimeDirectory = dirname(nvmNodeExecutable)
const inheritedPath = process.env.PATH ?? process.env.Path ?? ''

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `"${nvmNodeExecutable}" node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1`,
    url: 'http://127.0.0.1:3000',
    timeout: 240_000,
    env: {
      PATH: [nodeRuntimeDirectory, inheritedPath]
        .filter(Boolean)
        .join(delimiter),
    },
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
