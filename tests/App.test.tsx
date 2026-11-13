import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.js';
import { createItinerary } from './fixtures/itineraries.js';

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());
describe('planner screen', () => {
  it('generates a trip and exposes local stop controls and distinct blocks', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ itinerary: createItinerary() })),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fireEvent.change(screen.getByLabelText('Your trip'), {
      target: { value: 'Two days in Jaipur' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate itinerary' }));
    expect(await screen.findByRole('heading', { name: 'Three days in Jaipur' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Expand City Palace' }));
    expect(screen.getByText('Explore the courtyards.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove A local lunch' }));
    expect(screen.queryByText('A local lunch')).toBeNull();
    expect(screen.getByLabelText('A water bottle')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Planned activity time' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('saves a session and restores it after remounting', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(
          async () => new Response(JSON.stringify({ itinerary: createItinerary() })),
        ),
    );
    const view = render(<App />);
    fireEvent.change(screen.getByLabelText('Your trip'), { target: { value: 'Jaipur' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate itinerary' }));
    await screen.findByRole('heading', { name: 'Three days in Jaipur' });
    fireEvent.click(screen.getByLabelText('A water bottle'));
    fireEvent.click(screen.getByRole('button', { name: 'Save trip' }));
    await waitFor(() => expect(screen.getByText('Trip saved in this browser.')).toBeTruthy());
    view.unmount();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Load Three days in Jaipur/ }));
    expect(screen.getByRole('heading', { name: 'Three days in Jaipur' })).toBeTruthy();
    expect((screen.getByLabelText('A water bottle') as HTMLInputElement).checked).toBe(true);
  });

  it('can still generate when saved storage is corrupted', async () => {
    localStorage.setItem('trip-planner:sessions:v1', '{broken');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(
          async () => new Response(JSON.stringify({ itinerary: createItinerary() })),
        ),
    );
    render(<App />);
    expect(screen.getByText('Saved trips could not be read.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Your trip'), { target: { value: 'Jaipur' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate itinerary' }));
    expect(await screen.findByRole('heading', { name: 'Three days in Jaipur' })).toBeTruthy();
  });
});
