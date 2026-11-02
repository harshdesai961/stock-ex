import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

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

test('the room panel validates input and says rooms are not open yet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Pick a nickname');

  await page.getByRole('button', { name: 'Pick a random nickname' }).click();
  await expect(page.getByLabel(/Your nickname/)).not.toHaveValue('');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('open soon');

  await page.getByLabel('Room code').fill('ab1');
  await page.getByRole('button', { name: 'Join' }).click();
  await expect(page.getByRole('status')).toContainText('5 characters');
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
