"use client";
import React, { forwardRef, useEffect, useState } from "react";

const fallbackImage = '/images/logo_placeholder.png';

export const ImageWithFallback = forwardRef<HTMLImageElement, React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>>(({ src, ...props }, ref) => {
    const [imgSrc, setImgSrc] = useState(src);

    useEffect(() => {
        setImgSrc(src);
    }, [src])

    const handleError = () => {
        setImgSrc(fallbackImage)
    }

    return <img
        {...props}
        alt={props.alt || 'ImageWithFallback'}
        ref={ref}
        src={imgSrc}
        onError={handleError}
    />;
});