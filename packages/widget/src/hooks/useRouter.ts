import { useEffect, useState, useMemo } from 'react';

interface RouterQuery {
  [key: string]: string | string[] | undefined;
}

export interface Router {
  query: RouterQuery;
  pathname: string;
  asPath: string;
  basePath: string;
  push: (url: string) => void;
  replace: (url: string) => void;
  back: () => void;
  forward: () => void;
  reload: () => void;
}

// Function to detect basePath from pathname
function detectBasePath(pathname: string): string {
  // Common base path patterns
  const commonBasePaths = ['/widget', '/embed', '/app', '/api'];

  for (const basePath of commonBasePaths) {
    if (pathname.startsWith(basePath)) {
      return basePath;
    }
  }

  // Check for versioned paths like /v1, /v2, etc.
  const versionMatch = pathname.match(/^\/v\d+/);
  if (versionMatch) {
    return versionMatch[0];
  }

  // Check if we're in a subdirectory (has at least 2 path segments)
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length >= 2) {
    // This might be a subdirectory deployment, but we can't be sure
    // Return empty string to be safe
    return '';
  }

  return '';
}

export function useRouter(configBasePath?: string): Router {
  const [, setForceUpdate] = useState({});

  // Force re-render when URL changes
  const forceUpdate = () => setForceUpdate({});

  useEffect(() => {
    // Listen for popstate events (back/forward buttons)
    window.addEventListener('popstate', forceUpdate);

    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args: Parameters<typeof originalPushState>) {
      originalPushState.apply(history, args);
      forceUpdate();
    };

    history.replaceState = function(...args: Parameters<typeof originalReplaceState>) {
      originalReplaceState.apply(history, args);
      forceUpdate();
    };

    return () => {
      window.removeEventListener('popstate', forceUpdate);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  const router = useMemo(() => {
    const url = new URL(window.location.href);

    // Parse query parameters
    const query: RouterQuery = {};
    url.searchParams.forEach((value, key) => {
      if (query[key]) {
        // Handle multiple values for the same key
        if (Array.isArray(query[key])) {
          (query[key] as string[]).push(value);
        } else {
          query[key] = [query[key] as string, value];
        }
      } else {
        query[key] = value;
      }
    });

    // Determine basePath - use configured value or detect from pathname
    const basePath = configBasePath ?? detectBasePath(url.pathname) ?? '';

    return {
      query,
      pathname: url.pathname,
      asPath: url.pathname + url.search + url.hash,
      basePath,

      push: (url: string) => {
        window.history.pushState(null, '', url);
        forceUpdate();
      },

      replace: (url: string) => {
        window.history.replaceState(null, '', url);
        forceUpdate();
      },

      back: () => {
        window.history.back();
      },

      forward: () => {
        window.history.forward();
      },

      reload: () => {
        window.location.reload();
      }
    };
  }, [forceUpdate]);

  return router;
}

export default useRouter;