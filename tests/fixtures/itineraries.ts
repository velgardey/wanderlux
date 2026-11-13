// Tests use invented, deterministic data. The working app always calls the real API.
export function createItinerary() {
  return {
    title: 'Three days in Jaipur',
    assumptions: ['A relaxed pace for two adults.'],
    days: [
      {
        dayNumber: 1,
        title: 'The old city',
        stops: [
          { id: 'stop-palace', title: 'City Palace', description: 'Explore the courtyards.', location: 'Old Jaipur', durationMinutes: 90 },
          { id: 'stop-lunch', title: 'A local lunch', description: 'Take a relaxed lunch break.', location: 'Old Jaipur', durationMinutes: 60 },
          { id: 'stop-market', title: 'Johari Bazaar', description: 'Walk through the market.', location: 'Johari Bazaar', durationMinutes: 45 },
        ],
      },
      { dayNumber: 2, title: 'A quieter afternoon', stops: [{ id: 'stop-garden', title: 'A garden walk', description: 'Leave room to slow down.', location: 'Jaipur', durationMinutes: 60 }] },
    ],
    blocks: [
      { type: 'card' as const, id: 'tip', title: 'Before you go', text: 'Confirm opening hours before visiting.' },
      { type: 'checklist' as const, id: 'packing', title: 'Pack for the day', items: [{ id: 'water', label: 'A water bottle' }, { id: 'hat', label: 'A hat' }] },
      { type: 'chart' as const, id: 'activity', title: 'Planned activity time', metric: 'activityMinutes' as const },
    ],
  };
}
