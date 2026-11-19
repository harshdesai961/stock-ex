import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Axe measures colours as they are painted right now, so a fade-in caught halfway reads as a
 * contrast failure that no one ever sees. With reduced motion every entrance finishes at once
 * (globals.css), and axe checks the colours the page settles on.
 */
async function settleMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

test('landing page loads and labels money as play money', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('stock');
  await expect(page.getByText(/play money only/i).first()).toBeVisible();
});

test('landing page sends a nonce-based CSP and hardening headers', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response?.headers() ?? {};
  expect(headers['content-security-policy']).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
  );
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-powered-by']).toBeUndefined();
});

for (const path of ['/', '/how-to-play']) {
  test(`${path} runs under the CSP without violations`, async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /Content Security Policy|Refused to/i.test(message.text())
      ) {
        violations.push(message.text());
      }
    });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(violations).toEqual([]);
  });

  test(`${path} has no detectable accessibility violations (WCAG 2.2 AA)`, async ({ page }) => {
    await settleMotion(page);
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  // 320px is the WCAG reflow width; it also leaves a margin for fonts that render wider on Linux.
  for (const width of [320, 360]) {
    test(`${path} doesn't scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  }
}

test('Call the Market plays a full round and is accessible mid-round', async ({ page }) => {
  await settleMotion(page);
  await page.goto('/');
  const practice = page.locator('#practice');
  await practice.getByRole('button', { name: 'Deal me in' }).click();
  await expect(practice.getByRole('listitem').filter({ hasText: 'Hidden card' })).toHaveCount(3);

  const results = await new AxeBuilder({ page }).include('#practice').withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);

  await practice.getByRole('button', { name: /Bull: it will rise/ }).click();
  const next = practice.getByRole('button', { name: /Next round|Start over/ }).first();
  await expect(next).toBeVisible({ timeout: 5_000 });
  await expect(practice.getByRole('listitem').filter({ hasText: 'Hidden card' })).toHaveCount(0);
  await expect(practice.getByText(/You called ▲ Bull on 1,000 shares/)).toBeVisible();
});

// CI runs the web app without the game server, so this covers the panel's own checks and that
// a valid code opens its room page. Creating and joining rooms is covered by the server's
// integration tests.
test('the room panel checks the nickname and code, then opens the room page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Pick a nickname');

  await page.getByRole('button', { name: 'Pick a random nickname' }).click();
  await expect(page.getByLabel(/Your nickname/)).not.toHaveValue('');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Quick play opens with public rooms');

  await page.getByLabel('Room code').fill('ab1');
  await page.getByRole('button', { name: 'Join' }).click();
  await expect(page.getByRole('status')).toContainText('5 characters');

  // 0 (zero) is left out of room codes because it looks like O.
  await page.getByLabel('Room code').fill('ab0cd');
  await page.getByRole('button', { name: 'Join' }).click();
  await expect(page.getByRole('status')).toContainText('That isn’t a room code');

  await page.getByLabel('Room code').fill('ab2cd');
  await page.getByRole('button', { name: 'Join' }).click();
  await expect(page).toHaveURL(/\/room\/AB2CD$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AB2CD');
});

test('motion can be paused', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Pause motion/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect(page.getByRole('button', { name: /Play motion/ })).toBeVisible();
});

test('the landing page links to the manual, which has the worked example', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Read the full manual' }).click();
  await expect(page).toHaveURL(/how-to-play/);
  await expect(page.getByRole('heading', { level: 1, name: 'How to Play' })).toBeVisible();
  await expect(page.getByText('+₹15 +₹10 +₹5 −₹10 −₹10 −₹5')).toBeVisible();
  await expect(page.getByText(/the movement is/)).toContainText('+5');
});
