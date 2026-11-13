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
import { providerTimeoutMs } from '../shared/requestLimits.js';

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
    <div className="mx-auto max-w-[1280px] px-5 phone:px-8 wide:px-12">
      <a
        className="fixed -top-20 left-6 z-10 rounded-lg bg-accent px-[18px] py-3.5 text-surface focus:top-4"
        href="#trip-form"
      >
        Skip to trip planner
      </a>
      <header className="flex h-20 items-center justify-between border-b border-line phone:h-[108px]">
        <a
          className="inline-flex items-center gap-3 text-[21px] font-[650] tracking-[-0.04em] text-ink no-underline phone:text-[23px]"
          href="/"
          aria-label="Wanderlux home"
        >
          <span className="grid size-[38px] place-items-center rounded-xl bg-accent text-page">
            <Compass size={23} strokeWidth={1.7} aria-hidden="true" />
          </span>
          Wanderlux
        </a>
        <div className="flex items-center gap-6">
          <span className="hidden text-[13px] text-muted phone:inline">
            A little room to wander.
          </span>
          <button
            className="icon-button size-11 border border-line"
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

      <main className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 py-9 tablet:grid-cols-[280px_minmax(0,1fr)] tablet:py-14 wide:grid-cols-[320px_minmax(0,1fr)] wide:gap-14">
        <aside className="tablet:sticky tablet:top-7">
          <div className="mb-7 tablet:mb-9">
            <h1 className="font-display text-[38px] leading-[1.05] font-normal tracking-[-0.035em] phone:text-[44px] tablet:text-[clamp(42px,4.4vw,58px)]">
              Plan your <br className="hidden tablet:block" />
              next trip.
            </h1>
            <p className="mt-5 text-[15px] leading-[1.65] text-muted">
              The places you’re curious about. <br className="hidden tablet:block" />
              The pace that feels right for you.
            </p>
          </div>
          <form id="trip-form" onSubmit={submitTrip} noValidate>
            <label htmlFor="trip-description">Your trip</label>
            <p className="small-copy mt-[7px] mb-3" id="trip-hint">
              A destination, a few interests, and up to 7 days.
            </p>
            <textarea
              className="form-field min-h-[145px] resize-y tablet:min-h-[180px]"
              id="trip-description"
              value={draftPrompt}
              onChange={(event) => setDraftPrompt(event.target.value)}
              maxLength={2000}
              placeholder="Three days in Jaipur. Great food, old architecture, and no early starts…"
              aria-describedby="trip-hint trip-length"
              aria-invalid={planner.status === 'error' && !draftPrompt.trim()}
              rows={6}
            />
            <span
              className="mt-[7px] block text-right text-[11px] text-muted tabular-nums"
              id="trip-length"
            >
              {draftPrompt.length} / 2,000
            </span>
            <div className="mt-[13px] mb-5 flex flex-wrap items-center gap-x-2 gap-y-[5px] text-[11px] text-muted">
              <span className="mb-0.5 w-full">Need an idea?</span>
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
            <button className="button button-primary w-full justify-start" type="submit">
              {busy ? (
                <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
              ) : (
                <Sparkles size={18} aria-hidden="true" />
              )}
              {busy ? 'Replace request' : 'Generate itinerary'}
              <ArrowRight className="ml-auto" size={18} aria-hidden="true" />
            </button>
            {busy ? (
              <button type="button" className="text-button mt-2 w-full" onClick={planner.cancel}>
                Cancel request
              </button>
            ) : null}
            <div
              className="mt-3 text-xs leading-[1.6] text-muted empty:hidden"
              role="status"
              aria-live="polite"
            >
              {busy
                ? `Planning your days. This can take up to ${providerTimeoutMs / 60_000} minutes.`
                : ''}
            </div>
            {planner.error ? (
              <div className="mt-3.5 text-[13px] leading-[1.6] text-danger" role="alert">
                <p>{planner.error}</p>
                {planner.canRetry ? (
                  <button
                    type="button"
                    className="text-button mt-1.5 pl-0 text-danger"
                    onClick={() => void planner.retry()}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    Retry last request
                  </button>
                ) : null}
              </div>
            ) : null}
          </form>

          <section
            className="mt-[26px] border-t border-line pt-6 tablet:mt-[34px]"
            aria-labelledby="saved-heading"
          >
            <div className="mb-3 flex items-center gap-2">
              <Bookmark size={17} aria-hidden="true" />
              <h2 className="text-sm font-semibold" id="saved-heading">
                Saved trips
              </h2>
              <span className="ml-auto text-[11px] text-muted">{savedState.trips.length} / 5</span>
            </div>
            {savedState.trips.length === 0 ? (
              <p className="small-copy">Your saved plans will stay in this browser.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {savedState.trips.map((session) => (
                  <li key={session.id}>
                    <button
                      className="flex min-h-11 w-full items-center justify-between gap-3.5 border-0 border-b border-line bg-transparent py-3 text-left text-xs hover:text-accent"
                      onClick={() => loadTrip(session)}
                      aria-label={`Load ${session.itinerary.title}`}
                    >
                      <span className="min-w-0 wrap-anywhere">{session.itinerary.title}</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {savedState.error ? (
              <div className="mt-3.5 text-[13px] leading-[1.6] text-danger" role="alert">
                <p>{savedState.error}</p>
                <button className="text-button mt-1.5 pl-0 text-danger" onClick={resetSavedTrips}>
                  Reset saved trips
                </button>
              </div>
            ) : null}
          </section>
          <p className="mt-[26px] text-[11px] leading-[1.7] text-muted tablet:max-w-[30ch]">
            Your brief is sent to the AI service. Saved trips stay on this device.
          </p>
        </aside>

        <div
          className="min-h-[450px] min-w-0 rounded-xl border border-line bg-surface px-4 py-5 phone:rounded-2xl phone:p-6 tablet:min-h-[680px] wide:p-8"
          aria-busy={busy}
        >
          {itinerary ? (
            <>
              <div>
                <div className="flex flex-col items-start justify-between gap-4 phone:flex-row phone:gap-5">
                  <h2 className="font-display text-[28px] leading-[1.2] font-normal tracking-[-0.025em] wrap-anywhere phone:text-[32px]">
                    {itinerary.title}
                  </h2>
                  <button
                    className="button button-secondary w-full shrink-0 phone:w-auto"
                    onClick={saveCurrentTrip}
                    disabled={busy}
                  >
                    <Bookmark size={16} aria-hidden="true" />
                    Save trip
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2.5 text-xs text-muted">
                  <span>
                    {itinerary.days.length} {itinerary.days.length === 1 ? 'day' : 'days'}
                  </span>
                  <span className="relative before:absolute before:top-1.5 before:-left-[9px] before:size-[3px] before:rounded-full before:bg-muted before:content-['']">
                    {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
                  </span>
                  <span className="relative before:absolute before:top-1.5 before:-left-[9px] before:size-[3px] before:rounded-full before:bg-muted before:content-['']">
                    {formatDuration(activityMinutes)} of activities
                  </span>
                </div>
                {itinerary.assumptions.length > 0 ? (
                  <ul className="mt-4 list-disc pl-4 text-xs leading-[1.7] text-muted">
                    {itinerary.assumptions.map((assumption, index) => (
                      <li key={index}>{assumption}</li>
                    ))}
                  </ul>
                ) : null}
                <p
                  className="mt-[13px] flex items-center gap-1.5 text-xs text-accent empty:hidden"
                  role="status"
                >
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
              <form
                className="mt-[34px] border-y border-line py-[22px]"
                onSubmit={submitRefinement}
              >
                <div className="mb-[18px] flex items-center gap-[9px] text-accent">
                  <Sparkles size={18} aria-hidden="true" />
                  <h3 className="text-base font-bold text-ink">Make it more your own.</h3>
                </div>
                <label className="mb-[9px] text-xs" htmlFor="refinement">
                  What would you change?
                </label>
                <div className="flex flex-col items-stretch gap-2.5 phone:flex-row phone:items-center tablet:flex-col tablet:items-stretch wide:flex-row wide:items-center">
                  <input
                    className="form-field min-w-0 rounded-lg p-3 phone:text-xs"
                    id="refinement"
                    value={instruction}
                    onChange={(event) => setInstruction(event.target.value)}
                    maxLength={2000}
                    placeholder="Less walking on day two, please."
                  />
                  <button
                    className="button button-secondary shrink-0"
                    type="submit"
                    disabled={busy || !instruction.trim()}
                  >
                    Apply changes
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
                <p className="small-copy mt-2.5">Refines the plan above, including your edits.</p>
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
          <p className="mt-[26px] border-t border-line pt-[19px] text-[11px] leading-[1.65] text-muted">
            AI-generated suggestions. Verify opening hours, travel times, and availability before
            booking.
          </p>
        </div>
      </main>
      <footer className="flex items-center justify-between gap-4 border-t border-line py-[26px] text-[11px] text-muted">
        <span>Wanderlux · Trip planner</span>
        <span className="hidden phone:inline">Plan a little. Leave some room.</span>
      </footer>
    </div>
  );
}
