import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  Compass,
  LoaderCircle,
  Moon,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react';
import { usePlanner } from './hooks/usePlanner.js';
import { readSessions, saveSession, sessionsStorageKey } from './lib/storage.js';
import { formatDuration } from './lib/itinerary.js';
import { ItineraryView } from './components/Itinerary.js';
import { ResultBlocks } from './components/ResultBlocks.js';
import { EmptyItinerary } from './components/EmptyItinerary.js';
import type { SavedSession } from '../shared/itinerary.js';

const examplePrompts = [
  {
    label: 'Jaipur, 3 days',
    prompt:
      'Three days in Jaipur for two adults. A relaxed pace, local food, architecture, and time to wander.',
  },
  {
    label: 'Kyoto, 4 days',
    prompt:
      'Four days in Kyoto, travelling solo. Temples, small cafes, and a quieter route with plenty of walking breaks.',
  },
];

export default function App() {
  const planner = usePlanner();
  const [draftPrompt, setDraftPrompt] = useState('');
  const [instruction, setInstruction] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [theme, setTheme] = useState(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  const [savedState, setSavedState] = useState<{ trips: SavedSession[]; error: string }>(() => {
    try {
      return { trips: readSessions(), error: '' };
    } catch (error) {
      return {
        trips: [],
        error: error instanceof Error ? error.message : 'Saved trips could not be read.',
      };
    }
  });
  const busy = planner.status === 'loading';
  const itinerary = planner.itinerary;
  const stopCount = itinerary?.days.reduce((total, day) => total + day.stops.length, 0) ?? 0;
  const activityMinutes =
    itinerary?.days.reduce(
      (total, day) =>
        total + day.stops.reduce((minutes, stop) => minutes + stop.durationMinutes, 0),
      0,
    ) ?? 0;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function submitTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveNotice('');
    void planner.generate(draftPrompt);
  }

  function submitRefinement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveNotice('');
    void planner.refine(instruction);
  }

  function saveCurrentTrip() {
    if (!itinerary || busy) return;
    const session: SavedSession = {
      version: 1,
      id: planner.sessionId ?? crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      prompt: planner.prompt,
      itinerary,
      checkedItemIds: planner.checkedItemIds,
    };
    try {
      const trips = saveSession(session);
      planner.markSaved(session.id);
      setSavedState({ trips, error: '' });
      setSaveNotice('Trip saved in this browser.');
    } catch (error) {
      setSavedState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'This trip could not be saved.',
      }));
      setSaveNotice('');
    }
  }

  function loadTrip(session: SavedSession) {
    planner.loadSession(session);
    setDraftPrompt(session.prompt);
    setInstruction('');
    setSaveNotice('Saved trip loaded.');
  }

  function resetSavedTrips() {
    if (
      !window.confirm(
        'Delete the saved trips in this browser? Your current working itinerary will stay open.',
      )
    )
      return;
    try {
      localStorage.removeItem(sessionsStorageKey);
      setSavedState({ trips: [], error: '' });
      setSaveNotice('Saved trips reset.');
    } catch {
      setSavedState((current) => ({
        ...current,
        error: 'Your browser could not reset saved trips.',
      }));
    }
  }

  return (
    <div className="page-shell">
      <a className="skip-link" href="#trip-form">
        Skip to trip planner
      </a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Wanderlux home">
          <span className="brand-mark">
            <Compass size={23} strokeWidth={1.7} aria-hidden="true" />
          </span>
          Wanderlux
        </a>
        <div className="header-actions">
          <span className="header-label">A little room to wander.</span>
          <button
            className="icon-button theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon size={19} aria-hidden="true" />
            ) : (
              <Sun size={19} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <main className="planner-layout">
        <aside className="planner-sidebar">
          <div className="intro">
            <h1>
              Plan your <br />
              next trip.
            </h1>
            <p>
              The places you’re curious about. <br />
              The pace that feels right for you.
            </p>
          </div>
          <form id="trip-form" onSubmit={submitTrip} noValidate>
            <label htmlFor="trip-description">Your trip</label>
            <p className="field-hint" id="trip-hint">
              A destination, a few interests, and up to 7 days.
            </p>
            <textarea
              id="trip-description"
              value={draftPrompt}
              onChange={(event) => setDraftPrompt(event.target.value)}
              maxLength={2000}
              placeholder="Three days in Jaipur. Great food, old architecture, and no early starts…"
              aria-describedby="trip-hint trip-length"
              aria-invalid={planner.status === 'error' && !draftPrompt.trim()}
              rows={6}
            />
            <span className="character-count" id="trip-length">
              {draftPrompt.length} / 2,000
            </span>
            <div className="prompt-examples">
              <span>Need an idea?</span>
              {examplePrompts.map((example) => (
                <button
                  className="example-button"
                  type="button"
                  key={example.label}
                  onClick={() => setDraftPrompt(example.prompt)}
                >
                  {example.label}
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              ))}
            </div>
            <button className="button button-primary generate-button" type="submit">
              {busy ? (
                <LoaderCircle className="loading-icon" size={18} aria-hidden="true" />
              ) : (
                <Sparkles size={18} aria-hidden="true" />
              )}
              {busy ? 'Replace request' : 'Generate itinerary'}
              <ArrowRight className="button-end-icon" size={18} aria-hidden="true" />
            </button>
            {busy ? (
              <button type="button" className="text-button cancel-button" onClick={planner.cancel}>
                Cancel request
              </button>
            ) : null}
            <div className="request-status" role="status" aria-live="polite">
              {busy ? 'Planning your days. This can take up to 30 seconds.' : ''}
            </div>
            {planner.error ? (
              <div className="request-error" role="alert">
                <p>{planner.error}</p>
                {planner.canRetry ? (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => void planner.retry()}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    Retry last request
                  </button>
                ) : null}
              </div>
            ) : null}
          </form>

          <section className="saved-trips" aria-labelledby="saved-heading">
            <div className="saved-heading">
              <Bookmark size={17} aria-hidden="true" />
              <h2 id="saved-heading">Saved trips</h2>
              <span>{savedState.trips.length} / 5</span>
            </div>
            {savedState.trips.length === 0 ? (
              <p className="small-copy">Your saved plans will stay in this browser.</p>
            ) : (
              <ul className="saved-list">
                {savedState.trips.map((session) => (
                  <li key={session.id}>
                    <button
                      className="saved-trip-button"
                      onClick={() => loadTrip(session)}
                      aria-label={`Load ${session.itinerary.title}`}
                    >
                      <span>{session.itinerary.title}</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {savedState.error ? (
              <div className="storage-error" role="alert">
                <p>{savedState.error}</p>
                <button className="text-button" onClick={resetSavedTrips}>
                  Reset saved trips
                </button>
              </div>
            ) : null}
          </section>
          <p className="privacy-note">
            Your brief is sent to the AI service. Saved trips stay on this device.
          </p>
        </aside>

        <div className="results-panel" aria-busy={busy}>
          {itinerary ? (
            <>
              <div className="itinerary-summary">
                <div className="result-title-row">
                  <h2>{itinerary.title}</h2>
                  <button
                    className="button button-secondary save-button"
                    onClick={saveCurrentTrip}
                    disabled={busy}
                  >
                    <Bookmark size={16} aria-hidden="true" />
                    Save trip
                  </button>
                </div>
                <div className="trip-facts">
                  <span>
                    {itinerary.days.length} {itinerary.days.length === 1 ? 'day' : 'days'}
                  </span>
                  <span>
                    {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
                  </span>
                  <span>{formatDuration(activityMinutes)} of activities</span>
                </div>
                {itinerary.assumptions.length > 0 ? (
                  <ul className="assumptions">
                    {itinerary.assumptions.map((assumption, index) => (
                      <li key={index}>{assumption}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="save-notice" role="status">
                  {saveNotice ? (
                    <>
                      <Check size={14} aria-hidden="true" />
                      {saveNotice}
                    </>
                  ) : null}
                </p>
              </div>
              <ItineraryView
                itinerary={itinerary}
                expandedStopIds={planner.expandedStopIds}
                busy={busy}
                onToggle={planner.toggleExpanded}
                onRemove={planner.removeStop}
                onMove={planner.moveStop}
              />
              <form className="refinement-form" onSubmit={submitRefinement}>
                <div className="refinement-heading">
                  <Sparkles size={18} aria-hidden="true" />
                  <h3>Make it more your own.</h3>
                </div>
                <label htmlFor="refinement">What would you change?</label>
                <div className="refinement-input-row">
                  <input
                    id="refinement"
                    value={instruction}
                    onChange={(event) => setInstruction(event.target.value)}
                    maxLength={2000}
                    placeholder="Less walking on day two, please."
                  />
                  <button
                    className="button button-secondary"
                    type="submit"
                    disabled={busy || !instruction.trim()}
                  >
                    Apply changes
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
                <p className="small-copy">Refines the plan above, including your edits.</p>
              </form>
              <ResultBlocks
                itinerary={itinerary}
                checkedItemIds={planner.checkedItemIds}
                onToggleItem={planner.toggleChecklistItem}
              />
            </>
          ) : (
            <EmptyItinerary busy={busy} />
          )}
          <p className="ai-note">
            AI-generated suggestions. Verify opening hours, travel times, and availability before
            booking.
          </p>
        </div>
      </main>
      <footer className="site-footer">
        <span>Wanderlux · Trip planner</span>
        <span>Plan a little. Leave some room.</span>
      </footer>
    </div>
  );
}
