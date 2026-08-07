import Link from "next/link";
import { NotFoundBackground } from "./icons/NotFoundBackground";

export default function NotFound() {
    return (
        <section className="fixed inset-0 flex items-center justify-center">
            <NotFoundBackground className="absolute" />
            <div className="relative z-20 mx-4 flex max-w-xl flex-col items-center justify-center rounded-3xl bg-secondary-700 p-8 text-center sm:p-12">
                <h1 className="text-2xl font-semibold text-primary-text md:text-4xl">
                    We couldn&apos;t find anything
                </h1>
                <p className="mt-2 text-base text-secondary-text">
                    Please make sure you entered a valid address, source transaction, or
                    destination transaction.
                </p>
                <span className="block text-base text-secondary-text">
                    If the issue persists, you can contact our support.
                </span>
                <div className="mt-6 flex items-center gap-x-3">
                    <Link
                        href="/"
                        className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-secondary-300 px-5 py-3 text-sm font-medium text-primary-text transition hover:bg-secondary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:animate-press-down sm:w-auto"
                    >
                        Clear search
                    </Link>
                </div>
            </div>
        </section>
    );
}
