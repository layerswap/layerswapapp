import { RouterProvider } from "../../context/AppRouter/RouterProvider";
import { AppRouter } from "../../context/AppRouter/routerTypes";
import { LayerSwapSettings } from "../../Models/LayerSwapSettings";
import { ThemeData } from "../../Models/Theme";
import { NextRouter, useRouter } from 'next/router';
import Layout from "./layout";

type Props = {
    children: JSX.Element | JSX.Element[];
    hideFooter?: boolean;
    settings?: LayerSwapSettings;
    themeData?: ThemeData | null
};

export default function LayoutWrapper({ children, settings, themeData }: Props) {
    const router = useRouter();
    return (
        <RouterProvider router={new NextAppRouter(router)}>
            <Layout {...{ settings, themeData }}>
                {children}
            </Layout>
        </RouterProvider>
    )
}

export class NextAppRouter implements AppRouter {
    constructor(private router: NextRouter) { }

    push(
        url: string | { pathname: string; query?: { [key: string]: any } },
        as?: string,
        options?: any
    ) {
        // Next.js router supports both string and object forms
        return this.router.push(url as any, as, options);
    }

    replace(
        url: string | { pathname: string; query?: { [key: string]: any } },
        as?: string,
        options?: any
    ) {
        return this.router.replace(url as any, as, options);
    }

    back() {
        this.router.back();
    }
    reload(): void {
        this.router.reload();
    }

    get query(): { [key: string]: any } {
        return this.router.query;
    }

    get pathname(): string {
        return this.router.pathname;
    }

    get basePath(): string {
        return this.router.basePath || "";
    }

    get asPath(): string {
        return this.router.asPath;
    }
}

import { useNavigate, useLocation } from 'react-router-dom';

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
