type AppRouteLocation = string | { pathname: string; query?: { [key: string]: any } | null };
export interface AppRouter {
    push(
      url: AppRouteLocation,
      as?: string,
      options?: any
    ): Promise<boolean>;
    replace(
      url: AppRouteLocation,
      as?: string,
      options?: any
    ): Promise<boolean>;
    back(): void;
    reload(): void;
  
    // Unified properties.
    query: { [key: string]: any };
    pathname: string;
    basePath: string;
    asPath: string;
  }
  