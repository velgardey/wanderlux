import { expect, test } from '@playwright/test';
import { createItinerary } from './fixtures/itineraries.js';

test('a failed map module download preserves the working trip', async ({ page }) => {
  await page.route('**/api/itinerary', (route) =>
    route.fulfill({ json: { itinerary: createItinerary() } }),
  );
  await page.route('**/src/components/MapView.tsx*', (route) => route.abort());
  await page.route('**/api/location?*', (route) => route.fulfill({ json: { location: null } }));
  await page.goto('/');
  await page.getByLabel('Your trip').fill('Jaipur');
  await page.getByRole('button', { name: 'Generate itinerary' }).click();
  await page.getByRole('button', { name: 'Show map' }).click();
  await expect(page.getByRole('alert')).toContainText('The map could not open');
  await expect(page.getByRole('heading', { name: 'Three days in Jaipur' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save trip', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Hide map' }).click();
  await page.getByRole('button', { name: 'Remove City Palace' }).click();
  await expect(page.getByTestId('stop-title').filter({ hasText: 'City Palace' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save trip', exact: true }).click();
  await page.unroute('**/src/components/MapView.tsx*');
  await page.reload();
  await page.getByRole('button', { name: 'Load Three days in Jaipur' }).click();
  await page.getByRole('button', { name: 'Show map' }).click();
  await expect(page.getByText('No locations to display on the map.')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('large grouped popups fit a narrow map and can scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const itinerary = createItinerary();
  itinerary.days = [
    {
      ...itinerary.days[0],
      stops: Array.from({ length: 8 }, (_, index) => ({
        ...itinerary.days[0].stops[0],
        id: `group-${index}`,
        title: `Stop ${index + 1} with a longer readable title`,
      })),
    },
  ];
  await page.route('**/api/itinerary', (route) => route.fulfill({ json: { itinerary } }));
  await page.route('**/api/location?*', (route) =>
    route.fulfill({
      json: {
        location: {
          latitude: 26.92,
          longitude: 75.82,
          label: 'A long matched place label in Jaipur, Rajasthan, India. '.repeat(5),
        },
      },
    }),
  );
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.goto('/');
  await page.getByLabel('Your trip').fill('Jaipur');
  await page.getByRole('button', { name: 'Generate itinerary' }).click();
  await page.getByRole('button', { name: 'Show map' }).click();
  await page.locator('.leaflet-marker-icon').click();
  const content = page.locator('.leaflet-popup-content');
  await expect(content).toBeVisible();
  expect(await content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true,
  );
  const popup = await page.locator('.leaflet-popup').boundingBox();
  const map = await page.getByRole('region', { name: 'Itinerary map' }).boundingBox();
  expect(popup!.width).toBeLessThanOrEqual(map!.width);
  const lastStop = content.getByText('1.8 · Stop 8 with a longer readable title');
  await lastStop.scrollIntoViewIfNeeded();
  expect(await content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(lastStop).toBeInViewport();
});

test('optional map groups colocated stops and follows itinerary edits', async ({ page }) => {
  const locationQueries: string[] = [];
  await page.route('**/api/itinerary', (route) =>
    route.fulfill({ json: { itinerary: createItinerary() } }),
  );
  await page.route('**/api/location?*', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('query')!;
    locationQueries.push(query);
    const location =
      query === 'Jaipur'
        ? null
        : {
            latitude: query === 'Old Jaipur' ? 26.9258 : 26.916,
            longitude: query === 'Old Jaipur' ? 75.8237 : 75.826,
            label:
              query === 'Old Jaipur'
                ? 'City Palace area, Jaipur, India'
                : 'Johari Bazaar, Jaipur, India',
          };
    await route.fulfill({ json: { location } });
  });
  // Deterministic browser tests do not consume the public tile service.
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jUxQAAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  await expect(
    page.getByText('Your brief is sent to the AI service.', { exact: false }),
  ).toHaveCount(0);
  await expect(page.getByText('AI-generated suggestions.', { exact: false })).toHaveCount(0);
  await page.getByLabel('Your trip').fill('Jaipur');
  await page.getByRole('button', { name: 'Generate itinerary' }).click();
  await expect(page.getByRole('button', { name: 'Show map' })).toBeVisible();
  expect(locationQueries).toEqual([]);
  await page.getByRole('button', { name: 'Show map' }).click();
  await expect(page.getByRole('region', { name: 'Itinerary map' })).toBeVisible();
  const zoomButton = await page.getByRole('button', { name: 'Zoom in', exact: true }).boundingBox();
  expect(zoomButton!.width).toBeGreaterThanOrEqual(44);
  expect(zoomButton!.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole('status').filter({ hasText: '3 stops located.' })).toBeVisible();
  await expect(page.getByText('Could not locate: A garden walk.')).toBeVisible();
  expect(locationQueries).toEqual(['Old Jaipur', 'Johari Bazaar', 'Jaipur']);
  const colocatedPin = page.getByTitle('1.1 City Palace; 1.2 A local lunch', { exact: true });
  await expect(colocatedPin).toHaveAccessibleName('1.1 City Palace; 1.2 A local lunch');
  await colocatedPin.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.leaflet-popup').getByText('1.1 · City Palace')).toBeVisible();
  await expect(page.locator('.leaflet-popup').getByText('1.2 · A local lunch')).toBeVisible();
  await page.getByRole('button', { name: 'Move A local lunch up' }).click();
  await expect(
    page.getByTitle('1.1 A local lunch; 1.2 City Palace', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Remove City Palace' }).click();
  await expect(page.getByTitle('1.1 A local lunch', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '2 stops located.' })).toBeVisible();
  expect(locationQueries).toHaveLength(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Hide map' }).click();
  await expect(page.getByRole('region', { name: 'Itinerary map' })).toHaveCount(0);
});

test('map lookup failures can retry while the itinerary remains editable', async ({ page }) => {
  let fail = true;
  await page.route('**/api/itinerary', (route) =>
    route.fulfill({ json: { itinerary: createItinerary() } }),
  );
  await page.route('**/api/location?*', (route) =>
    route.fulfill(
      fail
        ? {
            status: 503,
            json: {
              error: {
                code: 'MAP_LOOKUP_FAILED',
                message: 'Map locations could not be loaded. Try again.',
              },
            },
          }
        : { json: { location: null } },
    ),
  );
  await page.goto('/');
  await page.getByLabel('Your trip').fill('Jaipur');
  await page.getByRole('button', { name: 'Generate itinerary' }).click();
  await page.getByRole('button', { name: 'Show map' }).click();
  await expect(page.getByRole('alert')).toContainText('Map locations could not be loaded');
  await expect(page.getByRole('button', { name: 'Remove City Palace' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save trip', exact: true })).toBeEnabled();
  fail = false;
  await page.getByRole('button', { name: 'Retry map' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('No locations to display on the map.')).toBeVisible();
});

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
  await expect(page.getByTestId('stop-title').first()).toHaveText('A local lunch');
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

test('keyboard-only actions work and removing the last stop restores focus', async ({ page }) => {
  let calls = 0;
  let releaseCancelledRequest: (() => void) | undefined;
  await page.route('**/api/itinerary', async (route) => {
    calls += 1;
    if (calls === 2) {
      await route.fulfill({
        status: 502,
        json: { error: { code: 'INVALID_OUTPUT', message: 'Please retry this itinerary.' } },
      });
      return;
    }
    if (calls === 4) {
      await new Promise<void>((resolve) => {
        releaseCancelledRequest = resolve;
      });
      await route.abort();
      return;
    }
    await route.fulfill({ json: { itinerary: createItinerary() } });
  });
  await page.goto('/');
  await page.getByLabel('Your trip').focus();
  await page.keyboard.insertText('Two days in Jaipur');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Jaipur, 3 days' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Generate itinerary' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Three days in Jaipur' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Save trip', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Expand City Palace' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Explore the courtyards.')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Move City Palace down' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('stop-title').first()).toHaveText('A local lunch');
  await page.getByRole('button', { name: 'Remove A garden walk' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'A quieter afternoon' })).toBeFocused();
  await page.getByRole('button', { name: 'Save trip', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Trip saved in this browser.')).toBeVisible();
  await page.getByRole('button', { name: 'Generate itinerary' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Please retry');
  await page.getByRole('button', { name: 'Retry last request' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Generate itinerary' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Cancel request' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel request' }).focus();
  await page.keyboard.press('Enter');
  releaseCancelledRequest?.();
  await expect(page.getByRole('button', { name: 'Generate itinerary' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Three days in Jaipur' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
