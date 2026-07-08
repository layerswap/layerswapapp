import Image, { ImageProps } from "next/image";
import { useRouter } from "next/router";
import React, { forwardRef, useCallback, useEffect, useState } from "react";
import LogoPlaceholder from "../icons/LogoPlaceholder";

function withBasePath(src: ImageProps["src"], basePath: string): ImageProps["src"] {
    if (typeof src !== "string" || !basePath || !src.startsWith("/") || src.startsWith("//")) {
        return src;
    }
    if (src === basePath || src.startsWith(`${basePath}/`)) {
        return src;
    }
    return `${basePath}${src}`;
}

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageProps>(({ src, ...props }, ref) => {
    const basePath = useRouter().basePath || "";
    const resolvedSrc = withBasePath(src, basePath);
    const [imgSrc, setImgSrc] = useState(resolvedSrc);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setImgSrc(resolvedSrc);
        setHasError(false);
    }, [resolvedSrc])

    const handleError = useCallback(() => {
        setHasError(true);
    }, [setHasError]);

    if (hasError) {
        return <LogoPlaceholder {...props} />;
    }

    return <Image
        {...props}
        alt={props.alt || 'ImageWithFallback'}
        ref={ref}
        src={imgSrc}
        onError={handleError}
    />;
});
