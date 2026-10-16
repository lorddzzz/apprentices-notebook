export type Route = 'study' | 'trip' | 'trip-page' | 'codex' | 'lab' | 'gallery' | 'bench' | 'desk';

export const ROUTES: readonly Route[] = [
  'study',
  'trip',
  'trip-page',
  'codex',
  'lab',
  'gallery',
  'bench',
  'desk',
];

export interface Location {
  route: Route;
  params: URLSearchParams;
}

/** Parses `#/lab?scenario=smoke` → { route: 'lab', params: { scenario: 'smoke' } }. Unknown → study. */
export function parseHash(hash: string): Location {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?');
  const route = ROUTES.find((r) => r === path) ?? 'study';
  return { route, params: new URLSearchParams(query) };
}

export function href(route: Route, params?: Record<string, string>): string {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  return `#/${route}${q}`;
}
