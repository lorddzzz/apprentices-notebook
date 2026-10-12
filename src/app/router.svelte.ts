import { href, type Location, parseHash, type Route } from './routes';

const hasLocation = typeof location !== 'undefined';

let current = $state.raw<Location>(parseHash(hasLocation ? location.hash : ''));

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

/** Navigate. `replace` rewrites the current history entry (redirects, scenario picks). */
export function go(
  route: Route,
  params?: Record<string, string>,
  opts: { replace?: boolean } = {},
): void {
  const hash = href(route, params);
  if (!hasLocation) {
    current = parseHash(hash);
  } else if (opts.replace) {
    history.replaceState(null, '', hash);
    current = parseHash(hash);
  } else {
    location.hash = hash;
  }
}
