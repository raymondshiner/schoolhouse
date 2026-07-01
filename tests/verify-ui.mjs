// Headless UI verification — drives Playwright against the dev server.
// Usage: node tests/verify-ui.mjs   (dev server must be running on :5173)
//
// The app is gated behind Google SSO, which can't be automated headlessly, so
// this verifies the reachable surface: the auth gate renders correctly and
// error-free on desktop + mobile. Authenticated-flow E2E needs a seeded
// Supabase session (tracked in PROJECT.md open questions).
import { chromium, devices } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/'
const SHOTS = '/tmp/schoolhouse-shots'

const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function verify(label, ctx) {
  const page = await ctx.newPage()
  page.on('pageerror', (err) =>
    record(`${label}/no-console-errors`, false, err.message),
  )
  await page.goto(BASE, { waitUntil: 'networkidle' })

  // Unauthenticated visitors are redirected to /login.
  record(`${label}/redirects to login`, /\/login$/.test(page.url()), page.url())

  // Brand wordmark present.
  const brand = page.getByText(/^schoolhouse$/i).first()
  record(`${label}/brand wordmark`, await brand.isVisible())

  // Google sign-in CTA present.
  const cta = page.getByRole('button', { name: /continue with google/i })
  record(`${label}/google sign-in visible`, await cta.isVisible())

  await page.screenshot({ path: `${SHOTS}/${label}-login.png`, fullPage: true })
  await page.close()
}

const browser = await chromium.launch({ headless: true })
try {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  await verify('desktop', desktop)
  await desktop.close()

  const mobile = await browser.newContext({ ...devices['iPhone 13'] })
  await verify('mobile', mobile)
  await mobile.close()
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) {
  console.log('FAILURES:')
  failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`))
}
process.exit(failed.length === 0 ? 0 : 1)
