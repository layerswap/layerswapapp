"use client"
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackBtn() {
    const router = useRouter();

    const goBack = window?.['navigation' as any]?.['canGoBack' as any] ?
        () => router.back()
        : () => router.push("/");

    return (
        <button
            onClick={goBack}
            className="flex items-center justify-center-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none py-2 px-4"
        >
            <ChevronLeft className="mr-2 h-4 w-4" />
            <span>Back</span>
        </button>
    )
}