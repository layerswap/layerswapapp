import Image, { ImageProps } from "next/image";
import React, { forwardRef } from "react";

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageProps>((props, ref) => {
    return <Image
        {...props}
        ref={ref}
    />;
});