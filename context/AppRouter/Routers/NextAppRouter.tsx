import { NextRouter } from "next/router";
import { AppRouter } from "../routerTypes";

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
