import Image, { ImageProps } from "next/image";
import React, { forwardRef, useEffect, useState } from "react";

const fallbackImage = 'https://layerswap.io/beta/_next/image?url=%2Fimages%2Flogo_placeholder.png&w=96&q=75&dpl=dpl_F5qCEJtwT2ipBr2zVii46hGUTTff';

function normalizeSrc(src: ImageProps["src"]): ImageProps["src"] {
    try {
        const raw = typeof src === "string" ? src : String(src as any);
        const u = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
        if (u.pathname === "/_next/image") {
            const inner = u.searchParams.get("url");
            if (inner) {
                // decode once; if it was double-encoded, a second pass will clean it
                let decoded = decodeURIComponent(inner);
                try {
                    decoded = decodeURIComponent(decoded);
                } catch {
                    // it's fine if a second pass fails; means it wasn't double-encoded
                }
                return decoded;
            }
        }
        return raw;
    } catch {
        return src;
    }
}

/**
 * Build a Next optimizer URL safely (if you *really* need to).
 * Prefer letting <Image> do this for you instead of calling this.
 */
export function buildNextOptimizedUrl(base: string, rawUrl: string, w = 96, q = 75) {
    const outer = new URL("/_next/image", base);
    // URLSearchParams will handle encoding exactly once.
    outer.searchParams.set("url", rawUrl);
    outer.searchParams.set("w", String(w));
    outer.searchParams.set("q", String(q));
    return outer.toString();
}

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageProps>(
    ({ src, alt, ...props }, ref) => {
        const [imgSrc, setImgSrc] = useState<ImageProps["src"]>(normalizeSrc(src));

        useEffect(() => {
            setImgSrc(normalizeSrc(src));
        }, [src]);

        const handleError = () => {
            setImgSrc(fallbackImage);
        };

        return (
            <Image
                {...props}
                // only needed if you actually want the blur placeholder
                // placeholder="blur"
                // blurDataURL={fallbackImage} // better: provide a tiny base64 data URI instead of a path
                alt={alt || "ImageWithFallback"}
                ref={ref}
                src={fallbackImage}
                onError={handleError}
                // Optional: avoid optimization when showing the local fallback
                unoptimized={imgSrc === fallbackImage}
            />
        );
    }
);