import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.js';
import { createItinerary } from './fixtures/itineraries.js';

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
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
    expect(screen.getByText('4h 15m of activities')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Expand City Palace' }));
    expect(screen.getByText('Explore the courtyards.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove A local lunch' }));
    expect(screen.queryByText('A local lunch')).toBeNull();
    expect(screen.getByText('3h 15m of activities')).toBeTruthy();
    expect(screen.getByText('2h 15m')).toBeTruthy();
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

  it('reset confirmation protects saved data, the working trip and unrelated storage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ itinerary: createItinerary() }))),
    );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    localStorage.setItem('trip-planner:sessions:v1', '{broken');
    localStorage.setItem('another-app', 'keep this');
    render(<App />);
    fireEvent.change(screen.getByLabelText('Your trip'), { target: { value: 'Jaipur' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate itinerary' }));
    await screen.findByRole('heading', { name: 'Three days in Jaipur' });
    fireEvent.click(screen.getByRole('button', { name: 'Reset saved trips' }));
    expect(localStorage.getItem('trip-planner:sessions:v1')).toBe('{broken');
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset saved trips' }));
    expect(localStorage.getItem('trip-planner:sessions:v1')).toBeNull();
    expect(localStorage.getItem('another-app')).toBe('keep this');
    expect(screen.getByRole('heading', { name: 'Three days in Jaipur' })).toBeTruthy();
    expect(screen.getByText('Saved trips reset.')).toBeTruthy();
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
