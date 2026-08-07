"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackBtn() {
    const router = useRouter();

    const goBack = () => {
        if (window.history.length > 1) {
            router.back();
            return;
        }

        router.push("/");
    };

    return (
        <button
            onClick={goBack}
            className="flex min-h-10 items-center rounded-xl px-3 py-2 text-sm font-medium text-primary-text transition-colors hover:bg-secondary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:animate-press-down"
        >
            <ChevronLeft className="mr-2 h-4 w-4" />
            <span>{"Back"}</span>
        </button>
    );
}
