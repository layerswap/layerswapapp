import React, { forwardRef, useEffect, useState } from "react";
import LogoPlaceholder from "../Icons/LogoPlaceholder";

export const ImageWithFallback = forwardRef<HTMLImageElement, React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>>(({ src, ...props }, ref) => {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setImgSrc(src);
        setHasError(false);
    }, [src])

    const handleError = () => {
        setHasError(true);
    }

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