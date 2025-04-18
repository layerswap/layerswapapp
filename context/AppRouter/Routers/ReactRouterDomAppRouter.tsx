import { useNavigate, useLocation } from 'react-router-dom';
import { AppRouter } from '../routerTypes';

/**
 * A hook that returns a router object implementing AppRouter for react-router-dom.
 * @param basePathValue Optional base path to use (defaults to an empty string)
 */
export const useReactRouterDomAppRouter = (basePathValue: string = ""): AppRouter => {
  const navigate = useNavigate();
  const location = useLocation();

  const push = async (
    url: string | { pathname: string; query?: { [key: string]: any } },
    options?: any
  ): Promise<boolean> => {
    let path: string;
    if (typeof url === 'string') {
      path = url;
    } else {
      const { pathname, query } = url;
      const queryString = query ? '?' + new URLSearchParams(query as any).toString() : "";
      path = pathname + queryString;
    }
    navigate(path, { replace: false, ...options });
    return Promise.resolve(true);
  };

  const replace = async (
    url: string | { pathname: string; query?: { [key: string]: any } },
    options?: any
  ): Promise<boolean> => {
    let path: string;
    if (typeof url === 'string') {
      path = url;
    } else {
      const { pathname, query } = url;
      const queryString = query ? '?' + new URLSearchParams(query as any).toString() : "";
      path = pathname + queryString;
    }
    navigate(path, { replace: true, ...options });
    return Promise.resolve(true);
  };

  const back = (): void => {
    navigate(-1);
  };

  const reload = (): void => {
    window.location.reload();
  };

  const query = (() => {
    const params = new URLSearchParams(location.search);
    const queryObject: { [key: string]: any } = {};
    params.forEach((value, key) => {
      queryObject[key] = value;
    });
    return queryObject;
  })();

  return {
    push,
    replace,
    back,
    reload,
    query,
    pathname: location.pathname,
    basePath: basePathValue,
    asPath: location.pathname + location.search,
  };
};
