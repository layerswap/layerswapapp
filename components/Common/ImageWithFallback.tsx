import Image, { ImageProps } from "next/image";
import React, { forwardRef, useCallback, useEffect, useState } from "react";
import LogoPlaceholder from "../icons/LogoPlaceholder";

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageProps>(({ src, ...props }, ref) => {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setImgSrc(src);
        setHasError(false);
    }, [src])

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