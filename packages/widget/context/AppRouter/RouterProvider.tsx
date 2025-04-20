// RouterProvider.tsx
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { AppRouter } from './routerTypes';

interface RouterProviderProps {
  children: ReactNode;
  router: AppRouter; // Now the router must be passed from outside
  onRouterReady?: () => void;
}

const RouterContext = createContext<AppRouter | null>(null);

export const useAppRouter = (): AppRouter => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useAppRouter must be used within a RouterProvider");
  }
  return context;
};

export const RouterProvider = ({ children, router, onRouterReady }: RouterProviderProps) => {
  if (!router) {
    throw new Error("Router must be passed to RouterProvider");
  }

  useEffect(() => {
    if (onRouterReady) {
      window.addEventListener('popstate', onRouterReady);
      // Optionally invoke the callback immediately
      onRouterReady();

      return () => {
        window.removeEventListener('popstate', onRouterReady);
      };
    }
  }, [onRouterReady]);

  return (
    <RouterContext.Provider value={router}>
      {children}
    </RouterContext.Provider>
  );
};
