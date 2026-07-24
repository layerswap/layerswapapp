import Link from "next/link";
import { NotFoundBackground } from "./icons/NotFoundBackground";

export default function NotFound() {
    return (
        <section className="fixed inset-0 flex items-center justify-center">
            <NotFoundBackground className="absolute" />
            <div className="flex flex-col items-center justify-center text-center p-4 relative z-20">
                <h1 className="text-2xl font-semibold text-primary-text md:text-4xl">We couldn&apos;t find anything</h1>
                <p className="text-base text-primary-text-placeholder mt-2">Please make sure you entered a valid address/source Tx/destination TX.</p>
                <span className="text-base text-primary-text-placeholder block">If the issue persists, you can contact our support.</span>
                <div className="flex items-center mt-6 gap-x-3">
                    <Link href="/" className="w-full px-5 py-2 text-sm tracking-wide text-primary-text transition-colors duration-200 bg-secondary-500 rounded-lg shrink-0 sm:w-auto hover:bg-secondary-600">
                        Clear search
                    </Link>
                </div>
            </div>
        </section>
    );
}
