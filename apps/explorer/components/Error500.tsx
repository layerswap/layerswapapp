import { ServerOff } from "lucide-react";
import Link from "next/link";

const Error500 = () => {
    return (
        <div className="flex h-full w-full flex-1 items-center justify-center p-5">
            <div className="max-w-xl rounded-3xl bg-secondary-700 p-8 text-center sm:p-12">
                <div className="relative inline-flex text-error-foreground">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="116"
                        height="116"
                        viewBox="0 0 116 116"
                        fill="none"
                        aria-hidden="true"
                    >
                        <circle cx="58" cy="58" r="58" fill="currentColor" fillOpacity="0.1" />
                        <circle cx="58" cy="58" r="45" fill="currentColor" fillOpacity="0.5" />
                        <circle cx="58" cy="58" r="30" fill="currentColor" />
                    </svg>
                    <ServerOff className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-primary-text" />
                </div>
                <h1 className="mt-5 text-4xl font-semibold text-primary-text lg:text-5xl">
                    500 - Oops
                </h1>
                <p className="my-5 text-secondary-text lg:text-lg">
                    Something went wrong. Try refreshing this page, or contact us if the problem
                    persists.
                </p>
                <Link
                    href="https://layerswap.io/help"
                    target="_blank"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary-500 px-5 py-3 text-sm font-medium text-primary-buttonTextColor transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:animate-press-down"
                >
                    Contact support
                </Link>
            </div>
        </div>
    );
};

export default Error500;
