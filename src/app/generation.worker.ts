import type { Profile, Trip } from '$engine';
import { generateRoom, roomInput } from '$engine/drawing';
import { serializeBoard } from '$engine/notation';

/** What the worker is asked (EN-4, P36): the profile and trip as saved, and the room. Plain JSON. */
export interface InkRequest {
  profile: Profile;
  trip: Trip;
  room: number;
}
export interface InkReply {
  layout: string;
  ms: number;
}

/** Pure: the engine's room for this input, serialized. `onmessage` only wraps it. */
export function handle(msg: InkRequest): InkReply {
  const start = performance.now();
  const layout = serializeBoard(generateRoom(roomInput(msg.profile, msg.trip, msg.room)).layout);
  return { layout, ms: performance.now() - start };
}

interface WorkerScope {
  WorkerGlobalScope?: unknown;
  onmessage: ((e: MessageEvent<InkRequest & { id: number }>) => void) | null;
  postMessage(m: unknown): void;
}
const scope = globalThis as unknown as WorkerScope;
// Only inside a worker: a test or the page importing `handle` must not claim its message port.
if (scope.WorkerGlobalScope !== undefined) {
  scope.onmessage = (e) => {
    const { id, ...req } = e.data;
    try {
      scope.postMessage({ id, ...handle(req) });
    } catch (err) {
      scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
    }
  };
}
