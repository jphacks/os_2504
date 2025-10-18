import { useEffect, useState } from 'react';

export type Route =
  | { kind: 'dashboard' }
  | { kind: 'participant'; roomCode: string };

function parseRoute(pathname: string): Route {
  const match = /^\/r\/([A-Za-z0-9_-]+)/.exec(pathname.trim());
  if (match) {
    return { kind: 'participant', roomCode: match[1] };
  }
  return { kind: 'dashboard' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));

  useEffect(() => {
    const handler = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
    };
  }, []);

  return route;
}
