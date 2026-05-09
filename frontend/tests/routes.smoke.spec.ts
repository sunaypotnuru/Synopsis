import { test, expect } from '@playwright/test';

type Role = 'patient' | 'doctor' | 'admin';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/login/patient',
  '/login/doctor',
  '/login/admin',
  '/signup',
  '/signup/patient',
  '/signup/doctor',
  '/about',
  '/how-it-works',
  '/contact',
  '/privacy',
  '/author',
  '/terms',
  '/faq',
  '/services',
  '/pricing',
  '/help-center',
  '/impact',
  '/research',
  '/partners',
  '/press',
  '/careers',
  '/demo',
  '/blog',
  '/global-reach',
  // aliases
  '/register',
  '/privacy-policy',
  '/terms-of-service',
];

const PROTECTED_ROUTES: Array<{ role: Role; path: string }> = [
  // Patient
  { role: 'patient', path: '/patient/dashboard' },
  { role: 'patient', path: '/patient/models' },
  { role: 'patient', path: '/patient/scan' },
  { role: 'patient', path: '/patient/hospitals' },
  { role: 'patient', path: '/patient/doctors' },
  { role: 'patient', path: '/patient/appointments' },
  { role: 'patient', path: '/patient/history' },
  { role: 'patient', path: '/patient/profile' },
  { role: 'patient', path: '/patient/messages' },
  { role: 'patient', path: '/patient/timeline' },
  { role: 'patient', path: '/patient/achievements' },
  { role: 'patient', path: '/patient/documents' },
  { role: 'patient', path: '/patient/settings/notifications' },
  { role: 'patient', path: '/patient/chatbot' },
  { role: 'patient', path: '/patient/lab-analyzer' },
  { role: 'patient', path: '/patient/insurance' },
  { role: 'patient', path: '/patient/risk-assessment' },
  { role: 'patient', path: '/patient/medications' },
  { role: 'patient', path: '/patient/medication-schedule' },
  { role: 'patient', path: '/patient/tracker' },
  { role: 'patient', path: '/patient/mental-health' },
  { role: 'patient', path: '/patient/exercises' },
  { role: 'patient', path: '/patient/pro-questionnaires' },
  { role: 'patient', path: '/patient/search' },
  { role: 'patient', path: '/patient/cataract-scan' },
  { role: 'patient', path: '/patient/dr-scan' },
  { role: 'patient', path: '/patient/parkinsons-voice' },
  { role: 'patient', path: '/patient/settings' },

  // Doctor
  { role: 'doctor', path: '/doctor/dashboard' },
  { role: 'doctor', path: '/doctor/availability' },
  { role: 'doctor', path: '/doctor/appointments' },
  { role: 'doctor', path: '/doctor/scans' },
  { role: 'doctor', path: '/doctor/ratings' },
  { role: 'doctor', path: '/doctor/revenue' },
  { role: 'doctor', path: '/doctor/alerts' },
  { role: 'doctor', path: '/doctor/profile' },
  { role: 'doctor', path: '/doctor/messages' },
  { role: 'doctor', path: '/doctor/achievements' },
  { role: 'doctor', path: '/doctor/referrals' },
  { role: 'doctor', path: '/doctor/prescriptions' },
  { role: 'doctor', path: '/doctor/prescriptions/new' },
  { role: 'doctor', path: '/doctor/follow-up-templates' },
  { role: 'doctor', path: '/doctor/pro-builder' },
  { role: 'doctor', path: '/doctor/exercises' },
  { role: 'doctor', path: '/doctor/documents' },
  { role: 'doctor', path: '/doctor/settings/notifications' },
  { role: 'doctor', path: '/doctor/settings' },

  // Admin (index route + dashboard)
  { role: 'admin', path: '/admin' },
  { role: 'admin', path: '/admin/dashboard' },
  { role: 'admin', path: '/admin/patients' },
  { role: 'admin', path: '/admin/doctors' },
  { role: 'admin', path: '/admin/appointments' },
  { role: 'admin', path: '/admin/scans' },
  { role: 'admin', path: '/admin/settings' },
  { role: 'admin', path: '/admin/analytics' },
  { role: 'admin', path: '/admin/audit-logs' },
  { role: 'admin', path: '/admin/reports' },
  { role: 'admin', path: '/admin/messages' },
  { role: 'admin', path: '/admin/achievements' },
  { role: 'admin', path: '/admin/newsletter' },
  { role: 'admin', path: '/admin/blogs' },
  { role: 'admin', path: '/admin/contact-messages' },
  { role: 'admin', path: '/admin/reviews' },
  { role: 'admin', path: '/admin/team' },
  { role: 'admin', path: '/admin/epidemic-radar' },
  { role: 'admin', path: '/admin/system-health' },
  { role: 'admin', path: '/admin/configuration' },
  { role: 'admin', path: '/admin/security' },
];

async function setBypassAuth(page: import('@playwright/test').Page, role: Role) {
  // These are consumed by `useAuthStore.loadUser()` when VITE_BYPASS_AUTH === "true"
  await page.addInitScript(
    ([r]) => {
      localStorage.setItem('bypassRole', r);
      localStorage.setItem('bypassEmail', `playwright+${r}@example.com`);
    },
    [role],
  );
}

function attachConsoleAndPageErrorGuards(page: import('@playwright/test').Page, allowedConsoleErrorSubstrings: string[]) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const httpFailures: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (allowedConsoleErrorSubstrings.some((s) => text.includes(s))) return;
    consoleErrors.push(text);
  });
  page.on('pageerror', (err) => {
    pageErrors.push(String(err));
  });

  page.on('response', (resp) => {
    const status = resp.status();
    if (status < 400) return;
    const url = resp.url();
    // Only track app/backend requests; ignore data URLs.
    if (url.startsWith('http://') || url.startsWith('https://')) {
      httpFailures.push(`${status} ${url}`);
    }
  });

  return { consoleErrors, pageErrors, httpFailures };
}

async function assertNotFoundNotVisible(page: import('@playwright/test').Page) {
  // NotFoundPage renders a big "404" + "Page Not Found"
  await expect(page.getByText('404', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Page Not Found/i)).toHaveCount(0);
}

test.describe('Route smoke', () => {
  test('public routes load without 404/crash', async ({ page }) => {
    test.setTimeout(120_000);
    const { consoleErrors, pageErrors, httpFailures } = attachConsoleAndPageErrorGuards(page, [
      // Add known noisy-but-benign messages here if you see them
    ]);

    for (const path of PUBLIC_ROUTES) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(250);
      await assertNotFoundNotVisible(page);
    }

    expect(pageErrors, `pageerror(s):\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `console.error(s):\n${consoleErrors.join('\n')}`).toEqual([]);
    expect(httpFailures, `HTTP failure(s):\n${httpFailures.join('\n')}`).toEqual([]);
  });

  test('protected routes load with BYPASS_AUTH (patient/doctor/admin)', async ({ page }) => {
    test.setTimeout(300_000);
    const { consoleErrors, pageErrors, httpFailures } = attachConsoleAndPageErrorGuards(page, [
      // Chrome emits this for network failures; we assert on `httpFailures` with URLs instead.
      "Failed to load resource",
    ]);

    for (const { role, path } of PROTECTED_ROUTES) {
      await setBypassAuth(page, role);
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await assertNotFoundNotVisible(page);
    }

    expect(pageErrors, `pageerror(s):\n${pageErrors.join('\n')}`).toEqual([]);
    expect(httpFailures, `HTTP failure(s):\n${httpFailures.join('\n')}`).toEqual([]);
    expect(consoleErrors, `console.error(s):\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});

