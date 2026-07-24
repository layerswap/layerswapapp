"use client";
import React, { forwardRef, useCallback, useEffect, useState } from "react";
import LogoPlaceholder from "../Icons/LogoPlaceholder";
import { normalizeIconSrc } from "@layerswap/wallet-core";

// Some wallet adapters expose `icon` as raw inline SVG markup rather than a
// `data:` URI. Handed straight to `<img src>` the browser treats it as a
// relative URL and fires a bogus request to `/<svg ...>`. Normalize any string
// src here as a render-layer safety net so no producer can leak raw markup.
const toImageSrc = (src: React.ImgHTMLAttributes<HTMLImageElement>["src"]) =>
    typeof src === "string" ? normalizeIconSrc(src) : src;

export const ImageWithFallback = forwardRef<HTMLImageElement, React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>>(({ src, ...props }, ref) => {
    const [imgSrc, setImgSrc] = useState(() => toImageSrc(src));
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setImgSrc(toImageSrc(src));
        setHasError(false);
    }, [src])

    const handleError = useCallback(() => {
        setHasError(true);
    }, [setHasError]);

    if (hasError) {
        return <LogoPlaceholder {...props} />;
    }

    return <img
        {...props}
        alt={props.alt || 'ImageWithFallback'}
        ref={ref}
        src={imgSrc}
        onError={handleError}
    />;
});
