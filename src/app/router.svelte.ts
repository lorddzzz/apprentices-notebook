export type Route = 'study' | 'combat' | 'codex' | 'lab';

const ROUTES: readonly Route[] = ['study', 'combat', 'codex', 'lab'];

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

let current = $state(parseHash(location.hash));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    current = parseHash(location.hash);
  });
}

export const router = {
  get route(): Route {
    return current.route;
  },
  get params(): URLSearchParams {
    return current.params;
  },
};

export function href(route: Route, params?: Record<string, string>): string {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  return `#/${route}${q}`;
}
