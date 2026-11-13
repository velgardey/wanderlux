import { expect, test } from '@playwright/test';
import { createItinerary } from './fixtures/itineraries.js';

test('generate, edit, save, reload, and refine a trip', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  let requestCount = 0;
  await page.route('**/api/itinerary', async (route) => {
    requestCount += 1;
    const request = route.request().postDataJSON();
    const itinerary = request.mode === 'refine' ? request.itinerary : createItinerary();
    await route.fulfill({ json: { itinerary } });
  });
  await page.goto('/');
  await page.getByLabel('Your trip').fill('Two days in Jaipur');
  await page.getByRole('button', { name: 'Generate itinerary' }).click();
  await expect(page.getByRole('heading', { name: 'Three days in Jaipur' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand City Palace' }).click();
  await expect(page.getByText('Explore the courtyards.')).toBeVisible();
  await page.getByRole('button', { name: 'Move A local lunch up' }).click();
  await expect(page.locator('.stop-title').first()).toHaveText('A local lunch');
  await page.getByRole('button', { name: 'Remove A local lunch' }).click();
  await expect(page.getByText('A local lunch', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove A garden walk' }).click();
  await expect(page.getByText('No stops left for this day.', { exact: false })).toBeVisible();
  await page.getByLabel('A water bottle').check();
  await page.getByRole('button', { name: 'Save trip', exact: true }).click();
  await expect(page.getByText('Trip saved in this browser.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Load Three days in Jaipur' }).click();
  await expect(page.getByLabel('A water bottle')).toBeChecked();
  await expect(page.getByText('No stops left for this day.', { exact: false })).toBeVisible();
  await page.getByLabel('What would you change?').fill('Keep this plan, including the empty day.');
  await page.getByRole('button', { name: 'Apply changes' }).click();
  await expect(page.getByRole('button', { name: 'Apply changes' })).toBeEnabled();
  await expect(page.getByLabel('A water bottle')).toBeChecked();
  expect(requestCount).toBe(2);
  expect(consoleErrors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('a failed request can retry without destroying the current itinerary', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/itinerary', async (route) => {
    calls += 1;
    if (calls === 2) {
      await route.fulfill({
        status: 502,
        json: {
          error: {
            code: 'INVALID_OUTPUT',
            message: 'The model returned an itinerary we could not use.',
          },
        },
      });
    } else {
      await route.fulfill({ json: { itinerary: createItinerary() } });
    }
  });
  await page.goto('/');
  await page.getByLabel('Your trip').fill('Jaipur');
  await page.getByRole('button', { name: 'Generate itinerary' }).click();
  await expect(page.getByRole('heading', { name: 'Three days in Jaipur' })).toBeVisible();
  await page.getByRole('button', { name: 'Generate itinerary' }).click();
  await expect(page.getByRole('alert')).toContainText('The model returned');
  await expect(page.getByRole('heading', { name: 'Three days in Jaipur' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry last request' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Three days in Jaipur' })).toBeVisible();
});

test('supports keyboard entry and the theme control', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to trip planner' })).toBeFocused();
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
