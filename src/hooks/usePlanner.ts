import { useEffect, useRef, useState } from 'react';
import { PlannerRequestSchema, SavedSessionSchema, type Itinerary, type PlannerRequest, type SavedSession } from '../../shared/itinerary.js';
import { requestItinerary } from '../lib/api.js';
import { removeStop as removeStopFromItinerary, moveStop as moveStopInItinerary } from '../lib/itinerary.js';

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export function usePlanner() {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState('');
  const [expandedStopIds, setExpandedStopIds] = useState<string[]>([]);
  const [checkedItemIds, setCheckedItemIds] = useState<string[]>([]);

  // Refs update immediately without waiting for React's next render.
  const requestNumber = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const failedRequest = useRef<PlannerRequest | null>(null);

  useEffect(() => {
    return () => {
      requestNumber.current += 1;
      activeController.current?.abort();
    };
  }, []);

  function clearFailure() {
    failedRequest.current = null;
    setError('');
  }

  function cancel() {
    requestNumber.current += 1;
    activeController.current?.abort();
    activeController.current = null;
    clearFailure();
    setStatus(itinerary ? 'success' : 'idle');
  }

  async function runRequest(request: PlannerRequest) {
    const checkedRequest = PlannerRequestSchema.safeParse(request);
    if (!checkedRequest.success) {
      cancel();
      setError(request.mode === 'generate' ? 'Describe the trip you want to plan.' : 'Enter a refinement instruction of up to 2,000 characters.');
      setStatus('error');
      return;
    }

    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const thisRequestNumber = ++requestNumber.current;
    clearFailure();
    setStatus('loading');

    try {
      const nextItinerary = await requestItinerary(checkedRequest.data, controller.signal);
      // Abort is best effort. A response may already be finished when cancellation happens.
      if (thisRequestNumber !== requestNumber.current) return;

      setItinerary(nextItinerary);
      if (checkedRequest.data.mode === 'generate') {
        setPrompt(checkedRequest.data.prompt);
        setExpandedStopIds([]);
        setCheckedItemIds([]);
      } else {
        const survivingStopIds = new Set(nextItinerary.days.flatMap((day) => day.stops.map((stop) => stop.id)));
        const survivingItemIds = new Set(nextItinerary.blocks.flatMap((block) => block.type === 'checklist' ? block.items.map((item) => item.id) : []));
        setExpandedStopIds((previousIds) => previousIds.filter((id) => survivingStopIds.has(id)));
        setCheckedItemIds((previousIds) => previousIds.filter((id) => survivingItemIds.has(id)));
      }
      setStatus('success');
    } catch (requestError) {
      if (thisRequestNumber !== requestNumber.current) return;
      failedRequest.current = checkedRequest.data;
      setError(requestError instanceof Error ? requestError.message : 'The request failed. Please try again.');
      setStatus('error');
    } finally {
      // An old request must not clear the controller belonging to a newer one.
      if (thisRequestNumber === requestNumber.current) activeController.current = null;
    }
  }

  async function generate(nextPrompt: string) {
    await runRequest({ mode: 'generate', prompt: nextPrompt });
  }

  async function refine(instruction: string) {
    if (!itinerary) return;
    await runRequest({ mode: 'refine', instruction, itinerary });
  }

  async function retry() {
    const snapshot = failedRequest.current;
    if (snapshot) await runRequest(snapshot);
  }

  function removeStop(stopId: string) {
    if (activeController.current) return;
    // Clearing Retry prevents a failed refinement snapshot from restoring later deletions.
    clearFailure();
    setItinerary((current) => current ? removeStopFromItinerary(current, stopId) : current);
    setExpandedStopIds((ids) => ids.filter((id) => id !== stopId));
    setStatus(itinerary ? 'success' : 'idle');
  }

  function moveStop(stopId: string, direction: -1 | 1) {
    if (activeController.current) return;
    clearFailure();
    setItinerary((current) => current ? moveStopInItinerary(current, stopId, direction) : current);
    setStatus(itinerary ? 'success' : 'idle');
  }

  function toggleExpanded(stopId: string) {
    setExpandedStopIds((ids) => ids.includes(stopId) ? ids.filter((id) => id !== stopId) : [...ids, stopId]);
  }

  function toggleChecklistItem(itemId: string) {
    setCheckedItemIds((ids) => ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId]);
  }

  function loadSession(session: SavedSession) {
    const checkedSession = SavedSessionSchema.safeParse(session);
    if (!checkedSession.success) {
      setError('This saved trip could not be loaded.');
      return;
    }
    cancel();
    setItinerary(checkedSession.data.itinerary);
    setPrompt(checkedSession.data.prompt);
    setExpandedStopIds([]);
    const itemIds = new Set(checkedSession.data.itinerary.blocks.flatMap((block) => block.type === 'checklist' ? block.items.map((item) => item.id) : []));
    setCheckedItemIds(checkedSession.data.checkedItemIds.filter((id) => itemIds.has(id)));
    setStatus('success');
  }

  return {
    itinerary, status, error, prompt, expandedStopIds, checkedItemIds,
    canRetry: failedRequest.current !== null,
    generate, refine, cancel, retry, removeStop, moveStop, toggleExpanded, toggleChecklistItem, loadSession,
  };
}
